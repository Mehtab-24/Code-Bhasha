// Web Worker for Pyodide Python execution
// This runs in an isolated context with no DOM access

import type { PyodideInterface } from 'pyodide';

// Message types for communication with main thread
interface ExecuteMessage {
  type: 'EXECUTE';
  code: string;
  stdin: string;
  id: string;
}

interface OutputMessage {
  type: 'STDOUT' | 'STDERR';
  line: string;
  id: string;
}

interface TraceStep {
  line: number;
  variables: Record<string, string>;
}

interface ErrorMessage {
  type: 'ERROR';
  payload: {
    type: string;
    message: string;
    lineno: number;
    line_text: string;
  };
  trace?: TraceStep[];
  id: string;
}

interface DoneMessage {
  type: 'DONE';
  executionTime: number;
  trace: TraceStep[];
  id: string;
}

interface ReadyMessage {
  type: 'READY';
}

type WorkerMessage = ExecuteMessage;

// Add type declarations for browser global scope inside worker
declare const self: any;
declare function importScripts(...urls: string[]): void;
declare function loadPyodide(options: { indexURL: string }): Promise<PyodideInterface>;

let pyodide: PyodideInterface | null = null;
let isInitialized = false;
let currentExecutionId = '';

// Load Pyodide script from CDN
importScripts('https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js');

// Initialize Pyodide
async function initializePyodide() {
  try {
    console.log('[Worker] Loading Pyodide...');

    pyodide = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/',
    });

    // Install common packages that students might use
    await pyodide.loadPackage(['micropip']);

    // Initialize the persistent globals namespace inside Python
    pyodide.runPython(`
_cb_globals = {}
`);

    // Intercept standard output and standard error
    pyodide.setStdout({
      batched: (line: string) => {
        self.postMessage({
          type: 'STDOUT',
          line,
          id: currentExecutionId,
        } as OutputMessage);
      },
    });

    pyodide.setStderr({
      batched: (line: string) => {
        self.postMessage({
          type: 'STDERR',
          line,
          id: currentExecutionId,
        } as OutputMessage);
      },
    });

    isInitialized = true;
    console.log('[Worker] Pyodide initialized successfully');
    self.postMessage({ type: 'READY' } as ReadyMessage);

  } catch (error) {
    console.error('[Worker] Failed to initialize Pyodide:', error);
    self.postMessage({
      type: 'ERROR',
      payload: {
        type: 'InitializationError',
        message: 'Browser execution load nahi ho raha. Page reload karo.',
        lineno: 0,
        line_text: '',
      },
      id: 'init',
    } as ErrorMessage);
  }
}

