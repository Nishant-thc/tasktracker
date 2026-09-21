import React from 'react';
import { prisma } from '@/app/lib/prisma';
import { notFound } from 'next/navigation';
import ProjectShell from '@/app/components/ProjectShell';
import ImpactView from '@/app/components/ImpactView';
import TimelineView from '@/app/components/TimelineView';


export default async function ClientImpactPage({ params }: { params: Promise<{ projectToken: string }> }) {
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
      activeTab="impact"
      baseUrl={`/c/${project.projectToken}`}
      tasks={project.dependencies}
    >
      <div style={{ padding: '0 24px 24px' }}>
        <TimelineView tasks={project.dependencies} />
      </div>
      <div style={{ padding: '0 24px 24px' }}>
        <ImpactView 
          projectId={project.id}
          tasks={project.dependencies} 
          role="client"
          customMetricsJson={project.customMetrics}
        />
      </div>
    </ProjectShell>
  );
}
