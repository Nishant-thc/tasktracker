import React from 'react';
import { prisma } from '@/app/lib/prisma';
import { notFound } from 'next/navigation';
import { getSession } from '@/app/lib/session';
import PortfolioShell from '@/app/components/PortfolioShell';
import AmAnalyticsCharts from './AmAnalyticsCharts';

function getWeekLabel(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default async function AmAnalyticsPage({ params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const session = await getSession();
  const amId = session?.id || null;
  const role = session?.role || 'admin';

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      projects: {
        where: role === 'am' && amId ? { accountManagerId: amId } : {},
        include: { dependencies: true, accountManager: { select: { name: true } } }
      },
      messageLogs: {
        where: role === 'am' && amId
          ? { project: { accountManagerId: amId } }
          : {},
        orderBy: { sentAt: 'asc' }
      }
    }
  });

  if (!account) notFound();

  const allTasks = account.projects.flatMap(p => p.dependencies);
  const amName = session?.name || 'Account Manager';

  // ── Task velocity (weekly) ──────────────────────────────────────────────
  const weeklyMap: Record<string, { opened: number; closed: number }> = {};
  allTasks.forEach(t => {
    const openWeek = getWeekLabel(t.createdAt);
    weeklyMap[openWeek] = weeklyMap[openWeek] || { opened: 0, closed: 0 };
    weeklyMap[openWeek].opened++;
    if (t.closedAt) {
      const closeWeek = getWeekLabel(t.closedAt);
      weeklyMap[closeWeek] = weeklyMap[closeWeek] || { opened: 0, closed: 0 };
      weeklyMap[closeWeek].closed++;
    }
  });
  const taskTrend = Object.entries(weeklyMap).slice(-10).map(([week, v]) => ({ week, ...v }));

  // ── Status distribution ─────────────────────────────────────────────────
  const statusDist = [
    { name: 'Pending', value: allTasks.filter(t => t.status === 'pending').length, fill: '#9ca3af' },
    { name: 'In Progress', value: allTasks.filter(t => t.status === 'in_progress').length, fill: '#2563eb' },
    { name: 'In QC', value: allTasks.filter(t => t.status === 'qc').length, fill: '#d97706' },
    { name: 'Closed', value: allTasks.filter(t => t.status === 'closed').length, fill: '#059669' },
  ].filter(s => s.value > 0);

  // ── Category performance ────────────────────────────────────────────────
  const catMap: Record<string, { closed: number; rework: number; days: number; count: number }> = {};
  allTasks.forEach(t => {
    const cat = t.category || 'General';
    catMap[cat] = catMap[cat] || { closed: 0, rework: 0, days: 0, count: 0 };
    if (t.status === 'closed') {
      catMap[cat].closed++;
      if (t.closedAt) catMap[cat].days += Math.max(1, Math.floor((t.closedAt.getTime() - t.createdAt.getTime()) / 86400000));
    }
    catMap[cat].rework += t.reworkCount;
    catMap[cat].count++;
  });
  const categoryPerf = Object.entries(catMap).map(([category, v]) => ({
    category, closed: v.closed, rework: v.rework,
    avgDays: v.closed > 0 ? Math.round(v.days / v.closed) : 0
  }));

  // ── Category Pending / Bottleneck Breakdown ─────────────────────────────
  const pendingCatMap: Record<string, { pending: number; inProgress: number; inQc: number; totalOpen: number }> = {};
  allTasks.filter(t => t.status !== 'closed').forEach(t => {
    const cat = t.category || 'SEO';
    pendingCatMap[cat] = pendingCatMap[cat] || { pending: 0, inProgress: 0, inQc: 0, totalOpen: 0 };
    if (t.status === 'pending') pendingCatMap[cat].pending++;
    else if (t.status === 'in_progress') pendingCatMap[cat].inProgress++;
    else if (t.status === 'qc') pendingCatMap[cat].inQc++;
    pendingCatMap[cat].totalOpen++;
  });
  const categoryPending = Object.entries(pendingCatMap)
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.totalOpen - a.totalOpen);

  // ── Communication frequency (last 30 days) ──────────────────────────────
  const last30 = new Date(Date.now() - 30 * 86400000);
  const commMap: Record<string, number> = {};
  account.messageLogs.filter(l => l.sentAt >= last30).forEach(l => {
    const day = new Date(l.sentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    commMap[day] = (commMap[day] || 0) + 1;
  });
  const commFreq = Object.entries(commMap).map(([date, count]) => ({ date, count }));

  // ── Per-project health ──────────────────────────────────────────────────
  const projectHealth = account.projects.map(p => {
    const closed = p.dependencies.filter(t => t.status === 'closed').length;
    const open = p.dependencies.filter(t => t.status !== 'closed').length;
    const rework = p.dependencies.reduce((s, t) => s + t.reworkCount, 0);
    const total = p.dependencies.length;
    return {
      name: p.clientName.length > 12 ? p.clientName.slice(0, 12) + '…' : p.clientName,
      open, closed, rework,
      pct: total > 0 ? Math.round((closed / total) * 100) : 0,
    };
  });

  // ── KPI totals ──────────────────────────────────────────────────────────
  const totalClosed = allTasks.filter(t => t.status === 'closed').length;
  const totalRework = allTasks.reduce((s, t) => s + t.reworkCount, 0);
  const closedWithDates = allTasks.filter(t => t.status === 'closed' && t.closedAt);
  const avgDays = closedWithDates.length > 0
    ? Math.round(closedWithDates.reduce((s, t) => s + Math.max(1, Math.floor((t.closedAt!.getTime() - t.createdAt.getTime()) / 86400000)), 0) / closedWithDates.length)
    : null;

  return (
    <PortfolioShell
      accountId={accountId}
      accountName={account.name}
      agencyLogoUrl={account.agencyLogoUrl}
      role={role}
      userName={amName}
      activeTab="analytics"
    >

      <div className="strip" style={{ marginBottom: '24px' }}>
        <div className="stats" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          <div className="stat"><span>My Projects</span><b>{account.projects.length}</b></div>
          <div className="stat"><span>Total Tasks</span><b>{allTasks.length}</b></div>
          <div className="stat"><span>Closed</span><b style={{ color: 'var(--s-done)' }}>{totalClosed}</b></div>
          <div className="stat">
            <span>Avg Days to Close</span>
            <b>{avgDays !== null ? avgDays : '–'} <small>days</small></b>
          </div>
          <div className="stat">
            <span>Total Reworks</span>
            <b style={{ color: totalRework > 0 ? 'var(--warn)' : 'inherit' }}>{totalRework}</b>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 24px 40px', maxWidth: '1200px', margin: '0 auto' }}>
        {allTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--faint)' }}>
            No tasks found for your projects yet.
          </div>
        ) : (
          <AmAnalyticsCharts
            taskTrend={taskTrend}
            statusDist={statusDist}
            categoryPerf={categoryPerf}
            categoryPending={categoryPending}
            commFreq={commFreq.length > 0 ? commFreq : [{ date: 'No data', count: 0 }]}
            projectHealth={projectHealth}
            amName={amName}
          />
        )}
      </div>
    </PortfolioShell>
  );
}
