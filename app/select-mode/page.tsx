'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSimulationStore } from '@/store/simulationStore';
import { TRACK_TITLES } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/brand/Logo';
import { LoadingMark } from '@/components/brand/LoadingMark';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Zap, Calendar } from 'lucide-react';

export default function SelectModePage() {
  const router = useRouter();
  const {
    selectedMajorId,
    selectedTrackId,
    setSession,
  } = useSimulationStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedTrackId) router.replace('/select-track');
  }, [selectedTrackId, router]);

  if (!selectedTrackId || !selectedMajorId) return null;

  const trackTitle = TRACK_TITLES[selectedTrackId] ?? selectedTrackId;

  async function startSession(mode: 'quick' | 'extended') {
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
              3 مهام أساسية، حوالي 15-20 دقيقة. مثالية لتجربة المنصّة.
            </p>
            <Badge variant="outline">~ 20 دقيقة</Badge>
          </button>

          <button
            onClick={() => startSession('extended')}
            className="text-right p-6 rounded-xl border border-border bg-surface hover:border-brand/40 hover:bg-surface2 transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
              <Calendar className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-base font-semibold mb-1.5">محاكاة موسّعة</h3>
            <p className="text-sm text-text-secondary leading-relaxed mb-4">
              تجربة عميقة مع 5 مهام متصاعدة. مثالية للاستعداد للواقع.
            </p>
            <Badge variant="outline">~ 30 دقيقة</Badge>
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
