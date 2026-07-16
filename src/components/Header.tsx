'use client';

import { motion } from 'framer-motion';
import { HelpCircle, LogIn, LogOut, Cloud, RefreshCw, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useExecutionStore } from '@/store/useExecutionStore';
import { TutorialModal } from './TutorialModal';
import { AuthModal } from './AuthModal';

export function Header() {
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const { 
    user, 
    signIn, 
    signOut, 
    syncProjectsToCloud, 
    isSyncing,
    lastSyncedAt,
    isTutorOpen,
    setTutorOpen
  } = useExecutionStore();

  // Session Recovery: check for authenticated user profile on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('codebhasha-user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          signIn(parsed.username, parsed.email);
        } catch (err) {
          console.warn('[Header] Failed to recover user session:', err);
        }
      }
    }
  }, [signIn]);

  return (
    <motion.header 
      className="glass border-b border-glass-border p-4 relative z-40"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <motion.div 
          className="flex items-center gap-3"
          whileHover={{ scale: 1.02 }}
        >
          <div className="w-8 h-8 bg-gradient-to-br from-neon-cyan to-neon-violet rounded-lg flex items-center justify-center">
            <span className="text-dark-100 font-bold text-lg">CB</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">CodeBhasha</h1>
            <p className="text-xs text-gray-400 hidden sm:block">Syntax is a barrier; Logic is universal</p>
          </div>
        </motion.div>

        {/* Actions Row */}
        <div className="flex items-center gap-3">
          {user ? (
            // Logged In controls
            <div className="flex items-center gap-3">
              {/* Cloud Sync Button */}
              <motion.button
                onClick={() => syncProjectsToCloud()}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-glass-dark border border-glass-border hover:border-glass-border-hover text-xs font-mono transition-colors"
                style={{
                  color: isSyncing ? '#a78bfa' : 'rgba(255,255,255,0.4)',
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                title={lastSyncedAt ? `Last synced: ${new Date(lastSyncedAt).toLocaleTimeString()}` : 'Sync projects to cloud'}
              >
                {isSyncing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Cloud className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">
                  {isSyncing ? 'Syncing...' : 'Sync Cloud'}
                </span>
              </motion.button>

              {/* User Profile Tag */}
              <div 
                className="px-3 py-1.5 rounded-lg border flex items-center gap-2"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  borderColor: 'rgba(255,255,255,0.06)',
                }}
              >
                <div className="w-4 h-4 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-[9px] font-bold text-white uppercase select-none">
                  {user.username.slice(0, 2)}
                </div>
                <span className="text-xs font-mono font-medium text-gray-300 hidden md:inline">
                  {user.username}
                </span>
              </div>

              {/* Sign Out Button */}
              <motion.button
                onClick={() => signOut()}
                className="p-2 rounded-lg bg-glass-dark border border-glass-border text-gray-400 hover:text-red-400 hover:border-red-500/20 transition-all duration-200"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </motion.button>
            </div>
          ) : (
            // Logged Out control
            <motion.button
              onClick={() => setIsAuthOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-600/90 to-blue-600/90 border border-purple-500/20 text-xs font-mono text-white font-semibold transition-all duration-250 shadow-md"
              whileHover={{ scale: 1.03, filter: 'brightness(1.1)' }}
              whileTap={{ scale: 0.97 }}
              style={{
                boxShadow: '0 4px 12px rgba(139,92,246,0.2)'
              }}
            >
              <LogIn className="w-4 h-4" />
              <span>Guest Login</span>
            </motion.button>
          )}

          {/* Socratic Tutor Button */}
          <motion.button
            onClick={() => setTutorOpen(!isTutorOpen)}
            className="p-2 rounded-lg bg-glass-dark border transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
            style={{
              color: isTutorOpen ? '#a78bfa' : 'rgba(255,255,255,0.4)',
              borderColor: isTutorOpen ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.1)',
              background: isTutorOpen ? 'rgba(167,139,250,0.05)' : 'rgba(0,0,0,0.2)',
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Desi Tutor (Socratic Hinglish AI)"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-mono hidden md:inline text-purple-300 font-medium">Bhai Se Pucho</span>
          </motion.button>

          {/* Help / Tutorial */}
          <motion.button
            onClick={() => setIsTutorialOpen(true)}
            className="p-2 rounded-lg bg-glass-dark border border-glass-border text-gray-400 hover:text-white hover:border-glass-border-hover transition-all duration-200 cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Help & Tutorial"
          >
            <HelpCircle className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Modals */}
      <TutorialModal 
        isOpen={isTutorialOpen} 
        onClose={() => setIsTutorialOpen(false)} 
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />
    </motion.header>
  );
}
export default Header;