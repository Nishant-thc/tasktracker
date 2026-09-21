import React from 'react';
import Link from 'next/link';
import SummaryStrip from './SummaryStrip';
import ThemeToggle from './ThemeToggle';
import ShareLinkButton from './ShareLinkButton';

type Task = {
  status: string;
  createdAt: Date;
  dueDate: Date | null;
  estimatedUpliftPct: number;
};

type ProjectShellProps = {
  clientName: string;
  projectName: string;
  agencyName: string;
  role: 'agency' | 'client';
  children: React.ReactNode;
  activeTab: string;
  baseUrl: string;
  tasks?: Task[];
  projectToken?: string;
  primaryColor?: string | null;
  agencyLogoUrl?: string | null;
  clientLogoUrl?: string | null;
  integrationsConfig?: string | null;
  avgTimeToCloseDays?: number;
};

export default function ProjectShell({
  clientName,
  projectName,
  agencyName,
  role,
  children,
  activeTab,
  baseUrl,
  tasks = [],
  projectToken,
  primaryColor,
  agencyLogoUrl,
  clientLogoUrl,
  integrationsConfig,
  avgTimeToCloseDays: avgTimeToCloseProp,
}: ProjectShellProps) {

  const m = {
    cl: tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length,
    qc: tasks.filter((t) => t.status === 'qc').length,
    done: tasks.filter((t) => t.status === 'closed').length,
    total: tasks.length,
    avgTimeToClose: avgTimeToCloseProp ?? (() => {
      const closedTasks = tasks.filter(t => t.status === 'closed' && (t as any).closedAt);
      if (closedTasks.length === 0) return 0;
      const totalDays = closedTasks.reduce((sum, t) => {
        const days = Math.max(1, Math.floor((new Date((t as any).closedAt).getTime() - new Date(t.createdAt).getTime()) / 86400000));
        return sum + days;
      }, 0);
      return Math.round(totalDays / closedTasks.length);
    })(),
    oldest: tasks
      .filter((t) => t.status !== 'closed')
      .reduce((max, t) => {
        const days = Math.floor((Date.now() - t.createdAt.getTime()) / 86400000);
        return days > max ? days : max;
      }, 0),
    overdue: tasks.filter((t) => t.status !== 'closed' && t.dueDate && t.dueDate.getTime() < Date.now()).length,
    onHold: tasks
      .filter((t) => t.status !== 'closed')
      .reduce((sum, t) => sum + (t.estimatedUpliftPct || 0), 0),
  };

  const shellStyle: React.CSSProperties = primaryColor 
    ? { '--ac': primaryColor } as React.CSSProperties
    : {};

  let importantLinks: { url: string; anchor: string; id: string }[] = [];
  try {
    if (integrationsConfig) {
      const cfg = JSON.parse(integrationsConfig);
      if (cfg.importantLinks) {
        importantLinks = cfg.importantLinks;
      }
    }
  } catch (e) {}

  return (
    <div style={shellStyle}>
      <header className="top">
        <div className="crumbs">
          {role === 'agency' ? (
            <>
              {agencyLogoUrl ? (
                <img src={agencyLogoUrl} alt={agencyName} className="logo" style={{ objectFit: 'cover' }} />
              ) : (
                <span className="logo">{agencyName.charAt(0)}</span>
              )}
              <Link href={baseUrl.split('/p/')[0]}>{agencyName}</Link>
              <span>/</span>
              <Link href={baseUrl.split('/p/')[0]}>Portfolio</Link>
              <span>/</span>
              {clientLogoUrl ? (
                <img src={clientLogoUrl} alt={clientName} style={{ width: '20px', height: '20px', borderRadius: '4px', objectFit: 'cover' }} />
              ) : null}
              <b>{clientName} {projectName}</b>
            </>
          ) : (
            <>
              {agencyLogoUrl ? (
                <img src={agencyLogoUrl} alt={agencyName} className="logo" style={{ objectFit: 'cover' }} />
              ) : (
                <span className="logo">{agencyName.charAt(0)}</span>
              )}
              <Link href={baseUrl}>{clientName}</Link>
              <span>/</span>
              <b>{projectName}</b>
            </>
          )}
        </div>
        <div>
          {role === 'agency' ? (
            <span className="wait">Agency View</span>
          ) : (
            <span className="wait">Client View</span>
          )}
          {role === 'agency' && projectToken && <ShareLinkButton token={projectToken} />}
          <ThemeToggle />
        </div>
      </header>

      <div className="ph">
        <div>
          <h1>{projectName}</h1>
          <p>{clientName} tracker</p>
        </div>
        <div className="acts">
        </div>
      </div>

      {importantLinks.length > 0 && (
        <div style={{ padding: '0 24px 16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--faint)' }}>Quick Links:</span>
          {importantLinks.map(link => (
            <a 
              key={link.id} 
              href={link.url} 
              target="_blank" 
              rel="noreferrer"
              style={{ fontSize: '13px', padding: '4px 12px', backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '16px', textDecoration: 'none', color: 'var(--ink)' }}
            >
              {link.anchor} ↗
            </a>
          ))}
        </div>
      )}

      <SummaryStrip
        clientName={clientName}
        withClientCount={m.cl}
        awaitingQcCount={m.qc}
        closedCount={m.done}
        overdueCount={m.overdue}
        totalCount={m.total}
        oldestOpenDays={m.oldest}
        growthOnHoldPct={m.onHold}
        avgTimeToCloseDays={m.avgTimeToClose}
      />

      <div className="tabs">
        <Link href={`${baseUrl}`} className={activeTab === 'tasks' ? 'on' : ''} style={{ textDecoration: 'none' }}>
          <button className={activeTab === 'tasks' ? 'on' : ''}>Tasks</button>
        </Link>
        <Link href={`${baseUrl}/impact`} className={activeTab === 'impact' ? 'on' : ''} style={{ textDecoration: 'none' }}>
          <button className={activeTab === 'impact' ? 'on' : ''}>Impact</button>
        </Link>
        <Link href={`${baseUrl}/reports`} className={activeTab === 'reports' ? 'on' : ''} style={{ textDecoration: 'none' }}>
          <button className={activeTab === 'reports' ? 'on' : ''}>Reports</button>
        </Link>
        {role === 'agency' && (
          <Link href={`${baseUrl}/settings`} className={activeTab === 'settings' ? 'on' : ''} style={{ textDecoration: 'none' }}>
            <button className={activeTab === 'settings' ? 'on' : ''}>Settings</button>
          </Link>
        )}
        <Link href={`${baseUrl}/contacts`} className={activeTab === 'contacts' ? 'on' : ''} style={{ textDecoration: 'none' }}>
          <button className={activeTab === 'contacts' ? 'on' : ''}>Client contacts</button>
        </Link>
      </div>

      <div className="tabC">
        {children}
      </div>
    </div>
  );
}
