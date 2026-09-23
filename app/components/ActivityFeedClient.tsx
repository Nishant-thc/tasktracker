'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export type ActivityEvent = {
  time: number;
  type: 'created' | 'started' | 'qc' | 'closed';
  taskId: string;
  taskTitle: string;
  projectId: string;
  clientName: string;
};

interface GroupedEvents {
  dateStr: string;
  isNew: boolean;
  events: ActivityEvent[];
}

export default function ActivityFeedClient({
  events,
  accountId,
  projectCount,
}: {
  events: ActivityEvent[];
  accountId: string;
  projectCount: number;
}) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'started' | 'qc'>('all');

  const filteredEvents = events.filter((ev) => {
    if (activeFilter === 'started') return ev.type === 'started';
    if (activeFilter === 'qc') return ev.type === 'qc';
    return true;
  });

  const todayStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const yesterdayStr = new Date(Date.now() - 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const groupedEvents: GroupedEvents[] = [];
  filteredEvents.forEach(ev => {
    const evDateStr = new Date(ev.time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    let displayDateStr = evDateStr;
    let isNew = false;
    if (evDateStr === todayStr) { displayDateStr = 'Today'; isNew = true; }
    else if (evDateStr === yesterdayStr) { displayDateStr = 'Yesterday'; }
    let group = groupedEvents.find(g => g.dateStr === displayDateStr);
    if (!group) { group = { dateStr: displayDateStr, isNew, events: [] }; groupedEvents.push(group); }
    group.events.push(ev);
  });

  const totalCount = events.length;
  const inProgressCount = events.filter(e => e.type === 'started').length;
  const qcPendingCount = events.filter(e => e.type === 'qc').length;

  const getEventText = (type: string) => {
    switch (type) {
      case 'created': return 'was logged as a new task dependency';
      case 'started': return 'entered active execution / implementation';
      case 'qc': return 'submitted for Quality Control (QC) review';
      case 'closed': return 'completed and verified successfully';
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
    <div>
      {/* Header section with enhanced UX titles */}
      <div className="ph" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--ink)', margin: '0 0 6px 0' }}>
            Portfolio Operations & Activity Control
          </h1>
          <p style={{ margin: 0, color: 'var(--faint)', fontSize: '14px' }}>
            Live cross-project timeline monitoring tasks, execution progress, and client deliverables across {projectCount} accounts
          </p>
        </div>

        {/* 3 Toggle filter buttons */}
        <div style={{ display: 'inline-flex', gap: '6px', background: 'var(--wash)', padding: '4px', borderRadius: '10px', border: '1px solid var(--line)' }}>
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            style={{
              padding: '8px 14px',
              borderRadius: '7px',
              border: 'none',
              fontSize: '13px',
              fontWeight: activeFilter === 'all' ? 600 : 500,
              background: activeFilter === 'all' ? '#fff' : 'transparent',
              color: activeFilter === 'all' ? 'var(--ink)' : 'var(--faint)',
              boxShadow: activeFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>⚡ All Notifications</span>
            <span style={{ fontSize: '11px', background: activeFilter === 'all' ? 'var(--line)' : 'rgba(0,0,0,0.05)', padding: '1px 6px', borderRadius: '10px' }}>{totalCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('started')}
            style={{
              padding: '8px 14px',
              borderRadius: '7px',
              border: 'none',
              fontSize: '13px',
              fontWeight: activeFilter === 'started' ? 600 : 500,
              background: activeFilter === 'started' ? '#fff' : 'transparent',
              color: activeFilter === 'started' ? 'var(--s-prog)' : 'var(--faint)',
              boxShadow: activeFilter === 'started' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>⚙️ Implementation in Progress</span>
            <span style={{ fontSize: '11px', background: activeFilter === 'started' ? 'rgba(59,130,246,0.15)' : 'rgba(0,0,0,0.05)', color: activeFilter === 'started' ? 'var(--s-prog)' : 'inherit', padding: '1px 6px', borderRadius: '10px' }}>{inProgressCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('qc')}
            style={{
              padding: '8px 14px',
              borderRadius: '7px',
              border: 'none',
              fontSize: '13px',
              fontWeight: activeFilter === 'qc' ? 600 : 500,
              background: activeFilter === 'qc' ? '#fff' : 'transparent',
              color: activeFilter === 'qc' ? 'var(--s-qc)' : 'var(--faint)',
              boxShadow: activeFilter === 'qc' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>🔍 QC Pending Review</span>
            <span style={{ fontSize: '11px', background: activeFilter === 'qc' ? 'rgba(245,158,11,0.15)' : 'rgba(0,0,0,0.05)', color: activeFilter === 'qc' ? 'var(--s-qc)' : 'inherit', padding: '1px 6px', borderRadius: '10px' }}>{qcPendingCount}</span>
          </button>
        </div>
      </div>

      {/* Events Panel */}
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
                          <Link href={`/a/${accountId}/p/${ev.projectId}`} className="lnk" style={{ fontWeight: 600 }}>{ev.clientName}</Link>
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
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>
              {activeFilter === 'started' ? '⚙️' : activeFilter === 'qc' ? '🔍' : '📋'}
            </div>
            <p style={{ fontWeight: 600, marginBottom: '6px', fontSize: '15px' }}>
              {activeFilter === 'started' ? 'No Active Implementations' : activeFilter === 'qc' ? 'No Quality Control Reviews Pending' : 'No activity recorded yet'}
            </p>
            <p style={{ color: 'var(--faint)', fontSize: '13px' }}>
              {activeFilter === 'all'
                ? 'Events will automatically appear here as tasks are logged, updated, or finalized.'
                : 'Selected filter currently has zero matching activity logs.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
