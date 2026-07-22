'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Bug, Lightbulb, Clock, ChevronRight, Eye, Play, Pause, ChevronLeft, RotateCcw } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useExecutionStore, type ExecutionError } from '@/store/useExecutionStore';

interface OutputPanelProps {
  output: string[];
  error: ExecutionError | null;
  isExecuting: boolean;
  executionTime?: number | null;
  debugResult?: DebugResult | null;
  isFetchingDebug?: boolean;
}

interface DebugResult {
  friendly_message: string;
  fix_suggestion: string;
  corrected_line: string | null;
}

// ─── Scanline overlay for CRT depth ──────────────────────────────────────────
function TerminalScanlines() {
  return (
    <div
      className="absolute inset-0 pointer-events-none rounded-b-xl overflow-hidden"
      style={{
        backgroundImage:
          'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)',
        zIndex: 1,
      }}
    />
  );
}

// ─── Blinking cursor ─────────────────────────────────────────────────────────
function BlinkingCursor() {
  return (
    <motion.span
      className="inline-block align-middle ml-0.5"
      style={{
        width: 7,
        height: 14,
        background: '#4ade80',
        boxShadow: '0 0 6px rgba(74,222,128,0.8)',
      }}
      animate={{ opacity: [1, 1, 0, 0] }}
      transition={{ 
        duration: 1, 
        repeat: Infinity, 
        times: [0, 0.5, 0.5, 1],
        ease: 'linear'
      }}
    />
  );
}

// ─── Executing spinner (dot matrix) ──────────────────────────────────────────
function ExecutingIndicator() {
  return (
    <motion.div
      className="flex items-center gap-3 py-1"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="flex items-center gap-1">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="w-1 h-1 rounded-full"
            style={{ background: '#22d3ee', boxShadow: '0 0 4px rgba(34,211,238,0.8)' }}
            animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
          />
        ))}
      </div>
      <span
        className="text-xs font-mono tracking-widest"
        style={{ color: 'rgba(34,211,238,0.7)' }}
      >
        EXECUTING
      </span>
    </motion.div>
  );
}

// ─── Single output line ───────────────────────────────────────────────────────
function OutputLine({ line, index }: { line: string; index: number }) {
  const isEmpty = line.trim() === '';

  return (
    <motion.div
      className="flex items-start gap-2 group"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04, ease: 'easeOut' }}
    >
      {/* Line gutter */}
      <span
        className="select-none shrink-0 w-8 text-right text-xs font-mono pt-px opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: 'rgba(255,255,255,0.15)', lineHeight: '1.6' }}
      >
        {index + 1}
      </span>

      {/* Prompt symbol */}
      <ChevronRight
        className="shrink-0 mt-px opacity-30"
        style={{ width: 12, height: 12, color: '#4ade80', marginTop: 3 }}
      />

      {/* Line content */}
      <span
        className="font-mono text-sm leading-relaxed break-all"
        style={{
          color: isEmpty ? 'transparent' : '#4ade80',
          textShadow: isEmpty ? 'none' : '0 0 8px rgba(74,222,128,0.35)',
          minHeight: '1.4em',
        }}
      >
        {isEmpty ? '\u00A0' : line}
      </span>
    </motion.div>
  );
}

