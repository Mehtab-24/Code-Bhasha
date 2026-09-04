'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  Mic,
  MicOff,
  Keyboard,
  Sparkles,
  AlertCircle,
  CornerDownLeft,
  History,
  Check,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useExecutionStore } from '@/store/useExecutionStore';
import { RadialVisualizer } from './RadialVisualizer';

type StudioMode = 'voice' | 'text';

interface GenerationEntry {
  id: string;
  prompt: string;
  mode: StudioMode;
  at: number;
  codeChars: number;
  ok: boolean;
}

const GENERATION_LOG_KEY = 'codebhasha-generation-log';
const GENERATION_LOG_LIMIT = 12;

const PROMPT_SHELF = [
  'List ko reverse karne ka function banao',
  'Factorial of number',
  '1 se 10 tak odd numbers ka code likho',
  'Fibonacci series ka code likho',
  'Palindrome check karo',
  'Table of 7 print karo',
];

// ─── Segmented control: Bolo (Voice) / Likho (Text) ───────────────────────────
function ModeSegment({
  mode,
  activeMode,
  onSelect,
  icon: Icon,
  label,
  accent,
}: {
  mode: StudioMode;
  activeMode: StudioMode;
  onSelect: (mode: StudioMode) => void;
  icon: React.ElementType;
  label: string;
  accent: string;
}) {
  const isActive = mode === activeMode;
  return (
    <button
      type="button"
      onClick={() => onSelect(mode)}
      aria-pressed={isActive}
      className="relative flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold tracking-wide select-none transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/25"
      style={{ color: isActive ? accent : 'rgba(255,255,255,0.38)', zIndex: 1 }}
    >
      {isActive && (
        <motion.span
          className="absolute inset-0 rounded-lg"
          layoutId="studio-mode-pill"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: `1px solid ${accent}44`,
            boxShadow: `0 0 16px ${accent}1f, inset 0 1px 0 rgba(255,255,255,0.07)`,
          }}
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        />
      )}
      <Icon className="w-3.5 h-3.5 relative" />
      <span className="relative">{label}</span>
    </button>
  );
}

// ─── Prompt Shelf chip ────────────────────────────────────────────────────────
function ShelfChip({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2.5 py-1 text-xs font-medium text-slate-300 bg-white/[0.04] border border-white/[0.08] hover:border-emerald-500/40 hover:bg-emerald-500/[0.06] rounded-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400/50"
    >
      {text}
    </button>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ icon: Icon, children, tint }: { icon: React.ElementType; children: React.ReactNode; tint: string }) {
  return (
    <div className="flex items-center gap-2 select-none">
      <Icon className="w-3.5 h-3.5" style={{ color: tint }} />
      <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase font-mono">
        {children}
      </span>
      <span className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.05)' }} />
    </div>
  );
}

