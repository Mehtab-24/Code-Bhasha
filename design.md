# CodeBhasha - Design Document

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User's Browser                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           React Frontend Application                  │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │  │
│  │  │  Voice   │  │   Code   │  │     Pyodide      │   │  │
│  │  │  Input   │  │  Editor  │  │  (Python Runner) │   │  │
│  │  └──────────┘  └──────────┘  └──────────────────┘   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS/REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    AWS Cloud Services                       │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Amazon API Gateway                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                │
│           ┌────────────────┼────────────────┐              │
│           ▼                ▼                ▼              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │   Lambda    │  │   Lambda    │  │   Lambda    │       │
│  │ (Transcribe)│  │  (Generate) │  │  (Debug)    │       │
│  └─────────────┘  └─────────────┘  └─────────────┘       │
│         │                 │                 │              │
│         ▼                 ▼                 ▼              │
│  ┌─────────────┐  ┌──────────────────────────────┐       │
│  │   Amazon    │  │      Amazon Bedrock          │       │
│  │ Transcribe  │  │   (Claude 3.5 Sonnet)        │       │
│  └─────────────┘  └──────────────────────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Component Design

### 1. Frontend Architecture (React)

#### 1.1 Component Structure
```
src/
├── components/
│   ├── VoiceInput/
│   │   ├── VoiceRecorder.jsx
│   │   ├── TranscriptionDisplay.jsx
│   │   └── AudioVisualizer.jsx
│   ├── CodeEditor/
│   │   ├── Editor.jsx
│   │   ├── OutputConsole.jsx
│   │   └── ControlPanel.jsx
│   ├── NaturalLanguageInput/
│   │   ├── HinglishInput.jsx
│   │   └── ExampleCommands.jsx
│   ├── Debugger/
│   │   ├── ErrorDisplay.jsx
│   │   └── HinglishExplanation.jsx
│   └── Layout/
│       ├── Header.jsx
│       ├── Sidebar.jsx
│       └── MainLayout.jsx
├── services/
│   ├── apiService.js
│   ├── pyodideService.js
│   └── audioService.js
├── hooks/
│   ├── useVoiceRecording.js
│   ├── useCodeExecution.js
│   └── useDebugger.js
├── utils/
│   ├── errorParser.js
│   └── codeFormatter.js
└── App.jsx
```

#### 1.2 Key Frontend Technologies
- **React 18+**: Component-based UI
- **Monaco Editor**: Code editor with syntax highlighting
- **Pyodide**: Client-side Python execution
- **Web Audio API**: Voice recording
- **Axios**: HTTP client for API calls
- **Tailwind CSS**: Styling framework

### 2. Backend Architecture (AWS Serverless)

#### 2.1 API Gateway Configuration
```
Endpoints:
- POST /api/transcribe
  - Accepts: Audio file (base64 or multipart)
  - Returns: Transcribed text

- POST /api/generate-code
  - Accepts: { hinglishText: string }
  - Returns: { pythonCode: string, explanation: string }

- POST /api/debug
  - Accepts: { code: string, error: string, stackTrace: string }
  - Returns: { hinglishExplanation: string, suggestions: array }
```

#### 2.2 Lambda Functions

**Lambda 1: Transcribe Handler**
```javascript
// Purpose: Convert audio to text using Amazon Transcribe
// Runtime: Node.js 18.x
// Memory: 512 MB
// Timeout: 30 seconds

Input: Audio file (WAV/MP3)
Process:
  1. Validate audio format
  2. Upload to S3 (temporary)
  3. Start Transcribe job with Hindi/English language model
  4. Poll for completion
  5. Extract transcribed text
  6. Clean up S3 object
Output: Transcribed Hinglish text
```

**Lambda 2: Code Generation Handler**
```javascript
// Purpose: Generate Python code from Hinglish input
// Runtime: Node.js 18.x
// Memory: 1024 MB
// Timeout: 30 seconds

Input: Hinglish text command
Process:
  1. Validate input
  2. Construct prompt for Bedrock:
     - System: "You are a coding assistant that converts Hinglish 
                commands to Python code..."
     - User: Hinglish command
  3. Call Amazon Bedrock (Claude 3.5 Sonnet)
  4. Parse and validate generated code
  5. Add code comments in Hinglish
Output: Python code + brief explanation
```

**Lambda 3: Debug Handler**
```javascript
// Purpose: Explain errors in Hinglish
// Runtime: Node.js 18.x
// Memory: 512 MB
// Timeout: 20 seconds

Input: Code, error message, stack trace
Process:
  1. Parse error type and context
  2. Construct prompt for Bedrock:
     - System: "Explain this Python error in simple Hinglish..."
     - User: Error details + code snippet
  3. Call Amazon Bedrock
  4. Format explanation with examples
Output: Hinglish error explanation + fix suggestions
```

#### 2.3 Amazon Bedrock Integration

**Model Configuration**
```json
{
  "modelId": "anthropic.claude-3-5-sonnet-20241022-v2:0",
  "inferenceConfig": {
    "maxTokens": 2048,
    "temperature": 0.3,
    "topP": 0.9
  }
}
```

**Prompt Templates**

