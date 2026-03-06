'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Sparkles, AlertCircle } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useExecutionStore } from '@/store/useExecutionStore';

// ─── Example prompts for quick testing ────────────────────────────────────────
const EXAMPLE_PROMPTS = [
  "List ko reverse karne ka function banao",
  "Factorial of number",
  "1 se 10 tak odd numbers ka code likho",
  "Fibonacci series ka code likho"
];

// ─── ExampleChip: clickable prompt suggestion ─────────────────────────────────
function ExampleChip({ 
  text, 
  onClick 
}: { 
  text: string; 
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
      style={{
        background: 'rgba(167,139,250,0.08)',
        border: '1px solid rgba(167,139,250,0.2)',
        color: 'rgba(167,139,250,0.8)',
      }}
      whileHover={{
        scale: 1.03,
        background: 'rgba(167,139,250,0.14)',
        borderColor: 'rgba(167,139,250,0.4)',
        color: '#a78bfa',
      }}
      whileTap={{ scale: 0.97 }}
    >
      {text}
    </motion.button>
  );
}

// ─── Ripple Ring: single expanding ring ───────────────────────────────────────
function RippleRing({
  delay,
  color,
  duration,
}: {
  delay: number;
  color: string;
  duration: number;
}) {
  return (
    <motion.span
      className="absolute inset-0 rounded-full"
      style={{ border: `1px solid ${color}` }}
      initial={{ scale: 1, opacity: 0.7 }}
      animate={{ scale: 2.6, opacity: 0 }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeOut',
      }}
    />
  );
}

// ─── AudioBar: single bar of the waveform visualizer ─────────────────────────
function AudioBar({ index, isActive }: { index: number; isActive: boolean }) {
  const heights = [14, 22, 32, 22, 38, 18, 28, 36, 20, 30, 16, 26];
  const base = heights[index % heights.length];

  return (
    <motion.div
      className="rounded-full"
      style={{
        width: 3,
        background: isActive
          ? 'linear-gradient(to top, rgba(34,211,238,0.3), #22d3ee)'
          : 'rgba(255,255,255,0.1)',
      }}
      animate={
        isActive
          ? {
              height: [base * 0.4, base, base * 0.6, base * 1.1, base * 0.5],
              opacity: [0.6, 1, 0.7, 1, 0.6],
            }
          : { height: 4, opacity: 0.18 }
      }
      transition={
        isActive
          ? {
              duration: 0.8 + (index % 4) * 0.15,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: index * 0.06,
            }
          : { duration: 0.4 }
      }
    />
  );
}

// ─── MicButton: the centrepiece AI core ──────────────────────────────────────
function MicButton({
  isRecording,
  onClick,
}: {
  isRecording: boolean;
  onClick: () => void;
}) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>

      {/* ── Outermost ambient glow halo ── */}
      <motion.div
        className="absolute rounded-full"
        style={{
          inset: -20,
          background: isRecording
            ? 'radial-gradient(circle, rgba(34,211,238,0.12) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
        }}
        animate={isRecording ? { scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] } : {}}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ── Ripple rings (recording only) ── */}
      <AnimatePresence>
        {isRecording && (
          <>
            <RippleRing delay={0}    color="rgba(34,211,238,0.5)"  duration={2.2} />
            <RippleRing delay={0.7}  color="rgba(34,211,238,0.3)"  duration={2.2} />
            <RippleRing delay={1.4}  color="rgba(167,139,250,0.25)" duration={2.2} />
          </>
        )}
      </AnimatePresence>

      {/* ── Outer ring track ── */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          border: isRecording
            ? '1px solid rgba(34,211,238,0.4)'
            : '1px solid rgba(255,255,255,0.1)',
          boxShadow: isRecording
            ? '0 0 24px rgba(34,211,238,0.18), inset 0 0 24px rgba(34,211,238,0.05)'
            : '0 0 12px rgba(0,0,0,0.5), inset 0 0 0px transparent',
        }}
        animate={isRecording ? { rotate: 360 } : { rotate: 0 }}
        transition={isRecording ? { duration: 8, repeat: Infinity, ease: 'linear' } : {}}
      >
        {/* spinning tick mark on the ring */}
        {isRecording && (
          <div
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              background: '#22d3ee',
              top: -3,
              left: '50%',
              transform: 'translateX(-50%)',
              boxShadow: '0 0 6px #22d3ee',
            }}
          />
        )}
      </motion.div>

      {/* ── Button face ── */}
      <motion.button
        onClick={onClick}
        className="relative flex items-center justify-center rounded-full cursor-pointer"
        style={{
          width: 88,
          height: 88,
          background: isRecording
            ? 'radial-gradient(circle at 35% 35%, rgba(34,211,238,0.22), rgba(34,211,238,0.06))'
            : 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.14), rgba(255,255,255,0.04))',
          border: isRecording
            ? '1px solid rgba(34,211,238,0.5)'
            : '1px solid rgba(255,255,255,0.16)',
          backdropFilter: 'blur(12px)',
          boxShadow: isRecording
            ? '0 0 32px rgba(34,211,238,0.25), 0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(34,211,238,0.2)'
            : '0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)',
        }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        transition={{ type: 'spring', stiffness: 350, damping: 22 }}
      >
        {/* Inner specular highlight */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 40,
            height: 20,
            top: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'radial-gradient(ellipse, rgba(255,255,255,0.15), transparent)',
            filter: 'blur(4px)',
          }}
        />

        <motion.div
          animate={isRecording ? { scale: [1, 1.12, 1] } : { scale: 1 }}
          transition={{ duration: 1.5, repeat: isRecording ? Infinity : 0 }}
        >
          {isRecording ? (
            <MicOff
              className="w-8 h-8"
              style={{ color: '#22d3ee', filter: 'drop-shadow(0 0 6px rgba(34,211,238,0.8))' }}
            />
          ) : (
            <Mic
              className="w-8 h-8"
              style={{ color: 'rgba(255,255,255,0.75)' }}
            />
          )}
        </motion.div>
      </motion.button>
    </div>
  );
}

