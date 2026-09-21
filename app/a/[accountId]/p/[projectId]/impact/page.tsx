import React from 'react';
import { prisma } from '@/app/lib/prisma';
import { notFound } from 'next/navigation';
import ProjectShell from '@/app/components/ProjectShell';
import ImpactView from '@/app/components/ImpactView';
import TimelineView from '@/app/components/TimelineView';


export default async function AgencyImpactPage({ params }: { params: Promise<{ accountId: string, projectId: string }> }) {
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
      activeTab="impact"
      baseUrl={`/a/${resolvedParams.accountId}/p/${project.id}`}
      tasks={project.dependencies}
      projectToken={project.projectToken}
    >
      <div style={{ padding: '0 24px 24px' }}>
        <TimelineView tasks={project.dependencies} />
      </div>
      <div style={{ padding: '0 24px 24px' }}>
        <ImpactView 
          projectId={project.id}
          tasks={project.dependencies} 
          role="agency" 
          customMetricsJson={project.customMetrics}
        />
      </div>
    </ProjectShell>
  );
}
