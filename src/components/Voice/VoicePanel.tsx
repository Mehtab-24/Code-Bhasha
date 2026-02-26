'use client';

import { motion } from 'framer-motion';
import { Mic, MicOff, Sparkles } from 'lucide-react';
import { useState } from 'react';

export function VoicePanel() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleStartRecording = () => {
    setIsRecording(true);
    // Simulate recording
    setTimeout(() => {
      setIsRecording(false);
      setTranscript('Ek function banao jo 1 se 10 tak numbers print kare');
    }, 3000);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
  };

  const handleGenerateCode = () => {
    setIsGenerating(true);
    // Simulate code generation
    setTimeout(() => {
      setIsGenerating(false);
      // This would normally update the code editor
    }, 2000);
  };

  return (
    <motion.div 
      className="glass rounded-xl p-6 space-y-4"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Voice Input Section */}
      <div className="text-center space-y-4">
        <h3 className="text-lg font-semibold text-white">Apni Logic Bolo</h3>
        
        {/* Microphone Button */}
        <motion.button
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
            isRecording 
              ? 'bg-red-500 animate-pulse-glow' 
              : 'bg-neon-cyan glow-cyan hover:bg-cyan-400'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={isRecording ? { 
            boxShadow: [
              '0 0 20px rgba(239, 68, 68, 0.5)',
              '0 0 40px rgba(239, 68, 68, 0.8)',
              '0 0 20px rgba(239, 68, 68, 0.5)'
            ]
          } : {}}
          transition={{ duration: 1, repeat: isRecording ? Infinity : 0 }}
        >
          {isRecording ? (
            <MicOff className="w-8 h-8 text-white" />
          ) : (
            <Mic className="w-8 h-8 text-dark-100" />
          )}
          
          {/* Pulse rings for recording state */}
          {isRecording && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-red-400"
                animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0, 0.8] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-red-300"
                animate={{ scale: [1, 2, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              />
            </>
          )}
        </motion.button>

        <p className="text-sm text-gray-400">
          {isRecording ? '🎤 Sun raha hun... "Roko" bolo ya button dabao' : 'Mic button dabao aur apni logic bolo'}
        </p>
      </div>

      {/* Transcript Section */}
      {transcript && (
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h4 className="text-sm font-medium text-gray-300">Aapne Kaha:</h4>
          <div className="glass-hover rounded-lg p-4 border border-glass-border">
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="w-full bg-transparent text-white placeholder-gray-400 resize-none focus:outline-none editor-area"
              rows={3}
              placeholder="Yahan aapki baat dikhegi..."
            />
          </div>
          
          <motion.button
            onClick={handleGenerateCode}
            disabled={isGenerating || !transcript.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-neon-violet text-white rounded-lg font-medium transition-all duration-200 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed glow-violet"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Sparkles className="w-5 h-5" />
            {isGenerating ? 'Code ban raha hai...' : '✨ Code Banao'}
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
}