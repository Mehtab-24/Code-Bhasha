'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Edit3, Play, Trash2, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Header } from './Header';
import { VoicePanel } from './Voice/VoicePanel';
import { CodeEditor } from './Editor/CodeEditor';
import { OutputPanel } from './Editor/OutputPanel';
import { useExecutionStore } from '@/store/useExecutionStore';
import { getExecutionService } from '@/lib/execution-service';

// ─── Ambient Orb: drifting background glow ────────────────────────────────────
function AmbientOrb({
  color,
  size,
  initialX,
  initialY,
  duration,
}: {
  color: string;
  size: number;
  initialX: string;
  initialY: string;
  duration: number;
}) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        left: initialX,
        top: initialY,
        background: color,
        filter: 'blur(80px)',
        opacity: 0.12,
      }}
      animate={{
        x: [0, 30, -20, 10, 0],
        y: [0, -20, 30, -10, 0],
        opacity: [0.12, 0.18, 0.10, 0.15, 0.12],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

// ─── Scanline overlay for depth ───────────────────────────────────────────────
function ScanlineOverlay() {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-0"
      style={{
        backgroundImage:
          'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.012) 2px, rgba(255,255,255,0.012) 4px)',
      }}
    />
  );
}

// ─── RunButton: pulsing ring when active ──────────────────────────────────────
function RunButton({
  onClick,
  disabled,
  isExecuting,
  isWorkerReady,
}: {
  onClick: () => void;
  disabled: boolean;
  isExecuting: boolean;
  isWorkerReady: boolean;
}) {
  return (
    <div className="relative flex-1">
      {/* Pulsing ring when executing */}
      <AnimatePresence>
        {isExecuting && (
          <motion.div
            className="absolute inset-0 rounded-xl"
            style={{ border: '1px solid rgba(0, 255, 163, 0.6)' }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: [0.6, 0, 0.6], scale: [0.95, 1.04, 0.95] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </AnimatePresence>

      <motion.button
        onClick={onClick}
        disabled={disabled}
        className="relative w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl font-semibold text-sm tracking-wide transition-colors duration-200 overflow-hidden group"
        style={{
          background: disabled
            ? 'rgba(255,255,255,0.04)'
            : isExecuting
            ? 'rgba(0, 255, 163, 0.12)'
            : 'rgba(0, 255, 163, 0.14)',
          border: `1px solid ${
            disabled
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(0, 255, 163, 0.4)'
          }`,
          color: disabled ? 'rgba(255,255,255,0.2)' : '#00FFA3',
          boxShadow: !disabled ? '0 0 20px rgba(0, 255, 163, 0.12), inset 0 1px 0 rgba(0,255,163,0.1)' : 'none',
        }}
        whileHover={!disabled ? { scale: 1.01 } : {}}
        whileTap={!disabled ? { scale: 0.98 } : {}}
      >
        {/* Shimmer sweep on hover */}
        {!disabled && (
          <motion.div
            className="absolute inset-0 opacity-0 group-hover:opacity-100"
            style={{
              background: 'linear-gradient(105deg, transparent 40%, rgba(0,255,163,0.07) 50%, transparent 60%)',
            }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1.5 }}
          />
        )}

        <motion.div
          animate={isExecuting ? { rotate: 360 } : { rotate: 0 }}
          transition={isExecuting ? { duration: 2, repeat: Infinity, ease: 'linear' } : {}}
        >
          {isExecuting ? (
            <Zap className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 fill-current" />
          )}
        </motion.div>

        <span>
          {!isWorkerReady
            ? 'Initializing...'
            : isExecuting
            ? 'Chal raha hai...'
            : '▶  Chalao'}
        </span>
      </motion.button>
    </div>
  );
}

// ─── Mode Tab ─────────────────────────────────────────────────────────────────
function ModeTab({
  mode,
  activeMode,
  onClick,
  icon: Icon,
  label,
  activeColor,
  activeShadow,
  activeBorder,
}: {
  mode: 'voice' | 'text';
  activeMode: 'voice' | 'text';
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  activeColor: string;
  activeShadow: string;
  activeBorder: string;
}) {
  const isActive = mode === activeMode;
  return (
    <motion.button
      onClick={onClick}
      className="relative flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold tracking-wide transition-colors duration-300"
      style={{
        color: isActive ? activeColor : 'rgba(255,255,255,0.35)',
        background: isActive ? `rgba(${activeColor === '#22d3ee' ? '34,211,238' : '167,139,250'},0.08)` : 'transparent',
        border: `1px solid ${isActive ? activeBorder : 'transparent'}`,
        boxShadow: isActive ? activeShadow : 'none',
      }}
      whileHover={{ color: isActive ? activeColor : 'rgba(255,255,255,0.65)' }}
      whileTap={{ scale: 0.97 }}
    >
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-lg"
          layoutId="activeTabBg"
          style={{ background: `rgba(${activeColor === '#22d3ee' ? '34,211,238' : '167,139,250'},0.06)` }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        />
      )}
      <Icon className="w-4 h-4 relative z-10" />
      <span className="relative z-10">{label}</span>
    </motion.button>
  );
}

// ─── Status Dot ───────────────────────────────────────────────────────────────
function WorkerStatusDot({ isReady }: { isReady: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <motion.div
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: isReady ? '#00FFA3' : '#f59e0b' }}
        animate={
          isReady
            ? { opacity: [1, 0.4, 1], scale: [1, 0.8, 1] }
            : { opacity: [1, 0.3, 1] }
        }
        transition={{ duration: 2, repeat: Infinity }}
      />
      <span className="text-xs font-mono" style={{ color: isReady ? 'rgba(0,255,163,0.6)' : 'rgba(245,158,11,0.7)' }}>
        {isReady ? 'Python ready' : 'Loading...'}
      </span>
    </div>
  );
}

