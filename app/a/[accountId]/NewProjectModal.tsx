'use client';

import React, { useState } from 'react';
import { createProject } from '@/app/actions/taskActions';
import { useRouter } from 'next/navigation';

const CATEGORIES = ['SEO', 'PPC', 'Content', 'CRO', 'Social', 'Email', 'Tech', 'Other'];
const PROJECT_TYPES = ['Retainer', 'One-time', 'Audit', 'Consultation'];
const STATUSES = ['active', 'paused'];

type AmUser = { id: string; name: string | null };

export default function NewProjectModal({
  accountId,
  accountManagers = [],
  currentUserId,
}: {
  accountId: string;
  accountManagers?: AmUser[];
  currentUserId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-select current user if available or single AM in list
  const defaultAm = (currentUserId && accountManagers.some(a => a.id === currentUserId))
    ? currentUserId
    : (currentUserId || (accountManagers.length > 0 ? accountManagers[0].id : ''));

  const [form, setForm] = useState({
    clientName: '',
    name: '',
    type: 'Retainer',
    category: 'SEO',
    status: 'active',
    accountManagerId: defaultAm,
  });
  const router = useRouter();

  // Ensure defaultAm is synced when modal opens or props change
  React.useEffect(() => {
    if (defaultAm && !form.accountManagerId) {
      setForm(f => ({ ...f, accountManagerId: defaultAm }));
    }
  }, [defaultAm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const project = await createProject({
        accountId,
        clientName: form.clientName,
        name: form.name,
        type: form.type,
        category: form.category,
        status: form.status,
        accountManagerId: form.accountManagerId || currentUserId || null,
      });
      setOpen(false);
      window.location.href = `/a/${accountId}/p/${project.id}`;
    } catch (err: any) {
      console.error('Project creation failed:', err);
      setError(err?.message || 'Failed to create project. Please check fields.');
      setLoading(false);
    }
  };

  const field = (label: string, el: React.ReactNode) => (
    <div>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>{label}</label>
      {el}
    </div>
  );

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: '1px solid var(--border)', background: 'var(--bg)',
    color: 'var(--ink)', fontSize: '14px', boxSizing: 'border-box',
  };

  return (
    <>
      <button id="new-project-btn" className="btn" onClick={() => setOpen(true)}>+ New Project</button>

      {open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '16px', padding: '32px', width: '520px', maxWidth: '95vw',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>New Project</h2>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--faint)' }}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', color: '#ef4444', fontSize: '13px' }}>
                  {error}
                </div>
              )}
              {field('Client Name', (
                <input id="np-client" style={inputStyle} required value={form.clientName}
                  onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
                  placeholder="e.g. Acme Corp" />
              ))}
              {field('Project / Engagement Name', (
                <input id="np-name" style={inputStyle} required value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. SEO Growth Q4 2026" />
              ))}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {field('Category', (
                  <select id="np-category" style={inputStyle} value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                ))}
                {field('Project Type', (
                  <select id="np-type" style={inputStyle} value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {field('Status', (
                  <select id="np-status" style={inputStyle} value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                ))}
                {field('Account Manager', (
                  <select id="np-am" style={inputStyle} value={form.accountManagerId}
                    onChange={e => setForm(f => ({ ...f, accountManagerId: e.target.value }))}>
                    <option value="">Unassigned</option>
                    {accountManagers.map(am => (
                      <option key={am.id} value={am.id}>
                        {am.id === currentUserId ? `⭐ ${am.name || 'Account Manager'} (You)` : (am.name || am.id)}
                      </option>
                    ))}
                  </select>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
                <button id="np-submit" type="submit" className="btn" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
