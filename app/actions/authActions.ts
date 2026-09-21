'use server';

import { prisma } from '../lib/prisma';
import { setSession, clearSession } from '../lib/session';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import * as crypto from 'crypto';

function hashPassword(password: string): string {
  // Simple SHA256 + SECRET hash for deployment without native bcrypt issues.
  // For production, swap in bcryptjs once confirmed working.
  const secret = process.env.SESSION_SECRET || 'fallback-dev-secret';
  return crypto.createHmac('sha256', secret).update(password).digest('hex');
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export async function login(email: string, password: string) {
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return { error: 'Invalid email or password.' };
    }

    const valid = verifyPassword(password, user.passwordHash);
    if (!valid) {
      return { error: 'Invalid email or password.' };
    }

    const membership = await prisma.membership.findFirst({
      where: { userId: user.id, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });

    if (!membership) {
      return { error: 'No active account found for this user.' };
    }

    await setSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: membership.role,
      accountId: membership.accountId,
    });

    return { success: true, accountId: membership.accountId };
  } catch (err: any) {
    console.error('Login action error:', err);
    return { error: err?.message || 'Authentication error. Please try again.' };
  }
}

export async function logout() {
  await clearSession();
  redirect('/auth/login');
}

export async function inviteUser(accountId: string, email: string, role: 'am' | 'admin') {
  // Check if user already exists with a membership
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const existingMembership = await prisma.membership.findUnique({
      where: { accountId_userId: { accountId, userId: existing.id } }
    });
    if (existingMembership) {
      return { error: 'This user already has access.' };
    }
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const invite = await prisma.inviteToken.create({
    data: { accountId, email, role, expiresAt }
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const inviteUrl = `${appUrl}/auth/invite/${invite.token}`;

  // Log this as a system message
  const account = await prisma.account.findUnique({ where: { id: accountId }, include: { projects: { take: 1 } } });

  // Send email (stubbed) - in production wire to SMTP
  console.log(`[INVITE EMAIL] To: ${email}, URL: ${inviteUrl}`);

  revalidatePath(`/a/${accountId}/admin`);
  return { success: true, inviteUrl };
}

export async function acceptInvite(token: string, name: string, password: string) {
  const invite = await prisma.inviteToken.findUnique({ where: { token } });
  
  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return { error: 'Invalid or expired invite link.' };
  }

  const passwordHash = hashPassword(password);

  // Upsert user
  let user = await prisma.user.findUnique({ where: { email: invite.email } });
  if (!user) {
    user = await prisma.user.create({
      data: { email: invite.email, name, passwordHash }
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { name, passwordHash }
    });
  }

  // Create membership
  await prisma.membership.upsert({
    where: { accountId_userId: { accountId: invite.accountId, userId: user.id } },
    update: { role: invite.role, status: 'active' },
    create: { accountId: invite.accountId, userId: user.id, role: invite.role },
  });

  // Mark invite as used
  await prisma.inviteToken.update({
    where: { token },
    data: { usedAt: new Date() }
  });

  // Auto-login
  await setSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: invite.role,
    accountId: invite.accountId,
  });

  return { success: true, accountId: invite.accountId };
}

export async function seedAdminPassword(email: string, newPassword: string) {
  // Dev-only: set a password on an existing user
  const hash = hashPassword(newPassword);
  await prisma.user.update({ where: { email }, data: { passwordHash: hash } });
  return { success: true };
}
