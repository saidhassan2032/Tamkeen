import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?next=/dashboard');
  }

  return (
    <div className="min-h-screen bg-bg text-text flex">
      <DashboardSidebar />
      <div className="flex-1 min-w-0 flex flex-col">{children}</div>
    </div>
  );
}
