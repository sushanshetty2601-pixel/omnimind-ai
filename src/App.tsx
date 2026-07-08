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
  ExternalLink,
  Lock,
  Unlock,
  LogOut,
  User,
  Calendar,
  TrendingUp,
  Plus,
  Download,
  Star,
  Bookmark
} from "lucide-react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";
import { Question, QuizSession, SyllabusChapter, Bookmark as BookmarkType, StudySchedule, StudySlot } from "./types";
import { 
  fetchCloudSessions, 
  saveCloudSession, 
  deleteCloudSession, 
  auth, 
  fetchUserProfile, 
  saveUserProfile,
  saveUserProfileData
} from "./firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";

export default function App() {
  // Application Modes: 'dashboard' | 'loading' | 'quiz' | 'review'
  const [mode, setMode] = useState<"dashboard" | "loading" | "quiz" | "review">("dashboard");
  
  // Auth States
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<{ username: string; isPremium: boolean } | null>(null);
  const [authUsername, setAuthUsername] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [showAuthDropdown, setShowAuthDropdown] = useState<boolean>(false);

  // Dynamic Study Goals
  const [studyHoursGoal, setStudyHoursGoal] = useState<number>(10);
  const [accuracyGoal, setAccuracyGoal] = useState<number>(80);

  // Quiz Sessions
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [activeSession, setActiveSession] = useState<QuizSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  
  // Interactive Quiz States
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerValidated, setIsAnswerValidated] = useState<boolean>(false);
  const [eli5Mode, setEli5Mode] = useState<boolean>(false);
  const [reviewTab, setReviewTab] = useState<"gap" | "video" | "native" | "syllabus" | "notes">("gap");
  
  // Dashboard Tabs
  const [dashboardTab, setDashboardTab] = useState<"intake" | "scheduler" | "bookmarks" | "analytics">("intake");
  
  // Bookmarks & Study Scheduler States
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [schedules, setSchedules] = useState<StudySchedule[]>([]);
  const [schedulingLoading, setSchedulingLoading] = useState<boolean>(false);
  
  // Scheduler parameters
  const [scheduleClass, setScheduleClass] = useState<string>("Class 10");
  const [scheduleSubjects, setScheduleSubjects] = useState<string>("");
  const [scheduleTopic, setScheduleTopic] = useState<string>("");
  const [scheduleDays, setScheduleDays] = useState<number>(5);
  const [scheduleHours, setScheduleHours] = useState<number>(2);
  const [scheduleStartDate, setScheduleStartDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [isYearPlanner, setIsYearPlanner] = useState<boolean>(false);

  // Selected bookmarked item to view
  const [activeBookmark, setActiveBookmark] = useState<BookmarkType | null>(null);

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

  // Dynamic feedback and status loops during loading
  const [loadingStatusIndex, setLoadingStatusIndex] = useState<number>(0);
  const loadingStatuses = [
    "Mirroring study materials into conceptual mapping matrix...",
    "Scanning visual nodes and lexical contexts...",
    "Detecting cognitive thresholds and concept dependencies...",
    "Drafting customized visual Vector Flowcharts...",
    "Weaving Metaphorical ELI5 schema mappings...",
    "Finalizing Dynamic Scenario Quiz..."
  ];

  // Drag and drop states
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Errors
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio Recording States
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Watch Auth State and sync user sessions
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setAuthLoading(true);
        try {
          const profile = await fetchUserProfile(user.uid);
          if (profile) {
            setUserProfile({
              username: profile.username || user.email?.split("@")[0] || "Student",
              isPremium: !!profile.isPremium
            });
            setBookmarks(profile.bookmarks || []);
            setSchedules(profile.schedules || []);
            if (profile.studyHoursGoal !== undefined) {
              setStudyHoursGoal(profile.studyHoursGoal);
            }
            if (profile.accuracyGoal !== undefined) {
              setAccuracyGoal(profile.accuracyGoal);
            }
          } else {
            // First time login fallback profile creation
            const fallbackName = user.email?.split("@")[0] || "Student";
            await saveUserProfile(user.uid, fallbackName, false);
            setUserProfile({
              username: fallbackName,
              isPremium: false
            });
            setBookmarks([]);
            setSchedules([]);
          }

          // Fetch cloud sessions belonging strictly to this user
          const cloudData = await fetchCloudSessions(user.uid);
          setSessions(cloudData);
          localStorage.setItem("omnimind_sessions", JSON.stringify(cloudData));
        } catch (err) {
          console.error("Failed syncing cloud profile/sessions:", err);
        } finally {
          setAuthLoading(false);
        }
      } else {
        const wasGuestPremium = localStorage.getItem("omnimind_guest_premium") === "true";
        setUserProfile({ username: "Guest Scholar", isPremium: wasGuestPremium });
        if (wasGuestPremium) {
          const savedSessions = localStorage.getItem("omnimind_sessions");
          if (savedSessions) {
            try {
              setSessions(JSON.parse(savedSessions));
            } catch (e) {
              setSessions([]);
            }
          } else {
            setSessions([]);
          }
        } else {
          setSessions([]);
          localStorage.removeItem("omnimind_sessions");
        }
        setBookmarks([]);
        setSchedules([]);
        setStudyHoursGoal(10);
        setAccuracyGoal(80);
      }
    });

    return () => unsubscribe();
  }, []);

  // Compute the volume/depth of provided materials to suggest number of questions
  const getResourceAnalysis = () => {
    const textLength = notesText.trim().length;
    const hasFile = !!uploadedFile;
    const hasYoutube = !!youtubeUrl.trim();
    const totalWords = notesText.trim() ? notesText.trim().split(/\s+/).filter(Boolean).length : 0;
    
    if (textLength === 0 && !hasFile && !hasYoutube) return { wordCount: 0, depth: "None", recommendedCount: 0 };
    
    let depth: "Micro-snippet" | "Standard Study" | "Comprehensive Outline" | "Deep Repository" | "YouTube Lecture Scan" = "Micro-snippet";
    let recommendedCount = 10;
    
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

  // Save sessions helper (both local and cloud)
  const updateSingleSession = (session: QuizSession) => {
    setSessions((prev) => {
      const next = prev.filter(s => s.id !== session.id);
      next.unshift(session);
      if ((currentUser && userProfile?.username && userProfile.username !== "Guest Scholar") || userProfile?.isPremium) {
        localStorage.setItem("omnimind_sessions", JSON.stringify(next));
      }
      return next;
    });
    // Cloud sync in background
    if (currentUser && userProfile?.username && userProfile.username !== "Guest Scholar") {
      saveCloudSession(session, currentUser.uid).catch(e => console.error("Cloud save failure:", e));
    }
  };

  // Status index looping during loading (Speed is 2x for premium users!)
  useEffect(() => {
    let interval: any;
    if (mode === "loading") {
      setLoadingStatusIndex(0);
      const delay = userProfile?.isPremium ? 1200 : 2500;
      interval = setInterval(() => {
        setLoadingStatusIndex((prev) => (prev + 1) % loadingStatuses.length);
      }, delay);
    }
    return () => clearInterval(interval);
  }, [mode, userProfile]);

  // Auth Submit Handler
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUsername.trim() || !authPassword.trim()) {
      setAuthError("Please fill in all credentials.");
      return;
    }
    if (authPassword.length < 6) {
      setAuthError("Password must be at least 6 characters.");
      return;
    }

    setAuthError(null);
    setAuthLoading(true);

    // Maps a user input username to a synthetic local domain email if it doesn't look like a real email
    const email = authUsername.includes("@") ? authUsername : `${authUsername.trim().toLowerCase()}@omnimind.local`;

    try {
      if (isSignUp) {
        const cred = await createUserWithEmailAndPassword(auth, email, authPassword);
        await saveUserProfile(cred.user.uid, authUsername.trim(), false);
        setUserProfile({
          username: authUsername.trim(),
          isPremium: false
        });
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, authPassword);
        const profile = await fetchUserProfile(cred.user.uid);
        setUserProfile({
          username: profile?.username || authUsername.trim(),
          isPremium: !!profile?.isPremium
        });
        if (profile) {
          if (profile.studyHoursGoal !== undefined) {
            setStudyHoursGoal(profile.studyHoursGoal);
          }
          if (profile.accuracyGoal !== undefined) {
            setAccuracyGoal(profile.accuracyGoal);
          }
        }
      }
      setAuthUsername("");
      setAuthPassword("");
      setShowAuthDropdown(false);
    } catch (err: any) {
      console.error(err);
      let msg = err.message || "Failed to authenticate.";
      if (err.code === "auth/operation-not-allowed" || msg.includes("operation-not-allowed")) {
        msg = "The Email/Password Sign-In Provider is disabled in your Firebase Auth settings. Please go to your Firebase Console -> Authentication -> Sign-in Method, and enable 'Email/Password'. In the meantime, you can continue exploring fully in Guest Mode (progress is loaded in memory!).";
      } else if (msg.includes("auth/email-already-in-use")) {
        msg = "Username already taken.";
      } else if (msg.includes("auth/invalid-credential") || msg.includes("auth/wrong-password") || msg.includes("auth/user-not-found")) {
        msg = "Invalid username or password.";
      }
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setAuthLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const cred = await signInWithPopup(auth, provider);
      const profile = await fetchUserProfile(cred.user.uid);
      if (profile) {
        setUserProfile({
          username: profile.username || cred.user.displayName || cred.user.email?.split("@")[0] || "Student",
          isPremium: !!profile.isPremium
        });
        if (profile.studyHoursGoal !== undefined) {
          setStudyHoursGoal(profile.studyHoursGoal);
        }
        if (profile.accuracyGoal !== undefined) {
          setAccuracyGoal(profile.accuracyGoal);
        }
      } else {
        const username = cred.user.displayName || cred.user.email?.split("@")[0] || "Student";
        await saveUserProfile(cred.user.uid, username, false);
        setUserProfile({
          username,
          isPremium: false
        });
      }
      setShowAuthDropdown(false);
    } catch (err: any) {
      console.error(err);
      let msg = err.message || "Failed to authenticate with Google.";
      if (err.code === "auth/operation-not-allowed" || msg.includes("operation-not-allowed")) {
        msg = "Google Login Provider might be disabled in your Firebase project. Please enable Google provider in your Firebase Auth console, or continue using Guest Mode (no login required!).";
      }
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  // Study Goal Setters
  const handleUpdateStudyHoursGoal = async (val: number) => {
    setStudyHoursGoal(val);
    if (currentUser) {
      await saveUserProfileData(currentUser.uid, { studyHoursGoal: val });
    }
  };

  const handleUpdateAccuracyGoal = async (val: number) => {
    setAccuracyGoal(val);
    if (currentUser) {
      await saveUserProfileData(currentUser.uid, { accuracyGoal: val });
    }
  };

  // Premium State Toggle Handler
  const togglePremium = async () => {
    if (!userProfile) return;
    const nextPremium = !userProfile.isPremium;
    setUserProfile({ ...userProfile, isPremium: nextPremium });
    if (currentUser) {
      await saveUserProfile(currentUser.uid, userProfile.username, nextPremium);
    } else {
      localStorage.setItem("omnimind_guest_premium", nextPremium ? "true" : "false");
      if (nextPremium) {
        localStorage.setItem("omnimind_sessions", JSON.stringify(sessions));
      } else {
        localStorage.removeItem("omnimind_sessions");
        setSessions([]);
      }
    }
  };

  // Sign out handler
  const handleSignOut = () => {
    signOut(auth);
    setMode("dashboard");
  };

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
      
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.lineWidth = 3;
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, "#6366f1");
      gradient.addColorStop(0.5, "#a855f7");
      gradient.addColorStop(1, "#06b6d4");
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
      ctx.stroke();
    };
    draw();
  };

  // Audio Recording Handlers
  const startRecording = async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);
      setAudioUrl(null);
      setUploadedFile(null);
      setFilePreview(null);
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      
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
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Clean = (reader.result as string).split(",")[1];
          setUploadedFile({
            data: base64Clean,
            mimeType: "audio/webm",
            name: "RecordedLecture.webm"
          });
        };
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setTimeout(() => {
        drawWaveform();
      }, 100);

    } catch (err: any) {
      console.error(err);
      setErrorMessage("Could not access microphone. Please allow permissions in your browser.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processSelectedFile(file);
  };

  const processSelectedFile = (file: File) => {
    setErrorMessage(null);
    setAudioUrl(null);

    const isImage = file.type.startsWith("image/");
    const isAudio = file.type.startsWith("audio/");
    const isPDF = file.type === "application/pdf";

    if (!isImage && !isAudio && !isPDF) {
      setErrorMessage("Unsupported format. Please upload an image, audio file, or a PDF document.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Clean = (reader.result as string).split(",")[1];
      setUploadedFile({
        data: base64Clean,
        mimeType: file.type || "application/octet-stream",
        name: file.name
      });
      if (isImage) {
        setFilePreview(reader.result as string);
      } else {
        setFilePreview(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processSelectedFile(file);
  };

  const clearFile = () => {
    setUploadedFile(null);
    setFilePreview(null);
    setAudioUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Generate study mirror from API
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
          questionCount: finalCount,
          isPremium: !!userProfile?.isPremium
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "An unexpected error occurred during cognitive processing.");
      }

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
        youtubeUrl: youtubeUrl || undefined,
        syllabus: data.syllabus
      };

      updateSingleSession(newSession);
      setActiveSession(newSession);
      setCurrentQuestionIndex(0);
      setSelectedOption(null);
      setIsAnswerValidated(false);
      setEli5Mode(false);
      setReviewTab("gap");
      setMode("quiz");

      // Reset
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

  const handleSelectOption = (index: number) => {
    if (isAnswerValidated) return;
    setSelectedOption(index);
  };

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
    updateSingleSession(updatedSession);

    if (!isCorrect) {
      setEli5Mode(false);
    }
  };

  const nextQuestion = () => {
    if (!activeSession) return;
    setSelectedOption(null);
    setIsAnswerValidated(false);
    setEli5Mode(false);

    if (currentQuestionIndex + 1 < activeSession.questions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      const completedSession = { ...activeSession, completed: true };
      updateSingleSession(completedSession);
      setActiveSession(completedSession);
      setMode("review");
    }
  };

  // Analytics and Recharts data aggregator
  const getAnalyticsData = () => {
    let solvedCount = 0;
    let correctCount = 0;
    
    // Sort sessions chronologically (oldest to newest) for a logical learning trend
    const sortedSessions = [...sessions].reverse();
    
    const trend = sortedSessions.map((session, idx) => {
      const questionsCount = session.questions?.length || 0;
      if (questionsCount === 0) {
        return { index: `Quiz ${idx + 1}`, mastery: 0, questions: 0, correctAnswers: 0 };
      }
      
      const correctAnswersCount = session.questions.filter(
        (q) => session.userAnswers[q.id] === q.correctOptionIndex
      ).length;
      
      solvedCount += questionsCount;
      correctCount += correctAnswersCount;
      
      const accuracy = Math.round((correctAnswersCount / questionsCount) * 100);
      
      return {
        index: `Quiz ${idx + 1}`,
        mastery: accuracy,
        questions: questionsCount,
        correctAnswers: correctAnswersCount,
        title: session.title
      };
    });
    
    let scheduledHours = 0;
    let completedHours = 0;
    
    schedules.forEach((schedule) => {
      schedule.slots?.forEach((slot) => {
        scheduledHours += slot.hours || 0;
        if (slot.completed) {
          completedHours += slot.hours || 0;
        }
      });
    });
    
    return {
      solvedCount,
      correctCount,
      scheduledHours,
      completedHours,
      trend
    };
  };

  // Bookmarking Toggle Engine
  const toggleBookmark = async (item: { 
    type: "question" | "notes"; 
    sessionId: string; 
    title: string; 
    content: string; 
    questionId?: string; 
    chapterNumber?: number;
    options?: string[];
    correctOptionIndex?: number;
    remediationText?: string;
    eli5Explanation?: string;
    remediationSvg?: string;
    eli5Svg?: string;
  }) => {
    let nextBookmarks = [...bookmarks];
    const existingIndex = bookmarks.findIndex(b => {
      if (item.type === "question") {
        return b.type === "question" && b.questionId === item.questionId;
      } else {
        return b.type === "notes" && b.sessionId === item.sessionId && b.chapterNumber === item.chapterNumber;
      }
    });

    if (existingIndex > -1) {
      nextBookmarks.splice(existingIndex, 1);
    } else {
      const newBookmark: BookmarkType = {
        id: "bookmark_" + Date.now(),
        type: item.type,
        createdAt: new Date().toLocaleDateString(),
        title: item.title,
        sessionId: item.sessionId,
        questionId: item.questionId,
        chapterNumber: item.chapterNumber,
        content: item.content,
        options: item.options,
        correctOptionIndex: item.correctOptionIndex,
        remediationText: item.remediationText,
        eli5Explanation: item.eli5Explanation,
        remediationSvg: item.remediationSvg,
        eli5Svg: item.eli5Svg
      };
      nextBookmarks.unshift(newBookmark);
    }

    setBookmarks(nextBookmarks);
    if (currentUser) {
      await saveUserProfileData(currentUser.uid, { bookmarks: nextBookmarks });
    }
  };

  // Schedule Toggling Engine
  const toggleSlotCompletion = async (scheduleId: string, slotId: string) => {
    const nextSchedules = schedules.map(sched => {
      if (sched.id === scheduleId) {
        return {
          ...sched,
          slots: sched.slots.map(slot => {
            if (slot.id === slotId) {
              return { ...slot, completed: !slot.completed };
            }
            return slot;
          })
        };
      }
      return sched;
    });
    setSchedules(nextSchedules);
    if (currentUser) {
      await saveUserProfileData(currentUser.uid, { schedules: nextSchedules });
    }
  };

  // Schedule Deletion
  const deleteSchedule = async (scheduleId: string) => {
    if (!window.confirm("Are you sure you want to delete this study plan?")) return;
    const nextSchedules = schedules.filter(s => s.id !== scheduleId);
    setSchedules(nextSchedules);
    if (currentUser) {
      await saveUserProfileData(currentUser.uid, { schedules: nextSchedules });
    }
  };

  // Excel (CSV) Download Engine
  const downloadScheduleCSV = (schedule: StudySchedule) => {
    let csvContent = "\ufeff"; // BOM for Excel UTF-8 compliance
    csvContent += "OMNIMIND AI - PERSONALIZED PREMIUM STUDY ROADMAP\r\n";
    csvContent += `Plan Title,${schedule.title.replace(/,/g, ' ')}\r\n`;
    csvContent += `Description,${schedule.description.replace(/,/g, ' ')}\r\n`;
    csvContent += `Created At,${schedule.createdAt}\r\n\r\n`;
    
    csvContent += "Slot ID,Study Date,Scheduled Time,Target Hours,Core Study Topic,Actionable Study Tips & Checkpoints,Completion Status\r\n";
    
    schedule.slots.forEach((slot, index) => {
      const topicEscaped = slot.topic.replace(/"/g, '""');
      const tipsEscaped = slot.tips.replace(/"/g, '""');
      const row = [
        `Session ${index + 1}`,
        slot.date,
        slot.time,
        `${slot.hours} hours`,
        `"${topicEscaped}"`,
        `"${tipsEscaped}"`,
        slot.completed ? "COMPLETED" : "PENDING"
      ].join(",");
      csvContent += row + "\r\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `OmniMind_AI_Study_Schedule_${schedule.title.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // AI custom scheduler generation caller
  const handleGenerateAISchedule = async () => {
    if (!userProfile?.isPremium) {
      alert("This is a Premium-exclusive feature! Please upgrade to premium to schedule studies with AI.");
      return;
    }
    
    const cleanClass = scheduleClass.trim();
    if (!cleanClass) {
      alert("Please provide a Class/Grade/Level (e.g., Class 10, Class 12, University).");
      return;
    }

    const cleanSubjects = scheduleSubjects.trim();
    if (!cleanSubjects) {
      alert("Please provide at least one subject (e.g., Physics, Chemistry, Maths). You can enter multiple subjects separated by commas.");
      return;
    }

    setSchedulingLoading(true);
    try {
      const subjectsArray = cleanSubjects.split(",").map((s) => s.trim()).filter(Boolean);
      const topicsArray = scheduleTopic.trim() ? scheduleTopic.split(",").map((t) => t.trim()).filter(Boolean) : [];

      const response = await fetch("/api/generate-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class: cleanClass,
          subjects: subjectsArray,
          topics: topicsArray,
          isYearPlanner: isYearPlanner,
          startDate: scheduleStartDate,
          hoursPerDay: scheduleHours,
          durationDays: scheduleDays
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to generate schedule.");
      }

      const data = await response.json();
      
      const newSchedule: StudySchedule = {
        id: "schedule_" + Date.now(),
        title: data.title || `${cleanClass} Study Plan`,
        description: data.description || "A custom study plan crafted by OmniMind AI.",
        createdAt: new Date().toLocaleDateString(),
        slots: data.slots.map((s: any, idx: number) => ({
          id: `slot_${idx}_${Date.now()}`,
          date: s.date,
          time: s.time || "09:00 AM",
          hours: s.hours || scheduleHours,
          subject: s.subject || subjectsArray[0] || "General",
          topic: s.topic,
          tips: s.tips || "Review concept gap mappings and video resources.",
          youtubeBest: s.youtubeBest,
          youtubeOptions: s.youtubeOptions || [],
          completed: false
        })),
        isAI: true,
        class: data.class || cleanClass,
        subjects: data.subjects || subjectsArray,
        isYearPlanner: !!data.isYearPlanner || isYearPlanner
      };

      const nextSchedules = [newSchedule, ...schedules];
      setSchedules(nextSchedules);
      
      if (currentUser) {
        await saveUserProfileData(currentUser.uid, { schedules: nextSchedules });
      }

      // Reset form topics
      setScheduleTopic("");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to generate study schedule.");
    } finally {
      setSchedulingLoading(false);
    }
  };

  const loadHistoricSession = (session: QuizSession) => {
    setActiveSession(session);
    setErrorMessage(null);
    if (session.completed) {
      setMode("review");
    } else {
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

  const deleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== sessionId);
    setSessions(updated);
    localStorage.setItem("omnimind_sessions", JSON.stringify(updated));
    deleteCloudSession(sessionId).catch(err => console.error("Cloud delete failure:", err));
    if (activeSession?.id === sessionId) {
      setActiveSession(null);
      setMode("dashboard");
    }
  };

  // High-fidelity printable/offline study pack download engine
  const downloadPremiumStudyPack = (session: QuizSession) => {
    if (!userProfile?.isPremium) {
      alert("This is a Premium-exclusive feature! Please upgrade to premium to download your study pack.");
      return;
    }

    const title = session.title;
    const summaryMarkdown = session.videoSummary || "";
    const quizSummary = session.quizSummary || "";
    
    let questionsHtml = "";
    session.questions.forEach((q, idx) => {
      const isCorrect = session.userAnswers[q.id] === q.correctOptionIndex;
      const correctText = q.options[q.correctOptionIndex];

      questionsHtml += `
        <div style="margin-bottom: 2rem; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; background: #fff; page-break-inside: avoid;">
          <h3 style="color: #1e293b; margin-top: 0; font-size: 1.1rem; font-family: 'Space Grotesk', sans-serif;">Concept Question ${idx + 1}: ${q.question}</h3>
          
          <div style="margin: 1rem 0; display: grid; gap: 0.5rem;">
            ${q.options.map((opt, oIdx) => {
              const isSelected = session.userAnswers[q.id] === oIdx;
              const isCorr = q.correctOptionIndex === oIdx;
              let bg = "#f8fafc";
              let border = "1px solid #cbd5e1";
              let color = "#334155";
              if (isCorr) {
                bg = "#ecfdf5";
                border = "1px solid #10b981";
                color = "#047857";
              } else if (isSelected) {
                bg = "#fef2f2";
                border = "1px solid #ef4444";
                color = "#b91c1c";
              }
              return `
                <div style="padding: 0.75rem; border-radius: 8px; background: ${bg}; border: ${border}; color: ${color}; font-weight: ${isCorr || isSelected ? '600' : '400'}">
                  ${isCorr ? '✓' : isSelected ? '✗' : ''} ${opt}
                </div>
              `;
            }).join('')}
          </div>

          <div style="margin-top: 1rem; border-top: 1px solid #f1f5f9; padding-top: 1rem;">
            <p style="font-size: 0.85rem; color: #4f46e5; font-family: monospace; text-transform: uppercase; margin: 0 0 0.5rem; font-weight: bold;">OmniMind Justification</p>
            <p style="font-size: 0.9rem; color: #475569; margin: 0 0 1rem; line-height: 1.5;">${q.remediationText}</p>
            
            <p style="font-size: 0.85rem; color: #a855f7; font-family: monospace; text-transform: uppercase; margin: 0 0 0.5rem; font-weight: bold;">ELI5 Metaphor Analogy</p>
            <p style="font-size: 0.9rem; color: #475569; margin: 0; line-height: 1.5; font-style: italic;">"${q.eli5Explanation}"</p>
          </div>

          <div style="margin-top: 1.5rem; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div>
              <p style="font-size: 0.8rem; font-family: monospace; color: #64748b; text-transform: uppercase; margin-bottom: 0.5rem;">Technical Diagram</p>
              <div style="background: #0f172a; padding: 0.5rem; border-radius: 8px; border: 1px solid #334155;">
                ${q.remediationSvg}
              </div>
            </div>
            <div>
              <p style="font-size: 0.8rem; font-family: monospace; color: #64748b; text-transform: uppercase; margin-bottom: 0.5rem;">ELI5 Illustration</p>
              <div style="background: #0f172a; padding: 0.5rem; border-radius: 8px; border: 1px solid #334155;">
                ${q.eli5Svg}
              </div>
            </div>
          </div>
        </div>
      `;
    });

    let syllabusHtml = "";
    if (session.syllabus && session.syllabus.length > 0) {
      session.syllabus.forEach((chap) => {
        syllabusHtml += `
          <div style="margin-bottom: 3rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 2rem; page-break-inside: avoid;">
            <h3 style="color: #4f46e5; font-size: 1.3rem; margin-top: 0; font-family: 'Space Grotesk', sans-serif;">Chapter ${chap.chapterNumber}: ${chap.title}</h3>
            <p style="font-size: 0.95rem; color: #334155; line-height: 1.6; margin-bottom: 1.5rem;">${chap.summary}</p>
            
            <div style="margin-bottom: 2rem;">
              <p style="font-size: 0.8rem; font-family: monospace; color: #64748b; text-transform: uppercase; margin-bottom: 0.5rem;">Syllabus Visual Map</p>
              <div style="background: #0f172a; padding: 1rem; border-radius: 12px; border: 1px solid #334155; display: flex; justify-content: center; max-width: 500px; margin: 0 auto;">
                ${chap.conceptDiagramSvg}
              </div>
            </div>

            <div>
              <p style="font-size: 0.8rem; font-family: monospace; color: #64748b; text-transform: uppercase; margin-bottom: 0.5rem;">AI Student Handwritten Notes</p>
              <div style="background-color: #faf8f5; background-image: linear-gradient(#e2e8f0 1.2px, transparent 1.2px); background-size: 100% 1.8rem; line-height: 1.8rem; padding: 2rem 2rem 2rem 4rem; border-radius: 12px; border: 1px solid #e2e8f0; font-family: 'Caveat', cursive; font-size: 1.35rem; color: #1e3a8a; min-height: 150px; position: relative;">
                <div style="position: absolute; top: 0; left: 2.5rem; bottom: 0; width: 1.5px; background-color: #fca5a5;"></div>
                ${chap.handwrittenNotes.replace(/\n/g, '<br/>')}
              </div>
            </div>
          </div>
        `;
      });
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>OmniMind Premium Study Guide - ${title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Inter', sans-serif;
            color: #334155;
            background: #f8fafc;
            margin: 0;
            padding: 3rem 2rem;
            line-height: 1.6;
          }
          .container {
            max-width: 850px;
            margin: 0 auto;
          }
          h1, h2, h3, h4 {
            font-family: 'Space Grotesk', sans-serif;
            color: #0f172a;
          }
          .header {
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 1.5rem;
            margin-bottom: 2.5rem;
          }
          .badge {
            background: #4f46e5;
            color: #fff;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
          }
          .section-title {
            border-left: 4px solid #4f46e5;
            padding-left: 1rem;
            margin-top: 3rem;
            margin-bottom: 1.5rem;
            font-size: 1.4rem;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="badge">OmniMind Premium Study Pack</span>
              <span style="font-size: 0.85rem; font-family: monospace; color: #64748b;">Downloaded: ${new Date().toLocaleDateString()}</span>
            </div>
            <h1 style="font-size: 2.2rem; margin-top: 1rem; margin-bottom: 0.5rem;">${title}</h1>
            <p style="color: #64748b; margin: 0; font-family: monospace; text-transform: uppercase; font-size: 0.85rem;">Prepared for student: ${userProfile?.username}</p>
          </div>

          <div class="section-title">I. Diagnostic Gap Syntheses</div>
          <div style="background: #eef2ff; border-left: 4px solid #4f46e5; padding: 1.25rem; border-radius: 0 12px 12px 0; font-size: 0.95rem; color: #312e81; white-space: pre-wrap; margin-bottom: 2rem;">
            ${quizSummary}
          </div>

          <div class="section-title">II. Visual Syllabus Breakdown</div>
          ${syllabusHtml || '<p style="font-style: italic;">Syllabus breakdowns not found.</p>'}

          <div class="section-title">III. Diagnostic Scenario Quizzes & Justifications</div>
          ${questionsHtml}

          <div class="section-title">IV. Complete Source Synthesis</div>
          <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 2rem; font-size: 0.95rem; color: #334155; line-height: 1.7; white-space: pre-line;">
            ${summaryMarkdown}
          </div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `OmniMind_Study_Guide_${title.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div id="root-container" className="min-h-screen bg-[#030305] text-slate-100 selection:bg-indigo-500 selection:text-white overflow-x-hidden pb-16 relative">
      {/* Glow Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/10 blur-[170px] rounded-full" />
      </div>

      {/* Floating Immersive Header */}
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
                Cognitive Mirror Workspace
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {currentUser && userProfile && userProfile.username !== "Guest Scholar" ? (
              <div className="flex items-center gap-3">
                {/* Premium Switch Switch */}
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                  <span className={`text-[10px] font-mono font-bold uppercase transition-colors ${userProfile.isPremium ? 'text-amber-400' : 'text-slate-400'}`}>
                    {userProfile.isPremium ? "⭐ PREMIUM ACTIVATED" : "STANDARD"}
                  </span>
                  <button 
                    onClick={togglePremium}
                    className={`w-8 h-4 rounded-full p-0.5 transition-colors focus:outline-none ${userProfile.isPremium ? 'bg-amber-500' : 'bg-slate-700'}`}
                  >
                    <div className={`w-3 h-3 rounded-full bg-white transition-transform ${userProfile.isPremium ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="text-xs text-slate-300 font-mono hidden md:block">
                  Student: <span className="text-indigo-300 font-bold">{userProfile.username}</span>
                </div>

                <button 
                  onClick={handleSignOut}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-all"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative" id="auth-dropdown-container">
                <div className="flex items-center gap-3">
                  {/* Guest Premium Switch (so guest scholars can play with premium) */}
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                    <span className={`text-[10px] font-mono font-bold uppercase transition-colors ${userProfile?.isPremium ? 'text-amber-400' : 'text-slate-400'}`}>
                      {userProfile?.isPremium ? "⭐ PREMIUM" : "STANDARD"}
                    </span>
                    <button 
                      onClick={togglePremium}
                      className={`w-8 h-4 rounded-full p-0.5 transition-colors focus:outline-none ${userProfile?.isPremium ? 'bg-amber-500' : 'bg-slate-700'}`}
                    >
                      <div className={`w-3 h-3 rounded-full bg-white transition-transform ${userProfile?.isPremium ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <button
                    onClick={() => setShowAuthDropdown(!showAuthDropdown)}
                    className="px-3.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5"
                  >
                    <User className="w-3.5 h-3.5" />
                    Sign In / Create Account
                  </button>
                </div>

                {/* Gorgeous Absolute Dropdown form */}
                {showAuthDropdown && (
                  <div className="absolute right-0 mt-3 w-80 bg-[#090b11] border border-white/10 rounded-2xl p-5 shadow-[0_10px_40px_rgba(0,0,0,0.6)] z-50 text-left">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                      <h4 className="text-xs font-mono font-bold uppercase text-indigo-400 tracking-wider">
                        {isSignUp ? "Create Scholar Account" : "Secure Authentication"}
                      </h4>
                      <button 
                        onClick={() => setShowAuthDropdown(false)}
                        className="text-slate-400 hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-3.5">
                      {isSignUp && (
                        <div>
                          <label className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 mb-1 font-bold">
                            Choose Username
                          </label>
                          <input 
                            type="text"
                            required
                            placeholder="e.g. sushan"
                            value={authUsername}
                            onChange={(e) => setAuthUsername(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none font-sans"
                          />
                        </div>
                      )}

                      {!isSignUp && (
                        <div>
                          <label className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 mb-1 font-bold">
                            Username or Email
                          </label>
                          <input 
                            type="text"
                            required
                            placeholder="username"
                            value={authUsername}
                            onChange={(e) => setAuthUsername(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none font-sans"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 mb-1 font-bold">
                          Password (min 6 chars)
                        </label>
                        <input 
                          type="password"
                          required
                          placeholder="••••••••"
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none font-sans"
                        />
                      </div>

                      {authError && (
                        <div className="text-[10px] text-red-400 font-mono leading-normal bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">
                          {authError}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/40 text-white rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5"
                      >
                        {authLoading ? (
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : isSignUp ? (
                          "Register Account"
                        ) : (
                          "Log In"
                        )}
                      </button>

                      <div className="relative my-4 flex py-1 items-center">
                        <div className="flex-grow border-t border-white/5"></div>
                        <span className="flex-shrink mx-2 text-[9px] font-mono text-slate-500 uppercase font-bold">Or Continue With</span>
                        <div className="flex-grow border-t border-white/5"></div>
                      </div>

                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={authLoading}
                        className="w-full py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                          <path fill="#EA4335" d="M12 5.04c1.64 0 3.12.56 4.28 1.67l3.2-3.2C17.52 1.58 14.98 1 12 1 7.35 1 3.39 3.67 1.5 7.56l3.85 2.99C6.27 7.55 8.91 5.04 12 5.04z" />
                          <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.51h6.44c-.28 1.47-1.11 2.71-2.35 3.55l3.66 2.84c2.14-1.97 3.38-4.88 3.38-8.55z" />
                          <path fill="#FBBC05" d="M5.35 14.57c-.24-.71-.38-1.47-.38-2.27 0-.8.14-1.56.38-2.27L1.5 7.04C.54 8.97 0 11.13 0 13.4s.54 4.43 1.5 6.36l3.85-2.99z" />
                          <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.66-2.84c-1.01.68-2.32 1.09-4.3 1.09-3.09 0-5.73-2.51-6.65-5.51L1.5 15.81C3.39 19.7 7.35 22.37 12 22.37z" />
                        </svg>
                        Google Account
                      </button>

                      <div className="text-center pt-2 border-t border-white/5">
                        <button
                          type="button"
                          onClick={() => {
                            setIsSignUp(!isSignUp);
                            setAuthError(null);
                          }}
                          className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 underline font-bold"
                        >
                          {isSignUp ? "Already have an account? Log In" : "Need to save? Create a Username"}
                        </button>
                      </div>

                      <div className="bg-indigo-500/5 p-2 rounded-xl text-[9px] font-sans text-indigo-300 leading-normal border border-indigo-500/10">
                        🔒 <span className="font-semibold">Guest Mode notice</span>: Searches and quizzes won't be saved until you create a username.
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
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
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden backdrop-blur-xl">
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
                      Feed OmniMind anything: a scribble from a whiteboard, an audio snippet of a lecture, or pasted notes. We generate relationship-testing quizzes accompanied by customized, dynamic SVGs and Metaphorical ELI5 schemas.
                    </p>
                  </div>
                </div>

                {/* Immersive Dashboard Workspace Tabs */}
                <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => setDashboardTab("intake")}
                    className={`flex-1 py-3 px-4 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                      dashboardTab === "intake"
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span className="hidden sm:inline">Diagnostic</span> Hub
                  </button>
                  <button
                    type="button"
                    onClick={() => setDashboardTab("scheduler")}
                    className={`flex-1 py-3 px-4 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 relative ${
                      dashboardTab === "scheduler"
                        ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    <span className="hidden sm:inline">AI Study</span> Scheduler
                    {!userProfile?.isPremium && (
                      <span className="absolute top-1 right-1 text-[8px] bg-amber-500/30 text-amber-300 font-bold px-1 rounded-full border border-amber-500/30">
                        ⭐
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDashboardTab("bookmarks")}
                    className={`flex-1 py-3 px-4 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                      dashboardTab === "bookmarks"
                        ? "bg-amber-600 text-white shadow-md shadow-amber-500/20"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    <Star className="w-4 h-4" />
                    Bookmarks
                    {bookmarks.length > 0 && (
                      <span className="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        {bookmarks.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDashboardTab("analytics")}
                    className={`hidden md:flex flex-1 py-3 px-4 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all items-center justify-center gap-2 ${
                      dashboardTab === "analytics"
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    Metrics
                  </button>
                </div>

                {dashboardTab === "intake" && (
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
                    </div>

                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-white/10" />
                      <span className="flex-shrink mx-4 text-[10px] font-mono uppercase tracking-widest text-indigo-400 bg-[#030305] px-3 py-1 rounded border border-white/10">
                        And / Or
                      </span>
                      <div className="flex-grow border-t border-white/10" />
                    </div>

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

                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-white/10" />
                      <span className="flex-shrink mx-4 text-[10px] font-mono uppercase tracking-widest text-indigo-400 bg-[#030305] px-3 py-1 rounded border border-white/10">
                        And / Or
                      </span>
                      <div className="flex-grow border-t border-white/10" />
                    </div>

                    <div className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                      Option C: Upload Educational Assets / Explain Verbally
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div 
                        onDragOver={handleDragOver}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
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
                        <p className="text-xs font-semibold text-slate-300">Scan Notes or File</p>
                        <p className="text-[10px] text-slate-500 mt-1 max-w-[180px]">Drag PNG, JPG, PDF or MP3 (Max 10MB)</p>
                      </div>

                      <div className="border border-white/10 bg-black/40 rounded-xl p-5 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                            <Mic className="w-3.5 h-3.5 text-indigo-400" /> Speak Verbal Notes
                          </p>
                          {isRecording && (
                            <span className="flex h-2 w-2 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                            </span>
                          )}
                        </div>

                        <div className="my-3 h-12 bg-[#080a10] rounded-lg overflow-hidden flex items-center justify-center relative border border-white/5">
                          {isRecording ? (
                            <canvas ref={canvasRef} width="300" height="48" className="w-full h-full" />
                          ) : audioUrl ? (
                            <div className="flex items-center gap-2 px-3 w-full justify-between">
                              <span className="text-[10px] text-indigo-400 font-mono flex items-center gap-1">
                                <FileAudio className="w-3 h-3" /> Ready
                              </span>
                              <audio src={audioUrl} controls className="h-8 max-w-[160px]" />
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

                    {(notesText.trim() || uploadedFile || youtubeUrl.trim()) && (
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Intake Diagnostics</span>
                          <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                            {getResourceAnalysis().depth}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                          <div>
                            <span className="text-slate-500 block">Size Detected</span>
                            <span className="text-slate-200 font-semibold">{getResourceAnalysis().wordCount} words</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Recommended</span>
                            <span className="text-slate-200 font-semibold text-indigo-300">{getResourceAnalysis().recommendedCount} Core Questions</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-white/5 space-y-3">
                          <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider">Select Quiz Depth</label>
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
                              onClick={() => { if (quizLength === "auto") setQuizLength(15); }}
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
                              <input
                                type="range"
                                min={10}
                                max={200}
                                step={1}
                                value={typeof quizLength === "number" ? quizLength : 15}
                                onChange={(e) => setQuizLength(Number(e.target.value))}
                                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                              />
                              <div className="flex flex-wrap gap-1 border-t border-white/5 pt-2 justify-between">
                                {[10, 25, 50, 100].map((preset) => (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setQuizLength(preset)}
                                    className={`py-0.5 px-2 rounded text-[10px] font-mono transition-all ${
                                      quizLength === preset ? "bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30" : "text-slate-400 hover:text-slate-200"
                                    }`}
                                  >
                                    {preset} Qs
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={generateQuiz}
                      disabled={!notesText.trim() && !uploadedFile && !youtubeUrl.trim()}
                      className="w-full py-4 rounded-xl font-display font-bold text-white bg-gradient-to-r from-indigo-500 to-blue-600 hover:brightness-110 shadow-[0_0_25px_rgba(79,70,229,0.3)] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-md tracking-tight active:scale-[0.99]"
                    >
                      <Sparkles className="w-5 h-5 text-indigo-200 animate-pulse" />
                      Generate Cognitive Mirror Quiz
                    </button>
                  </div>
                </div>
              )}

                {dashboardTab === "scheduler" && (
                  <div className="space-y-6">
                    {/* Upgrade Warning if not premium */}
                    {!userProfile?.isPremium ? (
                      <div className="bg-gradient-to-br from-purple-950/40 to-indigo-950/40 border border-purple-500/20 rounded-2xl p-6 text-center space-y-4 relative overflow-hidden backdrop-blur-xl">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl" />
                        <Calendar className="w-12 h-12 text-purple-400 mx-auto animate-bounce" />
                        <h4 className="font-display font-extrabold text-lg text-white">Unlock Premium AI Study Scheduler</h4>
                        <p className="text-xs text-slate-300 max-w-lg mx-auto leading-relaxed">
                          Get a powerful, customized study roadmap generated instantly by our advanced AI. Schedule exact dates, track completion, download print-ready schedules to Excel, and map study plans to quiz gap remediation points.
                        </p>
                        <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-200 inline-block font-mono">
                          Toggle the <b>⭐ PREMIUM ACTIVATED</b> switch in the top header to unlock instantly!
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Plan Customization Form */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl space-y-4 text-left animate-fadeIn">
                          <div className="flex items-center justify-between border-b border-white/5 pb-3">
                            <h4 className="font-display font-bold text-sm text-white flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                              Generate Custom Study Roadmap
                            </h4>
                            <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                              ⭐ PREMIUM
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Class/Grade Level Selection */}
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
                                🎓 Target Class / Grade Level
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={scheduleClass}
                                  onChange={(e) => setScheduleClass(e.target.value)}
                                  placeholder="e.g. Class 10, Class 12, University"
                                  className="flex-1 bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-sans"
                                />
                                <select
                                  onChange={(e) => setScheduleClass(e.target.value)}
                                  value={scheduleClass}
                                  className="bg-[#0c0f17] border border-white/10 rounded-xl px-2 text-xs text-slate-300 focus:outline-none focus:border-purple-500 font-sans cursor-pointer"
                                >
                                  <option value="Class 10">Class 10</option>
                                  <option value="Class 11">Class 11</option>
                                  <option value="Class 12">Class 12</option>
                                  <option value="Competitive Exams">Competitive Exams</option>
                                  <option value="University">University</option>
                                </select>
                              </div>
                            </div>

                            {/* Multi-Subject Entry */}
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
                                📚 Subjects (separate with commas for multiple)
                              </label>
                              <input
                                type="text"
                                value={scheduleSubjects}
                                onChange={(e) => setScheduleSubjects(e.target.value)}
                                placeholder="e.g., Physics, Chemistry, Mathematics, History"
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-sans"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Topics list */}
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
                                📝 Specific Topics to Study (Optional)
                              </label>
                              <input
                                type="text"
                                value={scheduleTopic}
                                onChange={(e) => setScheduleTopic(e.target.value)}
                                placeholder="e.g., Thermodynamics, Calculus, World War II"
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-sans"
                              />
                            </div>

                            {/* Start Date */}
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
                                📅 Start Date
                              </label>
                              <input
                                type="date"
                                value={scheduleStartDate}
                                onChange={(e) => setScheduleStartDate(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
                              />
                            </div>
                          </div>

                          {/* Planner Type Selector */}
                          <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3">
                            <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
                              🗺️ Planner Duration & Structure
                            </span>
                            <div className="flex flex-col sm:flex-row gap-3">
                              <button
                                type="button"
                                onClick={() => setIsYearPlanner(false)}
                                className={`flex-1 py-2 px-4 rounded-xl border text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 ${
                                  !isYearPlanner 
                                    ? "bg-purple-600/20 border-purple-500/50 text-purple-200 shadow-[0_0_15px_rgba(147,51,234,0.15)]" 
                                    : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10"
                                }`}
                              >
                                ⏱️ Custom Study Roadmap (Days)
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsYearPlanner(true)}
                                className={`flex-1 py-2 px-4 rounded-xl border text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 ${
                                  isYearPlanner 
                                    ? "bg-purple-600/20 border-purple-500/50 text-purple-200 shadow-[0_0_15px_rgba(147,51,234,0.15)]" 
                                    : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10"
                                }`}
                              >
                                📅 1-Year Annual Study Planner
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                            {/* Conditional Duration Slider or Annual badge info */}
                            <div className="space-y-2">
                              {isYearPlanner ? (
                                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-1 text-left h-full flex flex-col justify-center">
                                  <span className="text-xs font-mono font-bold text-indigo-300">📅 1-Year Academic Planner</span>
                                  <p className="text-[10px] text-slate-400 leading-normal">
                                    Generates a structured 12-month curriculum map covering your subjects. It establishes high-level milestones and playlists.
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex justify-between text-[10px] font-mono text-slate-400 uppercase">
                                    <span>Roadmap Duration</span>
                                    <span className="text-purple-400 font-bold">{scheduleDays} Days</span>
                                  </div>
                                  <input
                                    type="range"
                                    min={3}
                                    max={30}
                                    step={1}
                                    value={scheduleDays}
                                    onChange={(e) => setScheduleDays(Number(e.target.value))}
                                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Study Intensity */}
                            <div className="space-y-2">
                              <div className="flex justify-between text-[10px] font-mono text-slate-400 uppercase">
                                <span>Study Intensity</span>
                                <span className="text-purple-400 font-bold">{scheduleHours} Hours/Day</span>
                              </div>
                              <input
                                type="range"
                                min={1}
                                max={8}
                                step={1}
                                value={scheduleHours}
                                onChange={(e) => setScheduleHours(Number(e.target.value))}
                                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleGenerateAISchedule}
                            disabled={schedulingLoading}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white font-display font-bold text-xs shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2"
                          >
                            {schedulingLoading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin" />
                                Synchronizing study nodes and scheduling with AI...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                Construct AI Personalized Roadmap
                              </>
                            )}
                          </button>
                        </div>

                        {/* Saved Schedules List */}
                        <div className="space-y-6">
                          <h3 className="text-sm font-mono text-slate-400 uppercase tracking-widest border-b border-white/10 pb-2 text-left">
                            Your Personal Roadmaps
                          </h3>
                          
                          {schedules.length === 0 ? (
                            <div className="bg-white/5 border border-white/10 p-8 rounded-2xl text-center">
                              <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                              <p className="text-xs text-slate-400">No generated study roadmaps yet.</p>
                              <p className="text-[10px] text-slate-500 mt-1">Provide a topic above to create your first customized roadmap.</p>
                            </div>
                          ) : (
                            <div className="space-y-8">
                              {schedules.map((schedule) => {
                                const totalSlots = schedule.slots.length;
                                const completedSlots = schedule.slots.filter(s => s.completed).length;
                                const progressPct = totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 0;
                                const totalHours = schedule.slots.reduce((acc, s) => acc + s.hours, 0);

                                return (
                                  <div key={schedule.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden backdrop-blur-xl space-y-4 text-left animate-fadeIn">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                                      <div>
                                        <h4 className="text-md font-bold text-white font-display flex items-center gap-2">
                                          <Calendar className="w-4 h-4 text-purple-400" />
                                          {schedule.title}
                                        </h4>
                                        <p className="text-xs text-slate-400 mt-1">{schedule.description}</p>
                                        
                                        {/* Metadata badges */}
                                        <div className="flex flex-wrap items-center gap-2 mt-2.5">
                                          {schedule.class && (
                                            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 flex items-center gap-1">
                                              🎓 {schedule.class}
                                            </span>
                                          )}
                                          {schedule.subjects && schedule.subjects.length > 0 && (
                                            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center gap-1">
                                              📚 {schedule.subjects.join(", ")}
                                            </span>
                                          )}
                                          {schedule.isYearPlanner && (
                                            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-1 animate-pulse">
                                              📅 Annual 1-Year Planner
                                            </span>
                                          )}
                                        </div>

                                        <p className="text-[9px] font-mono text-slate-500 mt-2">Created {schedule.createdAt} • Total Time Target: {totalHours} Hours</p>
                                      </div>

                                      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => downloadScheduleCSV(schedule)}
                                          className="flex-1 sm:flex-initial py-1.5 px-3 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600 hover:text-white border border-emerald-500/20 text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5"
                                          title="Download print-ready Excel sheet"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                          Excel Sheet
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => deleteSchedule(schedule.id)}
                                          className="p-1.5 rounded-lg bg-white/5 text-slate-500 hover:text-red-400 hover:bg-white/10 border border-white/10 transition-all shrink-0"
                                          title="Delete roadmap"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Progress indicator */}
                                    <div className="space-y-1.5">
                                      <div className="flex justify-between text-xs font-mono">
                                        <span className="text-slate-400">Roadmap Progress</span>
                                        <span className="text-purple-400 font-bold">{progressPct}% ({completedSlots}/{totalSlots} slots)</span>
                                      </div>
                                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                                        <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
                                      </div>
                                    </div>

                                    {/* Slots List */}
                                    <div className="space-y-4 pt-2">
                                      {schedule.slots.map((slot) => (
                                        <div 
                                          key={slot.id} 
                                          className={`p-4 rounded-xl border transition-all flex items-start gap-4 ${
                                            slot.completed 
                                              ? "bg-emerald-500/5 border-emerald-500/10 opacity-75" 
                                              : "bg-black/30 border-white/5 hover:border-white/15"
                                          }`}
                                        >
                                          <button
                                            type="button"
                                            onClick={() => toggleSlotCompletion(schedule.id, slot.id)}
                                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all mt-0.5 shrink-0 ${
                                              slot.completed 
                                                ? "bg-emerald-500 border-emerald-400 text-white" 
                                                : "border-slate-600 bg-slate-900 hover:border-purple-500"
                                            }`}
                                          >
                                            {slot.completed && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                                          </button>

                                          <div className="flex-1 space-y-1.5 text-left">
                                            <div className="flex flex-wrap justify-between items-center gap-1">
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className={`text-xs font-mono ${slot.completed ? "text-emerald-400 font-bold" : "text-purple-400 font-bold"}`}>
                                                  {slot.date} @ {slot.time} ({slot.hours} hours)
                                                </span>
                                                {slot.subject && (
                                                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 uppercase">
                                                    {slot.subject}
                                                  </span>
                                                )}
                                              </div>
                                              <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${
                                                slot.completed ? "bg-emerald-500/10 text-emerald-400" : "bg-purple-500/10 text-purple-300"
                                              }`}>
                                                {slot.completed ? "Done" : "Planned"}
                                              </span>
                                            </div>
                                            <h5 className={`text-xs font-bold ${slot.completed ? "text-slate-400 line-through" : "text-slate-200"}`}>
                                              {slot.topic}
                                            </h5>
                                            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                                              💡 <span className="font-semibold text-slate-300">Action Tip:</span> {slot.tips}
                                            </p>

                                            {/* YouTube Resources integration */}
                                            {slot.youtubeBest && (
                                              <div className="mt-3 bg-[#0c0e17]/90 border border-white/10 rounded-xl p-3.5 space-y-3 shadow-lg">
                                                <div className="flex items-center justify-between">
                                                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                                                    ⭐ Best Choice Resource
                                                  </span>
                                                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">YouTube Recommended</span>
                                                </div>
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/5 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                                                  <div className="space-y-1">
                                                    <h6 className="text-[11px] font-bold text-slate-200 line-clamp-1">
                                                      {slot.youtubeBest.title}
                                                    </h6>
                                                    <p className="text-[9px] text-slate-400 font-mono flex items-center gap-2">
                                                      <span>Channel: <b className="text-slate-300">{slot.youtubeBest.channel || "Educational Channel"}</b></span>
                                                      {slot.youtubeBest.duration && (
                                                        <>
                                                          <span>•</span>
                                                          <span>⏳ {slot.youtubeBest.duration}</span>
                                                        </>
                                                      )}
                                                    </p>
                                                  </div>
                                                  <a 
                                                    href={slot.youtubeBest.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white border border-red-500/20 rounded-lg text-[10px] font-mono font-bold transition-all text-center flex items-center justify-center gap-1 shrink-0"
                                                  >
                                                    ▶ Watch Video
                                                  </a>
                                                </div>

                                                {/* Alternative choices of the same topic */}
                                                {slot.youtubeOptions && slot.youtubeOptions.length > 0 && (
                                                  <div className="space-y-2 border-t border-white/5 pt-3">
                                                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest block font-bold">
                                                      🔄 More Options of the Same Topic (Alternative Choices):
                                                    </span>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                      {slot.youtubeOptions.map((opt, oIdx) => (
                                                        <div key={oIdx} className="bg-black/30 p-2.5 rounded-xl border border-white/5 flex flex-col justify-between gap-2 hover:border-white/10 transition-all">
                                                          <div className="space-y-1">
                                                            <div className="flex justify-between items-center">
                                                              <span className="text-[8px] font-mono text-purple-400 font-bold uppercase">Option #{oIdx + 1}</span>
                                                              {opt.duration && <span className="text-[8px] font-mono text-slate-500">⏱️ {opt.duration}</span>}
                                                            </div>
                                                            <p className="text-[10px] text-slate-300 font-bold line-clamp-1" title={opt.title}>{opt.title}</p>
                                                            <p className="text-[9px] text-slate-500 font-mono truncate">{opt.channel || "Educational Video"}</p>
                                                          </div>
                                                          <a 
                                                            href={opt.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="w-full py-1 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 rounded-lg text-[9px] font-mono font-bold transition-all text-center flex items-center justify-center gap-1 shrink-0"
                                                          >
                                                            🔍 View Choice
                                                          </a>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {dashboardTab === "bookmarks" && (
                  <div className="space-y-6">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left">
                      <h3 className="font-display font-extrabold text-md text-white mb-2 flex items-center gap-2">
                        <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                        Bookmarked Concept Explanations & Notes
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Your custom study cabinet populated with specific scenario questions, metaphorical ELI5 explanations, and handwritten notes that you marked for retention.
                      </p>
                    </div>

                    {bookmarks.length === 0 ? (
                      <div className="bg-white/5 border border-white/10 p-12 rounded-2xl text-center">
                        <BookMarked className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                        <p className="text-xs text-slate-400 font-semibold">Your study cabinet is empty.</p>
                        <p className="text-[10px] text-slate-500 mt-1 max-w-sm mx-auto">
                          Click the <b>Save Bookmark</b> or <b>Save Notes</b> star inside your study quizzes or handwritten notes to fill this workspace.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {bookmarks.map((b) => (
                          <div 
                            key={b.id} 
                            className="bg-white/5 border border-white/10 p-5 rounded-xl space-y-3 relative overflow-hidden flex flex-col justify-between group hover:border-amber-500/30 transition-all cursor-pointer text-left"
                            onClick={() => setActiveBookmark(b)}
                          >
                            <div>
                              <div className="flex justify-between items-start gap-2">
                                <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                  b.type === "question" 
                                    ? "bg-amber-500/10 text-amber-400" 
                                    : "bg-pink-500/10 text-pink-400"
                                }`}>
                                  {b.type === "question" ? "Scenario Question" : "Handwritten Lecture"}
                                </span>
                                <span className="text-[9px] font-mono text-slate-500">{b.createdAt}</span>
                              </div>
                              
                              <h4 className="text-xs font-bold text-slate-200 mt-2 line-clamp-2">
                                {b.title}
                              </h4>
                              <p className="text-xs text-slate-400 mt-1 font-sans line-clamp-3">
                                {b.content}
                              </p>
                            </div>

                            <div className="pt-3 border-t border-white/5 flex items-center justify-between mt-3 text-[10px] font-mono">
                              <span className="text-indigo-400 font-semibold group-hover:underline flex items-center gap-1">
                                <Eye className="w-3.5 h-3.5" /> View Details
                              </span>
                              
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleBookmark({
                                    type: b.type,
                                    sessionId: b.sessionId,
                                    title: b.title,
                                    content: b.content,
                                    questionId: b.questionId,
                                    chapterNumber: b.chapterNumber
                                  });
                                }}
                                className="text-slate-500 hover:text-red-400 transition-colors py-1 px-2 rounded hover:bg-white/5"
                                title="Delete Bookmark"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {dashboardTab === "analytics" && (
                  <div className="space-y-6">
                    {(() => {
                      const stats = getAnalyticsData();
                      return (
                        <>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
                              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Concept Quizzes</p>
                              <p className="text-2xl font-display font-extrabold text-white mt-1">{sessions.length}</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
                              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Total Attempted</p>
                              <p className="text-2xl font-display font-extrabold text-indigo-400 mt-1">{stats.solvedCount} Qs</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
                              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Overall Accuracy</p>
                              <p className="text-2xl font-display font-extrabold text-emerald-400 mt-1">
                                {stats.solvedCount > 0 ? Math.round((stats.correctCount / stats.solvedCount) * 100) : 0}%
                              </p>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
                              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Hours Completed</p>
                              <p className="text-2xl font-display font-extrabold text-purple-400 mt-1">
                                {stats.completedHours} / {stats.scheduledHours} hrs
                              </p>
                            </div>
                          </div>

                          {/* ==================== DYNAMIC GOALS & MASTERY TARGETS ==================== */}
                          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl relative overflow-hidden backdrop-blur-xl text-left">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl" />
                            <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-4">
                              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                              <h3 className="font-display font-bold text-sm text-white">Dynamic Study Goals & Mastery Targets</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Hours Goal */}
                              <div className="space-y-3 bg-black/20 p-4 rounded-xl border border-white/5 text-left">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Weekly Hours Goal</span>
                                  <span className="text-sm font-display font-extrabold text-purple-400">{studyHoursGoal} hrs</span>
                                </div>
                                <input
                                  type="range"
                                  min={1}
                                  max={40}
                                  step={1}
                                  value={studyHoursGoal}
                                  onChange={(e) => handleUpdateStudyHoursGoal(Number(e.target.value))}
                                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                />
                                <div className="space-y-1.5">
                                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                                    <span>Target Progress</span>
                                    <span>
                                      {stats.completedHours} / {studyHoursGoal} hrs ({Math.min(100, Math.round((stats.completedHours / studyHoursGoal) * 100))}% reached)
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-900 border border-white/5 h-2 rounded-full overflow-hidden">
                                    <div 
                                      className="bg-purple-500 h-full transition-all duration-300" 
                                      style={{ width: `${Math.min(100, Math.round((stats.completedHours / studyHoursGoal) * 100))}%` }} 
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Accuracy Goal */}
                              <div className="space-y-3 bg-black/20 p-4 rounded-xl border border-white/5 text-left">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Mastery Accuracy Goal</span>
                                  <span className="text-sm font-display font-extrabold text-emerald-400">{accuracyGoal}%</span>
                                </div>
                                <input
                                  type="range"
                                  min={50}
                                  max={100}
                                  step={5}
                                  value={accuracyGoal}
                                  onChange={(e) => handleUpdateAccuracyGoal(Number(e.target.value))}
                                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                                {(() => {
                                  const currentAccuracy = stats.solvedCount > 0 ? Math.round((stats.correctCount / stats.solvedCount) * 100) : 0;
                                  const accuracyPctOfGoal = Math.min(100, Math.round((currentAccuracy / accuracyGoal) * 100));
                                  return (
                                    <div className="space-y-1.5">
                                      <div className="flex justify-between text-[10px] font-mono text-slate-500">
                                        <span>Current Accuracy vs Goal</span>
                                        <span>
                                          {currentAccuracy}% vs {accuracyGoal}% ({accuracyPctOfGoal}% of target)
                                        </span>
                                      </div>
                                      <div className="w-full bg-slate-900 border border-white/5 h-2 rounded-full overflow-hidden">
                                        <div 
                                          className="bg-emerald-500 h-full transition-all duration-300" 
                                          style={{ width: `${accuracyPctOfGoal}%` }} 
                                        />
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>

                            {/* Celebratory Banner or Tips */}
                            {(() => {
                              const currentAccuracy = stats.solvedCount > 0 ? Math.round((stats.correctCount / stats.solvedCount) * 100) : 0;
                              const hoursPercent = Math.min(100, Math.round((stats.completedHours / studyHoursGoal) * 100));
                              const accuracyPercent = Math.min(100, Math.round((currentAccuracy / accuracyGoal) * 100));
                              return (
                                <>
                                  {hoursPercent >= 100 && accuracyPercent >= 100 ? (
                                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-[11px] font-semibold flex items-center gap-2 mt-4 text-left">
                                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                      <span>🎉 Outstanding work! Both your weekly hours and concept mastery accuracy targets have been fully met!</span>
                                    </div>
                                  ) : (
                                    <div className="p-3 bg-indigo-500/5 border border-indigo-500/15 text-indigo-300 rounded-xl text-[11px] flex items-center gap-2 mt-4 text-left">
                                      <Lightbulb className="w-4 h-4 text-indigo-400 shrink-0" />
                                      <span>
                                        {hoursPercent < 100 
                                          ? `Complete ${Math.max(1, studyHoursGoal - stats.completedHours)} more scheduled study hours to meet your weekly target.`
                                          : `Excellent scheduled study hours! Focus on solving dynamic concept quizzes to push your accuracy to ${accuracyGoal}%.`}
                                      </span>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>

                          {sessions.length === 0 ? (
                            <div className="bg-white/5 border border-white/10 p-12 rounded-2xl text-center">
                              <TrendingUp className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                              <p className="text-xs text-slate-400 font-semibold">No telemetry available.</p>
                              <p className="text-[10px] text-slate-500 mt-1">Complete a quiz to compile your progress dashboard.</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-6">
                              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 text-left">
                                <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                                  Mastery Index Sequential Trend (%)
                                </h4>
                                <div className="h-64 w-full text-slate-200 text-xs">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={stats.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                      <defs>
                                        <linearGradient id="colorMastery" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                        </linearGradient>
                                      </defs>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                      <XAxis dataKey="index" stroke="#71717a" />
                                      <YAxis domain={[0, 100]} stroke="#71717a" />
                                      <Tooltip 
                                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }}
                                        formatter={(value) => [`${value}% Mastery`, 'Accuracy']}
                                      />
                                      <Area type="monotone" dataKey="mastery" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorMastery)" />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>

                              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 text-left">
                                <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                                  <Brain className="w-4 h-4 text-emerald-400" />
                                  Quiz Node Resolutions (Correct vs. Solved)
                                </h4>
                                <div className="h-64 w-full text-slate-200 text-xs">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                      <XAxis dataKey="index" stroke="#71717a" />
                                      <YAxis stroke="#71717a" />
                                      <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }} />
                                      <Bar dataKey="questions" name="Total Questions" fill="#3f3f46" radius={[4, 4, 0, 0]} />
                                      <Bar dataKey="correctAnswers" name="Correct Solutions" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Saved Mirrors / History */}
              <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl hidden md:block">
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
                              sessions.reduce((acc, curr) => {
                                const qCount = curr.questions.length;
                                if (qCount === 0) return acc;
                                const corrects = curr.questions.filter(
                                  (q) => curr.userAnswers[q.id] === q.correctOptionIndex
                                ).length;
                                return acc + (corrects / qCount) * 100;
                              }, 0) / sessions.length
                            )
                          : 0}
                        %
                      </p>
                    </div>
                  </div>
                </div>

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
                                <Clock className="w-3 h-3" /> {session.createdAt}
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

              <h2 className="font-display font-extrabold text-xl text-white tracking-tight mb-1">
                Assembling Cognitive Mirror
              </h2>
              {userProfile?.isPremium && (
                <div className="text-[10px] font-mono text-amber-400 font-bold tracking-widest flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 mb-4 uppercase animate-pulse">
                  ⚡ Priority Turbo Processing Active
                </div>
              )}
              
              <AnimatePresence mode="wait">
                <motion.p
                  key={loadingStatusIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="text-indigo-400 text-sm font-mono tracking-tight h-12 max-w-md mx-auto"
                >
                  {loadingStatuses[loadingStatusIndex]}
                </motion.p>
              </AnimatePresence>

              <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden mt-6 border border-white/10">
                <motion.div 
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ repeat: Infinity, duration: userProfile?.isPremium ? 0.75 : 1.5, ease: "easeInOut" }}
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
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                    <div>
                      <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest block font-bold">
                        ACTIVE: {activeSession.title}
                      </span>
                      <h3 className="font-display font-bold text-sm text-indigo-300 mt-1">
                        Concept Question {currentQuestionIndex + 1} of {activeSession.questions.length}
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-sm font-semibold text-slate-100 leading-relaxed font-sans">
                      {activeSession.questions[currentQuestionIndex].question}
                    </p>

                    <div className="space-y-2.5 pt-2">
                      {activeSession.questions[currentQuestionIndex].options.map((option, idx) => {
                        const isSelected = selectedOption === idx;
                        const isValidated = isAnswerValidated;
                        const isCorrectAnswer = idx === activeSession.questions[currentQuestionIndex].correctOptionIndex;

                        let borderClass = "border-white/10 hover:border-white/20 bg-black/20";
                        let textClass = "text-slate-300";

                        if (isValidated) {
                          if (isCorrectAnswer) {
                            borderClass = "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.1)]";
                          } else if (isSelected) {
                            borderClass = "border-red-500/40 bg-red-500/10 text-red-300";
                          } else {
                            borderClass = "border-white/5 bg-black/40 opacity-40";
                          }
                        } else if (isSelected) {
                          borderClass = "border-indigo-500 bg-indigo-950/40 text-indigo-200 ring-1 ring-indigo-500/30";
                        }

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectOption(idx)}
                            disabled={isAnswerValidated}
                            className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm transition-all flex items-start gap-3 ${borderClass} ${textClass}`}
                          >
                            <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 text-xs font-mono font-bold mt-0.5 ${
                              isValidated && isCorrectAnswer 
                                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                : isValidated && isSelected
                                  ? "bg-red-500/20 border-red-500/40 text-red-400"
                                  : isSelected
                                    ? "bg-indigo-500 border-indigo-400 text-white"
                                    : "border-slate-700 bg-slate-900 text-slate-400"
                            }`}>
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span className="flex-1">{option}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-4 border-t border-white/5 flex gap-3">
                      {!isAnswerValidated ? (
                        <button
                          type="button"
                          onClick={validateAnswer}
                          disabled={selectedOption === null}
                          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(79,70,229,0.2)]"
                        >
                          Submit Analytical Answer
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={nextQuestion}
                          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                        >
                          {currentQuestionIndex + 1 < activeSession.questions.length ? "Analyze Next Concept" : "Finish Review Profile"}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Diagram/Metaphor View */}
              <div className="lg:col-span-7">
                <AnimatePresence mode="wait">
                  {isAnswerValidated && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl flex flex-col"
                    >
                      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
                          Cognitive Diagnostics Panel
                        </span>
                        
                        <div className="flex items-center gap-3">
                          {(() => {
                            const currentQuestion = activeSession.questions[currentQuestionIndex];
                            const isBookmarked = bookmarks.some(b => b.type === "question" && b.questionId === currentQuestion.id);
                            return (
                              <button
                                type="button"
                                onClick={() => toggleBookmark({
                                  type: "question",
                                  sessionId: activeSession.id,
                                  title: activeSession.title,
                                  content: currentQuestion.question,
                                  questionId: currentQuestion.id,
                                  options: currentQuestion.options,
                                  correctOptionIndex: currentQuestion.correctOptionIndex,
                                  remediationText: currentQuestion.remediationText,
                                  eli5Explanation: currentQuestion.eli5Explanation,
                                  remediationSvg: currentQuestion.remediationSvg,
                                  eli5Svg: currentQuestion.eli5Svg
                                })}
                                className={`p-1 py-1.5 px-2.5 rounded-lg border transition-all flex items-center gap-1.5 text-[10px] font-mono font-bold ${
                                  isBookmarked 
                                    ? "bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]" 
                                    : "bg-white/5 text-slate-400 hover:text-white border-white/10"
                                }`}
                                title={isBookmarked ? "Remove Bookmark" : "Bookmark Explanation"}
                              >
                                <Star className={`w-3 h-3 ${isBookmarked ? "fill-amber-400 text-amber-400 font-bold" : ""}`} />
                                {isBookmarked ? "Bookmarked" : "Bookmark"}
                              </button>
                            );
                          })()}

                          <div className="flex bg-black/60 rounded-lg p-0.5 border border-white/10">
                            <button
                              type="button"
                              onClick={() => setEli5Mode(false)}
                              className={`py-1 px-3 rounded text-[10px] font-mono transition-all font-bold ${
                                !eli5Mode ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              Technical
                            </button>
                            <button
                              type="button"
                              onClick={() => setEli5Mode(true)}
                              className={`py-1 px-3 rounded text-[10px] font-mono transition-all font-bold ${
                                eli5Mode ? "bg-amber-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              ELI5 Metaphor
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <div className="p-5 flex items-center justify-center relative overflow-hidden bg-[#080a10]/80 min-h-[350px]">
                          <AnimatePresence mode="wait">
                            <motion.div
                              key={eli5Mode ? "eli5-svg" : "tech-svg"}
                              initial={{ opacity: 0, scale: 0.96 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.96 }}
                              transition={{ duration: 0.3 }}
                              className="w-full max-w-[600px] aspect-[600/350] bg-black/60 rounded-xl border border-white/10 p-1 overflow-hidden z-10"
                            >
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
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 text-center relative overflow-hidden backdrop-blur-xl">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
                
                <h2 className="font-display font-extrabold text-xl sm:text-2xl text-white tracking-tight">
                  Study Diagnostic Complete
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-1 uppercase tracking-widest font-bold">
                  {activeSession.title}
                </p>

                {(() => {
                  const total = activeSession.questions.length;
                  const corrects = activeSession.questions.filter(
                    (q) => activeSession.userAnswers[q.id] === q.correctOptionIndex
                  ).length;
                  const pct = Math.round((corrects / total) * 100);

                  return (
                    <div className="mt-6 flex flex-col items-center">
                      <div className="text-5xl sm:text-6xl font-display font-extrabold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        {pct}%
                      </div>
                      <p className="text-xs font-semibold text-slate-300 mt-2">
                        {corrects} out of {total} concept relationships Mastered
                      </p>
                      
                      <div className="mt-6 flex flex-wrap justify-center gap-3">
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
                          className="py-2.5 px-5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Retake Quiz
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadPremiumStudyPack(activeSession)}
                          className="py-2.5 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5 text-purple-200" /> Download Study Pack {!userProfile?.isPremium && "🔒"}
                        </button>
                      </div>

                      {!userProfile?.isPremium && (
                        <div className="mt-4 p-3.5 bg-purple-950/20 border border-purple-500/20 rounded-xl max-w-md text-xs text-purple-300 leading-relaxed font-sans">
                          💎 <span className="font-bold text-white">Unlock Premium Study Packs</span>: Download comprehensive offline-ready study guides with dynamic SVGs, complete summaries, and handwriting sheets. Enable premium at the top right header!
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Navigation Tabs row */}
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
                  onClick={() => setReviewTab("syllabus")}
                  className={`py-3 px-4 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 ${
                    reviewTab === "syllabus"
                      ? "border-indigo-500 text-white bg-white/5 rounded-t-xl"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Layers className="w-4 h-4 text-amber-400" /> Syllabus Visual Maps
                </button>
                <button
                  type="button"
                  onClick={() => setReviewTab("notes")}
                  className={`py-3 px-4 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 ${
                    reviewTab === "notes"
                      ? "border-indigo-500 text-white bg-white/5 rounded-t-xl"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <FileText className="w-4 h-4 text-pink-400" /> Handwritten AI Notes
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
                  <BookOpen className="w-4 h-4 text-indigo-400" /> Complete Video Synthesis
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
                              <span className="text-xs text-indigo-400 group-open:rotate-180 transition-transform font-mono">[Inspect]</span>
                            </summary>

                            <div className="px-4 pb-5 border-t border-white/10 bg-black/40 space-y-4 pt-4">
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-slate-400 uppercase font-mono">Scenario Question:</p>
                                <p className="text-sm text-white leading-relaxed">{question.question}</p>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                                <div className="space-y-2 bg-white/5 p-4 rounded-xl border border-white/10 relative">
                                  <div className="absolute top-3 right-3">
                                    {(() => {
                                      const isBookmarked = bookmarks.some(b => b.type === "question" && b.questionId === question.id);
                                      return (
                                        <button
                                          type="button"
                                          onClick={() => toggleBookmark({
                                            type: "question",
                                            sessionId: activeSession.id,
                                            title: activeSession.title,
                                            content: question.question,
                                            questionId: question.id,
                                            options: question.options,
                                            correctOptionIndex: question.correctOptionIndex,
                                            remediationText: question.remediationText,
                                            eli5Explanation: question.eli5Explanation,
                                            remediationSvg: question.remediationSvg,
                                            eli5Svg: question.eli5Svg
                                          })}
                                          className={`p-1 px-2.5 rounded-lg border transition-all flex items-center gap-1.5 text-[9px] font-mono font-bold ${
                                            isBookmarked 
                                              ? "bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-md" 
                                              : "bg-white/5 text-slate-400 hover:text-white border-white/10"
                                          }`}
                                          title={isBookmarked ? "Remove Bookmark" : "Save Bookmark"}
                                        >
                                          <Star className={`w-3 h-3 ${isBookmarked ? "fill-amber-400 text-amber-400" : ""}`} />
                                          {isBookmarked ? "Saved" : "Save Bookmark"}
                                        </button>
                                      );
                                    })()}
                                  </div>

                                  <p className="text-xs font-semibold text-indigo-400 uppercase font-mono font-bold">OmniMind AI Justification:</p>
                                  <p className="text-xs text-slate-300 leading-relaxed pr-24">{question.remediationText}</p>
                                  
                                  <p className="text-xs font-semibold text-amber-400 uppercase font-mono pt-2 font-bold">Metaphorical Explanation (ELI5):</p>
                                  <p className="text-xs text-slate-400 leading-relaxed italic">"{question.eli5Explanation}"</p>
                                </div>
                              </div>

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

              {/* TAB 2: Syllabus Visual Maps (Premium Feature: separate photos to explain syllabus) */}
              {reviewTab === "syllabus" && (
                <div className="space-y-6">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h3 className="font-display font-extrabold text-md text-white mb-2 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-amber-400" />
                      Visual Syllabus Chapter Breakdowns
                    </h3>
                    <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                      OmniMind breaks down your educational material into sequential core modules and maps each topic visually with custom flowchart diagrams.
                    </p>

                    {activeSession.syllabus && activeSession.syllabus.length > 0 ? (
                      <div className="space-y-8">
                        {activeSession.syllabus.map((chap: SyllabusChapter) => (
                          <div key={chap.chapterNumber} className="bg-black/30 border border-white/10 p-5 sm:p-6 rounded-xl space-y-4">
                            <div className="flex items-center gap-2 text-amber-400 font-mono text-xs uppercase tracking-widest font-bold">
                              <span>Chapter {chap.chapterNumber}</span>
                            </div>
                            <h4 className="text-sm sm:text-md font-bold text-white font-display">{chap.title}</h4>
                            <p className="text-xs text-slate-300 leading-relaxed font-sans">{chap.summary}</p>
                            
                            {/* Premium Visual Map photo block */}
                            <div className="pt-2">
                              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">Syllabus Explanation Map:</p>
                              
                              <div className="relative rounded-xl overflow-hidden bg-[#0a0e17] border border-white/10 p-4 flex items-center justify-center min-h-[220px]">
                                {userProfile?.isPremium ? (
                                  <div 
                                    className="w-full max-w-[480px] text-slate-200"
                                    dangerouslySetInnerHTML={{ __html: chap.conceptDiagramSvg }}
                                  />
                                ) : (
                                  <div className="absolute inset-0 bg-[#0a0e17]/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 space-y-3 z-20">
                                    <Lock className="w-8 h-8 text-amber-400" />
                                    <p className="text-xs font-semibold text-white">Unlock Chapter Explanation Diagram</p>
                                    <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed">
                                      Unlock separate premium vector drawings and logic flowcharts mapping the chapter syllabus. Toggle premium above.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No syllabus breakdown found for this session.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: Handwritten AI Notes (Premium Feature: handwritten style of syllabus notes) */}
              {reviewTab === "notes" && (
                <div className="space-y-6">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h3 className="font-display font-extrabold text-md text-white mb-2 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-pink-400" />
                      AI Student Handwritten Lecture Notes
                    </h3>
                    <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                      Custom, neatly presented student lecture notes handwritten in ink-style by OmniMind AI to provide core summaries, lists, and memory tricks.
                    </p>

                    {activeSession.syllabus && activeSession.syllabus.length > 0 ? (
                      <div className="space-y-8">
                        {activeSession.syllabus.map((chap: SyllabusChapter) => (
                          <div key={chap.chapterNumber} className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                                Chapter {chap.chapterNumber} Notes: {chap.title}
                              </h4>
                              
                              <button
                                type="button"
                                onClick={() => toggleBookmark({
                                  type: "notes",
                                  sessionId: activeSession.id,
                                  title: `${activeSession.title} - Chapter ${chap.chapterNumber} Notes`,
                                  content: chap.handwrittenNotes,
                                  chapterNumber: chap.chapterNumber
                                })}
                                className={`p-1 px-2.5 rounded-lg border transition-all flex items-center gap-1.5 text-[9px] font-mono font-bold ${
                                  bookmarks.some(b => b.type === "notes" && b.sessionId === activeSession.id && b.chapterNumber === chap.chapterNumber)
                                    ? "bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-sm"
                                    : "bg-white/5 text-slate-400 hover:text-white border-white/10"
                                }`}
                                title="Bookmark notes for quick access from Dashboard"
                              >
                                <Bookmark className="w-3 h-3" />
                                {bookmarks.some(b => b.type === "notes" && b.sessionId === activeSession.id && b.chapterNumber === chap.chapterNumber) ? "Notes Saved" : "Save Notes"}
                              </button>
                            </div>

                            <div className="relative rounded-xl overflow-hidden">
                              {userProfile?.isPremium ? (
                                <div className="lined-notebook p-8 pr-6 pl-16 rounded-xl text-indigo-900 border border-slate-200 selection:bg-rose-200 font-handwritten min-h-[220px]">
                                  {chap.handwrittenNotes.split("\n").map((line, lIdx) => (
                                    <span key={lIdx} className="block min-h-[1.8rem]">{line}</span>
                                  ))}
                                </div>
                              ) : (
                                <div className="lined-notebook p-8 pr-6 pl-16 rounded-xl text-indigo-950/20 border border-slate-200 font-handwritten min-h-[220px] select-none filter blur-[2px] relative">
                                  <div className="absolute inset-0 bg-[#faf8f5]/60 flex flex-col items-center justify-center text-center p-6 space-y-3 z-20">
                                    <Lock className="w-8 h-8 text-indigo-800" />
                                    <p className="text-xs font-semibold text-indigo-950 font-sans">Unlock AI Handwritten Lecture Notes</p>
                                    <p className="text-[10px] text-indigo-800/80 max-w-xs leading-relaxed font-sans">
                                      Unlock beautiful cursive lecture notes on yellow notebook grids detailing all formulas, structures, and study hacks. Toggle premium above.
                                    </p>
                                  </div>
                                  <span className="block">Chapter 1 Core Notes</span>
                                  <span className="block">Key Concepts Overview</span>
                                  <span className="block">Study Hacks & Mnemonics</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No notes found for this session.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: Complete Video Synthesis */}
              {reviewTab === "video" && (
                <div className="space-y-6">
                  {activeSession.videoSummary && (
                    <div className="bg-[#0b0f19] border border-indigo-500/30 rounded-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden shadow-2xl">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
                      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                        <BookMarked className="w-5 h-5 text-indigo-400" />
                        <div>
                          <h3 className="font-display font-bold text-md text-white">Complete Source Synthesis & Video Summary</h3>
                          <p className="text-xs text-indigo-300">A detailed chapter-by-chapter and thematic review of your educational asset</p>
                        </div>
                      </div>

                      <div className="space-y-4 text-slate-300 leading-relaxed text-sm">
                        {(() => {
                          const blocks = activeSession.videoSummary.split("\n");
                          return (
                            <div className="space-y-4 font-sans">
                              {blocks.map((line, i) => {
                                const cleanLine = line.trim();
                                if (!cleanLine) return null;
                                if (cleanLine.startsWith("###")) {
                                  return <h4 key={i} className="text-md font-bold text-indigo-300 font-display mt-6 mb-2">{cleanLine.replace("###", "").trim()}</h4>;
                                } else if (cleanLine.startsWith("##")) {
                                  return <h3 key={i} className="text-lg font-bold text-indigo-400 font-display mt-8 mb-3 border-b border-white/5 pb-1">{cleanLine.replace("##", "").trim()}</h3>;
                                } else if (cleanLine.startsWith("#")) {
                                  return <h2 key={i} className="text-xl font-extrabold text-white font-display mt-10 mb-4">{cleanLine.replace("#", "").trim()}</h2>;
                                } else if (cleanLine.startsWith("-") || cleanLine.startsWith("*")) {
                                  return (
                                    <ul key={i} className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-300">
                                      <li>{cleanLine.substring(1).trim()}</li>
                                    </ul>
                                  );
                                } else {
                                  return <p key={i} className="text-xs sm:text-sm leading-relaxed text-slate-300">{cleanLine}</p>;
                                }
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: Embedded Video Quizzes */}
              {reviewTab === "native" && (
                <div className="space-y-6">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                      <HelpCircle className="w-5 h-5 text-indigo-400" />
                      <div>
                        <h3 className="font-display font-bold text-md text-white">Embedded Source Practice Questions</h3>
                        <p className="text-xs text-indigo-300">Interactive questions and solutions extracted natively from the learning source</p>
                      </div>
                    </div>

                    {activeSession.videoNativeQuizzes && activeSession.videoNativeQuizzes.length > 0 ? (
                      <div className="space-y-4">
                        {activeSession.videoNativeQuizzes.map((quiz, i) => (
                          <div key={i} className="p-4 bg-black/40 border border-white/10 rounded-xl space-y-3">
                            <h4 className="text-xs font-semibold text-indigo-300 font-mono uppercase tracking-wider">Practice Concept {i + 1}</h4>
                            <p className="text-sm font-semibold text-slate-200 font-sans leading-relaxed">{quiz.question}</p>
                            
                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-emerald-200 text-xs">
                              <span className="font-bold text-white block mb-1">Correct Answer & Recommendation:</span>
                              <p className="leading-relaxed">{quiz.answer}</p>
                            </div>
                            
                            {quiz.explanation && (
                              <div className="p-3 bg-white/5 border border-white/5 rounded-lg text-slate-300 text-xs">
                                <span className="font-bold text-slate-400 block mb-1">Detailed Explanation:</span>
                                <p className="leading-relaxed">{quiz.explanation}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No embedded source quizzes available.</p>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>

        {/* Bookmarked Item Inspect Overlay */}
        <AnimatePresence>
          {activeBookmark && (
            <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[999] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-zinc-950 border border-white/15 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-4 shadow-2xl relative"
              >
                <button
                  onClick={() => setActiveBookmark(null)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 px-3 rounded-lg border border-white/10 transition-all text-xs font-mono"
                >
                  ✕ Close
                </button>

                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    activeBookmark.type === "question" ? "bg-amber-500/10 text-amber-400" : "bg-pink-500/10 text-pink-400"
                  }`}>
                    {activeBookmark.type === "question" ? "Scenario Question Explanation" : "Handwritten Lecture Notes"}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">{activeBookmark.createdAt}</span>
                </div>

                <h3 className="font-display font-bold text-md text-white border-b border-white/10 pb-2 text-left">
                  {activeBookmark.title}
                </h3>

                {activeBookmark.type === "question" ? (
                  <div className="space-y-4 text-xs font-sans text-left">
                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2">
                      <p className="font-mono text-slate-400 uppercase text-[10px]">Posed Problem Scenario:</p>
                      <p className="text-slate-100 text-sm font-semibold leading-relaxed">{activeBookmark.content}</p>
                    </div>

                    {activeBookmark.options && activeBookmark.options.length > 0 && (
                      <div className="space-y-2">
                        <p className="font-mono text-slate-400 uppercase text-[10px]">Problem Options:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {activeBookmark.options.map((opt, idx) => {
                            const isCorrect = idx === activeBookmark.correctOptionIndex;
                            return (
                              <div key={idx} className={`p-2.5 rounded-lg border text-xs flex gap-2 ${
                                isCorrect 
                                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300 font-bold" 
                                  : "bg-black/30 border-white/5 text-slate-400"
                              }`}>
                                <span className="font-mono">{String.fromCharCode(65 + idx)}.</span>
                                <span>{opt}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl space-y-2">
                      <p className="font-mono text-indigo-400 uppercase text-[10px] font-bold">OmniMind AI Logical Justification:</p>
                      <p className="text-slate-300 leading-relaxed text-xs">{activeBookmark.remediationText}</p>
                    </div>

                    {activeBookmark.eli5Explanation && (
                      <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-2">
                        <p className="font-mono text-amber-400 uppercase text-[10px] font-bold">Illustrated Metaphor (ELI5):</p>
                        <p className="text-slate-300 leading-relaxed text-xs italic">"{activeBookmark.eli5Explanation}"</p>
                      </div>
                    )}

                    {(activeBookmark.remediationSvg || activeBookmark.eli5Svg) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        {activeBookmark.remediationSvg && (
                          <div className="bg-slate-900 border border-white/10 rounded-xl p-3 flex flex-col">
                            <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-wider mb-2 font-bold text-left">Technical Concept Map</span>
                            <div 
                              className="w-full aspect-[600/350] bg-black/60 rounded-lg p-1 overflow-hidden"
                              dangerouslySetInnerHTML={{ __html: activeBookmark.remediationSvg }}
                            />
                          </div>
                        )}
                        {activeBookmark.eli5Svg && (
                          <div className="bg-slate-900 border border-white/10 rounded-xl p-3 flex flex-col">
                            <span className="text-[9px] font-mono text-amber-500 uppercase tracking-wider mb-2 font-bold text-left">Illustrated Metaphor SVG</span>
                            <div 
                              className="w-full aspect-[600/350] bg-black/60 rounded-lg p-1 overflow-hidden"
                              dangerouslySetInnerHTML={{ __html: activeBookmark.eli5Svg }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 text-left">
                    <p className="font-mono text-slate-400 uppercase text-[10px]">Saved Study Notes:</p>
                    <div className="lined-notebook p-8 pr-6 pl-16 rounded-xl text-indigo-950 border border-slate-200 selection:bg-rose-200 font-handwritten min-h-[200px]">
                      {activeBookmark.content.split("\n").map((line, lIdx) => (
                        <span key={lIdx} className="block min-h-[1.8rem]">{line}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-white/10 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      toggleBookmark({
                        type: activeBookmark.type,
                        sessionId: activeBookmark.sessionId,
                        title: activeBookmark.title,
                        content: activeBookmark.content,
                        questionId: activeBookmark.questionId,
                        chapterNumber: activeBookmark.chapterNumber
                      });
                      setActiveBookmark(null);
                    }}
                    className="py-2 px-4 rounded-xl bg-red-600/20 text-red-300 hover:bg-red-600 hover:text-white border border-red-500/20 text-xs font-mono font-bold transition-all"
                  >
                    Delete Bookmark
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
