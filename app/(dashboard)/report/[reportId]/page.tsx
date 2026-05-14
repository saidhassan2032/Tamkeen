import { headers, cookies } from 'next/headers';
import Link from 'next/link';
import { ArrowLeft, Award, TrendingUp, AlertCircle, Cpu, Users, Zap, Sparkles, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardTopbar } from '@/components/dashboard/DashboardTopbar';
import { StatCard } from '@/components/dashboard/StatCard';
import { ReportCharts } from '@/components/report/ReportCharts';

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
  taskScores: Array<{ title: string; quality?: number | null; speed?: number | null; communication?: number | null; verdict?: string | null }>;
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

const FEEDBACK_LABEL: Record<string, string> = {
  manager:      'سؤال',
  colleague_1:  'جواب',
  colleague_2:  'فكر',
};

function verdictMeta(score: number) {
  if (score >= 80) return { label: 'فريق عالي الإنتاجية', stars: 5 };
  if (score >= 65) return { label: 'أداء جيد جداً',       stars: 4 };
  if (score >= 50) return { label: 'أداء مقبول',          stars: 3 };
  return                     { label: 'يحتاج تحسيناً',    stars: 2 };
}

export default async function ReportPage({ params }: { params: { reportId: string } }) {
  const report = await fetchReport(params.reportId);

  if (!report || report.error) {
    return (
      <>
        <DashboardTopbar title="تقرير الأداء" />
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="text-center max-w-md">
            <div className="text-4xl mb-4">⚠️</div>
            <div className="text-danger mb-4">تعذّر تحميل التقرير</div>
            <Link href="/dashboard">
              <Button variant="outline">العودة للوحة التحكّم</Button>
            </Link>
          </div>
        </main>
      </>
    );
  }

  const meta = verdictMeta(report.overallScore);
  const feedbackEntries = Object.entries(report.agentFeedbacks ?? {});

  return (
    <>
      <DashboardTopbar title="تقرير الأداء" subtitle={meta.label} />

      <main className="flex-1 px-6 lg:px-10 py-8 max-w-6xl w-full space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            value={report.qualityScore}
            label="الكفاءة التقنية"
            color="brand"
            Icon={Cpu}
            description="أداء تقني مستمر مع وجود فرص للتطوير في الجوانب المعمارية المتقدّمة."
          />
          <StatCard
            value={report.communicationScore}
            label="العمل الجماعي"
            color="accent"
            Icon={Users}
            description="تواصل فعّال وروح تعاونية مميّزة بين أعضاء الفريق في حل المشكلات."
          />
          <StatCard
            value={report.speedScore}
            label="السرعة"
            color="deep"
            Icon={Zap}
            description="يتفوّق الفريق في تسليم المهام قبل الموعد المحدّد وبجودة عالية."
          />
        </div>

        {/* Decision + AI analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Decision card */}
          <div className="lg:col-span-2 rounded-2xl border border-border bg-surface overflow-hidden">
            <div className="relative h-44 md:h-48 bg-gradient-to-br from-brand via-brand to-text">
              <div className="absolute inset-0 brand-glow opacity-60" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,106,0,0.25),transparent_55%)]" />
              <div className="absolute top-3 start-3 text-[10px] uppercase tracking-wider text-white/80 bg-white/10 backdrop-blur px-2.5 py-1 rounded-full">
                القرار النهائي
              </div>
              <div className="absolute bottom-3 end-3 text-white tabular-nums">
                <span className="text-3xl font-bold">{report.overallScore}</span>
                <span className="text-sm opacity-80">%</span>
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
            <p className="text-sm leading-relaxed text-text-secondary mb-4">
              {report.verdict}
            </p>
            {feedbackEntries.length > 0 && (
              <div className="space-y-3">
                {feedbackEntries.map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-border bg-surface2/50 p-4 flex gap-3 items-start">
                    <div className="text-[10px] font-bold text-accent shrink-0 mt-0.5 px-2 py-0.5 rounded bg-accent/10">
                      {FEEDBACK_LABEL[key] ?? key.slice(0, 4)}
                    </div>
                    <p className="text-sm leading-relaxed text-text-secondary">"{value}"</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
              <span className="text-[11px] text-text-muted">
                {new Date(report.generatedAt).toLocaleDateString('ar')}
              </span>
              <Link href="/select-major">
                <Button size="sm" variant="outline" className="text-xs">جرّب مجالاً آخر</Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Charts */}
        <ReportCharts report={report} />

        {/* Strengths & improvements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {report.strengths?.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-success/15 flex items-center justify-center">
                  <Award className="w-4 h-4 text-success" />
                </div>
                <h3 className="text-base font-bold">نقاط القوة</h3>
              </div>
              <ul className="space-y-3">
                {report.strengths.map((s, i) => (
                  <li key={i} className="text-sm leading-relaxed text-text-secondary">
                    <span className="text-success">•</span> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.improvements?.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-warning/15 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-warning" />
                </div>
                <h3 className="text-base font-bold">مجالات للتحسين</h3>
              </div>
              <ul className="space-y-3">
                {report.improvements.map((s, i) => (
                  <li key={i} className="text-sm leading-relaxed text-text-secondary flex gap-2 items-start">
                    <AlertCircle className="w-3.5 h-3.5 text-warning shrink-0 mt-1" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {report.recommendation && (
          <div className="rounded-2xl border border-accent/30 bg-accent-soft/50 p-6">
            <h3 className="text-base font-bold mb-2 flex items-center gap-2">
              <span className="text-accent">→</span>
              الخطوة التالية الموصى بها
            </h3>
            <p className="text-sm leading-relaxed">{report.recommendation}</p>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="flex justify-end pt-4">
          <Link href="/select-major">
            <Button size="lg" className="px-8 gap-2">
              ابدأ تجربتك
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </main>
    </>
  );
}
