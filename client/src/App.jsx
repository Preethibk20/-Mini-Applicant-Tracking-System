import React, { useState, useEffect } from 'react';
import Dashboard from './Dashboard.jsx';
import Board from './Board.jsx';
import Candidates from './Candidates.jsx';
import CandidateModal from './CandidateModal.jsx';
import CommandPalette from './CommandPalette.jsx';
import ResumeScannerModal from './ResumeScannerModal.jsx';
import { api } from './api.js';
import { exportCandidatesToCSV } from './constants.js';

const TABS = [
  { key: 'dashboard', label: 'Overview' },
  { key: 'board',     label: 'Pipeline' },
  { key: 'candidates', label: 'Candidates' }
];

export default function App() {
  const [tab, setTab]       = useState('dashboard');
  const [version, setVersion] = useState(0);
  const [modal, setModal]   = useState(null);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [theme, setTheme]   = useState(() => localStorage.getItem('ats_theme') || 'dark');
  const [toast, setToast]   = useState(null);
  const [total, setTotal]   = useState(0);

  useEffect(() => {
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen(o => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ats_theme', theme);
  }, [theme]);

  useEffect(() => {
    api.dashboard().then(d => setTotal(d.total)).catch(() => {});
  }, [version]);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => setToast(t => t?.id === id ? null : t), 3000);
  };

  const refresh = () => setVersion(v => v + 1);
  const open    = (id = null) => setModal({ id });

  const handleExport = () => {
    window.location.href = '/api/export/csv';
    showToast('Downloading candidates CSV → Check your Downloads folder!');
  };

  return (
    <div className="app">
      <header className="topbar">
        {/* Brand */}
        <div className="brand-wrap">
          <div className="brand-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <polyline points="16 11 18 13 22 9"/>
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-title">TalentPulse</span>
            <span className="brand-badge">{total > 0 ? `${total} candidates` : 'ATS'}</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="tabs-nav" role="tablist">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              className={`tab-btn${tab === key ? ' active' : ''}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Actions */}
        <div className="topbar-actions">
          <button
            className="topbar-search-trigger"
            onClick={() => setCmdOpen(true)}
            title="Quick search or jump to (Ctrl+K)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <span>Quick search…</span>
            <kbd>Ctrl K</kbd>
          </button>

          <button
            className="btn-icon btn btn-ghost"
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>

          <a
            href="/api/export/csv"
            download="candidates.csv"
            className="btn btn-ghost"
            title="Download all candidates as CSV file"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </a>

          <button className="btn btn-ghost" onClick={() => setScannerOpen(true)} title="ATS Resume Scanner & Verification">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            Scan resume
          </button>

          <button className="btn btn-primary" onClick={() => open(null)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add candidate
          </button>
        </div>
      </header>

      <main className="main-content">
        {tab === 'dashboard'  && <Dashboard version={version} onOpen={open} onSwitchTab={setTab} />}
        {tab === 'board'      && <Board version={version} onOpen={open} onChanged={refresh} onNotify={showToast} />}
        {tab === 'candidates' && <Candidates version={version} onOpen={open} onNotify={showToast} />}
      </main>

      {modal && (
        <CandidateModal
          id={modal.id}
          onClose={() => setModal(null)}
          onSaved={msg => { setModal(null); refresh(); if (msg) showToast(msg); }}
          onNotify={showToast}
        />
      )}

      {scannerOpen && (
        <ResumeScannerModal
          onClose={() => setScannerOpen(false)}
          onCandidateCreated={msg => { refresh(); if (msg) showToast(msg); }}
          onNotify={showToast}
        />
      )}

      {cmdOpen && (
        <CommandPalette
          onClose={() => setCmdOpen(false)}
          onOpen={id => { setCmdOpen(false); open(id); }}
          onSwitchTab={t => { setCmdOpen(false); setTab(t); }}
          onNotify={showToast}
          onAddCandidate={() => { setCmdOpen(false); open(null); }}
          onScanResume={() => { setCmdOpen(false); setScannerOpen(true); }}
        />
      )}

      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            {toast.type !== 'error' && <span className="toast-icon">✓</span>}
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
