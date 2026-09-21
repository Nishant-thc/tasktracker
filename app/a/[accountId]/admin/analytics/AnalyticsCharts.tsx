'use client';

import React from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Funnel, FunnelChart, LabelList
} from 'recharts';

const COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#0891b2'];

type WeeklyData = { week: string; opened: number; closed: number };
type AmData = { name: string; projects: number; closed: number; reworks: number; avgDays: number };
type CommsData = { date: string; email: number; slack: number; whatsapp: number; system: number };
type CategoryData = { name: string; value: number };
type StatusData = { name: string; value: number; fill: string };

interface Props {
  weeklyData: WeeklyData[];
  amData: AmData[];
  commsData: CommsData[];
  categoryData: CategoryData[];
  statusFunnel: StatusData[];
}

export default function AnalyticsCharts({ weeklyData, amData, commsData, categoryData, statusFunnel }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', padding: '0 24px 40px', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Row 1: Agency health over time + Category breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
        <div className="panel" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '15px' }}>Agency Health — Tasks Opened vs. Closed (Weekly)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }} />
              <Legend />
              <Bar dataKey="opened" name="Opened" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              <Bar dataKey="closed" name="Closed" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '15px' }}>Projects by Category</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" outerRadius={85} dataKey="value" nameKey="name" label={({ name, percent }: any) => `${name} ${Math.round((percent ?? 0) * 100)}%`} labelLine={false}>
                {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: AM Performance + Communication Frequency */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="panel" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '15px' }}>Account Manager Performance</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={amData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={80} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }} />
              <Legend />
              <Bar dataKey="closed" name="Tasks Closed" fill="#059669" radius={[0, 4, 4, 0]} />
              <Bar dataKey="reworks" name="Reworks" fill="#d97706" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '15px' }}>Communication Frequency (30 days)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={commsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }} />
              <Legend />
              <Line type="monotone" dataKey="email" name="Email" stroke="#7c3aed" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="slack" name="Slack" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="system" name="System" stroke="#9ca3af" strokeWidth={1} dot={false} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Overall task status funnel */}
      <div className="panel" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 20px', fontSize: '15px' }}>Overall Task Status Distribution</h3>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={statusFunnel} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 13 }} width={110} />
            <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }} />
            <Bar dataKey="value" name="Tasks" radius={[0, 6, 6, 0]}>
              {statusFunnel.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
