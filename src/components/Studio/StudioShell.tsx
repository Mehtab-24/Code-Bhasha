'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Keyboard,
  Mic,
  PanelLeft,
  Play,
  RotateCcw,
  Share2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useExecutionStore } from '@/store/useExecutionStore';
import { getExecutionService } from '@/lib/execution-service';
import { formatPython } from '@/lib/python-format';
import { buildShareUrl, decodeSnippet, SHARE_HASH_PREFIX } from '@/lib/share-code';
import { StudioHeader } from './StudioHeader';
import { AiStudio } from './AiStudio';
import { EditorPane } from './EditorPane';
import { SplitPane, useIsDesktop } from './SplitPane';
import { CommandPalette, type PaletteAction } from './CommandPalette';
import { TutorDrawer } from '@/components/Tutor/TutorDrawer';
import { TutorialModal } from '@/components/TutorialModal';

type StudioMode = 'voice' | 'text';

// ─── Scanline overlay for depth ───────────────────────────────────────────────
function ScanlineOverlay() {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-0"
      style={{
        backgroundImage:
          'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.012) 2px, rgba(255,255,255,0.012) 4px)',
      }}
      aria-hidden
    />
  );
}

// ─── Fixed 100vh developer studio shell ───────────────────────────────────────
export function StudioShell() {
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [intentOpen, setIntentOpen] = useState(true);
  const [mode, setMode] = useState<StudioMode>('voice');
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const setWorkerReady = useExecutionStore((s) => s.setWorkerReady);
  const isDesktop = useIsDesktop();

  const showToast = useCallback((message: string) => {
    setToast({ id: Date.now(), message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timeout);
  }, [toast]);

  // Pyodide worker READY subscription — event-driven, no polling
  useEffect(() => {
    const executionService = getExecutionService();
    if (executionService.isReady()) {
      setWorkerReady(true);
      return;
    }
    const unsubscribe = executionService.onReady(() => {
      setWorkerReady(true);
    });
    return unsubscribe;
  }, [setWorkerReady]);

  // Restore workspace files from IndexedDB (existing persistence)
  useEffect(() => {
    useExecutionStore.getState().loadFilesFromLocalDB();
  }, []);

  // Restore the intent-panel collapse preference
  useEffect(() => {
    const stored = window.localStorage.getItem('codebhasha-intent-open');
    if (stored !== null) setIntentOpen(stored === '1');
  }, []);

  const handleRun = useCallback(() => {
    const state = useExecutionStore.getState();
    const activeFile = state.files.find((f) => f.id === state.activeFileId);
    if (!activeFile || !activeFile.content.trim() || state.isExecuting || !state.isWorkerReady) return;
    state.executeCode(activeFile.content);
  }, []);

  const handleClearTerminal = useCallback(() => {
    useExecutionStore.getState().clearOutput();
  }, []);

  const toggleIntent = useCallback(() => {
    setIntentOpen((open) => {
      const next = !open;
      window.localStorage.setItem('codebhasha-intent-open', next ? '1' : '0');
      return next;
    });
  }, []);

  const handleFormat = useCallback(() => {
    const state = useExecutionStore.getState();
    const file = state.files.find((f) => f.id === state.activeFileId);
    if (!file || !file.content.trim()) {
      showToast('Format karne ke liye kuch code likho pehle');
      return;
    }
    const formatted = formatPython(file.content);
    if (formatted === file.content) {
      showToast('Code pehle se tidy hai ✨');
      return;
    }
    state.updateFileContent(file.id, formatted);
    window.dispatchEvent(
      new CustomEvent('codebhasha:highlight-line', {
        detail: { startLine: 1, endLine: formatted.split('\n').length },
      })
    );
    showToast('Indentation format ho gayi ✨');
  }, [showToast]);

  const handleShare = useCallback(async () => {
    const state = useExecutionStore.getState();
    const file = state.files.find((f) => f.id === state.activeFileId);
    if (!file || !file.content.trim()) {
      showToast('Share karne ke liye pehle kuch code likho');
      return;
    }
    const url = await buildShareUrl(file.content);
    try {
      await navigator.clipboard.writeText(url);
      showToast('Snippet link clipboard mein copy ho gaya ✓');
    } catch {
      showToast('Link ban gaya — clipboard block hai, address bar dekho');
    }
  }, [showToast]);

  const handleResetWorkspace = useCallback(() => {
    const state = useExecutionStore.getState();
    state.updateFileContent(state.activeFileId, '# Yahan apna Python code likho\n');
    state.clearOutput();
    showToast('Workspace reset ho gaya');
  }, [showToast]);

  // Import a shared snippet from the URL hash once the workspace has loaded
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith(SHARE_HASH_PREFIX)) return;

    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    let tries = 0;

    (async () => {
      const code = await decodeSnippet(hash);
      if (cancelled) return;
      // Wait (max ~10s) for the IndexedDB workspace restore to finish, then
      // open the snippet as a new tab so nothing the user had is overwritten.
      interval = setInterval(() => {
        if (cancelled) {
          if (interval) clearInterval(interval);
          return;
        }
        const state = useExecutionStore.getState();
        if (state.files.length === 0 && tries < 40) {
          tries++;
          return;
        }
        if (interval) clearInterval(interval);
        if (cancelled || state.files.length === 0) return;
        const newFileId = state.createFile('shared.py');
        state.updateFileContent(newFileId, code ?? '');
        state.setActiveFile(newFileId);
        window.history.replaceState(null, '', window.location.pathname);
        showToast('Shared snippet ek new tab mein khul gaya 📎');
      }, 250);
    })();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [showToast]);

  // Keyboard-first: ⌘/Ctrl+Enter run · ⌘/Ctrl+K palette · ⌘/Ctrl+B focus mode
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        handleRun();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        toggleIntent();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleRun, toggleIntent]);

  const paletteActions: PaletteAction[] = [
    { id: 'run', label: 'Chalao — run current file', hint: '⌘ ↵', icon: Play, accent: '#00FFA3', keywords: 'execute pyodide run', onSelect: handleRun },
    { id: 'mode-voice', label: 'Switch to Bolo (Voice) mode', icon: Mic, accent: '#22d3ee', keywords: 'speak mic hinglish bolo input', onSelect: () => setMode('voice') },
    { id: 'mode-text', label: 'Switch to Likho (Text) mode', icon: Keyboard, accent: '#a78bfa', keywords: 'type prompt hinglish likho input', onSelect: () => setMode('text') },
    { id: 'format', label: 'Format code — indentation cleanup', icon: Sparkles, accent: '#c4b5fd', keywords: 'tidy indent beautify format', onSelect: handleFormat },
    { id: 'share', label: 'Share snippet — copy link', icon: Share2, accent: '#67e8f9', keywords: 'url hash copy link share', onSelect: () => void handleShare() },
    { id: 'intent', label: intentOpen ? 'Hide intent panel — focus mode' : 'Show intent panel', hint: '⌘ B', icon: PanelLeft, accent: '#67e8f9', keywords: 'fullscreen distraction split toggle', onSelect: toggleIntent },
    { id: 'clear-terminal', label: 'Clear terminal output', icon: Trash2, accent: 'rgba(255,255,255,0.6)', keywords: 'output console clean', onSelect: handleClearTerminal },
    { id: 'reset', label: 'Reset workspace — fresh template', icon: RotateCcw, accent: '#f87171', keywords: 'restart wipe clear new', onSelect: handleResetWorkspace },
  ];

  return (
    <div
      className="h-dvh flex flex-col overflow-hidden relative"
      style={{ background: '#07090d' }}
    >
      {/* ── Ambient backdrop ── */}
      <div aria-hidden className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <ScanlineOverlay />
        <div
          className="absolute rounded-full"
          style={{
            width: 560,
            height: 560,
            left: '-6%',
            top: '-14%',
            background: 'radial-gradient(circle, #22d3ee, transparent)',
            filter: 'blur(110px)',
            opacity: 0.07,
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 480,
            height: 480,
            right: '-8%',
            bottom: '-18%',
            background: 'radial-gradient(circle, #a78bfa, transparent)',
            filter: 'blur(110px)',
            opacity: 0.06,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
            backgroundSize: '52px 52px',
            maskImage: 'radial-gradient(ellipse 90% 90% at 50% 40%, black 30%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 90% 90% at 50% 40%, black 30%, transparent 100%)',
          }}
        />
      </div>

      <StudioHeader
        onOpenTutorial={() => setIsTutorialOpen(true)}
        intentOpen={intentOpen}
        onToggleIntent={toggleIntent}
      />

      <motion.main
        className="relative z-10 flex-1 min-h-0 w-full max-w-[1720px] mx-auto p-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <SplitPane
          direction={isDesktop ? 'columns' : 'rows'}
          defaultRatio={0.45}
          storageKey="codebhasha-studio-split"
          label="Resize studio panes"
          collapsed={!intentOpen}
          first={
            <div
              className="h-full rounded-xl overflow-hidden"
              style={{
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 12px 40px rgba(0,0,0,0.4)',
              }}
            >
              <AiStudio mode={mode} onModeChange={setMode} />
            </div>
          }
          second={<EditorPane onRun={handleRun} />}
        />
      </motion.main>

      {/* ── Overlays ── */}
      <TutorDrawer />
      <TutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} actions={paletteActions} />

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            className="fixed z-[90] left-1/2 bottom-6"
            style={{ x: '-50%' }}
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            role="status"
          >
            <div
              className="px-4 py-2.5 rounded-xl text-xs font-mono whitespace-nowrap"
              style={{
                background: 'rgba(13, 17, 25, 0.95)',
                border: '1px solid rgba(0,255,163,0.28)',
                color: 'rgba(0,255,163,0.9)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 0 24px rgba(0,255,163,0.07), inset 0 1px 0 rgba(255,255,255,0.06)',
                backdropFilter: 'blur(12px)',
              }}
            >
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
