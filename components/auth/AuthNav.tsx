'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, User as UserIcon } from 'lucide-react';

type Me = { id: string; email: string; name: string; avatarUrl: string | null } | null;

export function AuthNav() {
  const router = useRouter();
  const [user, setUser] = useState<Me>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setUser(data.user ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  async function handleLogout() {
    setMenuOpen(false);
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.refresh();
  }

  if (loading) {
    return <div className="h-9 w-20 rounded-md bg-surface2/60 animate-pulse" />;
  }

  if (!user) {
    return (
      <Link href="/login">
        <Button size="sm" variant="outline" className="gap-1.5">
          <LogIn className="w-4 h-4" />
          تسجيل الدخول
        </Button>
      </Link>
    );
  }

  const initial = user.name.trim().charAt(0).toUpperCase() || 'U';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((s) => !s)}
        className="inline-flex items-center gap-2 h-9 px-2.5 rounded-full border border-border bg-surface hover:bg-surface2 transition-colors"
        aria-label="حساب المستخدم"
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
        ) : (
          <span className="w-6 h-6 rounded-full bg-brand/15 text-brand text-xs font-semibold flex items-center justify-center">
            {initial}
          </span>
        )}
        <span className="text-xs font-medium max-w-[8rem] truncate">{user.name}</span>
      </button>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute end-0 mt-2 w-56 rounded-xl border border-border bg-surface shadow-lg z-20 overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <div className="text-sm font-medium truncate">{user.name}</div>
              <div className="text-xs text-text-muted truncate" dir="ltr">{user.email}</div>
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
  );
}
