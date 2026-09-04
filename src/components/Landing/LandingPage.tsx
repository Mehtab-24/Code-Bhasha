'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Bug, Cpu, Github, Mic, Layers } from 'lucide-react';
import { MicroDemo } from './MicroDemo';
import { ArchitectureModal } from './ArchitectureModal';

const GITHUB_URL = 'https://github.com/Mehtab-24/Code-Bhasha';

// Single unified container — identical content box for nav, hero, bento and
// footer so left/right margins always match (mobile px-4 · tablet px-8 ·
// desktop max-w-7xl px-8/px-12).
const CONTAINER = 'mx-auto w-full max-w-7xl px-4 sm:px-8 lg:px-12';

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
};

// ─── Navigation: logo · architecture · GitHub · Launch Studio ─────────────────
function LandingNav({ onOpenArchitecture }: { onOpenArchitecture: () => void }) {
  return (
    <motion.header
      className="sticky top-0 z-40"
      style={{
        background: 'rgba(11, 12, 16, 0.88)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <div className={`${CONTAINER} h-14 flex items-center justify-between`}>
        <Link href="/" className="flex items-center gap-2.5 min-w-0">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold font-mono shrink-0"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#E7E9EE',
              boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.06)',
            }}
          >
            CB
          </span>
          <span className="text-sm font-semibold tracking-tight text-slate-100">CodeBhasha</span>
        </Link>

        <nav className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenArchitecture}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 border border-transparent hover:text-slate-200 hover:border-white/[0.08] hover:bg-white/[0.03] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/25 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            Architecture
          </button>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub repository"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.07] hover:text-white text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/25"
          >
            <Github className="w-4 h-4" />
          </a>
          <Link
            href="/app"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#0B0C10] hover:bg-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
          >
            Launch Studio
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </nav>
      </div>
    </motion.header>
  );
}

// ─── Bento card ────────────────────────────────────────────────────────────────
function FeatureCard({
  icon: Icon,
  title,
  tag,
  children,
}: {
  icon: React.ElementType;
  title: string;
  tag: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="h-full rounded-2xl p-5 flex flex-col gap-3"
      style={{
        background: '#0E1015',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Icon className="w-4 h-4 text-emerald-400" />
        </span>
        <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-500">{tag}</span>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
        <p className="text-[13px] text-slate-400 leading-relaxed mt-1.5">{children}</p>
      </div>
    </div>
  );
}

// ─── Landing page ──────────────────────────────────────────────────────────────
export function LandingPage() {
  const router = useRouter();
  const [isMac, setIsMac] = useState(false);
  const [architectureOpen, setArchitectureOpen] = useState(false);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/i.test(window.navigator.userAgent));
  }, []);

  // ⌘K (Ctrl K) or a bare Enter opens the studio.
  // Enter is ignored while an interactive element has focus so keyboard
  // activation of links/buttons keeps working normally.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        router.push('/app');
        return;
      }
      if (event.key === 'Enter' && document.activeElement === document.body) {
        event.preventDefault();
        router.push('/app');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [router]);

  return (
    <div className="lp-scope relative min-h-screen flex flex-col">
      {/* ── Faint structural grid — texture without glow ── */}
      <div aria-hidden className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(ellipse 100% 70% at 50% 0%, black 10%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse 100% 70% at 50% 0%, black 10%, transparent 80%)',
          }}
        />
      </div>

      <LandingNav onOpenArchitecture={() => setArchitectureOpen(true)} />

      <main className="relative z-10 flex-1 w-full">
        {/* ── Asymmetric hero: copy left · live preview right ── */}
        <motion.section
          className={`${CONTAINER} pt-16 sm:pt-24 pb-14 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center`}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div>
            <motion.p
              variants={itemVariants}
              className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-slate-500 select-none"
            >
              <span className="w-1.5 h-1.5 bg-emerald-400" aria-hidden />
              Hinglish → Python · voice-first
            </motion.p>

            <motion.h1
              variants={itemVariants}
              className="mt-5 font-bold tracking-tight leading-[1.05] text-balance max-w-xl text-4xl sm:text-5xl"
            >
              <span className="block text-slate-50">Syntax is a barrier.</span>
              <span className="block text-slate-400">Logic is universal.</span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mt-6 text-base sm:text-lg leading-relaxed max-w-md text-slate-400 text-pretty"
            >
              The voice-first compiler that translates conversational Hinglish into executable
              Python right in your browser. Speak your logic, inspect the code, execute instantly.
            </motion.p>

            <motion.div variants={itemVariants} className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/app"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-slate-100 text-[#0B0C10] hover:bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                Launch Studio
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/25"
              >
                <Github className="w-4 h-4" />
                View Architecture
                <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
              </a>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="mt-6 flex items-center gap-2 text-xs text-slate-500 font-mono select-none"
            >
              <span
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-white/[0.07] bg-white/[0.02]"
              >
                Press
                <kbd className="px-1 py-0.5 rounded text-[10px] text-slate-400 border border-white/[0.1] bg-white/[0.04]">
                  {isMac ? '⌘K' : 'Ctrl K'}
                </kbd>
                or
                <kbd className="px-1 py-0.5 rounded text-[10px] text-slate-400 border border-white/[0.1] bg-white/[0.04]">
                  ↵ Enter
                </kbd>
                to launch instantly
              </span>
            </motion.div>
          </div>

          {/* Live dual-state preview */}
          <motion.div variants={itemVariants}>
            <MicroDemo />
            <p
              className="mt-3 text-[10.5px] font-mono uppercase tracking-[0.2em] text-slate-500 text-center select-none"
            >
              live preview · bolo → samjho → chalao
            </p>
          </motion.div>
        </motion.section>

        {/* ── Bento: three structural cards ── */}
        <motion.section
          className={`${CONTAINER} pb-20 grid md:grid-cols-3 gap-3`}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          <motion.div variants={itemVariants}>
            <FeatureCard icon={Mic} title="Bolo & Likho" tag="Multimodal">
              One engine, two input modes. Speak your logic in Hinglish or type it — the compiler
              treats both as first-class intent, with a prompt shelf and generation history built in.
            </FeatureCard>
          </motion.div>
          <motion.div variants={itemVariants}>
            <FeatureCard icon={Bug} title="Desi Debugger" tag="Bedrock Nova">
              Errors stop being scary. The debugger localizes the failing line, explains the bug in
              plain Hinglish, and shows a broken-vs-fixed diff you can apply in one click.
            </FeatureCard>
          </motion.div>
          <motion.div variants={itemVariants}>
            <FeatureCard icon={Cpu} title="Client-Side WASM" tag="Pyodide Sandbox">
              Real CPython compiled to WebAssembly runs inside your browser tab. 0ms server compute,
              zero upload, 100% data privacy — your code never leaves the machine.
            </FeatureCard>
          </motion.div>
        </motion.section>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className={`${CONTAINER} py-6 flex flex-col sm:flex-row items-center justify-between gap-2`}>
          <p className="text-[11px] text-slate-500">© 2026 CodeBhasha · AWS AI for Bharat</p>
          <p className="text-[11px] font-mono text-slate-500">
            &ldquo;Syntax is a barrier; Logic is universal&rdquo;
          </p>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-mono flex items-center gap-1 transition-colors hover:text-white text-slate-500"
          >
            Mehtab-24/Code-Bhasha
            <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>
      </footer>

      <ArchitectureModal open={architectureOpen} onClose={() => setArchitectureOpen(false)} />
    </div>
  );
}
