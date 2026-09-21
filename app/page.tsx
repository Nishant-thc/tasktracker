import { prisma } from './lib/prisma';
import { getSession } from './lib/session';
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await getSession();

  if (session && session.accountId) {
    const account = await prisma.account.findUnique({ where: { id: session.accountId } });
    if (account) {
      redirect(`/a/${session.accountId}`);
    }
  }

  // If session account is missing or expired, redirect to first available account if exists, else login
  const firstAccount = await prisma.account.findFirst();
  if (firstAccount) {
    redirect(`/a/${firstAccount.id}`);
  }

  redirect('/auth/login');
}
