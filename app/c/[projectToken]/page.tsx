import React from 'react';
import { prisma } from '@/app/lib/prisma';
import { notFound } from 'next/navigation';
import ProjectShell from '@/app/components/ProjectShell';
import TaskTable from '@/app/components/TaskTable';
import TimelineView from '@/app/components/TimelineView';
import { executeTaskAction } from '@/app/actions/taskActions';

export default async function ClientProjectPage({ params }: { params: Promise<{ projectToken: string }> }) {
  const resolvedParams = await params;
  const project = await prisma.project.findUnique({
    where: { projectToken: resolvedParams.projectToken },
    include: { account: true, dependencies: true },
  });

  if (!project) notFound();

  const tasks = project.dependencies;

  const avgTimeToClose = (() => {
    const closed = tasks.filter(t => t.status === 'closed' && t.closedAt);
    if (!closed.length) return 0;
    const total = closed.reduce((s, t) => s + Math.max(1, Math.floor((t.closedAt!.getTime() - t.createdAt.getTime()) / 86400000)), 0);
    return Math.round(total / closed.length);
  })();

  return (
    <ProjectShell
      integrationsConfig={project.integrationsConfig}
      clientName={project.clientName}
      projectName={project.name}
      agencyName={project.account.name}
      agencyLogoUrl={project.account.agencyLogoUrl}
      clientLogoUrl={project.clientLogoUrl}
      primaryColor={project.primaryColor}
      role="client"
      activeTab="tasks"
      baseUrl={`/c/${project.projectToken}`}
      tasks={tasks}
      avgTimeToCloseDays={avgTimeToClose}
    >
      {tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🚀</div>
          <h2 style={{ marginBottom: '8px' }}>No tasks yet</h2>
          <p style={{ color: 'var(--faint)', fontSize: '14px', maxWidth: '360px', margin: '0 auto' }}>
            Your agency will add tasks here that need your attention. Check back soon!
          </p>
        </div>
      ) : (
        <>
          <div style={{ padding: '0 24px 24px' }}>
            <TimelineView tasks={tasks} />
          </div>
          <TaskTable
            tasks={tasks}
            role="client"
            clientName={project.clientName}
            agencyName={project.account.name}
            onAction={executeTaskAction}
          />
        </>
      )}
    </ProjectShell>
  );
}