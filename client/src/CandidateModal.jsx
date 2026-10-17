import React, { useEffect, useState } from 'react';
import { api } from './api.js';
import { STAGES, STAGE_CONFIG, getInitials, getAvatarGradient, fmtDateTime } from './constants.js';

const EMPTY = {
  name: '',
  email: '',
  phone: '',
  role: '',
  skills: '',
  experience: 0,
  resume_url: '',
  notes: '',
  stage: 'Applied'
};

const ROLES_LIST = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Data Analyst',
  'UI/UX Designer',
  'QA Engineer',
  'DevOps Engineer',
  'Product Manager'
];

export default function CandidateModal({ id, onClose, onSaved, onNotify }) {
  const isNew = id == null;
  const [form, setForm] = useState(EMPTY);
  const [original, setOriginal] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});

  useEffect(() => {
    if (isNew) return;
    api.get(id)
      .then((c) => {
        setForm(c);
        setOriginal(c);
        setHistory(c.history || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setFields({});
    try {
      const body = {
        ...form,
        experience: Number(form.experience) || 0
      };
      if (isNew) {
        await api.create(body);
        onSaved(`Candidate "${form.name}" added successfully!`);
      } else {
        await api.update(id, body);
        if (form.stage !== original?.stage) {
          await api.setStage(id, form.stage);
        }
        onSaved(`Updated profile for ${form.name}`);
      }
    } catch (err) {
      setError(err.message);
      setFields(err.fields || {});
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete candidate "${original?.name}"? All history will be permanently erased.`)) return;
    try {
      await api.remove(id);
      onSaved(`Candidate "${original?.name}" deleted.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const stageCfg = STAGE_CONFIG[form.stage] || { color: '#6366F1' };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet" role="dialog" aria-modal="true" aria-label={isNew ? 'Add Candidate' : 'Candidate Details'}>
        <header className="modal-header">
          <div className="modal-header-profile">
            <div className="avatar avatar-lg" style={{ background: getAvatarGradient(form.name || 'New') }}>
              {getInitials(form.name || (isNew ? 'New' : ''))}
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '2px' }}>
                {isNew ? 'Add New Candidate' : form.name || 'Candidate Details'}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  className="pill"
                  style={{
                    color: stageCfg.color,
                    borderColor: stageCfg.border,
                    backgroundColor: stageCfg.bg,
                    padding: '1px 8px',
                    fontSize: '0.72rem'
                  }}
                >
                  <span className="pill-dot" style={{ backgroundColor: stageCfg.dot || stageCfg.color }} />
                  {form.stage}
                </span>
                {original?.email && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {original.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </header>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <p className="muted">Loading candidate details…</p>
          </div>
        ) : (
          <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div className="modal-content-scroll">
              {error && (
                <div className="feed-item" style={{ borderColor: 'var(--danger-border)', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}>
                  <span>{error}</span>
                </div>
              )}

              {/* Form Grid */}
              <div className="form-grid-2">
                <div className="field-group">
                  <label className="field-label" htmlFor="cand-name">Full Name *</label>
                  <input
                    id="cand-name"
                    className={`input ${fields.name ? 'bad' : ''}`}
                    type="text"
                    required
                    autoFocus={isNew}
                    placeholder="e.g. Maya Patel"
                    value={form.name ?? ''}
                    onChange={set('name')}
                  />
                  {fields.name && <span className="field-error-msg">{fields.name}</span>}
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="cand-email">Email Address *</label>
                  <input
                    id="cand-email"
                    className={`input ${fields.email ? 'bad' : ''}`}
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={form.email ?? ''}
                    onChange={set('email')}
                  />
                  {fields.email && <span className="field-error-msg">{fields.email}</span>}
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="cand-phone">Phone Number</label>
                  <input
                    id="cand-phone"
                    className="input"
                    type="tel"
                    placeholder="+91 9876543210"
                    value={form.phone ?? ''}
                    onChange={set('phone')}
                  />
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="cand-role">Target Role *</label>
                  <input
                    id="cand-role"
                    className={`input ${fields.role ? 'bad' : ''}`}
                    type="text"
                    required
                    list="role-datalist"
                    placeholder="Select or enter role"
                    value={form.role ?? ''}
                    onChange={set('role')}
                  />
                  <datalist id="role-datalist">
                    {ROLES_LIST.map((r) => (
                      <option key={r} value={r} />
                    ))}
                  </datalist>
                  {fields.role && <span className="field-error-msg">{fields.role}</span>}
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="cand-exp">Experience (Years)</label>
                  <input
                    id="cand-exp"
                    className="input"
                    type="number"
                    min="0"
                    max="60"
                    step="0.5"
                    value={form.experience ?? 0}
                    onChange={set('experience')}
                  />
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="cand-stage">Hiring Stage</label>
                  <select
                    id="cand-stage"
                    className="input"
                    value={form.stage}
                    onChange={set('stage')}
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="cand-skills">Key Skills (Comma separated)</label>
                <input
                  id="cand-skills"
                  className="input"
                  type="text"
                  placeholder="React, TypeScript, GraphQL, Node.js"
                  value={form.skills ?? ''}
                  onChange={set('skills')}
                />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="cand-resume">
                  Resume Portfolio / Document URL
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    id="cand-resume"
                    className={`input ${fields.resume_url ? 'bad' : ''}`}
                    type="url"
                    placeholder="https://drive.google.com/… or https://linkedin.com/in/…"
                    value={form.resume_url ?? ''}
                    onChange={set('resume_url')}
                  />
                  {form.resume_url && /^https?:\/\//i.test(form.resume_url) && (
                    <a
                      href={form.resume_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn"
                      style={{ padding: '0 12px' }}
                      title="Open resume link"
                    >
                      ↗
                    </a>
                  )}
                </div>
                {fields.resume_url && <span className="field-error-msg">{fields.resume_url}</span>}
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="cand-notes">Interviewer Notes & Assessment</label>
                <textarea
                  id="cand-notes"
                  className="input"
                  rows="3"
                  placeholder="Add interview observations, compensation expectations, or next steps…"
                  value={form.notes ?? ''}
                  onChange={set('notes')}
                />
              </div>

              {/* Stage History Timeline */}
              {!isNew && (
                <div className="timeline-box">
                  <h3 className="timeline-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>Stage Progression Log</span>
                  </h3>

                  <div className="timeline-items">
                    {history.map((h) => {
                      const toCfg = STAGE_CONFIG[h.to_stage] || { color: '#6366F1' };
                      return (
                        <div className="timeline-row" key={h.id}>
                          <span className="timeline-dot" style={{ backgroundColor: toCfg.color }} />
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>
                              {h.from_stage ? (
                                <>
                                  <span style={{ color: 'var(--text-muted)' }}>{h.from_stage}</span> →{' '}
                                  <b style={{ color: toCfg.color }}>{h.to_stage}</b>
                                </>
                              ) : (
                                <>Initial application: <b style={{ color: toCfg.color }}>{h.to_stage}</b></>
                              )}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                              {fmtDateTime(h.changed_at)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <footer className="modal-footer">
              {!isNew ? (
                <button type="button" className="btn btn-danger" onClick={remove}>
                  Delete Candidate
                </button>
              ) : (
                <div />
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn btn-ghost" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : isNew ? 'Create Candidate' : 'Save Changes'}
                </button>
              </div>
            </footer>
          </form>
        )}
      </div>
    </div>
  );
}
