'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSimulationStore } from '@/store/simulationStore';
import { TRACK_TITLES } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/brand/Logo';
import { LoadingMark } from '@/components/brand/LoadingMark';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { AuthNav } from '@/components/auth/AuthNav';
import { Zap, Calendar, Lock } from 'lucide-react';

export default function SelectModePage() {
  const router = useRouter();
  const {
    selectedMajorId,
    selectedTrackId,
    setSession,
  } = useSimulationStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const autostartedRef = useRef(false);

  useEffect(() => {
    if (!selectedTrackId) router.replace('/select-track');
  }, [selectedTrackId, router]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => setIsAuthed(!!data.user))
      .catch(() => setIsAuthed(false))
      .finally(() => setAuthChecked(true));
  }, []);

  async function startSession(mode: 'quick' | 'extended') {
    if (mode === 'extended' && !isAuthed) {
      // Preserve the user's intent so we can auto-start after they finish logging in.
      const back = encodeURIComponent('/select-mode?autostart=extended');
      router.push(`/login?next=${back}`);
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId: selectedTrackId,
          majorId: selectedMajorId,
          mode,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          const back = encodeURIComponent('/select-mode?autostart=extended');
          router.push(`/login?next=${back}`);
          return;
        }
        throw new Error(data.error ?? 'حدث خطأ في الاتصال، حاول مجدداً');
      }
      const { sessionId } = await res.json();
      setSession(sessionId);
      router.push(`/simulation/${sessionId}`);
    } catch (err: any) {
      setError(err.message ?? 'حدث خطأ في الاتصال، حاول مجدداً');
      setLoading(false);
    }
  }

  // After auth check completes, auto-start the session if the user returned
  // from a "please log in first" detour (we carry that intent in ?autostart=extended).
  useEffect(() => {
    if (!authChecked || !isAuthed || autostartedRef.current) return;
    if (!selectedTrackId || !selectedMajorId) return;
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') !== 'extended') return;

    autostartedRef.current = true;
    // Clean the URL so refreshes / back-navigation don't re-trigger autostart.
    params.delete('autostart');
    const newSearch = params.toString();
    window.history.replaceState(
      {},
      '',
      '/select-mode' + (newSearch ? `?${newSearch}` : ''),
    );
    startSession('extended');
    // startSession is intentionally omitted from deps — it's redefined every render
    // and including it would loop; we gate via autostartedRef.current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, isAuthed, selectedTrackId, selectedMajorId]);

  if (!selectedTrackId || !selectedMajorId) return null;

  const trackTitle = TRACK_TITLES[selectedTrackId] ?? selectedTrackId;

  if (loading) {
    return (
      <main className="min-h-screen bg-bg text-text flex items-center justify-center px-6">
        <LoadingMark size={120} label="جاري إعداد بيئة العمل وتوليد المهام..." />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg text-text">
      <nav className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo asLink withWordmark size={44} />
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-muted">الخطوة 3 من 3</span>
            <ThemeToggle />
            <AuthNav />
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <Badge variant="secondary" className="mb-4">{trackTitle}</Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">اختر طريقة المحاكاة</h1>
          <p className="text-sm text-text-muted">جرّب تجربة سريعة أو غُص في تجربة شاملة.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <button
            onClick={() => startSession('quick')}
            className="text-right p-6 rounded-xl border border-border bg-surface hover:border-brand/40 hover:bg-surface2 transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center mb-4">
              <Zap className="w-5 h-5 text-brand" />
            </div>
            <h3 className="text-base font-semibold mb-1.5">محاكاة سريعة</h3>
            <p className="text-sm text-text-secondary leading-relaxed mb-4">
              3 مهام أساسية، حوالي 15-20 دقيقة. مثالية لتجربة المنصّة — بدون تسجيل.
            </p>
            <Badge variant="outline">~ 20 دقيقة</Badge>
          </button>

          <button
            onClick={() => startSession('extended')}
            className="relative text-right p-6 rounded-xl border border-border bg-surface hover:border-brand/40 hover:bg-surface2 transition-all"
          >
            {authChecked && !isAuthed && (
              <div className="absolute top-4 left-4 inline-flex items-center gap-1 text-[11px] text-text-muted">
                <Lock className="w-3 h-3" />
                يتطلب حساباً
              </div>
            )}
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
              <Calendar className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-base font-semibold mb-1.5">محاكاة موسّعة</h3>
            <p className="text-sm text-text-secondary leading-relaxed mb-4">
              تجربة عميقة على مدى أسبوع مع 5 مهام متصاعدة — نحفظ تقدّمك في حسابك.
            </p>
            <Badge variant="outline">أسبوع كامل</Badge>
          </button>
        </div>

        {error && (
          <div className="mt-6 p-4 rounded-lg bg-danger/10 border border-danger/30 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="mt-12 flex justify-end">
          <Link href="/select-track">
            <Button variant="ghost">رجوع</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
