'use client';

import React, { useState } from 'react';
import { updateCustomMetrics, sendInsightNotification } from '@/app/actions/taskActions';

type Task = {
  id: string;
  title: string;
  priority: string;
  impactScore: number;
  estimatedUpliftPct: number;
  status: string;
  createdAt: Date;
  startedAt: Date | null;
  qcAt: Date | null;
  closedAt: Date | null;
};

export type CustomMetric = {
  id: string;
  title: string;
  source: 'GA4' | 'GSC' | 'Manual';
  value: string;
  change: string;
  taskId: string; // The associated task that caused this
};

type ImpactViewProps = {
  projectId: string;
  tasks: Task[];
  role: 'agency' | 'client';
  customMetricsJson?: string | null;
};

const DAY = 864e5;

const P: Record<string, { short: string; c: string }> = {
  high: { short: 'High', c: '--hi' },
  medium: { short: 'Medium', c: '--md' },
  low: { short: 'Low', c: '--lo' },
};

function fmt(d: Date | number) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function days(a: number, b: number) {
  return Math.max(0, Math.floor((b - a) / DAY));
}

function k(n: number) {
  return n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k' : Math.round(n).toString();
}

export default function ImpactView({ projectId, tasks, role, customMetricsJson }: ImpactViewProps) {
  const [metrics, setMetrics] = useState<CustomMetric[]>(() => {
    if (customMetricsJson) {
      try { return JSON.parse(customMetricsJson); } catch (e) { return []; }
    }
    return [];
  });

  const [dateRange, setDateRange] = useState('30d');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInsightModal, setShowInsightModal] = useState<CustomMetric | null>(null);
  
  const [newMetric, setNewMetric] = useState<Partial<CustomMetric>>({
    source: 'GSC',
    taskId: '',
  });

  const [insightMsg, setInsightMsg] = useState('');
  const [sendingInsight, setSendingInsight] = useState(false);

  const handleSaveMetric = async () => {
    if (!newMetric.title || !newMetric.value) return;
    
    const metric: CustomMetric = {
      id: Math.random().toString(36).substr(2, 9),
      title: newMetric.title,
      source: newMetric.source as any,
      value: newMetric.value,
      change: newMetric.change || '',
      taskId: newMetric.taskId || '',
    };
    
    const updated = [...metrics, metric];
    setMetrics(updated);
    setShowAddModal(false);
    setNewMetric({ source: 'GSC', taskId: '' });
    
    await updateCustomMetrics(projectId, JSON.stringify(updated));
  };

  const handleSendInsight = async () => {
    if (!showInsightModal) return;
    setSendingInsight(true);
    await sendInsightNotification(projectId, showInsightModal.title, insightMsg);
    setSendingInsight(false);
    setShowInsightModal(null);
    setInsightMsg('');
    alert('Insight notification sent to client via Slack/Email!');
  };

  const getSourceColor = (source: string) => {
    if (source === 'GA4') return '#F29900';
    if (source === 'GSC') return '#4285F4';
    return 'var(--s-done)';
  };

  if (!tasks.length) {
    return (
      <div className="panel">
        <div className="empty">Impact appears once dependencies are added.</div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Original Chart Calculations
  // -------------------------------------------------------------
  const now = Math.floor(Date.now() / 60000) * 60000;
  const t0 = Math.min(...tasks.map(t => t.createdAt.getTime())) - 4 * DAY;
  const N = Math.max(15, Math.floor((now - t0) / DAY) + 1);
  const ramp = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  
  let lost = 0;
  const lostBy: Record<string, number> = {};
  tasks.forEach(t => { lostBy[t.id] = 0; });

  const rows: any[] = [];
  for (let i = 0; i < N; i++) {
    const t = t0 + i * DAY;
    const base = 9200 + i * 26 + Math.sin((i * 2 * Math.PI) / 7) * 240 + Math.sin(i * 1.3) * 80;
    let a = 0, pp = 0;

    for (let j = 0; j < tasks.length; j++) {
      const u = (tasks[j].estimatedUpliftPct || 0) / 100;
      const cAt = tasks[j].closedAt?.getTime();
      const rAt = tasks[j].createdAt.getTime();
      const aj = cAt ? u * ramp((t - cAt) / (14 * DAY)) : 0;
      const pj = Math.max(u * ramp((t - (rAt + 7 * DAY)) / (14 * DAY)), aj);
      a += aj;
      pp += pj;
      lostBy[tasks[j].id] += base * (pj - aj);
    }
    
    rows.push({ t, base, act: base * (1 + a), pot: base * (1 + pp), gap: base * (pp - a), gain: base * a });
    lost += base * (pp - a);
  }

  const gapNow = rows[N - 1].gap;

  // Chart setup
  const PW = 900, PH = 260, ML = 48, MR = 14, MT = 12, MB = 28;
  const ymin = Math.floor(Math.min(...rows.map(r => r.act)) * 0.97 / 1000) * 1000;
  const ymax0 = Math.max(...rows.map(r => r.pot)) * 1.03;
  const ystep = Math.ceil((ymax0 - ymin) / 4 / 500) * 500;
  const ymax = ymin + ystep * 4;

  const X = (i: number) => ML + i * (PW - ML - MR) / (N - 1);
  const Y = (v: number) => MT + (1 - (v - ymin) / (ymax - ymin)) * (PH - MT - MB);

  const act = rows.map((r, i) => [X(i), Y(r.act)]);
  const pot = rows.map((r, i) => [X(i), Y(r.pot)]);

  const sp = (pts: number[][]) => {
    if (pts.length < 3) return pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    let d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += 'C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ' ' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) +
           ' ' + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ' ' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) +
           ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    return d;
  };

  const gapPath = sp(pot) + sp(act.slice().reverse()).replace(/^M/, 'L') + 'Z';
  const fillPath = sp(act) + `L${X(N - 1)} ${PH - MB}L${X(0)} ${PH - MB}Z`;

  const openList = tasks.filter(t => t.status !== 'closed').map(t => ({ t, l: lostBy[t.id] })).sort((a, b) => b.l - a.l);
  const mx = Math.max(...openList.map(x => x.l), 1);

  return (
    <>
      <div className="ph2" style={{ marginBottom: '20px' }}>
        <div>
          <h2>Custom Metrics</h2>
          <p>Key performance indicators tracked from our integrations.</p>
        </div>
        <div className="acts">
          <select className="in" value={dateRange} onChange={e => setDateRange(e.target.value)}>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="ytd">Year to Date</option>
          </select>
          {role === 'agency' && (
            <button className="btn" onClick={() => setShowAddModal(true)}>Add Metric</button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {metrics.map(m => {
          const associatedTask = tasks.find(t => t.id === m.taskId);
          
          return (
            <div 
              key={m.id} 
              className="panel" 
              style={{ 
                margin: 0, 
                padding: '24px', 
                cursor: role === 'agency' ? 'pointer' : 'default',
                transition: 'transform 0.1s, box-shadow 0.1s'
              }}
              onClick={() => {
                if (role === 'agency') {
                  setShowInsightModal(m);
                  setInsightMsg(`Great news! Our recent work on "${associatedTask?.title || 'the project'}" has resulted in a ${m.change} change in ${m.title}.`);
                }
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dim)' }}>{m.title}</span>
                <span className="tag" style={{ margin: 0, borderColor: getSourceColor(m.source), color: getSourceColor(m.source), fontWeight: 600 }}>
                  {m.source}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '16px' }}>
                <b style={{ fontSize: '32px', fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>{m.value}</b>
                {m.change && (
                  <span style={{ fontSize: '14px', fontWeight: 600, color: m.change.startsWith('-') ? 'var(--hi)' : 'var(--s-done)' }}>
                    {m.change}
                  </span>
                )}
              </div>
              
              {associatedTask && (
                <div style={{ borderTop: '1px solid var(--line2)', paddingTop: '12px', marginTop: 'auto' }}>
                  <div style={{ fontSize: '11px', color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                    Driven By
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 500 }}>
                    {associatedTask.title}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {metrics.length === 0 && (
        <div className="panel" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--faint)', marginBottom: '24px' }}>
          <p style={{ maxWidth: '400px', margin: '0 auto 12px' }}>
            {role === 'agency' 
              ? 'Add a custom metric card to start demonstrating the ROI of your deliverables to the client.' 
              : 'Your agency will post impact metrics here once changes begin driving results.'}
          </p>
          {role === 'agency' && (
            <button className="btn ghost sm" onClick={() => setShowAddModal(true)}>Create First Metric</button>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          Original Impact Chart
          ------------------------------------------------------------- */}
      <div className="panel">
        <div className="ph2">
          <div>
            <h2>Organic sessions: actual against on-time delivery</h2>
            <p>The dashed line shows where sessions would be if every change shipped within a week of being raised. The shaded gap is what waiting has cost.</p>
          </div>
          <div className="figs">
            <div>
              <b style={{ color: 'var(--hi)' }}>~{k(lost)}</b>
              <span>sessions not yet gained</span>
            </div>
            <div>
              <b style={{ color: 'var(--hi)' }}>~{k(gapNow)}</b>
              <span>held back per day now</span>
            </div>
          </div>
        </div>
        
        <div className="chartwrap" style={{ position: 'relative' }}>
          <svg viewBox={`0 0 ${PW} ${PH}`} role="img" aria-label="Organic sessions" suppressHydrationWarning>
            <defs>
              <linearGradient id="gGap" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" style={{ stopColor: 'var(--hi)', stopOpacity: 0.30 }} />
                <stop offset="1" style={{ stopColor: 'var(--hi)', stopOpacity: 0.05 }} />
              </linearGradient>
              <linearGradient id="gFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" style={{ stopColor: 'var(--ac)', stopOpacity: 0.14 }} />
                <stop offset="1" style={{ stopColor: 'var(--ac)', stopOpacity: 0 }} />
              </linearGradient>
            </defs>

            {[0, 1, 2, 3, 4].map(g => {
              const v = ymin + (ymax - ymin) * g / 4;
              const y = Y(v);
              return (
                <g key={g}>
                  <line className="gridl" x1={ML} x2={PW - MR} y1={y} y2={y} />
                  <text className="axis" x={ML - 8} y={y + 4} textAnchor="end">{k(v)}</text>
                </g>
              );
            })}

            {rows.map((r, i) => i % 7 === 0 ? (
              <text key={i} className="axis" x={X(i)} y={PH - 8} textAnchor="middle">{fmt(r.t)}</text>
            ) : null)}

            <path d={gapPath} fill="url(#gGap)" />
            <path d={fillPath} fill="url(#gFill)" />
            <path d={sp(pot)} fill="none" style={{ stroke: 'var(--hi)' }} strokeWidth="1.5" strokeDasharray="4 4" />
            <path d={sp(act)} fill="none" style={{ stroke: 'var(--ac)' }} strokeWidth="2.25" strokeLinecap="round" />

            {tasks.map(t => {
              if (!t.closedAt) return null;
              const i = Math.round((t.closedAt.getTime() - t0) / DAY);
              if (i < 0 || i > N - 1) return null;
              return (
                <g key={t.id}>
                  <circle cx={X(i)} cy={Y(rows[i].act)} r="4.5" style={{ fill: 'var(--s-done)', stroke: 'var(--surface)' }} strokeWidth="2" />
                  <title>{t.title}, closed {fmt(t.closedAt)}</title>
                </g>
              );
            })}

            <line x1={X(N - 1)} x2={X(N - 1)} y1={pot[N - 1][1]} y2={act[N - 1][1]} style={{ stroke: 'var(--hi)' }} strokeWidth="2" />
            <text x={X(N - 1)} y={MT + 6} textAnchor="end" style={{ fill: 'var(--hi)', fontSize: 12, fontWeight: 600 }}>
              {k(gapNow)} sessions a day held back
            </text>
          </svg>
        </div>
        
        <div className="legend">
          <span><i style={{ background: 'var(--ac)' }}></i>Actual sessions</span>
          <span><i style={{ background: 'var(--hi)' }}></i>If shipped on time</span>
          <span><i style={{ background: 'var(--hi)', opacity: 0.3, height: 8 }}></i>Growth held back</span>
          <span><i style={{ background: 'var(--s-done)', width: 8, height: 8, borderRadius: '50%' }}></i>Change closed</span>
        </div>
        
        <p className="note">
          Illustrative model built from each change’s estimated uplift and dates. {role === 'agency' ? 'Connect GA4 or Search Console under Integrations to use measured sessions.' : 'Measured sessions will replace this once analytics is connected.'}
        </p>
      </div>

      <div className="panel">
        <div className="ph2">
          <div>
            <h2>Cost of delay by open change</h2>
            <p>Estimated sessions lost to date because each change is not yet live.</p>
          </div>
        </div>
        <div className="tblwrap">
          <table className="gt">
            <thead>
              <tr>
                <th>Change</th>
                <th>Priority</th>
                <th className="n">Waiting</th>
                <th className="n">Est. uplift</th>
                <th className="n">Sessions lost</th>
                <th style={{ width: '22%' }}></th>
              </tr>
            </thead>
            <tbody>
              {openList.length ? openList.map(({ t, l }) => {
                const pr = P[t.priority] || P.medium;
                return (
                  <tr key={t.id}>
                    <td>{t.title}</td>
                    <td>
                      <span className="pri">
                        <i style={{ background: `var(${pr.c})` }}></i>
                        {pr.short}
                      </span>
                    </td>
                    <td className="n">{days(t.createdAt.getTime(), now)}d</td>
                    <td className="n">+{t.estimatedUpliftPct || 0}%</td>
                    <td className="n">~{k(l)}</td>
                    <td>
                      <div className="lossbar" style={{ width: `${Math.max(2, (l / mx) * 100)}%` }}></div>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={6} className="empty">Nothing open. No ongoing cost of delay.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Metric Modal */}
      <div className={`ov ${showAddModal ? 'open' : ''}`}>
        <div className="dlg">
          <h2>Add Impact Metric</h2>
          <p className="sub2">Create a custom metric card to showcase performance.</p>
          
          <div className="f">
            <label>Metric Title</label>
            <input type="text" placeholder="e.g. Referral Domains" value={newMetric.title || ''} onChange={e => setNewMetric({...newMetric, title: e.target.value})} />
          </div>
          <div className="two2">
            <div className="f">
              <label>Current Value</label>
              <input type="text" placeholder="e.g. 240" value={newMetric.value || ''} onChange={e => setNewMetric({...newMetric, value: e.target.value})} />
            </div>
            <div className="f">
              <label>Trend / Change</label>
              <input type="text" placeholder="e.g. +15%" value={newMetric.change || ''} onChange={e => setNewMetric({...newMetric, change: e.target.value})} />
            </div>
          </div>
          <div className="two2">
            <div className="f">
              <label>Data Source</label>
              <select value={newMetric.source} onChange={e => setNewMetric({...newMetric, source: e.target.value as any})}>
                <option value="GSC">Google Search Console</option>
                <option value="GA4">Google Analytics 4</option>
                <option value="Manual">Manual Entry</option>
              </select>
            </div>
            <div className="f">
              <label>Driven by Task</label>
              <select value={newMetric.taskId} onChange={e => setNewMetric({...newMetric, taskId: e.target.value})}>
                <option value="">-- None --</option>
                {tasks.filter(t => t.status === 'closed').map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="acts">
            <button className="btn ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
            <button className="btn" onClick={handleSaveMetric} disabled={!newMetric.title || !newMetric.value}>Save Metric</button>
          </div>
        </div>
      </div>

      {/* Insight Notification Modal */}
      <div className={`ov ${!!showInsightModal ? 'open' : ''}`}>
        <div className="dlg">
          <h2>Send Insight Notification</h2>
          <p className="sub2">Alert the client about this {showInsightModal?.title} metric via Email & Slack.</p>
          
          <div className="f">
            <label>Notification Message</label>
            <textarea 
              value={insightMsg} 
              onChange={e => setInsightMsg(e.target.value)} 
              rows={4}
            />
            <div className="h">This message will be sent instantly to all connected client channels.</div>
          </div>
          
          <div className="acts">
            <button className="btn ghost" onClick={() => setShowInsightModal(null)} disabled={sendingInsight}>Cancel</button>
            <button className="btn" onClick={handleSendInsight} disabled={sendingInsight || !insightMsg.trim()}>
              {sendingInsight ? 'Sending...' : 'Send Insight Alert'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
