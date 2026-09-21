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

  // Split-layout metrics
  const rh = 36; // Row height in pixels (1:1 lock between left sidebar & right SVG)
  const top = 36; // Header height
  const timelineWidth = Math.max(800, Math.min(1400, spanDays * 8.5));
  const x1 = timelineWidth - 20;

  const act = tasks.filter(t => t.status !== 'closed').sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const done = tasks.filter(t => t.status === 'closed').sort((a, b) => (new Date(b.closedAt || 0).getTime()) - (new Date(a.closedAt || 0).getTime()));

  const totalRows = act.length + (done.length ? (showClosed ? done.length + 1 : 1) : 0);
  const H = top + totalRows * rh + 10;

  const X = (t: number) => 20 + ((t - t0) / span) * (x1 - 20);

  const renderSvgRow = (t: Task, y: number, opacity: number = 1) => {
    const cy = y + rh / 2;
    const cTime = new Date(t.createdAt).getTime();
    const sTime = t.startedAt ? new Date(t.startedAt).getTime() : null;
    const qTime = t.qcAt ? new Date(t.qcAt).getTime() : null;
    const closedTime = t.closedAt ? new Date(t.closedAt).getTime() : null;
    const end = closedTime || now;

    return (
      <g key={t.id} style={{ opacity }}>
        <title>{`${t.title}, raised ${fmt(cTime)}, ${ST[t.status]?.label.toLowerCase()}`}</title>
        
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
    );
  };

  // Generate grid date columns with clean spacing based on date span
  const gridLines = [];
  const stepDays = spanDays > 120 ? 14 : spanDays > 45 ? 7 : 4;
  for (let t = t0; t <= now; t += stepDays * DAY) {
    gridLines.push(
      <g key={t}>
        <line className="gridl" x1={X(t)} x2={X(t)} y1={top - 8} y2={H - 6} style={{ stroke: 'var(--line)', strokeWidth: 1 }} />
        <text className="axis" x={X(t)} y={top - 14} textAnchor="middle" style={{ fill: 'var(--faint)', fontSize: '11px', fontWeight: 500 }}>
          {fmt(t)}
        </text>
      </g>
    );
  }

  const renderLeftTaskRow = (t: Task, isDone: boolean = false) => {
    const pr = P[t.priority] || P.medium;
    const cTime = new Date(t.createdAt).getTime();
    const end = t.closedAt ? new Date(t.closedAt).getTime() : now;
    const d = t.closedAt ? days(cTime, end) : days(cTime, now);
    const ageColor = t.closedAt ? 'var(--faint)' : d >= 14 ? 'var(--hi)' : d >= 7 ? 'var(--md)' : 'var(--faint)';

    return (
      <a
        key={t.id}
        href={`#task-${t.id}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          height: `${rh}px`,
          padding: '0 12px',
          borderBottom: '1px solid var(--line2)',
          textDecoration: 'none',
          color: 'var(--ink)',
          opacity: isDone ? 0.65 : 1,
          gap: '8px',
          transition: 'background 0.15s ease',
        }}
        className="gantt-row-hover"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: `var(${pr.c})`, flexShrink: 0 }} />
          <span
            style={{
              fontSize: '13px',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={t.title}
          >
            {t.title}
          </span>
        </div>
        <span style={{ fontSize: '12px', fontWeight: 600, color: ageColor, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
          {d}d
        </span>
      </a>
    );
  };

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

      {/* Split Gantt Container */}
      <div
        style={{
          display: 'flex',
          border: '1px solid var(--line)',
          borderRadius: '10px',
          overflow: 'hidden',
          background: 'var(--surface)',
        }}
      >
        {/* LEFT COLUMN: Pinned Sticky Task Titles */}
        <div
          style={{
            width: '320px',
            minWidth: '320px',
            flexShrink: 0,
            borderRight: '1px solid var(--line)',
            background: 'var(--surface)',
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header Cell */}
          <div
            style={{
              height: `${top}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 12px',
              borderBottom: '1px solid var(--line)',
              background: 'var(--line2)',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--faint)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            <span>Task / Dependency ({act.length})</span>
            <span>Age</span>
          </div>

          {/* Active Task Rows */}
          {act.map(t => renderLeftTaskRow(t, false))}

          {/* Closed Tasks Toggle & Rows */}
          {done.length > 0 && (
            <>
              <div
                onClick={() => setShowClosed(!showClosed)}
                style={{
                  height: `${rh}px`,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  borderBottom: '1px solid var(--line2)',
                  cursor: 'pointer',
                  color: 'var(--ac)',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: 'var(--ac-soft)',
                }}
              >
                {showClosed ? '▼ Hide closed' : '▶ Show closed'} ({done.length} tasks)
              </div>
              {showClosed && done.map(t => renderLeftTaskRow(t, true))}
            </>
          )}
        </div>

        {/* RIGHT COLUMN: Scrollable Timeline Grid & Bars */}
        <div
          style={{
            flex: 1,
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            background: 'var(--surface)',
          }}
        >
          <div style={{ minWidth: `${timelineWidth}px`, width: `${timelineWidth}px` }}>
            <svg
              width={timelineWidth}
              height={H}
              viewBox={`0 0 ${timelineWidth} ${H}`}
              role="img"
              aria-label="Timeline visualization"
              suppressHydrationWarning
              style={{ display: 'block' }}
            >
              {gridLines}

              {/* Today's marker line */}
              <line x1={x1} x2={x1} y1={top - 8} y2={H - 6} style={{ stroke: 'var(--ac)', strokeDasharray: '4 4', strokeWidth: 1.5 }} />

              {/* Active Tasks SVG Rows */}
              {act.map((t, i) => renderSvgRow(t, top + i * rh))}

              {/* Closed Tasks SVG Rows */}
              {done.length > 0 && showClosed && (
                done.map((t, i) => renderSvgRow(t, top + (act.length + 1) * rh + i * rh, 0.65))
              )}
            </svg>
          </div>
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
