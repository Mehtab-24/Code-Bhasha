'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, CheckSquare, Square } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useExecutionStore } from '@/store/useExecutionStore';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DownloadModal({ isOpen, onClose }: DownloadModalProps) {
  const { files } = useExecutionStore();
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);

  // Initialize with all files selected
  useEffect(() => {
    if (isOpen) {
      setSelectedFiles(new Set(files.map(f => f.id)));
    }
  }, [isOpen, files]);

  const toggleFile = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.id)));
    }
  };

  const handleDownload = async () => {
    if (selectedFiles.size === 0) return;

    setIsDownloading(true);

    try {
      const selectedFileData = files.filter(f => selectedFiles.has(f.id));

      // If only one file selected, download directly
      if (selectedFileData.length === 1) {
        const file = selectedFileData[0];
        const blob = new Blob([file.content], { type: 'text/plain' });
        saveAs(blob, file.name);
      } else {
        // Multiple files - create zip
        const zip = new JSZip();
        
        selectedFileData.forEach(file => {
          zip.file(file.name, file.content);
        });

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, 'CodeBhasha_Source.zip');
      }

      onClose();
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  const allSelected = selectedFiles.size === files.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            {/* Modal */}
            <motion.div
              className="relative w-full max-w-md rounded-xl overflow-hidden"
              style={{
                background: '#0d0d0d',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4 border-b"
                style={{ borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4" style={{ color: '#22d3ee' }} />
                  <h2 className="text-base font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                    Download Files
                  </h2>
                </div>
                <motion.button
                  onClick={onClose}
                  className="p-1 rounded-md"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                  whileHover={{ color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.05)' }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>

              {/* Select All Toggle */}
              <div
                className="px-5 py-3 border-b"
                style={{ 
                  borderColor: 'rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.02)'
                }}
              >
                <motion.button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 w-full text-left"
                  whileHover={{ color: 'rgba(255,255,255,0.9)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  {allSelected ? (
                    <CheckSquare className="w-4 h-4" style={{ color: '#22d3ee' }} />
                  ) : (
                    <Square className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
                  )}
                  <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    {allSelected ? 'Deselect All' : 'Select All'}
                  </span>
                  <span className="text-xs ml-auto" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {selectedFiles.size} / {files.length} selected
                  </span>
                </motion.button>
              </div>

              {/* File List */}
              <div
                className="max-h-80 overflow-y-auto"
                style={{
                  background: 'rgba(0,0,0,0.3)',
                }}
              >
                {files.map((file, index) => {
                  const isSelected = selectedFiles.has(file.id);
                  return (
                    <motion.button
                      key={file.id}
                      onClick={() => toggleFile(file.id)}
                      className="flex items-center gap-3 w-full px-5 py-3 text-left border-b"
                      style={{
                        borderColor: 'rgba(255,255,255,0.04)',
                        background: isSelected ? 'rgba(34,211,238,0.05)' : 'transparent',
                      }}
                      whileHover={{
                        background: isSelected ? 'rgba(34,211,238,0.08)' : 'rgba(255,255,255,0.03)',
                      }}
                      whileTap={{ scale: 0.98 }}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 shrink-0" style={{ color: '#22d3ee' }} />
                      ) : (
                        <Square className="w-4 h-4 shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-mono truncate" style={{ color: isSelected ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)' }}>
                          {file.name}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          {file.content.split('\n').length} lines · {file.content.length} chars
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Footer */}
              <div
                className="flex items-center justify-end gap-2 px-5 py-4 border-t"
                style={{ 
                  borderColor: 'rgba(255,255,255,0.08)',
                  background: 'rgba(0,0,0,0.4)'
                }}
              >
                <motion.button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{
                    color: 'rgba(255,255,255,0.6)',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                  whileHover={{
                    background: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.9)',
                  }}
                  whileTap={{ scale: 0.97 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={handleDownload}
                  disabled={selectedFiles.size === 0 || isDownloading}
                  className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                  style={{
                    color: selectedFiles.size === 0 ? 'rgba(255,255,255,0.3)' : '#0d0d0d',
                    background: selectedFiles.size === 0 ? 'rgba(255,255,255,0.08)' : '#22d3ee',
                    border: `1px solid ${selectedFiles.size === 0 ? 'rgba(255,255,255,0.1)' : 'rgba(34,211,238,0.5)'}`,
                    cursor: selectedFiles.size === 0 ? 'not-allowed' : 'pointer',
                    boxShadow: selectedFiles.size > 0 ? '0 0 20px rgba(34,211,238,0.2)' : 'none',
                  }}
                  whileHover={selectedFiles.size > 0 ? { scale: 1.02 } : {}}
                  whileTap={selectedFiles.size > 0 ? { scale: 0.98 } : {}}
                >
                  {isDownloading ? (
                    <>
                      <motion.div
                        className="w-3 h-3 border-2 border-current border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      />
                      <span>Downloading...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>
                        Download {selectedFiles.size === 1 ? 'File' : `${selectedFiles.size} Files`}
                      </span>
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