// Execute Python code using structured execution and native traceback parsing
async function executePythonCode(code: string, executionId: string, stdinContent: string) {
  if (!pyodide || !isInitialized) {
    self.postMessage({
      type: 'ERROR',
      payload: {
        type: 'NotInitialized',
        message: 'Python engine abhi ready nahi hai. Thoda wait karo.',
        lineno: 0,
        line_text: '',
      },
      id: executionId,
    } as ErrorMessage);
    return;
  }

  const startTime = performance.now();

  // Set up 10-second timeout
  const timeoutId = setTimeout(() => {
    console.log('[Worker] Execution timeout - terminating worker');
    self.close(); // Terminate the worker
  }, 10000);

  try {
    currentExecutionId = executionId;

    // Set up standard input queue
    const inputs = stdinContent ? stdinContent.split('\n') : [];
    pyodide.setStdin({
      stdin: () => {
        const value = inputs.shift();
        const result = value !== undefined ? value : '';
        
        // Echo consumed input to stdout (mimics standard terminal)
        if (result) {
          self.postMessage({
            type: 'STDOUT',
            line: result,
            id: currentExecutionId,
          } as OutputMessage);
        }
        
        return result;
      }
    });

    // Feed user code into global variables to pass to exec()
    pyodide.globals.set('user_code', code);

    // Run the code within a Python trace block to record variable mutations incrementally
    const executionResultJson = await pyodide.runPythonAsync(`
import sys, traceback, json

def _cb_run():
    exec_trace = []
    
    def _trace_func(frame, event, arg):
        if event != 'line':
            return _trace_func
        if frame.f_code.co_filename != '<string>':
            return _trace_func
        if len(exec_trace) >= 500:
            return None
            
        local_vars = {}
        for k, v in frame.f_locals.items():
            if k.startswith('_') or k in ('sys', 'traceback', 'json', 'user_code'):
                continue
            try:
                if isinstance(v, (int, float, str, bool, list, dict, set, tuple)):
                    local_vars[k] = repr(v)
                else:
                    local_vars[k] = str(v)
            except Exception:
                local_vars[k] = f"<{type(v).__name__}>"
                
        exec_trace.append({
            'line': frame.f_lineno,
            'variables': local_vars
        })
        return _trace_func

    sys.settrace(_trace_func)
    try:
        exec(user_code, _cb_globals)
        sys.settrace(None)
        return json.dumps({
            "success": True,
            "trace": exec_trace
        })
    except BaseException as e:
        sys.settrace(None)
        exc_type, exc_value, exc_traceback = sys.exc_info()
        
        tb_list = traceback.extract_tb(exc_traceback)
        user_frames = [f for f in tb_list if f.filename == '<string>']
        
        lineno = 0
        if user_frames:
            lineno = user_frames[-1].lineno
        elif tb_list:
            lineno = tb_list[-1].lineno
            
        if isinstance(exc_value, SyntaxError):
            lineno = exc_value.lineno or lineno
            
        lines = user_code.split('\\n')
        line_text = ""
        if lineno > 0 and lineno <= len(lines):
            line_text = lines[lineno - 1].strip()
            
        return json.dumps({
            "success": False,
            "error": {
                "type": exc_value.__class__.__name__ if exc_value else "PythonError",
                "message": str(exc_value) if exc_value else str(e),
                "lineno": lineno,
                "line_text": line_text
            },
            "trace": exec_trace
        })

_cb_run()
`);

    clearTimeout(timeoutId);

    const runResult = JSON.parse(executionResultJson);

    if (!runResult.success) {
      // An error occurred and was captured inside Python
      self.postMessage({
        type: 'ERROR',
        payload: {
          type: runResult.error.type,
          message: runResult.error.message,
          lineno: runResult.error.lineno,
          line_text: runResult.error.line_text,
        },
        trace: runResult.trace || [],
        id: executionId,
      } as ErrorMessage);
    } else {
      // Completed successfully
      const executionTime = performance.now() - startTime;
      self.postMessage({
        type: 'DONE',
        executionTime: Math.round(executionTime),
        trace: runResult.trace || [],
        id: executionId,
      } as DoneMessage);
    }

  } catch (error: unknown) {
    clearTimeout(timeoutId);
    console.error('[Worker] Fatal error running runner code:', error);

    // Fallback if execution runner itself fails
    let errorType = 'PythonError';
    let errorMessage = 'Fatal execution error occurred';
    let lineNumber = 0;
    let lineText = '';

    if (error instanceof Error) {
      errorMessage = error.message;
      const lineMatch = error.message.match(/line (\d+)/);
      if (lineMatch) lineNumber = parseInt(lineMatch[1], 10);
      const typeMatch = error.message.match(/^(\w+Error?):/);
      if (typeMatch) errorType = typeMatch[1];
    }

    self.postMessage({
      type: 'ERROR',
      payload: {
        type: errorType,
        message: errorMessage,
        lineno: lineNumber,
        line_text: lineText,
      },
      id: executionId,
    } as ErrorMessage);
  }
}

// Register message handlers
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, code, stdin, id } = event.data;
  if (type === 'EXECUTE') {
    await executePythonCode(code, id, stdin || '');
  }
};

// Initialize Pyodide on load
initializePyodide();
