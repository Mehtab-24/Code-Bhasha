import { StateCreator } from 'zustand';
import type { RunSlice, RootState, OutputLine, ExecutionError, DebugResult } from '../types';
import { getExecutionService, type ExecutionResult } from '@/lib/execution-service';
import { sha256 } from '@/lib/crypto';
import { idbCache } from '@/lib/idb-cache';

const debugInflightRequests = new Map<string, Promise<DebugResult>>();

export const createRunSlice: StateCreator<RootState, [], [], RunSlice> = (set, get) => ({
  isExecuting: false,
  currentExecutionId: null,
  output: [],
  error: null,
  errorLine: null,
  debugResult: null,
  isFetchingDebug: false,
  executionTime: null,
  isWorkerReady: false,
  traceSteps: null,
  currentTraceIndex: null,
  reviewResult: null,
  isReviewing: false,

  executeCode: (code: string) => {
    const executionService = getExecutionService();
    
    // Clear previous state
    set({
      isExecuting: true,
      output: [],
      error: null,
      errorLine: null,
      executionTime: null,
      traceSteps: null,
      currentTraceIndex: null
    });

    // Sync workspace to the cloud on run if authenticated
    const state = get();
    if (state.user) {
      state.syncProjectsToCloud();
    }

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
          traceSteps: result.trace || null,
          currentTraceIndex: result.trace && result.trace.length > 0 ? 0 : null,
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
          traceSteps: result.trace || null,
          currentTraceIndex: result.trace && result.trace.length > 0 ? 0 : null,
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
    // Generate request cache key hash
    const reqString = JSON.stringify({ code, error: { type: error.type, message: error.message, lineno: error.lineno } });
    const hash = await sha256(reqString);

    // 1. Check local IndexedDB cache first (zero latency)
    const cached = await idbCache.get<DebugResult>(hash);
    if (cached) {
      console.log('[Cache] Hit for error explanation:', hash);
      set({
        isFetchingDebug: false,
        debugResult: cached
      });
      return;
    }

    // 2. Check if there is an in-flight request for the same error
    if (debugInflightRequests.has(hash)) {
      console.log('[Deduplication] Joining active request:', hash);
      set({ isFetchingDebug: true });
      try {
        const result = await debugInflightRequests.get(hash);
        set({
          isFetchingDebug: false,
          debugResult: result || null
        });
      } catch (err) {
        set({ isFetchingDebug: false });
      }
      return;
    }

    set({
      isFetchingDebug: true,
      debugResult: {
        friendly_message: '',
        fix_suggestion: '',
        corrected_line: null
      }
    });

    // Create the fetch promise
    const fetchPromise = (async () => {
      const response = await fetch('/api/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, error })
      });

      if (!response.ok) {
        throw new Error('Debug API request failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      
      let finalResult: DebugResult = {
        friendly_message: '',
        fix_suggestion: '',
        corrected_line: null
      };

      if (reader) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || "";
          
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);
              if (parsed.field === 'error') {
                throw new Error(parsed.text);
              }
              
              set((state) => {
                const prev = state.debugResult || { friendly_message: '', fix_suggestion: '', corrected_line: null };
                
                let friendly_message = prev.friendly_message;
                let fix_suggestion = prev.fix_suggestion;
                let corrected_line = prev.corrected_line;
                
                if (parsed.field === 'friendly_message') {
                  friendly_message += parsed.text;
                } else if (parsed.field === 'fix_suggestion') {
                  fix_suggestion += parsed.text;
                } else if (parsed.field === 'corrected_line') {
                  if (corrected_line === null) corrected_line = "";
                  corrected_line += parsed.text;
                }
                
                if (corrected_line && (corrected_line.trim() === 'null' || corrected_line.trim() === 'None')) {
                  corrected_line = null;
                }

                finalResult = {
                  friendly_message,
                  fix_suggestion,
                  corrected_line
                };

                return {
                  debugResult: finalResult
                };
              });
            } catch (jsonErr) {
              console.warn("Failed to parse stream line:", jsonErr);
            }
          }
        }
      }

      // Write complete result to cache
      await idbCache.set(hash, finalResult);
      return finalResult;
    })();

    // Store in-flight promise
    debugInflightRequests.set(hash, fetchPromise);

    try {
      await fetchPromise;
      set({ isFetchingDebug: false });
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
    } finally {
      // Clean up in-flight mapping
      debugInflightRequests.delete(hash);
    }
  },

  setTraceIndex: (index: number | null) => {
    set({ currentTraceIndex: index });
  },

  triggerCodeReview: async (code: string) => {
    set({ isReviewing: true, reviewResult: null });
    try {
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      if (!response.ok) throw new Error('Code review failed');
      const data = await response.json();
      set({ reviewResult: data, isReviewing: false });
    } catch (err) {
      console.error('[RunSlice] Code review trigger error:', err);
      set({ 
        reviewResult: {
          timeComplexity: 'N/A',
          spaceComplexity: 'N/A',
          styleScore: 0,
          bugs: [{ description: 'Bhai, review generation fail ho gayi. Internet check karo.', severity: 'high', suggestion: 'Retry karo.' }],
          suggestions: ['Connection reset issue.']
        },
        isReviewing: false 
      });
    }
  },

  clearCodeReview: () => {
    set({ reviewResult: null, isReviewing: false });
  }
});
