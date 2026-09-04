'use client';

import { motion } from 'framer-motion';
import { ChevronRight, Play, Pause, ChevronLeft, RotateCcw } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useExecutionStore } from '@/store/useExecutionStore';

// ─── Visual Variable & Scope Tracer Panel (extracted from OutputPanel) ────────
export function TracerPanel() {
  const { traceSteps, currentTraceIndex, setTraceIndex } = useExecutionStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000); // 1s per step
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        <h3 className="text-sm font-mono text-gray-400 font-bold tracking-wide uppercase mt-4">
          Visual Tracer Empty
        </h3>
        <p className="text-xs font-mono text-gray-500 max-w-sm mt-2 leading-relaxed">
          Bhai, pehle editor mein kuch code execute karo! Standard python execution run hote hi
          visual traceback and scope variable values yahan step-by-step trace ho jayengi.
        </p>
      </div>
    );
  }

  const currentStep = traceSteps[currentTraceIndex ?? 0];
  const vars = currentStep ? Object.entries(currentStep.variables) : [];

  return (
    <div className="h-full flex flex-col space-y-3">
      {/* ── Playback Controls Bar ── */}
      <div
        className="flex flex-wrap items-center justify-between p-3 rounded-xl border gap-3"
        style={{
          background: 'rgba(255,255,255,0.01)',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-1.5">
          {/* Step Back */}
          <motion.button
            onClick={() =>
              currentTraceIndex !== null && currentTraceIndex > 0 && setTraceIndex(currentTraceIndex - 1)
            }
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
            onClick={() =>
              currentTraceIndex !== null &&
              currentTraceIndex < traceSteps.length - 1 &&
              setTraceIndex(currentTraceIndex + 1)
            }
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
            aria-label="Trace step"
          />
          <span className="text-[10px] font-mono text-gray-500 shrink-0 select-none">
            Step {(currentTraceIndex ?? 0) + 1} / {traceSteps.length} (Line {currentStep?.line})
          </span>
        </div>

        {/* Playback speed selector */}
        <div className="flex items-center gap-1">
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
            className="bg-black border border-white/5 hover:border-white/10 text-[10px] font-mono text-gray-400 rounded px-2 py-1 outline-none cursor-pointer"
            aria-label="Playback speed"
          >
            <option value={2000}>0.5x (Slow)</option>
            <option value={1000}>1.0x (Normal)</option>
            <option value={500}>2.0x (Fast)</option>
          </select>
        </div>
      </div>

      {/* ── Variables Inspector Panel ── */}
      <div
        className="flex-1 flex flex-col rounded-xl border overflow-hidden"
        style={{
          background: 'rgba(0,0,0,0.4)',
          borderColor: 'rgba(255,255,255,0.05)',
        }}
      >
        {/* Table Header */}
        <div
          className="grid grid-cols-2 px-4 py-2 border-b font-mono text-[10px] text-gray-500 uppercase tracking-wider"
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
              <p className="text-[10px] font-mono text-gray-500 mt-2">Active line variable scope empty.</p>
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
                <span className="text-cyan-400 font-medium truncate select-all" title={val}>
                  {val}
                </span>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
