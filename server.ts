import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

import { YoutubeTranscript } from "youtube-transcript";

// YouTube ID Extraction helper
function getYoutubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Helper to clean scraped content to avoid cookie consent/landing pages
function cleanScrapedText(text: string): string {
  if (!text) return "";
  const genericIndicators = [
    "enjoy the videos and music you love",
    "share it all with friends",
    "before you continue to youtube",
    "cookie consent",
    "consent.youtube.com",
    "detect automated requests",
    "unusual traffic"
  ];
  const lower = text.toLowerCase();
  for (const ind of genericIndicators) {
    if (lower.includes(ind)) {
      return "";
    }
  }
  return text;
}

// Extra helper to parse YouTube's internal AI/Gemini summary or key structural text if present
function extractYoutubeAIVideoSummary(html: string): string {
  if (!html) return "";
  let extracted = "";

  // 1. Check for standard patterns of AI summaries in the script variables
  const aiSummaryPatterns = [
    /"aiSummary"\s*:\s*({.+?})/i,
    /"summary"\s*:\s*"([^"]{100,})"/i,
    /"keyMomentsCarousel"\s*:\s*({.+?})/i,
    /"structuredDescriptionContentRenderer"\s*:\s*({.+?})/i
  ];

  for (const pattern of aiSummaryPatterns) {
    const match = html.match(pattern);
    if (match && match[0]) {
      extracted += `[Detected YouTube Structured Segment/Summary]: ${match[0].substring(0, 3000)}\n`;
    }
  }

  // 2. Scan description for timeline chapters or standard markers
  const chapters: string[] = [];
  const lines = html.split("\n");
  let count = 0;
  for (const line of lines) {
    // Check for timestamps like 12:34 or 1:23:45 followed by text
    const tsMatch = line.match(/(\d{1,2}:\d{2}(:\d{2})?)\s+[-–—]?\s*(.+)/);
    if (tsMatch && tsMatch[1] && tsMatch[3]) {
      chapters.push(`${tsMatch[1]} - ${tsMatch[3].substring(0, 100).trim()}`);
      count++;
      if (count > 40) break;
    }
  }

  if (chapters.length > 0) {
    extracted += `[Video Chapters Detected in description]:\n${chapters.join("\n")}\n`;
  }

  return extracted;
}

// Scrape public YouTube video page for title, description, and keywords with oEmbed fallback
async function fetchYoutubeMetadata(videoId: string): Promise<{ title: string; description: string; keywords: string; channelTitle?: string; aiSummary?: string }> {
  let title = "";
  let channelTitle = "";
  let description = "";
  let keywords = "";
  let aiSummary = "";

  // 1. Fetch via oEmbed (extremely reliable, official, doesn't require keys, never blocked)
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(oembedUrl);
    if (response.ok) {
      const data = await response.json();
      if (data && typeof data === "object") {
        title = data.title || "";
        channelTitle = data.author_name || "";
        console.log(`[YouTube Metadata] oEmbed fetched successfully. Title: "${title}", Channel: "${channelTitle}"`);
      }
    }
  } catch (err) {
    console.warn("[YouTube Metadata] Failed to fetch oEmbed metadata:", err);
  }

  // 2. Fetch page directly to get description and keywords
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });
    if (response.ok) {
      const html = await response.text();
      
      // Simple regex extraction for og:title or title (fallback if oEmbed didn't work)
      if (!title) {
        let pageTitle = "";
        const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) || 
                           html.match(/<meta\s+name="title"\s+content="([^"]+)"/i) ||
                           html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          pageTitle = titleMatch[1].replace(/&amp;/g, "&").replace(" - YouTube", "").trim();
        }
        title = cleanScrapedText(pageTitle);
      }

      // Description extraction
      let pageDesc = "";
      const descMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i) || 
                        html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
      if (descMatch && descMatch[1]) {
        pageDesc = descMatch[1].replace(/&amp;/g, "&").trim();
      }
      description = cleanScrapedText(pageDesc);

      // Keywords extraction
      let pageKeys = "";
      const keysMatch = html.match(/<meta\s+name="keywords"\s+content="([^"]+)"/i);
      if (keysMatch && keysMatch[1]) {
        pageKeys = keysMatch[1].replace(/&amp;/g, "&").trim();
      }
      keywords = cleanScrapedText(pageKeys);

      // Extract raw summary data or AI hints from page source
      aiSummary = extractYoutubeAIVideoSummary(html);
    }
  } catch (err) {
    console.warn("[YouTube Metadata] Failed to fetch raw watch page:", err);
  }

  // Fallbacks if both failed
  if (!title) {
    title = `YouTube Video (${videoId})`;
  }

  return {
    title,
    description: description || "No video description available or video page is private.",
    keywords: keywords || "",
    channelTitle: channelTitle || "",
    aiSummary: aiSummary || ""
  };
}

