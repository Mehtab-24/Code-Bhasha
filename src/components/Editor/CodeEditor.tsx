'use client';

import { Editor } from '@monaco-editor/react';
import { motion } from 'framer-motion';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function CodeEditor({ value, onChange }: CodeEditorProps) {
  const handleEditorChange = (newValue: string | undefined) => {
    onChange(newValue || '');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Editor Header */}
      <div className="flex items-center justify-between p-4 border-b border-glass-border">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <span className="text-sm text-gray-400">main.py</span>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 editor-area">
        <Editor
          height="100%"
          defaultLanguage="python"
          value={value}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            fontSize: 14,
            fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
            lineNumbers: 'on',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 4,
            insertSpaces: true,
            renderWhitespace: 'selection',
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            contextmenu: true,
            selectOnLineNumbers: true,
            roundedSelection: false,
            readOnly: false,
            cursorStyle: 'line',
            mouseWheelZoom: true,
            // Mobile optimizations
            glyphMargin: false,
            folding: false,
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 3,
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
          }}
          loading={
            <div className="flex items-center justify-center h-full">
              <motion.div
                className="w-8 h-8 border-2 border-neon-cyan border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          }
        />
      </div>
    </div>
  );
}