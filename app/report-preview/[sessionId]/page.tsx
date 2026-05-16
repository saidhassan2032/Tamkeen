import { headers, cookies } from 'next/headers';
import Link from 'next/link';
import {
  Award,
  TrendingUp,
  AlertCircle,
  Cpu,
  Zap,
  Sparkles,
  Star,
  Target,
  Compass,
  CheckCircle2,
  MessageSquare,
  Timer,
  RotateCcw,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/dashboard/StatCard';
import { ReportCharts } from '@/components/report/ReportCharts';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface ReportPayload {
  id: string;
  sessionId: string;
  overallScore: number;
  qualityScore: number;
  speedScore: number;
  communicationScore: number;
  verdict: string;
  strengths: string[];
  improvements: string[];
  agentFeedbacks: Record<string, string>;
  taskScores: Array<{
    title: string;
    quality?: number | null;
    speed?: number | null;
    communication?: number | null;
    verdict?: string | null;
    extensions?: number;
  }>;
  recommendation?: string;
  generatedAt: number;
  error?: string;
}

async function fetchReport(id: string): Promise<ReportPayload | null> {
  const h = headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const base = process.env.NEXT_PUBLIC_BASE_URL || `${proto}://${host}`;
  const cookieHeader = cookies().toString();
  const res = await fetch(`${base}/api/reports/${id}`, {
    cache: 'no-store',
    headers: { cookie: cookieHeader },
  });
  if (!res.ok) return null;
  return res.json();
}

const ASSESSMENT_DIMENSIONS: Record<
  string,
  { label: string; sublabel: string; icon: 'target' | 'check' | 'compass'; color: 'brand' | 'success' | 'accent' }
> = {
  manager: {
    label: 'تقييم الكفاءة',
    sublabel: 'القدرات المهنية والتنفيذية',
    icon: 'target',
    color: 'brand',
  },
  colleague_1: {
    label: 'جودة الإنجاز',
    sublabel: 'الدقة والإتقان في التنفيذ',
    icon: 'check',
    color: 'success',
  },
  colleague_2: {
    label: 'آفاق التطوير',
    sublabel: 'مسار النمو المهني',
    icon: 'compass',
    color: 'accent',
  },
};

const DIM_COLOR_CLASSES = {
  brand:   { border: 'border-brand/25',   bg: 'bg-brand/5',   iconBg: 'bg-brand/12',   text: 'text-brand'   },
  success: { border: 'border-success/25', bg: 'bg-success/5', iconBg: 'bg-success/12', text: 'text-success' },
  accent:  { border: 'border-accent/25',  bg: 'bg-accent/5',  iconBg: 'bg-accent/12',  text: 'text-accent'  },
};

function DimIcon({ icon, className }: { icon: 'target' | 'check' | 'compass'; className?: string }) {
  if (icon === 'target')  return <Target      className={className} />;
  if (icon === 'check')   return <CheckCircle2 className={className} />;
  return                         <Compass      className={className} />;
}

function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const size = 132;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - score / 100);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="10" />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="white"
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <span className="text-3xl font-bold leading-none">{score}</span>
        <span className="text-[11px] opacity-60 mt-0.5">من 100</span>
      </div>
    </div>
  );
}

function verdictMeta(score: number) {
  if (score >= 80) return { label: 'أداء استثنائي',  badge: 'ممتاز',     stars: 5 };
  if (score >= 65) return { label: 'أداء متميّز',    badge: 'جيد جداً',  stars: 4 };
  if (score >= 50) return { label: 'أداء جيد',       badge: 'مقبول',     stars: 3 };
  return                   { label: 'يحتاج تطويراً', badge: 'للتحسين',   stars: 2 };
}

