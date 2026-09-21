import { redirect } from 'next/navigation';

export default async function AgencyReportsRedirect({ params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  redirect(`/a/${accountId}/analytics`);
}