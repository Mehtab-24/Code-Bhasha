# CodeBhasha — Phase 3: Desi Debugger (AWS Bedrock Integration)
**Tasks List**  
**Phase:** 3 — Hinglish Error Explanations via AWS Bedrock  
**Last Updated:** 2026-02-26

---

## Task Overview

This phase implements the "Desi Debugger" feature that transforms raw Python errors into friendly, conversational Hinglish explanations using AWS Bedrock (Claude 3.5 Sonnet). The implementation follows the design specifications in Section 8.2 of design.md and Data Flow Diagram 3.2.

---

## Tasks

### 1. AWS SDK Setup & Configuration
- [ ] 1.1 Install AWS SDK packages (`@aws-sdk/client-bedrock-runtime`)
- [ ] 1.2 Configure AWS credentials (environment variables or IAM role)
- [ ] 1.3 Set up Bedrock client with proper region configuration
- [ ] 1.4 Test Bedrock connectivity and model access

### 2. Next.js API Route Implementation
- [ ] 2.1 Create `src/app/api/debug/route.ts` with POST handler
- [ ] 2.2 Implement request validation (code, error payload)
- [ ] 2.3 Add input sanitization (max code length, error type validation)
- [ ] 2.4 Implement rate limiting (max 20 debug calls/min per session)
- [ ] 2.5 Add error handling for API failures

### 3. Bedrock Integration
- [ ] 3.1 Implement BedrockRuntimeClient initialization
- [ ] 3.2 Create the exact "Desi Debugger" system prompt from design.md Section 8.2
- [ ] 3.3 Implement InvokeModelCommand with Claude 3.5 Sonnet
- [ ] 3.4 Configure model parameters (temperature: 0.1, max_tokens: 512)
- [ ] 3.5 Parse and validate JSON response from Bedrock

### 4. Prompt Engineering Implementation
- [ ] 4.1 Implement the exact system prompt from design.md Section 8.2
- [ ] 4.2 Format user message with error details (type, message, line, code)
- [ ] 4.3 Add prompt validation to ensure all required fields are included
- [ ] 4.4 Implement fallback for malformed Bedrock responses

### 5. Response Processing
- [ ] 5.1 Parse Bedrock JSON response (friendly_message, fix_suggestion, corrected_line)
- [ ] 5.2 Validate response structure matches expected format
- [ ] 5.3 Implement error handling for JSON parsing failures
- [ ] 5.4 Add logging for debugging and monitoring
- [ ] 5.5 Return structured response to frontend

### 6. Frontend Integration - Store Updates
- [ ] 6.1 Add `debugResult` state to Zustand execution store
- [ ] 6.2 Create `fetchDebugExplanation` action in store
- [ ] 6.3 Implement automatic debug API call on execution errors
- [ ] 6.4 Add loading state for debug requests
- [ ] 6.5 Handle debug API errors gracefully

### 7. Frontend Integration - UI Updates
- [ ] 7.1 Update OutputPanel Debugger tab to display Bedrock response
- [ ] 7.2 Display `friendly_message` in conversational style
- [ ] 7.3 Display `fix_suggestion` with actionable instructions
- [ ] 7.4 Show `corrected_line` if available
- [ ] 7.5 Add loading spinner while fetching debug explanation
- [ ] 7.6 Implement error state for failed debug requests

### 8. Error Caching & Optimization
- [ ] 8.1 Implement error cache (same error_type + line_number within 30s)
- [ ] 8.2 Add cache key generation logic
- [ ] 8.3 Implement cache expiration mechanism
- [ ] 8.4 Add cache hit/miss logging
- [ ] 8.5 Optimize for repeated errors to avoid redundant API calls

### 9. Security & Validation
- [ ] 9.1 Implement input sanitization (remove exec(), eval(), __import__())
- [ ] 9.2 Add max payload size validation (code: 2000 chars)
- [ ] 9.3 Validate error types against allowed list
- [ ] 9.4 Implement CORS headers for API route
- [ ] 9.5 Add request logging for security monitoring

### 10. Testing & Validation
- [ ] 10.1 Test with SyntaxError examples
- [ ] 10.2 Test with IndentationError examples
- [ ] 10.3 Test with NameError examples
- [ ] 10.4 Test with TypeError examples
- [ ] 10.5 Test with RuntimeError examples
- [ ] 10.6 Test rate limiting functionality
- [ ] 10.7 Test error caching mechanism
- [ ] 10.8 Validate Hinglish response quality

