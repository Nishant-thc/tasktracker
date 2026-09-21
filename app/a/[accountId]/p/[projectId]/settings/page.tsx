import React from 'react';
import { prisma } from '@/app/lib/prisma';
import { notFound } from 'next/navigation';
import ProjectShell from '@/app/components/ProjectShell';
import SettingsView from '@/app/components/SettingsView';


export default async function AgencyIntegrationsPage({ params }: { params: Promise<{ accountId: string, projectId: string }> }) {
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
      role="agency"
      activeTab="settings"
      baseUrl={`/a/${resolvedParams.accountId}/p/${project.id}`}
      tasks={project.dependencies}
      projectToken={project.projectToken}
      primaryColor={project.primaryColor}
    >
      <div style={{ padding: '24px' }}>
        <SettingsView 
          projectId={project.id} 
          initialConfig={project.integrationsConfig} 
          initialColor={project.primaryColor}
          initialClientLogo={project.clientLogoUrl}
          initialAgencyLogo={project.account.agencyLogoUrl}
        />
      </div>
    </ProjectShell>
  );
}
