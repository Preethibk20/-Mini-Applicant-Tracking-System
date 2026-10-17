import React, { useEffect, useState } from 'react';
import { api } from './api.js';
import { STAGE_CONFIG, getInitials, getAvatarGradient, fmtTimeAgo } from './constants.js';

export default function Dashboard({ version, onOpen, onSwitchTab }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.dashboard().then(setData).catch(e => setError(e.message));
  }, [version]);

  if (error) return (
    <div className="notice notice-error" style={{ marginTop: 24 }}>
      Could not load dashboard: {error}
    </div>
  );

  if (!data) return (
    <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
      Loading…
    </div>
  );

  const maxStage = Math.max(1, ...data.byStage.map(s => s.count));
  const maxDay   = Math.max(1, ...data.last7Days.map(s => s.count));

  const kpis = [
    { label: 'Total Applicants',  value: data.total,            foot: 'all time' },
    { label: 'Active Pipeline',   value: data.active,           foot: `${Math.round(data.active / (data.total||1) * 100)}% of pool` },
    { label: 'Interview Rate',    value: `${data.interviewRate}%`, foot: 'reached interview or offer', badge: data.interviewRate > 30 ? 'On track' : null },
    { label: 'Hire Conversion',   value: `${data.conversionRate}%`, foot: `${data.hired} successful hires` },
    { label: 'New This Week',     value: data.newThisWeek,      foot: 'last 7 days' },
  ];

  return (
    <div>
      {/* Plain page header */}
      <div className="page-header">
        <h1 className="page-title">Overview</h1>
        <p className="page-desc">Hiring pipeline metrics and recent activity</p>
      </div>

      {/* KPI strip */}
      <div className="kpi-grid">
        {kpis.map(k => (
          <div className="kpi-card" key={k.label}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-footer">
              {k.badge && <span className="kpi-badge">{k.badge} ·</span>}
              {k.foot}
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="analytics-grid">
        {/* Pipeline funnel */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Pipeline by stage</div>
              <div className="panel-subtitle">Candidate distribution across milestones</div>
            </div>
            <button className="btn btn-ghost" style={{ fontSize: 12, height: 28, padding: '0 8px' }}
              onClick={() => onSwitchTab('board')}>
              View board →
            </button>
          </div>
          <div className="funnel-list">
            {data.byStage.map(s => {
              const cfg = STAGE_CONFIG[s.stage] || {};
              const pct = data.total ? Math.round(s.count / data.total * 100) : 0;
              return (
                <div className="funnel-item" key={s.stage}>
                  <div className="funnel-meta">
                    <span className="funnel-stage-name">
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
                      {s.stage}
                    </span>
                    <span className="funnel-count">{s.count} <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>({pct}%)</span></span>
                  </div>
                  <div className="funnel-track">
                    <div className="funnel-fill"
                      style={{ width: `${Math.max(2, s.count / maxStage * 100)}%`, background: cfg.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 7-day intake */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Applications this week</div>
              <div className="panel-subtitle">Daily intake over the last 7 days</div>
            </div>
          </div>
          <div className="spark-chart">
            {data.last7Days.map(day => {
              const h = maxDay ? Math.max(6, day.count / maxDay * 100) : 6;
              const wd = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' });
              return (
                <div className="spark-bar-wrap" key={day.date} title={`${day.date}: ${day.count}`}>
                  <span className="spark-count">{day.count || ''}</span>
                  <div className="spark-track">
                    <div className="spark-fill" style={{ height: `${h}%` }} />
                  </div>
                  <span className="spark-label">{wd}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Bottom row */}
      <div className="analytics-grid">
        {/* Roles breakdown */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Roles breakdown</div>
              <div className="panel-subtitle">Candidate count and hires per position</div>
            </div>
            <button className="btn btn-ghost" style={{ fontSize: 12, height: 28, padding: '0 8px' }}
              onClick={() => onSwitchTab('candidates')}>
              Directory →
            </button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Role</th>
                <th style={{ textAlign: 'center' }}>Total</th>
                <th style={{ textAlign: 'center' }}>Hired</th>
                <th style={{ textAlign: 'right' }}>Share</th>
              </tr>
            </thead>
            <tbody>
              {data.byRole.map(r => {
                const share = data.total ? Math.round(r.total / data.total * 100) : 0;
                return (
                  <tr key={r.role}>
                    <td style={{ fontWeight: 600 }}>{r.role}</td>
                    <td style={{ textAlign: 'center', color: 'var(--text-2)' }}>{r.total}</td>
                    <td style={{ textAlign: 'center', color: r.hired ? 'var(--green)' : 'var(--text-3)', fontWeight: r.hired ? 600 : 400 }}>
                      {r.hired || '—'}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-3)' }}>{share}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* Activity feed */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Recent activity</div>
              <div className="panel-subtitle">Latest candidate stage changes</div>
            </div>
          </div>
          {data.recent.length === 0 ? (
            <p style={{ color: 'var(--text-3)', fontSize: 12 }}>No activity yet.</p>
          ) : (
            <div className="feed-list">
              {data.recent.slice(0, 6).map(r => {
                const toCfg = STAGE_CONFIG[r.to_stage] || {};
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
                          <span>moved to </span>
                          <span className="pill" style={{ color: toCfg.color, background: toCfg.bg, borderColor: toCfg.border }}>
                            {r.to_stage}
                          </span>
                        </>
                      ) : (
                        <span>applied for {r.role}</span>
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
