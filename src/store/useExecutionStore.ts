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

interface ExecutionState {
  // Execution state
  isExecuting: boolean;
  currentExecutionId: string | null;
  
  // Output
  output: OutputLine[];
  
  // Error state
  error: ExecutionError | null;
  errorLine: number | null;
  
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
}

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  // Initial state
  isExecuting: false,
  currentExecutionId: null,
  output: [],
  error: null,
  errorLine: null,
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
        set({
          isExecuting: false,
          error: result.error || null,
          errorLine: result.error?.lineno || null,
          currentExecutionId: null
        });
      }
    });

    set({ currentExecutionId: executionId });
  },

  clearOutput: () => {
    set({
      output: [],
      error: null,
      errorLine: null,
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
  }
}));