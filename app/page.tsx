'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const FEATURES = [
  {
    icon: '🎯',
    title: 'محاكاة واقعية',
    description: 'بيئة عمل سعودية بشخصيات حقيقية — مدير وزملاء يتفاعلون معك بطبيعتهم',
  },
  {
    icon: '🤖',
    title: 'مدعومة بالذكاء الاصطناعي',
    description: 'ردود فورية وذكية تتكيّف مع قراراتك وأسلوبك في التواصل',
  },
  {
    icon: '📊',
    title: 'تقرير تحليلي شامل',
    description: 'تقييم مفصّل لجودة العمل، السرعة، والتواصل مع توصيات للتطوير',
  },
];

const TRACKS_PREVIEW = [
  { icon: '💻', title: 'علوم الحاسب', count: '3 مسارات' },
  { icon: '📊', title: 'المحاسبة', count: '3 مسارات' },
  { icon: '📈', title: 'إدارة الأعمال', count: '1 مسار' },
  { icon: '🎨', title: 'التصميم', count: '2 مسارات' },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-tamkeen-bg text-tamkeen-text">
      <nav className="border-b border-tamkeen-border bg-tamkeen-bg/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-tamkeen-blue to-tamkeen-green flex items-center justify-center font-bold">
              ت
            </div>
            <span className="text-lg font-semibold">تمكين</span>
          </div>
          <Link href="/select-major">
            <Button variant="default" size="sm">
              ابدأ المحاكاة
            </Button>
          </Link>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-tamkeen-surface border border-tamkeen-border text-sm text-tamkeen-muted">
          🇸🇦 منصّة سعودية لتمكين الخريجين
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
          جرّب <span className="gradient-text">أول شهر</span> في وظيفتك
          <br />
          قبل أن تبدأها
        </h1>
        <p className="text-lg text-tamkeen-muted max-w-2xl mx-auto mb-10 leading-relaxed">
          محاكاة مهنية احترافية تضعك في بيئة عمل واقعية مع مدير وزملاء يتفاعلون معك،
          ويُقيّمون أداءك، ويعطونك تقريراً مفصّلاً عن نقاط قوّتك ومجالات تحسّنك.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/select-major">
            <Button size="lg" className="text-base px-8">
              ابدأ تجربتك الآن
            </Button>
          </Link>
          <a href="#features">
            <Button size="lg" variant="outline" className="text-base px-8">
              تعرّف أكثر
            </Button>
          </a>
        </div>
      </section>

      <section id="features" className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <Card key={f.title} className="p-8 hover:border-tamkeen-blue/40 transition-colors">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-xl font-semibold mb-3">{f.title}</h3>
              <p className="text-tamkeen-muted leading-relaxed">{f.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-3">تخصصات متعددة</h2>
          <p className="text-tamkeen-muted">اختر تخصصك واكتشف المسار الذي يناسبك</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {TRACKS_PREVIEW.map((t) => (
            <Card key={t.title} className="p-6 text-center">
              <div className="text-3xl mb-2">{t.icon}</div>
              <div className="font-semibold mb-1">{t.title}</div>
              <div className="text-sm text-tamkeen-muted">{t.count}</div>
            </Card>
          ))}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-16">
        <Card className="p-12 text-center bg-gradient-to-br from-tamkeen-surface to-tamkeen-surface2 border-tamkeen-blue/30">
          <h2 className="text-3xl font-bold mb-4">جاهز تخوض التجربة؟</h2>
          <p className="text-tamkeen-muted mb-8">
            خمس خطوات بسيطة، أقل من ثلاثين دقيقة، وتقرير يصاحبك لسنوات.
          </p>
          <Link href="/select-major">
            <Button size="lg" className="text-base px-10">
              ابدأ المحاكاة
            </Button>
          </Link>
        </Card>
      </section>

      <footer className="border-t border-tamkeen-border mt-16">
        <div className="max-w-6xl mx-auto px-6 py-6 text-center text-sm text-tamkeen-muted">
          تمكين © 2026 — كل الحقوق محفوظة
        </div>
      </footer>
    </main>
  );
}
