'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Home, Sparkles, BarChart3, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeProvider';

type NavItem = {
  href: string;
  label: string;
  Icon: typeof Home;
  match: (path: string) => boolean;
};

const NAV: NavItem[] = [
  { href: '/dashboard',    label: 'الرئيسية',  Icon: Home,      match: (p) => p === '/dashboard' },
  { href: '/select-major', label: 'المحاكاة',  Icon: Sparkles,  match: (p) => p.startsWith('/select-') || p.startsWith('/simulation') },
  { href: '/dashboard?tab=reports', label: 'التقارير', Icon: BarChart3, match: (p) => p.startsWith('/report') },
  { href: '/settings',     label: 'الإعدادات', Icon: Settings,  match: (p) => p.startsWith('/settings') },
];

export function DashboardSidebar() {
  const pathname = usePathname() ?? '';
  const { theme } = useTheme();
  const markSrc = theme === 'dark' ? '/white_mark.png' : '/mark.png';

  return (
    <aside className="hidden md:flex md:flex-col md:w-60 lg:w-64 shrink-0 border-l border-border bg-surface">
      <div className="px-6 py-7 flex flex-col items-center text-center border-b border-border">
        <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center mb-3">
          <Image src={markSrc} alt="تمكين" width={40} height={40} className="select-none" priority />
        </div>
        <div className="font-bold text-lg leading-tight text-brand">تمكين</div>
        <div className="text-[11px] text-text-muted mt-0.5">منصّة التوجيه المهني</div>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1">
        {NAV.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3.5 h-11 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-brand/10 text-brand font-semibold'
                  : 'text-text-secondary hover:bg-surface2 hover:text-text',
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-border text-[10px] text-text-muted text-center">
        © 2026 تمكين
      </div>
    </aside>
  );
}
