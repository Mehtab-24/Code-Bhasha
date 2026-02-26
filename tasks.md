# CodeBhasha — Phase 3: Desi Debugger (AWS Bedrock Integration)
**Tasks List**  
**Phase:** 3 — Hinglish Error Explanations via AWS Bedrock  
**Last Updated:** 2026-02-26

---

## Task Overview

This phase implements the Desi Debugger system that transforms raw Python errors into friendly Hinglish explanations using AWS Bedrock (Claude 3.5 Sonnet). Following Data Flow Diagram 3.2 from the design document, this creates a conversational debugging experience for Indian students.

---

## Tasks

### 1. AWS SDK Setup & Dependencies
- [ ] 1.1 Install AWS SDK for JavaScript (`@aws-sdk/client-bedrock-runtime`)
- [ ] 1.2 Install Zod for input validation (`zod`)
- [ ] 1.3 Configure AWS credentials and region environment variables
- [ ] 1.4 Test AWS Bedrock connectivity and permissions

### 2. Next.js API Route Implementation
- [ ] 2.1 Create `src/app/api/debug/route.ts` with POST handler
- [ ] 2.2 Implement request validation using Zod schema from design.md
- [ ] 2.3 Add rate limiting (max 20 debug calls/min per session)
- [ ] 2.4 Implement error caching (same error_type + line_number in 30s)
- [ ] 2.5 Add input sanitization (remove exec(), eval(), __import__())

### 3. AWS Bedrock Client Integration
- [ ] 3.1 Initialize BedrockRuntimeClient with proper configuration
- [ ] 3.2 Implement Claude 3.5 Sonnet model invocation
- [ ] 3.3 Configure model parameters (temperature: 0.1, max_tokens: 512)
- [ ] 3.4 Add proper error handling for Bedrock API failures
- [ ] 3.5 Implement retry logic with exponential backoff

### 4. Desi Debugger Prompt Implementation
- [ ] 4.1 Implement exact prompt from Section 8.2 of design.md
- [ ] 4.2 Add dynamic prompt variable substitution
- [ ] 4.3 Ensure strict JSON response validation
- [ ] 4.4 Handle malformed JSON responses gracefully
- [ ] 4.5 Test prompt with various Python error types

### 5. Frontend Integration
- [ ] 5.1 Create API client function for /api/debug endpoint
- [ ] 5.2 Update execution store to handle debug responses
- [ ] 5.3 Wire error detection in Pyodide worker to trigger debug calls
- [ ] 5.4 Add loading states for debug API calls
- [ ] 5.5 Implement error handling for API failures

### 6. UI Enhancement - Debugger Tab
- [ ] 6.1 Update OutputPanel.tsx to display Bedrock responses
- [ ] 6.2 Create friendly message display with conversational styling
- [ ] 6.3 Add fix suggestion display with clear formatting
- [ ] 6.4 Implement "Fix Apply Karo" button functionality
- [ ] 6.5 Add diff view for before/after code comparison

### 7. Error Line Highlighting
- [ ] 7.1 Implement Monaco Editor error line highlighting
- [ ] 7.2 Add red gutter marker for error lines
- [ ] 7.3 Sync error highlighting with debugger responses
- [ ] 7.4 Clear highlighting when code is fixed
- [ ] 7.5 Handle multiple error scenarios

### 8. Auto-Switch to Debugger Tab
- [ ] 8.1 Implement automatic tab switching on error
- [ ] 8.2 Add visual indicator (red dot) for new errors
- [ ] 8.3 Preserve user tab preference when no errors
- [ ] 8.4 Add smooth transition animations
- [ ] 8.5 Handle rapid error scenarios gracefully

### 9. Error Caching & Performance
- [ ] 9.1 Implement client-side error caching
- [ ] 9.2 Add session error history in localStorage
- [ ] 9.3 Optimize API calls to avoid redundant requests
- [ ] 9.4 Add request deduplication for identical errors
- [ ] 9.5 Implement cache invalidation strategies

### 10. Security & Validation
- [ ] 10.1 Implement comprehensive input validation
- [ ] 10.2 Add code sanitization before sending to Bedrock
- [ ] 10.3 Validate Bedrock response structure
- [ ] 10.4 Add CORS headers for API route
- [ ] 10.5 Implement proper error logging without exposing sensitive data

