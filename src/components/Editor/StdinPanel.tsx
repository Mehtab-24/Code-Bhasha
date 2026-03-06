'use client';

import { Terminal } from 'lucide-react';
import { useExecutionStore } from '@/store/useExecutionStore';

export function StdinPanel() {
  const { stdinContent, setStdinContent } = useExecutionStore();

  return (
    <div
      className="w-full rounded-xl overflow-hidden"
      style={{
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <Terminal className="w-3.5 h-3.5" style={{ color: 'rgba(167,139,250,0.6)' }} />
        <span
          className="text-xs font-mono tracking-widest uppercase"
          style={{ color: 'rgba(255,255,255,0.18)', letterSpacing: '0.12em' }}
        >
          Standard Input
        </span>
        <span
          className="text-xs ml-auto"
          style={{ color: 'rgba(255,255,255,0.15)' }}
        >
          Enter one input per line
        </span>
      </div>

      {/* Textarea */}
      <textarea
        value={stdinContent}
        onChange={(e) => setStdinContent(e.target.value)}
        placeholder="Enter inputs here (one per line)..."
        className="w-full px-4 py-3 bg-transparent resize-none font-mono text-sm focus:outline-none"
        style={{
          color: 'rgba(255,255,255,0.7)',
          minHeight: '80px',
          maxHeight: '120px',
        }}
        spellCheck={false}
      />
    </div>
  );
}
