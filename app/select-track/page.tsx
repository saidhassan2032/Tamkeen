'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TRACKS, MAJORS } from '@/types';
import { useSimulationStore } from '@/store/simulationStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/brand/Logo';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Clock, ArrowLeft, Check } from 'lucide-react';

export default function SelectTrackPage() {
  const router = useRouter();
  const { selectedMajorId, selectedTrackId, setTrack } = useSimulationStore();

  useEffect(() => {
    if (!selectedMajorId) router.replace('/select-major');
  }, [selectedMajorId, router]);

  if (!selectedMajorId) return null;

  const major = MAJORS.find((m) => m.id === selectedMajorId);
  const tracks = TRACKS[selectedMajorId] ?? [];

  const handleSelect = (id: string) => {
    setTrack(id);
    router.push('/select-mode');
  };

  return (
    <main className="min-h-screen bg-bg text-text">
      <nav className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo asLink withWordmark size={44} />
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-muted">الخطوة 2 من 3</span>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-10">
          <Badge variant="secondary" className="mb-4">
            {major?.icon} {major?.title}
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">اختر مسارك المهني</h1>
          <p className="text-sm text-text-muted">حدّد الدور الوظيفي الذي تريد محاكاته.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {tracks.map((track) => {
            const isSelected = selectedTrackId === track.id;
            return (
              <button
                key={track.id}
                onClick={() => handleSelect(track.id)}
                className={`group relative text-right p-6 rounded-xl border bg-surface transition-all ${
                  isSelected
                    ? 'border-brand bg-brand-soft'
                    : 'border-border hover:border-brand/40 hover:bg-surface2'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-2xl shrink-0">{track.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold mb-1.5">{track.title}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                      <Clock className="w-3.5 h-3.5" />
                      {track.duration}
                    </div>
                  </div>
                  <div className="shrink-0 self-center">
                    {isSelected ? (
                      <Check className="w-5 h-5 text-brand" />
                    ) : (
                      <ArrowLeft className="w-4 h-4 text-text-muted group-hover:text-brand transition-colors" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-12 flex justify-end">
          <Link href="/select-major">
            <Button variant="ghost">رجوع</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
