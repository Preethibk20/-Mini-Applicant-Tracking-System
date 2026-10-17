import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from './api.js';
import { STAGES, STAGE_CONFIG, getInitials, getAvatarGradient } from './constants.js';

/**
 * Command Palette — Ctrl+K / ⌘K
 * Search candidates, jump to pages, run actions.
 */
export default function CommandPalette({ onClose, onOpen, onSwitchTab, onNotify, onAddCandidate, onScanResume }) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef  = useRef(null);
  const listRef   = useRef(null);

  // Static actions
  const actions = useMemo(() => [
    { type: 'action', id: 'scan',        label: 'Scan resume (ATS Verification)', hint: 'S', run: () => { onClose(); onScanResume?.(); } },
    { type: 'action', id: 'new',        label: 'Add new candidate',      hint: 'N',   run: () => { onClose(); onAddCandidate(); } },
    { type: 'action', id: 'overview',   label: 'Go to Overview',         hint: '1',   run: () => { onClose(); onSwitchTab('dashboard'); } },
    { type: 'action', id: 'pipeline',   label: 'Go to Pipeline board',   hint: '2',   run: () => { onClose(); onSwitchTab('board'); } },
    { type: 'action', id: 'directory',  label: 'Go to Candidate directory', hint: '3', run: () => { onClose(); onSwitchTab('candidates'); } },
  ], [onClose, onSwitchTab, onAddCandidate, onScanResume]);

  // Search candidates on typing
  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      setSelected(0);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      api.list({ q, limit: 8, sort: 'updated_at', order: 'desc' })
        .then(r => {
          setResults(r.items.map(c => ({
            type: 'candidate',
            id: c.id,
            label: c.name,
            sublabel: `${c.role} · ${c.stage}`,
            stage: c.stage,
            name: c.name,
            run: () => { onClose(); onOpen(c.id); }
          })));
          setSelected(0);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 120);
    return () => clearTimeout(timer);
  }, [query, onClose, onOpen]);

  // Combined list: actions (filtered) + candidate results
  const allItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filteredActions = q
      ? actions.filter(a => a.label.toLowerCase().includes(q))
      : actions;
    return [...filteredActions, ...results];
  }, [query, actions, results]);

  // Keyboard nav
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected(s => Math.min(s + 1, allItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected(s => Math.max(s - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (allItems[selected]) allItems[selected].run();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [allItems, selected]);

  // Scroll selected into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[selected];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  // Auto-focus
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="cmd-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="cmd-dialog" role="dialog" aria-label="Command palette">
        {/* Search */}
        <div className="cmd-search-row">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ color: 'var(--text-3)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            className="cmd-search-input"
            type="text"
            placeholder="Search candidates, jump to page…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck="false"
          />
          <kbd className="cmd-kbd">esc</kbd>
        </div>

        {/* Results */}
        <div className="cmd-list" ref={listRef}>
          {allItems.length === 0 && query.trim().length > 0 && !loading && (
            <div className="cmd-empty">
              No results for "{query}"
            </div>
          )}

          {/* Render groups */}
          {allItems.length > 0 && (() => {
            const groups = [];
            let lastType = null;

            allItems.forEach((item, i) => {
              if (item.type !== lastType) {
                groups.push(
                  <div className="cmd-group-label" key={`group-${item.type}`}>
                    {item.type === 'action' ? 'Actions' : 'Candidates'}
                  </div>
                );
                lastType = item.type;
              }
              groups.push(
                <button
                  key={`${item.type}-${item.id}`}
                  className={`cmd-item${i === selected ? ' cmd-item-active' : ''}`}
                  onClick={item.run}
                  onMouseEnter={() => setSelected(i)}
                >
                  {item.type === 'candidate' ? (
                    <div className="avatar" style={{ background: getAvatarGradient(item.name), width: 24, height: 24, fontSize: 10 }}>
                      {getInitials(item.name)}
                    </div>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      style={{ color: 'var(--text-3)', flexShrink: 0 }}>
                      {item.id === 'new' && <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>}
                      {item.id === 'overview' && <><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></>}
                      {item.id === 'pipeline' && <><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>}
                      {item.id === 'directory' && <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>}
                    </svg>
                  )}
                  <div className="cmd-item-text">
                    <span className="cmd-item-label">{item.label}</span>
                    {item.sublabel && <span className="cmd-item-sub">{item.sublabel}</span>}
                  </div>
                  {item.hint && <kbd className="cmd-kbd">{item.hint}</kbd>}
                  {item.stage && (
                    <span className="pill" style={{
                      fontSize: 10,
                      color: STAGE_CONFIG[item.stage]?.color,
                      background: STAGE_CONFIG[item.stage]?.bg,
                      borderColor: STAGE_CONFIG[item.stage]?.border
                    }}>
                      {item.stage}
                    </span>
                  )}
                </button>
              );
            });

            return groups;
          })()}

          {loading && (
            <div className="cmd-empty" style={{ opacity: .6 }}>Searching…</div>
          )}
        </div>

        {/* Footer */}
        <div className="cmd-footer">
          <span><kbd className="cmd-kbd">↑↓</kbd> navigate</span>
          <span><kbd className="cmd-kbd">↵</kbd> select</span>
          <span><kbd className="cmd-kbd">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
