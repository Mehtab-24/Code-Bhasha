'use client';

import { useEffect, useId, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';
import { hashRandom } from '@/lib/python-highlight';

const SIZE = 240;
const C = SIZE / 2; // center
const BAR_COUNT = 36;
const BAR_INNER_R = 58;
const BAR_MAX_LEN = 30;
const RING_RADII = [40, 66, 88];

interface RadialVisualizerProps {
  /** true while the recognizer is capturing audio */
  active: boolean;
  /** live mic loudness (0..1), updated by the owner's AnalyserNode loop */
  levelRef: React.MutableRefObject<number>;
  onToggle: () => void;
  disabled?: boolean;
}

// ─── Radial audio visualizer ──────────────────────────────────────────────────
// A compact mic core wrapped in SVG pulse rings and a ring of radial bars.
// The rAF loop mutates SVG attributes directly — no per-frame React renders.
// When no analyser data is available (permission pending / unsupported), the
// bars fall back to a gentle synthetic pulse so the core never looks dead.
export function RadialVisualizer({ active, levelRef, onToggle, disabled }: RadialVisualizerProps) {
  const gradientId = useId();
  const barsRef = useRef<(SVGLineElement | null)[]>([]);
  const ringsRef = useRef<(SVGCircleElement | null)[]>([]);
  const coreGroupRef = useRef<SVGGElement>(null);

  // Deterministic per-bar character (no SSR randomness)
  const weights = Array.from({ length: BAR_COUNT }, (_, i) => 0.3 + 0.7 * hashRandom(i + 1));
  const phases = Array.from({ length: BAR_COUNT }, (_, i) => hashRandom(i + 50) * Math.PI * 2);

  useEffect(() => {
    let raf: number;
    const smooth = new Array<number>(BAR_COUNT).fill(0.03);
    let smoothLevel = 0;

    const loop = (t: number) => {
      const raw = levelRef.current > 0.001
        ? levelRef.current
        : active
          ? 0.24 + 0.16 * Math.sin(t / 260) + 0.08 * Math.sin(t / 93 + 1.3) // synthetic fallback
          : 0;
      const target = active ? Math.min(1, raw * 1.7) : 0;
      smoothLevel += (target - smoothLevel) * 0.16;

      // Rings breathe with the level; outer ring slowly rotates while active
      ringsRef.current.forEach((ring, i) => {
        if (!ring) return;
        const influence = [0.5, 0.8, 1][i];
        const scale = 1 + smoothLevel * 0.12 * influence;
        ring.setAttribute(
          'transform',
          `translate(${C} ${C}) scale(${scale}) translate(${-C} ${-C})`
        );
        ring.setAttribute('opacity', String((0.16 + smoothLevel * 0.5) * influence));
      });

      if (coreGroupRef.current) {
        const coreScale = 1 + smoothLevel * 0.06;
        coreGroupRef.current.setAttribute(
          'transform',
          `translate(${C} ${C}) scale(${coreScale}) translate(${-C} ${-C})`
        );
      }

      // Bars: fast attack, slow release, per-bar wobble
      for (let i = 0; i < BAR_COUNT; i++) {
        const bar = barsRef.current[i];
        if (!bar) continue;
        const wobble = 0.55 + 0.45 * Math.sin(t / (340 + weights[i] * 520) + phases[i]);
        const barTarget = active
          ? Math.max(0.04, smoothLevel * weights[i] * wobble * 1.5)
          : 0.03 + 0.015 * Math.sin(t / 900 + phases[i]);
        smooth[i] += (barTarget - smooth[i]) * (barTarget > smooth[i] ? 0.38 : 0.12);
        const len = 2 + smooth[i] * BAR_MAX_LEN;
        bar.setAttribute('y2', String(C - BAR_INNER_R - len));
        bar.setAttribute('opacity', String(active ? 0.35 + smooth[i] * 0.65 : 0.18));
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, levelRef, weights, phases]);

  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }} role="presentation">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="absolute inset-0"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#00ffa3" />
          </linearGradient>
        </defs>

        {/* Pulse rings */}
        {RING_RADII.map((r, i) => (
          <circle
            key={r}
            ref={(el) => {
              ringsRef.current[i] = el;
            }}
            cx={C}
            cy={C}
            r={r}
            fill="none"
            stroke={i === 1 ? 'rgba(167,139,250,0.5)' : 'rgba(34,211,238,0.55)'}
            strokeWidth={i === 2 ? 1 : 1.25}
            strokeDasharray={i === 1 ? '3 7' : undefined}
            opacity={0.15}
          />
        ))}

        {/* Radial bars */}
        {Array.from({ length: BAR_COUNT }).map((_, i) => (
          <line
            key={i}
            ref={(el) => {
              barsRef.current[i] = el;
            }}
            x1={C}
            y1={C - BAR_INNER_R}
            x2={C}
            y2={C - BAR_INNER_R - 3}
            stroke={`url(#${gradientId})`}
            strokeWidth={2.4}
            strokeLinecap="round"
            transform={`rotate(${(360 / BAR_COUNT) * i} ${C} ${C})`}
            opacity={0.18}
          />
        ))}
      </svg>

      {/* ── Mic core button ── */}
      <motion.button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className="absolute rounded-full flex items-center justify-center cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
        style={{
          width: 64,
          height: 64,
          left: '50%',
          top: '50%',
          x: '-50%',
          y: '-50%',
          background: active
            ? 'radial-gradient(circle at 35% 35%, rgba(34,211,238,0.24), rgba(34,211,238,0.07))'
            : 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.14), rgba(255,255,255,0.04))',
          border: active ? '1px solid rgba(34,211,238,0.55)' : '1px solid rgba(255,255,255,0.14)',
          backdropFilter: 'blur(12px)',
          boxShadow: active
            ? '0 0 28px rgba(34,211,238,0.22), inset 0 1px 0 rgba(34,211,238,0.2)'
            : '0 8px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
        }}
        whileHover={!disabled ? { scale: 1.05 } : {}}
        whileTap={!disabled ? { scale: 0.94 } : {}}
        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
        aria-label={active ? 'Recording band karo' : 'Bolo — recording shuru karo'}
        aria-pressed={active}
      >
        {/* Inner specular highlight */}
        <span
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 30,
            height: 14,
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'radial-gradient(ellipse, rgba(255,255,255,0.16), transparent)',
            filter: 'blur(3px)',
          }}
        />
        <motion.span
          className="relative"
          animate={active ? { scale: [1, 1.1, 1] } : { scale: 1 }}
          transition={active ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' } : {}}
        >
          {active ? (
            <MicOff className="w-6 h-6" style={{ color: '#22d3ee', filter: 'drop-shadow(0 0 6px rgba(34,211,238,0.8))' }} />
          ) : (
            <Mic className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.75)' }} />
          )}
        </motion.span>
      </motion.button>
    </div>
  );
}
