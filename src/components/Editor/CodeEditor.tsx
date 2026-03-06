'use client';

import { Editor } from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { Monaco } from '@monaco-editor/react';
import type * as monacoEditor from 'monaco-editor';
import { useExecutionStore } from '@/store/useExecutionStore';
import { Plus, X } from 'lucide-react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
}

// ─── FIX A: Font preload + safer Monaco textarea suppression ──────────────────
//
// Two changes from the original:
//
// 1. Load JetBrains Mono via Google Fonts before Monaco measures glyph widths.
//    Monaco calls its FontMeasurements service during/immediately after onMount.
//    If the font isn't in the browser cache yet, Monaco falls back to Consolas,
//    caches its (different) character widths, and the cursor drifts permanently.
//    Injecting the <link> here ensures the font is at least requested before
//    the Editor component even renders.
//
// 2. Remove `left: -9999px` from the textarea override.
//    Monaco sets position:absolute + top/left on its inputarea to track where
//    the cursor is. Overriding left:-9999px moves the browser's native focus
//    anchor off-screen — iOS Safari and mobile Chrome then scroll horizontally
//    to "reveal the caret" on every tap, causing a jarring viewport jump.
//    opacity:0 + pointer-events:none achieves the same visual result safely.
function useMonacoTextareaFix() {
  useEffect(() => {
    // Inject JetBrains Mono font link if not already present
    const fontLinkId = 'codebhasha-jb-mono-font';
    if (!document.getElementById(fontLinkId)) {
      const link = document.createElement('link');
      link.id = fontLinkId;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap';
      document.head.appendChild(link);
    }

    // Scoped textarea fix — opacity only, position untouched
    const styleId = 'codebhasha-monaco-fix';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /*
       * Visually hide Monaco's keyboard-capture textarea without
       * relocating it. left:-9999px (original) moved the browser's
       * native caret anchor off-screen, triggering a horizontal scroll
       * jump on mobile focus. Position is intentionally left alone.
       */
      .codebhasha-editor-root .monaco-editor textarea.inputarea {
        opacity: 0 !important;
        pointer-events: none !important;
        background: transparent !important;
        background-color: transparent !important;
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
        color: transparent !important;
        caret-color: transparent !important;
      }
      .codebhasha-editor-root grammarly-extension,
      .codebhasha-editor-root .gr_ {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }, []);
}

// ─── Sub-components (all unchanged) ──────────────────────────────────────────

function WindowDot({
  color, glowColor, onClick, title,
}: {
  color: string; glowColor: string; onClick?: () => void; title?: string;
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

function FileTab({ 
  id,
  name, 
  active,
  canClose,
  onClick,
  onClose,
  onRename
}: { 
  id: string;
  name: string;
  active: boolean;
  canClose: boolean;
  onClick: () => void;
  onClose: () => void;
  onRename: (newName: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    if (active) {
      setIsEditing(true);
      setEditValue(name);
    }
  };

  const handleRenameSubmit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== name) {
      onRename(trimmed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(name);
    }
  };

  return (
    <div
      className="flex items-center gap-2 px-3 h-full relative group cursor-pointer shrink-0"
      style={{
        borderRight: '1px solid rgba(255,255,255,0.06)',
        background: active ? 'rgba(255,255,255,0.04)' : 'transparent',
      }}
      onClick={onClick}
      onDoubleClick={handleDoubleClick}
    >
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#3b82f6', boxShadow: '0 0 4px rgba(59,130,246,0.6)' }} />
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#facc15', boxShadow: '0 0 4px rgba(250,204,21,0.5)' }} />
      </div>
      
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={handleKeyDown}
          className="text-xs font-mono bg-transparent border-none outline-none"
          style={{ 
            color: 'rgba(255,255,255,0.65)',
            width: '100px'
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className="text-xs font-mono select-none"
          style={{ color: active ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.28)' }}
        >
          {name}
        </span>
      )}

      {canClose && (
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/10"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <X className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.4)' }} />
        </motion.button>
      )}

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
        <motion.div key={i} className="flex items-center gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
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
        <div className="flex flex-col items-center gap-3" style={{ background: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: '16px 24px' }}>
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
  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);

  // Get file management from store
  const { 
    files, 
    activeFileId, 
    setActiveFile, 
    createFile, 
    deleteFile, 
    renameFile 
  } = useExecutionStore();

  useMonacoTextareaFix();

  const handleEditorMount = async (
    editor: monacoEditor.editor.IStandaloneCodeEditor,
    monaco: Monaco
  ) => {
    editorRef.current = editor;

    // Theme definition (unchanged from original)
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

    // ── FIX B: Await font load before Monaco measures character widths ─────
    //
    // This is the primary cursor-drift fix. Monaco's FontMeasurements service
    // runs synchronously when the editor first renders. If the async font
    // network request hasn't finished, Monaco measures the fallback font
    // (Consolas) and caches those glyph widths permanently. When JetBrains
    // Mono arrives later, text renders at the correct width but the cursor
    // is still positioned using Consolas widths — so it drifts right of the
    // text on every line.
    //
    // document.fonts.ready is a Promise that resolves once all CSS-linked
    // fonts have finished loading. Awaiting it here means editor.layout()
    // always fires after the correct font is in memory.
    try {
      await document.fonts.ready;
    } catch {
      // Old browser without document.fonts — proceed without waiting
    }

    // ── FIX C: layout() after font load replaces requestAnimationFrame ────
    //
    // Original used rAF which fires ~16ms after the next paint — well before
    // the font finishes its network round-trip (typically 50-500ms).
    // Now that we've awaited document.fonts.ready, we call layout() knowing
    // the font metrics are correct.
    editor.layout();
    editor.revealLine(1);

    // Guard against rare FOUT: re-layout if any font loads after fonts.ready
    const onFontLoad = () => editor.layout();
    document.fonts.addEventListener('loadingdone', onFontLoad);
    editor.onDidDispose(() => {
      document.fonts.removeEventListener('loadingdone', onFontLoad);
    });

    setIsEditorMounted(true);
  };

  const handleEditorChange = (newValue: string | undefined) => {
    onChange(newValue || '');
  };

  return (
    // ── FIX D: Separate visual chrome from Monaco's measurement container ──
    //
    // Original: one div had border + border-radius + overflow:hidden AND was
    // Monaco's mount target. Monaco's automaticLayout measures offsetWidth/
    // offsetHeight on its container. overflow:hidden + border-radius caused
    // the computed content box to be ~2px smaller than Monaco's dimension
    // assumption. Monaco then cached a wrong content-column origin, making
    // line numbers and code appear fractionally misaligned (the "padding off"
    // feeling, most visible at the left edge of the gutter).
    //
    // Fix: two-div split.
    //   Outer div (.codebhasha-editor-root) → all visual chrome
    //   Inner div (Monaco mount, h-[450px]) → absolutely clean, no border,
    //                                          no radius, no overflow, no padding
    //
    // Monaco only ever sees the inner div and gets correct measurements.
    <div
      className="codebhasha-editor-root w-full flex flex-col"
      style={{
        background: '#0d0d0d',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {/* ── Title bar ────────────────────────────────────── */}
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

      {/* ── Tab bar ──────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-stretch h-9"
        style={{ background: 'rgba(0,0,0,0.35)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Scrollable tabs container */}
        <div 
          className="flex items-stretch overflow-x-auto scroll-smooth flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {files.map((file) => (
            <FileTab
              key={file.id}
              id={file.id}
              name={file.name}
              active={file.id === activeFileId}
              canClose={files.length > 1}
              onClick={() => setActiveFile(file.id)}
              onClose={() => deleteFile(file.id)}
              onRename={(newName) => renameFile(file.id, newName)}
            />
          ))}
        </div>
        
        {/* New file button - pinned to right */}
        <motion.button
          onClick={() => createFile()}
          className="flex items-center justify-center px-3 border-l shrink-0"
          style={{
            borderColor: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.3)',
          }}
          whileHover={{ 
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.6)'
          }}
          whileTap={{ scale: 0.95 }}
          title="New file"
        >
          <Plus className="w-3.5 h-3.5" />
        </motion.button>
      </div>

      {/* ── Monaco mount zone ─────────────────────────────────────────────
       *  Rules: explicit height only. NO border, NO radius, NO overflow,
       *  NO box-shadow, NO padding. Anything visual here shifts Monaco's
       *  content-area origin and causes gutter/cursor misalignment.
       * ────────────────────────────────────────────────────────────────── */}
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
            // ── FIX E: Explicit font metrics to prevent sub-pixel drift ──
            //
            // fontFamily unchanged — JetBrains Mono is now guaranteed loaded
            // before Monaco measures (see FIX B). The fallback chain is kept
            // for offline/strict-CSP environments.
            fontFamily: "'JetBrains Mono', 'Cascadia Code', Consolas, 'Courier New', monospace",
            fontSize: 14,
            // Explicit lineHeight prevents Monaco from inferring it differently
            // on retina vs non-retina screens. 22px = comfortable 1.57x ratio
            // at 14px font size, matches the visual rhythm of the rest of the UI.
            lineHeight: 22,
            // letterSpacing: 0 is Monaco's default. Being explicit prevents
            // any inherited CSS value from nudging character positions.
            letterSpacing: 0,
            fontLigatures: true,
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
            cursorWidth: 2,
            smoothScrolling: true,
            contextmenu: true,
            selectOnLineNumbers: true,
            roundedSelection: false,
            readOnly: false,
            cursorStyle: 'line',
            mouseWheelZoom: true,
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

      {/* ── Status bar ────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center justify-between px-4 h-6"
        style={{ background: 'rgba(0,0,0,0.6)', borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div className="flex items-center gap-3">
          <span className="font-mono select-none" style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.12em' }}>Python 3</span>
          <span className="font-mono select-none" style={{ fontSize: 10, color: 'rgba(255,255,255,0.1)', letterSpacing: '0.1em' }}>UTF-8</span>
        </div>
        <span className="font-mono select-none" style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.1em' }}>Spaces: 4</span>
      </div>
    </div>
  );
}