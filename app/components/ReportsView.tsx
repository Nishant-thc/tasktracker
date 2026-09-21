'use client';

import React, { useState } from 'react';

type Task = {
  id: string;
  title: string;
  priority: string;
  estimatedUpliftPct: number;
  category: string | null;
  status: string;
  createdAt: Date;
  startedAt: Date | null;
  qcAt: Date | null;
  closedAt: Date | null;
  dueDate: Date | null;
};

const DAY = 864e5;

const P: Record<string, { short: string }> = {
  high: { short: 'High' },
  medium: { short: 'Medium' },
  low: { short: 'Low' },
};

function fmt(d: Date | number) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function days(a: number, b: number) {
  return Math.max(0, Math.floor((b - a) / DAY));
}

function k(n: number) {
  return n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k' : Math.round(n).toString();
}

function monthRange(off: number) {
  const n = new Date();
  return [
    new Date(n.getFullYear(), n.getMonth() - off, 1).getTime(),
    new Date(n.getFullYear(), n.getMonth() - off + 1, 1).getTime()
  ];
}

export default function ReportsView({ tasks, role, clientName, agencyName, baseUrl }: { tasks: Task[], role: 'agency' | 'client', clientName: string, agencyName: string, baseUrl: string }) {
  const [monthOffset, setMonthOffset] = useState(0);

  const rg = monthRange(monthOffset);
  const inR = (t: Date | null) => t && t.getTime() >= rg[0] && t.getTime() < rg[1];
  const mName = new Date(rg[0]).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const raised = tasks.filter(t => inR(t.createdAt));
  const closed = tasks.filter(t => inR(t.closedAt));
  
  const avgClose = closed.length 
    ? Math.round(closed.reduce((a, t) => a + days(t.createdAt.getTime(), t.closedAt!.getTime()), 0) / closed.length) 
    : 0;
  
  const withDue = closed.filter(t => t.dueDate);
  const onTime = withDue.filter(t => t.closedAt!.getTime() <= t.dueDate!.getTime()).length;

  const m = {
    open: tasks.filter(t => t.status !== 'closed'),
    cl: tasks.filter(t => t.status === 'pending' || t.status === 'in_progress'),
    qc: tasks.filter(t => t.status === 'qc'),
    onHold: tasks.filter(t => t.status !== 'closed').reduce((acc, t) => acc + (t.estimatedUpliftPct || 0), 0)
  };

  const cats: Record<string, { count: number, days: number }> = {};
  closed.forEach(t => {
    const c = t.category || 'Uncategorized';
    if (!cats[c]) cats[c] = { count: 0, days: 0 };
    cats[c].count++;
    cats[c].days += days(t.createdAt.getTime(), t.closedAt!.getTime());
  });
  const catAvgs = Object.keys(cats).map(c => ({
    name: c,
    count: cats[c].count,
    avg: Math.round(cats[c].days / cats[c].count)
  })).sort((a, b) => b.avg - a.avg);

  const clientDigest = () => {
    const lines = m.cl.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).map((t, i) => {
      const d = days(t.createdAt.getTime(), Date.now());
      const od = t.dueDate && t.dueDate.getTime() < Date.now() ? `, overdue by ${days(t.dueDate.getTime(), Date.now())} days` : '';
      return `${i + 1}. ${t.title} (${P[t.priority]?.short.toLowerCase()} priority, open ${d} days${od})`;
    });
    return `Daily update for ${clientName}, ${fmt(Date.now())}\n\n${m.cl.length ? `${m.cl.length} change${m.cl.length > 1 ? 's' : ''} waiting on your team:\n${lines.join('\n')}\n\nEstimated growth on hold: +${m.onHold}% organic sessions.` : 'Nothing is waiting on your team today.'}\nView and update: ${window.location.origin}${baseUrl}`;
  };

  const qcDigest = () => {
    const lines = m.qc.map((t, i) => `${i + 1}. ${t.title} (in QC ${days((t.qcAt || t.createdAt).getTime(), Date.now())} days)`);
    return `QC queue for ${clientName}, ${fmt(Date.now())}\n\n${m.qc.length ? `${m.qc.length} change${m.qc.length > 1 ? 's' : ''} ready for QC:\n${lines.join('\n')}` : 'Nothing is waiting for QC.'}\nOpen project: ${window.location.origin}${baseUrl}`;
  };

  return (
    <>
      <div className="bar noprint">
        <div className="chips">
          <button className={monthOffset === 0 ? 'on' : ''} onClick={() => setMonthOffset(0)}>This month</button>
          <button className={monthOffset === 1 ? 'on' : ''} onClick={() => setMonthOffset(1)}>Last month</button>
        </div>
        <button className="btn ghost sm" onClick={() => window.print()}>Print or save as PDF</button>
      </div>

      <div className="two">
        <div className="panel">
          <h2>Task completion report</h2>
          <p className="note" style={{ marginTop: '2px' }}>{clientName}, {mName}</p>
          <div className="kv">
            <span>Dependencies raised</span><b>{raised.length}</b>
            <span>Dependencies closed</span><b>{closed.length}</b>
            <span>Still open today</span><b>{m.open.length}</b>
            <span>Average days to close</span><b>{closed.length ? avgClose : 'None closed'}</b>
            <span>Closed by the needed-by date</span><b>{withDue.length ? `${onTime} of ${withDue.length}` : 'No dates set'}</b>
          </div>
          {closed.length > 0 && (
            <>
              <div className="sep"></div>
              {closed.map(t => (
                <div key={t.id} className="kv" style={{ margin: '4px 0' }}>
                  <span>{t.title}</span><b>{fmt(t.closedAt!)}</b>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="panel">
          <h2>Category Velocity</h2>
          <p className="note" style={{ marginTop: '2px' }}>{clientName}, {mName}</p>
          <div style={{ marginTop: '14px' }}>
            {catAvgs.length > 0 ? catAvgs.map(c => (
              <div key={c.name} className="kv" style={{ margin: '8px 0', borderBottom: '1px solid var(--line2)', paddingBottom: '8px' }}>
                <span>{c.name} ({c.count} tasks)</span>
                <b style={{ color: c.avg >= 14 ? 'var(--hi)' : c.avg >= 7 ? 'var(--md)' : 'inherit' }}>
                  {c.avg} days avg
                </b>
              </div>
            )) : (
              <p className="note">No tasks closed this month to report velocity.</p>
            )}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: '14px' }}>
        <div className="ph2">
          <div>
            <h2>{role === 'client' ? 'Last message from agency' : 'Automated updates'}</h2>
            <p>{role === 'client' ? 'The most recent project update sent to you.' : 'Preview of the messages that would be sent by the notification dispatcher.'}</p>
          </div>
        </div>
        <div className={role === 'agency' ? 'two' : ''}>
          <div>
            <span className="tag">Client update</span>
            <span className="tag">WhatsApp</span>
            <span className="tag">Email</span>
            <pre className="msg">{clientDigest()}</pre>
          </div>
          {role === 'agency' && (
            <div>
              <span className="tag">Agency QC update</span>
              <span className="tag">Email</span>
              <span className="tag">Slack</span>
              <pre className="msg">{qcDigest()}</pre>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
