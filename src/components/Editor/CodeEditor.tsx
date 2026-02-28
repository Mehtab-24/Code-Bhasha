'use client';

import { Editor } from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { Monaco } from '@monaco-editor/react';
import type * as monacoEditor from 'monaco-editor';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
}

// ─── Inject a one-time global style that nukes Monaco's visible textarea ──────
// Monaco renders a hidden <textarea> for keyboard input. Tailwind's base/reset
// styles (via @tailwind base or a global stylesheet) apply:
//   textarea { background-color: white; border: 1px solid ... }
// which overrides Monaco's own inline `opacity:0` — making it visible as a
// white box. We fix this with a scoped :global rule that forces the textarea
// inside our editor wrapper back to transparent + no border.
function useMonacoTextareaFix() {
  useEffect(() => {
    const styleId = 'codebhasha-monaco-fix';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Fix 1: Hide Monaco's keyboard-capture textarea that Tailwind/global CSS makes visible */
      .codebhasha-editor-root .monaco-editor textarea.inputarea {
        background: transparent !important;
        background-color: transparent !important;
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
        opacity: 0 !important;
        color: transparent !important;
        caret-color: transparent !important;
      }
      /* Fix 2: Also suppress any Grammarly-injected elements inside our editor */
      .codebhasha-editor-root grammarly-extension,
      .codebhasha-editor-root .gr_ {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }, []);
}

function WindowDot({
  color,
  glowColor,
  onClick,
  title,
}: {
  color: string;
  glowColor: string;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <motion.button
      type="button"
      title={title}
      onClick={onClick}
      className="w-3 h-3 rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
      style={{ background: color, boxShadow: `0 0 0 1px rgba(0,0,0,0.35)` }}
      whileHover={{ scale: 1.2, boxShadow: `0 0 8px ${glowColor}, 0 0 0 1px rgba(0,0,0,0.35)` }}
      whileTap={{ scale: 0.88 }}
      transition={{ type: 'spring', stiffness: 420, damping: 18 }}
    />
  );
}

function FileTab({ active }: { active: boolean }) {
  return (
    <div
      className="flex items-center gap-2 px-4 h-full relative"
      style={{
        borderRight: '1px solid rgba(255,255,255,0.06)',
        background: active ? 'rgba(255,255,255,0.04)' : 'transparent',
      }}
    >
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#3b82f6', boxShadow: '0 0 4px rgba(59,130,246,0.6)' }} />
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#facc15', boxShadow: '0 0 4px rgba(250,204,21,0.5)' }} />
      </div>
      <span
        className="text-xs font-mono select-none"
        style={{ color: active ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.28)' }}
      >
        main.py
      </span>
      {active && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.7), transparent)' }}
          layoutId="activeTabIndicator"
        />
      )}
    </div>
  );
}

function EditorLoadingState() {
  const lines = [60, 85, 45, 70, 90, 38, 65, 78, 52, 83];
  return (
    <div className="flex flex-col gap-3 p-6 h-full" style={{ background: '#0d0d0d' }}>
      {lines.map((width, i) => (
        <motion.div
          key={i}
          className="flex items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.04 }}
        >
          <div className="w-6 h-3 rounded shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <motion.div
            className="h-3 rounded"
            style={{
              width: `${width}%`,
              background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)',
              backgroundSize: '200% 100%',
            }}
            animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'linear', delay: i * 0.06 }}
          />
        </motion.div>
      ))}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="flex flex-col items-center gap-3"
          style={{ background: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: '16px 24px' }}
        >
          <motion.div
            className="w-6 h-6 rounded-full"
            style={{ border: '2px solid rgba(34,211,238,0.2)', borderTopColor: '#22d3ee' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
          />
          <span className="text-xs font-mono" style={{ color: 'rgba(34,211,238,0.5)', letterSpacing: '0.16em' }}>
            LOADING EDITOR
          </span>
        </div>
      </div>
    </div>
  );
}

function CharCounter({ value }: { value: string }) {
  const lines = value.split('\n').length;
  const chars = value.length;
  return (
    <span className="text-xs font-mono tabular-nums select-none" style={{ color: 'rgba(255,255,255,0.15)', letterSpacing: '0.06em' }}>
      {lines} ln · {chars} ch
    </span>
  );
}

