'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useExecutionStore } from '@/store/useExecutionStore';
import { X, Lock, Mail, User, ShieldAlert } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { signIn, authStatus } = useExecutionStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Bhai, saare fields bharo!');
      return;
    }

    if (isSignUp && !username.trim()) {
      setErrorMsg('Bhai, username bhi toh batao!');
      return;
    }

    try {
      const displayUser = isSignUp ? username : email.split('@')[0];
      await signIn(displayUser, email);
      onClose();
    } catch (err) {
      setErrorMsg('Authentication fail ho gaya. Koshish karte raho!');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop blur overlay */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            className="relative w-full max-w-md rounded-2xl border p-6 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(20,20,20,0.85) 0%, rgba(10,10,10,0.9) 100%)',
              borderColor: 'rgba(255,255,255,0.08)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', damping: 20, stiffness: 250 }}
          >
            {/* Ambient Background Glows */}
            <div className="absolute -right-20 -top-20 w-48 h-48 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/5 relative z-10">
              <h2 className="text-md font-mono font-bold tracking-wider text-gray-200 uppercase">
                {isSignUp ? 'Naya Account Banao' : 'Sign In Karo'}
              </h2>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-4 space-y-4 relative z-10">
              {/* Error messages */}
              {errorMsg && (
                <motion.div
                  className="p-3 rounded-lg border flex items-start gap-2.5"
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    borderColor: 'rgba(239,68,68,0.2)',
                  }}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400 font-mono leading-relaxed">{errorMsg}</p>
                </motion.div>
              )}

              {/* Username field (only on Sign Up) */}
              {isSignUp && (
                <div className="space-y-1">
                  <label className="text-[10px] font-mono tracking-wider text-gray-400 uppercase">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="e.g. rahul_coder"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 hover:border-white/10 focus:border-purple-500/50 rounded-lg py-2 pl-9 pr-4 text-sm text-gray-200 placeholder-gray-600 outline-none transition-all font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Email field */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono tracking-wider text-gray-400 uppercase">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 hover:border-white/10 focus:border-purple-500/50 rounded-lg py-2 pl-9 pr-4 text-sm text-gray-200 placeholder-gray-600 outline-none transition-all font-mono"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono tracking-wider text-gray-400 uppercase">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 hover:border-white/10 focus:border-purple-500/50 rounded-lg py-2 pl-9 pr-4 text-sm text-gray-200 placeholder-gray-600 outline-none transition-all font-mono"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={authStatus === 'loading'}
                className="w-full py-2.5 rounded-lg font-mono text-sm font-semibold tracking-wider text-white shadow-lg relative overflow-hidden transition-all duration-200"
                style={{
                  background: 'linear-gradient(90deg, #8b5cf6 0%, #3b82f6 100%)',
                  boxShadow: '0 4px 14px rgba(139,92,246,0.3)',
                }}
                whileHover={authStatus !== 'loading' ? { scale: 1.01, filter: 'brightness(1.1)' } : {}}
                whileTap={authStatus !== 'loading' ? { scale: 0.99 } : {}}
              >
                {authStatus === 'loading' ? (
                  <div className="flex items-center justify-center gap-2">
                    <motion.div
                      className="w-3.5 h-3.5 rounded-full border-2 border-transparent border-t-white"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
                    />
                    <span>Verifying...</span>
                  </div>
                ) : isSignUp ? (
                  'Create Account'
                ) : (
                  'Sign In'
                )}
              </motion.button>

              {/* Toggle Mode */}
              <p className="text-center text-[10px] font-mono text-gray-500 pt-2">
                {isSignUp ? 'Pehle se account hai?' : 'Naya account banana hai?'}{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-purple-400 hover:text-purple-300 underline font-semibold transition-colors"
                >
                  {isSignUp ? 'Sign In Karo' : 'Account Banao'}
                </button>
              </p>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
export default AuthModal;
