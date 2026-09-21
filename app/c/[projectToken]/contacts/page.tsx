import React from 'react';
import { prisma } from '@/app/lib/prisma';
import { notFound } from 'next/navigation';
import ProjectShell from '@/app/components/ProjectShell';


export default async function ClientContactsPage({ params }: { params: Promise<{ projectToken: string }> }) {
  const resolvedParams = await params;
  const project = await prisma.project.findUnique({
    where: { projectToken: resolvedParams.projectToken },
    include: {
      account: true,
      clientContacts: true,
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
      activeTab="contacts"
      baseUrl={`/c/${project.projectToken}`}
      tasks={project.dependencies}
    >
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h2>Team Access</h2>
          <p className="sub2">People with access to this tracker.</p>
        </div>

        <div className="tbl">
          <div className="th cols" style={{ gridTemplateColumns: '2fr 2fr 1fr' }}>
            <div>Name</div>
            <div>Email</div>
            <div>Role</div>
          </div>
          
          {project.clientContacts.length > 0 ? (
            project.clientContacts.map(contact => (
              <div key={contact.id} className="tr cols" style={{ gridTemplateColumns: '2fr 2fr 1fr' }}>
                <div className="cell"><b>{contact.name}</b></div>
                <div className="cell">{contact.email}</div>
                <div className="cell" style={{ textTransform: 'capitalize' }}>{contact.role}</div>
              </div>
            ))
          ) : (
            <div className="empty">No client contacts added yet.</div>
          )}
        </div>
      </div>
    </ProjectShell>
  );
}