// ─── Main AI Intent & Generation Studio (left column) ─────────────────────────
// `mode` is owned by the shell so the command palette can switch it too.
export function AiStudio({
  mode,
  onModeChange,
}: {
  mode: StudioMode;
  onModeChange: (mode: StudioMode) => void;
}) {
  const [textPrompt, setTextPrompt] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [genError, setGenError] = useState('');
  const [generations, setGenerations] = useState<GenerationEntry[]>([]);

  const levelRef = useRef(0);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const meterRafRef = useRef(0);
  const runGenerationRef = useRef<(prompt: string, genMode: StudioMode) => void>(undefined);

  const {
    isRecording,
    transcript,
    isGeneratingCode,
    setIsRecording,
    setTranscript,
    generateCodeFromVoice,
    resetVoiceState,
  } = useExecutionStore();

  // ── Generation log persistence ──
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(GENERATION_LOG_KEY);
      if (stored) setGenerations(JSON.parse(stored));
    } catch {
      // corrupted log — start fresh
    }
  }, []);

  const addGeneration = useCallback((entry: GenerationEntry) => {
    setGenerations((prev) => {
      const next = [entry, ...prev].slice(0, GENERATION_LOG_LIMIT);
      try {
        window.localStorage.setItem(GENERATION_LOG_KEY, JSON.stringify(next));
      } catch {
        // storage full/blocked — in-memory log still works
      }
      return next;
    });
  }, []);

  // ── Mic loudness → levelRef (feeds the radial visualizer) ──
  const stopLevelMeter = useCallback(() => {
    cancelAnimationFrame(meterRafRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    levelRef.current = 0;
  }, []);

  const startLevelMeter = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      if (ctx.state === 'suspended') await ctx.resume();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.55;
      source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const loop = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        levelRef.current = Math.min(1, Math.sqrt(sum / data.length) * 3.2);
        meterRafRef.current = requestAnimationFrame(loop);
      };
      meterRafRef.current = requestAnimationFrame(loop);
    } catch {
      // Permission denied or unsupported — visualizer falls back to a synthetic pulse
    }
  }, []);

  // ── Generation (shared by voice auto-run and the Likho box) ──
  const runGeneration = useCallback(
    async (prompt: string, genMode: StudioMode) => {
      const trimmed = prompt.trim();
      const state = useExecutionStore.getState();
      if (!trimmed || state.isGeneratingCode) return;
      setGenError('');
      try {
        const result = await generateCodeFromVoice(trimmed);
        const code = result?.code ?? '';
        addGeneration({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          prompt: trimmed,
          mode: genMode,
          at: Date.now(),
          codeChars: code.length,
          ok: code.trim().length > 0,
        });
      } catch (err) {
        // Show the unmasked Bedrock diagnostic in the banner — not a generic apology
        const diagnostic = err instanceof Error && err.message ? err.message : '';
        setGenError(
          diagnostic
            ? `Code generation failed — ${diagnostic}`
            : 'Code generation mein problem hui. Dobara try karo.'
        );
      }
    },
    [generateCodeFromVoice, addGeneration]
  );

  useEffect(() => {
    runGenerationRef.current = (prompt, genMode) => void runGeneration(prompt, genMode);
  }, [runGeneration]);

  // ── Speech recognition setup (once) ──
  useEffect(() => {
    resetVoiceState();

    if (typeof window !== 'undefined') {
      const SpeechRecognitionAPI =
        window.SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition: new () => SpeechRecognition })
          .webkitSpeechRecognition;

      if (SpeechRecognitionAPI) {
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'hi-IN';
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interim = '';
          let final = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const part = event.results[i][0].transcript;
            if (event.results[i].isFinal) final += part + ' ';
            else interim += part;
          }
          if (interim) setInterimTranscript(interim);
          if (final) {
            const store = useExecutionStore.getState();
            store.setTranscript((store.transcript + final).trim());
            setInterimTranscript('');
          }
        };

        recognition.onend = () => {
          const store = useExecutionStore.getState();
          store.setIsRecording(false);
          setInterimTranscript('');
          stopLevelMeter();
          const finalTranscript = store.transcript.trim();
          if (finalTranscript) {
            runGenerationRef.current?.(finalTranscript, 'voice');
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          const store = useExecutionStore.getState();
          store.setIsRecording(false);
          setInterimTranscript('');
          stopLevelMeter();
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setGenError('Mic ki permission chahiye. Browser settings mein jaake allow karo.');
          } else if (event.error === 'no-speech') {
            setGenError('Kuch sunai nahi diya. Dobara try karo aur zor se bolo.');
          } else if (event.error === 'audio-capture') {
            setGenError('Microphone nahi mila. Check karo ki mic connected hai.');
          } else if (event.error !== 'aborted') {
            setGenError('Speech recognition mein problem hui. Dobara try karo.');
          }
        };

        recognitionRef.current = recognition;
      } else {
        setGenError('Tumhara browser speech recognition support nahi karta. Chrome ya Edge use karo.');
      }
    }

    // Auto-clear stale mic errors the moment permission is granted
    let permissionStatus: PermissionStatus | null = null;
    if (typeof navigator !== 'undefined' && navigator.permissions) {
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then((status) => {
          permissionStatus = status;
          if (status.state === 'granted') setGenError('');
          status.onchange = () => {
            if (status.state === 'granted') setGenError('');
          };
        })
        .catch(() => {});
    }

    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        // already stopped
      }
      if (permissionStatus) permissionStatus.onchange = null;
      stopLevelMeter();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMicToggle = useCallback(async () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setGenError('Speech recognition available nahi hai. Browser update karo.');
      return;
    }
    if (useExecutionStore.getState().isRecording) {
      try {
        recognition.stop();
      } catch {
        // already stopped
      }
      return;
    }
    setGenError('');
    setTranscript('');
    try {
      recognition.start();
      setIsRecording(true);
      void startLevelMeter();
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('already started')) {
        setIsRecording(true);
        void startLevelMeter();
      } else {
        setIsRecording(false);
        setGenError('Speech recognition start nahi ho paya. Dobara try karo.');
      }
    }
  }, [setIsRecording, setTranscript, startLevelMeter]);

  const handleModeSelect = useCallback(
    (next: StudioMode) => {
      if (next !== mode) {
        if (useExecutionStore.getState().isRecording) {
          try {
            recognitionRef.current?.stop();
          } catch {
            // already stopped
          }
        }
        onModeChange(next);
      }
    },
    [mode, onModeChange]
  );

  // Safety net: if the mode is switched from outside (⌘K palette) while the
  // mic is live, stop the recognizer so it never runs against a hidden UI.
  useEffect(() => {
    if (mode !== 'voice' && useExecutionStore.getState().isRecording) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // already stopped
      }
    }
  }, [mode]);

  const insertPrompt = useCallback(
    (prompt: string) => {
      setGenError('');
      if (mode === 'voice') setTranscript(prompt);
      else setTextPrompt(prompt);
    },
    [mode, setTranscript]
  );

  const activePrompt = mode === 'voice' ? transcript : textPrompt;
  const displayTranscript = transcript + (interimTranscript ? ` ${interimTranscript}` : '');

  return (
    <div className="h-full flex flex-col" style={{ background: 'rgba(255,255,255,0.014)' }}>
      {/* ── Header: segmented control ── */}
      <div
        className="shrink-0 px-3.5 pt-3.5 pb-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div
          className="flex gap-1 p-1 rounded-xl"
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
          role="group"
          aria-label="Input mode"
        >
          <ModeSegment
            mode="voice"
            activeMode={mode}
            onSelect={handleModeSelect}
            icon={Mic}
            label="Bolo (Voice)"
            accent="#22d3ee"
          />
          <ModeSegment
            mode="text"
            activeMode={mode}
            onSelect={handleModeSelect}
            icon={Keyboard}
            label="Likho (Text)"
            accent="#a78bfa"
          />
        </div>
      </div>

      {/* ── Scrollable studio body ── */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-5"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}
      >
        {/* ══ Input section ══ */}
        <section aria-label={mode === 'voice' ? 'Voice input' : 'Text prompt'}>
          <AnimatePresence mode="wait" initial={false}>
            {mode === 'voice' ? (
              <motion.div
                key="voice-mode"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                className="space-y-3"
              >
                <div
                  className="relative rounded-xl pt-3 pb-4 flex flex-col items-center"
                  style={{
                    background: isRecording ? 'rgba(34,211,238,0.028)' : 'rgba(255,255,255,0.018)',
                    border: `1px solid ${isRecording ? 'rgba(34,211,238,0.16)' : 'rgba(255,255,255,0.06)'}`,
                    boxShadow: isRecording
                      ? '0 0 40px rgba(34,211,238,0.05), inset 0 1px 0 rgba(255,255,255,0.05)'
                      : 'inset 0 1px 0 rgba(255,255,255,0.04)',
                    transition: 'border-color 0.4s, background 0.4s, box-shadow 0.4s',
                  }}
                >
                  {/* Status eyebrow */}
                  <div className="flex items-center gap-2 mb-1 select-none">
                    <motion.span
                      className="w-1 h-1 rounded-full"
                      style={{ background: isRecording ? '#22d3ee' : 'rgba(255,255,255,0.22)' }}
                      animate={isRecording ? { opacity: [1, 0.2, 1] } : {}}
                      transition={{ duration: 1.1, repeat: Infinity }}
                    />
                    <span
                      className="text-[10px] font-mono font-semibold tracking-[0.2em] uppercase"
                      style={{ color: isRecording ? 'rgba(34,211,238,0.72)' : 'rgba(255,255,255,0.32)' }}
                    >
                      {isRecording ? 'Sun Raha Hun' : 'Voice Input'}
                    </span>
                  </div>

                  <RadialVisualizer
                    active={isRecording}
                    levelRef={levelRef}
                    onToggle={handleMicToggle}
                  />

                  {/* Status hint */}
                  <p
                    className="text-[11px] mt-2 px-4 text-center leading-relaxed select-none"
                    style={{ color: isRecording ? 'rgba(34,211,238,0.55)' : 'rgba(255,255,255,0.3)' }}
                  >
                    {isRecording
                      ? '🎤 Sun raha hun… apni logic bolo, "rok" bolo ya button dabao'
                      : 'Mic dabao aur apni logic Hinglish mein bolo'}
                  </p>
                </div>

                {/* Transcript */}
                <div
                  className="relative rounded-xl overflow-hidden"
                  style={{
                    background: 'rgba(0,0,0,0.32)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.28)',
                  }}
                >
                  <span
                    className="absolute left-0 top-2.5 bottom-2.5 w-0.5 rounded-full"
                    style={{
                      background: isRecording
                        ? 'linear-gradient(to bottom, rgba(34,211,238,0.7), rgba(0,255,163,0.4))'
                        : 'linear-gradient(to bottom, rgba(34,211,238,0.45), rgba(167,139,250,0.35))',
                    }}
                  />
                  <textarea
                    value={displayTranscript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Recording ke baad yahan transcript aayega — chahe toh type bhi kar sakte ho…"
                    className="w-full bg-transparent resize-none focus:outline-none pl-4 pr-3 py-3 text-[13px] leading-relaxed font-mono"
                    style={{
                      color: 'rgba(255,255,255,0.82)',
                      minHeight: 64,
                      caretColor: '#22d3ee',
                    }}
                    spellCheck={false}
                    aria-label="Hinglish transcript"
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="text-mode"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                className="space-y-3"
              >
                <div
                  className="relative rounded-xl overflow-hidden"
                  style={{
                    background: 'rgba(0,0,0,0.32)',
                    border: '1px solid rgba(167,139,250,0.16)',
                    boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.28)',
                  }}
                >
                  <span
                    className="absolute left-0 top-2.5 bottom-2.5 w-0.5 rounded-full"
                    style={{
                      background: 'linear-gradient(to bottom, rgba(167,139,250,0.6), rgba(34,211,238,0.35))',
                    }}
                  />
                  <textarea
                    value={textPrompt}
                    onChange={(e) => setTextPrompt(e.target.value)}
                    placeholder="Describe logic in Hinglish (e.g., 'Do numbers ka GCD nikalne ka function banao')..."
                    className="w-full bg-transparent resize-none focus:outline-none pl-4 pr-3 py-3 text-sm text-slate-200 placeholder:text-slate-400 leading-relaxed font-mono"
                    style={{
                      minHeight: 96,
                      caretColor: '#a78bfa',
                    }}
                    spellCheck={false}
                    aria-label="Hinglish prompt"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generate button */}
          <motion.button
            type="button"
            onClick={() => void runGeneration(activePrompt, mode)}
            disabled={isGeneratingCode || !activePrompt.trim()}
            className="relative mt-3 w-full flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-xs font-semibold tracking-wide overflow-hidden group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-400/60"
            style={{
              background:
                isGeneratingCode || !activePrompt.trim()
                  ? 'rgba(255,255,255,0.035)'
                  : 'rgba(167,139,250,0.12)',
              border: `1px solid ${
                isGeneratingCode || !activePrompt.trim()
                  ? 'rgba(255,255,255,0.06)'
                  : 'rgba(167,139,250,0.4)'
              }`,
              color:
                isGeneratingCode || !activePrompt.trim()
                  ? 'rgba(255,255,255,0.22)'
                  : '#c4b5fd',
              boxShadow:
                !isGeneratingCode && activePrompt.trim()
                  ? '0 0 20px rgba(167,139,250,0.1), inset 0 1px 0 rgba(167,139,250,0.1)'
                  : 'none',
              cursor: isGeneratingCode || !activePrompt.trim() ? 'not-allowed' : 'pointer',
            }}
            whileHover={!isGeneratingCode && !!activePrompt.trim() ? { scale: 1.01 } : {}}
            whileTap={!isGeneratingCode && !!activePrompt.trim() ? { scale: 0.98 } : {}}
          >
            {!isGeneratingCode && activePrompt.trim() && (
              <motion.span
                className="absolute inset-0 opacity-0 group-hover:opacity-100"
                style={{
                  background:
                    'linear-gradient(105deg, transparent 40%, rgba(167,139,250,0.09) 50%, transparent 60%)',
                }}
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 1.3, repeat: Infinity, repeatDelay: 1.6 }}
              />
            )}
            <motion.span
              className="relative"
              animate={isGeneratingCode ? { rotate: 360 } : { rotate: 0 }}
              transition={isGeneratingCode ? { duration: 1.4, repeat: Infinity, ease: 'linear' } : {}}
            >
              <Sparkles className="w-3.5 h-3.5" />
            </motion.span>
            <span className="relative">
              {isGeneratingCode ? 'Code ban raha hai…' : '✨ Code Banao'}
            </span>
          </motion.button>

          {/* Generation error */}
          <AnimatePresence>
            {genError && (
              <motion.div
                className="flex items-start gap-2 p-2.5 rounded-lg mt-3"
                style={{
                  background: 'rgba(239,68,68,0.07)',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                role="alert"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" style={{ color: '#f87171' }} />
                <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(248,113,113,0.9)' }}>
                  {genError}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ══ Prompt Shelf ══ */}
        <section aria-label="Quick suggestions">
          <SectionLabel icon={Sparkles} tint="rgba(167,139,250,0.6)">
            Prompt Shelf
          </SectionLabel>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {PROMPT_SHELF.map((prompt) => (
              <ShelfChip key={prompt} text={prompt} onClick={() => insertPrompt(prompt)} />
            ))}
          </div>
        </section>

        {/* ══ Generation Log ══ */}
        <section aria-label="Generation history">
          <SectionLabel icon={History} tint="rgba(34,211,238,0.55)">
            Generation Log
            {generations.length > 0 && (
              <span
                className="text-[9px] font-mono px-1.5 py-0.5 rounded-full ml-1"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}
              >
                {generations.length}
              </span>
            )}
          </SectionLabel>

          {generations.length === 0 ? (
            <p
              className="text-[11px] font-mono mt-3 leading-relaxed select-none"
              style={{ color: 'rgba(255,255,255,0.22)' }}
            >
              Pehli generation yahan timeline mein dikhegi — click karke prompt dobara daal sakte ho.
            </p>
          ) : (
            <div className="relative mt-3 pl-4 space-y-1">
              {/* Timeline rail */}
              <span
                className="absolute left-[3px] top-2 bottom-2 w-px"
                style={{ background: 'linear-gradient(to bottom, rgba(34,211,238,0.25), rgba(167,139,250,0.15), transparent)' }}
              />
              {generations.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => insertPrompt(entry.prompt)}
                  title="Prompt dobara daalo"
                  className="relative w-full text-left group rounded-lg px-2.5 py-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/40 hover:bg-white/[0.04]"
                >
                  {/* Timeline node */}
                  <span
                    className="absolute -left-4 top-4 w-[7px] h-[7px] rounded-full transition-transform group-hover:scale-125"
                    style={{
                      background: entry.ok ? '#22d3ee' : '#f87171',
                      boxShadow: `0 0 6px ${entry.ok ? 'rgba(34,211,238,0.6)' : 'rgba(248,113,113,0.6)'}`,
                      border: '2px solid #0a0d13',
                    }}
                  />
                  <div className="flex items-center gap-2 select-none">
                    {entry.mode === 'voice' ? (
                      <Mic className="w-3 h-3 shrink-0" style={{ color: 'rgba(34,211,238,0.55)' }} />
                    ) : (
                      <Keyboard className="w-3 h-3 shrink-0" style={{ color: 'rgba(167,139,250,0.55)' }} />
                    )}
                    <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.28)' }}>
                      {new Date(entry.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="w-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.14)' }} />
                    <span className="text-[10px] font-mono" style={{ color: entry.ok ? 'rgba(0,255,163,0.45)' : 'rgba(248,113,113,0.55)' }}>
                      {entry.ok ? `${entry.codeChars} ch` : 'fail'}
                    </span>
                    <CornerDownLeft
                      className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-60 transition-opacity"
                      style={{ color: 'rgba(34,211,238,0.8)' }}
                    />
                  </div>
                  <p
                    className="text-xs mt-1 truncate leading-relaxed"
                    style={{ color: 'rgba(255,255,255,0.6)' }}
                  >
                    {entry.prompt}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* footer status */}
        <div
          className="flex items-center justify-between pt-1 pb-1 select-none"
          aria-hidden
        >
          <span className="text-[9px] font-mono tracking-[0.16em] uppercase" style={{ color: 'rgba(255,255,255,0.14)' }}>
            AI Intent Studio
          </span>
          <span className="flex items-center gap-1.5 text-[9px] font-mono tracking-[0.14em] uppercase" style={{ color: 'rgba(255,255,255,0.14)' }}>
            {isRecording ? (
              <>
                <MicOff className="w-3 h-3" style={{ color: 'rgba(34,211,238,0.5)' }} />
                LISTENING
              </>
            ) : isGeneratingCode ? (
              <>
                <motion.span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: '#a78bfa' }}
                  animate={{ opacity: [1, 0.25, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                GENERATING
              </>
            ) : (
              <>
                <Check className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.2)' }} />
                READY
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
