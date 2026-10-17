import React, { useEffect, useState } from 'react';
import { api } from './api.js';
import { STAGES, STAGE_CONFIG, getInitials, getAvatarGradient } from './constants.js';

export default function Board({ version, onOpen, onChanged, onNotify }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [over, setOver] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.list({ limit: 200, sort: 'updated_at', order: 'desc' }),
      api.roles()
    ])
      .then(([candRes, roleList]) => {
        setItems(candRes.items);
        setRoles(roleList);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [version]);

  const move = async (id, targetStage) => {
    const prev = [...items];
    const current = items.find((c) => c.id === id);
    if (!current || current.stage === targetStage) return;

    // Optimistic update
    setItems((curr) => curr.map((c) => (c.id === id ? { ...c, stage: targetStage } : c)));
    if (onNotify) onNotify(`Moved ${current.name} to ${targetStage}`);

    try {
      await api.setStage(id, targetStage);
      onChanged();
    } catch (e) {
      setItems(prev);
      setError(e.message);
      if (onNotify) onNotify(`Failed to move: ${e.message}`, 'error');
    }
  };

  const advanceNextStage = (e, c) => {
    e.stopPropagation();
    const currentIndex = STAGES.indexOf(c.stage);
    if (currentIndex < STAGES.length - 2) { // up to Offer -> Hired
      const nextStage = STAGES[currentIndex + 1];
      move(c.id, nextStage);
    }
  };

  // Filter items based on board search and role filter
  const filteredItems = items.filter((c) => {
    const matchesSearch = !search.trim() || 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.skills && c.skills.toLowerCase().includes(search.toLowerCase())) ||
      c.role.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !roleFilter || c.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div>
      {/* Board Controls Toolbar */}
      <div className="board-header-bar">
        <div className="board-info">
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Hiring Pipeline Kanban</h1>
            <p className="muted" style={{ fontSize: '0.85rem' }}>
              Drag cards across stages or use the quick-advance button. Showing {filteredItems.length} of {items.length} candidates.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="search"
            className="input"
            style={{ width: '220px', padding: '7px 12px', fontSize: '0.85rem' }}
            placeholder="Search board…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="input select-filter"
            style={{ padding: '7px 12px', fontSize: '0.85rem' }}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="feed-item" style={{ borderColor: 'var(--danger-border)', backgroundColor: 'var(--danger-bg)', marginBottom: '16px', color: 'var(--danger)' }}>
          <span>{error}</span>
          <button className="btn btn-ghost" onClick={() => setError('')} style={{ marginLeft: 'auto', padding: '2px 8px' }}>
            Dismiss
          </button>
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: '60px' }}>
          <p className="muted">Loading pipeline board…</p>
        </div>
      ) : (
        <div className="board-container">
          {STAGES.map((stage) => {
            const cfg = STAGE_CONFIG[stage] || { color: '#6366F1' };
            const colItems = filteredItems.filter((c) => c.stage === stage);
            const isDropTarget = over === stage;

            return (
              <section
                key={stage}
                className={`kanban-col ${isDropTarget ? 'drag-over' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(stage);
                }}
                onDragLeave={() => setOver((o) => (o === stage ? null : o))}
                onDrop={(e) => {
                  e.preventDefault();
                  setOver(null);
                  const candId = Number(e.dataTransfer.getData('text/plain'));
                  if (candId) move(candId, stage);
                }}
              >
                <header className="col-header" style={{ borderTopColor: cfg.color }}>
                  <div className="col-title-wrap">
                    <span className="pill-dot" style={{ backgroundColor: cfg.color, color: cfg.color }} />
                    <span>{stage}</span>
                  </div>
                  <span className="col-count">{colItems.length}</span>
                </header>

                <div className="col-cards-list">
                  {colItems.length === 0 ? (
                    <div className="col-empty">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="8" y1="12" x2="16" y2="12" />
                      </svg>
                      <span>No candidates in {stage}</span>
                    </div>
                  ) : (
                    colItems.map((c) => {
                      const skillsList = (c.skills || '')
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean);
                      const currentIndex = STAGES.indexOf(c.stage);
                      const canAdvance = currentIndex < STAGES.length - 2; // Before Hired / Rejected

                      return (
                        <article
                          key={c.id}
                          className="candidate-card"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', String(c.id));
                          }}
                          onClick={() => onOpen(c.id)}
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && onOpen(c.id)}
                        >
                          <div className="card-top">
                            <div className="avatar" style={{ background: getAvatarGradient(c.name) }}>
                              {getInitials(c.name)}
                            </div>
                            <div className="card-details">
                              <h3 className="card-name" title={c.name}>{c.name}</h3>
                              <p className="card-role">{c.role}</p>
                            </div>
                          </div>

                          {skillsList.length > 0 && (
                            <div className="card-chips">
                              {skillsList.slice(0, 2).map((skill) => (
                                <span className="skill-tag" key={skill}>{skill}</span>
                              ))}
                              {skillsList.length > 2 && (
                                <span className="skill-tag" style={{ opacity: 0.7 }}>
                                  +{skillsList.length - 2}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="card-footer">
                            <span className="card-exp">
                              ⚡ {c.experience || 0}y exp
                            </span>

                            {canAdvance && (
                              <button
                                className="card-advance-btn"
                                onClick={(e) => advanceNextStage(e, c)}
                                title={`Advance to ${STAGES[currentIndex + 1]}`}
                              >
                                <span>Advance</span>
                                <span>→</span>
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
