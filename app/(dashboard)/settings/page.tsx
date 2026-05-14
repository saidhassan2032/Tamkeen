import { Mail, User as UserIcon } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { DashboardTopbar } from '@/components/dashboard/DashboardTopbar';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { LogoutButton } from '@/components/dashboard/LogoutButton';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <>
      <DashboardTopbar title="الإعدادات" subtitle="تخصيص الحساب والمظهر" />

      <main className="flex-1 px-6 lg:px-10 py-8 max-w-3xl w-full space-y-5">
        {/* Profile card */}
        <section className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-base font-bold mb-5">الحساب</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-surface2/50">
              <div className="w-9 h-9 rounded-full bg-brand/15 text-brand flex items-center justify-center">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-text-muted mb-0.5">الاسم</div>
                <div className="text-sm font-medium truncate">{user?.name ?? '—'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-surface2/50">
              <div className="w-9 h-9 rounded-full bg-brand/15 text-brand flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-text-muted mb-0.5">البريد الإلكتروني</div>
                <div className="text-sm font-medium truncate" dir="ltr">{user?.email ?? '—'}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-base font-bold mb-4">المظهر</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">الوضع الليلي</div>
              <div className="text-[11px] text-text-muted">بدّل بين الوضع الفاتح والداكن</div>
            </div>
            <ThemeToggle />
          </div>
        </section>

        {/* Danger zone */}
        <section className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-base font-bold mb-4">جلسة الحساب</h2>
          <LogoutButton />
        </section>
      </main>
    </>
  );
}
