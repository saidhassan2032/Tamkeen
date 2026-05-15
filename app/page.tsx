import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/brand/Logo';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { AuthNav } from '@/components/auth/AuthNav';
import { ArrowLeft } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const FEATURES = [
  {
    n: '01',
    title: 'بيئة عمل واقعية',
    description: 'مدير وزميلين بشخصيات سعودية حقيقية، يتفاعلون معك ويُقيّمون أداءك.',
  },
  {
    n: '02',
    title: 'محتوى يتكيّف معك',
    description: 'كل مهمة فيها مرفقات وأدوات واقعية — كود، جداول، ملفات Excel، أو brief تصميم.',
  },
  {
    n: '03',
    title: 'تقرير تحليلي',
    description: 'تقييم مفصّل لجودة العمل، السرعة، والتواصل — مع توصيات لخطوتك التالية.',
  },
];

const TRACKS_PREVIEW = [
  { label: 'علوم الحاسب', count: '3 مسارات' },
  { label: 'المحاسبة', count: '3 مسارات' },
  { label: 'إدارة الأعمال', count: '1 مسار' },
  { label: 'التصميم', count: '2 مسارات' },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect('/dashboard');
  }

  return (
    <main className="min-h-screen bg-bg text-text">
      {/* ── Nav ────────────────────────────────────────────────────────── */}
      <nav className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo asLink withWordmark size={44} />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <AuthNav />
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative">
        <div className="absolute inset-0 brand-glow pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full bg-surface border border-border text-xs text-text-secondary">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            منصّة سعودية لتمكين الخريجين
          </div>

          <h1 className="text-4xl md:text-6xl font-bold leading-[1.15] tracking-tight mb-6">
            جرّب وظيفتك
            <br />
            <span className="text-brand block mt-5">قبل ما تبدأها</span>
          </h1>

          <p className="text-base md:text-lg text-text-secondary max-w-xl mx-auto mb-10 leading-relaxed">
            محاكاة مهنية تضعك في بيئة عمل سعودية، مع مدير وزملاء يتفاعلون معك،
            ويعطونك تقريراً واضحاً عن نقاط قوّتك ومجالات تحسّنك.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/select-major">
              <Button size="lg" className="px-8 gap-2">
                ابدأ تجربتك الآن
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="px-8">
                تعرّف أكثر
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section id="features" className="max-w-5xl mx-auto px-6 py-20 border-t border-border">
        <div className="grid md:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden border border-border">
          {FEATURES.map((f) => (
            <div key={f.n} className="bg-bg p-8">
              <div className="text-xs font-mono text-accent mb-3">{f.n}</div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Tracks preview ─────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-20 border-t border-border">
        <div className="mb-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">تخصصات متعددة</h2>
          <p className="text-sm text-text-muted">اختر تخصصك واكتشف المسار الذي يناسبك</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {TRACKS_PREVIEW.map((t) => (
            <div
              key={t.label}
              className="rounded-xl border border-border bg-surface px-5 py-6"
            >
              <div className="text-sm font-medium mb-1">{t.label}</div>
              <div className="text-xs text-text-muted">{t.count}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-20">
        <div className="rounded-2xl border border-border bg-surface p-10 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">جاهز تخوض التجربة؟</h2>
          <p className="text-sm text-text-secondary mb-8">
            أقل من ثلاثين دقيقة، وتقرير يصاحبك لسنوات.
          </p>
          <Link href="/select-major">
            <Button size="lg" className="px-10">ابدأ المحاكاة</Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between text-xs text-text-muted">
          <span>تمكين © 2026</span>
          <Logo size={22} />
        </div>
      </footer>
    </main>
  );
}
