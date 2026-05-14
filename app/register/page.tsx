'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/brand/Logo';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/select-major';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'فشل إنشاء الحساب');
      router.push(next);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? 'فشل إنشاء الحساب');
      setLoading(false);
    }
  }

  function signupWithGoogle() {
    window.location.href = '/api/auth/google';
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight">إنشاء حساب جديد</h1>
        <p className="text-sm text-text-muted">سجّل لتبدأ المحاكاة الموسّعة وتحفظ تقدّمك خلال الأسبوع.</p>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full mb-4 gap-2"
        onClick={signupWithGoogle}
      >
        <GoogleIcon /> التسجيل عبر Google
      </Button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-bg px-3 text-text-muted">أو بالبريد الإلكتروني</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1.5">الاسم الكامل</label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-11 px-4 rounded-lg border border-border bg-surface text-text placeholder:text-text-muted focus:outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/20"
            placeholder="عبدالله السالم"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1.5">البريد الإلكتروني</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-11 px-4 rounded-lg border border-border bg-surface text-text placeholder:text-text-muted focus:outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/20"
            placeholder="you@example.com"
            dir="ltr"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1.5">كلمة المرور</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-11 px-4 rounded-lg border border-border bg-surface text-text placeholder:text-text-muted focus:outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/20"
            placeholder="٨ أحرف على الأقل"
            dir="ltr"
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-sm text-danger">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? 'جاري الإنشاء...' : 'أنشئ حساباً'}
        </Button>
      </form>

      <p className="text-sm text-text-muted text-center mt-6">
        لديك حساب بالفعل؟{' '}
        <Link
          href={`/login${next !== '/select-major' ? `?next=${encodeURIComponent(next)}` : ''}`}
          className="text-brand hover:underline"
        >
          سجّل دخولك
        </Link>
      </p>
    </>
  );
}

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-bg text-text">
      <nav className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo asLink withWordmark size={44} />
          <ThemeToggle />
        </div>
      </nav>

      <div className="max-w-md mx-auto px-6 py-16">
        <Suspense fallback={<div className="text-center text-text-muted">جاري التحميل...</div>}>
          <RegisterForm />
        </Suspense>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.99.66-2.26 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.07.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
