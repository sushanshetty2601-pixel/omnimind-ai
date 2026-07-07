export interface Question {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  conceptTested: string;
  remediationText: string;
  remediationSvg: string; // Dynamic custom SVG flowchart/diagram
  eli5Explanation: string; // Explain like I'm 5 analogy
  eli5Svg: string; // ELI5 visual metaphor SVG
}

export interface QuizSession {
  id: string;
  title: string;
  createdAt: string;
  questions: Question[];
  userAnswers: { [questionId: string]: number }; // questionId -> selectedOptionIndex
  completed: boolean;
  quizSummary?: string;
  videoSummary?: string;
  videoNativeQuizzes?: {
    question: string;
    answer: string;
    explanation: string;
  }[];
  youtubeUrl?: string; // If it's a YouTube-based study session
}

export interface IntakeRequest {
  text?: string;
  file?: {
    data: string; // Base64
    mimeType: string;
    name: string;
  };
}
