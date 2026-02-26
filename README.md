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

Phase 2 is now complete! The foundation now includes full Python execution capabilities. Ready for Phase 3:

1. **Desi Debugger**: AWS Lambda + Bedrock for Hinglish error explanations
2. **Voice-to-Code**: Web Audio API + AWS Transcribe integration
3. **Code Generation**: AWS Bedrock for Hinglish → Python conversion
4. **Auto-complete**: Intent-based suggestions via Bedrock
5. **Authentication**: JWT session management

## 📄 Architecture

Built following the design specifications in `design.md` and requirements in `requirements.md`. The app now includes:

- **Phase 1**: Premium dark mode UI with glassmorphism design ✅
- **Phase 2**: Client-side Python execution with Pyodide ✅
- **Phase 3**: Desi Debugger (Next)
- **Phase 4**: Voice-to-Code (Planned)
- **Phase 5**: Code Generation (Planned)

---

**Status**: ✅ Phase 2 Complete - Python execution ready! Next: Desi Debugger