'use client';

import React, { useTransition } from 'react';
import { login } from '@/app/actions/authActions';
import { useRouter } from 'next/navigation';

type UserOption = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};

// Demo role-switching: re-logs in as the selected user
// Uses known dev passwords per role (seeded by the full-seed script)
const DEMO_PASSWORDS: Record<string, string> = {
  'admin@opositive.agency': 'Admin@1234',
  'alice@opositive.agency': 'Alice@1234',
  'bob@opositive.agency': 'Bob@1234',
};

export default function RoleSwitcher({
  users,
  currentUserId,
}: {
  users: UserOption[];
  currentUserId: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const userId = e.target.value;
    if (!userId) return;
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const password = DEMO_PASSWORDS[user.email];
    if (!password) return;

    startTransition(async () => {
      const res = await login(user.email, password);
      if (res.success && res.accountId) {
        router.push(`/a/${res.accountId}`);
        router.refresh();
      }
    });
  };

  return (
    <select
      value={currentUserId || ''}
      onChange={handleChange}
      disabled={isPending}
      style={{
        marginLeft: '12px',
        padding: '6px 12px',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        color: 'var(--ink)',
        fontSize: '14px',
        cursor: 'pointer',
        opacity: isPending ? 0.6 : 1,
      }}
    >
      <option value="" disabled>Switch Role…</option>
      {users.map(u => (
        <option key={u.id} value={u.id}>
          {u.role === 'admin' ? '🛡 Admin: ' : '👤 AM: '}{u.name || u.email}
        </option>
      ))}
    </select>
  );
}
