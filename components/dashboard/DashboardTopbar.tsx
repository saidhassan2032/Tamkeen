'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, HelpCircle, LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

type Me = { id: string; email: string; name: string; avatarUrl: string | null } | null;

interface Props {
  title: string;
  subtitle?: string;
}

export function DashboardTopbar({ title, subtitle }: Props) {
  const router = useRouter();
  const [user, setUser] = useState<Me>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setUser(data.user ?? null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  async function handleLogout() {
    setMenuOpen(false);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  const initial = user?.name?.trim().charAt(0).toUpperCase() || 'U';

  return (
    <header className="sticky top-0 z-10 bg-bg/85 backdrop-blur border-b border-border">
      <div className="px-6 lg:px-10 h-16 flex items-center justify-between gap-4">
        {/* Right visual side (RTL start): page title (closer to the sidebar) */}
        <div className="text-end">
          <div className="text-base md:text-lg font-bold text-text">{title}</div>
          {subtitle && <div className="text-[11px] text-text-muted mt-0.5">{subtitle}</div>}
        </div>

        {/* Left visual side (RTL end): user controls (avatar / bell / help / theme) */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((s) => !s)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-border bg-surface hover:bg-surface2 overflow-hidden"
              aria-label="حساب المستخدم"
            >
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-full" />
              ) : (
                <span className="text-xs font-semibold text-brand">{initial}</span>
              )}
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute start-0 mt-2 w-56 rounded-xl border border-border bg-surface shadow-lg z-20 overflow-hidden">
                  <div className="px-4 py-3 border-b border-border">
                    <div className="text-sm font-medium truncate">{user?.name ?? '—'}</div>
                    <div className="text-xs text-text-muted truncate" dir="ltr">{user?.email ?? ''}</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-right px-4 py-2.5 text-sm hover:bg-surface2 flex items-center gap-2 text-danger"
                  >
                    <LogOut className="w-4 h-4" />
                    تسجيل الخروج
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            className="w-9 h-9 rounded-full border border-border bg-surface hover:bg-surface2 inline-flex items-center justify-center text-text-muted"
            aria-label="الإشعارات"
          >
            <Bell className="w-4 h-4" />
          </button>

          <button
            type="button"
            className="w-9 h-9 rounded-full border border-border bg-surface hover:bg-surface2 inline-flex items-center justify-center text-text-muted"
            aria-label="مساعدة"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
