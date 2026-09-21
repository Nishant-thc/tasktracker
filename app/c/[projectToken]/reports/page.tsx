import React from 'react';
import { prisma } from '@/app/lib/prisma';
import { notFound } from 'next/navigation';
import ProjectShell from '@/app/components/ProjectShell';
import ReportsView from '@/app/components/ReportsView';


export default async function ClientReportsPage({ params }: { params: Promise<{ projectToken: string }> }) {
  const resolvedParams = await params;
  const project = await prisma.project.findUnique({
    where: { projectToken: resolvedParams.projectToken },
    include: {
      account: true,
      dependencies: true,
    },
  });

  if (!project) {
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
      role="client"
      activeTab="reports"
      baseUrl={`/c/${project.projectToken}`}
      tasks={project.dependencies}
    >
      <div style={{ padding: '24px' }}>
        <ReportsView tasks={project.dependencies} role="client" clientName={project.clientName} agencyName={project.account.name} baseUrl={`/c/${project.projectToken}`} />
      </div>
    </ProjectShell>
  );
}
