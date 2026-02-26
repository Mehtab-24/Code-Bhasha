'use client';

import { motion } from 'framer-motion';
import { Terminal, Bug, Lightbulb, Clock } from 'lucide-react';
import { useState } from 'react';
import type { ExecutionError } from '@/store/useExecutionStore';

interface OutputPanelProps {
  output: string[];
  error: ExecutionError | null;
  isExecuting: boolean;
  executionTime?: number | null;
}

export function OutputPanel({ output, error, isExecuting, executionTime }: OutputPanelProps) {
  const [activeTab, setActiveTab] = useState<'output' | 'debugger'>('output');

  // Switch to debugger tab when there's an error
  useState(() => {
    if (error && activeTab === 'output') {
      setActiveTab('debugger');
    }
  });

  return (
    <div className="h-full flex flex-col">
      {/* Tab Header */}
      <div className="flex items-center border-b border-glass-border">
        <button
          onClick={() => setActiveTab('output')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 ${
            activeTab === 'output'
              ? 'text-neon-cyan border-b-2 border-neon-cyan'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Terminal className="w-4 h-4" />
          Output
          {executionTime && (
            <span className="text-xs text-gray-500 ml-1">
              ({executionTime}ms)
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('debugger')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 ${
            activeTab === 'debugger'
              ? 'text-neon-pink border-b-2 border-neon-pink'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Bug className="w-4 h-4" />
          💬 Debugger
          {error && (
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-auto">
        {activeTab === 'output' ? (
          <OutputContent 
            output={output} 
            isExecuting={isExecuting} 
            executionTime={executionTime}
          />
        ) : (
          <DebuggerContent error={error} />
        )}
      </div>
    </div>
  );
}

function OutputContent({ 
  output, 
  isExecuting, 
  executionTime 
}: { 
  output: string[]; 
  isExecuting: boolean; 
  executionTime?: number | null;
}) {
  return (
    <div className="space-y-2">
      {isExecuting && (
        <motion.div
          className="flex items-center gap-2 text-neon-cyan"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="w-2 h-2 bg-neon-cyan rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-sm">Code chal raha hai...</span>
        </motion.div>
      )}
      
      {output.map((line, index) => (
        <motion.div
          key={index}
          className="font-mono text-sm text-green-400"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: index * 0.05 }}
        >
          {line}
        </motion.div>
      ))}
      
      {!isExecuting && output.length === 0 && (
        <div className="text-gray-500 text-sm italic">
          Code chalane ke liye "▶ Chalao" button dabao
        </div>
      )}

      {executionTime && !isExecuting && (
        <motion.div
          className="flex items-center gap-2 text-gray-400 text-xs mt-4 pt-2 border-t border-glass-border"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Clock className="w-3 h-3" />
          <span>Execution time: {executionTime}ms</span>
        </motion.div>
      )}
    </div>
  );
}

function DebuggerContent({ error }: { error: ExecutionError | null }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-neon-pink">
        <Lightbulb className="w-5 h-5" />
        <span className="font-medium">Desi Debugger</span>
      </div>
      
      {error ? (
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Error Type */}
          <div className="glass-hover rounded-lg p-4 border border-red-500/20 bg-red-500/5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="text-red-400 font-medium text-sm">
                {error.type}
                {error.lineno > 0 && ` (Line ${error.lineno})`}
              </span>
            </div>
            
            <p className="text-red-300 text-sm mb-3">
              {error.message}
            </p>
            
            {error.line_text && (
              <div className="bg-dark-200 rounded p-2 border-l-2 border-red-500">
                <span className="text-xs text-gray-400">Problematic line:</span>
                <pre className="text-red-300 font-mono text-sm mt-1">
                  {error.line_text}
                </pre>
              </div>
            )}
          </div>

          {/* Friendly explanation placeholder */}
          <div className="glass-hover rounded-lg p-4 border border-glass-border">
            <p className="text-sm text-gray-300">
              💡 <strong>Desi Debugger:</strong> Yahan friendly Hinglish explanation aayegi jab AWS backend ready hoga.
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="text-gray-400 text-sm">
          Koi error aaye toh yahan friendly Hinglish mein explanation milegi.
        </div>
      )}
      
      <div className="glass-hover rounded-lg p-4 border border-glass-border">
        <p className="text-sm text-gray-300">
          💡 <strong>Tip:</strong> Agar code mein koi problem ho toh yahan samjhaya jayega ki kya galat hai aur kaise theek karna hai.
        </p>
      </div>
    </div>
  );
}