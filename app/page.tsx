import { prisma } from './lib/prisma';
import { getSession } from './lib/session';
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await getSession();

  if (session) {
    redirect(`/a/${session.accountId}`);
  }

  // No session → redirect to login
  redirect('/auth/login');
}
