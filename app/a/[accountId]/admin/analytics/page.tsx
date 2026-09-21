import React from 'react';
import { prisma } from '@/app/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import AnalyticsCharts from './AnalyticsCharts';

function getWeekLabel(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default async function AdminAnalyticsPage({ params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      projects: {
        include: {
          dependencies: true,
          accountManager: { select: { id: true, name: true } }
        }
      },
      messageLogs: { orderBy: { sentAt: 'asc' } }
    }
  });
  if (!account) notFound();

  // ── Weekly opened vs closed ──────────────────────────────────────────────
  const weeklyMap: Record<string, { opened: number; closed: number }> = {};
  account.projects.forEach(p => {
    p.dependencies.forEach(t => {
      const openWeek = getWeekLabel(t.createdAt);
      weeklyMap[openWeek] = weeklyMap[openWeek] || { opened: 0, closed: 0 };
      weeklyMap[openWeek].opened++;
      if (t.closedAt) {
        const closeWeek = getWeekLabel(t.closedAt);
        weeklyMap[closeWeek] = weeklyMap[closeWeek] || { opened: 0, closed: 0 };
        weeklyMap[closeWeek].closed++;
      }
    });
  });
  const weeklyData = Object.entries(weeklyMap)
    .slice(-12) // last 12 weeks
    .map(([week, v]) => ({ week, ...v }));

  // ── AM Performance ──────────────────────────────────────────────────────
  const amMap: Record<string, { name: string; projects: number; closed: number; reworks: number; totalDays: number; closedCount: number }> = {};
  account.projects.forEach(p => {
    if (!p.accountManagerId || !p.accountManager) return;
    const id = p.accountManagerId;
    amMap[id] = amMap[id] || { name: p.accountManager.name || 'Unknown', projects: 0, closed: 0, reworks: 0, totalDays: 0, closedCount: 0 };
    amMap[id].projects++;
    p.dependencies.forEach(t => {
      if (t.status === 'closed') {
        amMap[id].closed++;
        if (t.closedAt) {
          amMap[id].totalDays += Math.max(1, Math.floor((t.closedAt.getTime() - t.createdAt.getTime()) / 86400000));
          amMap[id].closedCount++;
        }
      }
      amMap[id].reworks += t.reworkCount;
    });
  });
  const amData = Object.values(amMap).map(a => ({
    name: a.name,
    projects: a.projects,
    closed: a.closed,
    reworks: a.reworks,
    avgDays: a.closedCount > 0 ? Math.round(a.totalDays / a.closedCount) : 0,
  }));

  // ── Communication frequency (last 30 days by day) ────────────────────────
  const last30 = new Date(Date.now() - 30 * 86400000);
  const commsMap: Record<string, { email: number; slack: number; whatsapp: number; system: number }> = {};
  account.messageLogs
    .filter(l => l.sentAt >= last30)
    .forEach(l => {
      const day = new Date(l.sentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      commsMap[day] = commsMap[day] || { email: 0, slack: 0, whatsapp: 0, system: 0 };
      if (l.channel in commsMap[day]) (commsMap[day] as Record<string, number>)[l.channel]++;
    });
  const commsData = Object.entries(commsMap).map(([date, v]) => ({ date, ...v }));

  // ── Category breakdown ───────────────────────────────────────────────────
  const catMap: Record<string, number> = {};
  account.projects.forEach(p => {
    const cat = p.category || 'Uncategorized';
    catMap[cat] = (catMap[cat] || 0) + 1;
  });
  const categoryData = Object.entries(catMap).map(([name, value]) => ({ name, value }));

  // ── Status funnel ────────────────────────────────────────────────────────
  const allTasks = account.projects.flatMap(p => p.dependencies);
  const statusFunnel = [
    { name: 'Pending', value: allTasks.filter(t => t.status === 'pending').length, fill: '#9ca3af' },
    { name: 'In Progress', value: allTasks.filter(t => t.status === 'in_progress').length, fill: '#2563eb' },
    { name: 'Awaiting QC', value: allTasks.filter(t => t.status === 'qc').length, fill: '#d97706' },
    { name: 'Closed', value: allTasks.filter(t => t.status === 'closed').length, fill: '#059669' },
  ];

  return (
    <>
      <div className="ph" style={{ paddingBottom: '16px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px' }}>Agency Analytics</h1>
          <p style={{ margin: 0 }}>
            <Link href={`/a/${accountId}/admin`} style={{ color: 'var(--faint)' }}>← Admin Panel</Link>
            {' '}· Aggregated performance across all projects and account managers
          </p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="strip" style={{ marginBottom: '24px' }}>
        <div className="stats" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          <div className="stat"><span>Total Projects</span><b>{account.projects.length}</b></div>
          <div className="stat"><span>Total Tasks</span><b>{allTasks.length}</b></div>
          <div className="stat"><span>Closed Tasks</span><b style={{ color: 'var(--s-done)' }}>{allTasks.filter(t => t.status === 'closed').length}</b></div>
          <div className="stat"><span>Total Reworks</span><b style={{ color: 'var(--warn)' }}>{allTasks.reduce((s, t) => s + t.reworkCount, 0)}</b></div>
          <div className="stat"><span>Total Messages</span><b>{account.messageLogs.length}</b></div>
        </div>
      </div>

      <AnalyticsCharts
        weeklyData={weeklyData}
        amData={amData}
        commsData={commsData}
        categoryData={categoryData.length > 0 ? categoryData : [{ name: 'No Data', value: 1 }]}
        statusFunnel={statusFunnel}
      />
    </>
  );
}
