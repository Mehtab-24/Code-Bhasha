'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Bug, Keyboard, Eye, Clock, ChevronRight, Lightbulb, AlertCircle, CheckCircle2, Wand2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useExecutionStore, type ExecutionError, type DebugResult, type OutputLine } from '@/store/useExecutionStore';
import { tokenizePython, TOKEN_COLORS } from '@/lib/python-highlight';
import { TracerPanel } from '@/components/Editor/TracerPanel';

type DockTab = 'output' | 'debugger' | 'stdin' | 'tracer';

// ─── Python line with brand token colors ──────────────────────────────────────
function CodeLine({ line, tint }: { line: string; tint?: 'error' | 'fix' }) {
  return (
    <span
      className="font-mono text-xs whitespace-pre-wrap"
      style={{ color: tint === 'error' ? '#fca5a5' : tint === 'fix' ? '#86efac' : undefined }}
    >
      {tokenizePython(line).map((token, i) => (
        <span
          key={i}
          style={{
            color:
              tint === 'error'
                ? `color-mix(in oklab, ${TOKEN_COLORS[token.type]} 55%, #fca5a5)`
                : tint === 'fix'
                  ? `color-mix(in oklab, ${TOKEN_COLORS[token.type]} 55%, #86efac)`
                  : TOKEN_COLORS[token.type],
          }}
        >
          {token.text}
        </span>
      ))}
    </span>
  );
}

// ─── Output tab ───────────────────────────────────────────────────────────────
function OutputContent({
  output,
  isExecuting,
  executionTime,
}: {
  output: OutputLine[];
  isExecuting: boolean;
  executionTime: number | null;
}) {
  const isEmpty = !isExecuting && output.length === 0;
  const bottomRef = useRef<HTMLDivElement>(null);

  // Keep the newest lines in view while streaming
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [output.length]);

  return (
    <div className="relative h-full">
      {isExecuting && (
        <motion.div
          className="flex items-center gap-3 pb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3].map((i) => (
              <motion.span
                key={i}
                className="w-1 h-1 rounded-full"
                style={{ background: '#22d3ee', boxShadow: '0 0 4px rgba(34,211,238,0.8)' }}
                animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
              />
            ))}
          </div>
          <span className="text-[11px] font-mono tracking-[0.2em]" style={{ color: 'rgba(34,211,238,0.7)' }}>
            EXECUTING
          </span>
        </motion.div>
      )}

      {isEmpty && (
        <div className="h-full flex flex-col items-center justify-center gap-2.5 select-none">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <Terminal className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.2)' }} />
          </div>
          <p className="text-[11px] font-mono text-center" style={{ color: 'rgba(255,255,255,0.22)' }}>
            Code chalane ke liye{' '}
            <span style={{ color: 'rgba(74,222,128,0.55)' }}>▶ Chalao</span> dabao — ya{' '}
            <span style={{ color: 'rgba(34,211,238,0.5)' }}>⌘ + Enter</span>
          </p>
        </div>
      )}

      {output.length > 0 && (
        <div className="space-y-0.5">
          {output.map((line, i) => (
            <motion.div
              key={line.id || i}
              className="flex items-start gap-2"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18, delay: Math.min(i * 0.03, 0.3), ease: 'easeOut' }}
            >
              <ChevronRight
                className="shrink-0 opacity-30"
                style={{ width: 11, height: 11, color: line.type === 'stderr' ? '#fbbf24' : '#4ade80', marginTop: 4 }}
              />
              <span
                className="font-mono text-[13px] leading-relaxed break-all"
                style={{
                  color: line.text.trim() === '' ? 'transparent' : line.type === 'stderr' ? '#fcd34d' : '#4ade80',
                  textShadow:
                    line.text.trim() === ''
                      ? 'none'
                      : line.type === 'stderr'
                        ? '0 0 8px rgba(251,191,36,0.25)'
                        : '0 0 8px rgba(74,222,128,0.3)',
                  minHeight: '1.4em',
                }}
              >
                {line.text.trim() === '' ? '\u00A0' : line.text}
              </span>
            </motion.div>
          ))}
          {!isExecuting && (
            <motion.span
              className="inline-block align-middle ml-6 mt-1"
              style={{ width: 7, height: 14, background: '#4ade80', boxShadow: '0 0 6px rgba(74,222,128,0.8)' }}
              animate={{ opacity: [1, 1, 0, 0] }}
              transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1], ease: 'linear' }}
            />
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {executionTime != null && !isExecuting && output.length > 0 && (
        <motion.div
          className="flex items-center gap-2 mt-3 pt-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          <Clock className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.2)' }} />
          <span className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.28)' }}>
            exited in <span style={{ color: 'rgba(74,222,128,0.6)' }}>{executionTime}ms</span>
          </span>
        </motion.div>
      )}
    </div>
  );
}

