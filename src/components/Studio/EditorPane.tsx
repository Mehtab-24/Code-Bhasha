'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Play, Trash2, Zap } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useExecutionStore } from '@/store/useExecutionStore';
import { CodeEditor } from '@/components/Editor/CodeEditor';
import { TerminalDock } from './TerminalDock';

interface EditorPaneProps {
  onRun: () => void;
}

// ─── Right column: Monaco editor · control strip · terminal dock ──────────────
export function EditorPane({ onRun }: EditorPaneProps) {
  const {
    files,
    activeFileId,
    updateFileContent,
    isExecuting,
    isWorkerReady,
    executionTime,
    error,
    output,
    isGeneratingCode,
    voiceResult,
  } = useExecutionStore();

  const activeFile = files.find((f) => f.id === activeFileId);
  const canRun = !isExecuting && isWorkerReady && !!activeFile?.content.trim();

  // Stable reference so memo(CodeEditor) skips re-renders on sibling state changes
  const handleEditorChange = useCallback(
    (content: string) => {
      if (activeFileId) updateFileContent(activeFileId, content);
    },
    [activeFileId, updateFileContent]
  );

  // Clear = fresh editor buffer + clean terminal (output, errors, debugger state)
  const handleClearAll = useCallback(() => {
    const state = useExecutionStore.getState();
    if (state.activeFileId) {
      state.updateFileContent(state.activeFileId, '# Start coding in Python or speak your logic...\n');
    }
    state.clearOutput();
  }, []);

  // Streaming state (read-only view of the store's voice slice)
  const streamedChars = voiceResult?.code?.length ?? 0;
  const awaitingFirstToken = isGeneratingCode && streamedChars === 0;
  const tokenEstimate = streamedChars > 0 ? Math.max(1, Math.ceil(streamedChars / 4)) : 0;

  return (
    <div className="h-full min-h-0 flex flex-col gap-2.5">
      {/* ── Editor (Monaco owns its interior scrolling) ── */}
      <div className="relative flex-1 min-h-0">
        <CodeEditor
          value={activeFile?.content || ''}
          onChange={handleEditorChange}
        />

        {/* ── Ghost lines inside the code viewport while Bedrock warms up ──
            Confined to the area below the editor chrome (36px title bar +
            36px tab bar) and above the 28px status bar, aligned after the
            line-number gutter so it never covers real chrome. ── */}
        <AnimatePresence>
          {awaitingFirstToken && (
            <motion.div
              className="absolute z-10 pointer-events-none space-y-3"
              style={{ top: 88, bottom: 44, left: 48, right: 24 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              aria-hidden
            >
              {[0.62, 0.78, 0.44].map((width, i) => (
                <motion.div
                  key={i}
                  className="h-[10px] rounded-md"
                  style={{
                    width: `${width * 60}%`,
                    background:
                      'linear-gradient(90deg, rgba(34,211,238,0.04), rgba(34,211,238,0.16), rgba(34,211,238,0.04))',
                    backgroundSize: '200% 100%',
                    boxShadow: '0 0 22px rgba(34,211,238,0.08)',
                  }}
                  animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
                  transition={{ duration: 1.7, repeat: Infinity, ease: 'linear', delay: i * 0.18 }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Typing indicator while tokens stream into the buffer ── */}
        <AnimatePresence>
          {isGeneratingCode && streamedChars > 0 && (
            <motion.div
              className="absolute top-3 right-4 z-10 pointer-events-none flex items-center gap-2 px-2.5 py-1 rounded-full select-none"
              style={{
                background: 'rgba(10, 14, 20, 0.85)',
                border: '1px solid rgba(34,211,238,0.25)',
                backdropFilter: 'blur(8px)',
              }}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              <span className="flex items-center gap-0.5" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1 h-1 rounded-full"
                    style={{ background: '#22d3ee' }}
                    animate={{ opacity: [0.25, 1, 0.25], y: [0, -2.5, 0] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.16, ease: 'easeInOut' }}
                  />
                ))}
              </span>
              <span className="text-[10px] font-mono" style={{ color: 'rgba(103,232,249,0.85)' }}>
                Nova likh raha hai… ~{tokenEstimate} tok
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Control strip ── */}
      <div
        className="shrink-0 flex items-center gap-2.5 px-2.5 h-12 rounded-xl"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
        role="toolbar"
        aria-label="Execution controls"
      >
        {/* Chalao (Run) — primary */}
        <div className="relative">
          <AnimatePresence>
            {isExecuting && (
              <motion.span
                className="absolute inset-0 rounded-lg"
                style={{ border: '1px solid rgba(0,255,163,0.6)' }}
                initial={{ opacity: 0.6, scale: 0.96 }}
                animate={{ opacity: [0.6, 0, 0.6], scale: [0.96, 1.06, 0.96] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
          </AnimatePresence>
          <motion.button
            type="button"
            onClick={onRun}
            disabled={!canRun}
            className="relative h-9 flex items-center justify-center gap-2 px-4 rounded-lg text-xs font-medium tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400/60 overflow-hidden group"
            style={{
              background: !canRun
                ? 'rgba(255,255,255,0.035)'
                : isExecuting
                  ? 'rgba(0,255,163,0.1)'
                  : 'rgba(0,255,163,0.13)',
              border: `1px solid ${!canRun ? 'rgba(255,255,255,0.06)' : 'rgba(0,255,163,0.4)'}`,
              color: !canRun ? 'rgba(255,255,255,0.22)' : '#00FFA3',
              boxShadow: canRun ? '0 0 16px rgba(0,255,163,0.1), inset 0 1px 0 rgba(0,255,163,0.1)' : 'none',
              cursor: !canRun ? 'not-allowed' : 'pointer',
            }}
            whileHover={canRun ? { scale: 1.02 } : {}}
            whileTap={canRun ? { scale: 0.97 } : {}}
            title="Run code (⌘ + Enter)"
          >
            <motion.span
              animate={isExecuting ? { rotate: 360 } : { rotate: 0 }}
              transition={isExecuting ? { duration: 1.6, repeat: Infinity, ease: 'linear' } : {}}
            >
              {isExecuting ? <Zap className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            </motion.span>
            <span>{isExecuting ? 'Chal raha hai…' : 'Chalao'}</span>
          </motion.button>
        </div>

        {/* Clear — destructive secondary (code buffer + terminal) */}
        <motion.button
          type="button"
          onClick={handleClearAll}
          className="h-9 flex items-center justify-center gap-2 px-4 rounded-lg text-xs font-medium text-slate-400 bg-white/[0.04] border border-white/[0.08] hover:border-red-500/40 hover:bg-red-500/[0.08] hover:text-red-400 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400/40"
          whileTap={{ scale: 0.97 }}
          title="Clear editor code and terminal output"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear</span>
        </motion.button>

        {/* Right side: exec time badge + engine status */}
        <div className="ml-auto flex items-center gap-2.5 select-none">
          {executionTime != null && !isExecuting && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono"
              style={{
                background: 'rgba(74,222,128,0.06)',
                border: '1px solid rgba(74,222,128,0.22)',
                color: 'rgba(74,222,128,0.8)',
              }}
              title="Last execution time"
            >
              ~{executionTime}ms
            </motion.span>
          )}
          {error && (
            <span
              className="px-2 py-0.5 rounded-md text-[10px] font-mono"
              style={{
                background: 'rgba(248,113,113,0.07)',
                border: '1px solid rgba(248,113,113,0.25)',
                color: 'rgba(248,113,113,0.8)',
              }}
            >
              ERROR
            </span>
          )}
          {!error && output.length > 0 && !isExecuting && (
            <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.22)' }}>
              {output.length} line{output.length !== 1 ? 's' : ''}
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${isWorkerReady ? 'bg-emerald-400' : 'bg-yellow-400 animate-pulse'}`}
              style={{ boxShadow: isWorkerReady ? '0 0 6px rgba(52,211,153,0.7)' : '0 0 6px rgba(251,191,36,0.7)' }}
            />
            <span className="text-[9px] font-mono tracking-[0.12em] uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {isWorkerReady ? 'Ready' : 'Booting'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Terminal dock ── */}
      <div className="shrink-0" style={{ height: '36%', minHeight: 210, maxHeight: '46%' }}>
        <TerminalDock />
      </div>
    </div>
  );
}
