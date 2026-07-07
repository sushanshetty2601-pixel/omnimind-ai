import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Gemini SDK with User-Agent header
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("WARNING: GEMINI_API_KEY is not defined in environment variables.");
}

const ai = new GoogleGenAI({
  apiKey: apiKey || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// JSON schema builder for the quiz generator
const getQuizSchema = (count: number) => ({
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "A short, descriptive, engaging title for this quiz session based on the intake notes (e.g., 'Photosynthesis and Energy Transfer' or 'Operating System Memory Metaphors')."
    },
    questions: {
      type: Type.ARRAY,
      description: `Exactly ${count} concept-testing multiple-choice questions.`,
      items: {
        type: Type.OBJECT,
        properties: {
          question: {
            type: Type.STRING,
            description: "A creative, scenario-based, relationship-testing question. Test deep concept understanding, not rote memorization. Provide context or a real-world scenario."
          },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Exactly 4 options. The options should represent likely misconceptions."
          },
          correctOptionIndex: {
            type: Type.INTEGER,
            description: "The 0-based index of the correct option (0, 1, 2, or 3)."
          },
          conceptTested: {
            type: Type.STRING,
            description: "A single sentence explaining the core concept/relationship tested."
          },
          remediationText: {
            type: Type.STRING,
            description: "A thorough explanation of why the correct option is right and how it resolves the scenario, as well as why the common distractors are wrong."
          },
          remediationSvg: {
            type: Type.STRING,
            description: "A complete, valid, beautifully styled inline SVG string (viewBox='0 0 600 350') depicting a flowchart, process flow, or labeled concept map explaining this scientific, mathematical, or technical relationship. Use modern, highly polished styling: rounded rect cards, linear gradients (using <defs>), clear directional arrows, crisp font sizes, elegant line connections, and contrasting light labels (e.g., '#f8fafc' or '#e2e8f0' on dark node backgrounds like '#334155'). Make sure it is fully responsive, complete, and contains no raw HTML. Do not truncate."
          },
          eli5Explanation: {
            type: Type.STRING,
            description: "An incredibly creative, fun, child-friendly analogy explaining this abstract concept. For example, explain CPU/RAM using a chef working at a kitchen countertop, or DNA/mRNA using a grandmother's master cookbook and a xeroxed recipe card."
          },
          eli5Svg: {
            type: Type.STRING,
            description: "A beautiful, child-friendly metaphorical SVG string (viewBox='0 0 600 350') depicting the ELI5 analogy visually. Draw the metaphor (e.g., a chef at a table, a water slide, or a small postman delivering a letter) using lovely rounded paths, bright friendly colors (e.g., Indigo, Teal, Coral, Gold), distinct labels, and playful elements. Must be fully valid, self-contained SVG."
          }
        },
        required: [
          "question",
          "options",
          "correctOptionIndex",
          "conceptTested",
          "remediationText",
          "remediationSvg",
          "eli5Explanation",
          "eli5Svg"
        ]
      }
    }
  },
  required: ["title", "questions"]
});

// Helper function to call Gemini with robust exponential retries and fallback models
async function callGeminiWithFallback(params: {
  contents: any[];
  systemInstruction: string;
  responseSchema: any;
}) {
  const modelsToTry = [
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite"
  ];

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    const maxRetries = modelName === "gemini-3.5-flash" ? 2 : 1;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Gemini Engine] Querying model: ${modelName} (attempt ${attempt}/${maxRetries})...`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: params.contents,
          config: {
            systemInstruction: params.systemInstruction,
            responseMimeType: "application/json",
            responseSchema: params.responseSchema,
            temperature: 0.2,
          }
        });

        if (response && response.text) {
          console.log(`[Gemini Engine] Success with model: ${modelName} on attempt ${attempt}`);
          return response;
        }
        throw new Error("Empty response received from the Gemini model.");
      } catch (error: any) {
        lastError = error;
        const errorMessage = error.message || JSON.stringify(error);
        console.warn(`[Gemini Engine] Failed attempt ${attempt} for model ${modelName}. Error: ${errorMessage}`);
        
        // Match standard 503, UNAVAILABLE, or high demand messages
        const errorText = errorMessage.toLowerCase();
        const isUnavailable = errorText.includes("503") || errorText.includes("unavailable") || errorText.includes("high demand") || errorText.includes("overloaded");
        
        if (attempt < maxRetries && isUnavailable) {
          const delayMs = attempt * 1500;
          console.log(`[Gemini Engine] Model busy (503/Unavailable). Backing off for ${delayMs}ms before retrying...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          // If we run out of retries for this model, we'll try the next model in the fallback array
          console.log(`[Gemini Engine] Moving on from ${modelName} due to errors...`);
          break;
        }
      }
    }
  }

  throw lastError || new Error("Failed to generate content across all fallback Gemini models.");
}

