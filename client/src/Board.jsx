import React, { useEffect, useState } from 'react';
import { api } from './api.js';
import { STAGES, STAGE_CONFIG, getInitials, getAvatarGradient, calculateATSScore } from './constants.js';

export default function Board({ version, onOpen, onChanged, onNotify }) {
  const [items, setItems]         = useState([]);
  const [search, setSearch]       = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [roles, setRoles]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [over, setOver]           = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.list({ limit: 200, sort: 'updated_at', order: 'desc' }),
      api.roles()
    ])
      .then(([r, rl]) => { setItems(r.items); setRoles(rl); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [version]);

  const move = async (id, targetStage) => {
    const prev = [...items];
    const current = items.find(c => c.id === id);
    if (!current || current.stage === targetStage) return;
    setItems(curr => curr.map(c => c.id === id ? { ...c, stage: targetStage } : c));
    if (onNotify) onNotify(`Moved ${current.name} to ${targetStage}`);
    try { await api.setStage(id, targetStage); onChanged(); }
    catch (e) { setItems(prev); if (onNotify) onNotify(e.message, 'error'); }
  };

  const advanceNext = (e, c) => {
    e.stopPropagation();
    const idx = STAGES.indexOf(c.stage);
    if (idx < STAGES.length - 2) move(c.id, STAGES[idx + 1]);
  };

  const filtered = items.filter(c => {
    const q = search.trim().toLowerCase();
    const matchQ  = !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
                       || (c.skills || '').toLowerCase().includes(q) || c.role.toLowerCase().includes(q);
    const matchR  = !roleFilter || c.role === roleFilter;
    return matchQ && matchR;
  });

  return (
    <div>
      {/* Toolbar */}
      <div className="board-header-bar">
        <div>
          <h1 className="page-title">Pipeline board</h1>
          <p className="page-desc">
            Drag cards between stages or use Advance →. Showing {filtered.length} of {items.length}.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <svg style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)', pointerEvents:'none' }}
              width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input className="input" style={{ paddingLeft: 30, width: 200 }}
              placeholder="Search board…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input" style={{ width: 150 }}
            value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="">All roles</option>
            {roles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="notice notice-error" style={{ marginBottom: 16 }}>
          {error}
          <button className="btn btn-ghost" style={{ marginLeft:'auto', height:24, padding:'0 8px' }}
            onClick={() => setError('')}>Dismiss</button>
        </div>
      )}

      {loading && items.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign:'center', color:'var(--text-3)', fontSize: 13 }}>Loading…</div>
      ) : (
        <div className="board-container">
          {STAGES.map(stage => {
            const cfg      = STAGE_CONFIG[stage] || {};
            const colItems = filtered.filter(c => c.stage === stage);
            return (
              <section
                key={stage}
                className={`kanban-col${over === stage ? ' drag-over' : ''}`}
                onDragOver={e => { e.preventDefault(); setOver(stage); }}
                onDragLeave={() => setOver(o => o === stage ? null : o)}
                onDrop={e => {
                  e.preventDefault(); setOver(null);
                  const id = Number(e.dataTransfer.getData('text/plain'));
                  if (id) move(id, stage);
                }}
              >
                <header className="col-header" style={{ borderTopColor: cfg.color }}>
                  <div className="col-title-wrap">
                    <span style={{ width:6, height:6, borderRadius:'50%', background: cfg.color, display:'inline-block', flexShrink:0 }} />
                    {stage}
                  </div>
                  <span className="col-count">{colItems.length}</span>
                </header>

                <div className="col-cards-list">
                  {colItems.length === 0 ? (
                    <div className="col-empty">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/>
                        <line x1="8" y1="12" x2="16" y2="12"/>
                      </svg>
                      Drop here
                    </div>
                  ) : colItems.map(c => {
                    const skills = (c.skills || '').split(',').map(s => s.trim()).filter(Boolean);
                    const canAdv = STAGES.indexOf(c.stage) < STAGES.length - 2;
                    const ats    = calculateATSScore(c.skills, c.role);
                    return (
                      <article
                        key={c.id}
                        className="candidate-card"
                        draggable
                        onDragStart={e => e.dataTransfer.setData('text/plain', String(c.id))}
                        onClick={() => onOpen(c.id)}
                        tabIndex={0}
                        onKeyDown={e => e.key === 'Enter' && onOpen(c.id)}
                      >
                        <div className="card-top">
                          <div className="avatar" style={{ background: getAvatarGradient(c.name) }}>
                            {getInitials(c.name)}
                          </div>
                          <div className="card-details">
                            <div className="card-name" title={c.name}>{c.name}</div>
                            <div className="card-role">{c.role}</div>
                          </div>
                        </div>

                        {skills.length > 0 && (
                          <div className="card-chips">
                            {skills.slice(0, 2).map(s => (
                              <span className="skill-tag" key={s}>{s}</span>
                            ))}
                            {skills.length > 2 && (
                              <span className="skill-tag" style={{ opacity: .6 }}>+{skills.length - 2}</span>
                            )}
                          </div>
                        )}

                        <div className="card-footer">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="card-exp">{c.experience || 0} yrs</span>
                            <span className={`ats-score-badge ${ats.score >= 70 ? 'ats-score-high' : 'ats-score-mid'}`}
                              style={{ fontSize: 10, padding: '1px 5px' }} title="ATS Keyword Match">
                              {ats.score}%
                            </span>
                          </div>
                          {canAdv && (
                            <button className="card-advance-btn"
                              onClick={e => advanceNext(e, c)}
                              title={`Advance to ${STAGES[STAGES.indexOf(c.stage) + 1]}`}>
                              Advance →
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
