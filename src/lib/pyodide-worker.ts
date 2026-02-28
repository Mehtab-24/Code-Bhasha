// Web Worker for Pyodide Python execution
// This runs in an isolated context with no DOM access

import { loadPyodide, type PyodideInterface } from 'pyodide';

// Message types for communication with main thread
interface ExecuteMessage {
  type: 'EXECUTE';
  code: string;
  id: string;
}

interface OutputMessage {
  type: 'STDOUT' | 'STDERR';
  line: string;
  id: string;
}

interface ErrorMessage {
  type: 'ERROR';
  payload: {
    type: string;
    message: string;
    lineno: number;
    line_text: string;
  };
  id: string;
}

interface DoneMessage {
  type: 'DONE';
  executionTime: number;
  id: string;
}

interface ReadyMessage {
  type: 'READY';
}

type WorkerMessage = ExecuteMessage;
type MainThreadMessage = OutputMessage | ErrorMessage | DoneMessage | ReadyMessage;

let pyodide: PyodideInterface | null = null;
let isInitialized = false;

// Initialize Pyodide
async function initializePyodide() {
  try {
    console.log('[Worker] Loading Pyodide...');
    
    pyodide = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/',
    });

    // Install common packages that students might use
    await pyodide.loadPackage(['micropip']);
    
    // Set up stdout/stderr capture
    pyodide.runPython(`
import sys
import io
from contextlib import redirect_stdout, redirect_stderr

class OutputCapture:
    def __init__(self, message_type):
        self.message_type = message_type
        self.buffer = io.StringIO()
    
    def write(self, text):
        if text.strip():  # Only send non-empty lines
            # Send to main thread via postMessage
            import js
            js.postMessage({
                'type': self.message_type,
                'line': text.rstrip(),
                'id': js.current_execution_id
            })
        self.buffer.write(text)
    
    def flush(self):
        pass

# Create custom stdout/stderr handlers
stdout_capture = OutputCapture('STDOUT')
stderr_capture = OutputCapture('STDERR')
`);

    isInitialized = true;
    console.log('[Worker] Pyodide initialized successfully');
    
    // Notify main thread that worker is ready
    self.postMessage({ type: 'READY' } as ReadyMessage);
    
  } catch (error) {
    console.error('[Worker] Failed to initialize Pyodide:', error);
    self.postMessage({
      type: 'ERROR',
      payload: {
        type: 'InitializationError',
        message: 'Browser execution load nahi ho raha. Page reload karo.',
        lineno: 0,
        line_text: ''
      },
      id: 'init'
    } as ErrorMessage);
  }
}

// Execute Python code
async function executePythonCode(code: string, executionId: string) {
  if (!pyodide || !isInitialized) {
    self.postMessage({
      type: 'ERROR',
      payload: {
        type: 'NotInitialized',
        message: 'Python engine abhi ready nahi hai. Thoda wait karo.',
        lineno: 0,
        line_text: ''
      },
      id: executionId
    } as ErrorMessage);
    return;
  }

  const startTime = performance.now();
  
  // Set up 10-second timeout
  const timeoutId = setTimeout(() => {
    console.log('[Worker] Execution timeout - terminating worker');
    self.close(); // This will terminate the worker
  }, 10000);

  try {
    // Set current execution ID for output capture
    pyodide.globals.set('current_execution_id', executionId);
    
    // Redirect stdout/stderr to our custom handlers
    pyodide.runPython(`
import sys
sys.stdout = stdout_capture
sys.stderr = stderr_capture
`);

    // Execute the user's code
    await pyodide.runPythonAsync(code);
    
    // Restore original stdout/stderr
    pyodide.runPython(`
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__
`);

    const executionTime = performance.now() - startTime;
    
    // Clear timeout since execution completed successfully
    clearTimeout(timeoutId);
    
    // Notify main thread that execution is complete
    self.postMessage({
      type: 'DONE',
      executionTime: Math.round(executionTime),
      id: executionId
    } as DoneMessage);
    
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    
    // Parse Python error details
    let errorType = 'PythonError';
    let errorMessage = 'Unknown error occurred';
    let lineNumber = 0;
    let lineText = '';
    
    // Safely extract error message
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Extract line number from traceback if available
      const lineMatch = error.message.match(/line (\d+)/);
      if (lineMatch) {
        lineNumber = parseInt(lineMatch[1], 10);
      }
      
      // Extract error type
      const typeMatch = error.message.match(/^(\w+Error?):/);
      if (typeMatch) {
        errorType = typeMatch[1];
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    // Get the problematic line from code if possible
    if (lineNumber > 0) {
      const lines = code.split('\n');
      if (lineNumber <= lines.length) {
        lineText = lines[lineNumber - 1].trim();
      }
    }
    
    console.error('[Worker] Python execution error:', error);
    
    self.postMessage({
      type: 'ERROR',
      payload: {
        type: errorType,
        message: errorMessage,
        lineno: lineNumber,
        line_text: lineText
      },
      id: executionId
    } as ErrorMessage);
  }
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, code, id } = event.data;
  
  if (type === 'EXECUTE') {
    await executePythonCode(code, id);
  }
};

// Handle worker termination (timeout case)
self.onclose = () => {
  console.log('[Worker] Worker terminated');
};

// Initialize Pyodide when worker starts
initializePyodide();