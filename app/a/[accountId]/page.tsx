import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/app/lib/prisma';
import { getSession } from '@/app/lib/session';
import PortfolioShell from '@/app/components/PortfolioShell';
import NewProjectModal from './NewProjectModal';

export default async function AgencyPortfolioPage({ params }: { params: Promise<{ accountId: string }> }) {
  const resolvedParams = await params;
  let account = await prisma.account.findUnique({
    where: { id: resolvedParams.accountId },
    include: {
      projects: {
        include: {
          dependencies: true,
        },
      },
    },
  });

  if (!account) {
    account = await prisma.account.findFirst({
      include: {
        projects: {
          include: {
            dependencies: true,
          },
        },
      },
    });
  }

  if (!account) notFound();

  const session = await getSession();
  // Allow access if session matches OR default to admin for legacy access
  const role = session?.role || 'admin';
  const userId = session?.id || null;

  const users = await prisma.user.findMany({
    where: { memberships: { some: { accountId: account.id } } },
    include: { memberships: { where: { accountId: account.id } } }
  });

  const amUsers = users
    .filter(u => u.memberships.some(m => m.accountId === account.id && (m.role === 'am' || m.role === 'admin' || m.role === 'owner')))
    .map(u => ({ id: u.id, name: u.name }));

  if (userId && !amUsers.some(u => u.id === userId)) {
    amUsers.push({ id: userId, name: session?.name || 'Account Manager' });
  }

  const displayProjects = account.projects;

  let totalProjects = displayProjects.length;
  let totalOpenWithClients = 0;
  let totalAwaitingQc = 0;
  let totalPastNeededBy = 0;
  let projectsAtRisk = 0;
  let allClosedTasksCount = 0;
  let allClosedTasksDays = 0;

  const now = Date.now();

  displayProjects.forEach(project => {
    let projectAtRisk = false;
    project.dependencies.forEach(t => {
      if (t.status === 'pending' || t.status === 'in_progress') totalOpenWithClients++;
      if (t.status === 'qc') totalAwaitingQc++;
      if (t.status === 'closed' && t.closedAt) {
        allClosedTasksCount++;
        allClosedTasksDays += Math.max(1, Math.floor((t.closedAt.getTime() - t.createdAt.getTime()) / 86400000));
      }
      if (t.status !== 'closed' && t.dueDate && t.dueDate.getTime() < now) {
        projectAtRisk = true;
      }
    });
    if (projectAtRisk) projectsAtRisk++;
  });

  let hasNewActivity = false;
  const todayStr = new Date().toLocaleDateString('en-GB');

  displayProjects.forEach(p => {
    p.dependencies.forEach(t => {
      if (!hasNewActivity) {
         const d1 = new Date(t.createdAt).toLocaleDateString('en-GB');
         const d2 = t.startedAt ? new Date(t.startedAt).toLocaleDateString('en-GB') : null;
         const d3 = t.qcAt ? new Date(t.qcAt).toLocaleDateString('en-GB') : null;
         const d4 = t.closedAt ? new Date(t.closedAt).toLocaleDateString('en-GB') : null;
         if (d1 === todayStr || d2 === todayStr || d3 === todayStr || d4 === todayStr) {
           hasNewActivity = true;
         }
      }
    });
  });

  const totalAvgTimeToClose = allClosedTasksCount > 0 ? Math.round(allClosedTasksDays / allClosedTasksCount) : null;

  return (
    <PortfolioShell
      accountId={account.id}
      accountName={account.name}
      agencyLogoUrl={account.agencyLogoUrl}
      role={role}
      activeTab="projects"
      hasNewActivity={hasNewActivity}
    >


      <div className="ph">
        <div>
          <h1>Portfolio</h1>
          <p>Account {account.accountNumber} &bull; {totalProjects} projects</p>
        </div>
        <div className="acts">
          <NewProjectModal accountId={account.id} accountManagers={amUsers} currentUserId={userId} />
        </div>
      </div>

      <div className="strip">
        <div className="stats" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
          <div className="stat">
            <span>Projects</span>
            <b>{totalProjects}</b>
          </div>
          <div className="stat">
            <span>Open with clients</span>
            <b>{totalOpenWithClients}</b>
          </div>
          <div className="stat">
            <span>Awaiting your QC</span>
            <b>{totalAwaitingQc}</b>
          </div>
          <div className="stat">
            <span>Projects at risk</span>
            <b>{projectsAtRisk}</b>
          </div>
          <div className="stat">
            <span>Avg Time to Close</span>
            <b>{totalAvgTimeToClose !== null ? (totalAvgTimeToClose > 0 ? totalAvgTimeToClose : '< 1') : '-'} <small>days</small></b>
          </div>
        </div>
      </div>

      <div style={{ padding: '0' }} className="panel">
        <div className="tblwrap">
          <table className="gt">
            <thead>
              <tr>
                <th>Project</th>
                <th>Health</th>
                <th className="n">With client</th>
                <th className="n">Awaiting QC</th>
                <th className="n">Oldest</th>
                <th>Progress</th>
                <th>Last activity</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {displayProjects.map((project) => {
                let m_cl = 0;
                let m_qc = 0;
                let m_overdue = 0;
                let m_oldest = 0;
                let m_done = 0;
                let m_total = project.dependencies.length;
                let lastAct = 0;

                project.dependencies.forEach(t => {
                  if (t.status === 'pending' || t.status === 'in_progress') m_cl++;
                  if (t.status === 'qc') m_qc++;
                  if (t.status === 'closed') m_done++;
                  if (t.status !== 'closed' && t.dueDate && t.dueDate.getTime() < now) m_overdue++;
                  if (t.status !== 'closed') {
                    const days = Math.floor((now - t.createdAt.getTime()) / 86400000);
                    if (days > m_oldest) m_oldest = days;
                  }
                  
                  const tact = Math.max(
                    t.createdAt.getTime(),
                    t.startedAt?.getTime() || 0,
                    t.qcAt?.getTime() || 0,
                    t.closedAt?.getTime() || 0
                  );
                  if (tact > lastAct) lastAct = tact;
                });

                const pct = m_total ? m_done / m_total : 0;
                const atRisk = m_overdue > 0 || m_oldest >= 14;
                const hl = atRisk ? { c: '--hi', l: 'At risk' } : { c: '--s-done', l: 'On track' };
                const lastFmt = lastAct ? new Date(lastAct).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'None';

                return (
                  <tr key={project.id}>
                    <td>
                      <Link href={`/a/${account.id}/p/${project.id}`} className="lnk">
                        {project.clientName}
                      </Link>
                      <div className="sub">{project.name}, {project.type}</div>
                    </td>
                    <td>
                      <span className="health">
                        <i style={{ background: `var(${hl.c})` }}></i>
                        {hl.l}
                      </span>
                    </td>
                    <td className="n">{m_cl}</td>
                    <td className="n">{m_qc}</td>
                    <td className="n" style={{ color: m_oldest >= 14 ? 'var(--hi)' : 'inherit' }}>{m_oldest}d</td>
                    <td>
                      <span className="pbar">
                        <i style={{ width: `${Math.round(pct * 100)}%` }}></i>
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--faint)', marginLeft: '6px' }}>
                        {Math.round(pct * 100)}%
                      </span>
                    </td>
                    <td style={{ color: 'var(--faint)' }}>{lastFmt}</td>
                    <td className="n">
                      <Link href={`/a/${account.id}/p/${project.id}`} className="btn ghost sm" style={{ textDecoration: 'none' }}>
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </PortfolioShell>
  );
}