// Fetch YouTube Transcript text
async function getYoutubeTranscriptText(url: string): Promise<string> {
  const videoId = getYoutubeId(url);
  if (!videoId) {
    throw new Error("Invalid YouTube URL. Please provide a valid YouTube watch link.");
  }
  try {
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
    if (!transcriptItems || transcriptItems.length === 0) {
      throw new Error("The transcript is empty or could not be found.");
    }
    return transcriptItems.map(item => item.text).join(" ");
  } catch (error: any) {
    console.error("Error fetching YouTube transcript:", error);
    throw new Error("Could not retrieve automated transcript for this YouTube video. Please ensure the video has standard automated captions or transcripts enabled.");
  }
}

// Check if content is educational or academic with robust retries and fallback models
async function checkIfEducational(contentSummary: string): Promise<{ isEducational: boolean; reason: string }> {
  const modelsToTry = [
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite"
  ];

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    const maxRetries = 2;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Intake Classification] Querying model: ${modelName} (attempt ${attempt}/${maxRetries})...`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [`Analyze this content summary and determine if it is educational, academic, historical, scientific, mathematical, literary, technical, professional, or instructional in nature. Or is it purely non-educational entertainment, music, gaming clips/memes, vlogs, sports, or movie trailers with no academic or training value?
             
CRITICAL RULE: If the description/text is empty, missing, or says 'unavailable', evaluate the classification SOLELY on the Title, Channel Name, and Keywords. For example, lecture titles, course subjects (e.g. 'CA Foundation Business Economics', 'Calculus 1', 'Machine Learning'), educational channels (e.g. 'CA Wallah by PW', 'CrashCourse', 'MIT', 'Khan Academy'), or professional guides are 100% EDUCATIONAL and must be accepted!

Content to analyze:
${contentSummary}

Respond strictly in JSON format matching this schema:
{
  "isEducational": boolean,
  "reason": "If not educational, provide a polite, elegant explanation under the title 'OmniMind AI Focus Guard' explaining that OmniMind AI is dedicated exclusively to deep learning, science, academic, and technical resources, and request an educational asset. If educational, this can be empty."
}`],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                isEducational: { type: Type.BOOLEAN },
                reason: { type: Type.STRING }
              },
              required: ["isEducational", "reason"]
            },
            temperature: 0.1
          }
        });
        
        if (response && response.text) {
          console.log(`[Intake Classification] Success with model: ${modelName} on attempt ${attempt}`);
          return JSON.parse(response.text.trim());
        }
        throw new Error("Empty classification response received from Gemini.");
      } catch (err: any) {
        lastError = err;
        const errorMessage = err.message || JSON.stringify(err);
        console.warn(`[Intake Classification] Failed attempt ${attempt} for model ${modelName}. Error: ${errorMessage}`);

        const errorText = errorMessage.toLowerCase();
        const isUnavailable = errorText.includes("503") || errorText.includes("unavailable") || errorText.includes("high demand") || errorText.includes("overloaded");

        if (attempt < maxRetries && isUnavailable) {
          const delayMs = attempt * 1000;
          console.log(`[Intake Classification] Model busy (503/Unavailable). Backing off for ${delayMs}ms before retrying...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          break;
        }
      }
    }
  }

  // Safe fallback if classification fails completely due to API high demand (503)
  console.error("All classification models failed due to API limits/errors. Proceeding with safe fallback (isEducational: true).", lastError);
  return { isEducational: true, reason: "" };
}

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
    },
    quizSummary: {
      type: Type.STRING,
      description: "A comprehensive, high-level summary of this quiz, explaining the key conceptual gaps tested and giving synthesis-level study advice."
    },
    videoSummary: {
      type: Type.STRING,
      description: "A detailed, beautiful markdown-formatted breakdown of the entire video/study material, including main chapters, key topics, and major resources discussed. Use bullet points and subheadings."
    },
    videoNativeQuizzes: {
      type: Type.ARRAY,
      description: "All quizzes, check-your-understanding questions, or exercises that appeared, were discussed, or are directly embedded natively inside the video. If no quizzes are directly in the video, construct 2-3 realistic native self-assessment practice questions that cover the exact video lecture material with answers.",
      items: {
        type: Type.OBJECT,
        properties: {
          question: {
            type: Type.STRING,
            description: "The native question/quiz prompt that appeared, was discussed, or is directly embedded in the video's content."
          },
          answer: {
            type: Type.STRING,
            description: "The correct answer or solution to this native question, as explained in the video."
          },
          explanation: {
            type: Type.STRING,
            description: "A brief explanation of how this native question was resolved in the video's context."
          }
        },
        required: ["question", "answer", "explanation"]
      }
    },
    syllabus: {
      type: Type.ARRAY,
      description: "Syllabus chapter breakdowns of the material, which includes visual SVG photos and handwritten notes for premium study guides.",
      items: {
        type: Type.OBJECT,
        properties: {
          chapterNumber: { type: Type.INTEGER },
          title: { type: Type.STRING, description: "Title of the syllabus chapter." },
          summary: { type: Type.STRING, description: "Comprehensive detail summarizing the key topics in this syllabus module." },
          conceptDiagramSvg: {
            type: Type.STRING,
            description: "A beautifully styled, high-quality vector illustration or flowchart SVG (viewBox='0 0 500 300') explaining this specific syllabus module. Use elegant rounded cards, neat connectors, high-contrast text, and a modern slate/indigo theme. Must contain no HTML."
          },
          handwrittenNotes: {
            type: Type.STRING,
            description: "Detailed, comprehensive lecture notes for this chapter written in student-style handwritten format with neat bullets, highlighted key terms, annotations, and outlines."
          }
        },
        required: ["chapterNumber", "title", "summary", "conceptDiagramSvg", "handwrittenNotes"]
      }
    }
  },
  required: ["title", "questions", "quizSummary", "videoSummary", "videoNativeQuizzes", "syllabus"]
});

