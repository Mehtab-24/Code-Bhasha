'use client';

import { motion } from 'framer-motion';

// ─── Sleek compiler shimmer: centered status card over a dark blur ────────────
// Replaces the old multi-line ghost-bar skeletons shown while the editor boots
// or Bedrock is synthesizing code. Purely presentational — mount it inside a
// `relative` container and it covers that area (absolute inset-0).
export function TokenShimmer({ label }: { label: string }) {
  return (
    <motion.div
      className="absolute inset-0 z-10 flex items-center justify-center bg-[#0B0C10]/80 backdrop-blur-sm pointer-events-none select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      role="status"
      aria-live="polite"
    >
      <div
        className="relative flex items-center gap-3 px-5 py-3.5 rounded-xl"
        style={{
          background: 'rgba(13, 17, 23, 0.85)',
          border: '1px solid rgba(52, 211, 153, 0.18)',
          boxShadow: '0 0 44px rgba(16, 185, 129, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        }}
      >
        {/* Pulsing emerald status ring */}
        <span className="relative flex h-2.5 w-2.5" aria-hidden>
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
        <span className="font-mono text-xs text-slate-300 tracking-wide">{label}</span>
      </div>

      {/* Thin scanline beam hugging the top edge of the covered area */}
      <span
        className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse"
        aria-hidden
      />
    </motion.div>
  );
}
