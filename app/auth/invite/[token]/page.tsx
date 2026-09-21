'use client';

import React, { useState, useTransition } from 'react';
import { acceptInvite } from '@/app/actions/authActions';
import { useRouter } from 'next/navigation';

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }

    const resolvedParams = await params;
    startTransition(async () => {
      const res = await acceptInvite(resolvedParams.token, name, password);
      if (res.error) {
        setError(res.error);
      } else if (res.success && res.accountId) {
        router.push(`/a/${res.accountId}`);
      }
    });
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', padding: '24px',
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '48px', width: '100%', maxWidth: '420px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            width: '48px', height: '48px', background: 'var(--s-done)',
            borderRadius: '12px', margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', color: '#fff',
          }}>✓</div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 6px' }}>Accept Your Invitation</h1>
          <p style={{ color: 'var(--faint)', fontSize: '14px', margin: 0 }}>
            Set up your account to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Your Name
            </label>
            <input
              id="invite-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Jane Smith"
              required
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '8px',
                border: '1px solid var(--border)', background: 'var(--bg)',
                color: 'var(--ink)', fontSize: '15px', boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Password
            </label>
            <input
              id="invite-password"
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 8 characters" required
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '8px',
                border: '1px solid var(--border)', background: 'var(--bg)',
                color: 'var(--ink)', fontSize: '15px', boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Confirm Password
            </label>
            <input
              id="invite-confirm"
              type="password" value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat password" required
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '8px',
                border: '1px solid var(--border)', background: 'var(--bg)',
                color: 'var(--ink)', fontSize: '15px', boxSizing: 'border-box',
              }}
            />
          </div>
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: '8px', padding: '10px 14px', color: 'var(--hi)', fontSize: '14px',
            }}>
              {error}
            </div>
          )}
          <button
            id="invite-submit"
            type="submit" disabled={isPending} className="btn"
            style={{ marginTop: '8px', width: '100%', padding: '12px', fontSize: '15px', fontWeight: 600 }}
          >
            {isPending ? 'Setting up...' : 'Create Account & Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