// ─── Main AppShell ─────────────────────────────────────────────────────────────
export function AppShell() {
  const [activeMode, setActiveMode] = useState<'voice' | 'text'>('voice');
  const [code, setCode] = useState('# Yahan apna Python code likho\nprint("Hello CodeBhasha!")');

  const {
    isExecuting,
    output,
    error,
    executionTime,
    isWorkerReady,
    debugResult,
    isFetchingDebug,
    executeCode,
    clearOutput,
    setWorkerReady,
  } = useExecutionStore();

  // Initialize execution service and monitor worker readiness
  useEffect(() => {
    const executionService = getExecutionService();
    const checkWorkerReady = () => {
      const ready = executionService.isReady();
      setWorkerReady(ready);
    };
    checkWorkerReady();
    const interval = setInterval(checkWorkerReady, 1000);
    return () => clearInterval(interval);
  }, [setWorkerReady]);

  const handleRunCode = () => {
    if (!code.trim()) return;
    executeCode(code);
  };

  const handleClearCode = () => {
    setCode('# Yahan apna Python code likho\n');
    clearOutput();
  };

  const displayOutput = output.map((line) => line.text);

  // ── Stagger children for mount animation
  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.07, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.45, 
        ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number]
      } 
    },
  };

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: '#080B0F' }}
    >
      {/* ── Scanline texture ───────────────────────────────── */}
      <ScanlineOverlay />

      {/* ── Ambient background orbs ────────────────────────── */}
      <AmbientOrb color="radial-gradient(circle, #22d3ee, transparent)" size={500} initialX="10%" initialY="5%" duration={18} />
      <AmbientOrb color="radial-gradient(circle, #a78bfa, transparent)" size={420} initialX="70%" initialY="60%" duration={24} />
      <AmbientOrb color="radial-gradient(circle, #00FFA3, transparent)" size={300} initialX="85%" initialY="10%" duration={20} />

      {/* ── Grid overlay ──────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)',
        }}
      />

      {/* ── Header ────────────────────────────────────────── */}
      <div className="relative z-10">
        <Header />
      </div>

      {/* ── Main layout ───────────────────────────────────── */}
      <motion.main
        className="relative z-10 flex-1 flex flex-col px-4 pb-6 gap-3 max-w-5xl mx-auto w-full"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ── Mode Tabs ─────────────────────────────────── */}
        <motion.div
          variants={itemVariants}
          className="flex gap-1 p-1 rounded-xl"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <ModeTab
            mode="voice"
            activeMode={activeMode}
            onClick={() => setActiveMode('voice')}
            icon={Mic}
            label="🎤 Bolo"
            activeColor="#22d3ee"
            activeBorder="rgba(34,211,238,0.3)"
            activeShadow="0 0 16px rgba(34,211,238,0.1)"
          />
          <ModeTab
            mode="text"
            activeMode={activeMode}
            onClick={() => setActiveMode('text')}
            icon={Edit3}
            label="✏ Likho"
            activeColor="#a78bfa"
            activeBorder="rgba(167,139,250,0.3)"
            activeShadow="0 0 16px rgba(167,139,250,0.1)"
          />
        </motion.div>

        {/* ── Voice Panel ───────────────────────────────── */}
        <AnimatePresence mode="wait">
          {activeMode === 'voice' && (
            <motion.div
              key="voice-panel"
              initial={{ opacity: 0, y: -8, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.99 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <VoicePanel />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Code Editor ───────────────────────────────── */}
        <motion.div
          variants={itemVariants}
          className="flex-1 rounded-xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.07)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
            minHeight: '280px',
          }}
        >
          {/* Editor chrome bar */}
          <div
            className="flex items-center justify-between px-4 py-2.5 border-b"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
          >
            {/* Fake traffic lights */}
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(255,95,86,0.5)' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(255,189,46,0.5)' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(39,201,63,0.5)' }} />
            </div>
            <span
              className="text-xs font-mono tracking-widest uppercase"
              style={{ color: 'rgba(255,255,255,0.18)', letterSpacing: '0.12em' }}
            >
              main.py
            </span>
            <WorkerStatusDot isReady={isWorkerReady} />
          </div>

          <CodeEditor value={code} onChange={setCode} />
        </motion.div>

        {/* ── Action Bar ────────────────────────────────── */}
        <motion.div
          variants={itemVariants}
          className="flex gap-2.5 items-center"
        >
          <RunButton
            onClick={handleRunCode}
            disabled={isExecuting || !isWorkerReady}
            isExecuting={isExecuting}
            isWorkerReady={isWorkerReady}
          />

          <motion.button
            onClick={handleClearCode}
            disabled={isExecuting}
            className="flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl text-sm font-medium transition-colors duration-200"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: isExecuting ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.45)',
              cursor: isExecuting ? 'not-allowed' : 'pointer',
            }}
            whileHover={!isExecuting ? { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)' } : {}}
            whileTap={!isExecuting ? { scale: 0.97 } : {}}
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Clear</span>
          </motion.button>
        </motion.div>

        {/* ── Output Panel ──────────────────────────────── */}
        <motion.div
          variants={itemVariants}
          className="rounded-xl overflow-hidden"
          style={{
            background: 'rgba(0,0,0,0.4)',
            border: `1px solid {isExecuting ? 'rgba(0, 255, 163, 0.2)' : 'rgba(255,255,255,0.07)'}`,
            backdropFilter: 'blur(16px)',
            boxShadow: isExecuting
              ? '0 0 24px rgba(0,255,163,0.06), inset 0 1px 0 rgba(0,255,163,0.04)'
              : '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
            height: '30vh',
            minHeight: '200px',
            transition: 'border-color 0.4s, box-shadow 0.4s',
          }}
        >
          {/* Output chrome bar */}
          <div
            className="flex items-center justify-between px-4 py-2.5 border-b"
            style={{ borderColor: 'rgba(255,255,255,0.05)' }}
          >
            <div className="flex items-center gap-2">
              <motion.div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: isExecuting ? '#00FFA3' : 'rgba(255,255,255,0.2)' }}
                animate={isExecuting ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span
                className="text-xs font-mono tracking-widest uppercase"
                style={{ color: 'rgba(255,255,255,0.18)', letterSpacing: '0.12em' }}
              >
                output
              </span>
            </div>
            {executionTime !== null && !isExecuting && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs font-mono"
                style={{ color: 'rgba(0,255,163,0.45)' }}
              >
                {executionTime}ms
              </motion.span>
            )}
          </div>

          <OutputPanel
            output={displayOutput}
            error={error}
            isExecuting={isExecuting}
            executionTime={executionTime}
            debugResult={debugResult}
            isFetchingDebug={isFetchingDebug}
          />
        </motion.div>
      </motion.main>
    </div>
  );
}