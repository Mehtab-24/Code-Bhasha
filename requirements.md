# CodeBhasha — Product Requirements Document (PRD)
**Version:** 1.0 | **Phase:** 1 — Hackathon Prototype  
**Tagline:** *Syntax is a barrier; Logic is universal.*  
**Last Updated:** 2026-02-26

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [User Personas](#3-user-personas)
4. [Core User Flows](#4-core-user-flows)
5. [Functional Requirements](#5-functional-requirements)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [Edge Cases & Failure Modes](#7-edge-cases--failure-modes)
8. [Out of Scope (v1)](#8-out-of-scope-v1)
9. [Acceptance Criteria](#9-acceptance-criteria)

---

## 1. Executive Summary

CodeBhasha is a mobile-first, web-based coding environment that removes the English-syntax barrier for Indian students in Tier-2/3 colleges. Students can speak or type logic in natural Hinglish, receive instant Python code, run it client-side with zero latency, and understand errors through friendly conversational Hindi/Hinglish explanations — without ever leaving the browser.

---

## 2. Problem Statement

| Dimension | Data Point |
|---|---|
| Target Audience | ~15 million CS/IT students in Tier-2/3 Indian colleges |
| Primary Language of Thought | Hindi / Hinglish (~90% in rural/semi-urban areas) |
| Drop-off Trigger | First `SyntaxError` in Week 1 — kills confidence before logic is learned |
| Root Cause | Forced context-switch from mother tongue to strict English syntax |
| Existing Alternatives | English-only IDEs, generic ChatGPT (no execution, no voice, no Hinglish UX) |

**Core Insight:** These students understand *logic*. They can explain algorithms fluently in Hinglish. The barrier is purely syntactic — a translation problem, not an intelligence problem.

---

## 3. User Personas

### 3.1 Persona A — "Ramesh" (Primary)
| Attribute | Detail |
|---|---|
| Name | Ramesh Yadav |
| Age | 19 |
| College | BCA, Tier-3 college, Lucknow |
| Device | ₹12,000 Android phone, 4G internet (2-3 Mbps), shared hostel Wi-Fi |
| Coding Experience | 3 months — knows `print`, `if-else` but panics at tracebacks |
| Language | Thinks and speaks in Hinglish; reads English slowly |
| Goal | Pass his Python lab exam; eventually get a job |
| Frustration | "Yeh `IndentationError` kya hota hai? Maine toh sab sahi likha tha!" |
| Tech Comfort | Uses WhatsApp, YouTube, Instagram daily — comfortable with touch UI |

### 3.2 Persona B — "Priya" (Secondary)
| Attribute | Detail |
|---|---|
| Name | Priya Sharma |
| Age | 21 |
| College | B.Tech CSE, Tier-2 college, Jaipur |
| Device | Mid-range laptop + phone |
| Coding Experience | 1.5 years — understands concepts but struggles with complex syntax (decorators, list comprehensions) |
| Language | Comfortable in both Hindi and English |
| Goal | Build projects for internship applications |
| Value Prop | Uses CodeBhasha to scaffold complex logic blocks quickly via voice |

### 3.3 Persona C — "Sir Ji" (Tertiary — Educator)
| Attribute | Detail |
|---|---|
| Name | Ashok Kumar (Professor) |
| Age | 45 |
| Context | Teaches Python to 120 students; limited time for individual help |
| Goal | Point students to a tool that explains errors in their language |
| Value Prop | Reduces "sir ye error kyun aa raha hai" questions |

---

## 4. Core User Flows

### 4.1 Flow 1 — Bol Ke Code (Voice-to-Code)
```
User taps [🎤 Bolo] button
  → Browser requests microphone permission
    → [GRANTED] → Start audio capture via Web Audio API
    → [DENIED]  → Show inline Hindi error: "Mic ki permission do, settings mein jaake"
                  → Offer fallback: switch to text input mode

[GRANTED PATH]
Audio stream → POST to /api/transcribe (AWS API Gateway → Lambda)
  → Lambda streams audio to Amazon Transcribe (Hinglish language model)
  → Partial transcription results streamed back to UI (show live transcript)
  → User says "band karo" or taps [⏹ Roko]
  → Final transcript confirmed → display editable text in "Aapne Kaha:" box

User reviews transcript → taps [✨ Code Banao]
  → POST to /api/generate (AWS API Gateway → Lambda)
  → Lambda calls Amazon Bedrock (Claude 3.5 Sonnet) with structured prompt
  → Bedrock returns Python code + inline Hindi comments
  → Code appears in Monaco editor with typing animation
  → Auto-save to browser localStorage

User taps [▶ Chalao]
  → Pyodide executes Python in Web Worker (isolated)
  → Output appears in terminal panel (stdout/stderr)
```

### 4.2 Flow 2 — Desi Debugger
```
Pyodide catches exception (SyntaxError / RuntimeError / etc.)
  → Raw traceback captured
  → POST to /api/debug (AWS API Gateway → Lambda)
  → Lambda calls Bedrock with: { code, error, line_number, user_language: "hinglish" }
  → Bedrock returns: { friendly_message_hi, fix_suggestion, corrected_code_snippet }
  → UI renders:
      💬 "Bhai, line 5 pe 'print' ke baad bracket band karna bhool gaye — ')' lagao"
      [📋 Fix Dekho] → shows diff of suggested correction
      [✅ Apply Karo] → auto-applies fix to editor
```

### 4.3 Flow 3 — Intent-Based Auto-Complete
```
User types in editor (debounced 800ms after last keystroke)
  → If cursor is on an incomplete line AND confidence > threshold:
  → POST to /api/suggest (AWS API Gateway → Lambda → Bedrock)
  → Returns up to 3 intent-aware suggestions with Hinglish labels:
      • "Loop chalao 1 se 10 tak" → `for i in range(1, 11):`
      • "Condition check karo" → `if condition:`
      • "Function banao" → `def function_name():`
  → User presses Tab / clicks suggestion → inserts into editor
  → Esc dismisses
```

### 4.4 Flow 4 — Onboarding (First Visit)
```
First visit detected (no localStorage key 'cb_onboarded')
  → 4-step Hindi tooltip tour:
      Step 1: "Yahan bolo ya likho apni logic"
      Step 2: "Yeh button code banata hai"
      Step 3: "Yahan code chalega — seedha browser mein!"
      Step 4: "Error aaya? Desi Debugger samjhayega"
  → User can skip at any step
  → localStorage.setItem('cb_onboarded', 'true')
```

---

## 5. Functional Requirements

### 5.1 Feature F1 — Bol Ke Code (Voice-to-Code)

| ID | Requirement | Priority |
|---|---|---|
| F1.1 | System SHALL capture microphone audio using the browser's MediaRecorder API | P0 |
| F1.2 | System SHALL stream audio to Amazon Transcribe via a signed Lambda endpoint | P0 |
| F1.3 | System SHALL support Hinglish transcription (hi-IN locale with code-switching) | P0 |
| F1.4 | System SHALL display partial (streaming) transcription results in real time | P1 |
| F1.5 | System SHALL allow user to edit the transcribed text before code generation | P0 |
| F1.6 | System SHALL display a pulsing waveform animation while recording is active | P2 |
| F1.7 | System SHALL auto-stop recording after 60 seconds of continuous audio | P1 |
| F1.8 | System SHALL detect silence > 5 seconds and prompt "Bolna khatam? [Haan / Nahi]" | P2 |
| F1.9 | System SHALL provide a full text-input fallback if microphone permission is denied | P0 |
| F1.10 | System SHALL send the transcript + context to Bedrock for Python code generation | P0 |
| F1.11 | Generated code SHALL include inline comments in Hinglish explaining each block | P1 |

### 5.2 Feature F2 — Desi Debugger

| ID | Requirement | Priority |
|---|---|---|
| F2.1 | System SHALL intercept all Pyodide runtime exceptions before displaying to user | P0 |
| F2.2 | System SHALL send { code, error_type, error_message, line_number } to the debug Lambda | P0 |
| F2.3 | Bedrock SHALL return a friendly Hindi/Hinglish explanation of the error | P0 |
| F2.4 | System SHALL display the explanation in a visually distinct "Debugger" panel | P0 |
| F2.5 | System SHALL highlight the error line in the editor (red gutter marker) | P1 |
| F2.6 | System SHALL offer a one-click "Fix Apply Karo" button for suggested corrections | P1 |
| F2.7 | The fix SHALL be shown as a diff (before/after) before the user applies it | P2 |
| F2.8 | System SHALL log repeated errors (same type, same line) to avoid redundant API calls | P2 |
| F2.9 | Debugger SHALL handle at minimum: SyntaxError, IndentationError, NameError, TypeError, IndexError, ZeroDivisionError | P0 |

### 5.3 Feature F3 — Intent-Based Auto-Complete

| ID | Requirement | Priority |
|---|---|---|
| F3.1 | System SHALL trigger auto-complete suggestions with an 800ms debounce | P1 |
| F3.2 | System SHALL send the current line context and surrounding 5 lines to Bedrock | P1 |
| F3.3 | System SHALL display up to 3 suggestions with Hinglish intent labels | P1 |
| F3.4 | Tab key SHALL accept the top suggestion; arrow keys navigate between suggestions | P1 |
| F3.5 | Esc key SHALL dismiss the suggestions panel | P1 |
| F3.6 | System SHALL NOT trigger auto-complete while voice recording is active | P1 |
| F3.7 | Auto-complete requests SHALL be cancellable if the user continues typing | P2 |

### 5.4 Feature F4 — Instant Browser Execution (Pyodide)

| ID | Requirement | Priority |
|---|---|---|
| F4.1 | System SHALL execute Python code entirely client-side using Pyodide (WebAssembly) | P0 |
| F4.2 | Execution SHALL run in a Web Worker to prevent UI thread blocking | P0 |
| F4.3 | System SHALL enforce a hard 10-second execution timeout via Worker termination | P0 |
| F4.4 | On timeout, system SHALL display: "Bhai, code bahut time le raha hai. Infinite loop toh nahi?" | P0 |
| F4.5 | System SHALL support standard library modules (math, random, json, datetime, etc.) | P1 |
| F4.6 | System SHALL capture and display both stdout and stderr in the output panel | P0 |
| F4.7 | System SHALL support `input()` via a modal prompt dialog | P2 |
| F4.8 | Pyodide WASM bundle SHALL be served from CDN (jsdelivr/pyodide CDN) and cached via Service Worker | P1 |

### 5.5 Feature F5 — Code Editor

| ID | Requirement | Priority |
|---|---|---|
| F5.1 | Editor SHALL be Monaco Editor with Python syntax highlighting | P0 |
| F5.2 | Editor SHALL support mobile touch interactions (pinch-to-zoom, tap-to-place-cursor) | P0 |
| F5.3 | Editor SHALL auto-save code to localStorage on every change (debounced 2s) | P1 |
| F5.4 | Editor SHALL restore previous session code on page reload | P1 |
| F5.5 | Editor SHALL provide a [🗑 Clear] button with a confirmation dialog in Hindi | P1 |
| F5.6 | Editor SHALL render in dark mode by default with a light mode toggle | P2 |
| F5.7 | Editor SHALL display line numbers and a minimap (desktop only) | P2 |

### 5.6 Feature F6 — UX / Accessibility

| ID | Requirement | Priority |
|---|---|---|
| F6.1 | All primary UI labels, buttons, and messages SHALL be in Hinglish by default | P0 |
| F6.2 | System SHALL provide an English toggle (for placement in formal settings) | P2 |
| F6.3 | All interactive elements SHALL meet WCAG 2.1 AA contrast ratios | P1 |
| F6.4 | System SHALL be fully functional on screens ≥ 360px wide | P0 |
| F6.5 | System SHALL display loading skeletons/spinners for all async operations | P1 |
| F6.6 | API errors SHALL surface as friendly Hinglish toasts, never raw JSON | P0 |

---

## 6. Non-Functional Requirements

### 6.1 Performance

| ID | Requirement | Target |
|---|---|---|
| NFR-P1 | Initial page load (First Contentful Paint) | < 2.5s on 4G |
| NFR-P2 | Pyodide cold start (first execution) | < 8s (cached: < 1s) |
| NFR-P3 | Voice-to-code round trip (transcription + generation) | < 6s |
| NFR-P4 | Desi Debugger response time | < 4s |
| NFR-P5 | Auto-complete suggestion latency | < 2s |
| NFR-P6 | Python execution (non-infinite) | < 500ms for typical student programs |
| NFR-P7 | Pyodide WASM bundle cache via Service Worker | Hit rate > 90% after first load |

### 6.2 Security

| ID | Requirement | Implementation |
|---|---|---|
| NFR-S1 | NO AWS credentials SHALL be exposed in frontend code | All Bedrock/Transcribe calls go through API Gateway → Lambda with IAM role |
| NFR-S2 | API Gateway endpoints SHALL require a per-session token | Lambda Authorizer validates short-lived JWT issued at session start |
| NFR-S3 | Rate limiting SHALL be enforced per IP and per session | API Gateway Usage Plans: 60 requests/min per IP; 200 requests/day per session |
| NFR-S4 | All API payloads SHALL be validated and sanitized server-side | Lambda uses Zod schema validation; max payload size 16KB |
| NFR-S5 | Pyodide execution SHALL be sandboxed in a Web Worker | Worker has no DOM access; terminated on timeout |
| NFR-S6 | CORS policy SHALL whitelist only the Vercel deployment domain | API Gateway CORS: `Access-Control-Allow-Origin: https://codebhasha.vercel.app` |
| NFR-S7 | All Lambda → Bedrock calls SHALL use IAM execution role (NOT hardcoded keys) | Lambda execution role with `bedrock:InvokeModel` and `transcribe:StartStreamTranscription` permissions only |
| NFR-S8 | User code SHALL never be executed server-side | Code execution is entirely Pyodide client-side |
| NFR-S9 | Content Security Policy SHALL prevent XSS | `script-src 'self' cdn.jsdelivr.net; object-src 'none'` |
| NFR-S10 | Sensitive prompts (system prompts sent to Bedrock) SHALL NOT be returned to the client | Lambda strips metadata before forwarding response |

### 6.3 Reliability

| ID | Requirement | Target |
|---|---|---|
| NFR-R1 | Application uptime (Vercel) | 99.9% |
| NFR-R2 | API Gateway / Lambda error rate | < 1% |
| NFR-R3 | Graceful degradation if Bedrock is unavailable | App still loads; execution works; show "AI features temporarily unavailable" |
| NFR-R4 | All external API calls SHALL have retry logic | 2 retries with exponential backoff (Lambda-side) |

### 6.4 Scalability (Hackathon Context)

- Designed for demo/evaluation scale: up to 500 concurrent sessions
- Lambda auto-scales to demand; no pre-provisioning required
- Pyodide execution is entirely client-side — zero backend load for code execution

---

## 7. Edge Cases & Failure Modes

| Scenario | Detection | User-Facing Response |
|---|---|---|
| Microphone permission denied | `getUserMedia` rejection | "Mic ki permission chahiye. Settings > Site Settings > Microphone mein allow karo." + switch to text mode |
| Microphone hardware absent | `navigator.mediaDevices` undefined | Hide voice button entirely; show text-only mode |
| Transcription returns empty string | Empty transcript after recording | "Kuch sun nahi aaya. Dobara try karo ya text mein likho." |
| Transcription language not recognized | Confidence score < 0.4 from Transcribe | "Samajh nahi aaya. Text mein likho toh better hoga!" |
| Bedrock timeout (>10s) | Lambda timeout caught | "AI thoda busy hai, 2 second mein dobara try karo." + exponential backoff |
| Bedrock returns malformed JSON | JSON parse error in Lambda | Return a generic Hinglish error; log to CloudWatch |
| Infinite loop in student code | Web Worker `setTimeout` kills Worker after 10s | "Bhai, code bahut time le raha hai. Koi loop infinite toh nahi? [Roko]" |
| Pyodide WASM fails to load | `loadPyodide()` rejection | "Browser execution load nahi ho raha. Page reload karo." |
| Network offline during API call | `fetch` network error | "Internet nahi lag raha. Check karo aur dobara try karo." |
| API Gateway rate limit exceeded | HTTP 429 response | "Thoda slow down karo — zyada requests ho gayi. 1 minute baad try karo." |
| localStorage quota exceeded | QuotaExceededError | Silently purge oldest saved session; notify: "Purana code hata diya, jagah kam thi." |
| Very large code (>500 lines) | Character count check client-side | Warn before sending: "Itna bada code AI ke liye thoda mushkil hai. Chote chunks mein try karo." |
| Mobile keyboard covering editor | `visualViewport` API resize event | Scroll editor into view automatically |
| Session JWT expires mid-session | API returns 401 | Silently refresh token via `/api/token` endpoint; retry original request |

---

## 8. Out of Scope (v1)

- User accounts, authentication, or saved projects (cloud sync)
- Multi-file projects or importing external Python libraries beyond Pyodide's standard set
- Collaborative coding / real-time multiplayer
- Support for languages other than Python (JavaScript, Java, etc.)
- Offline-first / full PWA with background sync
- Formal curriculum or exercise sets
- Analytics dashboard for educators
- Native mobile app (iOS/Android)

---

## 9. Acceptance Criteria

A feature is "done" when it meets ALL of the following:

1. **Functional:** All P0 requirements for the feature pass manual testing on Chrome (Android) and Chrome (Desktop).
2. **Hinglish UX:** No raw English error messages or tracebacks are shown to the user; all error states have Hinglish copy.
3. **Performance:** Response times meet the targets in §6.1 on a simulated 4G connection (Chrome DevTools throttling).
4. **Security:** No AWS credentials appear in browser network tab or JavaScript bundles.
5. **Mobile:** Layout is usable on a 360×800px viewport with no horizontal scroll.
6. **Edge Cases:** All failure modes in §7 have been manually triggered and produce the correct user-facing response.
