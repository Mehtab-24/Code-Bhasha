# CodeBhasha - Premium Dark Mode Developer Dashboard

**Tagline:** *Syntax is a barrier; Logic is universal.*

A mobile-first, web-based coding environment that removes the English-syntax barrier for Indian students. Built with Next.js 14, TypeScript, Tailwind CSS, and Framer Motion.

## 🚀 Features Implemented

### ✅ Premium Dark Mode UI
- **Glassmorphism Design**: Semi-transparent panels with backdrop blur effects
- **Neon Accent Colors**: Cyan, violet, pink, and green glow effects
- **Mobile-First Layout**: Optimized for 360px width, scales elegantly to desktop
- **Smooth Animations**: Framer Motion micro-interactions throughout

### ✅ App Shell Architecture
- **Header**: Logo, theme toggle, help button with glassmorphism styling
- **Mode Tabs**: Voice ("🎤 Bolo") and Text ("✏ Likho") input modes
- **Voice Panel**: Microphone button with pulsing glow animation
- **Code Editor**: Monaco Editor with Python syntax highlighting
- **Action Bar**: Run and Clear buttons with hover animations
- **Output Panel**: Tabbed interface for Output and Debugger

### ✅ Client-Side Python Execution (Phase 2)
- **Pyodide Integration**: WebAssembly Python runtime in Web Worker
- **Real-time Output**: Live stdout/stderr capture and display
- **Error Handling**: Comprehensive Python error capture with line numbers
- **Timeout Protection**: 10-second hard timeout prevents infinite loops
- **Performance Monitoring**: Execution time tracking and display
- **Worker Management**: Automatic worker respawning and cleanup

### ✅ Desi Debugger - AWS Bedrock Integration (Phase 3)
- **Hinglish Error Explanations**: Friendly, conversational error messages in Hindi/English mix
- **AWS Bedrock**: Claude 3.5 Sonnet for intelligent error analysis
- **Automatic Debugging**: Triggers on every Python error
- **Fix Suggestions**: Actionable instructions on how to fix errors
- **Corrected Code**: Shows the fixed version of problematic lines
- **Smart UI**: Auto-switches to Debugger tab when errors occur
- **Loading States**: Smooth animations while fetching explanations

### ✅ Interactive Components
- **Animated Microphone**: Pulsing glow effect when recording
- **Glassmorphism Panels**: Backdrop blur with subtle borders
- **Smooth Transitions**: Slide-in animations for panels
- **Mobile Touch Optimized**: Touch-friendly interactions
- **Execution States**: Loading indicators and status feedback

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom dark theme
- **Animations**: Framer Motion
- **Editor**: Monaco Editor
- **Python Runtime**: Pyodide (WebAssembly)
- **State**: Zustand for execution state management
- **Icons**: Lucide React
- **AI/ML**: AWS Bedrock (Claude 3.5 Sonnet)
- **Validation**: Zod for API input validation

## 🎨 Design System

### Color Palette
- **Dark Base**: `#0a0a0a` to `#a3a3a3`
- **Neon Accents**: 
  - Cyan: `#00ffff`
  - Violet: `#8b5cf6`
  - Pink: `#ec4899`
  - Green: `#10b981`
- **Glassmorphism**: `rgba(26, 26, 26, 0.8)` with blur effects

### Animations
- **Pulse Glow**: 2s infinite pulse for microphone
- **Slide Transitions**: 0.3s ease-out for panels
- **Scale Effects**: Hover and tap animations on buttons

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ installed
- AWS account with Bedrock access (for Phase 3 Desi Debugger)
- AWS credentials with `bedrock:InvokeModel` permission

### Environment Setup

1. Copy the example environment file:
```bash
cp .env.local.example .env.local
```

2. Fill in your AWS credentials in `.env.local`:
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
```

### Installation & Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📱 Mobile-First Design

The interface is optimized for mobile devices starting at 360px width:

- **Touch-friendly buttons**: Large tap targets
- **Responsive layout**: Adapts from mobile to desktop
- **Gesture support**: Pinch-to-zoom in editor
- **Optimized scrolling**: Custom scrollbars and smooth scrolling

## 🎯 Next Steps

Phase 3 is now complete! The Desi Debugger provides friendly Hinglish error explanations. Ready for Phase 4:

1. ~~**Desi Debugger**: AWS Lambda + Bedrock for Hinglish error explanations~~ ✅
2. **Voice-to-Code**: Web Audio API + AWS Transcribe integration
3. **Code Generation**: AWS Bedrock for Hinglish → Python conversion
4. **Auto-complete**: Intent-based suggestions via Bedrock
5. **Authentication**: JWT session management

## 📄 Architecture

Built following the design specifications in `design.md` and requirements in `requirements.md`. The app now includes:

- **Phase 1**: Premium dark mode UI with glassmorphism design ✅
- **Phase 2**: Client-side Python execution with Pyodide ✅
- **Phase 3**: Desi Debugger with AWS Bedrock ✅
- **Phase 4**: Voice-to-Code (Next)
- **Phase 5**: Code Generation (Planned)

## 🔧 API Routes

### POST /api/debug
Analyzes Python errors and returns friendly Hinglish explanations.

**Request:**
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

**Response:**
```json
{
  "friendly_message": "Bhai, line 1 pe 'print' ke baad bracket band karna bhool gaye — ')' lagao",
  "fix_suggestion": "Line 1 pe jaake 'print' statement ke end mein ')' add karo",
  "corrected_line": "print('hello')"
}
```

---

**Status**: ✅ Phase 3 Complete - Desi Debugger ready! Next: Voice-to-Code