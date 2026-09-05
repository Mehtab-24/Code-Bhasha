'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Code2,
  Keyboard,
  Mic,
  PanelLeft,
  Play,
  RotateCcw,
  Share2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
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
type MobileView = 'studio' | 'code';

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

// ─── Mobile/tablet top-level view switcher pill ───────────────────────────────
function MobileViewTab({
  id,
  activeView,
  onSelect,
  icon: Icon,
  label,
  accent,
}: {
  id: MobileView;
  activeView: MobileView;
  onSelect: (view: MobileView) => void;
  icon: React.ElementType;
  label: string;
  accent: string;
}) {
  const isActive = id === activeView;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => onSelect(id)}
      className="relative flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold tracking-wide select-none transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/25"
      style={{ color: isActive ? accent : 'rgba(255,255,255,0.4)', zIndex: 1 }}
    >
      {isActive && (
        <motion.span
          className="absolute inset-0 rounded-lg"
          layoutId="studio-view-pill"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: `1px solid ${accent}44`,
            boxShadow: `0 0 16px ${accent}1f, inset 0 1px 0 rgba(255,255,255,0.07)`,
          }}
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        />
      )}
      <Icon className="w-3.5 h-3.5 relative" />
      <span className="relative">{label}</span>
    </button>
  );
}

// ─── Fixed 100vh developer studio shell (desktop) · two-tab scroller (mobile) ─
export function StudioShell() {
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [intentOpen, setIntentOpen] = useState(true);
  const [mode, setMode] = useState<StudioMode>('voice');
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const setWorkerReady = useExecutionStore((s) => s.setWorkerReady);
  const isDesktop = useIsDesktop();

  // ── Mobile/tablet two-tab architecture (< lg) ──
  // Both panes stay mounted (CSS-toggled) so the Monaco buffer, mic session
  // and prompt state survive tab switches; the code pane mounts lazily on
  // first activation so Monaco never measures a zero-size hidden container.
  const [mobileTab, setMobileTab] = useState<MobileView>('studio');
  const [codePaneMounted, setCodePaneMounted] = useState(false);

  const switchMobileTab = useCallback((view: MobileView) => {
    setMobileTab(view);
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!isDesktop && mobileTab === 'code') setCodePaneMounted(true);
  }, [isDesktop, mobileTab]);

  // Auto-switch to the Code & Terminal tab the moment a generation yields
  // code — covers both the streaming path (isGeneratingCode falls) and the
  // IndexedDB cache path (code appears without ever toggling the flag).
  const isGeneratingCode = useExecutionStore((s) => s.isGeneratingCode);
  const generatedCodeLen = useExecutionStore((s) => s.voiceResult?.code?.length ?? 0);
  const generationRef = useRef({ generating: false, codeLen: 0 });
  useEffect(() => {
    const prev = generationRef.current;
    const finished = prev.generating && !isGeneratingCode;
    const codeArrived = prev.codeLen === 0 && generatedCodeLen > 0 && !isGeneratingCode;
    if ((finished || codeArrived) && generatedCodeLen > 0) {
      setMobileTab('code');
      window.scrollTo(0, 0);
    }
    generationRef.current = { generating: isGeneratingCode, codeLen: generatedCodeLen };
  }, [isGeneratingCode, generatedCodeLen]);

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
    state.updateFileContent(state.activeFileId, '# Start coding in Python or speak your logic...\n');
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
        setMobileTab('code');
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

  // AI intent card — shared by the desktop split pane and the mobile tab
  const inputCard = (
    <div
      className="h-full rounded-xl overflow-hidden"
      style={{
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 12px 40px rgba(0,0,0,0.4)',
      }}
    >
      <AiStudio mode={mode} onModeChange={setMode} />
    </div>
  );

  return (
    <div
      className={`relative flex flex-col ${
        isDesktop ? 'h-dvh overflow-hidden' : 'min-h-dvh pb-16'
      }`}
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

      {/* Navbar stays pinned while the mobile layout scrolls naturally */}
      <div className={isDesktop ? 'shrink-0' : 'sticky top-0 z-40 shrink-0'}>
        <StudioHeader
          onOpenTutorial={() => setIsTutorialOpen(true)}
          intentOpen={intentOpen}
          onToggleIntent={toggleIntent}
        />
      </div>

      {/* ── Mobile/tablet two-tab switcher (right below the navbar) ── */}
      {!isDesktop && (
        <div
          className="sticky top-12 z-30 shrink-0"
          style={{
            background: 'rgba(7, 9, 13, 0.88)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
          }}
        >
          <div className="w-full max-w-[1720px] mx-auto px-3 py-2">
            <div
              className="flex gap-1 p-1 rounded-xl"
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
              role="tablist"
              aria-label="Studio views"
            >
              <MobileViewTab
                id="studio"
                activeView={mobileTab}
                onSelect={switchMobileTab}
                icon={Mic}
                label="Studio / Input"
                accent="#22d3ee"
              />
              <MobileViewTab
                id="code"
                activeView={mobileTab}
                onSelect={switchMobileTab}
                icon={Code2}
                label="Code & Terminal"
                accent="#00FFA3"
              />
            </div>
          </div>
        </div>
      )}

      <motion.main
        className="relative z-10 flex-1 min-h-0 w-full max-w-[1720px] mx-auto p-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {isDesktop ? (
          <SplitPane
            direction="columns"
            defaultRatio={0.45}
            storageKey="codebhasha-studio-split"
            label="Resize studio panes"
            collapsed={!intentOpen}
            first={inputCard}
            second={<EditorPane onRun={handleRun} />}
          />
        ) : (
          <>
            {/* Tab 1 — full-width input studio */}
            <div className={mobileTab === 'studio' ? 'block' : 'hidden'}>{inputCard}</div>
            {/* Tab 2 — full-width editor + controls + terminal dock */}
            {codePaneMounted && (
              <div className={mobileTab === 'code' ? 'block' : 'hidden'}>
                <EditorPane onRun={handleRun} variant="stacked" />
              </div>
            )}
          </>
        )}
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
