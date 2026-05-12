import { headers } from 'next/headers';
import Link from 'next/link';
import { ReportCharts } from '@/components/report/ReportCharts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/brand/Logo';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Award, TrendingUp, AlertCircle, MessageCircle, CheckCircle2 } from 'lucide-react';

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
  const res = await fetch(`${base}/api/reports/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

const FEEDBACK_LABEL: Record<string, string> = {
  manager: 'رأي المدير',
  colleague_1: 'رأي الزميل الأول',
  colleague_2: 'رأي الزميل الثاني',
};

function scoreVerdict(score: number) {
  if (score >= 80) return { emoji: '🌟', label: 'أداء ممتاز' };
  if (score >= 65) return { emoji: '👍', label: 'أداء جيد' };
  return { emoji: '💡', label: 'فيه مجال للتحسين' };
}

export default async function ReportPage({ params }: { params: { reportId: string } }) {
  const report = await fetchReport(params.reportId);

  if (!report || report.error) {
    return (
      <main className="min-h-screen bg-bg text-text flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-danger mb-4">تعذّر تحميل التقرير</div>
          <Link href="/">
            <Button variant="outline">العودة للرئيسية</Button>
          </Link>
        </div>
      </main>
    );
  }

  const verdict = scoreVerdict(report.overallScore);

  return (
    <main className="min-h-screen bg-bg text-text">
      <nav className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo asLink withWordmark size={44} />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/select-major">
              <Button size="sm" variant="outline">تجربة جديدة</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        {/* Hero score card */}
        <Card className="relative overflow-hidden p-10 text-center">
          <div className="absolute inset-0 brand-glow pointer-events-none" />
          <div className="relative">
            <Badge variant="secondary" className="mb-6">تقرير الأداء</Badge>
            <div className="text-5xl mb-3">{verdict.emoji}</div>
            <div className="text-6xl md:text-7xl font-bold text-brand mb-2 tabular-nums">
              {report.overallScore}
              <span className="text-2xl text-text-muted">%</span>
            </div>
            <div className="text-sm text-text-muted mb-6">{verdict.label}</div>
            <p className="text-text-secondary max-w-xl mx-auto leading-relaxed text-sm">
              {report.verdict}
            </p>
          </div>
        </Card>

        <ReportCharts report={report} />

        {report.strengths?.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-success/15 flex items-center justify-center">
                <Award className="w-4 h-4 text-success" />
              </div>
              <h3 className="text-base font-semibold">نقاط القوة</h3>
            </div>
            <ul className="space-y-3">
              {report.strengths.map((s, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  <span className="text-sm leading-relaxed">{s}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {report.improvements?.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-warning/15 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-warning" />
              </div>
              <h3 className="text-base font-semibold">مجالات للتحسين</h3>
            </div>
            <ul className="space-y-3">
              {report.improvements.map((s, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <span className="text-sm leading-relaxed">{s}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {Object.keys(report.agentFeedbacks ?? {}).length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-brand-soft flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-brand" />
              </div>
              <h3 className="text-base font-semibold">آراء الفريق</h3>
            </div>
            <div className="space-y-3">
              {Object.entries(report.agentFeedbacks).map(([key, value]) => (
                <div key={key} className="p-4 rounded-lg bg-surface2 border border-border">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-text-muted mb-2">
                    {FEEDBACK_LABEL[key] ?? key}
                  </div>
                  <p className="text-sm leading-relaxed">{value}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {report.recommendation && (
          <Card className="p-6 border-accent/30 bg-accent-soft/50">
            <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
              <span className="text-accent">→</span>
              الخطوة التالية الموصى بها
            </h3>
            <p className="text-sm leading-relaxed">{report.recommendation}</p>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Link href="/select-major" className="flex-1">
            <Button className="w-full" size="lg">جرّب مساراً آخر</Button>
          </Link>
          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full" size="lg">العودة للرئيسية</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
