'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ArchitectureModalProps {
  open: boolean;
  onClose: () => void;
}

const LAYERS = [
  {
    label: 'Interface',
    detail: 'Next.js 16 · React 19 · Monaco · Framer Motion',
    note: 'A fixed-viewport developer studio: split panes, terminal dock, command palette.',
  },
  {
    label: 'Intelligence',
    detail: 'AWS Bedrock · Amazon Nova Micro',
    note: 'Streams Hinglish → Python generation and Desi Debugger translations over NDJSON.',
  },
  {
    label: 'Voice',
    detail: 'Web Speech API · hi-IN recognition',
    note: 'On-device speech-to-text feeds the prompt shelf; no audio leaves the tab.',
  },
  {
    label: 'Runtime',
    detail: 'Pyodide (CPython · WebAssembly)',
    note: 'Python executes inside a Web Worker in your browser — 0ms server compute.',
  },
  {
    label: 'Persistence',
    detail: 'IndexedDB workspace · shareable URL hashes',
    note: 'Files, checkpoints and history survive refreshes without an account.',
  },
];

// ─── Architecture modal — opened from the landing navigation ──────────────────
export function ArchitectureModal({ open, onClose }: ArchitectureModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-10"
          style={{ background: 'rgba(4, 5, 8, 0.72)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Architecture"
        >
          <motion.div
            className="w-full max-w-xl overflow-hidden rounded-2xl"
            style={{
              background: '#0E1015',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.06), 0 40px 100px rgba(0,0,0,0.7)',
            }}
            initial={{ opacity: 0, y: -12, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div>
                <h2 className="text-sm font-semibold text-slate-100">Architecture</h2>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                  how codebhasha is wired · client-first by design
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full border border-white/[0.08] flex items-center justify-center font-mono text-slate-400 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
                aria-label="Close architecture"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {LAYERS.map((layer) => (
                <div
                  key={layer.label}
                  className="rounded-xl px-4 py-3"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <span className="text-xs font-semibold text-slate-200">{layer.label}</span>
                    <span className="text-[11px] font-mono text-emerald-400/90">{layer.detail}</span>
                  </div>
                  <p className="text-[12.5px] text-slate-400 leading-relaxed mt-1">{layer.note}</p>
                </div>
              ))}
            </div>

            <div
              className="px-5 py-3 text-[10px] font-mono text-slate-500"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              full source: github.com/Mehtab-24/Code-Bhasha · design doc: design.md
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
