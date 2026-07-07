# OmniMind AI 🧠✨
### The Generative Cognitive Mirror

OmniMind AI is a full-stack, immersive learning platform that goes beyond simple rote memorization. It analyzes raw, messy study materials—such as typed lecture notes, scribbled whiteboard photos, or live microphone audio recordings—and transforms them into a dynamic, interactive **Cognitive Mirror**.

Rather than testing simple factual recall, OmniMind AI generates scenario-based problem-solving quizzes that target conceptual gaps. It features on-demand bespoke explanatory flowcharts, custom-generated vector graphics, and a dual-perspective visual engine: **System Cognitive Alignment** (technical mapping) and an **ELI5 Metaphoric Breakdown** (simplified analogical schema).

---

## 🎨 Design Theme: Immersive UI
The interface utilizes an eye-safe, immersive dark-canvas architecture:
- **Atmospheric Depth**: Embedded with rich radial gradients and soft background ambient glow overlays.
- **Micro-interactions**: High-fidelity hover states, interactive custom-styled multi-option cards, and responsive state indicators powered by `motion`.
- **Dynamic Diagnostics**: Adaptive side-by-side splits displaying questions alongside real-time reactive SVG flowcharts, fully interactive METAPHOR/TECH toggles, and live canvas-rendered audio input waveforms.

---

## 🚀 Recommended GitHub Repository Name
- **Option 1 (Recommended)**: `omnimind-ai`
- **Option 2**: `cognitive-mirror-quiz`
- **Option 3**: `omnimind-cognitive-mirror`

---

## 🛠️ Step-by-Step GitHub Upload Guide

To push this codebase to your own GitHub account, open your terminal at the project root and execute the following commands:

```bash
# 1. Initialize a local git repository
git init

# 2. Add all source files to the staging area
git add .

# 3. Create your initial commit
git commit -m "feat: initial commit of OmniMind AI with Immersive UI"

# 4. Rename your default branch to main
git branch -M main

# 5. Link your local repository to your remote GitHub repository
# (Replace yourusername and your-repo-name with your actual GitHub username and selected repository name)
git remote add origin https://github.com/yourusername/omnimind-ai.git

# 6. Push the code to GitHub
git push -u origin main
```

---

## ⚡ Local Installation & Development

To run OmniMind AI on your local machine, follow these steps:

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher is recommended)
- [npm](https://www.npmjs.com/) (Node Package Manager)
- A **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/)

### Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/omnimind-ai.git
   cd omnimind-ai
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file in the root directory by copying the example environment template:
   ```bash
   cp .env.example .env
   ```
   Open the `.env` file and insert your Gemini API Key:
   ```env
   GEMINI_API_KEY="your_actual_gemini_api_key_here"
   APP_URL="http://localhost:3000"
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   The full-stack application will be active and viewable at `http://localhost:3000`.

---

## 📦 Project Architecture & Scripts

This application is built as a highly responsive **Full-Stack SPA** leveraging a Node.js Express server to host both the REST API endpoints (proxying the Gemini API securely) and the Vite frontend dev-server middleware in development.

- **Frontend**: React 18, Vite, Tailwind CSS, and Framer Motion (`motion`).
- **Backend**: Express Server with `@google/genai` SDK for Gemini 3.5 Flash Integration (equipped with automatic backup-model recovery loops for resilient generation).

### Key scripts defined in `package.json`:
- `npm run dev`: Bootstraps the local development server (Express + Vite HMR) on port `3000`.
- `npm run build`: Bundles the production build of the React frontend into `dist/` and compiles the TypeScript server code using `esbuild`.
- `npm run start`: Runs the pre-compiled, self-contained production server from `dist/server.cjs`.
- `npm run lint`: Performs static analysis on the codebase via TypeScript compiler checks.

---

*This amazing platform was built by -sushanshetty💜😇*

