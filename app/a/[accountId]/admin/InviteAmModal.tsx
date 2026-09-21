'use client';

import React, { useState, useTransition } from 'react';
import { inviteAccountManager } from '@/app/actions/adminActions';

export default function InviteAmModal({ accountId }: { accountId: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'am' | 'admin'>('am');
  const [result, setResult] = useState<{ url?: string; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    startTransition(async () => {
      const res = await inviteAccountManager(accountId, email, role);
      if (res?.error) {
        setResult({ error: res.error });
      } else {
        setResult({ url: res?.inviteUrl });
        setEmail('');
      }
    });
  };

  return (
    <>
      <button id="invite-am-btn" className="btn" onClick={() => { setOpen(true); setResult(null); }}>
        + Invite Team Member
      </button>

      {open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '16px', padding: '32px', width: '480px', maxWidth: '95vw',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Invite Team Member</h2>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--faint)' }}>✕</button>
            </div>

            {result?.url ? (
              <div>
                <div style={{
                  background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
                  borderRadius: '10px', padding: '16px', marginBottom: '16px',
                }}>
                  <p style={{ margin: '0 0 8px', fontWeight: 600, color: 'var(--s-done)' }}>✓ Invite Created!</p>
                  <p style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--faint)' }}>Share this link with your team member:</p>
                  <code style={{
                    display: 'block', padding: '10px', borderRadius: '8px',
                    background: 'var(--bg)', fontSize: '12px', wordBreak: 'break-all',
                    color: 'var(--hi)',
                  }}>{result.url}</code>
                </div>
                <button className="btn ghost" onClick={() => { navigator.clipboard.writeText(result.url!); }}>
                  Copy Link
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Email Address</label>
                  <input
                    id="invite-email"
                    type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@agency.com" required
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px',
                      border: '1px solid var(--border)', background: 'var(--bg)',
                      color: 'var(--ink)', fontSize: '15px', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Role</label>
                  <select
                    value={role} onChange={e => setRole(e.target.value as 'am' | 'admin')}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px',
                      border: '1px solid var(--border)', background: 'var(--bg)',
                      color: 'var(--ink)', fontSize: '15px',
                    }}
                  >
                    <option value="am">Account Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {result?.error && (
                  <p style={{ color: 'var(--hi)', fontSize: '14px', margin: 0 }}>{result.error}</p>
                )}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
                  <button id="invite-send-btn" type="submit" className="btn" disabled={isPending}>
                    {isPending ? 'Sending...' : 'Send Invite'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
