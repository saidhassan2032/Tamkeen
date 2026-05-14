'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  return (
    <Button variant="outline" className="gap-2 text-danger border-danger/30 hover:bg-danger/10" onClick={handleLogout}>
      <LogOut className="w-4 h-4" />
      تسجيل الخروج
    </Button>
  );
}
