'use client';

import React from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#0891b2'];

const CATEGORY_COLORS: Record<string, string> = {
  SEO: '#7c3aed', PPC: '#2563eb', Content: '#059669', CRO: '#d97706',
  Social: '#0891b2', Email: '#db2777', Tech: '#374151', Other: '#9ca3af',
};

type TaskTrend = { week: string; opened: number; closed: number };
type StatusDist = { name: string; value: number; fill: string };
type CategoryPerf = { category: string; closed: number; rework: number; avgDays: number };
type CategoryPending = { category: string; pending: number; inProgress: number; inQc: number; totalOpen: number };
type CommLog = { date: string; count: number };
type ProjectHealth = { name: string; open: number; closed: number; rework: number; pct: number };

interface Props {
  taskTrend: TaskTrend[];
  statusDist: StatusDist[];
  categoryPerf: CategoryPerf[];
  categoryPending?: CategoryPending[];
  commFreq: CommLog[];
  projectHealth: ProjectHealth[];
  amName: string;
}

export default function AmAnalyticsCharts({ taskTrend, statusDist, categoryPerf, categoryPending = [], commFreq, projectHealth, amName }: Props) {
  const kpiTextStyle: React.CSSProperties = { fontSize: '12px', color: 'var(--faint)', marginBottom: '16px' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Row 1: Task velocity + Status distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '20px' }}>
        <div className="panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700 }}>Task Velocity — Opened vs. Closed (Weekly)</h3>
          <p style={kpiTextStyle}>How fast is work progressing across all your projects?</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={taskTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px' }} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="opened" name="Opened" fill="#7c3aed" radius={[4,4,0,0]} />
              <Bar dataKey="closed" name="Closed" fill="#059669" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700 }}>Task Status Breakdown</h3>
          <p style={kpiTextStyle}>Current pipeline snapshot</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusDist} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" nameKey="name">
                {statusDist.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px' }} />
              <Legend wrapperStyle={{ fontSize: '12px' }} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Category Pending Bottleneck + Per-project health */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700 }}>Open Work Bottleneck by Category</h3>
          <p style={kpiTextStyle}>Which category has the most pending/open tasks across projects?</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryPending}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" />
              <XAxis dataKey="category" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px' }} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="pending" name="Not Started" stackId="a" fill="#9ca3af" />
              <Bar dataKey="inProgress" name="In Progress" stackId="a" fill="#2563eb" />
              <Bar dataKey="inQc" name="Awaiting QC" stackId="a" fill="#d97706" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700 }}>Project Completion Health</h3>
          <p style={kpiTextStyle}>Open vs. closed tasks per project</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={projectHealth} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px' }} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="closed" name="Closed" stackId="a" fill="#059669" radius={[0,0,0,0]} />
              <Bar dataKey="open" name="Open" stackId="a" fill="#7c3aed" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Category Performance */}
      <div className="panel" style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700 }}>Historical Category Performance</h3>
        <p style={kpiTextStyle}>Tasks closed vs. reworks generated by category</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={categoryPerf}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" />
            <XAxis dataKey="category" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px' }} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="closed" name="Closed" fill="#059669" radius={[4,4,0,0]} />
            <Bar dataKey="rework" name="Reworks" fill="#d97706" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Row 3: Communication pulse */}
      <div className="panel" style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700 }}>Communication Pulse (Last 30 Days)</h3>
        <p style={kpiTextStyle}>Messages sent and system events across all your projects</p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={commFreq}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px' }} />
            <Line type="monotone" dataKey="count" name="Messages" stroke="#7c3aed" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
