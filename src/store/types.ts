export interface OutputLine {
  id: string;
  type: 'stdout' | 'stderr';
  text: string;
  timestamp: number;
}

export interface ExecutionError {
  type: string;
  message: string;
  lineno: number;
  line_text: string;
}

export interface DebugResult {
  friendly_message: string;
  fix_suggestion: string;
  corrected_line: string | null;
}

export interface VoiceResult {
  transcript: string;
  code: string;
  explanation: string;
}

export interface CodeFile {
  id: string;
  name: string;
  content: string;
}

// Slice Interfaces
export interface FileSlice {
  files: CodeFile[];
  activeFileId: string;
  checkpoints: Array<{ id: string; timestamp: number; content: string }>;
  isSaving: boolean;
  createFile: (name?: string) => string;
  deleteFile: (id: string) => void;
  renameFile: (id: string, newName: string) => void;
  setActiveFile: (id: string) => void;
  updateFileContent: (id: string, content: string) => void;
  getActiveFile: () => CodeFile | undefined;
  loadFilesFromLocalDB: () => Promise<void>;
  loadCheckpoints: (fileId: string) => Promise<void>;
  createCheckpoint: (fileId: string, content: string) => Promise<void>;
  restoreCheckpoint: (fileId: string, content: string) => void;
}

export interface StdinSlice {
  stdinContent: string;
  setStdinContent: (content: string) => void;
}

export interface ReviewBug {
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

export interface CodeReviewResult {
  timeComplexity: string;
  spaceComplexity: string;
  styleScore: number;
  bugs: ReviewBug[];
  suggestions: string[];
}

export interface RunSlice {
  isExecuting: boolean;
  currentExecutionId: string | null;
  output: OutputLine[];
  error: ExecutionError | null;
  errorLine: number | null;
  debugResult: DebugResult | null;
  isFetchingDebug: boolean;
  executionTime: number | null;
  isWorkerReady: boolean;
  traceSteps: Array<{ line: number, variables: Record<string, string> }> | null;
  currentTraceIndex: number | null;
  reviewResult: CodeReviewResult | null;
  isReviewing: boolean;
  executeCode: (code: string) => void;
  clearOutput: () => void;
  setWorkerReady: (ready: boolean) => void;
  addOutputLine: (line: OutputLine) => void;
  setError: (error: ExecutionError | null) => void;
  setExecutionTime: (time: number | null) => void;
  fetchDebugExplanation: (code: string, error: ExecutionError) => Promise<void>;
  setTraceIndex: (index: number | null) => void;
  triggerCodeReview: (code: string) => Promise<void>;
  clearCodeReview: () => void;
}

export interface VoiceSlice {
  isRecording: boolean;
  transcript: string;
  isGeneratingCode: boolean;
  voiceResult: VoiceResult | null;
  setIsRecording: (recording: boolean) => void;
  setTranscript: (transcript: string) => void;
  generateCodeFromVoice: (transcript: string) => Promise<VoiceResult>;
  generateCodeFromAudio: (audioBlob: Blob) => Promise<VoiceResult>;
  resetVoiceState: () => void;
}

export interface UserProfile {
  username: string;
  email: string;
  isGuest: boolean;
}

export interface AuthSlice {
  user: UserProfile | null;
  authStatus: 'loading' | 'authenticated' | 'unauthenticated';
  isSyncing: boolean;
  lastSyncedAt: number | null;
  signIn: (username: string, email: string) => Promise<void>;
  signOut: () => Promise<void>;
  syncProjectsToCloud: () => Promise<void>;
  setAuthStatus: (status: 'loading' | 'authenticated' | 'unauthenticated') => void;
}

export interface TutorMessage {
  id: string;
  sender: 'user' | 'tutor';
  text: string;
  timestamp: number;
}

export interface TutorSlice {
  tutorMessages: TutorMessage[];
  isFetchingTutor: boolean;
  isTutorOpen: boolean;
  sendTutorMessage: (text: string) => Promise<void>;
  clearTutorHistory: () => void;
  setTutorOpen: (open: boolean) => void;
}

export type RootState = FileSlice & StdinSlice & RunSlice & VoiceSlice & AuthSlice & TutorSlice;
