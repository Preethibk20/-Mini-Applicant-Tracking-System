import React, { useEffect, useState } from 'react';
import { api } from './api.js';
import { STAGE_CONFIG, getInitials, getAvatarGradient, fmtTimeAgo } from './constants.js';

export default function Dashboard({ version, onOpen, onSwitchTab }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.dashboard()
      .then(setData)
      .catch((e) => setError(e.message));
  }, [version]);

  if (error) {
    return (
      <div className="panel" style={{ borderColor: 'var(--danger-border)' }}>
        <h2 style={{ color: 'var(--danger)' }}>Could not load dashboard</h2>
        <p className="muted">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p className="muted">Loading recruitment metrics & analytics…</p>
      </div>
    );
  }

  const maxStage = Math.max(1, ...data.byStage.map((s) => s.count));
  const maxDay = Math.max(1, ...data.last7Days.map((s) => s.count));

  const kpis = [
    {
      label: 'Total Applicants',
      value: data.total,
      hint: 'In database',
      badge: 'All-time',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    },
    {
      label: 'Active Pipeline',
      value: data.active,
      hint: `${Math.round((data.active / (data.total || 1)) * 100)}% of total pool`,
      badge: 'In Review',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      )
    },
    {
      label: 'Interview Rate',
      value: `${data.interviewRate}%`,
      hint: 'Reached interview or offer',
      badge: 'High funnel',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      )
    },
    {
      label: 'Hire Conversion',
      value: `${data.conversionRate}%`,
      hint: `${data.hired} successful hires`,
      badge: 'Goal: >4%',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      )
    },
    {
      label: 'New This Week',
      value: data.newThisWeek,
      hint: 'Last 7 days volume',
      badge: '+Active',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      )
    }
  ];

  return (
    <div>
      {/* Hero Welcome Banner */}
      <section className="dashboard-hero">
        <div>
          <h1 className="hero-title">Talent Acquisition Dashboard</h1>
          <p className="hero-desc">
            Monitor real-time pipeline velocity, stage conversions, and weekly candidate flow.
          </p>
        </div>
        <div className="hero-stats-badge">
          <span className="pill" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
            <span className="pill-dot" /> Live Pipeline
          </span>
          <button className="btn btn-ghost" onClick={() => onSwitchTab('board')} style={{ padding: '4px 10px', fontSize: '0.82rem' }}>
            Open Kanban →
          </button>
        </div>
      </section>

      {/* 5 KPI Metric Cards */}
      <section className="kpi-grid">
        {kpis.map((kpi) => (
          <div className="kpi-card" key={kpi.label}>
            <div className="kpi-head">
              <span className="kpi-label">{kpi.label}</span>
              <div className="kpi-icon">{kpi.icon}</div>
            </div>
            <div className="kpi-value">{kpi.value}</div>
            <div className="kpi-footer">
              <span className="kpi-badge">{kpi.badge}</span>
              <span>· {kpi.hint}</span>
            </div>
          </div>
        ))}
      </section>

      {/* Analytics Grid: Funnel & 7-Day Intake */}
      <div className="analytics-grid">
        {/* Pipeline Funnel */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Pipeline Funnel by Stage</h2>
              <p className="panel-subtitle">Distribution of candidates across hiring milestones</p>
            </div>
            <button className="btn btn-ghost" style={{ fontSize: '0.82rem', padding: '4px 8px' }} onClick={() => onSwitchTab('board')}>
              View Board →
            </button>
          </div>

          <div className="funnel-list">
            {data.byStage.map((s) => {
              const cfg = STAGE_CONFIG[s.stage] || { color: '#6366F1' };
              const pct = data.total ? Math.round((s.count / data.total) * 100) : 0;
              return (
                <div className="funnel-item" key={s.stage}>
                  <div className="funnel-meta">
                    <span className="funnel-stage-name">
                      <span className="pill-dot" style={{ backgroundColor: cfg.color, color: cfg.color }} />
                      {s.stage}
                    </span>
                    <span className="funnel-count">
                      {s.count} <span style={{ color: 'var(--text-dim)', fontWeight: 400, fontSize: '0.8rem' }}>({pct}%)</span>
                    </span>
                  </div>
                  <div className="funnel-track">
                    <div
                      className="funnel-fill"
                      style={{
                        width: `${Math.max(4, (s.count / maxStage) * 100)}%`,
                        backgroundColor: cfg.color
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 7-Day Intake Histogram */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Weekly Application Intake</h2>
              <p className="panel-subtitle">Daily candidate acquisition volume (last 7 days)</p>
            </div>
            <span className="pill" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' }}>
              7 Days
            </span>
          </div>

          <div className="spark-chart">
            {data.last7Days.map((day) => {
              const fillPct = maxDay ? Math.max(8, (day.count / maxDay) * 100) : 8;
              const dateObj = new Date(day.date);
              const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
              const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return (
                <div className="spark-bar-wrap" key={day.date} title={`${formattedDate}: ${day.count} applicants`}>
                  <span className="spark-count">{day.count}</span>
                  <div className="spark-track">
                    <div className="spark-fill" style={{ height: `${fillPct}%` }} />
                  </div>
                  <span className="spark-label">{weekday}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Analytics Grid: Roles Demand & Live Activity Feed */}
      <div className="analytics-grid">
        {/* Roles Demand Breakdown */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Role & Position Breakdown</h2>
              <p className="panel-subtitle">Candidate allocation and hiring rates per job title</p>
            </div>
            <button className="btn btn-ghost" style={{ fontSize: '0.82rem', padding: '4px 8px' }} onClick={() => onSwitchTab('candidates')}>
              Directory →
            </button>
          </div>

          <table className="data-table" style={{ marginTop: '8px' }}>
            <thead>
              <tr>
                <th>Target Role</th>
                <th style={{ textAlign: 'center' }}>Total</th>
                <th style={{ textAlign: 'center' }}>Hired</th>
                <th style={{ textAlign: 'right' }}>Share</th>
              </tr>
            </thead>
            <tbody>
              {data.byRole.map((r) => {
                const share = data.total ? Math.round((r.total / data.total) * 100) : 0;
                return (
                  <tr key={r.role}>
                    <td style={{ fontWeight: 600 }}>{r.role}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="tab-badge">{r.total}</span>
                    </td>
                    <td style={{ textAlign: 'center', color: r.hired ? 'var(--success)' : 'inherit', fontWeight: r.hired ? 700 : 400 }}>
                      {r.hired}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{share}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* Live Stage Transition Activity Feed */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Recent Pipeline Activity</h2>
              <p className="panel-subtitle">Real-time candidate progression and status changes</p>
            </div>
            <span className="pill" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' }}>
              Live
            </span>
          </div>

          {data.recent.length === 0 ? (
            <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>
              No stage movements logged yet.
            </p>
          ) : (
            <div className="feed-list">
              {data.recent.slice(0, 6).map((r) => {
                const toCfg = STAGE_CONFIG[r.to_stage] || { color: '#6366F1' };
                return (
                  <div className="feed-item" key={r.id}>
                    <div className="avatar" style={{ background: getAvatarGradient(r.name) }}>
                      {getInitials(r.name)}
                    </div>
                    <div className="feed-content">
                      <button className="feed-candidate-link" onClick={() => onOpen(r.candidate_id)}>
                        {r.name}
                      </button>{' '}
                      {r.from_stage ? (
                        <>
                          <span style={{ color: 'var(--text-muted)' }}>moved to </span>
                          <span className="pill" style={{ color: toCfg.color, borderColor: toCfg.border, backgroundColor: toCfg.bg, padding: '1px 8px', fontSize: '0.72rem' }}>
                            {r.to_stage}
                          </span>
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>applied for {r.role}</span>
                      )}
                    </div>
                    <span className="feed-time">{fmtTimeAgo(r.changed_at)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