### 11. Error Handling & Edge Cases
- [ ] 11.1 Handle Bedrock service unavailability
- [ ] 11.2 Implement graceful degradation when API fails
- [ ] 11.3 Add timeout handling for slow Bedrock responses
- [ ] 11.4 Handle malformed Python error data
- [ ] 11.5 Add fallback error messages in Hinglish

### 12. Testing & Validation
- [ ] 12.1 Test with common Python errors (SyntaxError, IndentationError)
- [ ] 12.2 Test with runtime errors (NameError, TypeError, IndexError)
- [ ] 12.3 Validate Hinglish response quality and tone
- [ ] 12.4 Test error caching functionality
- [ ] 12.5 Verify mobile responsiveness of debugger UI

---

## Acceptance Criteria

### Functional Requirements (P0)
- ✅ **F2.1**: System intercepts all Pyodide runtime exceptions
- ✅ **F2.2**: System sends structured error data to debug API
- ✅ **F2.3**: Bedrock returns friendly Hindi/Hinglish explanations
- ✅ **F2.4**: Explanations display in visually distinct Debugger panel
- ✅ **F2.9**: Handles minimum error types: SyntaxError, IndentationError, NameError, TypeError, IndexError, ZeroDivisionError

### Performance Requirements
- ✅ **NFR-P4**: Desi Debugger response time < 4s
- ✅ Error caching prevents redundant API calls within 30s
- ✅ Rate limiting: max 20 debug calls/min per session

### Security Requirements
- ✅ **NFR-S1**: No AWS credentials exposed in frontend
- ✅ **NFR-S4**: All payloads validated and sanitized server-side
- ✅ **NFR-S10**: System prompts not returned to client

### UX Requirements
- ✅ **F6.1**: All error messages in Hinglish by default
- ✅ **F6.6**: API errors surface as friendly Hinglish messages
- ✅ Auto-switch to Debugger tab on error occurrence

---

## Technical Implementation Details

### API Route Structure
```typescript
// POST /api/debug
interface DebugRequest {
  code: string;           // max 2000 chars
  error: {
    type: string;         // max 50 chars
    message: string;      // max 300 chars
    lineno: number;       // 1-1000
    line_text: string;    // max 200 chars
  };
}

interface DebugResponse {
  friendly_message: string;    // Hinglish explanation
  fix_suggestion: string;      // Hinglish fix instruction
  corrected_line: string | null; // Fixed code line
}
```

### Bedrock Integration
```typescript
// Model Configuration
const modelId = 'anthropic.claude-3-5-sonnet-20241022-v2:0';
const modelParams = {
  temperature: 0.1,        // Low for consistent responses
  max_tokens: 512,         // Sufficient for explanations
  top_p: 0.9
};
```

### Error Caching Strategy
```typescript
// Cache Key Format
const cacheKey = `${error.type}_${error.lineno}_${codeHash}`;
const cacheExpiry = 30 * 1000; // 30 seconds
```

### Prompt Template (Section 8.2)
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
```

---

## Dependencies

### Required Packages
- `@aws-sdk/client-bedrock-runtime` - AWS Bedrock client
- `zod` - Input validation schema
- `crypto` - For error caching hash generation

### Environment Variables
```bash
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
```

### AWS Permissions Required
```json
{
  "Effect": "Allow",
  "Action": [
    "bedrock:InvokeModel"
  ],
  "Resource": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0"
}
```

---

## Data Flow Implementation

### Error Detection → Debug Response Flow
```
1. Pyodide Worker catches Python exception
2. Main thread receives error via postMessage
3. Frontend calls POST /api/debug with error data
4. API route validates and sanitizes input
5. Check cache for recent identical error
6. If not cached, call Bedrock with structured prompt
7. Parse and validate Bedrock JSON response
8. Cache response and return to frontend
9. UI displays friendly message in Debugger tab
10. Auto-switch to Debugger tab with visual indicator
```

---

## Phase 3 Success Metrics

1. **Error Understanding**: Students get clear Hinglish explanations for Python errors
2. **Response Time**: Debug explanations appear within 4 seconds
3. **Cache Efficiency**: 80%+ cache hit rate for repeated errors
4. **User Experience**: Automatic tab switching and visual error indicators
5. **Reliability**: Graceful degradation when Bedrock is unavailable
6. **Security**: No AWS credentials or sensitive data exposed

---

**Next Phase**: Phase 4 - Voice-to-Code (Web Audio API + AWS Transcribe integration)