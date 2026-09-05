'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Play } from 'lucide-react';
import { tokenizePython, TOKEN_COLORS } from '@/lib/python-highlight';

// ─── Phases of the auto-playing demo loop ─────────────────────────────────────
// listening → transcribing → compiling → coding → running → done → (next example)
type Phase = 'listening' | 'transcribing' | 'compiling' | 'coding' | 'running' | 'done';

interface DemoExample {
  prompt: string;
  code: string;
  output: string[];
  time: string;
}

// Same flavour of Hinglish prompts the playground ships with
const EXAMPLES: DemoExample[] = [
  {
    prompt: 'bhai 1 se 10 tak odd numbers print karo',
    code: 'for i in range(1, 11, 2):\n    print(i, end=" ")',
    output: ['1 3 5 7 9'],
    time: '0.03s',
  },
  {
    prompt: 'naam ko uppercase mein print karo',
    code: 'naam = "CodeBhasha"\nprint(naam.upper())',
    output: ['CODEBHASHA'],
    time: '0.02s',
  },
  {
    prompt: 'do numbers ka sum nikalne ka function banao',
    code: 'def jodo(a, b):\n    return a + b\n\nprint(jodo(7, 5))',
    output: ['12'],
    time: '0.04s',
  },
];

// Height of the code well is fixed to the tallest example so the card
// never changes size mid-loop.
const CODE_WELL_LINES = Math.max(...EXAMPLES.map((e) => e.code.split('\n').length));

const PHASE_META: Record<Phase, { label: string; color: string }> = {
  listening: { label: 'listening', color: '#34D399' },
  transcribing: { label: 'transcribing', color: '#34D399' },
  compiling: { label: 'compiling', color: '#A2A8B3' },
  coding: { label: 'writing python', color: '#A2A8B3' },
  running: { label: 'running', color: '#34D399' },
  done: { label: 'done', color: '#34D399' },
};

// ─── Waveform: idle ticks when silent, dancing bars while "recording" ─────────
const WAVE_HEIGHTS = [9, 15, 21, 12, 23, 10, 17, 22, 11, 19, 13, 22, 10, 16, 9, 14];

function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-end gap-[3px] h-6 shrink-0" aria-hidden>
      {WAVE_HEIGHTS.map((h, i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full"
          style={{
            background: active ? 'rgba(52, 211, 153, 0.85)' : 'rgba(255,255,255,0.10)',
          }}
          animate={active ? { height: [h * 0.35, h, h * 0.55, h * 1.05, h * 0.45] } : { height: 3 }}
          transition={
            active
              ? { duration: 0.9 + (i % 4) * 0.14, repeat: Infinity, ease: 'easeInOut', delay: i * 0.05 }
              : { duration: 0.35 }
          }
        />
      ))}
    </div>
  );
}