// Helper function to call Gemini with robust exponential retries and fallback models
async function callGeminiWithFallback(params: {
  contents: any[];
  systemInstruction: string;
  responseSchema: any;
}) {
  const modelsToTry = [
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite"
  ];

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    const maxRetries = 2;
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

    const { text, file, youtubeUrl, questionCount } = req.body;

    if (!text && !file && !youtubeUrl) {
      return res.status(400).json({ error: "Please provide either notes text, a file upload, or a YouTube video link." });
    }

    let youtubeMetadata: { title: string; description: string; keywords: string; channelTitle?: string; aiSummary?: string } = { title: "", description: "", keywords: "", channelTitle: "", aiSummary: "" };
    let transcriptText = "";
    let transcriptFetched = false;
    let classificationSummary = "";

    if (youtubeUrl) {
      const videoId = getYoutubeId(youtubeUrl);
      if (videoId) {
        console.log(`[YouTube Intake] Fetching video page metadata for videoId: ${videoId}...`);
        youtubeMetadata = await fetchYoutubeMetadata(videoId);
        classificationSummary += `YouTube Video Title: ${youtubeMetadata.title}\nChannel: ${youtubeMetadata.channelTitle || "Unknown"}\nDescription: ${youtubeMetadata.description}\nKeywords: ${youtubeMetadata.keywords}\n`;
        if (youtubeMetadata.aiSummary) {
          classificationSummary += `Scraped Video Chapters/Summary Metadata:\n${youtubeMetadata.aiSummary}\n`;
        }
      }

      try {
        console.log(`[YouTube Link Intake] Retrieving transcripts for: ${youtubeUrl}...`);
        transcriptText = await getYoutubeTranscriptText(youtubeUrl);
        transcriptFetched = true;
        console.log(`[YouTube Link Intake] Successfully downloaded transcript text (${transcriptText.split(/\s+/).length} words).`);
        classificationSummary += `\nTranscript Preview: ${transcriptText.substring(0, 1000)}`;
      } catch (err: any) {
        console.warn("[YouTube Link Intake] Transcript download failure (falling back to metadata + Gemini reasoning):", err);
        transcriptText = "Automated transcript not available for this YouTube video.";
        transcriptFetched = false;
        classificationSummary += `\n(Transcript download failed or not available)`;
      }
    }

    if (text) {
      classificationSummary += `\nStudy Notes:\n${text.substring(0, 1000)}`;
    }
    if (file) {
      classificationSummary += `\nUploaded File name: ${file.name || "Unnamed file"} (${file.mimeType || "unknown type"})`;
    }

    // Step 1: Check if content is educational/academic
    console.log("[Intake Guard] Running educational classification check...");
    const eduCheck = await checkIfEducational(classificationSummary);
    if (!eduCheck.isEducational) {
      console.warn("[Intake Guard] Blocked non-educational intake content:", eduCheck.reason);
      return res.status(400).json({
        error: eduCheck.reason || "OmniMind AI Focus Guard: Please submit educational, science, academic, or technical resources. Pure entertainment, personal blogs, movie trailers, and gaming clips are not supported."
      });
    }
    console.log("[Intake Guard] Content passed educational classification check!");

    const finalQuestionCount = typeof questionCount === "number" && questionCount > 0 ? questionCount : 10;
    const contents: any[] = [];

    // System prompt instructing the model to generate the quiz and summaries
    const systemInstruction = `You are OmniMind AI (The Generative Cognitive Mirror), a hyper-advanced visual tutor.
Your task is to analyze the student's study materials (which could be whiteboard photos, written notes, audio files, textbook snapshots, PDFs, typed bullet points, or YouTube transcripts/metadata) and transform them into an interactive cognitive mirror.

Specifically, you must:
1. DEPTH AND DEPENDENCY ANALYSIS: Carefully analyze the provided subject matter. Map out the logical structure and concept dependencies (e.g. Concept B relies on Concept A as a prerequisite, or Topic Y is an extension of Topic X).
2. CORE RELATIONSHIPS & FRAMEWORK: Identify the ${finalQuestionCount} most critical concept relationships, processes, or systems present in the intake content. Generate exactly ${finalQuestionCount} multiple-choice questions. Frame each question as a creative, scenario-based, or problem-solving test of these exact prerequisite relational dependencies and logical linkages, testing deep conceptual gaps rather than simple memorization.
3. EXPLANATORY AI SUMMARY: Provide a detailed, paragraph-length "remediationText" explaining why the correct option is right and how it resolves the scenario, as well as why the common distractors are wrong. This will be labeled as the "OmniMind AI Justification" in the user interface.
4. STRICT CONSTRAINT: Never mention "Gemini", "Google", "Vertex", "Large Language Model", or "AI model" or "Gemini summary" or "AI summary" or "Google summary" in any part of your outputs (such as questions, quizSummary, remediationText, eli5Explanation, or videoSummary). Refer to the system, summary, and explanations only as "OmniMind AI", "OmniMind Complete Video Synthesis", "Comprehensive Chapter Breakdown", or "OmniMind Video Analysis".
5. Build on-demand explanatory diagrams/infographics:
   - "remediationSvg": A stunning, modern, clean SVG flowchart/diagram mapping out the system or concept logic in standard technical terms. It should look professional (e.g., like a premium tech diagram with modern slate-slate-indigo color schemes).
   - "eli5Svg": A fun, friendly, illustrated SVG metaphor mapping the concept to an easy-to-understand physical analogy (e.g., RAM = countertop, CPU = chef, Hard Drive = pantry). Use bright, delightful colors and clear labels.
6. Keep SVGs self-contained, valid, highly legible, with a viewBox of '0 0 600 350'. Always use elements like <rect>, <circle>, <text>, <path>, <line> with proper styling attributes (e.g., rx, fill, stroke, font-size, font-family="system-ui, sans-serif"). Do not include any HTML inside the SVGs. Ensure all text labels are contrasting and highly visible.
7. Provide a clear text-based ELI5 analogy in "eli5Explanation".

OUTER OBJECT EXTRA FIELDS:
8. Provide a detailed "quizSummary" in the root object that synthesizes what this entire quiz checks, typical misconceptions found, and advice on mastering the concepts.
9. Provide an EXTREMELY detailed, comprehensive, deep-dive "videoSummary" in the root object which is a beautiful, comprehensive markdown-formatted breakdown of the entire material/video, highlighting chapters, core arguments, key terms, and major resources discussed. THIS SUMMARY MUST BE VERY THOROUGH AND DEEP (DO NOT MAKE IT SHORT!). For YouTube videos, analyze any provided AI summary metadata, timeline chapters, descriptions, and transcripts to provide an exhaustive, chapter-by-chapter and thematic review. Ensure there is absolutely no mention of "Gemini summary" or "AI-generated summary" - present it purely as OmniMind's direct cognitive breakdown.
10. Extract or construct "videoNativeQuizzes" as an array of objects. If there were actual quizzes, questions, or check-your-understanding prompts embedded natively inside the video or text, extract them with their exact answers and explanations. If no direct quizzes appeared in the video, identify or reconstruct 2-3 realistic native self-assessment practice questions that a viewer would encounter in a standard quiz for this video's exact material, providing the correct answer and explanation for each.
11. Build a high-fidelity "syllabus" array that divides the study materials into 3 to 5 logical sequential chapters. For each chapter, generate:
    - "chapterNumber": 1-indexed order.
    - "title": Captivating short topic title.
    - "summary": A detailed breakdown of what is covered.
    - "conceptDiagramSvg": A complete, gorgeous, custom SVG diagram/concept map (viewBox='0 0 500 300') containing visual nodes, lines, arrows, and elegant text explaining the core logic of this chapter. It must serve as a premium visual 'photo' explaining that section of the syllabus. Use a beautiful color theme with dark backdrop.
    - "handwrittenNotes": Neatly formatted, student-like handwritten lecture notes detailing the concepts, formulas, lists, or frameworks of the chapter, including bullet points, highlighted keywords, and tips.`;

    let userPrompt = `Analyze the provided study material and generate a ${finalQuestionCount}-question conceptual gap quiz based on the instructions. Include a comprehensive summary of the quiz and an in-depth video/source material chapter-by-chapter summary. Ensure the summary is highly detailed and complete (not short!).`;
    
    if (youtubeUrl) {
      userPrompt += `\n\nYouTube Video Link: ${youtubeUrl}
Video Title: ${youtubeMetadata.title}
Video Creator/Channel: ${youtubeMetadata.channelTitle || "Unknown"}
Video Description: ${youtubeMetadata.description}
Keywords: ${youtubeMetadata.keywords}
Transcript Fetched: ${transcriptFetched ? "Yes" : "No"}
Automated Video Transcript Content:
${transcriptText}`;

      if (youtubeMetadata.aiSummary) {
        userPrompt += `\n\nScraped YouTube AI Summary/Chapters Metadata to Analyze and Synthesize:\n${youtubeMetadata.aiSummary}`;
      }

      if (!transcriptFetched) {
        userPrompt += `\n\n[INSTRUCTION fallback]: Note that the automated transcript was not available for this YouTube video. Therefore, use the provided video title, creator/channel name (${youtubeMetadata.channelTitle || "Unknown"}), description, keywords, any scraped chapters/AI metadata, and your deep, pre-trained academic and general educational knowledge to reconstruct a highly accurate, comprehensive study guide, detailed chapter summaries, native assessment items, and a ${finalQuestionCount}-question conceptual quiz as if the video has been fully analyzed.`;
      }
    }

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

// AI Study Plan & Schedule Generator Route (Premium Feature)
app.post("/api/generate-schedule", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing. Please set it in the Secrets panel in AI Studio.",
        code: "MISSING_API_KEY"
      });
    }

    const { 
      class: studentClass, 
      subjects, 
      topics, 
      isYearPlanner, 
      startDate, 
      hoursPerDay, 
      durationDays 
    } = req.body;

    if (!studentClass || !subjects || subjects.length === 0) {
      return res.status(400).json({ error: "Please provide a Class/Grade and at least one Subject to base the schedule on." });
    }

    const days = typeof durationDays === "number" && durationDays > 0 ? durationDays : 5;
    const hours = typeof hoursPerDay === "number" && hoursPerDay > 0 ? hoursPerDay : 2;
    const start = startDate || new Date().toISOString().split("T")[0];
    const isAnnual = !!isYearPlanner;

    const systemInstruction = `You are OmniMind AI's Master Study Scheduler.
Your task is to draft a beautiful, high-value, concept-focused multi-subject study schedule for students.
You will analyze the student's Class/Grade, Subjects, Topics to study, and Planner type to construct a highly personalized learning roadmap.

CRITICAL DIRECTIVES:
1. ANALYSIS: You must deeply analyze the learning prerequisites, chapters, and concepts for the specified Class/Grade, Subjects, and Topics. Divide them logically.
2. MULTI-SUBJECT: If multiple subjects are provided, the slots MUST distribute study sessions across those subjects. Do not restrict the plan to a single subject.
3. YOUTUBE VIDEO RESOURCES: For each study slot or month, you must provide high-quality, relevant educational YouTube video resources:
   - "youtubeBest": This is the absolute best single video or course playlist for that topic. Provide an engaging, descriptive title (e.g., 'Learn Electricity in 10 Minutes - Khan Academy' or 'Algebra 1 Complete Introduction'), a highly realistic channel name, and a YouTube URL.
   - "youtubeOptions": Provide at least 2-3 alternative video choices of the same topic from other great educational channels so the student has a variety of choices and resources.
   - URL FORMATTING: You must output functional and valid YouTube results search URLs or watch URLs. (e.g., 'https://www.youtube.com/results?search_query=Class+10+Physics+Electricity+Khan+Academy' is excellent because search results are guaranteed to display multiple high-value choices for that specific class and topic).
4. PLANNER TYPES:
   - "1-Year Annual Planner" (isYearPlanner is true): Generate exactly 12 slots, one for each of the 12 months. Calculate sequential dates starting from the start date, incrementing by 30 days for each slot (representing Month 1, Month 2, ..., Month 12). Each topic field must outline a detailed monthly syllabus and focus for the class, and the tips should provide high-value monthly targets.
   - "Custom Daily Roadmap" (isYearPlanner is false): Generate daily study slots for the duration requested (e.g. 5 to 30 days). Each slot's date increments by 1 day.
5. Avoid references to Gemini, Google, Vertex, etc. Name the scheduler 'OmniMind AI Scheduler'.`;

    const contents = [`Create a custom study schedule for:
Class/Grade: ${studentClass}
Subjects: ${Array.isArray(subjects) ? subjects.join(", ") : subjects}
Topics of Focus: ${Array.isArray(topics) ? topics.join(", ") : (topics || "Full Syllabus")}
Duration Type: ${isAnnual ? "1-Year Annual Planner (12 Month Blocks)" : `${days} Days Daily Planner`}
Target Study Hours per Day: ${hours} Hours
Start Date: ${start}

Respond strictly in JSON format matching this schema:
{
  "title": "Mastery Plan Name (e.g., Class 10 annual roadmap)",
  "description": "Short personalized schedule motivation...",
  "class": "${studentClass}",
  "subjects": [],
  "isYearPlanner": ${isAnnual},
  "slots": [
    {
      "id": "slot_1",
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "hours": ${hours},
      "subject": "Name of the subject for this session",
      "topic": "Creative, highly descriptive learning or practice target detailing what concepts to review",
      "tips": "Practical, actionable study tip or gap checklist for this session",
      "youtubeBest": {
        "title": "Title of the absolute best video or playlist for this topic",
        "url": "https://www.youtube.com/results?search_query=...",
        "channel": "Name of the channel",
        "duration": "Length of video e.g. 15 mins"
      },
      "youtubeOptions": [
        {
          "title": "Alternative video choice title",
          "url": "https://www.youtube.com/results?search_query=...",
          "channel": "Alternative channel name",
          "duration": "e.g. 20 mins"
        }
      ]
    }
  ]
}`];

    const schema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        class: { type: Type.STRING },
        subjects: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        isYearPlanner: { type: Type.BOOLEAN },
        slots: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              date: { type: Type.STRING },
              time: { type: Type.STRING },
              hours: { type: Type.NUMBER },
              subject: { type: Type.STRING },
              topic: { type: Type.STRING },
              tips: { type: Type.STRING },
              youtubeBest: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  url: { type: Type.STRING },
                  channel: { type: Type.STRING },
                  duration: { type: Type.STRING }
                },
                required: ["title", "url"]
              },
              youtubeOptions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    url: { type: Type.STRING },
                    channel: { type: Type.STRING },
                    duration: { type: Type.STRING }
                  },
                  required: ["title", "url"]
                }
              }
            },
            required: ["id", "date", "time", "hours", "subject", "topic", "tips", "youtubeBest", "youtubeOptions"]
          }
        }
      },
      required: ["title", "description", "slots"]
    };

    const response = await callGeminiWithFallback({
      contents: contents,
      systemInstruction: systemInstruction,
      responseSchema: schema
    });

    if (!response.text) {
      throw new Error("No response text received from Gemini API.");
    }

    const scheduleData = JSON.parse(response.text.trim());
    return res.json(scheduleData);

  } catch (error: any) {
    console.error("Error in /api/generate-schedule:", error);
    return res.status(500).json({
      error: error.message || "An error occurred while generating your AI study schedule.",
      code: "GENERATION_ERROR"
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
