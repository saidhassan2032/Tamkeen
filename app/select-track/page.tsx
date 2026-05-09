'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TRACKS, MAJORS } from '@/types';
import { useSimulationStore } from '@/store/simulationStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, ArrowRight } from 'lucide-react';

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
    <main className="min-h-screen bg-tamkeen-bg text-tamkeen-text">
      <nav className="border-b border-tamkeen-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-tamkeen-blue to-tamkeen-green flex items-center justify-center font-bold">
              ت
            </div>
            <span className="text-lg font-semibold">تمكين</span>
          </Link>
          <div className="text-sm text-tamkeen-muted">الخطوة 2 من 3</div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <Badge variant="secondary" className="mb-4">
            {major?.icon} {major?.title}
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">اختر مسارك المهني</h1>
          <p className="text-tamkeen-muted">حدّد الدور الوظيفي الذي تريد محاكاته</p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {tracks.map((track) => {
            const isSelected = selectedTrackId === track.id;
            return (
              <Card
                key={track.id}
                onClick={() => handleSelect(track.id)}
                className={`p-7 cursor-pointer transition-all hover:border-tamkeen-blue hover:scale-[1.01] ${
                  isSelected ? 'border-tamkeen-blue ring-2 ring-tamkeen-blue/30' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0 bg-tamkeen-surface2">
                    {track.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{track.title}</h3>
                    <div className="flex items-center gap-1.5 text-sm text-tamkeen-muted">
                      <Clock className="w-4 h-4" />
                      {track.duration}
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-tamkeen-muted rotate-180 mt-2" />
                </div>
              </Card>
            );
          })}
        </div>

        <div className="mt-10 flex justify-between">
          <Link href="/select-major">
            <Button variant="ghost">رجوع</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
