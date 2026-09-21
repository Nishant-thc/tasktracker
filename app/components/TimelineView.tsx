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
  const t0 = Math.min(...tasks.map(t => t.createdAt.getTime()));
  const span = Math.max(now - t0, 7 * DAY);
  const W = Math.max(880, (span / DAY) * 15 + 300);
  const x0 = 250, x1 = W - 28, rh = 30, top = 32;

  const act = tasks.filter(t => t.status !== 'closed').sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const done = tasks.filter(t => t.status === 'closed').sort((a, b) => (b.closedAt?.getTime() || 0) - (a.closedAt?.getTime() || 0));
  
  const H = top + act.length * rh + (done.length ? 34 + (showClosed ? done.length * rh : 0) : 0) + 10;

  const X = (t: number) => x0 + ((t - t0) / span) * (x1 - x0);

  const renderRow = (t: Task, y: number, opacity: number = 1) => {
    const pr = P[t.priority] || P.medium;
    const cy = y + rh / 2;
    const end = t.closedAt?.getTime() || now;
    const cTime = t.createdAt.getTime();
    const sTime = t.startedAt?.getTime();
    const qTime = t.qcAt?.getTime();

    const d = t.closedAt ? days(cTime, end) : days(cTime, now);
    const ageColor = t.closedAt ? 'var(--faint)' : d >= 14 ? 'var(--hi)' : d >= 7 ? 'var(--md)' : 'var(--faint)';

    return (
      <a key={t.id} href={`#task-${t.id}`} style={{ opacity, cursor: 'pointer', textDecoration: 'none' }}>
        <g>
          <title>{`${t.title}, raised ${fmt(cTime)}, ${ST[t.status].label.toLowerCase()}`}</title>
          <circle cx="6" cy={cy} r="4" style={{ fill: `var(${pr.c})` }} />
          <text className="rowlbl" x="18" y={cy + 4} style={{ fill: 'var(--ink)' }}>{t.title.length > 30 ? t.title.slice(0, 29) + '…' : t.title}</text>
          <text className="agetx" x={x0 - 12} y={cy + 4} textAnchor="end" style={{ fill: ageColor }}>{d}d</text>
          
          {/* Pending segment */}
          <line x1={X(cTime)} x2={X(sTime || end)} y1={cy} y2={cy} style={{ stroke: 'var(--s-pend)', strokeWidth: 7, strokeLinecap: 'round' }} />
          
          {/* In Progress segment */}
          {sTime && (
            <line x1={X(sTime)} x2={X(qTime || end)} y1={cy} y2={cy} style={{ stroke: 'var(--s-prog)', strokeWidth: 7, strokeLinecap: 'round' }} />
          )}

          {/* QC segment */}
          {qTime && (
            <line x1={X(qTime)} x2={X(end)} y1={cy} y2={cy} style={{ stroke: 'var(--s-qc)', strokeWidth: 7, strokeLinecap: 'round' }} />
          )}

          <circle cx={X(end)} cy={cy} r="6" style={{ fill: `var(${ST[t.status].c})`, stroke: 'var(--surface)', strokeWidth: 2 }} />
        </g>
      </a>
    );
  };

  // Generate grid lines
  const gridLines = [];
  for (let t = t0; t <= now; t += 7 * DAY) {
    gridLines.push(
      <g key={t}>
        <line className="gridl" x1={X(t)} x2={X(t)} y1={top - 10} y2={H - 6} />
        <text className="axis" x={X(t)} y={top - 16} textAnchor="middle">{fmt(t)}</text>
      </g>
    );
  }

  return (
    <div className="panel">
      <div className="ph2">
        <div>
          <h2>How long each change has been open</h2>
          <p>One line per dependency, from the day it was raised. A long grey stretch means work has not started.</p>
        </div>
      </div>
      <div className="scroll-x">
        <div className="inner chartwrap">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Timeline of each dependency" suppressHydrationWarning>
            {gridLines}
            <line x1={x1} x2={x1} y1={top - 10} y2={H - 6} style={{ stroke: 'var(--ac)', strokeDasharray: '3 3' }} />
            
            {act.map((t, i) => renderRow(t, top + i * rh))}
            
            {done.length > 0 && (
              <>
                <line className="gridl" x1="0" x2={W} y1={top + act.length * rh + 12} y2={top + act.length * rh + 12} />
                <g onClick={() => setShowClosed(!showClosed)} style={{ cursor: 'pointer' }}>
                  <rect x="0" y={top + act.length * rh + 15} width="80" height="20" fill="transparent" />
                  <text className="axis" x="0" y={top + act.length * rh + 27} style={{ fill: 'var(--ink)', textDecoration: 'underline' }}>
                    {showClosed ? 'Hide closed' : 'Show closed'} ({done.length})
                  </text>
                </g>
                {showClosed && done.map((t, i) => renderRow(t, top + act.length * rh + 34 + i * rh, 0.6))}
              </>
            )}
          </svg>
        </div>
      </div>
      <div className="legend">
        <span><i style={{ background: 'var(--s-pend)' }}></i>Not started</span>
        <span><i style={{ background: 'var(--s-prog)' }}></i>In progress</span>
        <span><i style={{ background: 'var(--s-qc)' }}></i>Awaiting QC</span>
        <span><i style={{ background: 'var(--s-done)', width: 8, height: 8, borderRadius: '50%' }}></i>Closed</span>
      </div>
    </div>
  );
}
