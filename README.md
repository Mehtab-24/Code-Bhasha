# CodeBhasha

**Tagline:** *Syntax is a barrier; Logic is universal.*

A **mobile-first**, neon-dark, glassy little Python playground built for folks who *think in Hinglish*.

Write code. Run it **instantly in the browser** (Pyodide + Web Worker).  
Break code. Get roasted (politely) by the **Desi Debugger** (AWS Bedrock) in friendly Hinglish.

---

## Why CodeBhasha?

Because the first `SyntaxError` shouldn’t feel like a career-ending event.

CodeBhasha helps beginners move from *“logic samajh aata hai but syntax…”* to *“haan bhai, ho gaya.”*

**What’s inside:**
- ⚡ **Instant Python execution** in-browser using **Pyodide (WASM)** inside a **Web Worker**
- 🧠 **Desi Debugger**: converts scary tracebacks into **simple Hinglish explanations**
- ✨ UI that tries to feel premium: **glassmorphism + neon accents**
- 🧰 **Monaco Editor** with a multi-file tab vibe (create / rename / delete)

> Note: `design.md` + `requirements.md` describe a bigger AWS setup (API Gateway + Lambda for voice/transcribe/generate flows).  
> This repo currently includes **`/api/debug`** and the **frontend voice UI**, but some backend routes described there may not exist yet in this codebase.

---

## What you can do (aka the fun part)

### 1) ✏️ Likho → ▶️ Chalao (Write & Run Python)
- Type Python in the Monaco editor
- Smash **▶ Chalao**
- Watch output stream into the terminal panel (**stdout/stderr**)
- Infinite loop? Don’t worry—**10s timeout** kills the worker and respawns it.

### 2) 💥 Error aaya? Desi Debugger sambhalega
When Python throws hands, CodeBhasha:
1. Captures `{ type, message, lineno, line_text }` from the Pyodide worker
2. Calls `POST /api/debug`
3. Shows:
   - 💬 Friendly Hinglish explanation
   - 🔧 Clear fix suggestion
   - ✨ Corrected line (when available)

And yes, the UI auto-switches to the **Debugger** tab so you don’t have to hunt.

---

## Tech Stack (the ingredients)

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **UI:** Tailwind CSS + Framer Motion
- **Editor:** Monaco (`@monaco-editor/react`)
- **State:** Zustand
- **Python runtime:** Pyodide (WASM) in a Web Worker
- **AI Debugging:** AWS Bedrock (`@aws-sdk/client-bedrock-runtime`)
- **Validation:** Zod
- **Icons:** lucide-react

---

## Project Structure (high-level map)

```txt
src/
  app/
    api/
      debug/route.ts      # Bedrock-powered Hinglish error explanations
    layout.tsx
    page.tsx
    globals.css
  components/
    AppShell.tsx          # Main UI: tabs, run/clear, output/debugger, etc.
    Header.tsx
    TutorialModal.tsx
    Editor/
      CodeEditor.tsx
      OutputPanel.tsx
      DownloadModal.tsx
      StdinPanel.tsx
    Voice/
      VoicePanel.tsx
  lib/
    execution-service.ts  # Worker lifecycle, queue, READY event
    pyodide-worker.ts     # (Reference worker) Execution + error parsing
  store/
    useExecutionStore.ts  # Zustand state + actions (run, debug fetch, voice state)
  middleware.ts           # CSP + security headers (Pyodide/CDN + Worker support)
```

---

## Getting Started (local)

### Prerequisites
- **Node.js 20+**
- npm

### Install
```bash
npm install
```

### Run dev server
```bash
npm run dev
```

Open:
- `http://localhost:3000`

### Production build
```bash
npm run build
npm run start
```

---

## Environment Variables (for Desi Debugger)

`src/app/api/debug/route.ts` needs AWS credentials available at runtime.

Set these locally (examples shown; **never commit real keys**):

```bash
export AWS_REGION="us-east-1"
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
```

> Heads up: there’s currently **no `.env.local.example`** in the repo, so create your own `.env.local` if you prefer env files over shell exports.

---

## API

### `POST /api/debug`

**Purpose:** Turn Python errors into Hinglish explanations (+ optional corrected line).

**Request**
```json
{
  "code": "print('hello'",
  "error": {
    "type": "SyntaxError",
    "message": "unexpected EOF while parsing",
    "lineno": 1,
    "line_text": "print('hello'"
  }
}
```

**Response**
```json
{
  "friendly_message": "Bhai, ...",
  "fix_suggestion": "Line 1 pe ...",
  "corrected_line": "print('hello')"
}
```

---

## How execution works (Pyodide Worker)

Execution is managed by `src/lib/execution-service.ts`:

- Loads Pyodide from jsDelivr (`pyodide.js` + WASM assets)
- Streams stdout/stderr into the UI
- Supports stdin (see `StdinPanel` + worker plumbing)
- **10s hard timeout** protects the UI from hanging
- Worker sends a **READY** event so the Run button can enable cleanly

---

## Security notes (CSP)

`src/middleware.ts` sets a CSP that’s Pyodide-friendly:
- allows loading assets from jsDelivr
- allows workers (`worker-src blob: data:`)
- includes `unsafe-eval` (needed for Pyodide/WASM compilation)

---

## Testing (manual but solid)

- `TESTING_GUIDE.md` — end-to-end UX checklist (worker init, mic permission flow, scrolling, full integration test)
- `TEST_EXAMPLES.md` — copy/paste “break-it” snippets for Desi Debugger verification

Quick sanity run:
1. `npm run dev`
2. Run button: “Initializing…” → “▶ Chalao”
3. Run a loop, confirm output
4. Paste a SyntaxError and confirm Debugger response

---

## Roadmap (from docs)

Planned / documented ideas:
- Voice-to-code transcription + code generation
- Intent-based suggestions/autocomplete
- Auth/session token flows
- More robust AWS deployment story

Docs:
- `design.md` (last updated **2026-02-26**)
- `requirements.md` (last updated **2026-02-26**)

---

## Contributing

If you want to help:
- keep things **mobile-first** (360px baseline)
- don’t block the main thread (workers ftw)
- don’t leak secrets (ever)

---

## License

This project is licensed under the **MIT License** — see the `LICENSE` file for details.