export default async function ReportPreviewPage({ params }: { params: { sessionId: string } }) {
  const [report, user] = await Promise.all([
    fetchReport(params.sessionId),
    getCurrentUser(),
  ]);

  if (!report || report.error) {
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center px-6 py-12">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-danger mb-4">تعذّر تحميل التقرير</div>
          <Link href="/select-major">
            <Button variant="outline">ابدأ محاكاة جديدة</Button>
          </Link>
        </div>
      </main>
    );
  }

  const meta = verdictMeta(report.overallScore);
  const feedbackEntries = Object.entries(report.agentFeedbacks ?? {});
  const totalExtensions = (report.taskScores ?? []).reduce((sum, t) => sum + (t.extensions ?? 0), 0);
  const formattedDate = new Date(report.generatedAt).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-bg text-text" dir="rtl">

      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold">تقرير الأداء</span>
        <div className="flex items-center gap-2">
          <Link href="/select-major">
            <Button size="sm" variant="outline" className="text-xs gap-1.5">
              <RotateCcw className="w-3 h-3" />
              محاكاة جديدة
            </Button>
          </Link>
          {!user && (
            <Link href="/register">
              <Button size="sm" className="text-xs gap-1.5">
                <Lock className="w-3 h-3" />
                سجّل لحفظ تقاريرك
              </Button>
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 lg:px-8 py-8 space-y-6">

        {/* Guest notice banner */}
        {!user && (
          <div className="rounded-2xl border border-warning/30 bg-warning/5 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Lock className="w-4 h-4 text-warning shrink-0" />
              <p className="text-sm text-warning">
                هذا التقرير مؤقت ولن يُحفظ — سجّل مجاناً للاحتفاظ بتقاريرك وتتبّع تقدّمك.
              </p>
            </div>
            <Link href="/register">
              <Button size="sm" variant="outline" className="text-xs border-warning/40 text-warning hover:bg-warning/10 shrink-0">
                إنشاء حساب مجاني
              </Button>
            </Link>
          </div>
        )}

        {/* Hero */}
        <div className="rounded-2xl overflow-hidden border border-border">
          <div className="relative bg-gradient-to-br from-brand via-brand to-[hsl(var(--brand)/0.85)] p-8 md:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_60%,rgba(255,106,0,0.22),transparent_55%)] pointer-events-none" />
            <div className="absolute top-0 end-0 w-80 h-80 rounded-full bg-white/5 -translate-y-40 translate-x-40 pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row items-center gap-8">
              <ScoreRing score={report.overallScore} />

              <div className="text-white text-center sm:text-start flex-1">
                <span className="inline-block text-[10px] uppercase tracking-widest bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full text-white/70 mb-3">
                  النتيجة الإجمالية
                </span>
                <h1 className="text-2xl md:text-3xl font-bold mb-2">{meta.label}</h1>
                <div className="flex items-center gap-1 justify-center sm:justify-start mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < meta.stars ? 'fill-accent text-accent' : 'text-white/25'}`}
                    />
                  ))}
                  <span className="text-xs text-white/50 ms-1">{meta.badge}</span>
                </div>
                <p className="text-xs text-white/45">{formattedDate}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            value={report.qualityScore}
            label="الكفاءة التقنية"
            color="brand"
            Icon={Cpu}
            description="مستوى التحكّم التقني وجودة الحلول المُنجَزة خلال المحاكاة."
          />
          <StatCard
            value={report.communicationScore}
            label="مهارات التواصل"
            color="accent"
            Icon={MessageSquare}
            description="قدرتك على التعبير والتفاعل الفعّال مع المواقف والتحدّيات."
          />
          <StatCard
            value={report.speedScore}
            label="سرعة الإنجاز"
            color="deep"
            Icon={Zap}
            description="كفاءة إنجازك للمهام والالتزام بالوقت المحدّد لكل مرحلة."
          />
        </div>

        {/* Extensions warning */}
        {totalExtensions > 0 && (
          <div className="rounded-2xl border border-warning/30 bg-warning/5 px-5 py-4 flex items-center gap-3">
            <Timer className="w-4 h-4 text-warning shrink-0" />
            <p className="text-sm text-warning">
              تم تمديد الوقت <span className="font-bold">{totalExtensions}</span>{' '}
              {totalExtensions === 1 ? 'مرة' : 'مرات'} خلال المحاكاة
            </p>
          </div>
        )}

        {/* AI Analysis */}
        <div className="rounded-2xl border border-border bg-surface p-6 md:p-8 space-y-6">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h2 className="text-base font-bold">التحليل الذكي الشخصي</h2>
              <p className="text-xs text-text-muted mt-0.5">
                تقييم شامل ومُفصَّل لأدائك خلال جلسة المحاكاة
              </p>
            </div>
          </div>

          <blockquote className="relative border-s-2 border-brand ps-5 py-1">
            <div className="absolute top-0 start-0 w-0.5 h-full bg-gradient-to-b from-brand to-brand/20 rounded-full" />
            <p className="text-sm leading-7 text-text-secondary">{report.verdict}</p>
          </blockquote>

          {feedbackEntries.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {feedbackEntries.map(([key, value]) => {
                const dim = ASSESSMENT_DIMENSIONS[key];
                if (!dim) return null;
                const cls = DIM_COLOR_CLASSES[dim.color];
                return (
                  <div
                    key={key}
                    className={`rounded-xl border ${cls.border} ${cls.bg} p-5 flex flex-col gap-3`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg ${cls.iconBg} flex items-center justify-center shrink-0`}>
                        <DimIcon icon={dim.icon} className={`w-4 h-4 ${cls.text}`} />
                      </div>
                      <div>
                        <div className="text-sm font-bold leading-tight">{dim.label}</div>
                        <div className="text-[10px] text-text-muted mt-0.5">{dim.sublabel}</div>
                      </div>
                    </div>
                    <div className={`w-full h-px ${cls.border} opacity-60`} />
                    <p className="text-xs leading-relaxed text-text-secondary flex-1">{value}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Charts */}
        <ReportCharts report={report} />

        {/* Strengths & Improvements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {report.strengths?.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-success/12 flex items-center justify-center">
                  <Award className="w-4 h-4 text-success" />
                </div>
                <h3 className="text-base font-bold">نقاط القوة</h3>
              </div>
              <ul className="space-y-3">
                {report.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2.5 items-start text-sm leading-relaxed text-text-secondary">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.improvements?.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-warning/12 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-warning" />
                </div>
                <h3 className="text-base font-bold">مجالات للتحسين</h3>
              </div>
              <ul className="space-y-3">
                {report.improvements.map((s, i) => (
                  <li key={i} className="flex gap-2.5 items-start text-sm leading-relaxed text-text-secondary">
                    <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Recommendation */}
        {report.recommendation && (
          <div className="rounded-2xl border border-accent/30 bg-accent/5 p-6">
            <h3 className="text-base font-bold mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-accent" />
              الخطوة التالية الموصى بها
            </h3>
            <p className="text-sm leading-relaxed text-text-secondary">{report.recommendation}</p>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="rounded-2xl border border-border bg-surface p-8 text-center space-y-4">
          {user ? (
            <>
              <p className="text-sm text-text-muted">شاهد تقاريرك السابقة وتتبّع تقدّمك من لوحة التحكّم</p>
              <div className="flex justify-center gap-3 flex-wrap">
                <Link href="/dashboard">
                  <Button size="lg" className="px-8">الذهاب للوحة التحكّم</Button>
                </Link>
                <Link href="/select-major">
                  <Button size="lg" variant="outline" className="px-8 gap-2">
                    <RotateCcw className="w-4 h-4" />
                    ابدأ محاكاة جديدة
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-base font-bold">احتفظ بتقاريرك وتتبّع تقدّمك</h3>
              <p className="text-sm text-text-muted">
                سجّل مجاناً لحفظ هذا التقرير والوصول إليه في أي وقت، وتتبّع تطوّرك عبر محاكاة متعددة.
              </p>
              <div className="flex justify-center gap-3 flex-wrap">
                <Link href="/register">
                  <Button size="lg" className="px-8">إنشاء حساب مجاني</Button>
                </Link>
                <Link href="/select-major">
                  <Button size="lg" variant="outline" className="px-8 gap-2">
                    <RotateCcw className="w-4 h-4" />
                    محاكاة جديدة
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>

        <div className="pb-8" />
      </main>
    </div>
  );
}
