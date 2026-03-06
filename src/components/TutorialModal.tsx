'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, Sparkles, Terminal, Play } from 'lucide-react';
import { createPortal } from 'react-dom';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TutorialModal({ isOpen, onClose }: TutorialModalProps) {
  if (typeof window === 'undefined') return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              className="w-full max-w-2xl rounded-2xl overflow-hidden pointer-events-auto"
              style={{
                background: 'rgba(13,13,13,0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.8), 0 0 80px rgba(34,211,238,0.15)',
              }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="relative px-6 py-5 border-b"
                style={{
                  background: 'linear-gradient(135deg, rgba(34,211,238,0.1), rgba(167,139,250,0.1))',
                  borderColor: 'rgba(255,255,255,0.1)',
                }}
              >
                <motion.button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-lg transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.5)',
                  }}
                  whileHover={{
                    background: 'rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.9)',
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="w-5 h-5" />
                </motion.button>

                <div className="flex items-center gap-3 mb-2">
                  <motion.div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #22d3ee, #a78bfa)',
                    }}
                    animate={{
                      boxShadow: [
                        '0 0 20px rgba(34,211,238,0.3)',
                        '0 0 30px rgba(167,139,250,0.4)',
                        '0 0 20px rgba(34,211,238,0.3)',
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <span className="text-2xl">🚀</span>
                  </motion.div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      Welcome to CodeBhasha
                    </h2>
                    <p className="text-sm" style={{ color: 'rgba(34,211,238,0.8)' }}>
                      Syntax is a barrier; Logic is universal
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-6 space-y-6 max-h-[60vh] overflow-y-auto">
                {/* Step 1 */}
                <motion.div
                  className="flex gap-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div
                    className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'rgba(34,211,238,0.15)',
                      border: '1px solid rgba(34,211,238,0.3)',
                    }}
                  >
                    <Mic className="w-6 h-6" style={{ color: '#22d3ee' }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      🎤 Step 1: Bolo ya Likho
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      Use the mic or text box to describe your logic in plain Hindi or Hinglish.
                    </p>
                    <div
                      className="mt-2 px-3 py-2 rounded-lg text-xs font-mono"
                      style={{
                        background: 'rgba(34,211,238,0.08)',
                        color: 'rgba(34,211,238,0.9)',
                        border: '1px solid rgba(34,211,238,0.2)',
                      }}
                    >
                      Example: &quot;1 se 10 tak odd numbers print ka code likho&quot;
                    </div>
                  </div>
                </motion.div>

                {/* Step 2 */}
                <motion.div
                  className="flex gap-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div
                    className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'rgba(167,139,250,0.15)',
                      border: '1px solid rgba(167,139,250,0.3)',
                    }}
                  >
                    <Sparkles className="w-6 h-6" style={{ color: '#a78bfa' }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      ✨ Step 2: Code Banao
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      Click the &apos;Code Banao&apos; button and watch the AI write perfect Python code for you.
                    </p>
                    <div
                      className="mt-2 px-3 py-2 rounded-lg text-xs"
                      style={{
                        background: 'rgba(167,139,250,0.08)',
                        color: 'rgba(167,139,250,0.9)',
                        border: '1px solid rgba(167,139,250,0.2)',
                      }}
                    >
                      💡 The AI understands Hinglish perfectly!
                    </div>
                  </div>
                </motion.div>

                {/* Step 3 */}
                <motion.div
                  className="flex gap-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div
                    className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'rgba(250,204,21,0.15)',
                      border: '1px solid rgba(250,204,21,0.3)',
                    }}
                  >
                    <Terminal className="w-6 h-6" style={{ color: '#facc15' }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      ⌨️ Step 3: Input Do
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      If your code asks for user input, type it into the &apos;Standard Input&apos; box.
                    </p>
                    <div
                      className="mt-2 px-3 py-2 rounded-lg text-xs"
                      style={{
                        background: 'rgba(250,204,21,0.08)',
                        color: 'rgba(250,204,21,0.9)',
                        border: '1px solid rgba(250,204,21,0.2)',
                      }}
                    >
                      📝 One input per line
                    </div>
                  </div>
                </motion.div>

                {/* Step 4 */}
                <motion.div
                  className="flex gap-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div
                    className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'rgba(0,255,163,0.15)',
                      border: '1px solid rgba(0,255,163,0.3)',
                    }}
                  >
                    <Play className="w-6 h-6 fill-current" style={{ color: '#00FFA3' }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      ▶️ Step 4: Chalao
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      Hit the green &apos;Chalao&apos; button to run your code instantly in the browser!
                    </p>
                    <div
                      className="mt-2 px-3 py-2 rounded-lg text-xs"
                      style={{
                        background: 'rgba(0,255,163,0.08)',
                        color: 'rgba(0,255,163,0.9)',
                        border: '1px solid rgba(0,255,163,0.2)',
                      }}
                    >
                      ⚡ No installation needed - runs in your browser!
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Footer */}
              <div
                className="px-6 py-4 border-t"
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  borderColor: 'rgba(255,255,255,0.1)',
                }}
              >
                <motion.button
                  onClick={onClose}
                  className="w-full py-3 px-6 rounded-xl font-semibold text-sm tracking-wide"
                  style={{
                    background: 'linear-gradient(135deg, rgba(34,211,238,0.2), rgba(167,139,250,0.2))',
                    border: '1px solid rgba(34,211,238,0.3)',
                    color: '#22d3ee',
                  }}
                  whileHover={{
                    background: 'linear-gradient(135deg, rgba(34,211,238,0.3), rgba(167,139,250,0.3))',
                    scale: 1.02,
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  Got it! Let&apos;s Code 🚀
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
