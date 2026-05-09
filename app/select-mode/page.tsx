'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSimulationStore } from '@/store/simulationStore';
import { TRACK_TITLES } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Calendar, Loader2 } from 'lucide-react';

export default function SelectModePage() {
  const router = useRouter();
  const {
    selectedMajorId,
    selectedTrackId,
    selectedMode,
    selectedDuration,
    setMode,
    setDuration,
    setSession,
  } = useSimulationStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedTrackId) router.replace('/select-track');
  }, [selectedTrackId, router]);

  if (!selectedTrackId || !selectedMajorId) return null;

  const trackTitle = TRACK_TITLES[selectedTrackId] ?? selectedTrackId;

  async function startSession(mode: 'quick' | 'extended', duration?: '1week' | '2weeks') {
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
          duration: duration ?? null,
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

  return (
    <main className="min-h-screen bg-tamkeen-bg text-tamkeen-text">
      <nav className="border-b border-tamkeen-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-tamkeen-blue to-tamkeen-green flex items-center justify-center font-bold">
              ت
            </div>
            <span className="text-lg font-semibold">تمكين</span>
          </Link>
          <div className="text-sm text-tamkeen-muted">الخطوة 3 من 3</div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <Badge variant="secondary" className="mb-4">{trackTitle}</Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">اختر طريقة المحاكاة</h1>
          <p className="text-tamkeen-muted">جرّب تجربة سريعة أو غُص في تجربة شاملة</p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <Card
            onClick={() => {
              setMode('quick');
              startSession('quick');
            }}
            className={`p-8 cursor-pointer transition-all hover:border-tamkeen-blue hover:scale-[1.01] ${
              selectedMode === 'quick' ? 'border-tamkeen-blue ring-2 ring-tamkeen-blue/30' : ''
            } ${loading ? 'pointer-events-none opacity-50' : ''}`}
          >
            <div className="w-12 h-12 rounded-xl bg-tamkeen-blue/20 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-tamkeen-blue" />
            </div>
            <h3 className="text-xl font-semibold mb-2">محاكاة سريعة</h3>
            <p className="text-tamkeen-muted text-sm leading-relaxed mb-4">
              3 مهام أساسية، حوالي 15-20 دقيقة. مثالية لتجربة المنصّة.
            </p>
            <Badge variant="outline">~ 20 دقيقة</Badge>
          </Card>

          <Card
            onClick={() => setMode('extended')}
            className={`p-8 cursor-pointer transition-all hover:border-tamkeen-blue hover:scale-[1.01] ${
              selectedMode === 'extended' ? 'border-tamkeen-blue ring-2 ring-tamkeen-blue/30' : ''
            } ${loading ? 'pointer-events-none opacity-50' : ''}`}
          >
            <div className="w-12 h-12 rounded-xl bg-tamkeen-green/20 flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 text-tamkeen-green" />
            </div>
            <h3 className="text-xl font-semibold mb-2">محاكاة موسّعة</h3>
            <p className="text-tamkeen-muted text-sm leading-relaxed mb-4">
              تجربة عميقة مع مهام متصاعدة. اختر مدّتها.
            </p>
            <Badge variant="outline">10-20 مهمة</Badge>
          </Card>
        </div>

        {selectedMode === 'extended' && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4 text-center">اختر المدّة</h3>
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              <Button
                onClick={() => {
                  setDuration('1week');
                  startSession('extended', '1week');
                }}
                disabled={loading}
                variant={selectedDuration === '1week' ? 'default' : 'outline'}
                className="h-16 text-base"
              >
                {loading && selectedDuration === '1week' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>أسبوع — 10 مهام</>
                )}
              </Button>
              <Button
                onClick={() => {
                  setDuration('2weeks');
                  startSession('extended', '2weeks');
                }}
                disabled={loading}
                variant={selectedDuration === '2weeks' ? 'default' : 'outline'}
                className="h-16 text-base"
              >
                {loading && selectedDuration === '2weeks' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>أسبوعين — 20 مهمة</>
                )}
              </Button>
            </div>
          </div>
        )}

        {loading && (
          <div className="mt-8 text-center text-tamkeen-muted flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            جاري إعداد بيئة العمل وتوليد المهام...
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 rounded-lg bg-tamkeen-red/10 border border-tamkeen-red/30 text-center text-tamkeen-red">
            {error}
          </div>
        )}

        <div className="mt-10 flex justify-between">
          <Link href="/select-track">
            <Button variant="ghost">رجوع</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