// ─── MicDot: mic chip with a ripple ring while active ─────────────────────────
function MicDot({ active }: { active: boolean }) {
  return (
    <div
      className="relative w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300"
      style={{
        background: active ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${active ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.08)'}`,
      }}
    >
      {active && (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ border: '1px solid rgba(52,211,153,0.35)' }}
          animate={{ scale: [1, 1.7], opacity: [0.7, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
      <Mic className="w-3.5 h-3.5" style={{ color: active ? '#34D399' : 'rgba(255,255,255,0.35)' }} />
    </div>
  );
}

// ─── Main MicroDemo ─────────────────────────────────────────────────────────────
export function MicroDemo() {
  const [exampleIndex, setExampleIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('listening');
  const [promptChars, setPromptChars] = useState(0);
  const [codeChars, setCodeChars] = useState(0);
  const [outputLines, setOutputLines] = useState(0);
  const [reduced] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  // Single effect drives the whole state machine: each state change
  // schedules the next transition; cleanup clears the pending timer.
  useEffect(() => {
    const ex = EXAMPLES[exampleIndex];
    const fast = reduced;
    let timer: ReturnType<typeof setTimeout>;

    switch (phase) {
      case 'listening':
        setPromptChars(0);
        timer = setTimeout(() => setPhase('transcribing'), fast ? 300 : 1300);
        break;
      case 'transcribing':
        if (promptChars < ex.prompt.length) {
          timer = setTimeout(() => setPromptChars((c) => c + 1), fast ? 0 : 32);
        } else {
          timer = setTimeout(() => setPhase('compiling'), fast ? 250 : 650);
        }
        break;
      case 'compiling':
        timer = setTimeout(() => setPhase('coding'), fast ? 300 : 1000);
        break;
      case 'coding':
        if (codeChars < ex.code.length) {
          timer = setTimeout(() => setCodeChars((c) => c + 1), fast ? 0 : 26);
        } else {
          timer = setTimeout(() => setPhase('running'), fast ? 250 : 500);
        }
        break;
      case 'running':
        if (outputLines < ex.output.length) {
          timer = setTimeout(() => setOutputLines((n) => n + 1), fast ? 100 : 320);
        } else {
          timer = setTimeout(() => setPhase('done'), fast ? 400 : 1500);
        }
        break;
      case 'done':
        timer = setTimeout(() => {
          setExampleIndex((i) => (i + 1) % EXAMPLES.length);
          setPromptChars(0);
          setCodeChars(0);
          setOutputLines(0);
          setPhase('listening');
        }, fast ? 600 : 2300);
        break;
    }
    return () => clearTimeout(timer);
  }, [phase, exampleIndex, promptChars, codeChars, outputLines, reduced]);

  const ex = EXAMPLES[exampleIndex];
  const promptText = ex.prompt.slice(0, promptChars);
  const promptDone = promptChars >= ex.prompt.length;
  const typedCode = ex.code.slice(0, codeChars);
  const typedLines = typedCode.split('\n');
  const codeLines = ex.code.split('\n');
  const isMicActive = phase === 'listening' || phase === 'transcribing';
  const meta = PHASE_META[phase];
  const outputComplete = outputLines >= ex.output.length;

  return (
    <div
      className="lp-card relative rounded-2xl overflow-hidden text-left w-full flex-1 flex flex-col"
      aria-label="Live demo: Hinglish voice prompt compiling to Python"
    >
      {/* ── Window chrome ── */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          borderBottom: '1px solid var(--lp-border)',
          background: 'rgba(255,255,255,0.015)',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-2 h-2 rounded-full shrink-0" style={{ background: 'rgba(255,255,255,0.12)' }} />
          ))}
          <span className="ml-2.5 text-[11px] font-mono tracking-wide truncate" style={{ color: 'var(--lp-text-3)' }}>
            codebhasha · live preview
          </span>
        </div>
        {/* Fixed-height slot: AnimatePresence mode="wait" unmounts the chip
            between phases — without a reserved slot the header row (and the
            whole card) would shrink and regrow every phase change. */}
        <div className="h-[22px] flex items-center shrink-0">
          <AnimatePresence mode="wait">
            <motion.span
              key={phase}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-[0.12em] shrink-0"
              style={{ border: '1px solid rgba(255,255,255,0.08)', color: meta.color }}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.18 }}
            >
              <motion.span
                className="w-1 h-1 rounded-full"
                style={{ background: meta.color }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
              {meta.label}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Dual-state body: spoken Hinglish → compiling Python ── */}
      <div className="grid md:grid-cols-2 md:divide-x md:divide-white/[0.06] flex-1">
        {/* Input state */}
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-[0.16em] uppercase select-none" style={{ color: 'var(--lp-text-3)' }}>
              Input · Hinglish
            </span>
            <span
              className="text-[10px] font-mono uppercase tracking-[0.14em] select-none"
              style={{ color: isMicActive ? '#34D399' : 'rgba(255,255,255,0.2)' }}
            >
              {isMicActive ? 'mic live' : 'input'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <MicDot active={isMicActive} />
            <Waveform active={isMicActive} />
          </div>
          <p
            className="font-mono text-[13px] leading-relaxed min-h-[60px] text-slate-200"
            style={{ color: 'rgba(231,233,238,0.9)' }}
          >
            {phase === 'listening' && promptChars === 0 ? (
              <span style={{ color: 'var(--lp-text-3)' }}>&ldquo;suno&hellip;&rdquo;</span>
            ) : (
              <>
                <span style={{ color: 'var(--lp-text-3)' }}>&ldquo;</span>
                {promptText}
                {phase === 'transcribing' && <span className="lp-caret" />}
                {promptDone && <span style={{ color: 'var(--lp-text-3)' }}>&rdquo;</span>}
              </>
            )}
          </p>
        </div>

        {/* Output state: syntax-highlighted Python typing itself out */}
        <div className="p-4 flex flex-col gap-3 md:border-l" style={{ borderColor: 'var(--lp-border)' }}>
          <span className="text-[10px] font-mono tracking-[0.16em] uppercase select-none" style={{ color: 'var(--lp-text-3)' }}>
            Output · Python
          </span>
          {/* Fixed well height (tallest example): as characters type, lines may
              soft-wrap on narrow screens — a fixed height with overflow-hidden
              keeps those re-wraps from resizing the card and shifting the page. */}
          <div
            className="font-mono text-[12.5px] leading-[1.7] overflow-hidden"
            style={{ height: CODE_WELL_LINES * 21 + 4 }}
          >
            {codeLines.map((line, i) => {
              const content = typedLines[i] ?? '';
              const caretHere = phase === 'coding' && typedLines.length - 1 === i;
              return (
                <div key={i} className="flex">
                  <span
                    className="w-5 shrink-0 select-none text-right pr-3 text-[11px]"
                    style={{ color: content ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.09)' }}
                  >
                    {i + 1}
                  </span>
                  <span className="whitespace-pre-wrap break-all">
                    {tokenizePython(content).map((t, j) => (
                      <span key={j} style={{ color: TOKEN_COLORS[t.type] }}>{t.text}</span>
                    ))}
                    {caretHere && <span className="lp-caret" />}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Result strip ──
          Fixed height: the streaming caret and the "✓ time" chip appear and
          disappear mid-loop — a fixed row keeps them from resizing the card. */}
      <div
        className="flex items-center gap-3 px-4 h-[42px] overflow-hidden font-mono text-[12px]"
        style={{ borderTop: '1px solid var(--lp-border)', background: 'rgba(255,255,255,0.012)' }}
      >
        <span className="flex items-center gap-1.5 text-[11px] shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>
          <Play className="w-3 h-3" /> python main.py
        </span>
        <span className="truncate" style={{ color: 'rgba(52,211,153,0.85)' }}>
          {ex.output.slice(0, outputLines).join('  ')}
          {phase === 'running' && <span className="lp-caret" />}
        </span>
        {outputComplete && (phase === 'running' || phase === 'done') && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="ml-auto text-[10px] px-1.5 py-0.5 rounded shrink-0"
            style={{ color: 'rgba(52,211,153,0.85)', border: '1px solid rgba(52,211,153,0.25)' }}
          >
            ✓ {ex.time}
          </motion.span>
        )}
      </div>

      {/* Loop indicator */}
      <div className="flex items-center justify-center gap-1.5 pb-3 pt-1" aria-hidden>
        {EXAMPLES.map((_, i) => (
          <span
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === exampleIndex ? 14 : 5,
              height: 5,
              background: i === exampleIndex ? 'rgba(52,211,153,0.65)' : 'rgba(255,255,255,0.12)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
