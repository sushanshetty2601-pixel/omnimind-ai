import React, { useState, useEffect, useRef } from "react";
import { 
  motion, 
  AnimatePresence 
} from "motion/react";
import { 
  Brain, 
  Cpu, 
  Layers, 
  Lightbulb, 
  Camera, 
  Mic, 
  Square, 
  Trash2, 
  History, 
  Sparkles, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  BookOpen, 
  FileText, 
  Baby, 
  FileAudio, 
  RotateCcw, 
  UploadCloud, 
  Check, 
  HelpCircle,
  Eye,
  BookMarked,
  Youtube,
  ExternalLink
} from "lucide-react";
import { Question, QuizSession } from "./types";
import { fetchCloudSessions, saveCloudSession, deleteCloudSession } from "./firebase";

export default function App() {
  // Application Modes: 'dashboard' | 'loading' | 'quiz' | 'review'
  const [mode, setMode] = useState<"dashboard" | "loading" | "quiz" | "review">("dashboard");
  
  // Quiz Sessions
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [activeSession, setActiveSession] = useState<QuizSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  
  // Interactive Quiz States
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerValidated, setIsAnswerValidated] = useState<boolean>(false);
  const [eli5Mode, setEli5Mode] = useState<boolean>(false);
  const [reviewTab, setReviewTab] = useState<"gap" | "video" | "native">("gap");
  
  // Form / Intake Inputs
  const [notesText, setNotesText] = useState<string>("");
  const [youtubeUrl, setYoutubeUrl] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<{
    data: string; // Base64
    mimeType: string;
    name: string;
  } | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [quizLength, setQuizLength] = useState<"auto" | number>("auto");

  // Compute the volume/depth of provided materials to suggest number of questions
  const getResourceAnalysis = () => {
    const textLength = notesText.trim().length;
    const hasFile = !!uploadedFile;
    const hasYoutube = !!youtubeUrl.trim();
    const totalWords = notesText.trim() ? notesText.trim().split(/\s+/).filter(Boolean).length : 0;
    
    if (textLength === 0 && !hasFile && !hasYoutube) return { wordCount: 0, depth: "None", recommendedCount: 0 };
    
    let depth: "Micro-snippet" | "Standard Study" | "Comprehensive Outline" | "Deep Repository" | "YouTube Lecture Scan" = "Micro-snippet";
    let recommendedCount = 10; // Enforce minimum of 10 questions
    
    if (hasYoutube) {
      depth = "YouTube Lecture Scan";
      recommendedCount = 15;
    } else if (totalWords > 300 || (hasFile && totalWords > 100)) {
      depth = "Deep Repository";
      recommendedCount = 20;
    } else if (totalWords > 120 || hasFile) {
      depth = "Comprehensive Outline";
      recommendedCount = 15;
    } else if (totalWords > 30) {
      depth = "Standard Study";
      recommendedCount = 10;
    }
    
    return { wordCount: totalWords, depth, recommendedCount };
  };

  // Audio Recording States
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Dynamic feedback and status loops during loading
  const [loadingStatusIndex, setLoadingStatusIndex] = useState<number>(0);
  const loadingStatuses = [
    "Mirroring study materials into conceptual mapping matrix...",
    "Scanning visual nodes and lexical contexts...",
    "Detecting cognitive thresholds and concept dependencies...",
    "Drafting customized visual Vector Flowcharts...",
    "Weaving Metaphorical ELI5 schema mappings...",
    `Finalizing Dynamic Scenario Quiz...`
  ];

  // Drag and drop states
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Errors
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch saved sessions on mount (local + cloud sync)
  useEffect(() => {
    // 1. Load from localStorage first for immediate rendering
    try {
      const saved = localStorage.getItem("omnimind_sessions");
      if (saved) {
        setSessions(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load saved sessions from localStorage", e);
    }

    // 2. Fetch from Firestore to sync cloud sessions
    const syncCloud = async () => {
      try {
        const cloudData = await fetchCloudSessions();
        if (cloudData && cloudData.length > 0) {
          setSessions((prev) => {
            const merged = [...prev];
            cloudData.forEach((cloudSession) => {
              const localIndex = merged.findIndex((s) => s.id === cloudSession.id);
              if (localIndex > -1) {
                merged[localIndex] = { ...merged[localIndex], ...cloudSession };
              } else {
                merged.push(cloudSession as QuizSession);
              }
            });
            // Sort by creation date
            merged.sort((a, b) => {
              const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return timeB - timeA;
            });
            localStorage.setItem("omnimind_sessions", JSON.stringify(merged));
            return merged;
          });
        }
      } catch (err) {
        console.error("Cloud sync failed:", err);
      }
    };
    syncCloud();
  }, []);

  // Save sessions helper (both local and cloud)
  const saveSessions = (updated: QuizSession[]) => {
    setSessions(updated);
    localStorage.setItem("omnimind_sessions", JSON.stringify(updated));
  };

  // Helper to save or update a single session in state, local, and Firestore
  const updateSingleSession = (session: QuizSession) => {
    setSessions((prev) => {
      const next = prev.map(s => s.id === session.id ? session : s);
      if (!next.some(s => s.id === session.id)) {
        next.unshift(session);
      }
      localStorage.setItem("omnimind_sessions", JSON.stringify(next));
      return next;
    });
    // Cloud sync in background
    saveCloudSession(session).catch(e => console.error("Cloud save failure:", e));
  };

  // Status index looping during loading
  useEffect(() => {
    let interval: any;
    if (mode === "loading") {
      setLoadingStatusIndex(0);
      interval = setInterval(() => {
        setLoadingStatusIndex((prev) => (prev + 1) % loadingStatuses.length);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [mode]);

  // Canvas-based audio waveform visualization
  const drawWaveform = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      if (!isRecording) return;
      animationFrameRef.current = requestAnimationFrame(draw);
      
      analyserRef.current!.getByteTimeDomainData(dataArray);
      
      ctx.fillStyle = "#0f172a"; // Dark slate background
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.lineWidth = 3;
      // Beautiful pulsing gradient for wave
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, "#6366f1"); // Indigo
      gradient.addColorStop(0.5, "#a855f7"); // Purple
      gradient.addColorStop(1, "#06b6d4"); // Cyan
      ctx.strokeStyle = gradient;
      
      ctx.beginPath();
      
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();
  };

  // Start Audio Recording
  const startRecording = async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);
      setAudioUrl(null);
      setUploadedFile(null); // Clear image/doc if recording audio
      setFilePreview(null);
      
      // Set up Audio Context and Analyser for live visualizer
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      
      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        // Convert Blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          // Extract plain base64 without headers
          const base64Clean = base64Data.split(",")[1];
          setUploadedFile({
            data: base64Clean,
            mimeType: "audio/webm",
            name: "RecordedLecture.webm"
          });
        };
        
        // Stop stream tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      
      // Allow visualizer to boot
      setTimeout(() => {
        drawWaveform();
      }, 100);

    } catch (err: any) {
      console.error("Microphone access denied or error:", err);
      setErrorMessage("Could not access microphone. Please allow permissions in your browser.");
    }
  };

  // Stop Audio Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    }
  };

  // File picker handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processSelectedFile(file);
  };

  // Process uploaded file (Image/PDF/Audio)
  const processSelectedFile = (file: File) => {
    setErrorMessage(null);
    setAudioUrl(null); // Clear audio recording preview if uploading file

    const isImage = file.type.startsWith("image/");
    const isAudio = file.type.startsWith("audio/");
    const isPDF = file.type === "application/pdf";

    if (!isImage && !isAudio && !isPDF) {
      setErrorMessage("Unsupported format. Please upload an image, audio file, or a PDF document.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      const base64Clean = base64Data.split(",")[1];
      
      setUploadedFile({
        data: base64Clean,
        mimeType: file.type || "application/octet-stream",
        name: file.name
      });
      
      if (isImage) {
        setFilePreview(base64Data);
      } else {
        setFilePreview(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag-and-drop mechanics
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  // Trigger file dialog
  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Clear all file uploads or audio previews
  const clearFile = () => {
    setUploadedFile(null);
    setFilePreview(null);
    setAudioUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle submit to server
  const generateQuiz = async () => {
    if (!notesText.trim() && !uploadedFile && !youtubeUrl.trim()) {
      setErrorMessage("Please input study notes, scan/record an educational asset, or paste a YouTube video link first.");
      return;
    }

    setErrorMessage(null);
    setMode("loading");

    try {
      const { recommendedCount } = getResourceAnalysis();
      const finalCount = quizLength === "auto" ? recommendedCount : quizLength;

      const response = await fetch("/api/intake", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: notesText || undefined,
          file: uploadedFile || undefined,
          youtubeUrl: youtubeUrl || undefined,
          questionCount: finalCount
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "An unexpected error occurred during cognitive processing.");
      }

      // Format response into new session
      const newSession: QuizSession = {
        id: `session_${Date.now()}`,
        title: data.title || "Study Session Review",
        createdAt: new Date().toLocaleString(),
        questions: data.questions.map((q: any, i: number) => ({
          ...q,
          id: `q_${i}`
        })),
        userAnswers: {},
        completed: false,
        quizSummary: data.quizSummary,
        videoSummary: data.videoSummary,
        videoNativeQuizzes: data.videoNativeQuizzes,
        youtubeUrl: youtubeUrl || undefined
      };

      // Add to sessions and save
      updateSingleSession(newSession);
      
      // Load this active session immediately
      setActiveSession(newSession);
      setCurrentQuestionIndex(0);
      setSelectedOption(null);
      setIsAnswerValidated(false);
      setEli5Mode(false);
      setMode("quiz");

      // Reset intake fields
      setNotesText("");
      setUploadedFile(null);
      setFilePreview(null);
      setAudioUrl(null);
      setYoutubeUrl("");

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to generate mirror quiz. Please check backend state.");
      setMode("dashboard");
    }
  };

  // Handle answer selection
  const handleSelectOption = (index: number) => {
    if (isAnswerValidated) return;
    setSelectedOption(index);
  };

  // Validate answer submission
  const validateAnswer = () => {
    if (selectedOption === null || !activeSession) return;

    const currentQuestion = activeSession.questions[currentQuestionIndex];
    const isCorrect = selectedOption === currentQuestion.correctOptionIndex;

    const updatedSession = {
      ...activeSession,
      userAnswers: {
        ...activeSession.userAnswers,
        [currentQuestion.id]: selectedOption
      }
    };

    setActiveSession(updatedSession);
    setIsAnswerValidated(true);
    
    // Auto-update this progress to cloud and state
    updateSingleSession(updatedSession);

    // If answer is incorrect, pre-set ELI5 mode to false to display the technical map first
    if (!isCorrect) {
      setEli5Mode(false);
    }
  };

  // Proceed to next question
  const nextQuestion = () => {
    if (!activeSession) return;
    
    setSelectedOption(null);
    setIsAnswerValidated(false);
    setEli5Mode(false);

    if (currentQuestionIndex + 1 < activeSession.questions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // Mark session complete
      const completedSession = {
        ...activeSession,
        completed: true
      };
      
      updateSingleSession(completedSession);
      setActiveSession(completedSession);
      setMode("review");
    }
  };

  // Resume a historic session
  const loadHistoricSession = (session: QuizSession) => {
    setActiveSession(session);
    setErrorMessage(null);
    if (session.completed) {
      setMode("review");
    } else {
      // Find where they left off
      const questionsCount = session.questions.length;
      let resumeIdx = 0;
      for (let i = 0; i < questionsCount; i++) {
        if (session.userAnswers[session.questions[i].id] !== undefined) {
          resumeIdx = i + 1;
        } else {
          break;
        }
      }
      
      if (resumeIdx >= questionsCount) {
        setMode("review");
      } else {
        setCurrentQuestionIndex(resumeIdx);
        setSelectedOption(null);
        setIsAnswerValidated(false);
        setEli5Mode(false);
        setMode("quiz");
      }
    }
  };

  // Delete historic session
  const deleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== sessionId);
    saveSessions(updated);
    deleteCloudSession(sessionId).catch(err => console.error("Cloud delete failure:", err));
    if (activeSession?.id === sessionId) {
      setActiveSession(null);
      setMode("dashboard");
    }
  };

  return (
    <div id="root-container" className="min-h-screen bg-[#030305] text-slate-100 selection:bg-indigo-500 selection:text-white overflow-x-hidden pb-16 relative">
      {/* Immersive Ambient Glow Overlays */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/10 blur-[170px] rounded-full" />
      </div>

      {/* Interactive Floating Immersive Header */}
      <header id="app-header" className="border-b border-white/10 bg-[#030305]/70 backdrop-blur-xl sticky top-0 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setMode("dashboard")}>
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.4)]">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                OmniMind AI
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold">
                Cognitive Mirror Active
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-4 bg-white/5 border border-white/10 p-1.5 rounded-full">
              <div className="px-4 py-1 rounded-full text-xs font-medium text-slate-300">
                Deep Scan: {activeSession ? activeSession.title : "Multi-mode Active"}
              </div>
              <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center border border-indigo-500/30">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              </div>
            </div>
            <span className="text-xs font-mono text-indigo-300 flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Optimal State
            </span>
          </div>
        </div>
      </header>

      {/* Main Immersive Canvas Body */}
      <main className="max-w-7xl mx-auto px-6 mt-8 relative z-10">
        <AnimatePresence mode="wait">
          
          {/* ==================== DASHBOARD MODE ==================== */}
          {mode === "dashboard" && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Primary Intake & Input Core (2 cols) */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Brand Hero Callout */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 relative overflow-hidden backdrop-blur-xl">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
                  <div className="absolute bottom-0 left-10 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl -z-10" />
                  
                  <div className="flex flex-col gap-3 max-w-2xl">
                    <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full text-[11px] font-mono text-indigo-300 bg-indigo-950/60 border border-indigo-800/60">
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                      REPLACING TRADITIONAL MEMORIZATION
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight leading-tight">
                      Don't just test your memory. <br />
                      <span className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        Reveal and debug your conceptual logic.
                      </span>
                    </h2>
                    <p className="text-slate-300 text-sm leading-relaxed mt-1">
                      Feed OmniMind anything: a scribble from a whiteboard, an audio snippet of a chaotic lecture, or typed thoughts. We generate relationship-testing quizzes accompanied by customized, dynamic SVGs and Metaphorical ELI5 schemas.
                    </p>
                  </div>
                </div>

                {/* Main Intake Form Container */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl relative">
                  
                  <h3 className="font-display font-bold text-md text-white flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    Multimodal Study Intake
                  </h3>

                  {errorMessage && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-sm p-4 rounded-xl flex items-start gap-3 mb-4">
                      <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Adjustment Needed</p>
                        <p className="text-xs text-red-300 mt-1">{errorMessage}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-6">
                    {/* YouTube Video URL Section */}
                    <div>
                      <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 text-red-400">
                        <Youtube className="w-4 h-4" /> Option A: YouTube Video Link (OmniMind Deep Analysis)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={youtubeUrl}
                          onChange={(e) => setYoutubeUrl(e.target.value)}
                          placeholder="Paste a YouTube watch link (e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ)..."
                          className="w-full bg-black/40 border border-white/10 focus:border-red-500/40 rounded-xl py-3 pl-4 pr-12 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-red-500/30 transition-all font-sans"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-red-500/50">
                          <Youtube className="w-5 h-5" />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                        OmniMind will retrieve automated transcripts, map key chapters and topics, extract native quizzes, and design a customized diagnostic assessment.
                      </p>
                    </div>

                    {/* Divider visual */}
                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-white/10" />
                      <span className="flex-shrink mx-4 text-[10px] font-mono uppercase tracking-widest text-indigo-400 bg-slate-950 px-3 py-1 rounded border border-white/10">
                        And / Or
                      </span>
                      <div className="flex-grow border-t border-white/10" />
                    </div>

                    {/* Text Notes Section */}
                    <div>
                      <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                        Option B: Paste Study Notes, Transcripts, or Slides
                      </label>
                      <textarea
                        value={notesText}
                        onChange={(e) => setNotesText(e.target.value)}
                        placeholder="Paste lecture content, syllabus summaries, messy copy-paste paragraphs, or write down your raw thoughts..."
                        className="w-full h-40 bg-black/40 border border-white/10 focus:border-indigo-500/50 rounded-xl p-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all font-sans resize-y"
                      />
                    </div>

                    {/* Divider visual */}
                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-white/10" />
                      <span className="flex-shrink mx-4 text-[10px] font-mono uppercase tracking-widest text-indigo-400 bg-slate-950 px-3 py-1 rounded border border-white/10">
                        And / Or
                      </span>
                      <div className="flex-grow border-t border-white/10" />
                    </div>

                    {/* File Attachment & Mic Audio Recording Split Area */}
                    <div className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                      Option C: Upload Educational Assets / Explain Verbally
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Drag & Drop Upload Zone */}
                      <div 
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={triggerFileSelect}
                        className={`border border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                          isDragging 
                            ? "border-indigo-500 bg-indigo-950/20" 
                            : "border-white/10 hover:border-indigo-500/40 bg-black/40 hover:bg-black/60"
                        }`}
                      >
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleFileChange} 
                          accept="image/*,audio/*,application/pdf"
                          className="hidden" 
                        />
                        
                        <UploadCloud className="w-8 h-8 text-indigo-400 mb-2" />
                        <p className="text-xs font-semibold text-slate-300">
                          Scan Notes, Whiteboard, or Audio File
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
                          Drag & drop PNG, JPG, PDF or lecture MP3 (Max 10MB)
                        </p>
                      </div>

                      {/* Microphone Audio Recorder */}
                      <div className="border border-white/10 bg-black/40 rounded-xl p-5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                              <Mic className="w-3.5 h-3.5 text-indigo-400" />
                              Record Lecture / Verbal Notes
                            </p>
                            {isRecording && (
                              <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500">
                            Speak directly into your mic to explain a topic, record a live biology/physics explanation, or transcribe verbal thoughts.
                          </p>
                        </div>

                        {/* Live Canvas Waveform or status */}
                        <div className="my-3 h-12 bg-[#080a10] rounded-lg overflow-hidden flex items-center justify-center relative border border-white/5">
                          {isRecording ? (
                            <canvas ref={canvasRef} width="300" height="48" className="w-full h-full" />
                          ) : audioUrl ? (
                            <div className="flex items-center gap-2 px-3 w-full justify-between">
                              <span className="text-[10px] text-indigo-400 font-mono flex items-center gap-1">
                                <FileAudio className="w-3 h-3" /> Ready
                              </span>
                              <audio src={audioUrl} controls className="h-8 max-w-[200px]" />
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-600 font-mono">Microphone idle</span>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {!isRecording ? (
                            <button
                              type="button"
                              onClick={startRecording}
                              className="w-full py-1.5 px-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-xs font-medium hover:bg-indigo-500/20 transition-all flex items-center justify-center gap-1.5"
                            >
                              <Mic className="w-3.5 h-3.5 text-indigo-400" /> Start Recording
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={stopRecording}
                              className="w-full py-1.5 px-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-xs font-medium hover:bg-red-500/20 transition-all flex items-center justify-center gap-1.5"
                            >
                              <Square className="w-3.5 h-3.5 text-red-400" /> Stop Recording
                            </button>
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Attachment Review & Clear */}
                    {uploadedFile && (
                      <div className="bg-black/60 border border-white/10 p-3 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3 overflow-hidden">
                          {filePreview ? (
                            <img src={filePreview} alt="Intake asset preview" className="w-12 h-12 rounded object-cover border border-white/10 shrink-0" />
                          ) : (
                            <div className="w-12 h-12 bg-white/5 rounded border border-white/10 flex items-center justify-center text-indigo-400 shrink-0">
                              <FileText className="w-6 h-6" />
                            </div>
                          )}
                          <div className="overflow-hidden">
                            <p className="text-xs font-semibold text-slate-200 truncate">{uploadedFile.name}</p>
                            <p className="text-[10px] text-slate-500 truncate uppercase font-mono">{uploadedFile.mimeType}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={clearFile}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-red-400 border border-white/10 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Resource Analysis & Quiz Depth Configuration */}
                    {(notesText.trim() || uploadedFile || youtubeUrl.trim()) && (
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                            Intake Diagnostics
                          </span>
                          <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                            {getResourceAnalysis().depth}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                          <div>
                            <span className="text-slate-500 block">Detected Size</span>
                            <span className="text-slate-200 font-semibold">
                              {getResourceAnalysis().wordCount} words {uploadedFile ? "+ Attachment" : ""}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Recommended Coverage</span>
                            <span className="text-slate-200 font-semibold text-indigo-300">
                              {getResourceAnalysis().recommendedCount} Core Questions
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-white/5 space-y-3">
                          <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider">
                            Select Quiz Depth (Core Questions)
                          </label>
                          
                          <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 gap-1">
                            <button
                              type="button"
                              onClick={() => setQuizLength("auto")}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-medium font-mono transition-all ${
                                quizLength === "auto"
                                  ? "bg-indigo-600 text-white shadow-md font-bold"
                                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                              }`}
                            >
                              Auto-detect
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (quizLength === "auto") {
                                  setQuizLength(15);
                                }
                              }}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-medium font-mono transition-all ${
                                quizLength !== "auto"
                                  ? "bg-indigo-600 text-white shadow-md font-bold"
                                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                              }`}
                            >
                              Manual Count
                            </button>
                          </div>

                          {quizLength !== "auto" && (
                            <div className="space-y-3 p-3 bg-black/30 rounded-xl border border-white/5 animate-fadeIn">
                              <div className="flex items-center justify-between gap-4">
                                <input
                                  type="range"
                                  min={10}
                                  max={200}
                                  step={1}
                                  value={typeof quizLength === "number" ? quizLength : 15}
                                  onChange={(e) => setQuizLength(Number(e.target.value))}
                                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <input
                                    type="number"
                                    min={10}
                                    max={200}
                                    value={typeof quizLength === "number" ? quizLength : 15}
                                    onChange={(e) => {
                                      const val = Math.max(10, Math.min(200, Number(e.target.value) || 10));
                                      setQuizLength(val);
                                    }}
                                    className="w-16 px-2 py-1 text-xs font-mono font-bold text-center text-white bg-slate-900 border border-white/15 rounded-lg focus:outline-none focus:border-indigo-500"
                                  />
                                  <span className="text-[10px] font-mono text-slate-500 uppercase">Qs</span>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-1.5 justify-between">
                                {[10, 25, 50, 100, 200].map((preset) => (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setQuizLength(preset)}
                                    className={`py-1 px-2.5 rounded text-[10px] font-mono transition-all border ${
                                      quizLength === preset
                                        ? "bg-indigo-500/10 border-indigo-500 text-indigo-300 font-bold"
                                        : "bg-white/5 border-transparent text-slate-400 hover:text-slate-200"
                                    }`}
                                  >
                                    {preset} Qs
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <p className="text-[10px] text-slate-500 leading-relaxed">
                            {quizLength === "auto" 
                              ? `Auto-detect: Generating ${getResourceAnalysis().recommendedCount} questions to match study material density (minimum of 10).`
                              : `Manual: Generating exactly ${quizLength} customized dependency questions (10 - 200 questions range).`
                            }
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Big Submission Button */}
                    <button
                      type="button"
                      onClick={generateQuiz}
                      disabled={!notesText.trim() && !uploadedFile && !youtubeUrl.trim()}
                      className="w-full py-4 rounded-xl font-display font-bold text-white bg-gradient-to-r from-indigo-500 to-blue-600 hover:brightness-110 shadow-[0_0_25px_rgba(79,70,229,0.3)] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-md tracking-tight active:scale-[0.99]"
                    >
                      <Sparkles className="w-5 h-5 text-indigo-200" />
                      Generate Cognitive Mirror Quiz
                    </button>

                  </div>
                </div>

              </div>

              {/* Saved Mirrors & History Panel (1 col) */}
              <div className="space-y-6">
                
                {/* Visual Stats Block */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                  <h4 className="font-display font-bold text-sm text-white mb-3 flex items-center gap-2">
                    <BookMarked className="w-4 h-4 text-indigo-400" />
                    Conceptual Metrics
                  </h4>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="bg-black/40 p-4 rounded-xl border border-white/10">
                      <p className="text-[10px] font-mono text-slate-500 uppercase">Mirrors Run</p>
                      <p className="text-2xl font-display font-extrabold text-white mt-1">{sessions.length}</p>
                    </div>
                    <div className="bg-black/40 p-4 rounded-xl border border-white/10">
                      <p className="text-[10px] font-mono text-slate-500 uppercase">Avg Mastery</p>
                      <p className="text-2xl font-display font-extrabold text-indigo-400 mt-1">
                        {sessions.length > 0
                          ? Math.round(
                              (sessions.reduce((acc, curr) => {
                                const qCount = curr.questions.length;
                                if (qCount === 0) return acc;
                                const corrects = curr.questions.filter(
                                  (q) => curr.userAnswers[q.id] === q.correctOptionIndex
                                ).length;
                                return acc + (corrects / qCount) * 100;
                              }, 0) /
                                sessions.length)
                            )
                          : 0}
                        %
                      </p>
                    </div>
                  </div>
                </div>

                {/* History Session List */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                    <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                      <History className="w-4 h-4 text-purple-400" />
                      Cognitive History
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10">
                      {sessions.length} Saved
                    </span>
                  </div>

                  {sessions.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <HelpCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-xs text-slate-400 font-medium">No saved study mirrors</p>
                      <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] mx-auto">
                        Once you run a quiz, your custom diagnostics will reside here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                      {sessions.map((session) => {
                        const total = session.questions.length;
                        const corrects = session.questions.filter(
                          (q) => session.userAnswers[q.id] === q.correctOptionIndex
                        ).length;
                        const pct = Math.round((corrects / total) * 100);

                        return (
                          <div
                            key={session.id}
                            onClick={() => loadHistoricSession(session)}
                            className="p-3 bg-black/40 hover:bg-white/5 border border-white/5 hover:border-white/10 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                          >
                            <div className="overflow-hidden pr-2">
                              <h4 className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors truncate">
                                {session.title}
                              </h4>
                              <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-1 font-mono">
                                <Clock className="w-3 h-3" />
                                {session.createdAt}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                                pct >= 80 
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                  : pct >= 50 
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                              }`}>
                                {session.completed ? `${corrects}/${total}` : "Paused"}
                              </span>
                              <button
                                onClick={(e) => deleteSession(session.id, e)}
                                className="p-1 rounded bg-white/5 text-slate-500 hover:text-red-400 hover:bg-white/10 border border-white/10 transition-all opacity-0 group-hover:opacity-100"
                                title="Delete Session"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          )}

          {/* ==================== LOADING MODE ==================== */}
          {mode === "loading" && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 max-w-xl mx-auto text-center relative z-10"
            >
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-indigo-500/15 rounded-full blur-3xl animate-pulse" />
                <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center relative z-10 animate-spin [animation-duration:8s] backdrop-blur-xl">
                  <Cpu className="w-10 h-10 text-indigo-400 animate-pulse" />
                </div>
              </div>

              <h2 className="font-display font-extrabold text-xl text-white tracking-tight mb-2">
                Assembling Cognitive Mirror
              </h2>
              
              {/* Cycling animated state descriptors */}
              <AnimatePresence mode="wait">
                <motion.p
                  key={loadingStatusIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  className="text-indigo-400 text-sm font-mono tracking-tight h-12 max-w-md mx-auto"
                >
                  {loadingStatuses[loadingStatusIndex]}
                </motion.p>
              </AnimatePresence>

              <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden mt-6 border border-white/10">
                <motion.div 
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                />
              </div>
            </motion.div>
          )}

          {/* ==================== QUIZ INTERACTIVE MODE ==================== */}
          {mode === "quiz" && activeSession && (
            <motion.div 
              key="quiz"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10"
            >
              
              {/* Left Column: Interactive Stepper & Answers (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Stepper Card */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
                  
                  {/* Title & Progress Header */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                    <div>
                      <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest block font-bold">
                        SESSION ACTIVE: {activeSession.title}
                      </span>
                      <h3 className="font-display font-bold text-sm text-indigo-300 mt-1">
                        Question {currentQuestionIndex + 1} of {activeSession.questions.length}
                      </h3>
                    </div>
                    
                    {/* Stepper bubbles */}
                    <div className="flex gap-1.5">
                      {activeSession.questions.map((_, idx) => (
                        <div 
                          key={idx}
                          className={`w-6 h-1 rounded-full transition-all ${
                            idx === currentQuestionIndex 
                              ? "bg-indigo-500" 
                              : idx < currentQuestionIndex 
                                ? "bg-indigo-500/30" 
                                : "bg-white/10"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Question Statement */}
                  <div className="py-2">
                    <p className="text-md font-medium leading-relaxed text-white">
                      {activeSession.questions[currentQuestionIndex].question}
                    </p>
                  </div>

                  {/* Options Stack */}
                  <div className="space-y-3 mt-6">
                    {activeSession.questions[currentQuestionIndex].options.map((option, idx) => {
                      const letter = ["A", "B", "C", "D"][idx];
                      const isSelected = selectedOption === idx;
                      const isCorrect = idx === activeSession.questions[currentQuestionIndex].correctOptionIndex;
                      
                      let btnStyle = "bg-white/5 hover:bg-white/10 border-white/5 text-slate-300 hover:border-white/10";
                      let letterStyle = "bg-white/5 text-slate-400 border-white/5";

                      if (isSelected) {
                        btnStyle = "bg-indigo-500/10 border-indigo-500/40 text-white ring-1 ring-indigo-500/20";
                        letterStyle = "bg-indigo-600 text-white border-indigo-500";
                      }

                      if (isAnswerValidated) {
                        // Correct answer always green
                        if (isCorrect) {
                          btnStyle = "bg-emerald-500/10 border-emerald-500/40 text-emerald-200 ring-1 ring-emerald-500/20";
                          letterStyle = "bg-emerald-600 text-white border-emerald-500";
                        } 
                        // If user selected this and it was wrong, highlight red
                        else if (isSelected && !isCorrect) {
                          btnStyle = "bg-red-500/10 border-red-500/40 text-red-200 ring-1 ring-red-500/20";
                          letterStyle = "bg-red-600 text-white border-red-500";
                        }
                        // Other options locked/disabled style
                        else {
                          btnStyle = "bg-white/5 border-white/5 text-slate-500 opacity-60";
                        }
                      }

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectOption(idx)}
                          disabled={isAnswerValidated}
                          className={`w-full text-left p-4 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${btnStyle}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-lg text-xs font-bold border shrink-0 flex items-center justify-center ${letterStyle}`}>
                              {letter}
                            </span>
                            <span className="text-sm pt-0.5 leading-snug">{option}</span>
                          </div>
                          {isAnswerValidated && isCorrect && (
                            <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                          {isAnswerValidated && isSelected && !isCorrect && (
                            <svg className="w-5 h-5 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Submission Action bar */}
                  <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("dashboard");
                        setActiveSession(null);
                      }}
                      className="text-xs text-slate-400 hover:text-white px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                    >
                      Quit Session
                    </button>

                    {!isAnswerValidated ? (
                      <button
                        type="button"
                        onClick={validateAnswer}
                        disabled={selectedOption === null}
                        className="py-2.5 px-6 rounded-xl font-display font-bold text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center gap-1.5"
                      >
                        Validate Answer
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={nextQuestion}
                        className="py-2.5 px-6 rounded-xl font-display font-bold text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all active:scale-[0.98] flex items-center gap-1.5"
                      >
                        {currentQuestionIndex + 1 < activeSession.questions.length ? "Next Question" : "View Diagnostics"}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                </div>

                {/* Cognitive Feedback Metaphor Block */}
                {isAnswerValidated && (
                  <div className="p-4 bg-indigo-500/10 border-l-4 border-indigo-400 rounded-r-lg">
                    <p className="text-xs text-indigo-200 leading-relaxed">
                      <strong className="block mb-1 text-white">Cognitive Mirror Analysis:</strong>
                      {activeSession.questions[currentQuestionIndex].conceptTested}. Use the visual remediation map on the right to align your conceptual connections.
                    </p>
                  </div>
                )}

              </div>

              {/* Right Column: Interactive Diagnostic Canvas & Diagrams (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                <AnimatePresence mode="wait">
                  
                  {/* State 1: Answer is NOT validated yet (Waiting visual) */}
                  {!isAnswerValidated ? (
                    <motion.div
                      key="waiting"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-[460px] relative overflow-hidden backdrop-blur-xl"
                    >
                      <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-cyan-500/0 -z-10" />
                      <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 mb-4 animate-pulse">
                        <Eye className="w-8 h-8 text-indigo-400" />
                      </div>
                      <h4 className="font-display font-bold text-md text-slate-200">
                        Diagnostic Engine Ready
                      </h4>
                      <p className="text-xs text-slate-500 mt-2 max-w-[280px]">
                        Select an option and trigger "Validate Answer" to render the customized Vector Flowchart and analogy diagnostics.
                      </p>
                    </motion.div>
                  ) : (
                    
                    /* State 2: Answer is validated (Show custom infographics!) */
                    <motion.div
                      key="diagnostics"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="space-y-6"
                    >
                      {/* Diagnostic Banner */}
                      {selectedOption === activeSession.questions[currentQuestionIndex].correctOptionIndex ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-start gap-3">
                          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-bold text-emerald-200">Concept Relationship Mastered!</h4>
                            <p className="text-xs text-emerald-300 mt-1">Excellent comprehension. Let's inspect the underlying cognitive diagram to lock in this connection.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
                          <HelpCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-bold text-amber-200">Conceptual Gap Identified</h4>
                            <p className="text-xs text-amber-300 mt-1">A divergence in relational logic has been detected. Use the mirror diagram below to align your understanding.</p>
                          </div>
                        </div>
                      )}

                      {/* On-Demand Explanatory Infographics Frame */}
                      <div className="bg-slate-900 border border-indigo-500/20 rounded-2xl overflow-hidden relative shadow-2xl flex flex-col">
                        
                        {/* Infographic Controls & Title */}
                        <div className="bg-black/40 px-5 py-3.5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-wider block font-bold">
                              DIAGNOSTIC VISUALIZATION
                            </span>
                            <h4 className="font-display font-bold text-xs text-slate-200 mt-0.5 truncate max-w-[240px] sm:max-w-[280px]">
                              {activeSession.questions[currentQuestionIndex].conceptTested}
                            </h4>
                          </div>

                          {/* Beautiful Interactive Switch: Explain like I'm 5 */}
                          <div className="flex items-center gap-2 self-start sm:self-auto bg-black/60 border border-white/10 p-1.5 rounded-xl shrink-0">
                            <button
                              type="button"
                              onClick={() => setEli5Mode(false)}
                              className={`px-3 py-1 text-[10px] font-semibold rounded-lg transition-all flex items-center gap-1 ${
                                !eli5Mode 
                                  ? "bg-indigo-600 text-white" 
                                  : "text-slate-400 hover:text-white"
                              }`}
                            >
                              <Cpu className="w-3 h-3" /> Technical Map
                            </button>
                            <button
                              type="button"
                              onClick={() => setEli5Mode(true)}
                              className={`px-3 py-1 text-[10px] font-semibold rounded-lg transition-all flex items-center gap-1 ${
                                eli5Mode 
                                  ? "bg-indigo-600 text-white" 
                                  : "text-slate-400 hover:text-white"
                              }`}
                            >
                              <Baby className="w-3.5 h-3.5" /> Explain Like I'm 5
                            </button>
                          </div>
                        </div>

                        {/* Interactive SVG Renderer Area */}
                        <div className="p-4 sm:p-6 bg-[#080a10] flex justify-center items-center overflow-x-auto relative min-h-[380px]">
                          {/* Grid line background overlay for premium engineering feel */}
                          <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-10 pointer-events-none">
                            <div className="border-r border-b border-white/20"></div>
                            <div className="border-r border-b border-white/20"></div>
                            <div className="border-r border-b border-white/20"></div>
                            <div className="border-r border-b border-white/20"></div>
                            <div className="border-r border-b border-white/20"></div>
                            <div className="border-r border-b border-white/20"></div>
                          </div>

                          <AnimatePresence mode="wait">
                            <motion.div
                              key={eli5Mode ? "eli5-svg" : "tech-svg"}
                              initial={{ opacity: 0, scale: 0.96 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.96 }}
                              transition={{ duration: 0.3 }}
                              className="w-full max-w-[600px] aspect-[600/350] bg-black/60 rounded-xl border border-white/10 p-1 overflow-hidden z-10"
                            >
                              {/* Inject generated SVG safely */}
                              <div 
                                className="w-full h-full text-slate-200"
                                dangerouslySetInnerHTML={{ 
                                  __html: eli5Mode 
                                    ? activeSession.questions[currentQuestionIndex].eli5Svg 
                                    : activeSession.questions[currentQuestionIndex].remediationSvg 
                                }} 
                              />
                            </motion.div>
                          </AnimatePresence>
                        </div>

                        {/* Text explanation container */}
                        <div className="p-5 border-t border-white/10 bg-white/5 backdrop-blur-xl">
                          <AnimatePresence mode="wait">
                            {eli5Mode ? (
                              <motion.div
                                key="eli5-text"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="space-y-2"
                              >
                                <h5 className="text-xs font-mono text-indigo-400 uppercase tracking-wider flex items-center gap-1 font-bold">
                                  <Baby className="w-3.5 h-3.5" /> Visual Metaphor: <span className="text-indigo-300 italic">The Analogical Schema</span>
                                </h5>
                                <p className="text-xs text-slate-300 leading-relaxed italic">
                                  "{activeSession.questions[currentQuestionIndex].eli5Explanation}"
                                </p>
                              </motion.div>
                            ) : (
                              <motion.div
                                key="tech-text"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="space-y-2"
                              >
                                <h5 className="text-xs font-mono text-indigo-400 uppercase tracking-wider flex items-center gap-1 font-bold">
                                  <Cpu className="w-3.5 h-3.5" /> OmniMind AI Justification
                                </h5>
                                <p className="text-xs text-slate-300 leading-relaxed">
                                  {activeSession.questions[currentQuestionIndex].remediationText}
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                      </div>

                    </motion.div>
                  )}

                </AnimatePresence>
              </div>

            </motion.div>
          )}

          {/* ==================== REVIEW / SUMMARY MODE ==================== */}
          {mode === "review" && activeSession && (
            <motion.div 
              key="review"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-4xl mx-auto space-y-8 relative z-10"
            >
              
              {/* Score Header Panel */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 text-center relative overflow-hidden backdrop-blur-xl">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
                
                <h2 className="font-display font-extrabold text-xl sm:text-2xl text-white tracking-tight">
                  Study Diagnostic Complete
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-1 uppercase tracking-widest font-bold">
                  {activeSession.title}
                </p>

                {/* Score visualization */}
                {(() => {
                  const total = activeSession.questions.length;
                  const corrects = activeSession.questions.filter(
                    (q) => activeSession.userAnswers[q.id] === q.correctOptionIndex
                  ).length;
                  const pct = Math.round((corrects / total) * 100);

                  return (
                    <div className="mt-6 flex flex-col items-center">
                      <div className="relative flex items-center justify-center">
                        <div className="text-5xl sm:text-6xl font-display font-extrabold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                          {pct}%
                        </div>
                      </div>
                      <p className="text-xs font-semibold text-slate-300 mt-2">
                        {corrects} out of {total} concept relationships Mastered
                      </p>
                      
                      <div className="mt-6 flex gap-3">
                        <button
                          type="button"
                          onClick={() => setMode("dashboard")}
                          className="py-2.5 px-5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 text-xs font-bold transition-all"
                        >
                          Dashboard Home
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            // Reset answers and load quiz
                            const resetSession = {
                              ...activeSession,
                              userAnswers: {},
                              completed: false
                            };
                            setActiveSession(resetSession);
                            setCurrentQuestionIndex(0);
                            setSelectedOption(null);
                            setIsAnswerValidated(false);
                            setEli5Mode(false);
                            setMode("quiz");
                          }}
                          className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Retake Quiz
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Navigation Tabs row for Diagnostics, Material Breakdown, and Embedded Video Quizzes */}
              <div className="flex border-b border-white/10 gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setReviewTab("gap")}
                  className={`py-3 px-4 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 ${
                    reviewTab === "gap"
                      ? "border-indigo-500 text-white bg-white/5 rounded-t-xl"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Brain className="w-4 h-4 text-indigo-400" /> Quiz & Diagnostic Gaps
                </button>
                <button
                  type="button"
                  onClick={() => setReviewTab("video")}
                  className={`py-3 px-4 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 ${
                    reviewTab === "video"
                      ? "border-indigo-500 text-white bg-white/5 rounded-t-xl"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-indigo-400" /> Whole Material Breakdown
                </button>
                <button
                  type="button"
                  onClick={() => setReviewTab("native")}
                  className={`py-3 px-4 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 ${
                    reviewTab === "native"
                      ? "border-indigo-500 text-white bg-white/5 rounded-t-xl"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <HelpCircle className="w-4 h-4 text-indigo-400" /> Embedded Video Quizzes
                </button>
              </div>

              {/* TAB 1: Quiz & Diagnostic Gaps */}
              {reviewTab === "gap" && (
                <div className="space-y-6">
                  {activeSession.quizSummary && (
                    <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6 space-y-3">
                      <h4 className="text-sm font-semibold text-indigo-300 font-mono flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-400" /> QUIZ GAP DIAGNOSTICS & STUDY ADVICE
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">{activeSession.quizSummary}</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <h3 className="font-display font-bold text-md text-white flex items-center gap-2">
                      <Brain className="w-5 h-5 text-indigo-400" />
                      Conceptual Gap Analysis
                    </h3>

                    <div className="space-y-4">
                      {activeSession.questions.map((question, idx) => {
                        const userAnswerIdx = activeSession.userAnswers[question.id];
                        const isCorrect = userAnswerIdx === question.correctOptionIndex;

                        return (
                          <details 
                            key={question.id} 
                            className="bg-white/5 border border-white/10 rounded-xl overflow-hidden group transition-all"
                          >
                            <summary className="p-4 flex items-center justify-between cursor-pointer select-none">
                              <div className="flex items-center gap-3 overflow-hidden pr-2">
                                <span className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center border ${
                                  isCorrect 
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                                    : "bg-red-500/10 border-red-500/20 text-red-400"
                                }`}>
                                  {isCorrect ? <Check className="w-3 h-3" /> : <span className="text-[10px] font-mono font-bold">!</span>}
                                </span>
                                <div className="overflow-hidden">
                                  <p className="text-xs text-slate-500 font-mono uppercase tracking-wider font-bold">Concept {idx + 1}</p>
                                  <h4 className="text-sm font-semibold text-slate-200 truncate mt-0.5">{question.conceptTested}</h4>
                                </div>
                              </div>
                              
                              <span className="text-xs text-indigo-400 group-open:rotate-180 transition-transform font-mono">
                                [Inspect]
                              </span>
                            </summary>

                            <div className="px-4 pb-5 border-t border-white/10 bg-black/40 space-y-4 pt-4">
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-slate-400 uppercase font-mono">Scenario Question:</p>
                                <p className="text-sm text-white leading-relaxed">{question.question}</p>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Choice feedback */}
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold text-slate-400 uppercase font-mono">Your Selection:</p>
                                  <div className={`p-3 rounded-lg border text-xs ${
                                    isCorrect 
                                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-200" 
                                      : "bg-red-500/10 border-red-500/20 text-red-200"
                                  }`}>
                                    {question.options[userAnswerIdx] !== undefined ? question.options[userAnswerIdx] : "Unanswered"}
                                  </div>

                                  {!isCorrect && (
                                    <>
                                      <p className="text-xs font-semibold text-slate-400 uppercase font-mono pt-1">Correct Logic Answer:</p>
                                      <div className="p-3 rounded-lg border bg-emerald-500/10 border-emerald-500/20 text-emerald-200 text-xs">
                                        {question.options[question.correctOptionIndex]}
                                      </div>
                                    </>
                                  )}
                                </div>

                                {/* Remediation content */}
                                <div className="space-y-2 bg-white/5 p-4 rounded-xl border border-white/10">
                                  <p className="text-xs font-semibold text-indigo-400 uppercase font-mono font-bold">OmniMind AI Justification:</p>
                                  <p className="text-xs text-slate-300 leading-relaxed">{question.remediationText}</p>
                                  
                                  <p className="text-xs font-semibold text-amber-400 uppercase font-mono pt-2 font-bold">Metaphorical Explanation (ELI5):</p>
                                  <p className="text-xs text-slate-400 leading-relaxed italic">"{question.eli5Explanation}"</p>
                                </div>
                              </div>

                              {/* Quick diagram display */}
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-slate-400 uppercase font-mono">Custom Visual Remediation:</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="bg-slate-900 border border-white/10 rounded-xl p-3 flex flex-col">
                                    <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-wider mb-2 font-bold">Technical Concept Map</span>
                                    <div 
                                      className="w-full aspect-[600/350] bg-black/60 rounded-lg p-1 overflow-hidden"
                                      dangerouslySetInnerHTML={{ __html: question.remediationSvg }}
                                    />
                                  </div>
                                  <div className="bg-slate-900 border border-white/10 rounded-xl p-3 flex flex-col">
                                    <span className="text-[9px] font-mono text-amber-500 uppercase tracking-wider mb-2 font-bold">Illustrated Metaphor SVG</span>
                                    <div 
                                      className="w-full aspect-[600/350] bg-black/60 rounded-lg p-1 overflow-hidden"
                                      dangerouslySetInnerHTML={{ __html: question.eli5Svg }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Whole Material Breakdown */}
              {reviewTab === "video" && (
                <div className="space-y-6 bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 relative overflow-hidden backdrop-blur-xl">
                  <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-4">
                    <BookOpen className="w-5 h-5 text-indigo-400" />
                    <div>
                      <h3 className="font-display font-bold text-md text-white">Comprehensive Material Breakdown</h3>
                      <p className="text-xs text-slate-400">Chapter-by-chapter insights, core arguments, and major learning resources</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-slate-300 leading-relaxed text-sm">
                    {(() => {
                      const text = activeSession.videoSummary;
                      if (!text) {
                        return (
                          <div className="text-center py-12">
                            <BookMarked className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                            <p className="text-sm text-slate-400">No source breakdown or summary generated for this session.</p>
                          </div>
                        );
                      }
                      const blocks = text.split("\n");
                      return (
                        <div className="space-y-4">
                          {blocks.map((line, i) => {
                            const cleanLine = line.trim();
                            if (!cleanLine) return null;
                            if (cleanLine.startsWith("###")) {
                              return <h4 key={i} className="text-md font-bold text-indigo-300 font-display mt-6 mb-2">{cleanLine.replace("###", "").trim()}</h4>;
                            }
                            if (cleanLine.startsWith("##")) {
                              return <h3 key={i} className="text-lg font-bold text-indigo-400 font-display mt-8 mb-3 border-b border-white/5 pb-2">{cleanLine.replace("##", "").trim()}</h3>;
                            }
                            if (cleanLine.startsWith("#")) {
                              return <h2 key={i} className="text-xl font-extrabold text-white font-display mt-10 mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-300">{cleanLine.replace("#", "").trim()}</h2>;
                            }
                            if (cleanLine.startsWith("-") || cleanLine.startsWith("*")) {
                              return (
                                <ul key={i} className="list-disc pl-5 space-y-1 my-1">
                                  <li className="text-sm text-slate-300">{cleanLine.substring(1).trim()}</li>
                                </ul>
                              );
                            }
                            return <p key={i} className="text-sm leading-relaxed text-slate-300 my-2">{cleanLine}</p>;
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* TAB 3: Embedded/Reconstructed Video Quizzes */}
              {reviewTab === "native" && (
                <div className="space-y-6">
                  <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl flex items-start gap-3">
                    <HelpCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-semibold font-mono text-indigo-300 uppercase tracking-wider">Embedded Source Assessments & Answers</h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        These are explicit check-your-understanding prompts, assessments, or exercises that were discussed or embedded natively inside the video. For non-video documents or videos without explicit embedded questions, OmniMind has reconstructed 2-3 realistic native practice questions focusing directly on the core material.
                      </p>
                    </div>
                  </div>

                  {activeSession.videoNativeQuizzes && activeSession.videoNativeQuizzes.length > 0 ? (
                    <div className="space-y-4">
                      {activeSession.videoNativeQuizzes.map((quiz, idx) => (
                        <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
                          <div className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 shrink-0 flex items-center justify-center font-mono text-xs font-bold">
                              {idx + 1}
                            </span>
                            <div className="space-y-1">
                              <h5 className="text-sm font-bold text-white">Assessment Item</h5>
                              <p className="text-sm text-slate-300 font-sans leading-relaxed">{quiz.question}</p>
                            </div>
                          </div>
                          <div className="pl-9 space-y-3">
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                              <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold block mb-1">Answer / Correct Action:</span>
                              <p className="text-xs text-emerald-200 leading-relaxed font-sans">{quiz.answer}</p>
                            </div>
                            <div className="p-3 bg-slate-900 border border-white/5 rounded-lg">
                              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block mb-1">Contextual Explanation:</span>
                              <p className="text-xs text-slate-300 leading-relaxed font-sans italic">"{quiz.explanation}"</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 border border-dashed border-white/10 rounded-xl bg-white/5">
                      <HelpCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">No native embedded quizzes were found or reconstructed for this source material.</p>
                    </div>
                  )}
                </div>
              )}

            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Immersive Theme Sticky Actions & Neural Status Footer */}
      <footer id="immersive-footer" className="max-w-7xl mx-auto px-6 mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
        <div className="flex gap-3">
          <button 
            type="button" 
            onClick={() => { setMode("dashboard"); if (fileInputRef.current) fileInputRef.current.click(); }}
            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Scan whiteboard notes"
          >
            <Camera className="w-5 h-5" />
          </button>
          <button 
            type="button" 
            onClick={() => { setMode("dashboard"); startRecording(); }}
            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Record audio lecture"
          >
            <Mic className="w-5 h-5" />
          </button>
          <button 
            type="button" 
            onClick={() => { setMode("dashboard"); setNotesText(""); }}
            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="New scratchpad input"
          >
            <FileText className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic educational ask input field */}
        <div className="flex-grow max-w-md mx-4 w-full">
          <div className="relative flex items-center">
            <input 
              type="text" 
              className="w-full bg-white/5 border border-white/10 rounded-full py-3 px-6 pr-12 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50" 
              placeholder="Ask OmniMind about active concepts..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setNotesText(e.currentTarget.value);
                  generateQuiz();
                }
              }}
            />
            <div className="absolute right-4 text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Neural status monitor */}
        <div className="flex items-center gap-6 shrink-0">
          <div className="text-right">
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Neural Load</div>
            <div className="text-xs text-indigo-300 font-mono font-bold">82.4% Optimal</div>
          </div>
          <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/30 rounded-full flex items-center justify-center">
            <RotateCcw className="w-4 h-4 text-indigo-300 animate-[spin_10s_linear_infinite]" />
          </div>
        </div>
      </footer>
    </div>
  );
}
