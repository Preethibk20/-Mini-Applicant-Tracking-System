import React, { useEffect, useState } from 'react';
import { api } from './api.js';
import {
  STAGES,
  STAGE_CONFIG,
  getInitials,
  getAvatarGradient,
  fmtDateTime,
  calculateATSScore,
  EMAIL_TEMPLATES
} from './constants.js';

const EMPTY = {
  name: '',
  email: '',
  phone: '',
  role: 'Frontend Developer',
  skills: '',
  experience: 0,
  resume_url: '',
  notes: '',
  rating: 4.0,
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
  const [form, setForm]         = useState(EMPTY);
  const [original, setOrig]     = useState(null);
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(!isNew);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [fields, setFields]     = useState({});
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'ats' | 'email'
  const [emailType, setEmailType] = useState('interview'); // 'interview' | 'offer' | 'rejection'
  const [copied, setCopied]     = useState(false);

  useEffect(() => {
    if (isNew) return;
    api.get(id)
      .then(c => {
        setForm(c);
        setOrig(c);
        setHistory(c.history || []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setFields({});
    try {
      const body = {
        ...form,
        experience: Number(form.experience) || 0,
        rating: Number(form.rating) || 4.0
      };
      if (isNew) {
        await api.create(body);
        onSaved(`${form.name} added`);
      } else {
        await api.update(id, body);
        if (form.stage !== original?.stage) await api.setStage(id, form.stage);
        onSaved(`${form.name} updated`);
      }
    } catch (err) {
      setError(err.message);
      setFields(err.fields || {});
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete ${original?.name}? This cannot be undone.`)) return;
    try {
      await api.remove(id);
      onSaved(`${original?.name} deleted`);
    } catch (err) {
      setError(err.message);
    }
  };

  const addMissingSkill = (skill) => {
    const current = (form.skills || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!current.includes(skill)) {
      current.push(skill);
      setForm(f => ({ ...f, skills: current.join(', ') }));
      if (onNotify) onNotify(`Added ${skill} to skills`);
    }
  };

  const copyEmail = () => {
    const template = EMAIL_TEMPLATES[emailType]?.(form);
    if (!template) return;
    const textToCopy = `Subject: ${template.subject}\n\n${template.body}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (onNotify) onNotify('Email template copied to clipboard');
    });
  };

  const stageCfg = STAGE_CONFIG[form.stage] || {};
  const atsResult = calculateATSScore(form.skills, form.role);
  const activeEmail = EMAIL_TEMPLATES[emailType]?.(form) || { subject: '', body: '' };

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet" role="dialog" aria-modal="true">
        {/* Header */}
        <header className="modal-header">
          <div className="modal-header-profile">
            <div className="avatar avatar-lg" style={{ background: getAvatarGradient(form.name || 'New') }}>
              {getInitials(form.name || (isNew ? 'N' : '?'))}
            </div>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>
                {isNew ? 'New candidate' : (form.name || 'Candidate')}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  className="pill"
                  style={{ color: stageCfg.color, background: stageCfg.bg, borderColor: stageCfg.border, fontSize: 11 }}
                >
                  <span className="pill-dot" style={{ background: stageCfg.color }} />
                  {form.stage}
                </span>
                <span
                  className={`ats-score-badge ${atsResult.score >= 70 ? 'ats-score-high' : 'ats-score-mid'}`}
                  title="Calculated ATS Keyword Match"
                >
                  {atsResult.score}% ATS match
                </span>
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </header>

        {/* Modal Sub-Tabs */}
        <div className="modal-nav-tabs">
          <button
            type="button"
            className={`modal-nav-tab${activeTab === 'details' ? ' active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Candidate profile
          </button>
          <button
            type="button"
            className={`modal-nav-tab${activeTab === 'ats' ? ' active' : ''}`}
            onClick={() => setActiveTab('ats')}
          >
            ATS Match Score
            <span className="modal-tab-badge">{atsResult.score}%</span>
          </button>
          {!isNew && (
            <button
              type="button"
              className={`modal-nav-tab${activeTab === 'email' ? ' active' : ''}`}
              onClick={() => setActiveTab('email')}
            >
              Email generator
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>Loading…</div>
        ) : (
          <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div className="modal-content-scroll">
              {error && <div className="notice notice-error">{error}</div>}

              {/* TAB 1: DETAILS */}
              {activeTab === 'details' && (
                <>
                  <div className="form-grid-2">
                    <div className="field-group">
                      <label className="field-label" htmlFor="f-name">Full name *</label>
                      <input
                        id="f-name"
                        className={`input${fields.name ? ' bad' : ''}`}
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
                      <label className="field-label" htmlFor="f-email">Email *</label>
                      <input
                        id="f-email"
                        className={`input${fields.email ? ' bad' : ''}`}
                        type="email"
                        required
                        placeholder="name@company.com"
                        value={form.email ?? ''}
                        onChange={set('email')}
                      />
                      {fields.email && <span className="field-error-msg">{fields.email}</span>}
                    </div>

                    <div className="field-group">
                      <label className="field-label" htmlFor="f-phone">Phone</label>
                      <input
                        id="f-phone"
                        className="input"
                        type="tel"
                        placeholder="+91 9876543210"
                        value={form.phone ?? ''}
                        onChange={set('phone')}
                      />
                    </div>

                    <div className="field-group">
                      <label className="field-label" htmlFor="f-role">Role *</label>
                      <input
                        id="f-role"
                        className={`input${fields.role ? ' bad' : ''}`}
                        type="text"
                        required
                        list="role-list"
                        placeholder="e.g. Backend Developer"
                        value={form.role ?? ''}
                        onChange={set('role')}
                      />
                      <datalist id="role-list">
                        {ROLES_LIST.map(r => <option key={r} value={r} />)}
                      </datalist>
                      {fields.role && <span className="field-error-msg">{fields.role}</span>}
                    </div>

                    <div className="field-group">
                      <label className="field-label" htmlFor="f-exp">Experience (years)</label>
                      <input
                        id="f-exp"
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
                      <label className="field-label" htmlFor="f-stage">Stage</label>
                      <select id="f-stage" className="input" value={form.stage} onChange={set('stage')}>
                        {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="f-skills">Skills (comma separated)</label>
                    <input
                      id="f-skills"
                      className="input"
                      type="text"
                      placeholder="React, TypeScript, Node.js"
                      value={form.skills ?? ''}
                      onChange={set('skills')}
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="f-resume">Resume / portfolio link</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        id="f-resume"
                        className={`input${fields.resume_url ? ' bad' : ''}`}
                        type="url"
                        placeholder="https://…"
                        value={form.resume_url ?? ''}
                        onChange={set('resume_url')}
                      />
                      {form.resume_url && /^https?:\/\//i.test(form.resume_url) && (
                        <a
                          href={form.resume_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn"
                          style={{ flexShrink: 0 }}
                          title="Open link"
                        >
                          ↗
                        </a>
                      )}
                    </div>
                    {fields.resume_url && <span className="field-error-msg">{fields.resume_url}</span>}
                  </div>

                  {/* Rating / Scorecard */}
                  <div className="scorecard-box">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="field-label">Interview evaluation rating</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                        {form.rating ? `${Number(form.rating).toFixed(1)} / 5.0` : 'Not rated'}
                      </span>
                    </div>
                    <div className="stars-row">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          className={`star-btn ${star <= (form.rating || 0) ? 'star-active' : ''}`}
                          onClick={() => setForm(f => ({ ...f, rating: star }))}
                          title={`Rate ${star} star${star > 1 ? 's' : ''}`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="f-notes">Internal notes</label>
                    <textarea
                      id="f-notes"
                      className="input"
                      rows="3"
                      placeholder="Interview feedback, salary expectation, strengths…"
                      value={form.notes ?? ''}
                      onChange={set('notes')}
                    />
                  </div>

                  {/* Stage history */}
                  {!isNew && history.length > 0 && (
                    <div className="timeline-box">
                      <div className="timeline-title">Stage history</div>
                      <div className="timeline-items">
                        {history.map(h => {
                          const toCfg = STAGE_CONFIG[h.to_stage] || {};
                          return (
                            <div className="timeline-row" key={h.id}>
                              <span className="timeline-dot" style={{ background: toCfg.color }} />
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                <span>
                                  {h.from_stage ? (
                                    <>{h.from_stage} → <b style={{ color: toCfg.color }}>{h.to_stage}</b></>
                                  ) : (
                                    <>Applied as <b style={{ color: toCfg.color }}>{h.to_stage}</b></>
                                  )}
                                </span>
                                <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>
                                  {fmtDateTime(h.changed_at)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* TAB 2: ATS MATCH */}
              {activeTab === 'ats' && (
                <div className="ats-match-box">
                  <div className="ats-match-head">
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                        Role: {form.role || 'Unspecified'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                        Automated keyword match against benchmark criteria
                      </div>
                    </div>
                    <span className={`ats-score-badge ${atsResult.score >= 70 ? 'ats-score-high' : 'ats-score-mid'}`}>
                      {atsResult.score}% Match
                    </span>
                  </div>

                  <div className="ats-bar-bg">
                    <div className="ats-bar-fill" style={{ width: `${atsResult.score}%` }} />
                  </div>

                  <div className="ats-skills-wrap">
                    <span className="ats-group-label">
                      Matched requirements ({atsResult.matched.length})
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {atsResult.matched.length > 0 ? (
                        atsResult.matched.map(s => (
                          <span key={s} className="ats-pill-tag ats-pill-matched">
                            ✓ {s}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>No exact keywords matched yet.</span>
                      )}
                    </div>
                  </div>

                  <div className="ats-skills-wrap" style={{ marginTop: 6 }}>
                    <span className="ats-group-label">
                      Recommended keywords to screen for (click to add)
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {atsResult.missing.length > 0 ? (
                        atsResult.missing.map(s => (
                          <button
                            key={s}
                            type="button"
                            className="ats-pill-tag ats-pill-missing"
                            onClick={() => addMissingSkill(s)}
                            title={`Click to add ${s} to skills`}
                          >
                            + {s}
                          </button>
                        ))
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--green)' }}>
                          Candidate matches all primary keywords for this role!
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: EMAIL GENERATOR */}
              {activeTab === 'email' && !isNew && (
                <div className="email-panel">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <div className="email-templates-bar" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                      <button
                        type="button"
                        className={`email-type-btn${emailType === 'interview' ? ' active' : ''}`}
                        onClick={() => setEmailType('interview')}
                      >
                        Interview invitation
                      </button>
                      <button
                        type="button"
                        className={`email-type-btn${emailType === 'offer' ? ' active' : ''}`}
                        onClick={() => setEmailType('offer')}
                      >
                        Job offer
                      </button>
                      <button
                        type="button"
                        className={`email-type-btn${emailType === 'rejection' ? ' active' : ''}`}
                        onClick={() => setEmailType('rejection')}
                      >
                        Feedback / Polite close
                      </button>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ height: 28, fontSize: 11, padding: '0 10px' }}
                      onClick={copyEmail}
                    >
                      {copied ? '✓ Copied!' : 'Copy to clipboard'}
                    </button>
                  </div>

                  <div className="email-preview-box">
                    <div className="email-subject-line">
                      Subject: {activeEmail.subject}
                    </div>
                    <div className="email-body-text">
                      {activeEmail.body}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <footer className="modal-footer">
              {!isNew ? (
                <button type="button" className="btn btn-danger" onClick={remove}>
                  Delete
                </button>
              ) : (
                <span />
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="btn btn-ghost" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : isNew ? 'Add candidate' : 'Save changes'}
                </button>
              </div>
            </footer>
          </form>
        )}
      </div>
    </div>
  );
}