// ─── Main VoicePanel ──────────────────────────────────────────────────────────
export function VoicePanel({ onCodeGenerated }: { onCodeGenerated?: (code: string) => void }) {
  const [error, setError] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');

  // Use ref for SpeechRecognition instance
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const {
    isRecording,
    transcript,
    isGeneratingCode,
    voiceResult,
    setIsRecording,
    setTranscript,
    generateCodeFromVoice,
    resetVoiceState,
  } = useExecutionStore();

  // FIX 3: Reset stale Zustand voice state on every mount.
  useEffect(() => {
    resetVoiceState();

    // Initialize Speech Recognition
    if (typeof window !== 'undefined') {
      const SpeechRecognitionAPI = window.SpeechRecognition || (window as Window & { webkitSpeechRecognition: new () => SpeechRecognition }).webkitSpeechRecognition;
      
      if (SpeechRecognitionAPI) {
        const recognition = new SpeechRecognitionAPI();
        
        // Configure recognition for Hinglish
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'hi-IN'; // Hindi-India for Hinglish support
        recognition.maxAlternatives = 1;

        // Handle real-time results
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interim = '';
          let final = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcriptPart = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
              final += transcriptPart + ' ';
            } else {
              interim += transcriptPart;
            }
          }

          // Update interim transcript for live display
          if (interim) {
            setInterimTranscript(interim);
          }

          // Update final transcript in store
          if (final) {
            const currentTranscript = transcript || '';
            const newTranscript = (currentTranscript + final).trim();
            setTranscript(newTranscript);
            setInterimTranscript(''); // Clear interim when we have final
          }
        };

        // Handle recognition end
        recognition.onend = async () => {
          console.log('[VoicePanel] Speech recognition ended');
          setIsRecording(false);
          setInterimTranscript('');

          // Get the final transcript
          const finalTranscript = transcript.trim();

          // If we have a transcript, generate code
          if (finalTranscript) {
            try {
              console.log('[VoicePanel] Generating code from transcript:', finalTranscript);
              const result = await generateCodeFromVoice(finalTranscript);
              
              if (result && result.code) {
                console.log('[VoicePanel] Code generated, injecting into editor');
                
                // FIX: Use getState() to get fresh state directly
                // Add fallback for different property names
                const resultWithFallback = result as { code?: string; generatedCode?: string; pythonCode?: string };
                const finalCode = result.code || resultWithFallback.generatedCode || resultWithFallback.pythonCode || '';
                
                const store = useExecutionStore.getState();
                if (store.activeFileId && finalCode) {
                  console.log('[VoicePanel] Injecting code into file:', store.activeFileId);
                  store.updateFileContent(store.activeFileId, finalCode);
                } else {
                  console.warn('[VoicePanel] Cannot inject code:', { 
                    hasActiveFileId: !!store.activeFileId, 
                    hasCode: !!finalCode 
                  });
                }
                
                // Also call callback if provided (for backward compatibility)
                if (onCodeGenerated && finalCode) {
                  onCodeGenerated(finalCode);
                }
              }
            } catch (err) {
              console.error('[VoicePanel] Failed to generate code:', err);
              setError('Code generation mein problem hui. Dobara try karo.');
            }
          }
        };

        // Handle errors
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('[VoicePanel] Speech recognition error:', event.error);
          setIsRecording(false);
          setInterimTranscript('');

          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setError('Mic ki permission chahiye. Browser settings mein jaake allow karo.');
          } else if (event.error === 'no-speech') {
            setError('Kuch sunai nahi diya. Dobara try karo aur zor se bolo.');
          } else if (event.error === 'audio-capture') {
            setError('Microphone nahi mila. Check karo ki mic connected hai.');
          } else if (event.error === 'network') {
            setError('Internet connection check karo.');
          } else {
            setError('Speech recognition mein problem hui. Dobara try karo.');
          }
        };

        recognitionRef.current = recognition;
      } else {
        console.warn('[VoicePanel] Speech Recognition API not supported');
        setError('Tumhara browser speech recognition support nahi karta. Chrome ya Edge use karo.');
      }
    }

    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore errors on cleanup
        }
      }
      setIsRecording(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps: run once on mount, cleanup once on unmount

  // FIX 5: Subscribe to the Permissions API so the error banner automatically
  // clears and the button unlocks the moment the user grants mic permission
  // in browser settings — without requiring a full page refresh.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions) return;

    let permissionStatus: PermissionStatus | null = null;

    navigator.permissions
      .query({ name: 'microphone' as PermissionName })
      .then((status) => {
        permissionStatus = status;
        // If already granted, clear any stale error from a previous denial
        if (status.state === 'granted') {
          setError('');
        }
        // Re-runs whenever the user changes the permission in browser settings
        status.onchange = () => {
          if (status.state === 'granted') {
            setError('');
          }
        };
      })
      .catch(() => {
        // Permissions API not supported in this browser — silently ignore
      });

    return () => {
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    setError('');
    setInterimTranscript('');

    if (!recognitionRef.current) {
      setError('Speech recognition available nahi hai. Browser update karo.');
      return;
    }

    try {
      // Clear previous transcript before starting new recording
      setTranscript('');
      
      console.log('[VoicePanel] Starting speech recognition...');
      recognitionRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('[VoicePanel] Failed to start recognition:', err);
      setIsRecording(false);
      
      if (err instanceof Error && err.message.includes('already started')) {
        // Recognition is already running, just update state
        setIsRecording(true);
      } else {
        setError('Speech recognition start nahi ho paya. Dobara try karo.');
      }
    }
  }, [setIsRecording, setTranscript]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try {
        console.log('[VoicePanel] Stopping speech recognition...');
        recognitionRef.current.stop();
      } catch (err) {
        console.error('[VoicePanel] Error stopping recognition:', err);
        setIsRecording(false);
      }
    } else {
      setIsRecording(false);
    }
  }, [setIsRecording]);

  const handleMicClick = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleGenerateCode = async () => {
    if (!transcript.trim()) return;
    
    try {
      setError('');
      const result = await generateCodeFromVoice(transcript);
      
      if (result && 'code' in result && result.code) {
        // FIX: Use getState() to get fresh state directly
        // Add fallback for different property names
        const resultWithFallback = result as { code?: string; generatedCode?: string; pythonCode?: string };
        const finalCode = result.code || resultWithFallback.generatedCode || resultWithFallback.pythonCode || '';
        
        const store = useExecutionStore.getState();
        if (store.activeFileId && finalCode) {
          console.log('[VoicePanel] Injecting code into file:', store.activeFileId);
          store.updateFileContent(store.activeFileId, finalCode);
        } else {
          console.warn('[VoicePanel] Cannot inject code:', { 
            hasActiveFileId: !!store.activeFileId, 
            hasCode: !!finalCode 
          });
        }
        
        // Also call callback if provided (for backward compatibility)
        if (onCodeGenerated && finalCode) {
          onCodeGenerated(finalCode);
        }
      }
    } catch (err) {
      console.error('[VoicePanel] Code generation error:', err);
      setError('Code generation mein problem hui. Dobara try karo.');
    }
  };

  return (
    <motion.div
      className="rounded-2xl p-6 space-y-6"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid ${isRecording ? 'rgba(34,211,238,0.2)' : 'rgba(255,255,255,0.07)'}`,
        backdropFilter: 'blur(20px)',
        boxShadow: isRecording
          ? '0 8px 40px rgba(0,0,0,0.5), 0 0 60px rgba(34,211,238,0.06)'
          : '0 8px 40px rgba(0,0,0,0.4)',
        transition: 'border-color 0.5s, box-shadow 0.5s',
      }}
      initial={{ opacity: 0, y: -8, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* ── Top Section: mic + waveform ─────────────────────── */}
      <div className="flex flex-col items-center gap-5">

        {/* Section label */}
        <div className="flex items-center gap-2">
          <motion.div
            className="w-1 h-1 rounded-full"
            style={{ background: isRecording ? '#22d3ee' : 'rgba(255,255,255,0.2)' }}
            animate={isRecording ? { opacity: [1, 0.2, 1] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span
            className="text-xs font-semibold tracking-[0.2em] uppercase"
            style={{ color: isRecording ? 'rgba(34,211,238,0.7)' : 'rgba(255,255,255,0.3)' }}
          >
            {isRecording ? 'Sun Raha Hun' : 'Voice Input'}
          </span>
          <motion.div
            className="w-1 h-1 rounded-full"
            style={{ background: isRecording ? '#22d3ee' : 'rgba(255,255,255,0.2)' }}
            animate={isRecording ? { opacity: [1, 0.2, 1] } : {}}
            transition={{ duration: 1, repeat: Infinity, delay: 0.5 }}
          />
        </div>

        {/* ── Mic Button ── */}
        <MicButton
          isRecording={isRecording}
          onClick={handleMicClick}
        />

        {/* ── Waveform Visualizer ── */}
        <div className="flex items-end gap-0.5" style={{ height: 40 }}>
          {Array.from({ length: 24 }).map((_, i) => (
            <AudioBar key={i} index={i} isActive={isRecording} />
          ))}
        </div>

        {/* ── Status hint ── */}
        <AnimatePresence mode="wait">
          <motion.p
            key={isRecording ? 'recording' : 'idle'}
            className="text-xs text-center"
            style={{ color: isRecording ? 'rgba(34,211,238,0.6)' : 'rgba(255,255,255,0.28)' }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {isRecording
              ? '🎤 Sun raha hun... "Roko" bolo ya button dabao'
              : 'Mic button dabao aur apni logic bolo'}
          </motion.p>
        </AnimatePresence>

        {/* ── Judge's Cheat Sheet: Example Prompts ── */}
        {!isRecording && !transcript && (
          <motion.div
            className="w-full space-y-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            {/* Label */}
            <div className="flex items-center justify-center gap-1.5">
              <span
                className="text-xs font-semibold tracking-wider uppercase"
                style={{ color: 'rgba(255,255,255,0.2)' }}
              >
                Try These
              </span>
            </div>

            {/* Chips container with horizontal scroll */}
            <div className="flex gap-2 overflow-x-auto pb-1 px-1 scrollbar-hide">
              {EXAMPLE_PROMPTS.map((prompt, index) => (
                <ExampleChip
                  key={index}
                  text={prompt}
                  onClick={() => {
                    setTranscript(prompt);
                    setError('');
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Divider ─────────────────────────────────────────── */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

      {/* ── Error Message ───────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="flex items-start gap-2 p-3 rounded-lg"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#f87171' }} />
            <div className="flex-1">
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(248,113,113,0.9)' }}>
                {error}
              </p>
              {/* Retry hint — only shown for permission errors since those require
                  the user to act in the browser UI before clicking again */}
              {(error.includes('permission') || error.includes('Allow')) && (
                <p
                  className="text-xs mt-1.5 font-medium"
                  style={{ color: 'rgba(34,211,238,0.7)' }}
                >
                  Permission dene ke baad button dobara dabao — page refresh ki zaroorat nahi.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Loading State: Transcribing & Generating Code ──── */}
      <AnimatePresence>
        {isGeneratingCode && (
          <motion.div
            className="flex items-center gap-3 p-4 rounded-lg"
            style={{
              background: 'rgba(167,139,250,0.08)',
              border: '1px solid rgba(167,139,250,0.2)',
            }}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <motion.div
              className="w-5 h-5 rounded-full border-2 border-transparent"
              style={{
                borderTopColor: '#a78bfa',
                borderRightColor: '#a78bfa',
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: 'rgba(167,139,250,0.9)' }}>
                🎙️ Audio transcribe ho raha hai aur code ban raha hai...
              </p>
              <p className="text-xs mt-1" style={{ color: 'rgba(167,139,250,0.6)' }}>
                Thoda wait karo, AI kaam kar raha hai
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Transcript Section ──────────────────────────────── */}
      <AnimatePresence>
        {transcript && (
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {/* Label row */}
            <div className="flex items-center justify-between">
              <span
                className="text-xs font-semibold tracking-[0.15em] uppercase"
                style={{ color: 'rgba(255,255,255,0.28)' }}
              >
                Aapne Kaha
              </span>
              <span
                className="text-xs font-mono"
                style={{ color: 'rgba(255,255,255,0.18)' }}
              >
                {transcript.length} chars
              </span>
            </div>

            {/* Textarea */}
            <div
              className="relative rounded-xl overflow-hidden"
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)',
                boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.3)',
              }}
            >
              {/* Left accent bar */}
              <div
                className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full"
                style={{ background: 'linear-gradient(to bottom, rgba(34,211,238,0.6), rgba(167,139,250,0.4))' }}
              />
              <textarea
                value={transcript + (interimTranscript ? ' ' + interimTranscript : '')}
                onChange={(e) => setTranscript(e.target.value)}
                className="w-full bg-transparent resize-none focus:outline-none pl-5 pr-4 py-3.5 text-sm leading-relaxed"
                style={{
                  color: 'rgba(255,255,255,0.82)',
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  caretColor: '#22d3ee',
                }}
                rows={3}
                placeholder="Recording ke baad yahan type karo kya bolna tha..."
                disabled={isRecording}
              />
              {/* Live transcription indicator */}
              {interimTranscript && (
                <div
                  className="absolute bottom-2 right-2 px-2 py-1 rounded text-xs"
                  style={{
                    background: 'rgba(34,211,238,0.15)',
                    color: 'rgba(34,211,238,0.9)',
                    border: '1px solid rgba(34,211,238,0.3)',
                  }}
                >
                  🎤 Sun raha hun...
                </div>
              )}
            </div>

            {/* Generate Button */}
            <motion.button
              onClick={handleGenerateCode}
              disabled={isGeneratingCode || !transcript.trim()}
              className="relative w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl text-sm font-semibold tracking-wide overflow-hidden group"
              style={{
                background:
                  isGeneratingCode || !transcript.trim()
                    ? 'rgba(255,255,255,0.04)'
                    : 'rgba(167,139,250,0.12)',
                border: `1px solid ${
                  isGeneratingCode || !transcript.trim()
                    ? 'rgba(255,255,255,0.07)'
                    : 'rgba(167,139,250,0.4)'
                }`,
                color:
                  isGeneratingCode || !transcript.trim()
                    ? 'rgba(255,255,255,0.2)'
                    : '#a78bfa',
                boxShadow:
                  !isGeneratingCode && transcript.trim()
                    ? '0 0 24px rgba(167,139,250,0.1), inset 0 1px 0 rgba(167,139,250,0.1)'
                    : 'none',
                cursor: isGeneratingCode || !transcript.trim() ? 'not-allowed' : 'pointer',
              }}
              whileHover={!isGeneratingCode && !!transcript.trim() ? { scale: 1.01 } : {}}
              whileTap={!isGeneratingCode && !!transcript.trim() ? { scale: 0.98 } : {}}
            >
              {/* Shimmer sweep */}
              {!isGeneratingCode && transcript.trim() && (
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100"
                  style={{
                    background:
                      'linear-gradient(105deg, transparent 40%, rgba(167,139,250,0.08) 50%, transparent 60%)',
                  }}
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 1.8 }}
                />
              )}

              <motion.div
                animate={isGeneratingCode ? { rotate: 360 } : { rotate: 0 }}
                transition={isGeneratingCode ? { duration: 2, repeat: Infinity, ease: 'linear' } : {}}
              >
                <Sparkles className="w-4 h-4 relative z-10" />
              </motion.div>
              <span className="relative z-10">
                {isGeneratingCode ? 'Code ban raha hai...' : '✨ Code Banao'}
              </span>
            </motion.button>

            {/* Success message */}
            {voiceResult && (
              <motion.div
                className="p-3 rounded-lg"
                style={{
                  background: 'rgba(74,222,128,0.08)',
                  border: '1px solid rgba(74,222,128,0.2)',
                }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(74,222,128,0.9)' }}>
                  ✅ {voiceResult.explanation}
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}