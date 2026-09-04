'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Tracks the desktop breakpoint so the shell can flip the split direction
// (side-by-side columns on desktop, stacked rows on smaller screens).
// Returns `true` until the first client measurement so SSR markup matches.
export function useIsDesktop(query = '(min-width: 1024px)'): boolean {
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);

  return isDesktop;
}

interface SplitPaneProps {
  first: React.ReactNode;
  second: React.ReactNode;
  /** 'columns' = side-by-side panes, 'rows' = stacked panes */
  direction: 'columns' | 'rows';
  defaultRatio?: number;
  minRatio?: number;
  maxRatio?: number;
  /** localStorage key for persisting the dragged ratio */
  storageKey?: string;
  label?: string;
  /** when true, the first pane slides shut (⌘B focus mode) without unmounting it */
  collapsed?: boolean;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

// ─── Resizable two-pane split with independent interior scroll regions ────────
export function SplitPane({
  first,
  second,
  direction,
  defaultRatio = 0.45,
  minRatio = 0.28,
  maxRatio = 0.68,
  storageKey,
  label = 'Resize panes',
  collapsed = false,
}: SplitPaneProps) {
  const [ratio, setRatio] = useState(defaultRatio);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Restore persisted ratio once on mount
  useEffect(() => {
    if (!storageKey) return;
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      const parsed = parseFloat(stored);
      if (!Number.isNaN(parsed)) setRatio(clamp(parsed, minRatio, maxRatio));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const applyRatio = useCallback(
    (next: number) => {
      const clamped = clamp(next, minRatio, maxRatio);
      setRatio(clamped);
      if (storageKey) window.localStorage.setItem(storageKey, String(clamped));
    },
    [minRatio, maxRatio, storageKey]
  );

  // Pointer drag — window-level listeners survive leaving the divider
  useEffect(() => {
    if (!dragging) return;

    const onMove = (event: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const raw =
        direction === 'columns'
          ? (event.clientX - rect.left) / rect.width
          : (event.clientY - rect.top) / rect.height;
      applyRatio(raw);
    };
    const onUp = () => setDragging(false);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, direction, applyRatio]);

  const isColumns = direction === 'columns';
  const isVertical = !isColumns; // separator aria orientation

  const onKeyDown = (event: React.KeyboardEvent) => {
    const step = event.shiftKey ? 0.1 : 0.03;
    const decrease = isColumns ? 'ArrowLeft' : 'ArrowUp';
    const increase = isColumns ? 'ArrowRight' : 'ArrowDown';
    if (event.key === decrease) {
      event.preventDefault();
      applyRatio(ratio - step);
    } else if (event.key === increase) {
      event.preventDefault();
      applyRatio(ratio + step);
    } else if (event.key === 'Home') {
      event.preventDefault();
      applyRatio(defaultRatio);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`flex h-full min-h-0 w-full ${dragging ? (isColumns ? 'cursor-col-resize' : 'cursor-row-resize') : ''}`}
      style={{ flexDirection: isColumns ? 'row' : 'column' }}
    >
      {/* ── First pane ── */}
      <div
        className="relative min-h-0 min-w-0 overflow-hidden"
        style={{
          flex: `0 0 ${collapsed ? '0%' : `${ratio * 100}%`}`,
          transition: 'flex-basis 380ms cubic-bezier(0.22, 1, 0.36, 1)',
          pointerEvents: collapsed ? 'none' : undefined,
          visibility: collapsed ? 'hidden' : undefined,
        }}
        aria-hidden={collapsed}
      >
        {first}
      </div>

      {/* ── Divider ── */}
      {!collapsed && (
        <div
        role="separator"
        aria-label={label}
        aria-orientation={isVertical ? 'horizontal' : 'vertical'}
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuemin={Math.round(minRatio * 100)}
        aria-valuemax={Math.round(maxRatio * 100)}
        tabIndex={0}
        onPointerDown={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDoubleClick={() => applyRatio(defaultRatio)}
        onKeyDown={onKeyDown}
        className={`group relative z-20 shrink-0 flex items-center justify-center transition-colors ${
          isColumns
            ? 'w-px cursor-col-resize touch-none'
            : 'h-px cursor-row-resize touch-none'
        } ${dragging ? 'bg-cyan-400/40' : 'bg-white/10 hover:bg-cyan-400/30 focus-visible:bg-cyan-400/40'}`}
        style={{ outline: 'none' }}
        title="Drag to resize · double-click to reset"
      >
        {/* Wider hit area */}
        <div
          className={`absolute ${
            isColumns ? 'inset-y-0 -left-2 -right-2' : 'inset-x-0 -top-2 -bottom-2'
          }`}
        />
        {/* Grip dots */}
        <div
          className={`absolute flex gap-[3px] rounded-full p-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 ${
            isColumns ? 'flex-col' : ''
          }`}
          style={
            isColumns
              ? { left: 0, top: '50%', transform: 'translate(-50%, -50%)' }
              : { top: 0, left: '50%', transform: 'translate(-50%, -50%)' }
          }
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="rounded-full"
              style={{
                width: isColumns ? 2 : 10,
                height: isColumns ? 10 : 2,
                background: 'rgba(34,211,238,0.55)',
              }}
            />
          ))}
        </div>
      </div>
      )}

      {/* ── Second pane ── */}
      <div className="relative min-h-0 min-w-0 overflow-hidden flex-1">{second}</div>
    </div>
  );
}
