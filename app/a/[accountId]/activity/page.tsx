import React from 'react';
import { prisma } from '@/app/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import PortfolioShell from '@/app/components/PortfolioShell';
import { getSession } from '@/app/lib/session';

export default async function AgencyActivityPage({ params }: { params: Promise<{ accountId: string }> }) {
  const resolvedParams = await params;
  const session = await getSession();
  const role = session?.role || 'admin';
  const userId = session?.id || null;

  const account = await prisma.account.findUnique({
    where: { id: resolvedParams.accountId },
    include: {
      projects: {
        where: role === 'am' && userId ? { accountManagerId: userId } : {},
        include: { dependencies: true },
      },
    },
  });

  if (!account) notFound();

  type ActivityEvent = {
    time: number;
    type: 'created' | 'started' | 'qc' | 'closed';
    taskId: string;
    taskTitle: string;
    projectId: string;
    clientName: string;
  };

  const events: ActivityEvent[] = [];

  account.projects.forEach(project => {
    project.dependencies.forEach(t => {
      events.push({ time: t.createdAt.getTime(), type: 'created', taskId: t.id, taskTitle: t.title, projectId: project.id, clientName: project.clientName });
      if (t.startedAt) events.push({ time: t.startedAt.getTime(), type: 'started', taskId: t.id, taskTitle: t.title, projectId: project.id, clientName: project.clientName });
      if (t.qcAt) events.push({ time: t.qcAt.getTime(), type: 'qc', taskId: t.id, taskTitle: t.title, projectId: project.id, clientName: project.clientName });
      if (t.closedAt) events.push({ time: t.closedAt.getTime(), type: 'closed', taskId: t.id, taskTitle: t.title, projectId: project.id, clientName: project.clientName });
    });
  });

  events.sort((a, b) => b.time - a.time);

  const todayStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const yesterdayStr = new Date(Date.now() - 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const groupedEvents: { dateStr: string; isNew: boolean; events: ActivityEvent[] }[] = [];
  events.forEach(ev => {
    const evDateStr = new Date(ev.time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    let displayDateStr = evDateStr;
    let isNew = false;
    if (evDateStr === todayStr) { displayDateStr = 'Today'; isNew = true; }
    else if (evDateStr === yesterdayStr) { displayDateStr = 'Yesterday'; }
    let group = groupedEvents.find(g => g.dateStr === displayDateStr);
    if (!group) { group = { dateStr: displayDateStr, isNew, events: [] }; groupedEvents.push(group); }
    group.events.push(ev);
  });

  const hasNewActivity = groupedEvents.length > 0 && groupedEvents[0].isNew;

  const getEventText = (type: string) => {
    switch (type) {
      case 'created': return 'was added as a dependency';
      case 'started': return 'was moved to in progress';
      case 'qc': return 'was submitted for QC';
      case 'closed': return 'was closed';
      default: return 'was updated';
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'created': return 'var(--s-pend)';
      case 'started': return 'var(--s-prog)';
      case 'qc': return 'var(--s-qc)';
      case 'closed': return 'var(--s-done)';
      default: return 'var(--faint)';
    }
  };

  return (
    <PortfolioShell
      accountId={account.id}
      accountName={account.name}
      agencyLogoUrl={account.agencyLogoUrl}
      role={role}
      activeTab="activity"
      hasNewActivity={hasNewActivity}
    >
      <div className="ph">
        <div>
          <h1>Activity Feed</h1>
          <p>Chronological log across all {account.projects.length} projects</p>
        </div>
      </div>

      <div className="panel" style={{ padding: '0', overflow: 'hidden' }}>
        {groupedEvents.length > 0 ? (
          groupedEvents.map((group) => (
            <div key={group.dateStr}>
              <div style={{ padding: '12px 24px', backgroundColor: 'var(--wash)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--dim)' }}>{group.dateStr}</h3>
                {group.isNew && <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', backgroundColor: 'var(--s-prog)', color: '#fff', padding: '2px 7px', borderRadius: '4px' }}>New</span>}
              </div>
              <div className="tblwrap" style={{ marginBottom: 0 }}>
                <table className="gt" style={{ borderTop: 'none' }}>
                  <tbody>
                    {group.events.map((ev, i) => (
                      <tr key={`${ev.taskId}-${ev.type}-${i}`}>
                        <td style={{ width: '36px', textAlign: 'center' }}>
                          <i style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: getEventColor(ev.type) }}></i>
                        </td>
                        <td style={{ width: '22%' }}>
                          <Link href={`/a/${account.id}/p/${ev.projectId}`} className="lnk">{ev.clientName}</Link>
                        </td>
                        <td>
                          <b style={{ color: 'var(--ink)' }}>{ev.taskTitle}</b>{' '}
                          <span style={{ color: 'var(--faint)' }}>{getEventText(ev.type)}</span>
                        </td>
                        <td style={{ color: 'var(--faint)', textAlign: 'right', width: '90px', fontSize: '12px' }}>
                          {new Date(ev.time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        ) : (
          <div className="empty" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
            <p style={{ fontWeight: 600, marginBottom: '6px' }}>No activity yet</p>
            <p style={{ color: 'var(--faint)', fontSize: '13px' }}>Events will appear here as tasks are created and updated.</p>
          </div>
        )}
      </div>
    </PortfolioShell>
  );
}