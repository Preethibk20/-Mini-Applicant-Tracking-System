import React, { useEffect, useState } from 'react';
import { api } from './api.js';
import { STAGES, STAGE_CONFIG, getInitials, getAvatarGradient, fmtDate, exportCandidatesToCSV } from './constants.js';

export default function Candidates({ version, onOpen, onNotify }) {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [stage, setStage] = useState('');
  const [role, setRole] = useState('');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [roles, setRoles] = useState([]);
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    api.roles().then(setRoles).catch(() => {});
  }, [version]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.list({ q: debouncedQ, stage, role, sort, order, page, limit: 10 })
      .then((r) => {
        if (!cancelled) {
          setData(r);
          setError('');
        }
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debouncedQ, stage, role, sort, order, page, version]);

  const reset = () => {
    setQ('');
    setDebouncedQ('');
    setStage('');
    setRole('');
    setSort('created_at');
    setOrder('desc');
    setPage(1);
  };

  const handleExportCurrent = () => {
    if (!data.items.length) return;
    exportCandidatesToCSV(data.items, `candidates_page_${page}.csv`);
    if (onNotify) onNotify(`Exported ${data.items.length} candidates!`);
  };

  const filtered = q || stage || role;

  return (
    <div>
      {/* Search & Filter Toolbar */}
      <div className="filter-toolbar">
        <div className="search-box-wrap">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            className="input search-input"
            placeholder="Search by candidate name, email, role, or skill…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search candidates"
          />
          {q && (
            <button className="search-clear-btn" onClick={() => setQ('')} title="Clear search">
              ×
            </button>
          )}
        </div>

        <div className="filter-actions">
          <select
            className="input select-filter"
            value={stage}
            onChange={(e) => {
              setStage(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by stage"
          >
            <option value="">All Stages</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            className="input select-filter"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by role"
          >
            <option value="">All Roles</option>
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <select
            className="input select-filter"
            value={`${sort}:${order}`}
            onChange={(e) => {
              const [s, o] = e.target.value.split(':');
              setSort(s);
              setOrder(o);
              setPage(1);
            }}
            aria-label="Sort"
          >
            <option value="created_at:desc">Newest First</option>
            <option value="created_at:asc">Oldest First</option>
            <option value="name:asc">Name A–Z</option>
            <option value="experience:desc">Highest Experience</option>
          </select>

          {filtered && (
            <button className="btn btn-ghost" onClick={reset}>
              Clear Filters
            </button>
          )}

          <button className="btn" onClick={handleExportCurrent} title="Export current list">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Export View</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="feed-item" style={{ borderColor: 'var(--danger-border)', backgroundColor: 'var(--danger-bg)', marginBottom: '16px', color: 'var(--danger)' }}>
          <span>{error}</span>
          <button className="btn btn-ghost" onClick={() => setError('')} style={{ marginLeft: 'auto', padding: '2px 8px' }}>Dismiss</button>
        </div>
      )}

      {/* Candidates Data Table */}
      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Target Role</th>
              <th>Key Skills</th>
              <th>Experience</th>
              <th>Hiring Stage</th>
              <th>Applied Date</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((c) => {
              const cfg = STAGE_CONFIG[c.stage] || { color: '#6366F1' };
              const skillsList = (c.skills || '').split(',').map((s) => s.trim()).filter(Boolean);

              return (
                <tr
                  key={c.id}
                  onClick={() => onOpen(c.id)}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onOpen(c.id)}
                >
                  <td>
                    <div className="candidate-cell">
                      <div className="avatar" style={{ background: getAvatarGradient(c.name) }}>
                        {getInitials(c.name)}
                      </div>
                      <div className="candidate-cell-info">
                        <span className="candidate-cell-name">{c.name}</span>
                        <span className="candidate-cell-email">{c.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{c.role}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '240px' }}>
                      {skillsList.slice(0, 2).map((sk) => (
                        <span className="skill-tag" key={sk}>{sk}</span>
                      ))}
                      {skillsList.length > 2 && (
                        <span className="skill-tag" style={{ opacity: 0.7 }}>
                          +{skillsList.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{c.experience || 0} yrs</span>
                  </td>
                  <td>
                    <span
                      className="pill"
                      style={{
                        color: cfg.color,
                        borderColor: cfg.border,
                        backgroundColor: cfg.bg
                      }}
                    >
                      <span className="pill-dot" style={{ backgroundColor: cfg.dot || cfg.color }} />
                      {c.stage}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {fmtDate(c.created_at)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpen(c.id);
                      }}
                    >
                      View Profile →
                    </button>
                  </td>
                </tr>
              );
            })}

            {!loading && data.items.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.5 }}>
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="11" y1="8" x2="11" y2="14" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                  <p style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                    No candidates found
                  </p>
                  <p style={{ fontSize: '0.85rem' }}>
                    {filtered ? 'Try adjusting your search query or stage filters.' : 'Use "+ Add Candidate" to add candidates to your talent pool.'}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination Bar */}
        <div className="pagination-bar">
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Showing {data.items.length ? (page - 1) * 10 + 1 : 0}–{Math.min(page * 10, data.total)} of {data.total} candidates
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              Previous
            </button>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, padding: '0 8px' }}>
              Page {Math.min(page, data.pages)} of {data.pages}
            </span>
            <button
              className="btn"
              disabled={page >= data.pages}
              onClick={() => setPage((p) => p + 1)}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
