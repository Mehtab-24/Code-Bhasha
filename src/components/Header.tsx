'use client';

import { motion } from 'framer-motion';
import { Sun, Moon, HelpCircle } from 'lucide-react';
import { useState } from 'react';

export function Header() {
  const [isDarkMode, setIsDarkMode] = useState(true);

  return (
    <motion.header 
      className="glass border-b border-glass-border p-4"
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

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <motion.button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-lg bg-glass-dark border border-glass-border text-gray-300 hover:text-white hover:border-glass-border-hover transition-all duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </motion.button>

          {/* Help */}
          <motion.button
            className="p-2 rounded-lg bg-glass-dark border border-glass-border text-gray-300 hover:text-white hover:border-glass-border-hover transition-all duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <HelpCircle className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
}