// ─── Main CodeEditor ───────────────────────────────────────────────────────────
export function CodeEditor({ value, onChange }: CodeEditorProps) {
  const [isEditorMounted, setIsEditorMounted] = useState(false);

  // Inject the global CSS fix on mount
  useMonacoTextareaFix();

  const handleEditorMount = (editor: monacoEditor.editor.IStandaloneCodeEditor, monaco: Monaco) => {
    // Define and apply a fully opaque custom theme
    monaco.editor.defineTheme('codebhasha-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '',          foreground: 'd4d4d4' },
        { token: 'comment',   foreground: '6a9955', fontStyle: 'italic' },
        { token: 'keyword',   foreground: '569cd6', fontStyle: 'bold' },
        { token: 'string',    foreground: 'ce9178' },
        { token: 'number',    foreground: 'b5cea8' },
        { token: 'type',      foreground: '4ec9b0' },
        { token: 'function',  foreground: 'dcdcaa' },
        { token: 'variable',  foreground: '9cdcfe' },
        { token: 'operator',  foreground: 'd4d4d4' },
        { token: 'delimiter', foreground: 'd4d4d4' },
      ],
      colors: {
        'editor.background':                   '#0d0d0d',
        'editor.foreground':                   '#d4d4d4',
        'editorCursor.foreground':             '#22d3ee',
        'editor.selectionBackground':          '#264f7866',
        'editor.inactiveSelectionBackground':  '#3a3d4166',
        'editor.lineHighlightBackground':      '#ffffff0d',
        'editor.lineHighlightBorder':          '#ffffff00',
        'editorLineNumber.foreground':         '#3d3d3d',
        'editorLineNumber.activeForeground':   '#858585',
        'scrollbarSlider.background':          '#424242aa',
        'scrollbarSlider.hoverBackground':     '#616161aa',
        'scrollbarSlider.activeBackground':    '#757575aa',
        'editorWidget.background':             '#1a1a1a',
        'editorWidget.border':                 '#303030',
        'editorFind.matchBackground':          '#22d3ee33',
        'editorFind.matchHighlightBackground': '#22d3ee22',
        'editorIndentGuide.background1':       '#2a2a2a',
        'editorIndentGuide.activeBackground1': '#404040',
      },
    });
    monaco.editor.setTheme('codebhasha-dark');

    // Fix cursor position: force Monaco to re-layout after mount
    // This resolves the cursor rendering at y:0 while text is offset
    requestAnimationFrame(() => {
      editor.layout();
      editor.revealLine(1);
    });

    setIsEditorMounted(true);
  };

  const handleEditorChange = (newValue: string | undefined) => {
    onChange(newValue || '');
  };

  return (
    // ── 'codebhasha-editor-root' class is the CSS scope anchor for our
    //    global textarea fix defined in useMonacoTextareaFix()
    <div
      className="codebhasha-editor-root w-full flex flex-col overflow-hidden"
      style={{
        background: '#0d0d0d',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12,
        boxShadow: '0 24px 60px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {/* ── Title bar ───────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center h-10 px-4 gap-4"
        style={{ background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)' }}
      >
        <div className="flex items-center gap-2" role="toolbar" aria-label="Window controls">
          <WindowDot color="#ff5f57" glowColor="rgba(255,95,87,0.75)"  title="Clear code" onClick={() => onChange?.('')} />
          <WindowDot color="#febc2e" glowColor="rgba(254,188,46,0.75)" title="Minimize" />
          <WindowDot color="#28c840" glowColor="rgba(40,200,64,0.75)"  title="Fullscreen" />
        </div>
        <div className="w-px h-4 shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="flex-1 flex justify-center">
          <span className="text-xs font-mono select-none" style={{ color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>
            CodeBhasha IDE
          </span>
        </div>
        <CharCounter value={value} />
      </div>

      {/* ── Tab bar ─────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-stretch h-9"
        style={{ background: 'rgba(0,0,0,0.35)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <FileTab active />
        <div className="flex-1" />
      </div>

      {/* ── Monaco wrapper ──────────────────────────────────── */}
      <div className="relative w-full h-[450px]">
        <AnimatePresence>
          {!isEditorMounted && (
            <motion.div
              className="absolute inset-0 z-10"
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <EditorLoadingState />
            </motion.div>
          )}
        </AnimatePresence>

        <Editor
          height="100%"
          defaultLanguage="python"
          value={value}
          onChange={handleEditorChange}
          theme="codebhasha-dark"
          onMount={handleEditorMount}
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
            // Keep glyphMargin OFF — it creates a DOM slot that
            // browser extensions (Grammarly, etc.) inject into
            glyphMargin: false,
            folding: false,
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 4,
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            padding: { top: 12, bottom: 16 },
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
          }}
          loading={null}
        />
      </div>

      {/* ── Status bar ──────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center justify-between px-4 h-6"
        style={{ background: 'rgba(0,0,0,0.6)', borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div className="flex items-center gap-3">
          <span className="font-mono select-none" style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.12em' }}>Python 3</span>
          <span className="font-mono select-none" style={{ fontSize: 10, color: 'rgba(255,255,255,0.1)',  letterSpacing: '0.1em'  }}>UTF-8</span>
        </div>
        <span className="font-mono select-none" style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.1em' }}>Spaces: 4</span>
      </div>
    </div>
  );
}