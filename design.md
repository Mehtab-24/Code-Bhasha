# CodeBhasha — System Architecture & Design Document
**Version:** 1.0 | **Phase:** 1 — Hackathon Prototype  
**Tagline:** *Syntax is a barrier; Logic is universal.*  
**Last Updated:** 2026-02-26

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Component Inventory](#2-component-inventory)
3. [Data Flow Diagrams](#3-data-flow-diagrams)
   - 3.1 Voice-to-Code (Bol Ke Code)
   - 3.2 Desi Debugger
   - 3.3 Intent-Based Auto-Complete
   - 3.4 Client-Side Execution (Pyodide)
4. [Frontend Architecture](#4-frontend-architecture)
5. [AWS Backend Architecture](#5-aws-backend-architecture)
6. [Security Architecture](#6-security-architecture)
7. [API Contracts](#7-api-contracts)
8. [Prompt Engineering](#8-prompt-engineering)
9. [Infrastructure as Code (IaC) Overview](#9-infrastructure-as-code-iac-overview)
10. [Deployment Architecture](#10-deployment-architecture)
11. [Observability & Monitoring](#11-observability--monitoring)
12. [Day-by-Day Build Plan](#12-day-by-day-build-plan)

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                                │
│                                                                      │
│  ┌─────────────┐   ┌──────────────┐   ┌────────────────────────┐   │
│  │  Next.js 14  │   │  Monaco      │   │  Web Worker            │   │
│  │  App Router  │   │  Editor      │   │  (Pyodide WASM)        │   │
│  │  (React/TS)  │   │  (TypeScript)│   │  Python Execution      │   │
│  └──────┬───────┘   └──────┬───────┘   └────────────────────────┘   │
│         │                  │                                          │
│  ┌──────▼──────────────────▼──────────────────────────────────────┐ │
│  │               Client-Side State (Zustand)                       │ │
│  │   code | transcript | debugOutput | suggestions | isLoading     │ │
│  └──────────────────────────────┬───────────────────────────────┘  │
│                                  │ HTTPS fetch() calls               │
└──────────────────────────────────┼───────────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │     Amazon API Gateway       │
                    │  (REST API, HTTPS only)      │
                    │  Routes: /transcribe         │
                    │          /generate           │
                    │          /debug              │
                    │          /suggest            │
                    │          /token              │
                    └──────────────┬───────────────┘
                                   │ Lambda Proxy Integration
                    ┌──────────────▼──────────────┐
                    │       AWS Lambda             │
                    │  (Node.js 20, per-route)     │
                    │  • Input validation (Zod)    │
                    │  • Auth verification (JWT)   │
                    │  • Rate limit check          │
                    │  • Prompt construction       │
                    └──────┬──────────────┬────────┘
                           │              │
            ┌──────────────▼──┐     ┌─────▼──────────────┐
            │ Amazon Bedrock  │     │ Amazon Transcribe   │
            │ Claude 3.5      │     │ (Streaming,         │
            │ Sonnet          │     │  hi-IN + Hinglish)  │
            └─────────────────┘     └────────────────────┘
```

**Design Philosophy:**
- **Zero server-side code execution** — Python runs entirely in Pyodide (WebAssembly) in the browser.
- **Zero exposed credentials** — All AI/ML service calls are proxied through Lambda with IAM roles.
- **Graceful degradation** — If AWS services are unavailable, the editor and Pyodide execution still work.
- **Mobile-first** — Every component is designed for 360px width and touch interaction first.

---

## 2. Component Inventory

| Layer | Component | Technology | Responsibility |
|---|---|---|---|
| Frontend | App Shell | Next.js 14 (App Router) | Routing, SSR for shell, metadata |
| Frontend | UI Components | React 18 + Tailwind CSS | Layouts, panels, buttons |
| Frontend | Code Editor | Monaco Editor (via `@monaco-editor/react`) | Syntax highlighting, autocomplete UI |
| Frontend | Voice Capture | Web Audio API / MediaRecorder | Capture mic stream, send to Lambda |
| Frontend | Execution Engine | Pyodide 0.25 (WebAssembly) | Run Python in Web Worker |
| Frontend | State Management | Zustand | App-wide state (code, output, loading) |
| Frontend | Service Worker | Workbox | Cache Pyodide WASM bundle |
| Backend | API Router | Amazon API Gateway (REST) | HTTPS endpoint, CORS, throttling |
| Backend | Business Logic | AWS Lambda (Node.js 20) | Auth, validation, Bedrock/Transcribe proxy |
| Backend | Auth Issuer | Lambda `/token` function | Issue short-lived JWT (HS256) |
| AI | Code Generation | Amazon Bedrock (Claude 3.5 Sonnet) | Hinglish → Python |
| AI | Error Explanation | Amazon Bedrock (Claude 3.5 Sonnet) | Error → Hinglish explanation |
| AI | Auto-Complete | Amazon Bedrock (Claude 3.5 Sonnet) | Intent-based suggestions |
| AI | Speech-to-Text | Amazon Transcribe | Hinglish audio → text |
| Infra | Frontend Hosting | Vercel | Global CDN, edge functions |
| Infra | Secrets | AWS Secrets Manager | JWT signing key |
| Infra | Logging | AWS CloudWatch | Lambda logs, error tracking |
| Infra | CDN (WASM) | jsDelivr CDN | Pyodide WASM bundle (~10MB) |

---

## 3. Data Flow Diagrams

### 3.1 Voice-to-Code (Bol Ke Code) — Full Data Flow

```
[User] 
  │  taps [🎤 Bolo]
  ▼
[Browser: MediaRecorder]
  │  Captures PCM audio as WebM/Opus chunks (every 250ms)
  │  Streams chunks to:
  ▼
[Next.js API Route: /api/stream-proxy]  ← thin pass-through, attaches session JWT
  │
  │  POST https://api-gateway-url/transcribe
  │  Headers: { Authorization: Bearer <session_jwt> }
  │  Body: audio/webm binary stream
  ▼
[API Gateway: POST /transcribe]
  │  Validates JWT via Lambda Authorizer
  │  Forwards to Lambda
  ▼
[Lambda: transcribe.js]
  │  1. Validate JWT (check exp, iss, aud)
  │  2. Validate payload size (< 5MB per chunk)
  │  3. Stream audio to Amazon Transcribe
  │     - Language: hi-IN
  │     - VocabularyFilter: "code_vocabulary" (maps "print karo" → "print")
  │  4. Receive partial + final transcript events
  │  5. Return SSE stream to client
  ▼
[Browser: SSE Consumer]
  │  Shows partial transcript in "Aapne Kaha:" box (live)
  │  User taps [⏹ Roko] or 60s timeout reached
  │  Final transcript displayed → user can edit
  │  User taps [✨ Code Banao]
  ▼
[Browser: fetch /api/generate]
  │  Body: { transcript: string, context: "beginner" | "intermediate" }
  ▼
[API Gateway: POST /generate]
  │
  ▼
[Lambda: generate.js]
  │  1. Validate JWT
  │  2. Validate + sanitize transcript (max 500 chars, strip HTML)
  │  3. Build structured prompt (see §8)
  │  4. Call Bedrock: claude-3-5-sonnet-20241022
  │     - max_tokens: 1024
  │     - temperature: 0.2 (low = deterministic code)
  │  5. Parse response → extract { python_code, comments_hi, explanation_hi }
  │  6. Return JSON (never return raw Bedrock response)
  ▼
[Browser]
  │  Renders Python code in Monaco editor with typing animation
  │  Stores in localStorage (key: 'cb_last_code')
  │  Hinglish explanation shown in sidebar panel
```

---

### 3.2 Desi Debugger — Full Data Flow

```
[Pyodide Web Worker]
  │  Executes Python code
  │  Catches exception → { type, message, lineno, text }
  │  Posts message to main thread: { type: 'ERROR', payload }
  ▼
[Browser: Main Thread]
  │  Receives error event
  │  Highlights error line in Monaco (red gutter decoration)
  │  Constructs payload: { code, error_type, error_message, line_number, line_text }
  ▼
[POST /api/debug]
  │  Headers: { Authorization: Bearer <session_jwt> }
  │  Body: { code: string(max 2000), error: ErrorPayload }
  ▼
[API Gateway: POST /debug]
  ▼
[Lambda: debug.js]
  │  1. Validate JWT + rate limit (max 20 debug calls/min per session)
  │  2. Check error cache: if same error_type + line_number seen in last 30s, 
  │     return cached explanation (avoid redundant Bedrock calls)
  │  3. Sanitize code (remove any exec(), eval(), __import__() before logging)
  │  4. Build debug prompt (see §8.2)
  │  5. Call Bedrock (claude-3-5-sonnet): temperature: 0.1
  │  6. Parse: { friendly_message, fix_suggestion, corrected_line }
  │  7. Return structured JSON
  ▼
[Browser]
  │  Renders "💬 Debugger" panel:
  │    - Friendly Hindi message (large, conversational font)
  │    - [📋 Fix Dekho] → expands diff view
  │    - [✅ Apply Karo] → applies corrected_line to editor
  │  Logs error to session error history (localStorage)
```

---

### 3.3 Intent-Based Auto-Complete — Data Flow

```
[Monaco Editor: onChange event]
  │  Debounce 800ms
  │  Check: current line is incomplete (no colon at end for block starters,
  │          or line ends mid-expression)
  │  Check: not currently recording voice
  ▼
[Browser: fetch /api/suggest]
  │  Body: {
  │    current_line: string,
  │    surrounding_lines: string[5],  // 2 above, 2 below
  │    cursor_position: number
  │  }
  ▼
[Lambda: suggest.js]
  │  1. Validate JWT
  │  2. Cancel-token check: if new request arrives before response, abort previous
  │  3. Build suggestion prompt (see §8.3)
  │  4. Call Bedrock: max_tokens: 256, temperature: 0.3
  │  5. Return: { suggestions: [{ code: string, label_hi: string }] }
  ▼
[Browser]
  │  Renders floating suggestion panel below cursor
  │  Tab: accept top suggestion
  │  ↑/↓: navigate
  │  Esc: dismiss
```

---

### 3.4 Client-Side Execution (Pyodide) — Data Flow

```
[Browser: Main Thread]
  │  User taps [▶ Chalao]
  │  Posts { code: string } to Web Worker
  ▼
[Web Worker: pyodide-worker.js]
  │  Worker has its own Pyodide instance (pre-loaded on app start)
  │  Redirects stdout/stderr to custom stream object
  │  Sets execution timeout: setTimeout(self.close, 10000)
  │  
  │  try:
  │    await pyodide.runPythonAsync(code)
  │    → Captures output line by line via postMessage({ type: 'STDOUT', line })
  │  except Exception as e:
  │    → postMessage({ type: 'ERROR', payload: { type, message, lineno } })
  │  
  │  On timeout: Worker self.close() called
  │    → Main thread detects Worker 'close' event before completion
  │    → Spawns new Worker for next execution
  ▼
[Browser: Main Thread]
  │  Receives messages from Worker:
  │    STDOUT → append line to terminal output panel
  │    ERROR  → trigger Desi Debugger flow (§3.2)
  │    TIMEOUT (inferred from worker close) → show timeout message
  │    DONE   → show execution time in ms
```

---

## 4. Frontend Architecture

### 4.1 Directory Structure

```
codebhasha/
├── app/
│   ├── layout.tsx          # Root layout (fonts, metadata, theme provider)
│   ├── page.tsx            # Main IDE page
│   └── api/                # Next.js API routes (thin proxies only)
│       ├── token/route.ts  # Issues session JWT
│       └── proxy/route.ts  # Streams audio to Lambda (avoids CORS from browser)
├── components/
│   ├── Editor/
│   │   ├── CodeEditor.tsx      # Monaco wrapper
│   │   ├── EditorToolbar.tsx   # Run, Clear, Copy buttons
│   │   └── OutputPanel.tsx     # Terminal output display
│   ├── Voice/
│   │   ├── VoiceButton.tsx     # Mic button + waveform animation
│   │   ├── TranscriptBox.tsx   # Editable transcript display
│   │   └── useVoiceCapture.ts  # Hook: MediaRecorder logic
│   ├── Debugger/
│   │   ├── DebuggerPanel.tsx   # Hinglish error display
│   │   └── DiffView.tsx        # Before/after code diff
│   ├── Suggestions/
│   │   └── SuggestionPopover.tsx  # Auto-complete dropdown
│   └── UI/
│       ├── Toast.tsx           # Hinglish error toasts
│       ├── Spinner.tsx         # Loading states
│       └── OnboardingTour.tsx  # First-visit walkthrough
├── lib/
│   ├── pyodide-worker.ts   # Web Worker: Pyodide execution
│   ├── api-client.ts       # Typed fetch wrappers for Lambda endpoints
│   ├── session.ts          # JWT fetch + refresh logic
│   └── constants.ts        # API URLs, timeouts, config
├── store/
│   └── useAppStore.ts      # Zustand store (code, output, debugState, etc.)
├── public/
│   └── pyodide-worker.js   # Bundled Web Worker (separate webpack entry)
└── middleware.ts            # Rate limit headers, security headers (Next.js)
```

### 4.2 State Management (Zustand)

```typescript
interface AppState {
  // Editor
  code: string;
  setCode: (code: string) => void;

  // Voice
  isRecording: boolean;
  transcript: string;
  setTranscript: (t: string) => void;

  // Execution
  isExecuting: boolean;
  output: OutputLine[];  // { type: 'stdout' | 'stderr', text: string }[]
  executionTime: number | null;

  // Debugger
  debugResult: DebugResult | null;
  errorLine: number | null;

  // Suggestions
  suggestions: Suggestion[];
  isFetchingSuggestions: boolean;

  // UI
  isLoading: Record<string, boolean>;  // keyed by request type
  sessionToken: string | null;
}
```

### 4.3 Mobile Layout (360px)

```
┌─────────────────────────────┐
│  🏠 CodeBhasha    [☀/🌙] [?]│  ← Header (48px)
├─────────────────────────────┤
│  ┌─────────────────────┐    │
│  │ [🎤 Bolo] [✏ Likho] │    │  ← Mode Tabs
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │  Aapne Kaha:        │    │  ← Transcript box (collapsible)
│  │  [editable text]    │    │
│  │        [✨ Code Banao]│   │
│  └─────────────────────┘    │
├─────────────────────────────┤
│  ┌─────────────────────┐    │
│  │  Monaco Editor      │    │  ← Code Editor (flex: 1)
│  │  (Python)           │    │
│  │                     │    │
│  └─────────────────────┘    │
├─────────────────────────────┤
│  [▶ Chalao]    [🗑 Clear]    │  ← Action Bar (56px)
├─────────────────────────────┤
│  ┌─────────────────────┐    │
│  │  Output / Debugger  │    │  ← Output Panel (collapsible, 30vh)
│  │  (tabbed)           │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
```

---

## 5. AWS Backend Architecture

### 5.1 Lambda Functions

| Function | Trigger | Runtime | Memory | Timeout | Purpose |
|---|---|---|---|---|---|
| `cb-token` | API GW POST /token | Node.js 20 | 128 MB | 5s | Issue session JWT |
| `cb-authorizer` | API GW Lambda Authorizer | Node.js 20 | 128 MB | 3s | Validate JWT on all routes |
| `cb-transcribe` | API GW POST /transcribe | Node.js 20 | 512 MB | 30s | Stream audio to Transcribe |
| `cb-generate` | API GW POST /generate | Node.js 20 | 256 MB | 30s | Hinglish → Python via Bedrock |
| `cb-debug` | API GW POST /debug | Node.js 20 | 256 MB | 30s | Error → Hinglish explanation |
| `cb-suggest` | API GW POST /suggest | Node.js 20 | 256 MB | 15s | Intent autocomplete via Bedrock |

### 5.2 IAM Role Configuration

```json
{
  "RoleName": "CodeBhasha-Lambda-ExecutionRole",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0"
    },
    {
      "Effect": "Allow",
      "Action": [
        "transcribe:StartStreamTranscriptionWebSocket",
        "transcribe:StartStreamTranscription"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:codebhasha/jwt-signing-key-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

### 5.3 API Gateway Configuration

```
REST API: codebhasha-api
├── /token      POST  → cb-token Lambda (no auth required)
├── /transcribe POST  → cb-transcribe Lambda (Lambda Authorizer)
├── /generate   POST  → cb-generate Lambda (Lambda Authorizer)
├── /debug      POST  → cb-debug Lambda (Lambda Authorizer)
└── /suggest    POST  → cb-suggest Lambda (Lambda Authorizer)

Throttling:
  - Default: 100 req/s burst, 60 req/s steady
  - Per-route overrides: /suggest → 30 req/s (expensive)

CORS:
  - AllowOrigin: https://codebhasha.vercel.app
  - AllowMethods: POST, OPTIONS
  - AllowHeaders: Content-Type, Authorization
  - MaxAge: 600

Usage Plans:
  - Basic Plan: 200 requests/day, 60 req/min
  - Applied to all API keys issued at session start
```

---

## 6. Security Architecture

### 6.1 Authentication Flow (Session JWT)

```
[Browser: app startup]
  │  Check localStorage for 'cb_session_token'
  │  If missing or expired (exp < now):
  ▼
[POST /token] (no auth required)
  │  Body: { fingerprint: string }  ← browser fingerprint (not PII)
  ▼
[Lambda: cb-token]
  │  1. Fetch JWT signing key from AWS Secrets Manager
  │     (cached in Lambda memory for Lambda lifetime)
  │  2. Issue JWT:
  │     {
  │       iss: "codebhasha",
  │       aud: "codebhasha-api",
  │       sub: fingerprint_hash,  ← SHA-256 of fingerprint (not stored raw)
  │       exp: now + 4h,
  │       iat: now
  │     }
  │  3. Return { token: <jwt> }
  ▼
[Browser]
  │  Store token in memory (Zustand) AND localStorage (for page refresh)
  │  Attach to every subsequent request: Authorization: Bearer <jwt>
  
[Lambda Authorizer: cb-authorizer]
  │  Verifies JWT signature (HS256), exp, iss, aud
  │  On success: returns IAM Allow policy → request proceeds
  │  On failure: returns 401 → browser silently refreshes token and retries once
```

### 6.2 Secrets Management

```
AWS Secrets Manager:
  Secret Name: codebhasha/jwt-signing-key
  Secret Value: { "key": "<256-bit random hex>" }
  Rotation: Manual (sufficient for hackathon; production would use auto-rotation)

Lambda Environment Variables (non-secret):
  BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
  BEDROCK_REGION=us-east-1
  TRANSCRIBE_REGION=us-east-1
  CORS_ORIGIN=https://codebhasha.vercel.app
  LOG_LEVEL=info

DO NOT set in Lambda env vars:
  ❌ AWS_ACCESS_KEY_ID (use IAM role instead)
  ❌ AWS_SECRET_ACCESS_KEY (use IAM role instead)
  ❌ JWT_SIGNING_KEY (fetch from Secrets Manager instead)
```

### 6.3 Input Validation (Zod Schemas)

```typescript
// Lambda-side validation — never trust client input

const GenerateSchema = z.object({
  transcript: z.string().min(3).max(500).regex(/^[\u0000-\u007F\u0900-\u097F\s.,?!]+$/),
  // Allows ASCII + Devanagari + common punctuation only
  context: z.enum(['beginner', 'intermediate']).default('beginner'),
});

const DebugSchema = z.object({
  code: z.string().max(2000),
  error: z.object({
    type: z.string().max(50),
    message: z.string().max(300),
    lineno: z.number().int().min(1).max(1000),
    line_text: z.string().max(200),
  }),
});

const SuggestSchema = z.object({
  current_line: z.string().max(200),
  surrounding_lines: z.array(z.string().max(200)).max(5),
  cursor_position: z.number().int().min(0),
});
```

### 6.4 Content Security Policy (Next.js middleware)

```typescript
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  font-src 'self';
  connect-src 'self' https://*.execute-api.us-east-1.amazonaws.com wss://*.execute-api.us-east-1.amazonaws.com;
  worker-src 'self' blob:;
  child-src 'self' blob:;
  object-src 'none';
  frame-ancestors 'none';
`;
// Note: 'unsafe-eval' required for Pyodide WASM compilation
// Note: 'unsafe-inline' for Tailwind JIT styles (can be removed with nonce in production)
```

---

## 7. API Contracts

### 7.1 POST /token
```
Request:  { fingerprint: string }
Response: { token: string, expires_at: number }
Errors:   400 (missing fingerprint)
```

### 7.2 POST /transcribe
```
Request:  Binary audio stream (audio/webm)
          Headers: Authorization: Bearer <jwt>
                   Content-Type: audio/webm
Response: SSE stream:
          data: { type: "partial", text: "Ek function banao..." }
          data: { type: "final", text: "Ek function banao 1 se 10 tak" }
          data: { type: "error", message: "Awaaz clear nahi aayi" }
Errors:   401 (invalid JWT), 413 (payload too large), 429 (rate limit)
```

### 7.3 POST /generate
```
Request:  {
            transcript: string,    // max 500 chars
            context: "beginner" | "intermediate"
          }
Response: {
            python_code: string,   // complete Python code
            comments_hi: string[], // Hinglish comment for each block
            explanation_hi: string // 1-2 sentence Hinglish summary
          }
Errors:   400 (validation fail), 401, 429, 503 (Bedrock unavailable)
```

### 7.4 POST /debug
```
Request:  {
            code: string,           // max 2000 chars
            error: {
              type: string,
              message: string,
              lineno: number,
              line_text: string
            }
          }
Response: {
            friendly_message: string,   // Hinglish explanation
            fix_suggestion: string,     // Hinglish fix description
            corrected_line: string | null  // fixed code for that line
          }
Errors:   400, 401, 429, 503
```

### 7.5 POST /suggest
```
Request:  {
            current_line: string,
            surrounding_lines: string[],
            cursor_position: number
          }
Response: {
            suggestions: [
              { code: string, label_hi: string },
              ...  // max 3
            ]
          }
Errors:   400, 401, 429, 503
```

---

## 8. Prompt Engineering

### 8.1 Code Generation Prompt

```
SYSTEM:
You are CodeBhasha, an AI coding assistant for Indian students who think in Hinglish.
Your job is to convert a Hinglish description of logic into clean, correct Python code.

Rules:
1. Generate ONLY syntactically correct Python 3 code.
2. Add an inline comment in Hinglish after every meaningful line.
3. Use simple, beginner-friendly Python — no advanced features unless explicitly asked.
4. Do NOT add any explanation outside the JSON structure.
5. If the request is ambiguous, make the simplest reasonable assumption.

Return ONLY a valid JSON object with this exact structure:
{
  "python_code": "<complete python code here>",
  "comments_hi": ["<comment for block 1>", "<comment for block 2>"],
  "explanation_hi": "<1-2 sentence Hinglish summary of what the code does>"
}

USER:
Student level: {context}
Student said: "{transcript}"
```

### 8.2 Desi Debugger Prompt

```
SYSTEM:
You are the "Desi Debugger" — a friendly senior developer who explains Python errors 
to beginners in conversational Hinglish (mix of Hindi and English).

Your explanations must:
1. Start with "Bhai" or "Yaar" to sound friendly.
2. Explain WHAT went wrong in simple Hindi.
3. Tell EXACTLY how to fix it (specific line, specific character).
4. Never use jargon without explaining it.
5. Be max 3 sentences.

Return ONLY a valid JSON object:
{
  "friendly_message": "<Hinglish explanation, max 3 sentences>",
  "fix_suggestion": "<Hinglish instruction on exactly what to type/change>",
  "corrected_line": "<the corrected version of the error line, or null>"
}

USER:
Error Type: {error.type}
Error Message: {error.message}
Line Number: {error.lineno}
Problematic Line: {error.line_text}
Full Code:
{code}
```

### 8.3 Auto-Complete Prompt

```
SYSTEM:
You are a Python code assistant for beginner Indian students.
Given the current incomplete line of code and surrounding context,
suggest up to 3 logical completions with short Hinglish labels.

Return ONLY a valid JSON object:
{
  "suggestions": [
    { "code": "<complete python snippet>", "label_hi": "<Hinglish intent label>" },
    { "code": "<alternative>", "label_hi": "<Hinglish intent label>" }
  ]
}

USER:
Current line: "{current_line}"
Context:
{surrounding_lines.join('\n')}
```

---

## 9. Infrastructure as Code (IaC) Overview

All AWS resources are defined using AWS SAM (`template.yaml`) for easy deployment:

```yaml
# Key resources defined:
Resources:
  CodeBhashaApi:
    Type: AWS::Serverless::Api
    Properties:
      StageName: prod
      Auth:
        DefaultAuthorizer: JWTAuthorizer
        Authorizers:
          JWTAuthorizer:
            FunctionArn: !GetAtt AuthorizerFunction.Arn
      Cors:
        AllowOrigin: !Sub "'${CorsOrigin}'"
        AllowHeaders: "'Content-Type,Authorization'"
        AllowMethods: "'POST,OPTIONS'"

  GenerateFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/generate/
      Handler: index.handler
      Runtime: nodejs20.x
      MemorySize: 256
      Timeout: 30
      Policies:
        - Statement:
          - Effect: Allow
            Action: bedrock:InvokeModel
            Resource: !Sub "arn:aws:bedrock:${AWS::Region}::foundation-model/anthropic.claude-3-5-sonnet*"

  JwtSigningKey:
    Type: AWS::SecretsManager::Secret
    Properties:
      Name: codebhasha/jwt-signing-key
      GenerateSecretString:
        SecretStringTemplate: '{}'
        GenerateStringKey: key
        PasswordLength: 64
        ExcludeCharacters: '"@/\'
```

---

## 10. Deployment Architecture

### 10.1 Frontend — Vercel

```
GitHub Push to `main`
  → Vercel CI/CD triggered
  → Next.js build (next build)
  → Static assets to Vercel CDN
  → Environment Variables (set in Vercel dashboard):
      NEXT_PUBLIC_API_BASE_URL=https://api-gateway-url/prod
      NEXT_PUBLIC_PYODIDE_VERSION=0.25.0

Domain: codebhasha.vercel.app
Edge Network: Vercel's global CDN (~50 edge locations)
```

### 10.2 Backend — AWS

```
# Deploy with SAM CLI
sam build
sam deploy --guided \
  --stack-name codebhasha-prod \
  --region us-east-1 \
  --parameter-overrides CorsOrigin=https://codebhasha.vercel.app

Output: API Gateway URL → set in Vercel env var
```

### 10.3 Environment Configuration

| Variable | Where Set | Value |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Vercel Dashboard | AWS API Gateway URL |
| `NEXT_PUBLIC_APP_ENV` | Vercel Dashboard | `production` |
| `BEDROCK_MODEL_ID` | Lambda Env (SAM) | `anthropic.claude-3-5-sonnet-20241022-v2:0` |
| `JWT_SECRET_ARN` | Lambda Env (SAM) | Secrets Manager ARN |
| `CORS_ORIGIN` | SAM Parameter | `https://codebhasha.vercel.app` |

---

## 11. Observability & Monitoring

### 11.1 CloudWatch Metrics (Custom)

Lambda functions emit these metrics via `console.log` (structured JSON → CloudWatch Logs Insights):

```javascript
// Every Lambda logs this shape:
{
  "service": "cb-generate",
  "request_id": "<lambda-request-id>",
  "duration_ms": 1420,
  "bedrock_tokens_in": 310,
  "bedrock_tokens_out": 256,
  "error": null,
  "session_hash": "<sha256 of JWT sub>"  // for debugging, not PII
}
```

### 11.2 Key Alarms

| Alarm | Threshold | Action |
|---|---|---|
| Lambda error rate | > 5% over 5 min | CloudWatch alert email |
| Lambda P99 duration | > 20s | CloudWatch alert email |
| API Gateway 429 rate | > 20/min | Review rate limits |
| Bedrock throttling errors | Any | Alert — check Bedrock quota |

### 11.3 Frontend Monitoring

- Vercel Analytics (built-in): Core Web Vitals, page load times
- Custom events via `navigator.sendBeacon` for:
  - Voice-to-code completion rate
  - Debugger trigger frequency
  - Pyodide load time

---

## 12. Day-by-Day Build Plan

| Day | Focus | Deliverable |
|---|---|---|
| **Day 1** | Project setup + infra skeleton | Next.js app, Vercel deploy, SAM template, API Gateway stubs, Pyodide running in Web Worker |
| **Day 2** | Code execution + editor | Monaco editor, Pyodide execution, stdout display, 10s timeout, localStorage persistence |
| **Day 3** | Desi Debugger | Lambda debug endpoint, Bedrock integration, error highlighting in Monaco, Hinglish error UI |
| **Day 4** | Bol Ke Code — voice | MediaRecorder, Lambda/Transcribe streaming, transcript UI, Code Banao flow |
| **Day 5** | Code generation + auto-complete | Lambda generate endpoint, Bedrock code gen, suggestion popover, Hinglish comments in code |
| **Day 6** | Auth, rate limiting, polish | JWT session flow, rate limits, mobile layout testing, onboarding tour, all Hinglish error states |
| **Day 7** | Edge case hardening + demo prep | All §7 edge cases tested, performance audit, 4G throttling test, demo script, README |
