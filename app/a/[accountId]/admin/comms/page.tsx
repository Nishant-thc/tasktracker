import React from 'react';
import { prisma } from '@/app/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/app/lib/session';
import CommsFilters from './CommsFilters';

const CHANNEL_ICONS: Record<string, string> = {
  email: '✉️',
  slack: '💬',
  whatsapp: '📱',
  system: '⚙️',
  in_app: '🔔',
};

const DIRECTION_STYLE: Record<string, string> = {
  outbound: 'var(--s-prog)',
  inbound: 'var(--s-done)',
  system: 'var(--faint)',
};

export default async function CommsLogPage({
  params,
  searchParams,
}: {
  params: Promise<{ accountId: string }>;
  searchParams: Promise<{ projectId?: string; channel?: string; days?: string }>;
}) {
  const { accountId } = await params;
  const { projectId, channel, days = '30' } = await searchParams;
  const session = await getSession();

  if (!session || session.role !== 'admin') {
    redirect('/auth/login');
  }

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: { projects: { select: { id: true, clientName: true, name: true } } }
  });
  if (!account) notFound();

  const since = new Date(Date.now() - parseInt(days) * 86400000);

  const logs = await prisma.messageLog.findMany({
    where: {
      accountId,
      ...(projectId ? { projectId } : {}),
      ...(channel ? { channel } : {}),
      sentAt: { gte: since },
    },
    include: { project: { select: { clientName: true, name: true } } },
    orderBy: { sentAt: 'desc' },
    take: 200,
  });

  return (
    <>
      <div className="ph" style={{ paddingBottom: '16px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px' }}>Communication Log</h1>
          <p style={{ margin: 0 }}>
            <Link href={`/a/${accountId}/admin`} style={{ color: 'var(--faint)' }}>← Admin Panel</Link>
            {' '}· All messages, status changes, and notifications across all projects
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: '0 24px 20px', display: 'flex', gap: '12px', flexWrap: 'wrap', maxWidth: '1200px', margin: '0 auto' }}>
        <CommsFilters 
          projects={account.projects} 
          defaultProjectId={projectId || ''} 
          defaultChannel={channel || ''} 
          defaultDays={days} 
        />
        <span style={{ color: 'var(--faint)', alignSelf: 'center', fontSize: '13px' }}>
          {logs.length} event{logs.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ padding: '0 24px', maxWidth: '1200px', margin: '0 auto' }}>
        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--faint)' }}>
            No communications found for this period.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {logs.map(log => (
              <div key={log.id} className="panel" style={{
                padding: '14px 20px',
                borderLeft: `3px solid ${DIRECTION_STYLE[log.direction]}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '16px' }}>{CHANNEL_ICONS[log.channel] || '📨'}</span>
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>{log.fromName}</span>
                      <span style={{ color: 'var(--faint)', fontSize: '13px' }}>→ {log.toName}</span>
                      {log.subject && (
                        <span style={{ color: 'var(--faint)', fontSize: '13px' }}>· {log.subject}</span>
                      )}
                    </div>
                    <p style={{ margin: '0', fontSize: '14px', color: 'var(--ink)', lineHeight: 1.5 }}>{log.body}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '12px', color: 'var(--faint)' }}>
                      {new Date(log.sentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--faint)' }}>
                      {new Date(log.sentAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      <Link href={`/a/${accountId}/p/${log.projectId}`} style={{ fontSize: '11px', color: 'var(--hi)', textDecoration: 'none' }}>
                        {log.project.clientName}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
