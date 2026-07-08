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

export interface SyllabusChapter {
  chapterNumber: number;
  title: string;
  summary: string;
  conceptDiagramSvg: string; // Premium SVG flowchart photo explaining the concept
  handwrittenNotes: string; // Premium student-style handwritten notes
}

export interface UserProfile {
  uid: string;
  username: string;
  isPremium: boolean;
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
  syllabus?: SyllabusChapter[]; // Premium Syllabus Chapters breakdown
}

export interface IntakeRequest {
  text?: string;
  file?: {
    data: string; // Base64
    mimeType: string;
    name: string;
  };
}

export interface YouTubeVideo {
  title: string;
  url: string;
  channel?: string;
  duration?: string;
}

export interface StudySlot {
  id: string;
  date: string;
  time: string;
  hours: number;
  topic: string;
  tips: string;
  completed: boolean;
  subject?: string;
  youtubeBest?: YouTubeVideo;
  youtubeOptions?: YouTubeVideo[];
}

export interface StudySchedule {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  slots: StudySlot[];
  isAI: boolean;
  class?: string;
  subjects?: string[];
  isYearPlanner?: boolean;
}

export interface Bookmark {
  id: string;
  type: "question" | "notes" | "chapter";
  createdAt: string;
  title: string;
  sessionId: string;
  questionId?: string;
  chapterNumber?: number;
  content: string;
  options?: string[];
  correctOptionIndex?: number;
  remediationText?: string;
  remediationSvg?: string;
  eli5Explanation?: string;
  eli5Svg?: string;
}

