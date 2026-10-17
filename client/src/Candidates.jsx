import React, { useEffect, useState } from 'react';
import { api } from './api.js';
import { STAGES, STAGE_CONFIG, getInitials, getAvatarGradient, fmtDate, exportCandidatesToCSV, calculateATSScore } from './constants.js';

export default function Candidates({ version, onOpen, onNotify }) {
  const [q, setQ]               = useState('');
  const [debouncedQ, setDQ]     = useState('');
  const [stage, setStage]       = useState('');
  const [role, setRole]         = useState('');
  const [sort, setSort]         = useState('created_at');
  const [order, setOrder]       = useState('desc');
  const [page, setPage]         = useState(1);
  const [roles, setRoles]       = useState([]);
  const [data, setData]         = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    const t = setTimeout(() => { setDQ(q); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => { api.roles().then(setRoles).catch(() => {}); }, [version]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.list({ q: debouncedQ, stage, role, sort, order, page, limit: 10 })
      .then(r => { if (!cancelled) { setData(r); setError(''); } })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedQ, stage, role, sort, order, page, version]);

  const reset = () => { setQ(''); setDQ(''); setStage(''); setRole(''); setSort('created_at'); setOrder('desc'); setPage(1); };

  const handleExportView = () => {
    if (!data.items.length) return;
    const filename = `candidates_page${page}.csv`;
    exportCandidatesToCSV(data.items, filename);
    if (onNotify) onNotify(`Exported ${data.items.length} candidates → Saved to Downloads!`);
  };

  const filtered = q || stage || role;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Candidate directory</h1>
        <p className="page-desc">{data.total} candidate{data.total !== 1 ? 's' : ''} in your pipeline</p>
      </div>

      {/* Toolbar */}
      <div className="filter-toolbar">
        <div className="search-box-wrap">
          <svg className="search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="search" className="input search-input"
            placeholder="Search by name, email, role, or skill…"
            value={q} onChange={e => setQ(e.target.value)} aria-label="Search candidates" />
          {q && (
            <button className="search-clear-btn" onClick={() => setQ('')}>×</button>
          )}
        </div>

        <div className="filter-actions">
          <select className="input select-filter" value={stage}
            onChange={e => { setStage(e.target.value); setPage(1); }}>
            <option value="">All stages</option>
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select className="input select-filter" value={role}
            onChange={e => { setRole(e.target.value); setPage(1); }}>
            <option value="">All roles</option>
            {roles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          <select className="input select-filter" value={`${sort}:${order}`}
            onChange={e => { const [s, o] = e.target.value.split(':'); setSort(s); setOrder(o); setPage(1); }}>
            <option value="created_at:desc">Newest</option>
            <option value="created_at:asc">Oldest</option>
            <option value="name:asc">Name A–Z</option>
            <option value="experience:desc">Most experience</option>
          </select>

          {filtered && <button className="btn btn-ghost" onClick={reset}>Clear</button>}

          <a
            href={`/api/export/csv?q=${encodeURIComponent(debouncedQ)}&stage=${encodeURIComponent(stage)}&role=${encodeURIComponent(role)}&sort=${encodeURIComponent(sort)}&order=${encodeURIComponent(order)}`}
            download="candidates_view.csv"
            className="btn btn-ghost"
            title="Download current view as CSV file"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export view
          </a>
        </div>
      </div>

      {error && (
        <div className="notice notice-error" style={{ marginBottom: 12 }}>{error}</div>
      )}

      {/* Table */}
      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>ATS Match</th>
              <th>Skills</th>
              <th>Exp.</th>
              <th>Stage</th>
              <th>Applied</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map(c => {
              const cfg    = STAGE_CONFIG[c.stage] || {};
              const skills = (c.skills || '').split(',').map(s => s.trim()).filter(Boolean);
              const ats    = calculateATSScore(c.skills, c.role);
              return (
                <tr key={c.id}
                  onClick={() => onOpen(c.id)} tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && onOpen(c.id)}>
                  <td>
                    <div className="candidate-cell">
                      <div className="avatar" style={{ background: getAvatarGradient(c.name) }}>
                        {getInitials(c.name)}
                      </div>
                      <div>
                        <div className="candidate-cell-name">{c.name}</div>
                        <div className="candidate-cell-email">{c.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontWeight: 500 }}>{c.role}</td>
                  <td>
                    <span className={`ats-score-badge ${ats.score >= 70 ? 'ats-score-high' : 'ats-score-mid'}`}>
                      {ats.score}%
                    </span>
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap', maxWidth:200 }}>
                      {skills.slice(0, 2).map(s => <span className="skill-tag" key={s}>{s}</span>)}
                      {skills.length > 2 && <span className="skill-tag" style={{ opacity:.6 }}>+{skills.length-2}</span>}
                    </div>
                  </td>
                  <td style={{ color:'var(--text-2)' }}>{c.experience || 0} yrs</td>
                  <td>
                    <span className="pill"
                      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
                      <span className="pill-dot" style={{ background: cfg.color }} />
                      {c.stage}
                    </span>
                  </td>
                  <td style={{ color:'var(--text-3)' }}>{fmtDate(c.created_at)}</td>
                </tr>
              );
            })}

            {!loading && data.items.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign:'center', padding:'48px 14px', color:'var(--text-3)' }}>
                  {filtered ? 'No candidates match these filters.' : 'No candidates yet — add one above.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="pagination-bar">
          <span>
            {data.total > 0
              ? `${(page-1)*10+1}–${Math.min(page*10, data.total)} of ${data.total}`
              : '0 results'}
          </span>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <button className="btn" disabled={page <= 1} onClick={() => setPage(p => p-1)}>Previous</button>
            <span style={{ fontSize:12, padding:'0 8px' }}>Page {Math.min(page, data.pages)} of {data.pages}</span>
            <button className="btn" disabled={page >= data.pages} onClick={() => setPage(p => p+1)}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
