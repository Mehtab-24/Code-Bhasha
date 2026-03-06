'use client';

import { Terminal } from 'lucide-react';
import { useExecutionStore } from '@/store/useExecutionStore';
import { useMemo } from 'react';

export function StdinPanel() {
  // Subscribe to store state properly
  const { stdinContent, setStdinContent, files, activeFileId } = useExecutionStore();
  
  // Get active file from subscribed state
  const activeFile = useMemo(() => {
    return files.find(f => f.id === activeFileId);
  }, [files, activeFileId]);
  
  // Count input() calls
  const inputCount = useMemo(() => {
    if (!activeFile || !activeFile.content) return 0;
    const matches = activeFile.content.match(/input\(/g);
    return matches ? matches.length : 0;
  }, [activeFile]);

  const hasInputCalls = inputCount > 0;

  return (
    <div
      className="w-full rounded-xl overflow-hidden"
      style={{
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
        transition: 'opacity 0.3s',
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
          {!hasInputCalls ? 'Optional' : `${inputCount} input${inputCount !== 1 ? 's' : ''} needed`}
        </span>
      </div>

      {/* Textarea - ALWAYS EDITABLE */}
      <textarea
        value={stdinContent}
        onChange={(e) => setStdinContent(e.target.value)}
        placeholder={
          hasInputCalls
            ? `Enter ${inputCount} input${inputCount !== 1 ? 's' : ''} here (one per line)...`
            : "Enter inputs here (optional, one per line)..."
        }
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