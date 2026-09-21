'use client';

import React, { useState } from 'react';

type Task = {
  id: string;
  title: string;
  priority: string;
  status: string;
  createdAt: Date;
  startedAt: Date | null;
  qcAt: Date | null;
  closedAt: Date | null;
};

const ST: Record<string, { label: string; c: string }> = {
  pending: { label: 'Not started', c: '--s-pend' },
  in_progress: { label: 'In progress', c: '--s-prog' },
  qc: { label: 'Awaiting QC', c: '--s-qc' },
  closed: { label: 'Closed', c: '--s-done' },
};

const P: Record<string, { short: string; c: string; s: string; r: number }> = {
  high: { short: 'High', c: '--hi', s: '--hi-soft', r: 3 },
  medium: { short: 'Medium', c: '--md', s: '--md-soft', r: 2 },
  low: { short: 'Low', c: '--lo', s: '--lo-soft', r: 1 },
};

const DAY = 864e5;

function days(a: number, b: number) {
  return Math.max(0, Math.floor((b - a) / DAY));
}

function fmt(d: Date | number | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function TimelineView({ tasks }: { tasks: Task[] }) {
  const [showClosed, setShowClosed] = useState(false);

  if (!tasks.length) {
    return (
      <div className="panel">
        <div className="empty">No dependencies yet.</div>
      </div>
    );
  }

  const now = Math.floor(Date.now() / 60000) * 60000;
  const t0 = Math.min(...tasks.map(t => new Date(t.createdAt).getTime()));
  const span = Math.max(now - t0, 7 * DAY);
  const spanDays = Math.ceil(span / DAY);

  // Responsive fixed-pixel layout calculations
  const x0 = 340; // Generous room for titles & age badges
  const timelineWidth = Math.max(700, Math.min(1300, spanDays * 7));
  const W = x0 + timelineWidth + 40;
  const x1 = W - 30;
  const rh = 36; // Height per task row
  const top = 36; // Header axis offset

  const act = tasks.filter(t => t.status !== 'closed').sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const done = tasks.filter(t => t.status === 'closed').sort((a, b) => (new Date(b.closedAt || 0).getTime()) - (new Date(a.closedAt || 0).getTime()));

  const totalRows = act.length + (done.length ? (showClosed ? done.length + 1 : 1) : 0);
  const H = top + totalRows * rh + 20;

  const X = (t: number) => x0 + ((t - t0) / span) * (x1 - x0);

  const renderRow = (t: Task, y: number, opacity: number = 1) => {
    const pr = P[t.priority] || P.medium;
    const cy = y + rh / 2;
    const cTime = new Date(t.createdAt).getTime();
    const sTime = t.startedAt ? new Date(t.startedAt).getTime() : null;
    const qTime = t.qcAt ? new Date(t.qcAt).getTime() : null;
    const closedTime = t.closedAt ? new Date(t.closedAt).getTime() : null;
    const end = closedTime || now;

    const d = closedTime ? days(cTime, end) : days(cTime, now);
    const ageColor = closedTime ? 'var(--faint)' : d >= 14 ? 'var(--hi)' : d >= 7 ? 'var(--md)' : 'var(--faint)';

    return (
      <a key={t.id} href={`#task-${t.id}`} style={{ opacity, cursor: 'pointer', textDecoration: 'none' }}>
        <g>
          <title>{`${t.title}, raised ${fmt(cTime)}, ${ST[t.status]?.label.toLowerCase()}`}</title>
          
          {/* Priority Dot */}
          <circle cx="10" cy={cy} r="4" style={{ fill: `var(${pr.c})` }} />

          {/* Task Title */}
          <text className="rowlbl" x="24" y={cy + 4} style={{ fill: 'var(--ink)', fontSize: '13px', fontWeight: 500 }}>
            {t.title.length > 42 ? t.title.slice(0, 41) + '…' : t.title}
          </text>

          {/* Age in days */}
          <text className="agetx" x={x0 - 16} y={cy + 4} textAnchor="end" style={{ fill: ageColor, fontSize: '12px', fontWeight: 600 }}>
            {d}d
          </text>

          {/* Pending segment (Not started) */}
          <line
            x1={X(cTime)}
            x2={X(sTime || end)}
            y1={cy}
            y2={cy}
            style={{ stroke: 'var(--s-pend)', strokeWidth: 8, strokeLinecap: 'round' }}
          />

          {/* In Progress segment */}
          {sTime && (
            <line
              x1={X(sTime)}
              x2={X(qTime || end)}
              y1={cy}
              y2={cy}
              style={{ stroke: 'var(--s-prog)', strokeWidth: 8, strokeLinecap: 'round' }}
            />
          )}

          {/* QC segment */}
          {qTime && (
            <line
              x1={X(qTime)}
              x2={X(end)}
              y1={cy}
              y2={cy}
              style={{ stroke: 'var(--s-qc)', strokeWidth: 8, strokeLinecap: 'round' }}
            />
          )}

          {/* Status End Indicator Circle */}
          <circle
            cx={X(end)}
            cy={cy}
            r="6"
            style={{ fill: `var(${ST[t.status]?.c || '--s-pend'})`, stroke: 'var(--surface)', strokeWidth: 2 }}
          />
        </g>
      </a>
    );
  };

  // Generate grid date columns with clean spacing based on date span
  const gridLines = [];
  const stepDays = spanDays > 120 ? 14 : spanDays > 45 ? 7 : 4;
  for (let t = t0; t <= now; t += stepDays * DAY) {
    gridLines.push(
      <g key={t}>
        <line className="gridl" x1={X(t)} x2={X(t)} y1={top - 8} y2={H - 10} style={{ stroke: 'var(--line)', strokeWidth: 1 }} />
        <text className="axis" x={X(t)} y={top - 14} textAnchor="middle" style={{ fill: 'var(--faint)', fontSize: '11px', fontWeight: 500 }}>
          {fmt(t)}
        </text>
      </g>
    );
  }

  return (
    <div className="panel" style={{ padding: '20px' }}>
      <div className="ph2" style={{ marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px' }}>How long each change has been open</h2>
          <p style={{ margin: 0, color: 'var(--faint)', fontSize: '13px' }}>
            One line per dependency, from the day it was raised. A long grey stretch means work has not started.
          </p>
        </div>
      </div>

      {/* Horizontal Scrollable Container */}
      <div className="scroll-x" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', border: '1px solid var(--line)', borderRadius: '8px', padding: '12px 8px 8px', background: 'var(--surface)' }}>
        <div style={{ minWidth: `${W}px`, width: `${W}px` }}>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Timeline of each dependency" suppressHydrationWarning style={{ display: 'block' }}>
            {gridLines}

            {/* Today's marker line */}
            <line x1={x1} x2={x1} y1={top - 8} y2={H - 10} style={{ stroke: 'var(--ac)', strokeDasharray: '4 4', strokeWidth: 1.5 }} />

            {/* Active Tasks */}
            {act.map((t, i) => renderRow(t, top + i * rh))}

            {/* Closed Tasks Toggle & Rows */}
            {done.length > 0 && (
              <>
                <line className="gridl" x1="0" x2={W} y1={top + act.length * rh + 14} y2={top + act.length * rh + 14} style={{ stroke: 'var(--line)', strokeDasharray: '2 2' }} />
                <g onClick={() => setShowClosed(!showClosed)} style={{ cursor: 'pointer' }}>
                  <rect x="0" y={top + act.length * rh + 18} width="160" height="22" fill="transparent" />
                  <text className="axis" x="10" y={top + act.length * rh + 32} style={{ fill: 'var(--ac)', fontWeight: 600, fontSize: '12px' }}>
                    {showClosed ? '▼ Hide closed' : '▶ Show closed'} ({done.length} tasks)
                  </text>
                </g>
                {showClosed && done.map((t, i) => renderRow(t, top + (act.length + 1) * rh + 10 + i * rh, 0.65))}
              </>
            )}
          </svg>
        </div>
      </div>

      {/* Legend Footer */}
      <div className="legend" style={{ display: 'flex', gap: '20px', marginTop: '14px', fontSize: '12px', color: 'var(--faint)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <i style={{ background: 'var(--s-pend)', width: 14, height: 4, borderRadius: 2 }}></i> Not started
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <i style={{ background: 'var(--s-prog)', width: 14, height: 4, borderRadius: 2 }}></i> In progress
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <i style={{ background: 'var(--s-qc)', width: 14, height: 4, borderRadius: 2 }}></i> Awaiting QC
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <i style={{ background: 'var(--s-done)', width: 8, height: 8, borderRadius: '50%' }}></i> Closed
        </span>
      </div>
    </div>
  );
}
