import React from 'react';
import { prisma } from '@/app/lib/prisma';
import { notFound } from 'next/navigation';
import ProjectShell from '@/app/components/ProjectShell';
import InviteContactButton from '@/app/components/InviteContactButton';


export default async function AgencyContactsPage({ params }: { params: Promise<{ accountId: string, projectId: string }> }) {
  const resolvedParams = await params;
  const project = await prisma.project.findUnique({
    where: { id: resolvedParams.projectId },
    include: {
      account: true,
      clientContacts: true,
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
      activeTab="contacts"
      baseUrl={`/a/${resolvedParams.accountId}/p/${project.id}`}
      tasks={project.dependencies}
      projectToken={project.projectToken}
    >
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2>Client Contacts</h2>
          <InviteContactButton projectId={project.id} projectToken={project.projectToken} />
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
