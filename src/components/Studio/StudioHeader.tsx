'use client';

import { motion } from 'framer-motion';
import { HelpCircle, Sparkles, PanelLeft } from 'lucide-react';
import Link from 'next/link';
import { useExecutionStore } from '@/store/useExecutionStore';

interface StudioHeaderProps {
  onOpenTutorial: () => void;
  intentOpen: boolean;
  onToggleIntent: () => void;
}

// ─── Compact studio top bar: identity · tutor · help ──────────────────────────
// Auth UI is intentionally absent for now — the authSlice/store logic remains
// in place for when login + database flows are wired up properly.
export function StudioHeader({ onOpenTutorial, intentOpen, onToggleIntent }: StudioHeaderProps) {
  const { isTutorOpen, setTutorOpen } = useExecutionStore();

  return (
    <motion.header
      className="shrink-0 relative z-40 flex items-center justify-between gap-3 px-4 h-12"
      style={{
        background: 'rgba(10, 13, 19, 0.85)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* ── Identity ── */}
      <div className="flex items-center gap-3 min-w-0">
        <Link href="/" className="flex items-center gap-2.5 group min-w-0" title="Back to landing">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0"
            style={{
              background: 'linear-gradient(135deg, #22d3ee, #a78bfa)',
              color: '#05070c',
              boxShadow: '0 0 14px rgba(34,211,238,0.25), inset 0 1px 0 rgba(255,255,255,0.3)',
            }}
          >
            CB
          </span>
          <span className="text-sm font-semibold tracking-tight text-white whitespace-nowrap">
            CodeBhasha
          </span>
        </Link>
        <span
          className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[9px] font-mono font-semibold tracking-[0.18em] uppercase select-none"
          style={{
            background: 'rgba(34,211,238,0.08)',
            border: '1px solid rgba(34,211,238,0.22)',
            color: 'rgba(103,232,249,0.8)',
          }}
        >
          Studio
        </span>
        <span
          className="hidden lg:inline text-[11px] truncate select-none"
          style={{ color: 'rgba(255,255,255,0.24)' }}
        >
          Syntax is a barrier; Logic is universal
        </span>
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center gap-2">
        <span className="w-px h-5" style={{ background: 'rgba(255,255,255,0.08)' }} />

        {/* Intent panel toggle (⌘B focus mode) — desktop split pane only */}
        <motion.button
          type="button"
          onClick={onToggleIntent}
          className="max-lg:hidden p-1.5 rounded-lg transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/40"
          style={{
            background: intentOpen ? 'rgba(34,211,238,0.07)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${intentOpen ? 'rgba(34,211,238,0.25)' : 'rgba(255,255,255,0.08)'}`,
            color: intentOpen ? '#67e8f9' : 'rgba(255,255,255,0.42)',
          }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.95 }}
          title={intentOpen ? 'Hide intent panel (⌘B)' : 'Show intent panel (⌘B)'}
          aria-pressed={intentOpen}
          aria-label="Toggle intent panel"
        >
          <PanelLeft className="w-4 h-4" />
        </motion.button>

        <motion.button
          type="button"
          onClick={() => setTutorOpen(!isTutorOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-400/50 font-sans"
          style={{
            color: isTutorOpen ? '#a78bfa' : 'rgba(255,255,255,0.42)',
            border: `1px solid ${isTutorOpen ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.08)'}`,
            background: isTutorOpen ? 'rgba(167,139,250,0.07)' : 'rgba(255,255,255,0.02)',
          }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          title="Desi Tutor (Socratic Hinglish AI)"
          aria-pressed={isTutorOpen}
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0 text-purple-400" />
          <span className="hidden md:inline text-xs font-medium leading-none text-purple-300">
            Bhai Se Pucho
          </span>
        </motion.button>

        <motion.button
          type="button"
          onClick={onOpenTutorial}
          className="w-8 h-8 rounded-full border border-white/[0.08] flex items-center justify-center font-mono transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
          style={{
            background: 'rgba(255,255,255,0.03)',
            color: 'rgba(255,255,255,0.42)',
          }}
          whileHover={{ scale: 1.06, color: '#ffffff' }}
          whileTap={{ scale: 0.95 }}
          title="Help & Tutorial"
          aria-label="Help and tutorial"
        >
          <HelpCircle className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.header>
  );
}
