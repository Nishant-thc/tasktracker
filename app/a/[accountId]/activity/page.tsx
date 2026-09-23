import React from 'react';
import { prisma } from '@/app/lib/prisma';
import { notFound } from 'next/navigation';
import PortfolioShell from '@/app/components/PortfolioShell';
import { getSession } from '@/app/lib/session';
import ActivityFeedClient, { ActivityEvent } from '@/app/components/ActivityFeedClient';

export default async function AgencyActivityPage({ params }: { params: Promise<{ accountId: string }> }) {
  const resolvedParams = await params;
  const session = await getSession();
  const role = session?.role || 'admin';
  const userId = session?.id || null;

  const account = await prisma.account.findUnique({
    where: { id: resolvedParams.accountId },
    include: {
      projects: {
        include: { dependencies: true },
      },
    },
  });

  if (!account) notFound();

  const events: ActivityEvent[] = [];

  account.projects.forEach(project => {
    project.dependencies.forEach(t => {
      events.push({ time: t.createdAt.getTime(), type: 'created', taskId: t.id, taskTitle: t.title, projectId: project.id, clientName: project.clientName });
      if (t.startedAt) events.push({ time: t.startedAt.getTime(), type: 'started', taskId: t.id, taskTitle: t.title, projectId: project.id, clientName: project.clientName });
      if (t.qcAt) events.push({ time: t.qcAt.getTime(), type: 'qc', taskId: t.id, taskTitle: t.title, projectId: project.id, clientName: project.clientName });
      if (t.closedAt) events.push({ time: t.closedAt.getTime(), type: 'closed', taskId: t.id, taskTitle: t.title, projectId: project.id, clientName: project.clientName });
    });
  });

  events.sort((a, b) => b.time - a.time);

  const todayStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const hasNewActivity = events.some(ev => new Date(ev.time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) === todayStr);

  return (
    <PortfolioShell
      accountId={account.id}
      accountName={account.name}
      agencyLogoUrl={account.agencyLogoUrl}
      role={role}
      activeTab="activity"
      hasNewActivity={hasNewActivity}
    >
      <ActivityFeedClient
        events={events}
        accountId={account.id}
        projectCount={account.projects.length}
      />
    </PortfolioShell>
  );
}