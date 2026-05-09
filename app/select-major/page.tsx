'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MAJORS } from '@/types';
import { useSimulationStore } from '@/store/simulationStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function SelectMajorPage() {
  const router = useRouter();
  const { selectedMajorId, setMajor } = useSimulationStore();

  const handleSelect = (id: string) => {
    setMajor(id);
    router.push('/select-track');
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
          <div className="text-sm text-tamkeen-muted">الخطوة 1 من 3</div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">اختر تخصصك</h1>
          <p className="text-tamkeen-muted">حدّد المجال الذي يصف خلفيتك التعليمية أو اهتمامك المهني</p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {MAJORS.map((major) => {
            const isSelected = selectedMajorId === major.id;
            return (
              <Card
                key={major.id}
                onClick={() => handleSelect(major.id)}
                className={`p-7 cursor-pointer transition-all hover:border-tamkeen-blue hover:scale-[1.01] ${
                  isSelected ? 'border-tamkeen-blue ring-2 ring-tamkeen-blue/30' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0"
                    style={{ backgroundColor: `${major.color}22` }}
                  >
                    {major.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{major.title}</h3>
                    <p className="text-sm text-tamkeen-muted leading-relaxed">{major.description}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-tamkeen-muted rotate-180 mt-2" />
                </div>
              </Card>
            );
          })}
        </div>

        <div className="mt-10 flex justify-between">
          <Link href="/">
            <Button variant="ghost">رجوع</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
