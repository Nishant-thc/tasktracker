'use client';
import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function CommsFilters({ 
  projects, 
  defaultProjectId, 
  defaultChannel, 
  defaultDays 
}: { 
  projects: { id: string; clientName: string; name: string }[];
  defaultProjectId: string;
  defaultChannel: string;
  defaultDays: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <form style={{ display: 'contents' }}>
      <select 
        value={defaultProjectId} 
        onChange={e => updateParam('projectId', e.target.value)} 
        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}
      >
        <option value="">All Projects</option>
        {projects.map(p => (
          <option key={p.id} value={p.id}>{p.clientName} — {p.name}</option>
        ))}
      </select>

      <select 
        value={defaultChannel} 
        onChange={e => updateParam('channel', e.target.value)} 
        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}
      >
        <option value="">All Channels</option>
        <option value="email">Email</option>
        <option value="slack">Slack</option>
        <option value="whatsapp">WhatsApp</option>
        <option value="system">System Events</option>
      </select>

      <select 
        value={defaultDays} 
        onChange={e => updateParam('days', e.target.value)} 
        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}
      >
        <option value="7">Last 7 days</option>
        <option value="30">Last 30 days</option>
        <option value="90">Last 90 days</option>
        <option value="365">Last year</option>
      </select>
    </form>
  );
}
