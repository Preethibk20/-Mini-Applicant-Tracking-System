import React, { useState, useEffect } from 'react';
import Dashboard from './Dashboard.jsx';
import Board from './Board.jsx';
import Candidates from './Candidates.jsx';
import CandidateModal from './CandidateModal.jsx';
import { api } from './api.js';
import { exportCandidatesToCSV } from './constants.js';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'board', label: 'Pipeline Board', icon: '📋' },
  { key: 'candidates', label: 'Candidate Directory', icon: '👥' }
];

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [version, setVersion] = useState(0);
  const [modal, setModal] = useState(null); // { id: number | null }
  const [theme, setTheme] = useState(() => localStorage.getItem('talentpulse_theme') || 'dark');
  const [toast, setToast] = useState(null);
  const [counts, setCounts] = useState({ total: 24, active: 17 });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('talentpulse_theme', theme);
  }, [theme]);

  useEffect(() => {
    api.dashboard()
      .then((d) => setCounts({ total: d.total, active: d.active }))
      .catch(() => {});
  }, [version]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast((t) => (t?.message === message ? null : t)), 3200);
  };

  const refresh = () => setVersion((v) => v + 1);
  const open = (id = null) => setModal({ id });

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleExport = async () => {
    try {
      showToast('Preparing candidate export…');
      const all = await api.exportAll();
      exportCandidatesToCSV(all, `talentpulse_candidates_${new Date().toISOString().slice(0, 10)}.csv`);
      showToast(`Exported ${all.length} candidates to CSV!`);
    } catch (err) {
      showToast(err.message || 'Export failed', 'error');
    }
  };

  const handleResetDemo = async () => {
    if (!window.confirm('Reset candidate pipeline and history back to default sample data?')) return;
    try {
      await api.resetDemo();
      refresh();
      showToast('Demo data reloaded successfully!');
    } catch (err) {
      showToast(err.message || 'Reset failed', 'error');
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <polyline points="16 11 18 13 22 9" />
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-title">TalentPulse</span>
            <span className="brand-badge">Mini ATS · {counts.total} Candidates</span>
          </div>
        </div>

        <nav className="tabs-nav" role="tablist">
          {TABS.map(({ key, label, icon }) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              className={`tab-btn ${tab === key ? 'active' : ''}`}
              onClick={() => setTab(key)}
            >
              <span>{icon}</span>
              <span>{label}</span>
              {key === 'candidates' && <span className="tab-badge">{counts.total}</span>}
              {key === 'board' && <span className="tab-badge">{counts.active} active</span>}
            </button>
          ))}
        </nav>

        <div className="topbar-actions">
          <button
            className="btn btn-ghost btn-icon"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          <button className="btn" onClick={handleExport} title="Download candidate list as CSV">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Export CSV</span>
          </button>

          <button className="btn btn-ghost" onClick={handleResetDemo} title="Reset demo seed data">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
            <span>Reset Demo</span>
          </button>

          <button className="btn btn-primary" onClick={() => open(null)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add Candidate</span>
          </button>
        </div>
      </header>

      <main className="main-content">
        {tab === 'dashboard' && <Dashboard version={version} onOpen={open} onSwitchTab={setTab} />}
        {tab === 'board' && <Board version={version} onOpen={open} onChanged={refresh} onNotify={showToast} />}
        {tab === 'candidates' && <Candidates version={version} onOpen={open} onNotify={showToast} />}
      </main>

      {modal && (
        <CandidateModal
          id={modal.id}
          onClose={() => setModal(null)}
          onSaved={(msg) => {
            setModal(null);
            refresh();
            if (msg) showToast(msg);
          }}
          onNotify={showToast}
        />
      )}

      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            <span className="toast-icon">
              {toast.type === 'error' ? '⚠️' : '✓'}
            </span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
