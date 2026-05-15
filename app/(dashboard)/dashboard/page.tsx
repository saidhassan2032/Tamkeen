import { headers, cookies } from 'next/headers';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Cpu, Users, Zap, BarChart3, Star } from 'lucide-react';
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
  if (score >= 80) return { label: 'فريق عالي الإنتاجية', stars: 5 };
  if (score >= 65) return { label: 'أداء جيد جداً',       stars: 4 };
  if (score >= 50) return { label: 'أداء مقبول',          stars: 3 };
  return                     { label: 'يحتاج تحسيناً',    stars: 2 };
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const data = await fetchUserReports();
  const last = data.reports[0];
  const hasReports = !!data.avg;

  const technical = data.avg?.quality       ?? 0;
  const teamwork  = data.avg?.communication ?? 0;
  const speed     = data.avg?.speed         ?? 0;
  const overall   = data.avg?.overall       ?? 0;

  const meta = verdictMeta(overall);

  return (
    <>
      <DashboardTopbar title="" />

      <main className="flex-1 px-6 lg:px-10 py-8 max-w-6xl w-full">
        {/* Greeting */}
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-bold mb-1">
            مرحباً، {user?.name?.split(' ')[0] ?? 'بك'} 👋
          </h1>
          <p className="text-sm text-text-muted">
            {hasReports
              ? 'هذه نظرة عامة على أدائك في جلسات المحاكاة.'
              : 'لم تبدأ أي محاكاة بعد — ابدأ تجربتك الأولى لتظهر بياناتك هنا.'}
          </p>
        </div>

        {hasReports && (
          <>
            {/* Stat cards row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <StatCard value={technical} label="الكفاءة التقنية" color="brand" Icon={Cpu}
                description="أداء تقني مستمر مع وجود فرص للتطوير في الجوانب المعمارية المتقدّمة." />
              <StatCard value={teamwork} label="العمل الجماعي" color="accent" Icon={Users}
                description="تواصل فعّال وروح تعاونية مميّزة بين أعضاء الفريق في حل المشكلات." />
              <StatCard value={speed} label="السرعة" color="deep" Icon={Zap}
                description="يتفوّق الفريق في تسليم المهام قبل الموعد المحدّد وبجودة عالية." />
            </div>

            {/* Decision card + AI analysis row */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
              {/* Decision card */}
              <div className="lg:col-span-2 rounded-2xl border border-border bg-surface overflow-hidden">
                <div className="relative h-44 md:h-48 bg-gradient-to-br from-brand via-brand to-text">
                  <div className="absolute inset-0 brand-glow opacity-60" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,106,0,0.25),transparent_55%)]" />
                  <div className="absolute top-3 start-3 text-[10px] uppercase tracking-wider text-white/80 bg-white/10 backdrop-blur px-2.5 py-1 rounded-full">
                    القرار النهائي
                  </div>
                </div>
                <div className="p-5">
                  <div className="text-base md:text-lg font-bold mb-2">{meta.label}</div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={
                          i < meta.stars
                            ? 'w-4 h-4 fill-accent text-accent'
                            : 'w-4 h-4 text-border'
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* AI analysis */}
              <div className="lg:col-span-3 rounded-2xl border border-border bg-surface p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <h2 className="text-base font-bold">تحليل الأداء الذكي</h2>
                </div>
                <div className="space-y-3">
                  <AIQuote
                    tag="سؤال"
                    text='"أداء الفريق متماسك في سرعة التنفيذ، نلاحظ تحسّناً كبيراً في استجابة المطورين للمتطلبات الطارئة."'
                  />
                  <AIQuote
                    tag="جواب"
                    text='"نحتاج للتركيز أكثر على توثيق الكود البرمجي لرفع الكفاءة التقنية على المدى البعيد."'
                  />
                  <AIQuote
                    tag="فكر"
                    text='"التعاون بين الفريق في أعلى مستوياته، الجميع مستعد للمساعدة في أي وقت."'
                  />
                </div>
                <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
                  <span className="text-[11px] text-text-muted">
                    {last && `تم التحديث في ${new Date(last.generatedAt).toLocaleDateString('ar')}`}
                  </span>
                  <Link href="/select-major">
                    <Button size="sm" variant="outline" className="text-xs">جرّب مجالاً آخر</Button>
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Reports list + CTA */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-brand" />
              <h2 className="text-base font-bold">آخر التقارير</h2>
            </div>
            {data.reports.length === 0 ? (
              <div className="text-center py-10 text-sm text-text-muted">
                لا توجد تقارير بعد — ابدأ محاكاتك الأولى لتظهر هنا.
              </div>
            ) : (
              <div className="space-y-2">
                {data.reports.slice(0, 5).map((r) => (
                  <Link
                    key={r.id}
                    href={`/report/${r.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-border hover:bg-surface2 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-brand/10 text-brand text-sm font-bold flex items-center justify-center shrink-0 tabular-nums">
                        {r.overallScore}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{r.trackId ?? 'مسار'}</div>
                        <div className="text-[11px] text-text-muted">
                          {new Date(r.generatedAt).toLocaleDateString('ar')}
                        </div>
                      </div>
                    </div>
                    <ArrowLeft className="w-4 h-4 text-text-muted shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Start CTA */}
          <div className="lg:col-span-2 rounded-2xl border border-brand/30 bg-brand text-brand-fg p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -top-10 -end-10 w-40 h-40 rounded-full bg-accent/30 blur-3xl pointer-events-none" />
            <div className="relative">
              <h3 className="text-lg font-bold mb-2">جاهز لتحدٍّ جديد؟</h3>
              <p className="text-xs leading-relaxed opacity-90">
                ابدأ جلسة محاكاة جديدة، واختبر نفسك في مسارٍ مختلف.
              </p>
            </div>
            <Link href="/select-major" className="relative mt-6">
              <Button
                size="lg"
                variant="secondary"
                className="w-full gap-2 bg-white text-brand hover:bg-white/90"
              >
                ابدأ تجربتك
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

function AIQuote({ tag, text }: { tag: string; text: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface2/50 p-4 flex gap-3 items-start">
      <div className="text-[10px] font-bold text-accent shrink-0 mt-0.5 px-2 py-0.5 rounded bg-accent/10">
        {tag}
      </div>
      <p className="text-sm leading-relaxed text-text-secondary">{text}</p>
    </div>
  );
}
