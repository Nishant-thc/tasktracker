import React from 'react';
import { prisma } from '@/app/lib/prisma';
import { notFound } from 'next/navigation';
import ProjectShell from '@/app/components/ProjectShell';
import ReportsView from '@/app/components/ReportsView';


export default async function AgencyReportsPage({ params }: { params: Promise<{ accountId: string, projectId: string }> }) {
  const resolvedParams = await params;
  const project = await prisma.project.findUnique({
    where: { id: resolvedParams.projectId },
    include: {
      account: true,
      dependencies: true,
    },
  });

  if (!project || project.accountId !== resolvedParams.accountId) {
    notFound();
  }

  return (
    <ProjectShell
      integrationsConfig={project.integrationsConfig}
      clientName={project.clientName}
      projectName={project.name}
      agencyName={project.account.name}
      agencyLogoUrl={project.account.agencyLogoUrl}
      clientLogoUrl={project.clientLogoUrl}
      primaryColor={project.primaryColor}
      role="agency"
      activeTab="reports"
      baseUrl={`/a/${resolvedParams.accountId}/p/${project.id}`}
      tasks={project.dependencies}
      projectToken={project.projectToken}
    >
      <div style={{ padding: '24px' }}>
        <ReportsView tasks={project.dependencies} role="agency" clientName={project.clientName} agencyName={project.account.name} baseUrl={`/a/${resolvedParams.accountId}/p/${project.id}`} />
      </div>
    </ProjectShell>
  );
}
