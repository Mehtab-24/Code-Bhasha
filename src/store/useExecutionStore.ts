'use client';

import { create } from 'zustand';
import { getExecutionService, type ExecutionResult } from '@/lib/execution-service';

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

interface ExecutionState {
  // File management
  files: CodeFile[];
  activeFileId: string;
  
  // Standard Input
  stdinContent: string;
  
  // Execution state
  isExecuting: boolean;
  currentExecutionId: string | null;
  
  // Output
  output: OutputLine[];
  
  // Error state
  error: ExecutionError | null;
  errorLine: number | null;
  
  // Debug state
  debugResult: DebugResult | null;
  isFetchingDebug: boolean;
  
  // Voice state
  isRecording: boolean;
  transcript: string;
  isGeneratingCode: boolean;
  voiceResult: VoiceResult | null;
  
  // Performance
  executionTime: number | null;
  
  // Worker state
  isWorkerReady: boolean;
  
  // File actions
  createFile: (name?: string) => string;
  deleteFile: (id: string) => void;
  renameFile: (id: string, newName: string) => void;
  setActiveFile: (id: string) => void;
  updateFileContent: (id: string, content: string) => void;
  getActiveFile: () => CodeFile | undefined;
  
  // Standard Input actions
  setStdinContent: (content: string) => void;
  
  // Actions
  executeCode: (code: string) => void;
  clearOutput: () => void;
  setWorkerReady: (ready: boolean) => void;
  addOutputLine: (line: OutputLine) => void;
  setError: (error: ExecutionError | null) => void;
  setExecutionTime: (time: number | null) => void;
  fetchDebugExplanation: (code: string, error: ExecutionError) => Promise<void>;
  