// ─── Desi Debugger tab: high-fidelity diagnostic inspector ────────────────────
// Left region: conversational Hinglish mentor card (avatar, error summary,
// explanation). Right region: broken-vs-corrected code diff with one-click
// Apply Fix that patches the active editor buffer via the existing store.

// The debug API sometimes folds every section into `friendly_message` with
// plain-text markers (legacy wire format). This display-side normalizer pulls
// them apart; proper per-field responses pass through untouched.
function splitDiagnostic(raw: string): { message: string; fix?: string; corrected?: string } {
  let message = raw;
  let fix: string | undefined;
  let corrected: string | undefined;
  const correctedIndex = message.indexOf('---CORRECTED_LINE---');
  if (correctedIndex !== -1) {
    corrected = message.slice(correctedIndex + '---CORRECTED_LINE---'.length);
    message = message.slice(0, correctedIndex);
  }
  const fixIndex = message.indexOf('---FIX_SUGGESTION---');
  if (fixIndex !== -1) {
    fix = message.slice(fixIndex + '---FIX_SUGGESTION---'.length);
    message = message.slice(0, fixIndex);
  }
  return { message: message.trim(), fix: fix?.trim() || undefined, corrected: corrected?.trim() || undefined };
}

function DebuggerContent({
  error,
  debugResult,
  isFetchingDebug,
}: {
  error: ExecutionError | null;
  debugResult: DebugResult | null;
  isFetchingDebug: boolean;
}) {
  const { files, activeFileId, updateFileContent } = useExecutionStore();
  const [applied, setApplied] = useState(false);

  // A new error resets the Apply Fix button
  useEffect(() => {
    setApplied(false);
  }, [error]);

  const parsed = useMemo(
    () => splitDiagnostic(debugResult?.friendly_message ?? ''),
    [debugResult?.friendly_message]
  );
  const friendlyMessage = parsed.message || undefined;
  const fixSuggestion = debugResult?.fix_suggestion?.trim() || parsed.fix;
  // Prefer the dedicated field; fall back to the marker-embedded payload.
  const correctedLine = debugResult?.corrected_line?.trim() || parsed.corrected;
  const hasCorrection =
    !!correctedLine && !!error?.line_text && correctedLine.trim() !== error.line_text.trim();
  const isThinking = isFetchingDebug && !friendlyMessage;

  const applyFix = () => {
    if (!error || !correctedLine || !error.lineno) return;
    const file = files.find((f) => f.id === activeFileId);
    if (!file) return;
    const lines = file.content.split('\n');
    const index = error.lineno - 1;
    if (index < 0 || index >= lines.length) return;
    const replacementLines = correctedLine
      .replace(/\r/g, '')
      .replace(/\n+$/, '')
      .split('\n');
    lines.splice(index, 1, ...replacementLines);
    updateFileContent(activeFileId, lines.join('\n'));
    window.dispatchEvent(
      new CustomEvent('codebhasha:highlight-line', {
        detail: { startLine: error.lineno, endLine: error.lineno + replacementLines.length - 1 },
      })
    );
    setApplied(true);
  };

  return (
    <div className="h-full grid gap-3 content-start lg:grid-cols-2">
      {/* ════ Left region: conversational Hinglish mentor card ════ */}
      <div
        className="rounded-xl p-3.5 space-y-3 self-start"
        style={{
          background: 'rgba(167,139,250,0.05)',
          border: '1px solid rgba(167,139,250,0.18)',
          boxShadow: '0 0 20px rgba(167,139,250,0.06), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <motion.div
            className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #a78bfa, #22d3ee)',
              boxShadow: '0 0 16px rgba(167,139,250,0.35), inset 0 1px 0 rgba(255,255,255,0.35)',
            }}
            animate={error ? { scale: [1, 1.05, 1] } : {}}
            transition={error ? { duration: 2.4, repeat: Infinity } : {}}
          >
            <Bug className="w-4.5 h-4.5" style={{ color: '#0a0d13' }} />
          </motion.div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white leading-tight">Desi Debugger</p>
            <p className="text-[10px] font-mono" style={{ color: 'rgba(167,139,250,0.72)' }}>
              Hinglish Code Mentor
            </p>
          </div>
          {error && (
            <span
              className="ml-auto font-mono text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}
            >
              {error.type}
            </span>
          )}
          {error && error.lineno > 0 && (
            <span
              className="font-mono text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }}
            >
              line {error.lineno}
            </span>
          )}
        </div>

        <AnimatePresence mode="wait">
          {error ? (
            <motion.div
              key="mentor-error"
              className="space-y-2.5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            >
              {/* Raw error summary */}
              <p
                className="font-mono text-[11px] leading-relaxed rounded-lg p-2.5"
                style={{
                  color: 'rgba(252,165,165,0.82)',
                  background: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.16)',
                }}
              >
                {error.message}
              </p>

              {/* Mentor's Hinglish explanation */}
              {isThinking ? (
                <div className="flex items-center gap-2.5 py-1">
                  <motion.span
                    className="w-3.5 h-3.5 rounded-full shrink-0"
                    style={{ border: '2px solid rgba(167,139,250,0.3)', borderTopColor: '#a78bfa' }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                  <span className="text-[11px] font-mono" style={{ color: 'rgba(167,139,250,0.7)' }}>
                    Mentor soch raha hai…
                  </span>
                </div>
              ) : friendlyMessage ? (
                <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.86)' }}>
                  {friendlyMessage}
                </p>
              ) : null}

              {/* Fix suggestion */}
              {fixSuggestion && (
                <div
                  className="rounded-lg p-2.5"
                  style={{ background: 'rgba(0,0,0,0.26)', border: '1px solid rgba(167,139,250,0.14)' }}
                >
                  <span
                    className="text-[10px] font-mono tracking-[0.16em] uppercase"
                    style={{ color: 'rgba(0,255,163,0.7)' }}
                  >
                    🔧 Fix
                  </span>
                  <p className="text-[11px] font-mono leading-relaxed mt-1" style={{ color: 'rgba(0,255,163,0.82)' }}>
                    {fixSuggestion}
                  </p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="mentor-calm"
              className="flex flex-col items-center gap-2 py-5 select-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <span className="text-2xl">😌</span>
              <p className="text-[11px] font-mono text-center leading-relaxed" style={{ color: 'rgba(255,255,255,0.24)' }}>
                Koi error nahi mili.{' '}
                <span style={{ color: 'rgba(74,222,128,0.4)' }}>Sab theek hai!</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ════ Right region: code diff + Apply Fix ════ */}
      <div className="space-y-2.5 self-start">
        {error?.line_text || hasCorrection ? (
          <div
            className="rounded-xl overflow-hidden font-mono text-xs"
            style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.3)' }}
          >
            <div
              className="px-3 py-1.5 text-[9px] font-mono tracking-[0.18em] uppercase select-none flex items-center justify-between"
              style={{
                background: 'rgba(255,255,255,0.025)',
                color: 'rgba(255,255,255,0.25)',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <span>Code Diff</span>
              {error && error.lineno > 0 && <span>line {error.lineno}</span>}
            </div>
            {error?.line_text && (
              <div
                className="flex items-start gap-2.5 px-3 py-2"
                style={{
                  background: 'rgba(248,113,113,0.05)',
                  borderLeft: '2px solid rgba(248,113,113,0.55)',
                }}
              >
                <span className="select-none shrink-0" style={{ color: 'rgba(248,113,113,0.7)' }}>-</span>
                <CodeLine line={error.line_text} tint="error" />
              </div>
            )}
            {hasCorrection && (
              <div
                className="flex items-start gap-2.5 px-3 py-2"
                style={{
                  background: 'rgba(74,222,128,0.05)',
                  borderLeft: '2px solid rgba(74,222,128,0.55)',
                  borderTop: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <span className="select-none shrink-0" style={{ color: 'rgba(74,222,128,0.8)' }}>+</span>
                <CodeLine line={correctedLine!} tint="fix" />
              </div>
            )}
          </div>
        ) : error ? (
          <div
            className="rounded-xl p-3.5 text-center select-none"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.09)' }}
          >
            <p className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Mentor ka suggested fix aate hi yahan diff dikhega
            </p>
          </div>
        ) : null}

        {/* One-click Apply Fix */}
        {error && hasCorrection && !applied && (
          <motion.button
            type="button"
            onClick={applyFix}
            className="relative w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold tracking-wide overflow-hidden group cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400/60"
            style={{
              background: 'rgba(0,255,163,0.1)',
              border: '1px solid rgba(0,255,163,0.4)',
              color: '#00FFA3',
              boxShadow: '0 0 18px rgba(0,255,163,0.1), inset 0 1px 0 rgba(0,255,163,0.12)',
            }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.span
              className="absolute inset-0 opacity-0 group-hover:opacity-100"
              style={{
                background: 'linear-gradient(105deg, transparent 40%, rgba(0,255,163,0.08) 50%, transparent 60%)',
              }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1.3, repeat: Infinity, repeatDelay: 1.4 }}
            />
            <Wand2 className="w-3.5 h-3.5 relative" />
            <span className="relative">
              Apply Fix — line {error.lineno} replace karo
            </span>
          </motion.button>
        )}
        {applied && (
          <motion.div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{
              background: 'rgba(0,255,163,0.07)',
              border: '1px solid rgba(0,255,163,0.25)',
              color: 'rgba(0,255,163,0.85)',
            }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <p className="text-[11px] font-mono">
              Fix editor buffer mein apply ho gaya — <span style={{ color: 'rgba(0,255,163,1)' }}>▶ Chalao</span> dabake dekho
            </p>
          </motion.div>
        )}

        {error && !isFetchingDebug && !hasCorrection && !applied && friendlyMessage && (
          <div
            className="rounded-xl p-3 flex items-start gap-2"
            style={{ background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.1)' }}
          >
            <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'rgba(167,139,250,0.5)' }} />
            <p className="text-[10.5px] font-mono leading-relaxed" style={{ color: 'rgba(167,139,250,0.5)' }}>
              Is error ka one-line fix nahi mila — upar mentor ki guidance follow karke khud theek karo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Standard Input tab ───────────────────────────────────────────────────────
function StdinContent() {
  const { stdinContent, setStdinContent, files, activeFileId } = useExecutionStore();

  const inputCount = useMemo(() => {
    const activeFile = files.find((f) => f.id === activeFileId);
    if (!activeFile?.content) return 0;
    const matches = activeFile.content.match(/input\(/g);
    return matches ? matches.length : 0;
  }, [files, activeFileId]);

  const hasInputCalls = inputCount > 0;

  return (
    <div className="h-full flex flex-col">
      <p className="text-[10.5px] font-mono select-none" style={{ color: 'rgba(255,255,255,0.22)' }}>
        {!hasInputCalls
          ? 'Koi input() nahi mila — optional.'
          : `${inputCount} input${inputCount !== 1 ? 's' : ''} chahiye — ek per line, order mein.`}
      </p>
      <textarea
        value={stdinContent}
        onChange={(e) => setStdinContent(e.target.value)}
        placeholder={
          hasInputCalls
            ? `Enter ${inputCount} input${inputCount !== 1 ? 's' : ''} here (one per line)…`
            : 'Enter inputs here (optional, one per line)…'
        }
        className="w-full flex-1 min-h-[120px] mt-2 p-3 rounded-xl bg-transparent resize-none font-mono text-[13px] leading-relaxed focus:outline-none"
        style={{
          color: 'rgba(255,255,255,0.72)',
          caretColor: '#a78bfa',
          background: 'rgba(0,0,0,0.28)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
        spellCheck={false}
        aria-label="Standard input"
      />
    </div>
  );
}

// ─── Dock tab button ──────────────────────────────────────────────────────────
function DockTabButton({
  id,
  activeTab,
  onSelect,
  icon: Icon,
  label,
  accent,
  badge,
  pulse,
}: {
  id: DockTab;
  activeTab: DockTab;
  onSelect: (tab: DockTab) => void;
  icon: React.ElementType;
  label: string;
  accent: string;
  badge?: React.ReactNode;
  /** gentle attention pulse (e.g. when an error routes here) */
  pulse?: boolean;
}) {
  const isActive = id === activeTab;
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(id)}
      aria-selected={isActive}
      role="tab"
      animate={pulse ? { scale: [1, 1.04, 1] } : { scale: 1 }}
      transition={pulse ? { duration: 0.9, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
      className={`relative flex items-center gap-1.5 px-3.5 h-full text-xs font-medium tracking-wide select-none transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/25 rounded-t-md whitespace-nowrap shrink-0 ${
        isActive ? 'font-semibold' : ''
      }`}
      style={{ color: isActive ? accent : 'rgba(255,255,255,0.4)' }}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{label}</span>
      {badge}
      {isActive && (
        <motion.span
          className="absolute bottom-0 left-1 right-1 h-[2px] rounded-full"
          style={{ background: accent, boxShadow: `0 0 8px ${accent}90` }}
          layoutId="dock-tab-indicator"
          transition={{ type: 'spring', stiffness: 480, damping: 38 }}
        />
      )}
    </motion.button>
  );
}

// ─── Main Terminal Dock ───────────────────────────────────────────────────────
export function TerminalDock() {
  const { output, error, isExecuting, executionTime, debugResult, isFetchingDebug } =
    useExecutionStore();
  const [activeTab, setActiveTab] = useState<DockTab>('output');
  const [errorFlash, setErrorFlash] = useState(false);

  // Auto-switch: error → Desi Debugger (with a brief red flash), run → Output
  const prevErrorRef = useRef<ExecutionError | null>(null);
  useEffect(() => {
    if (error && prevErrorRef.current === null) {
      setActiveTab('debugger');
      setErrorFlash(true);
      const timeout = setTimeout(() => setErrorFlash(false), 1500);
      prevErrorRef.current = error;
      return () => clearTimeout(timeout);
    }
    prevErrorRef.current = error;
  }, [error]);

  useEffect(() => {
    if (isExecuting) setActiveTab('output');
  }, [isExecuting]);

  return (
    <div
      className="h-full flex flex-col overflow-hidden rounded-xl relative"
      style={{
        background: 'rgba(6, 8, 12, 0.92)',
        border: `1px solid ${errorFlash ? 'rgba(248,113,113,0.4)' : 'rgba(255,255,255,0.08)'}`,
        boxShadow: errorFlash
          ? '0 0 28px rgba(248,113,113,0.12), inset 0 1px 0 rgba(255,255,255,0.05)'
          : '0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
        transition: 'border-color 0.35s ease, box-shadow 0.35s ease',
      }}
      role="tabpanel"
    >
      {/* CRT scanlines */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.07) 3px, rgba(0,0,0,0.07) 4px)',
        }}
        aria-hidden
      />

      {/* ── Tab bar ── */}
      <div
        className="relative z-10 shrink-0 flex items-stretch h-9 overflow-x-auto scrollbar-hide"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.02)',
        }}
        role="tablist"
        aria-label="Terminal dock"
      >
        <DockTabButton
          id="output"
          activeTab={activeTab}
          onSelect={setActiveTab}
          icon={Terminal}
          label="Output"
          accent="#4ade80"
          badge={
            executionTime != null && !isExecuting ? (
              <span className="ml-0.5 font-mono tabular-nums text-[10px]" style={{ color: 'rgba(74,222,128,0.6)' }}>
                {executionTime}ms
              </span>
            ) : undefined
          }
        />
        <DockTabButton
          id="debugger"
          activeTab={activeTab}
          onSelect={setActiveTab}
          icon={Bug}
          label="Desi Debugger"
          accent="#f87171"
          pulse={errorFlash}
          badge={
            error ? (
              <motion.span
                className="w-1.5 h-1.5 rounded-full ml-0.5"
                style={{ background: '#f87171', boxShadow: '0 0 6px rgba(248,113,113,0.9)' }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
            ) : undefined
          }
        />
        <DockTabButton
          id="stdin"
          activeTab={activeTab}
          onSelect={setActiveTab}
          icon={Keyboard}
          label="Standard Input"
          accent="#a78bfa"
        />
        <DockTabButton
          id="tracer"
          activeTab={activeTab}
          onSelect={setActiveTab}
          icon={Eye}
          label="Visual Tracer"
          accent="#c4b5fd"
        />

        <div className="flex-1 min-w-[16px]" />
        <div className="flex items-center pr-3.5 select-none">
          <span className="font-mono hidden sm:inline" style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.18em' }}>
            TERMINAL DOCK
          </span>
        </div>
      </div>

      {/* ── Content ── */}
      <div
        className="relative z-10 flex-1 min-h-0 overflow-y-auto p-3.5"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            className="h-full min-h-0"
            initial={{ opacity: 0, y: 10, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.995 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34, opacity: { duration: 0.16 } }}
          >
            {activeTab === 'output' && (
              <OutputContent output={output} isExecuting={isExecuting} executionTime={executionTime} />
            )}
            {activeTab === 'debugger' && (
              <DebuggerContent error={error} debugResult={debugResult} isFetchingDebug={isFetchingDebug} />
            )}
            {activeTab === 'stdin' && <StdinContent />}
            {activeTab === 'tracer' && <TracerPanel />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Status bar ── */}
      <div
        className="relative z-10 shrink-0 flex items-center justify-between px-4 py-2"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.04)',
          background: 'rgba(0,0,0,0.5)',
        }}
      >
        <div className="flex items-center gap-2.5 select-none">
          <span
            className="w-1 h-1 rounded-full"
            style={{
              background: isExecuting ? '#22d3ee' : error ? '#f87171' : 'rgba(255,255,255,0.15)',
              boxShadow: isExecuting
                ? '0 0 4px rgba(34,211,238,0.8)'
                : error
                  ? '0 0 4px rgba(248,113,113,0.8)'
                  : 'none',
            }}
          />
          <span className="font-mono text-[11px] text-slate-400 tabular-nums tracking-wide">
            {isExecuting
              ? 'RUNNING'
              : error
                ? 'ERROR'
                : output.length > 0
                  ? `${output.length} LINE${output.length !== 1 ? 'S' : ''}`
                  : 'IDLE'}
          </span>
          {error && (
            <span className="flex items-center gap-1 font-mono text-[11px] text-slate-400 tabular-nums tracking-wide">
              <AlertCircle className="w-3 h-3" style={{ color: 'rgba(248,113,113,0.6)' }} />
              DEBUGGER ACTIVE
            </span>
          )}
        </div>
        <span className="font-mono text-[11px] text-slate-400 tabular-nums tracking-wide select-none">
          PYTHON 3 · PYODIDE
        </span>
      </div>
    </div>
  );
}
