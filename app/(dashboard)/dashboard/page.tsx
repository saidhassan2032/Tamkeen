import { headers, cookies } from 'next/headers';
import Link from 'next/link';
import {
  ArrowLeft,
  Sparkles,
  Cpu,
  Zap,
  BarChart3,
  Star,
  MessageSquare,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { DashboardTopbar } from '@/components/dashboard/DashboardTopbar';
import { StatCard } from '@/components/dashboard/StatCard';

export const dynamic = 'force-dynamic';

interface ReportSummary {
  id: string;
  sessionId: string;
  overallScore: number;
  qualityScore: number;
  speedScore: number;
  communicationScore: number;
  verdict: string;
  generatedAt: number;
  trackId: string | null;
}

interface DashData {
  reports: ReportSummary[];
  avg: null | {
    overall: number;
    quality: number;
    speed: number;
    communication: number;
    count: number;
  };
}

async function fetchUserReports(): Promise<DashData> {
  const h = headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const base = process.env.NEXT_PUBLIC_BASE_URL || `${proto}://${host}`;
  const cookieHeader = cookies().toString();
  const res = await fetch(`${base}/api/reports`, {
    cache: 'no-store',
    headers: { cookie: cookieHeader },
  });
  if (!res.ok) return { reports: [], avg: null };
  return res.json();
}

function verdictMeta(score: number) {
  if (score >= 80) return { label: 'أداء استثنائي',  badge: 'ممتاز',    stars: 5 };
  if (score >= 65) return { label: 'أداء متميّز',    badge: 'جيد جداً', stars: 4 };
  if (score >= 50) return { label: 'أداء جيد',       badge: 'مقبول',    stars: 3 };
  return                   { label: 'يحتاج تطويراً', badge: 'للتحسين',  stars: 2 };
}

function ScoreRing({ score }: { score: number }) {
  const r = 44;
  const size = 112;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - score / 100);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="9" />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="white"
          strokeWidth="9"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <span className="text-2xl font-bold leading-none">{score}</span>
        <span className="text-[10px] opacity-55 mt-0.5">من 100</span>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const data = await fetchUserReports();
  const last = data.reports[0];
  const hasReports = !!last;

  return (
    <>
      <DashboardTopbar title="" />

      <main className="flex-1 px-6 lg:px-10 py-8 max-w-6xl w-full space-y-6">

        {/* Greeting */}
        <div>
          <h1 className="text-xl md:text-2xl font-bold mb-1">
            مرحباً، {user?.name?.split(' ')[0] ?? 'بك'} 👋
          </h1>
          <p className="text-sm text-text-muted">
            {hasReports
              ? 'إليك ملخص آخر جلسة محاكاة أجريتها.'
              : 'لم تبدأ أي محاكاة بعد — ابدأ تجربتك الأولى لتظهر بياناتك هنا.'}
          </p>
        </div>

        {hasReports && (() => {
          const meta = verdictMeta(last.overallScore);
          const formattedDate = new Date(last.generatedAt).toLocaleDateString('ar-SA', {
            year: 'numeric', month: 'long', day: 'numeric',
          });

          return (
            <>
              {/* ── Last session hero ── */}
              <div className="rounded-2xl overflow-hidden border border-border">
                <div className="relative bg-gradient-to-br from-brand via-brand to-[hsl(var(--brand)/0.85)] p-7 md:p-9">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_60%,rgba(255,106,0,0.22),transparent_55%)] pointer-events-none" />
                  <div className="absolute top-0 end-0 w-72 h-72 rounded-full bg-white/5 -translate-y-36 translate-x-36 pointer-events-none" />

                  <div className="relative z-10 flex flex-col sm:flex-row items-center gap-7">
                    <ScoreRing score={last.overallScore} />

                    <div className="text-white text-center sm:text-start flex-1">
                      <span className="inline-block text-[10px] uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full text-white/65 mb-2">
                        آخر جلسة محاكاة
                      </span>
                      <h2 className="text-xl md:text-2xl font-bold mb-2">{meta.label}</h2>
                      <div className="flex items-center gap-1 justify-center sm:justify-start mb-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < meta.stars ? 'fill-accent text-accent' : 'text-white/25'}`}
                          />
                        ))}
                        <span className="text-xs text-white/45 ms-1.5">{meta.badge}</span>
                      </div>
                      <p className="text-xs text-white/40">
                        {last.trackId && <span className="me-2">{last.trackId}</span>}
                        {formattedDate}
                      </p>
                    </div>

                    <div className="relative z-10 sm:ms-auto flex flex-col gap-2 items-center sm:items-end">
                      <Link href={`/report/${last.id}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-white border-white/25 bg-white/10 hover:bg-white/20 text-xs gap-1.5"
                        >
                          <ExternalLink className="w-3 h-3" />
                          التقرير الكامل
                        </Button>
                      </Link>
                      <Link href="/select-major">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-white/70 border-white/15 bg-transparent hover:bg-white/10 text-xs gap-1.5"
                        >
                          <RotateCcw className="w-3 h-3" />
                          محاكاة جديدة
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Last session metrics ── */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  value={last.qualityScore}
                  label="الكفاءة التقنية"
                  color="brand"
                  Icon={Cpu}
                  description="مستوى التحكّم التقني وجودة الحلول المُنجَزة خلال المحاكاة."
                />
                <StatCard
                  value={last.communicationScore}
                  label="مهارات التواصل"
                  color="accent"
                  Icon={MessageSquare}
                  description="قدرتك على التعبير والتفاعل الفعّال مع المواقف والتحدّيات."
                />
                <StatCard
                  value={last.speedScore}
                  label="سرعة الإنجاز"
                  color="deep"
                  Icon={Zap}
                  description="كفاءة إنجازك للمهام والالتزام بالوقت المحدّد لكل مرحلة."
                />
              </div>

              {/* ── Verdict snippet ── */}
              {last.verdict && (
                <div className="rounded-2xl border border-border bg-surface p-6">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">ملخص الأداء الذكي</h3>
                      <p className="text-[11px] text-text-muted">من آخر جلسة محاكاة</p>
                    </div>
                  </div>
                  <blockquote className="border-s-2 border-brand ps-4">
                    <p className="text-sm leading-7 text-text-secondary line-clamp-3">
                      {last.verdict}
                    </p>
                  </blockquote>
                  <div className="mt-4 flex justify-end">
                    <Link href={`/report/${last.id}`}>
                      <Button size="sm" variant="outline" className="text-xs gap-1.5">
                        اطّلع على التحليل الكامل
                        <ArrowLeft className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </>
          );
        })()}

        {/* ── Reports history + Start CTA ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-brand" />
              <h2 className="text-base font-bold">سجل الجلسات</h2>
            </div>
            {data.reports.length === 0 ? (
              <div className="text-center py-10 text-sm text-text-muted">
                لا توجد جلسات بعد — ابدأ محاكاتك الأولى لتظهر هنا.
              </div>
            ) : (
              <div className="space-y-2">
                {data.reports.slice(0, 5).map((r, idx) => {
                  const m = verdictMeta(r.overallScore);
                  return (
                    <Link
                      key={r.id}
                      href={`/report/${r.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border hover:bg-surface2 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-brand/10 text-brand text-sm font-bold flex items-center justify-center shrink-0 tabular-nums">
                          {r.overallScore}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {r.trackId ?? 'محاكاة'}
                            {idx === 0 && (
                              <span className="ms-2 text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full font-normal">
                                الأحدث
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-text-muted flex items-center gap-1.5">
                            {m.label}
                            <span className="opacity-40">•</span>
                            {new Date(r.generatedAt).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      </div>
                      <ArrowLeft className="w-4 h-4 text-text-muted shrink-0" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Start CTA */}
          <div className="lg:col-span-2 rounded-2xl border border-brand/30 bg-brand text-brand-fg p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -top-10 -end-10 w-40 h-40 rounded-full bg-accent/30 blur-3xl pointer-events-none" />
            <div className="relative">
              <h3 className="text-lg font-bold mb-2">جاهز لتحدٍّ جديد؟</h3>
              <p className="text-xs leading-relaxed opacity-80">
                ابدأ جلسة محاكاة جديدة واختبر نفسك في مسارٍ مختلف.
              </p>
            </div>
            <Link href="/select-major" className="relative mt-6">
              <Button
                size="lg"
                variant="secondary"
                className="w-full gap-2 bg-white text-brand hover:bg-white/90"
              >
                ابدأ محاكاة جديدة
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

      </main>
    </>
  );
}