// ─── Output tab content ───────────────────────────────────────────────────────
function OutputContent({
  output,
  isExecuting,
  executionTime,
}: {
  output: string[];
  isExecuting: boolean;
  executionTime?: number | null;
}) {
  const isEmpty = !isExecuting && output.length === 0;

  return (
    <div className="relative h-full flex flex-col">
      <AnimatePresence>
        {isExecuting && <ExecutingIndicator />}
      </AnimatePresence>

      {/* Empty state */}
      <AnimatePresence>
        {isEmpty && (
          <motion.div
            className="flex-1 flex flex-col items-center justify-center gap-3 select-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <Terminal className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.2)' }} />
            </div>
            <p
              className="text-xs font-mono text-center leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.2)' }}
            >
              Code chalane ke liye{' '}
              <span style={{ color: 'rgba(74,222,128,0.5)' }}>▶ Chalao</span>
              {' '}dabao
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Output lines */}
      {output.length > 0 && (
        <div className="space-y-0.5 flex-1">
          {output.map((line, i) => (
            <OutputLine key={i} line={line} index={i} />
          ))}

          {/* Trailing cursor */}
          {!isExecuting && (
            <div className="flex items-center gap-2 pl-10 pt-1">
              <BlinkingCursor />
            </div>
          )}
        </div>
      )}

      {/* Execution time footer */}
      <AnimatePresence>
        {executionTime != null && !isExecuting && output.length > 0 && (
          <motion.div
            className="flex items-center gap-2 mt-3 pt-2.5"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Clock className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.2)' }} />
            <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>
              exited in{' '}
              <span style={{ color: 'rgba(74,222,128,0.55)' }}>{executionTime}ms</span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Debugger tab content ─────────────────────────────────────────────────────
function DebuggerContent({ 
  error, 
  debugResult, 
  isFetchingDebug 
}: { 
  error: ExecutionError | null;
  debugResult?: DebugResult | null;
  isFetchingDebug?: boolean;
}) {
  return (
    <div className="space-y-3 h-full">
      {/* Section label */}
      <div className="flex items-center gap-2">
        <Lightbulb className="w-3.5 h-3.5" style={{ color: 'rgba(251,113,133,0.7)' }} />
        <span
          className="text-xs font-mono tracking-[0.18em] uppercase"
          style={{ color: 'rgba(251,113,133,0.55)' }}
        >
          Desi Debugger
        </span>
      </div>

      <AnimatePresence mode="wait">
        {error ? (
          <motion.div
            key="error"
            className="space-y-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {/* Error type badge + message */}
            <div
              className="rounded-xl p-4 space-y-3"
              style={{
                background: 'rgba(239,68,68,0.05)',
                border: '1px solid rgba(239,68,68,0.18)',
                boxShadow: 'inset 0 1px 0 rgba(239,68,68,0.06)',
              }}
            >
              {/* Error header */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <motion.div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: '#f87171', boxShadow: '0 0 6px rgba(248,113,113,0.8)' }}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span
                  className="font-mono text-xs font-bold tracking-wide"
                  style={{ color: '#f87171', textShadow: '0 0 8px rgba(248,113,113,0.4)' }}
                >
                  {error.type}
                </span>
                {error.lineno > 0 && (
                  <span
                    className="font-mono text-xs px-2 py-0.5 rounded"
                    style={{
                      background: 'rgba(248,113,113,0.1)',
                      border: '1px solid rgba(248,113,113,0.2)',
                      color: 'rgba(248,113,113,0.7)',
                    }}
                  >
                    line {error.lineno}
                  </span>
                )}
              </div>

              {/* Raw error message */}
              <p
                className="font-mono text-xs leading-relaxed"
                style={{
                  color: 'rgba(252,165,165,0.75)',
                  textShadow: '0 0 6px rgba(252,165,165,0.15)',
                }}
              >
                {error.message}
              </p>

              {/* Problematic line */}
              {error.line_text && (
                <div
                  className="rounded-lg p-3 mt-1"
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    borderLeft: '2px solid rgba(248,113,113,0.5)',
                  }}
                >
                  <span
                    className="text-xs font-mono"
                    style={{ color: 'rgba(255,255,255,0.2)' }}
                  >
                    problematic line
                  </span>
                  <pre
                    className="font-mono text-xs mt-1.5 whitespace-pre-wrap"
                    style={{
                      color: '#fca5a5',
                      textShadow: '0 0 6px rgba(252,165,165,0.3)',
                    }}
                  >
                    {error.line_text}
                  </pre>
                </div>
              )}
            </div>

            {/* Friendly explanation from Bedrock */}
            {isFetchingDebug && (!debugResult || (!debugResult.friendly_message && !debugResult.fix_suggestion)) ? (
              <div
                className="rounded-xl p-4 flex items-center gap-3"
                style={{
                  background: 'rgba(167,139,250,0.05)',
                  border: '1px solid rgba(167,139,250,0.15)',
                }}
              >
                <motion.div
                  className="w-4 h-4 rounded-full"
                  style={{ border: '2px solid rgba(167,139,250,0.3)', borderTopColor: '#a78bfa' }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                />
                <p className="text-xs font-mono" style={{ color: 'rgba(167,139,250,0.7)' }}>
                  Desi Debugger soch raha hai...
                </p>
              </div>
            ) : debugResult && (debugResult.friendly_message || debugResult.fix_suggestion) ? (
              <div
                className="rounded-xl p-4 space-y-3"
                style={{
                  background: 'rgba(167,139,250,0.06)',
                  border: '1px solid rgba(167,139,250,0.2)',
                  boxShadow: '0 0 16px rgba(167,139,250,0.08)',
                }}
              >
                {/* Friendly message */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💬</span>
                    <span
                      className="text-xs font-mono tracking-wider uppercase"
                      style={{ color: 'rgba(167,139,250,0.7)' }}
                    >
                      Desi Debugger
                    </span>
                  </div>
                  <p
                    className="text-sm leading-relaxed"
                    style={{
                      color: 'rgba(255,255,255,0.85)',
                      textShadow: '0 0 8px rgba(167,139,250,0.15)',
                    }}
                  >
                    {debugResult.friendly_message}
                  </p>
                </div>

                {/* Fix suggestion */}
                <div
                  className="rounded-lg p-3 space-y-2"
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(167,139,250,0.15)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔧</span>
                    <span
                      className="text-xs font-mono tracking-wider uppercase"
                      style={{ color: 'rgba(0,255,163,0.7)' }}
                    >
                      Fix Suggestion
                    </span>
                  </div>
                  <p
                    className="text-xs font-mono leading-relaxed"
                    style={{ color: 'rgba(0,255,163,0.8)' }}
                  >
                    {debugResult.fix_suggestion}
                  </p>
                </div>

                {/* Corrected line if available */}
                {debugResult.corrected_line && (
                  <div
                    className="rounded-lg p-3 space-y-2"
                    style={{
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(0,255,163,0.2)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">✨</span>
                      <span
                        className="text-xs font-mono tracking-wider uppercase"
                        style={{ color: 'rgba(0,255,163,0.6)' }}
                      >
                        Corrected Code
                      </span>
                    </div>
                    <pre
                      className="font-mono text-xs whitespace-pre-wrap"
                      style={{
                        color: '#4ade80',
                        textShadow: '0 0 6px rgba(74,222,128,0.3)',
                      }}
                    >
                      {debugResult.corrected_line}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div
                className="rounded-xl p-4"
                style={{
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <p className="text-xs font-mono leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  💡{' '}
                  <span style={{ color: 'rgba(167,139,250,0.7)' }}>Desi Debugger:</span>{' '}
                  <span style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Friendly Hinglish explanation loading...
                  </span>
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="no-error"
            className="flex flex-col items-center justify-center gap-3 py-6 select-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <Bug className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.18)' }} />
            </div>
            <p
              className="text-xs font-mono text-center leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.2)' }}
            >
              Koi error nahi mili.{' '}
              <span style={{ color: 'rgba(74,222,128,0.4)' }}>Sab theek hai!</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent tip */}
      <div
        className="rounded-xl p-3.5 mt-auto"
        style={{
          background: 'rgba(167,139,250,0.04)',
          border: '1px solid rgba(167,139,250,0.1)',
        }}
      >
        <p className="text-xs font-mono leading-relaxed" style={{ color: 'rgba(167,139,250,0.5)' }}>
          💡 <span style={{ color: 'rgba(167,139,250,0.7)' }}>Tip:</span>{' '}
          Agar code mein koi problem ho toh yahan samjhaya jayega ki kya galat hai aur kaise theek karna hai.
        </p>
      </div>
    </div>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────
function TabButton({
  id,
  activeTab,
  onClick,
  icon: Icon,
  label,
  badge,
  activeColor,
}: {
  id: 'output' | 'debugger' | 'tracer';
  activeTab: 'output' | 'debugger' | 'tracer';
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  badge?: React.ReactNode;
  activeColor: string;
}) {
  const isActive = id === activeTab;
  return (
    <motion.button
      onClick={onClick}
      className="relative flex items-center gap-2 px-4 py-3 text-xs font-mono font-medium tracking-wide transition-all duration-200 cursor-pointer rounded-t-lg select-none"
      style={{
        color: isActive ? activeColor : 'rgba(255,255,255,0.45)',
        background: isActive
          ? `rgba(${activeColor === '#4ade80' ? '74,222,128' : activeColor === '#f87171' ? '248,113,113' : '167,139,250'}, 0.08)`
          : 'transparent',
        borderBottom: `2px solid ${isActive ? activeColor : 'transparent'}`,
      }}
      whileHover={{
        color: isActive ? activeColor : 'rgba(255,255,255,0.85)',
        background: isActive ? undefined : 'rgba(255,255,255,0.03)',
      }}
      whileTap={{ scale: 0.97 }}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="font-semibold">{label}</span>
      {badge}
    </motion.button>
  );
}

// ─── Visual Variable & Scope Tracer Panel ───────────────────────────────────
function TracerPanel() {
  const { traceSteps, currentTraceIndex, setTraceIndex } = useExecutionStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000); // 1s per step
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Playback timer
  useEffect(() => {
    if (isPlaying && traceSteps && currentTraceIndex !== null) {
      intervalRef.current = setInterval(() => {
        if (currentTraceIndex < traceSteps.length - 1) {
          setTraceIndex(currentTraceIndex + 1);
        } else {
          setIsPlaying(false); // Stop when end reached
        }
      }, playbackSpeed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, currentTraceIndex, traceSteps, playbackSpeed, setTraceIndex]);

  if (!traceSteps || traceSteps.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 select-none">
        <span className="text-4xl">🔍</span>
        <h3 className="text-sm font-mono text-gray-400 font-bold tracking-wide uppercase mt-4">Visual Tracer Empty</h3>
        <p className="text-xs font-mono text-gray-500 max-w-sm mt-2 leading-relaxed">
          Bhai, pehle editor mein kuch code execute karo! Standard python execution run hote hi visual traceback and scope variable values yahan step-by-step trace ho jayengi.
        </p>
      </div>
    );
  }

  const currentStep = traceSteps[currentTraceIndex ?? 0];
  const vars = currentStep ? Object.entries(currentStep.variables) : [];

  return (
    <div className="h-full flex flex-col space-y-3">
      {/* ── Playback Controls Bar ── */}
      <div className="flex flex-wrap items-center justify-between p-3 rounded-xl border gap-3"
        style={{
          background: 'rgba(255,255,255,0.01)',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-1.5">
          {/* Step Back */}
          <motion.button
            onClick={() => currentTraceIndex !== null && currentTraceIndex > 0 && setTraceIndex(currentTraceIndex - 1)}
            disabled={currentTraceIndex === 0}
            className="p-1.5 rounded-lg border text-gray-400 hover:text-white border-white/5 hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Step Back"
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.button>

          {/* Play / Pause */}
          <motion.button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded-lg border text-purple-400 hover:text-purple-300 border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 transition-all cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={isPlaying ? 'Pause' : 'Auto Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </motion.button>

          {/* Step Forward */}
          <motion.button
            onClick={() => currentTraceIndex !== null && currentTraceIndex < traceSteps.length - 1 && setTraceIndex(currentTraceIndex + 1)}
            disabled={currentTraceIndex === traceSteps.length - 1}
            className="p-1.5 rounded-lg border text-gray-400 hover:text-white border-white/5 hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Step Forward"
          >
            <ChevronRight className="w-4 h-4" />
          </motion.button>

          {/* Reset */}
          <motion.button
            onClick={() => {
              setIsPlaying(false);
              setTraceIndex(0);
            }}
            className="p-1.5 rounded-lg border text-gray-400 hover:text-white border-white/5 hover:bg-white/5 transition-all cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Reset to Step 1"
          >
            <RotateCcw className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Slider timeline */}
        <div className="flex-1 min-w-[150px] flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={traceSteps.length - 1}
            value={currentTraceIndex ?? 0}
            onChange={(e) => setTraceIndex(Number(e.target.value))}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500 focus:outline-none"
          />
          <span className="text-[10px] font-mono text-gray-500 shrink-0 select-none">
            Step {((currentTraceIndex ?? 0) + 1)} / {traceSteps.length} (Line {currentStep?.line})
          </span>
        </div>

        {/* Playback speed selector */}
        <div className="flex items-center gap-1">
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
            className="bg-black border border-white/5 hover:border-white/10 text-[10px] font-mono text-gray-400 rounded px-2 py-1 outline-none cursor-pointer"
          >
            <option value={2000}>0.5x (Slow)</option>
            <option value={1000}>1.0x (Normal)</option>
            <option value={500}>2.0x (Fast)</option>
          </select>
        </div>
      </div>

      {/* ── Variables Inspector Panel ── */}
      <div className="flex-1 flex flex-col rounded-xl border overflow-hidden"
        style={{
          background: 'rgba(0,0,0,0.4)',
          borderColor: 'rgba(255,255,255,0.05)',
        }}
      >
        {/* Table Header */}
        <div className="grid grid-cols-2 px-4 py-2 border-b font-mono text-[10px] text-gray-500 uppercase tracking-wider"
          style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}
        >
          <span>Variable Name</span>
          <span>Runtime Value</span>
        </div>

        {/* Variable Rows */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-white/5">
          {vars.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 select-none opacity-40">
              <span className="text-xl">💤</span>
              <p className="text-[10px] font-mono text-gray-500 mt-2">
                Active line variable scope empty.
              </p>
            </div>
          ) : (
            vars.map(([name, val]) => (
              <motion.div
                key={name}
                className="grid grid-cols-2 px-3 py-2 font-mono text-xs items-center hover:bg-white/5 transition-all"
                initial={{ opacity: 0, x: -3 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
              >
                <span className="text-purple-400 font-bold">{name}</span>
                <span className="text-cyan-400 font-medium truncate select-all" title={val}>{val}</span>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main OutputPanel ─────────────────────────────────────────────────────────
export function OutputPanel({ 
  output, 
  error, 
  isExecuting, 
  executionTime,
  debugResult,
  isFetchingDebug 
}: OutputPanelProps) {
  const [activeTab, setActiveTab] = useState<'output' | 'debugger' | 'tracer'>('output');

  // Auto-switch to debugger tab when error occurs
  useEffect(() => {
    if (error) {
      setActiveTab('debugger');
    }
  }, [error]);

  return (
    <div
      className="codebhasha-output-root card-3d-perspective gpu-layer relative h-full flex flex-col overflow-hidden w-full"
      style={{
        background: '#050505',
        border: `1px solid ${isExecuting ? 'rgba(34, 211, 238, 0.2)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 12,
        boxShadow: isExecuting
          ? '0 0 24px rgba(34,211,238,0.06), inset 0 1px 0 rgba(34,211,238,0.04)'
          : '0 24px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.03)',
        transition: 'border-color 0.4s, box-shadow 0.4s'
      }}
    >
      <TerminalScanlines />

      {/* ── Tab bar ───────────────────────────────────────── */}
      <div
        className="relative z-10 flex items-center shrink-0 overflow-x-auto scrollbar-hide"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(0,0,0,0.6)',
        }}
      >
        <TabButton
          id="output"
          activeTab={activeTab}
          onClick={() => setActiveTab('output')}
          icon={Terminal}
          label="Output"
          activeColor="#4ade80"
          badge={
            executionTime != null && !isExecuting ? (
              <span
                className="ml-1 text-xs font-mono"
                style={{ color: 'rgba(74,222,128,0.6)', fontSize: 10 }}
              >
                {executionTime}ms
              </span>
            ) : undefined
          }
        />
        <TabButton
          id="debugger"
          activeTab={activeTab}
          onClick={() => setActiveTab('debugger')}
          icon={Bug}
          label="Desi Debugger"
          activeColor="#f87171"
          badge={
            error ? (
              <motion.div
                className="w-2 h-2 rounded-full ml-1"
                style={{ background: '#f87171', boxShadow: '0 0 6px rgba(248,113,113,0.9)' }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
            ) : undefined
          }
        />
        <TabButton
          id="tracer"
          activeTab={activeTab}
          onClick={() => setActiveTab('tracer')}
          icon={Eye}
          label="Visual Tracer"
          activeColor="#a78bfa"
        />

        {/* Spacer + right-aligned system label */}
        <div className="flex-1 min-w-[20px]" />
        <span
          className="pr-4 font-mono select-none hidden sm:inline"
          style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.18em' }}
        >
          SYSTEM OUTPUT
        </span>
      </div>

      {/* ── Content area ──────────────────────────────────── */}
      <div className="relative z-10 flex-1 overflow-auto p-4"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.08) transparent',
        }}
      >
        <AnimatePresence mode="wait">
          {activeTab === 'output' ? (
            <motion.div
              key="output"
              className="h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <OutputContent
                output={output}
                isExecuting={isExecuting}
                executionTime={executionTime}
              />
            </motion.div>
          ) : activeTab === 'debugger' ? (
            <motion.div
              key="debugger"
              className="h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <DebuggerContent 
                error={error} 
                debugResult={debugResult}
                isFetchingDebug={isFetchingDebug}
              />
            </motion.div>
          ) : (
            <motion.div
              key="tracer"
              className="h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <TracerPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom status bar ─────────────────────────────── */}
      <div
        className="relative z-10 shrink-0 flex items-center justify-between px-4 py-1.5"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.04)',
          background: 'rgba(0,0,0,0.7)',
        }}
      >
        <div className="flex items-center gap-2">
          <motion.div
            className="w-1 h-1 rounded-full"
            style={{
              background: isExecuting ? '#22d3ee' : error ? '#f87171' : 'rgba(255,255,255,0.15)',
              boxShadow: isExecuting
                ? '0 0 4px rgba(34,211,238,0.8)'
                : error
                ? '0 0 4px rgba(248,113,113,0.8)'
                : 'none',
            }}
            animate={isExecuting ? { opacity: [1, 0.3, 1] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span
            className="font-mono select-none"
            style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.14em' }}
          >
            {isExecuting
              ? 'RUNNING'
              : error
              ? 'ERROR'
              : output.length > 0
              ? `${output.length} LINE${output.length !== 1 ? 'S' : ''}`
              : 'IDLE'}
          </span>
        </div>

        <span
          className="font-mono select-none"
          style={{ fontSize: 9, color: 'rgba(255,255,255,0.1)', letterSpacing: '0.14em' }}
        >
          PYTHON 3 · PYODIDE
        </span>
      </div>
    </div>
  );
}