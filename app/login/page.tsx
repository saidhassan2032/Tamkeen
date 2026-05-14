import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { Logo } from '@/components/brand/Logo';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { LoginForm } from '@/components/auth/LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { next?: string };
}) {
  const user = await getCurrentUser();
  if (user) {
    const next = searchParams?.next;
    redirect(next && next.startsWith('/') ? next : '/dashboard');
  }

  return (
    <main className="min-h-screen bg-bg text-text">
      <nav className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo asLink withWordmark size={44} />
          <ThemeToggle />
        </div>
      </nav>

      <div className="max-w-md mx-auto px-6 py-16">
        <LoginForm />
      </div>
    </main>
  );
}
