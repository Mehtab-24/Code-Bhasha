'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Command as CommandIcon, CornerDownLeft, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface PaletteAction {
  id: string;
  label: string;
  /** secondary shortcut hint shown on the right */
  hint?: string;
  keywords?: string;
  icon: React.ElementType;
  accent?: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  actions: PaletteAction[];
}

// ─── ⌘K Command Palette — quick mode switch, format, share, reset ─────────────
export function CommandPalette({ open, onClose, actions }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
      // wait a tick so the portal input exists before focusing
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((action) =>
      `${action.label} ${action.keywords ?? ''}`.toLowerCase().includes(q)
    );
  }, [actions, query]);

  useEffect(() => setIndex(0), [query]);

  // keep the selected row visible while arrowing through the list
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${index}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-start justify-center pt-[14vh] px-4"
          style={{ background: 'rgba(4, 6, 10, 0.6)', backdropFilter: 'blur(6px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          <motion.div
            className="w-full max-w-lg overflow-hidden rounded-2xl"
            style={{
              background: 'linear-gradient(180deg, rgba(21, 26, 37, 0.96), rgba(13, 16, 24, 0.97))',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 40px 100px rgba(0,0,0,0.7), 0 0 60px rgba(34,211,238,0.05), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
            initial={{ opacity: 0, y: -14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setIndex((i) => (filtered.length ? (i + 1) % filtered.length : 0));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setIndex((i) => (filtered.length ? (i - 1 + filtered.length) % filtered.length : 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                const action = filtered[index];
                if (action) {
                  onClose();
                  action.onSelect();
                }
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
              }
            }}
          >
            {/* ── Search input ── */}
            <div
              className="flex items-center gap-2.5 px-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
            >
              <Search className="w-4 h-4 shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command… (Bolo, format, share, reset)"
                className="w-full bg-transparent py-3.5 text-sm focus:outline-none"
                style={{ color: 'rgba(255,255,255,0.88)', caretColor: '#22d3ee' }}
                aria-label="Search commands"
                autoComplete="off"
                spellCheck={false}
              />
              <kbd
                className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}
              >
                ESC
              </kbd>
            </div>

            {/* ── Action list ── */}
            <div ref={listRef} className="max-h-[46vh] overflow-y-auto p-2" role="listbox">
              {filtered.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs font-mono" style={{ color: 'rgba(255,255,255,0.28)' }}>
                  Kuch nahi mila — dusra keyword try karo
                </p>
              ) : (
                filtered.map((action, i) => {
                  const Icon = action.icon;
                  const selected = i === index;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      data-index={i}
                      role="option"
                      aria-selected={selected}
                      onMouseEnter={() => setIndex(i)}
                      onClick={() => {
                        onClose();
                        action.onSelect();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors focus-visible:outline-none"
                      style={{
                        background: selected ? 'rgba(34,211,238,0.08)' : 'transparent',
                        border: `1px solid ${selected ? 'rgba(34,211,238,0.22)' : 'transparent'}`,
                      }}
                    >
                      <span
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          background: selected ? `${action.accent ?? '#22d3ee'}1f` : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${selected ? `${action.accent ?? '#22d3ee'}44` : 'rgba(255,255,255,0.07)'}`,
                        }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: action.accent ?? 'rgba(255,255,255,0.6)' }} />
                      </span>
                      <span
                        className="flex-1 text-[13px] font-medium truncate"
                        style={{ color: selected ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.66)' }}
                      >
                        {action.label}
                      </span>
                      {action.hint && (
                        <kbd
                          className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.42)' }}
                        >
                          {action.hint}
                        </kbd>
                      )}
                      {selected && (
                        <CornerDownLeft className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgba(34,211,238,0.7)' }} />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* ── Footer hints ── */}
            <div
              className="flex items-center gap-4 px-4 py-2"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}
            >
              <span className="flex items-center gap-1.5 text-[10px] font-mono select-none" style={{ color: 'rgba(255,255,255,0.28)' }}>
                <CommandIcon className="w-3 h-3" /> K toggle
              </span>
              <span className="text-[10px] font-mono select-none" style={{ color: 'rgba(255,255,255,0.28)' }}>
                ↑↓ navigate
              </span>
              <span className="text-[10px] font-mono select-none" style={{ color: 'rgba(255,255,255,0.28)' }}>
                ↵ select
              </span>
              <span className="ml-auto text-[10px] font-mono select-none" style={{ color: 'rgba(255,255,255,0.18)' }}>
                {filtered.length} command{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
