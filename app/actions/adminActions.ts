'use server';

import { prisma } from '../lib/prisma';
import { revalidatePath } from 'next/cache';

export async function assignAccountManager(projectId: string, userId: string | null) {
  await prisma.project.update({
    where: { id: projectId },
    data: { accountManagerId: userId },
  });
  revalidatePath('/a/[accountId]/admin', 'page');
  revalidatePath('/a/[accountId]', 'page');
}

export async function saveCommunicationConfig(
  accountId: string,
  config: {
    whatsapp: { enabled: boolean; apiToken?: string; phoneNumberId?: string; businessAccountId?: string };
    slack: { enabled: boolean; webhookUrl?: string; botToken?: string; defaultChannel?: string };
    email: { enabled: boolean; smtpHost?: string; smtpPort?: string; smtpUser?: string; smtpPass?: string; fromEmail?: string };
  }
) {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) return { success: false };

  await prisma.account.update({
    where: { id: accountId },
    data: { communicationConfig: JSON.stringify(config) }
  });

  revalidatePath(`/a/${accountId}/admin`, 'page');
  return { success: true };
}

// Legacy simple toggle (kept for backwards compatibility)
export async function connectCommunicationApi(
  accountId: string,
  provider: 'whatsapp' | 'slack' | 'email',
  action: 'connect' | 'disconnect'
) {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) return { success: false };

  const current = account.communicationConfig ? JSON.parse(account.communicationConfig) : {};
  if (!current[provider] || typeof current[provider] !== 'object') {
    current[provider] = {};
  }
  current[provider].enabled = action === 'connect';

  await prisma.account.update({
    where: { id: accountId },
    data: { communicationConfig: JSON.stringify(current) }
  });

  revalidatePath(`/a/${accountId}/admin`, 'page');
  return { success: true, action };
}

export async function inviteAccountManager(accountId: string, email: string, role: 'am' | 'admin') {
  const { inviteUser } = await import('./authActions');
  return inviteUser(accountId, email, role);
}
