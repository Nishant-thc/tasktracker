import React from 'react';
import { prisma } from '@/app/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/app/lib/session';
import ThemeToggle from '@/app/components/ThemeToggle';
import RoleSwitcher from '@/app/components/RoleSwitcher';
import AdminIntegrations from './AdminIntegrations';
import AmAssigner from './AmAssigner';
import InviteAmModal from './InviteAmModal';
import NewProjectModal from '../NewProjectModal';

export default async function AdminDashboard({ params }: { params: Promise<{ accountId: string }> }) {
  const resolvedParams = await params;
  const session = await getSession();
  const role = session?.role || 'admin';
  const userId = session?.id || null;

  // ACCESS CONTROL: Only Admins can access this page
  if (role !== 'admin') {
    redirect(`/a/${resolvedParams.accountId}`);
  }

  const account = await prisma.account.findUnique({
    where: { id: resolvedParams.accountId },
    include: {
      projects: {
        include: {
          dependencies: true,
          accountManager: true
        },
        orderBy: { createdAt: 'desc' }
      },
      inviteTokens: {
        where: { usedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!account) notFound();

  const users = await prisma.user.findMany({
    where: { memberships: { some: { accountId: account.id } } },
    include: { memberships: { where: { accountId: account.id } } }
  });

  const amUsers = users.filter(u => {
    const mem = u.memberships.find(m => m.accountId === account.id);
    return mem?.role === 'am';
  });

  const commConfig = account.communicationConfig ? JSON.parse(account.communicationConfig) : {};
  const totalProjects = account.projects.length;
  let unassignedProjects = 0;
  let projectsAtRisk = 0;
  const now = Date.now();

  const amStats: Record<string, { name: string; email: string; active: number; awaitingQc: number; overdue: number }> = {};
  amUsers.forEach(u => {
    amStats[u.id] = { name: u.name || 'Unknown', email: u.email, active: 0, awaitingQc: 0, overdue: 0 };
  });

  account.projects.forEach(project => {
    if (!project.accountManagerId) unassignedProjects++;

    let isAtRisk = false;
    let pOverdue = 0;
    let pQc = 0;

    project.dependencies.forEach(t => {
      if (t.status === 'qc') pQc++;
      if (t.status !== 'closed' && t.dueDate && t.dueDate.getTime() < now) {
        isAtRisk = true;
        pOverdue++;
      }
    });

    if (isAtRisk) projectsAtRisk++;

    if (project.accountManagerId && amStats[project.accountManagerId]) {
      amStats[project.accountManagerId].active++;
      amStats[project.accountManagerId].awaitingQc += pQc;
      amStats[project.accountManagerId].overdue += pOverdue;
    }
  });

  const CATEGORY_COLORS: Record<string, string> = {
    SEO: '#7c3aed', PPC: '#2563eb', Content: '#059669', CRO: '#d97706',
    Social: '#0891b2', Email: '#db2777', Tech: '#374151', Other: '#9ca3af',
  };

  return (
    <>
      <header className="top">
        <div className="crumbs">
          {account.agencyLogoUrl ? (
            <img src={account.agencyLogoUrl} alt={account.name} className="logo" style={{ objectFit: 'cover' }} />
          ) : (
            <span className="logo">{account.name.charAt(0)}</span>
          )}
          <Link href={`/a/${account.id}`}>{account.name}</Link>
          <span>/</span>
          <b>Admin Control Panel</b>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="wait">Admin View</span>
          <RoleSwitcher users={users.map(u => ({ ...u, role: u.memberships[0]?.role || 'am' }))} currentUserId={userId} />
          <ThemeToggle />
        </div>
      </header>

      {/* Sub-nav tabs for Admin */}
      <div className="tabs" style={{ marginTop: '14px' }}>
        <Link href={`/a/${account.id}/admin`} className="on" style={{ textDecoration: 'none' }}>
          <button className="on">Overview</button>
        </Link>
        <Link href={`/a/${account.id}/admin/analytics`} style={{ textDecoration: 'none' }}>
          <button>Analytics</button>
        </Link>
        <Link href={`/a/${account.id}/admin/comms`} style={{ textDecoration: 'none' }}>
          <button>Comms Log</button>
        </Link>
        <Link href={`/a/${account.id}`} style={{ textDecoration: 'none' }}>
          <button>← Portfolio</button>
        </Link>
      </div>

      {/* Integrations header */}
      <div className="ph" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '24px' }}>
        <div>
          <h1>Global Integrations</h1>
          <p>Connect agency-wide communication channels used for AM and client notifications.</p>
        </div>
        <AdminIntegrations accountId={account.id} initialConfig={commConfig} />
      </div>

      {/* KPI strip */}
      <div className="strip">
        <div className="stats" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          <div className="stat"><span>Total Projects</span><b>{totalProjects}</b></div>
          <div className="stat">
            <span>Unassigned</span>
            <b style={{ color: unassignedProjects > 0 ? 'var(--warn)' : 'inherit' }}>{unassignedProjects}</b>
          </div>
          <div className="stat">
            <span>At Risk</span>
            <b style={{ color: projectsAtRisk > 0 ? 'var(--hi)' : 'inherit' }}>{projectsAtRisk}</b>
          </div>
          <div className="stat"><span>Team Members</span><b>{users.length}</b></div>
          <div className="stat"><span>Pending Invites</span><b>{account.inviteTokens.length}</b></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>

        {/* AM Workloads */}
        <div className="panel" style={{ padding: '0' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>Team Workloads</h3>
            <InviteAmModal accountId={account.id} />
          </div>
          <table className="gt">
            <thead>
              <tr>
                <th>Account Manager</th>
                <th className="n">Projects</th>
                <th className="n">In QC</th>
                <th className="n" style={{ color: 'var(--hi)' }}>Overdue</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(amStats).map(st => (
                <tr key={st.name}>
                  <td>
                    <b>{st.name}</b>
                    <div className="sub">{st.email}</div>
                  </td>
                  <td className="n">{st.active}</td>
                  <td className="n">{st.awaitingQc}</td>
                  <td className="n" style={{ color: st.overdue > 0 ? 'var(--hi)' : 'inherit' }}>{st.overdue}</td>
                </tr>
              ))}
              {Object.values(amStats).length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--faint)' }}>
                  Invite your first Account Manager using the button above.
                </td></tr>
              )}
            </tbody>
          </table>
          {account.inviteTokens.length > 0 && (
            <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', fontSize: '13px', color: 'var(--faint)' }}>
              {account.inviteTokens.length} pending invite{account.inviteTokens.length !== 1 ? 's' : ''}:
              {account.inviteTokens.map(inv => (
                <span key={inv.id} style={{ marginLeft: '8px', background: 'var(--bg)', padding: '2px 8px', borderRadius: '4px' }}>
                  {inv.email} ({inv.role})
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Project Assignment */}
        <div className="panel" style={{ padding: '0' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>Project Assignment</h3>
            <NewProjectModal accountId={account.id} accountManagers={amUsers} />
          </div>
          <table className="gt">
            <thead>
              <tr>
                <th>Project</th>
                <th>Category</th>
                <th>Assign To</th>
              </tr>
            </thead>
            <tbody>
              {account.projects.map(p => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/a/${account.id}/p/${p.id}`} className="lnk">{p.clientName}</Link>
                    <div className="sub">{p.name}</div>
                  </td>
                  <td>
                    {p.category && (
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: '99px',
                        fontSize: '11px', fontWeight: 600,
                        background: `${CATEGORY_COLORS[p.category] || '#9ca3af'}22`,
                        color: CATEGORY_COLORS[p.category] || '#9ca3af',
                      }}>{p.category}</span>
                    )}
                    {!p.category && <span style={{ color: 'var(--faint)', fontSize: '12px' }}>–</span>}
                  </td>
                  <td>
                    <AmAssigner projectId={p.id} currentAmId={p.accountManagerId} users={amUsers.map(u => ({ id: u.id, name: u.name || u.email }))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