// Main intake & quiz generation route
app.post("/api/intake", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing. Please set it in the Secrets panel in AI Studio.",
        code: "MISSING_API_KEY"
      });
    }

    const { text, file, questionCount } = req.body;

    if (!text && !file) {
      return res.status(400).json({ error: "Please provide either notes text or an uploaded study document." });
    }

    const finalQuestionCount = typeof questionCount === "number" && questionCount > 0 ? questionCount : 5;
    const contents: any[] = [];

    // System prompt instructing the model to generate the quiz
    const systemInstruction = `You are OmniMind AI (The Generative Cognitive Mirror), a hyper-advanced visual tutor.
Your task is to analyze the student's messiest study materials (which could be scribbled whiteboard photos, whiteboard notes, audio files, textbook snapshots, PDFs, or typed bullet points) and transform them into an interactive cognitive mirror.

Specifically, you must:
1. Identify the ${finalQuestionCount} most critical concept relationships, processes, or systems present in the intake content.
2. For each identified relationship, generate a scenario-based or problem-solving quiz question designed to test the mental gap rather than simple memorization.
3. Build on-demand explanatory diagrams/infographics:
   - "remediationSvg": A stunning, modern, clean SVG flowchart/diagram mapping out the system or concept logic in standard technical terms. It should look professional (e.g., like a premium tech diagram with modern slate-slate-indigo color schemes).
   - "eli5Svg": A fun, friendly, illustrated SVG metaphor mapping the concept to an easy-to-understand physical analogy (e.g., RAM = countertop, CPU = chef, Hard Drive = pantry). Use bright, delightful colors and clear labels.
4. Keep SVGs self-contained, valid, highly legible, with a viewBox of '0 0 600 350'. Always use elements like <rect>, <circle>, <text>, <path>, <line> with proper styling attributes (e.g., rx, fill, stroke, font-size, font-family="system-ui, sans-serif"). Do not include any HTML inside the SVGs. Ensure all text labels are contrasting and highly visible.
5. Provide a clear text-based ELI5 analogy in "eli5Explanation".`;

    let userPrompt = `Analyze the provided study material and generate a ${finalQuestionCount}-question conceptual gap quiz based on the instructions.`;
    if (text) {
      userPrompt += `\n\nStudy Notes Text:\n${text}`;
    }

    contents.push(userPrompt);

    if (file && file.data && file.mimeType) {
      // Inline file payload
      contents.push({
        inlineData: {
          mimeType: file.mimeType,
          data: file.data
        }
      });
    }

    const schema = getQuizSchema(finalQuestionCount);
    const response = await callGeminiWithFallback({
      contents: contents,
      systemInstruction: systemInstruction,
      responseSchema: schema
    });

    if (!response.text) {
      throw new Error("No response text received from Gemini API.");
    }

    const quizData = JSON.parse(response.text.trim());
    return res.json(quizData);

  } catch (error: any) {
    console.error("Error in /api/intake:", error);
    return res.status(500).json({
      error: error.message || "An error occurred while processing study materials. Please check your file size or API settings.",
      code: "PROCESSING_ERROR"
    });
  }
});

// Integration with Vite
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom", // Use custom to handle SPA routing explicitly in Express
    });
    app.use(vite.middlewares);

    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        // Read index.html
        let template = fs.readFileSync(
          path.resolve(process.cwd(), "index.html"),
          "utf-8"
        );
        // Transform HTML using Vite's transformIndexHtml
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