*Code Generation Prompt:*
```
System: You are CodeBhasha, an AI assistant that helps Indian students 
learn programming. Convert Hinglish (Hindi-English mix) commands into 
clean Python code. Be precise and educational.

User: {hinglishCommand}

Instructions:
- Generate syntactically correct Python code
- Add brief comments in Hinglish
- Keep code simple and beginner-friendly
- Use descriptive variable names
```

*Debug Prompt:*
```
System: You are a friendly coding tutor. Explain Python errors in 
simple Hinglish that Indian students can understand. Use relatable 
examples and avoid heavy jargon.

User: 
Code: {code}
Error: {errorMessage}
Stack Trace: {stackTrace}

Instructions:
- Explain what went wrong in simple Hinglish
- Provide the reason in a friendly tone
- Suggest how to fix it
- Give a small example if helpful
```

### 3. Data Flow

#### 3.1 Voice-to-Code Flow
```
1. User clicks microphone button
   └─> Frontend: Start recording (Web Audio API)

2. User speaks: "List ko sort karo"
   └─> Frontend: Capture audio buffer

3. User stops recording
   └─> Frontend: Convert to WAV/base64
   └─> API: POST /api/transcribe
   └─> Lambda: Upload to S3
   └─> Amazon Transcribe: Process audio
   └─> Lambda: Retrieve text
   └─> Frontend: Display "List ko sort karo"

4. User confirms transcription
   └─> API: POST /api/generate-code
   └─> Lambda: Call Bedrock with prompt
   └─> Bedrock: Generate Python code
   └─> Lambda: Return code
   └─> Frontend: Display in editor

5. User clicks "Run"
   └─> Frontend: Execute in Pyodide
   └─> Frontend: Show output
```

#### 3.2 Text-to-Code Flow
```
1. User types: "10 tak ke numbers print karo"
   └─> Frontend: Capture input

2. User clicks "Generate Code"
   └─> API: POST /api/generate-code
   └─> Lambda: Call Bedrock
   └─> Bedrock: Return Python code
   └─> Frontend: Display in editor

3. User clicks "Run"
   └─> Pyodide: Execute code
   └─> Frontend: Show output
```

#### 3.3 Debug Flow
```
1. Code execution fails
   └─> Pyodide: Catch exception
   └─> Frontend: Capture error details

2. Frontend: Trigger debug analysis
   └─> API: POST /api/debug
   └─> Lambda: Call Bedrock with error context
   └─> Bedrock: Generate Hinglish explanation
   └─> Lambda: Return explanation
   └─> Frontend: Display in debug panel

3. User reads explanation
   └─> Frontend: Show suggestions
   └─> User: Fix code and retry
```

## Technical Specifications

### Frontend State Management
```javascript
// Global State (Context API or Zustand)
{
  hinglishInput: string,
  generatedCode: string,
  output: string,
  error: object | null,
  debugExplanation: string,
  isRecording: boolean,
  isGenerating: boolean,
  isExecuting: boolean,
  history: array
}
```

### Pyodide Integration
```javascript
// Initialize Pyodide
const pyodide = await loadPyodide({
  indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/"
});

// Execute code
try {
  const result = await pyodide.runPythonAsync(code);
  setOutput(result);
} catch (error) {
  setError(error);
  triggerDebugger(code, error);
}
```

### AWS Service Configuration

**IAM Roles:**
- Lambda Execution Role: Access to Bedrock, Transcribe, S3, CloudWatch
- API Gateway Role: Invoke Lambda functions

**S3 Bucket:**
- Temporary audio storage
- Lifecycle policy: Delete after 1 hour

**CloudWatch:**
- Lambda logs
- API Gateway access logs
- Custom metrics for monitoring

## Security Considerations

### Frontend Security
- Content Security Policy (CSP) headers
- Input sanitization before API calls
- No eval() or dangerous code execution
- Pyodide sandbox isolation

### Backend Security
- API Gateway authentication (API keys or Cognito)
- Lambda environment variables for secrets
- VPC configuration for Lambda (if needed)
- Rate limiting per IP/user
- Input validation and size limits

### Data Privacy
- No persistent storage of user code
- Audio files deleted after transcription
- No PII collection
- GDPR/compliance considerations

## Deployment Strategy

### Frontend Deployment
- Host on AWS S3 + CloudFront
- CI/CD with GitHub Actions
- Environment-based configurations

### Backend Deployment
- Infrastructure as Code (AWS CDK or Terraform)
- Separate dev/staging/prod environments
- Automated testing before deployment
- Blue-green deployment for zero downtime

## Monitoring and Observability

### Metrics to Track
- API response times
- Bedrock token usage
- Error rates by endpoint
- User engagement metrics
- Code execution success rate

### Logging Strategy
- Structured JSON logs
- Request/response logging
- Error stack traces
- User action tracking (anonymized)

### Alerts
- High error rates
- Slow API responses
- AWS service failures
- Cost threshold breaches

## Future Enhancements

1. **Multi-language Support**: Add support for Tamil, Telugu, Bengali
2. **Code Snippets Library**: Pre-built examples in Hinglish
3. **Collaborative Coding**: Real-time code sharing
4. **Progress Tracking**: User learning analytics
5. **Mobile App**: React Native version
6. **Offline Mode**: Cache common translations
7. **Advanced Debugging**: Step-through debugger
8. **Code Optimization**: Suggest improvements to generated code
