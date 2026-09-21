'use client';

import React, { useState, useTransition } from 'react';
import { assignAccountManager } from '@/app/actions/adminActions';

type UserOption = { id: string; name: string };

export default function AmAssigner({ projectId, currentAmId, users }: { projectId: string, currentAmId: string | null, users: UserOption[] }) {
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    startTransition(() => {
      assignAccountManager(projectId, val === 'unassigned' ? null : val);
    });
  };

  return (
    <select 
      value={currentAmId || 'unassigned'}
      onChange={handleChange}
      disabled={isPending}
      style={{
        padding: '4px 8px',
        borderRadius: '6px',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        color: 'var(--ink)'
      }}
    >
      <option value="unassigned">Unassigned</option>
      {users.map(u => (
        <option key={u.id} value={u.id}>{u.name}</option>
      ))}
    </select>
  );
}
