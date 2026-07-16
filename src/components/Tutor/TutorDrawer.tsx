'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, Send, Sparkles, Trash2, ShieldAlert } from 'lucide-react';
import { useExecutionStore } from '@/store/useExecutionStore';

export function TutorDrawer() {
  const {
    tutorMessages,
    isFetchingTutor,
    isTutorOpen,
    setTutorOpen,
    sendTutorMessage,
    clearTutorHistory
  } = useExecutionStore();

  const [inputVal, setInputVal] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom on new message load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tutorMessages, isTutorOpen]);

  if (!isTutorOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isFetchingTutor) return;
    sendTutorMessage(inputVal.trim());
    setInputVal('');
  };

  const handleQuickAction = (text: string) => {
    if (isFetchingTutor) return;
    sendTutorMessage(text);
  };

  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div 
        className="fixed inset-0 flex justify-end pointer-events-none"
        style={{ zIndex: 99999 }}
      >
        {/* Backdrop overlay */}
        <motion.div
          className="absolute inset-0 bg-black/40 pointer-events-auto backdrop-blur-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setTutorOpen(false)}
        />

        {/* Drawer Sheet */}
        <motion.div
          className="relative w-full max-w-md sm:max-w-lg h-full flex flex-col pointer-events-auto border-l border-glass-border shadow-2xl"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{ background: 'rgba(10, 10, 10, 0.98)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-glass-border bg-black/40">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <div>
                <h3 className="font-bold text-white text-sm font-mono tracking-wide uppercase">Desi Socratic Tutor</h3>
                <p className="text-[10px] text-purple-300 font-mono">Bina code bataye logic seekhein</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Clear button */}
              <button
                onClick={() => clearTutorHistory()}
                className="p-1.5 rounded-lg border border-white/5 text-gray-400 hover:text-red-400 hover:bg-white/5 transition-all cursor-pointer"
                title="Clear Chat History"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              {/* Close Button */}
              <button
                onClick={() => setTutorOpen(false)}
                className="p-1.5 rounded-lg border border-white/5 text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="px-4 py-2 bg-black/20 border-b border-glass-border flex flex-wrap gap-1.5">
            <button
              onClick={() => handleQuickAction('Bhai, is code ki time and space complexity check karo.')}
              disabled={isFetchingTutor}
              className="text-[10px] font-mono px-2 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 disabled:opacity-50 disabled:pointer-events-none cursor-pointer transition-all"
            >
              ⏱️ Time Complexity check karo
            </button>
            <button
              onClick={() => handleQuickAction('Bhai, is current topic par ek similar practice problem do solving ke liye.')}
              disabled={isFetchingTutor}
              className="text-[10px] font-mono px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 disabled:opacity-50 disabled:pointer-events-none cursor-pointer transition-all"
            >
              🎯 Practice Similar Problem
            </button>
            <button
              onClick={() => handleQuickAction('Bhai, is code ka syntax logical steps me explain karo.')}
              disabled={isFetchingTutor}
              className="text-[10px] font-mono px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 disabled:opacity-50 disabled:pointer-events-none cursor-pointer transition-all"
            >
              🔄 Step-by-Step Logic Explain
            </button>
          </div>

          {/* Messages Log */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {tutorMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-2.5 text-xs font-mono leading-relaxed border ${
                    msg.sender === 'user'
                      ? 'bg-purple-600/20 text-purple-100 border-purple-500/20 rounded-tr-none'
                      : 'bg-white/5 text-gray-200 border-white/5 rounded-tl-none'
                  }`}
                  style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isFetchingTutor && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/5 text-gray-400 rounded-xl rounded-tl-none px-4 py-2.5 flex items-center gap-2">
                  <motion.div
                    className="w-1.5 h-1.5 bg-purple-400 rounded-full"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                  />
                  <motion.div
                    className="w-1.5 h-1.5 bg-purple-400 rounded-full"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
                  />
                  <motion.div
                    className="w-1.5 h-1.5 bg-purple-400 rounded-full"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
                  />
                  <span className="text-[10px] font-mono ml-1 text-gray-500 select-none">Bhai is typing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-glass-border bg-black/40">
            <div className="flex items-center gap-2 bg-glass border border-glass-border rounded-xl px-3 py-1.5 focus-within:border-purple-500/40 transition-colors">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Bhai se pucho (e.g. Yeh loop kaise kaam karega?)..."
                disabled={isFetchingTutor}
                className="flex-1 bg-transparent text-xs font-mono text-white outline-none border-none placeholder-gray-500 py-1"
              />
              <button
                type="submit"
                disabled={!inputVal.trim() || isFetchingTutor}
                className="p-1.5 rounded-lg text-purple-400 hover:text-purple-300 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-1.5 mt-2 justify-center opacity-30 select-none">
              <ShieldAlert className="w-3 h-3 text-yellow-500" />
              <span className="text-[9px] font-mono text-gray-400">Socratic Mode: Bhai solution share nahi karega.</span>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
export default TutorDrawer;
