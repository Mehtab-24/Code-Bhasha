'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Sparkles } from 'lucide-react';
import { useState } from 'react';

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
export function VoicePanel() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleStartRecording = () => {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      setTranscript('Ek function banao jo 1 se 10 tak numbers print kare');
    }, 3000);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
  };

  const handleGenerateCode = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
    }, 2000);
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
          onClick={isRecording ? handleStopRecording : handleStartRecording}
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
      </div>

      {/* ── Divider ─────────────────────────────────────────── */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

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
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                className="w-full bg-transparent resize-none focus:outline-none pl-5 pr-4 py-3.5 text-sm leading-relaxed"
                style={{
                  color: 'rgba(255,255,255,0.82)',
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  caretColor: '#22d3ee',
                }}
                rows={3}
                placeholder="Yahan aapki baat dikhegi..."
              />
            </div>

            {/* Generate Button */}
            <motion.button
              onClick={handleGenerateCode}
              disabled={isGenerating || !transcript.trim()}
              className="relative w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl text-sm font-semibold tracking-wide overflow-hidden group"
              style={{
                background:
                  isGenerating || !transcript.trim()
                    ? 'rgba(255,255,255,0.04)'
                    : 'rgba(167,139,250,0.12)',
                border: `1px solid ${
                  isGenerating || !transcript.trim()
                    ? 'rgba(255,255,255,0.07)'
                    : 'rgba(167,139,250,0.4)'
                }`,
                color:
                  isGenerating || !transcript.trim()
                    ? 'rgba(255,255,255,0.2)'
                    : '#a78bfa',
                boxShadow:
                  !isGenerating && transcript.trim()
                    ? '0 0 24px rgba(167,139,250,0.1), inset 0 1px 0 rgba(167,139,250,0.1)'
                    : 'none',
                cursor: isGenerating || !transcript.trim() ? 'not-allowed' : 'pointer',
              }}
              whileHover={!isGenerating && !!transcript.trim() ? { scale: 1.01 } : {}}
              whileTap={!isGenerating && !!transcript.trim() ? { scale: 0.98 } : {}}
            >
              {/* Shimmer sweep */}
              {!isGenerating && transcript.trim() && (
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
                animate={isGenerating ? { rotate: 360 } : { rotate: 0 }}
                transition={isGenerating ? { duration: 2, repeat: Infinity, ease: 'linear' } : {}}
              >
                <Sparkles className="w-4 h-4 relative z-10" />
              </motion.div>
              <span className="relative z-10">
                {isGenerating ? 'Code ban raha hai...' : '✨ Code Banao'}
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}