  // Voice actions
  setIsRecording: (recording: boolean) => void;
  setTranscript: (transcript: string) => void;
  generateCodeFromVoice: (transcript: string) => Promise<VoiceResult>;
  generateCodeFromAudio: (audioBlob: Blob) => Promise<VoiceResult>;
  // FIX: New action to atomically reset all voice-related state on mount.
  // Called from VoicePanel's useEffect so stale Zustand state from a
  // previous session / HMR cycle can never bleed into a fresh mount.
  resetVoiceState: () => void;
}

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  // Initial file state
  files: [
    {
      id: 'file_1',
      name: 'main.py',
      content: '# Yahan apna Python code likho\nprint("Hello CodeBhasha!")'
    }
  ],
  activeFileId: 'file_1',
  
  // Standard Input
  stdinContent: '',
  
  // Initial state
  isExecuting: false,
  currentExecutionId: null,
  output: [],
  error: null,
  errorLine: null,
  debugResult: null,
  isFetchingDebug: false,
  executionTime: null,
  isWorkerReady: false,
  
  // Voice state
  isRecording: false,
  transcript: '',
  isGeneratingCode: false,
  voiceResult: null,

  // File actions
  createFile: (name?: string) => {
    const newId = `file_${Date.now()}`;
    const fileName = name || `untitled_${get().files.length + 1}.py`;
    
    set(state => ({
      files: [
        ...state.files,
        {
          id: newId,
          name: fileName.endsWith('.py') ? fileName : `${fileName}.py`,
          content: '# New Python file\n'
        }
      ],
      activeFileId: newId
    }));
    
    return newId;
  },

  deleteFile: (id: string) => {
    const state = get();
    
    // Don't delete if it's the only file
    if (state.files.length === 1) return;
    
    const fileIndex = state.files.findIndex(f => f.id === id);
    if (fileIndex === -1) return;
    
    const newFiles = state.files.filter(f => f.id !== id);
    
    // If deleting active file, switch to another file
    let newActiveId = state.activeFileId;
    if (id === state.activeFileId) {
      // Switch to previous file, or next if deleting first file
      const newIndex = fileIndex > 0 ? fileIndex - 1 : 0;
      newActiveId = newFiles[newIndex].id;
    }
    
    set({
      files: newFiles,
      activeFileId: newActiveId
    });
  },

  renameFile: (id: string, newName: string) => {
    // Ensure .py extension
    const fileName = newName.endsWith('.py') ? newName : `${newName}.py`;
    
    set(state => ({
      files: state.files.map(f =>
        f.id === id ? { ...f, name: fileName } : f
      )
    }));
  },

  setActiveFile: (id: string) => {
    set({ activeFileId: id });
  },

  updateFileContent: (id: string, content: string) => {
    set(state => ({
      files: state.files.map(f =>
        f.id === id ? { ...f, content } : f
      )
    }));
  },

  getActiveFile: () => {
    const state = get();
    return state.files.find(f => f.id === state.activeFileId);
  },

  // Standard Input actions
  setStdinContent: (content: string) => {
    set({ stdinContent: content });
  },

  // Actions
  executeCode: (code: string) => {
    const executionService = getExecutionService();
    
    // Clear previous state
    set({
      isExecuting: true,
      output: [],
      error: null,
      errorLine: null,
      executionTime: null
    });

    const executionId = executionService.executeCode(code, get().stdinContent, (result: ExecutionResult) => {
      const state = get();
      
      // Only update if this is the current execution
      if (state.currentExecutionId !== result.id) return;

      // Add new output lines
      const newOutputLines: OutputLine[] = result.output.map((line, index) => ({
        id: `${result.id}_${index}`,
        type: line.type,
        text: line.text,
        timestamp: Date.now()
      }));

      // Update output incrementally
      set(state => ({
        output: [...state.output, ...newOutputLines.slice(state.output.length)]
      }));

      // Handle completion
      if (result.status === 'completed') {
        set({
          isExecuting: false,
          executionTime: result.executionTime || null,
          currentExecutionId: null
        });
      }
      
      // Handle errors
      else if (result.status === 'error' || result.status === 'timeout') {
        const errorData = result.error || null;
        set({
          isExecuting: false,
          error: errorData,
          errorLine: errorData?.lineno || null,
          currentExecutionId: null
        });
        
        // Automatically fetch debug explanation when error occurs
        if (errorData) {
          get().fetchDebugExplanation(code, errorData);
        }
      }
    });

    set({ currentExecutionId: executionId });
  },

  clearOutput: () => {
    set({
      output: [],
      error: null,
      errorLine: null,
      debugResult: null,
      executionTime: null
    });
  },

  setWorkerReady: (ready: boolean) => {
    set({ isWorkerReady: ready });
  },

  addOutputLine: (line: OutputLine) => {
    set(state => ({
      output: [...state.output, line]
    }));
  },

  setError: (error: ExecutionError | null) => {
    set({
      error,
      errorLine: error?.lineno || null
    });
  },

  setExecutionTime: (time: number | null) => {
    set({ executionTime: time });
  },

  fetchDebugExplanation: async (code: string, error: ExecutionError) => {
    set({ isFetchingDebug: true, debugResult: null });
    
    try {
      const response = await fetch('/api/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, error })
      });

      if (!response.ok) {
        throw new Error('Debug API request failed');
      }

      const result: DebugResult = await response.json();
      set({ debugResult: result, isFetchingDebug: false });
    } catch (err) {
      console.error('Failed to fetch debug explanation:', err);
      set({
        debugResult: {
          friendly_message: 'Bhai, debug explanation fetch nahi ho payi. Network check karo.',
          fix_suggestion: 'Internet connection check karo aur dobara try karo.',
          corrected_line: null
        },
        isFetchingDebug: false
      });
    }
  },

  // Voice actions
  setIsRecording: (recording: boolean) => {
    set({ isRecording: recording });
  },

  setTranscript: (transcript: string) => {
    set({ transcript });
  },

  // FIX: Atomically reset all voice state fields to their initial values.
  // Called on VoicePanel mount so stale isRecording=true (from HMR, hot
  // navigation, or an interrupted session) never causes a permanently broken UI.
  resetVoiceState: () => {
    set({
      isRecording: false,
      isGeneratingCode: false,
      voiceResult: null,
      // Intentionally NOT resetting `transcript` — the user may want to keep
      // what they typed between remounts (e.g. switching tabs and coming back).
    });
  },

  generateCodeFromVoice: async (transcript: string) => {
    set({ isGeneratingCode: true, voiceResult: null });
    
    try {
      const response = await fetch('/api/voice-to-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: transcript })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Voice-to-code failed');
      }

      const result = await response.json();
      set({ 
        voiceResult: result,
        transcript: result.transcript,
        isGeneratingCode: false 
      });
      
      return result;
    } catch (err) {
      console.error('Failed to generate code from voice:', err);
      set({ isGeneratingCode: false });
      throw err;
    }
  },

  generateCodeFromAudio: async (audioBlob: Blob) => {
    set({ isGeneratingCode: true, voiceResult: null });
    
    try {
      // Convert blob to base64
      const reader = new FileReader();
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      const response = await fetch('/api/voice-to-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          audio: base64Audio,
          mimeType: audioBlob.type 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Voice-to-code failed');
      }

      const result = await response.json();
      set({ 
        voiceResult: result,
        transcript: result.transcript,
        isGeneratingCode: false 
      });
      
      return result;
    } catch (err) {
      console.error('Failed to generate code from audio:', err);
      set({ isGeneratingCode: false });
      throw err;
    }
  }
}));