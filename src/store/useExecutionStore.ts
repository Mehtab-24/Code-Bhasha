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

interface ExecutionState {
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
  
  // Performance
  executionTime: number | null;
  
  // Worker state
  isWorkerReady: boolean;
  
  // Actions
  executeCode: (code: string) => void;
  clearOutput: () => void;
  setWorkerReady: (ready: boolean) => void;
  addOutputLine: (line: OutputLine) => void;
  setError: (error: ExecutionError | null) => void;
  setExecutionTime: (time: number | null) => void;
  fetchDebugExplanation: (code: string, error: ExecutionError) => Promise<void>;
}

export const useExecutionStore = create<ExecutionState>((set, get) => ({
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

    const executionId = executionService.executeCode(code, (result: ExecutionResult) => {
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
  }
}));