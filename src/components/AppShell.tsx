'use client';

import { motion } from 'framer-motion';
import { Mic, Edit3, Play, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Header } from './Header';
import { VoicePanel } from './Voice/VoicePanel';
import { CodeEditor } from './Editor/CodeEditor';
import { OutputPanel } from './Editor/OutputPanel';
import { useExecutionStore } from '@/store/useExecutionStore';
import { getExecutionService } from '@/lib/execution-service';

export function AppShell() {
  const [activeMode, setActiveMode] = useState<'voice' | 'text'>('voice');
  const [code, setCode] = useState('# Yahan apna Python code likho\nprint("Hello CodeBhasha!")');
  
  const { 
    isExecuting, 
    output, 
    error,
    executionTime,
    isWorkerReady,
    executeCode, 
    clearOutput,
    setWorkerReady 
  } = useExecutionStore();

  // Initialize execution service and monitor worker readiness
  useEffect(() => {
    const executionService = getExecutionService();
    
    // Check worker readiness periodically
    const checkWorkerReady = () => {
      const ready = executionService.isReady();
      setWorkerReady(ready);
    };

    checkWorkerReady();
    const interval = setInterval(checkWorkerReady, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [setWorkerReady]);

  const handleRunCode = () => {
    if (!code.trim()) return;
    executeCode(code);
  };

  const handleClearCode = () => {
    setCode('# Yahan apna Python code likho\n');
    clearOutput();
  };

  // Convert store output to display format
  const displayOutput = output.map(line => line.text);

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-50 via-dark-100 to-dark-50 flex flex-col">
      {/* Header */}
      <Header />
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4 gap-4 max-w-7xl mx-auto w-full">
        {/* Mode Tabs */}
        <motion.div 
          className="glass rounded-xl p-1 flex gap-1"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <button
            onClick={() => setActiveMode('voice')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all duration-200 ${
              activeMode === 'voice'
                ? 'bg-neon-cyan text-dark-100 shadow-lg glow-cyan'
                : 'text-gray-400 hover:text-white hover:bg-glass-dark'
            }`}
          >
            <Mic className="w-5 h-5" />
            <span className="font-medium">🎤 Bolo</span>
          </button>
          <button
            onClick={() => setActiveMode('text')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all duration-200 ${
              activeMode === 'text'
                ? 'bg-neon-violet text-white shadow-lg glow-violet'
                : 'text-gray-400 hover:text-white hover:bg-glass-dark'
            }`}
          >
            <Edit3 className="w-5 h-5" />
            <span className="font-medium">✏ Likho</span>
          </button>
        </motion.div>

        {/* Voice Panel (Collapsible) */}
        {activeMode === 'voice' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <VoicePanel />
          </motion.div>
        )}

        {/* Code Editor */}
        <motion.div 
          className="flex-1 glass rounded-xl overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <CodeEditor 
            value={code}
            onChange={setCode}
          />
        </motion.div>

        {/* Action Bar */}
        <motion.div 
          className="glass rounded-xl p-4 flex gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <motion.button
            onClick={handleRunCode}
            disabled={isExecuting || !isWorkerReady}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-lg font-medium transition-all duration-200 ${
              isExecuting || !isWorkerReady
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-neon-green text-dark-100 hover:bg-green-400 glow-green'
            }`}
            whileHover={!isExecuting && isWorkerReady ? { scale: 1.02 } : {}}
            whileTap={!isExecuting && isWorkerReady ? { scale: 0.98 } : {}}
          >
            <Play className="w-5 h-5" />
            {!isWorkerReady 
              ? 'Loading...' 
              : isExecuting 
                ? 'Chal raha hai...' 
                : '▶ Chalao'
            }
          </motion.button>
          
          <motion.button
            onClick={handleClearCode}
            disabled={isExecuting}
            className="flex items-center justify-center gap-2 py-3 px-6 bg-glass-dark border border-glass-border text-gray-300 rounded-lg font-medium transition-all duration-200 hover:bg-glass-darker hover:border-glass-border-hover disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={!isExecuting ? { scale: 1.02 } : {}}
            whileTap={!isExecuting ? { scale: 0.98 } : {}}
          >
            <Trash2 className="w-5 h-5" />
            <span className="hidden sm:inline">🗑 Clear</span>
          </motion.button>
        </motion.div>

        {/* Output Panel */}
        <motion.div 
          className="glass rounded-xl overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          style={{ height: '30vh', minHeight: '200px' }}
        >
          <OutputPanel 
            output={displayOutput}
            error={error}
            isExecuting={isExecuting}
            executionTime={executionTime}
          />
        </motion.div>
      </main>
    </div>
  );
}