### 11. UI Polish & UX
- [ ] 11.1 Add smooth animations for debug result display
- [ ] 11.2 Implement auto-switch to Debugger tab on error
- [ ] 11.3 Add "Copy Error" button for sharing
- [ ] 11.4 Implement "Apply Fix" button (future enhancement)
- [ ] 11.5 Add visual indicators for debug loading state

### 12. Documentation & Monitoring
- [ ] 12.1 Add code comments and documentation
- [ ] 12.2 Document API endpoint usage
- [ ] 12.3 Add error logging for CloudWatch (future)
- [ ] 12.4 Document Bedrock model configuration
- [ ] 12.5 Update README with Desi Debugger features

---

## Acceptance Criteria

### Functional Requirements (P0)
- ✅ **F2.1**: System intercepts all Pyodide runtime exceptions
- ✅ **F2.2**: System sends error payload to debug API endpoint
- ✅ **F2.3**: Bedrock returns friendly Hindi/Hinglish explanation
- ✅ **F2.4**: Explanation displayed in visually distinct Debugger panel
- ✅ **F2.9**: Handles SyntaxError, IndentationError, NameError, TypeError, IndexError, ZeroDivisionError

### Performance Requirements
- ✅ **NFR-P4**: Desi Debugger response time < 4s

### Security Requirements
- ✅ **NFR-S1**: No AWS credentials exposed in frontend
- ✅ **NFR-S4**: All API payloads validated and sanitized
- ✅ **NFR-S10**: System prompts not returned to client

### UX Requirements
- ✅ **F6.1**: All messages in Hinglish by default
- ✅ **F6.6**: API errors surface as friendly Hinglish toasts

---

## Technical Implementation Notes

### API Route Structure
```typescript
// src/app/api/debug/route.ts
export async function POST(request: Request) {
  // 1. Parse and validate request
  // 2. Sanitize code input
  // 3. Check error cache
  // 4. Build Bedrock prompt
  // 5. Call Bedrock API
  // 6. Parse and validate response
  // 7. Return structured JSON
}
```

### Bedrock Request Format
```typescript
{
  modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
  contentType: "application/json",
  accept: "application/json",
  body: JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 512,
    temperature: 0.1,
    messages: [
      {
        role: "user",
        content: `Error Type: ${error.type}\nError Message: ${error.message}\n...`
      }
    ],
    system: "You are the 'Desi Debugger'..."
  })
}
```

### System Prompt (from design.md Section 8.2)
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

### Error Cache Implementation
```typescript
interface ErrorCacheEntry {
  key: string; // `${error_type}_${line_number}`
  response: DebugResponse;
  timestamp: number;
}

const errorCache = new Map<string, ErrorCacheEntry>();
const CACHE_TTL = 30000; // 30 seconds
```

---

## Dependencies

### Required Packages
- `@aws-sdk/client-bedrock-runtime` - AWS Bedrock SDK
- Environment variables:
  - `AWS_REGION` (e.g., "us-east-1")
  - `AWS_ACCESS_KEY_ID` (or use IAM role)
  - `AWS_SECRET_ACCESS_KEY` (or use IAM role)
  - `BEDROCK_MODEL_ID` (optional, defaults to Claude 3.5 Sonnet)

### AWS Configuration
- Bedrock model access enabled for Claude 3.5 Sonnet
- IAM permissions: `bedrock:InvokeModel`
- Region: us-east-1 (or configured region)

---

## Phase 3 Success Metrics

1. **Error Explanation**: Friendly Hinglish explanations for all error types
2. **Response Time**: < 4s for debug API calls
3. **Accuracy**: Correct error identification and fix suggestions
4. **UX**: Smooth integration with existing error flow
5. **Reliability**: Graceful handling of API failures
6. **Caching**: Reduced redundant API calls for repeated errors

---

## Example Error Flow

```
Python Error: SyntaxError on line 5
  ↓
Pyodide captures exception
  ↓
Frontend calls /api/debug
  ↓
API validates and sanitizes input
  ↓
Bedrock generates Hinglish explanation
  ↓
Response: {
  "friendly_message": "Bhai, line 5 pe 'print' ke baad bracket band karna bhool gaye — ')' lagao",
  "fix_suggestion": "Line 5 pe jaake 'print' statement ke end mein ')' add karo",
  "corrected_line": "print('Hello World')"
}
  ↓
UI displays in Debugger tab
```

---

**Next Phase**: Phase 4 - Voice-to-Code (Bol Ke Code) with AWS Transcribe integration