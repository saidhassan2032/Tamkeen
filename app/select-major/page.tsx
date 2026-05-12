'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MAJORS } from '@/types';
import { useSimulationStore } from '@/store/simulationStore';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/brand/Logo';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { ArrowLeft, Check } from 'lucide-react';

export default function SelectMajorPage() {
  const router = useRouter();
  const { selectedMajorId, setMajor } = useSimulationStore();

  const handleSelect = (id: string) => {
    setMajor(id);
    router.push('/select-track');
  };

  return (
    <main className="min-h-screen bg-bg text-text">
      <nav className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo asLink withWordmark size={44} />
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-muted">الخطوة 1 من 3</span>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">اختر تخصصك</h1>
          <p className="text-sm text-text-muted">حدّد المجال الذي يصف خلفيتك التعليمية أو اهتمامك المهني.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {MAJORS.map((major) => {
            const isSelected = selectedMajorId === major.id;
            return (
              <button
                key={major.id}
                onClick={() => handleSelect(major.id)}
                className={`group relative text-right p-6 rounded-xl border bg-surface transition-all ${
                  isSelected
                    ? 'border-brand bg-brand-soft'
                    : 'border-border hover:border-brand/40 hover:bg-surface2'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-2xl shrink-0">{major.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold mb-1.5">{major.title}</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">{major.description}</p>
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
          <Link href="/">
            <Button variant="ghost">رجوع للرئيسية</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
