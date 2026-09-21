import React from 'react';
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

type PortfolioShellProps = {
  accountId: string;
  accountName: string;
  agencyLogoUrl?: string | null;
  role?: string;
  userName?: string | null;
  activeTab: 'projects' | 'analytics' | 'activity';
  hasNewActivity?: boolean;
  children: React.ReactNode;
};

export default function PortfolioShell({
  accountId,
  accountName,
  agencyLogoUrl,
  role,
  userName,
  activeTab,
  hasNewActivity = false,
  children,
}: PortfolioShellProps) {
  const roleLabel = role === 'am' ? 'AM View' : 'Agency View';

  return (
    <>
      <header className="top">
        <div className="crumbs">
          {agencyLogoUrl ? (
            <img src={agencyLogoUrl} alt={accountName} className="logo logo-img" />
          ) : (
            <span className="logo">{accountName.charAt(0)}</span>
          )}
          <Link href={`/a/${accountId}`}>{accountName}</Link>
          <span>/</span>
          <b>Portfolio</b>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="wait">{userName || roleLabel}</span>
          <ThemeToggle />
        </div>
      </header>

      <div className="tabs" style={{ marginTop: '14px' }}>
        <Link href={`/a/${accountId}`} style={{ textDecoration: 'none' }}>
          <button className={activeTab === 'projects' ? 'on' : ''}>Projects</button>
        </Link>
        <Link href={`/a/${accountId}/analytics`} style={{ textDecoration: 'none' }}>
          <button className={activeTab === 'analytics' ? 'on' : ''}>Analytics</button>
        </Link>
        <Link href={`/a/${accountId}/activity`} style={{ textDecoration: 'none' }}>
          <button className={activeTab === 'activity' ? 'on' : ''} style={{ position: 'relative' }}>
            Activity
            {hasNewActivity && (
              <span style={{
                position: 'absolute', top: 6, right: 4,
                width: 7, height: 7,
                background: 'var(--hi)', borderRadius: '50%',
                display: 'inline-block',
              }} />
            )}
          </button>
        </Link>
      </div>

      {children}
    </>
  );
}
