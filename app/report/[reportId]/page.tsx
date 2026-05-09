import { headers } from 'next/headers';
import Link from 'next/link';
import { ReportCharts } from '@/components/report/ReportCharts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

function ScoreEmoji({ score }: { score: number }) {
  if (score >= 80) return <span>🌟</span>;
  if (score >= 65) return <span>👍</span>;
  return <span>💡</span>;
}

export default async function ReportPage({ params }: { params: { reportId: string } }) {
  const report = await fetchReport(params.reportId);

  if (!report || report.error) {
    return (
      <main className="min-h-screen bg-tamkeen-bg text-tamkeen-text flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-tamkeen-red mb-4">تعذّر تحميل التقرير</div>
          <Link href="/">
            <Button variant="outline">العودة للرئيسية</Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-tamkeen-bg text-tamkeen-text">
      <nav className="border-b border-tamkeen-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-tamkeen-blue to-tamkeen-green flex items-center justify-center font-bold">
              ت
            </div>
            <span className="text-lg font-semibold">تمكين</span>
          </Link>
          <Link href="/select-major">
            <Button size="sm" variant="outline">
              تجربة جديدة
            </Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <Card className="p-8 text-center bg-gradient-to-br from-tamkeen-surface to-tamkeen-surface2">
          <Badge variant="secondary" className="mb-4">
            تقرير الأداء
          </Badge>
          <div className="text-7xl mb-2">
            <ScoreEmoji score={report.overallScore} />
          </div>
          <div className="text-6xl font-bold gradient-text mb-3">{report.overallScore}%</div>
          <p className="text-tamkeen-muted max-w-xl mx-auto leading-relaxed">{report.verdict}</p>
        </Card>

        <ReportCharts report={report} />

        {report.strengths?.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-tamkeen-green" />
              <h3 className="text-lg font-semibold">نقاط القوة</h3>
            </div>
            <ul className="space-y-3">
              {report.strengths.map((s, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <CheckCircle2 className="w-5 h-5 text-tamkeen-green shrink-0 mt-0.5" />
                  <span className="text-sm leading-relaxed">{s}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {report.improvements?.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-tamkeen-amber" />
              <h3 className="text-lg font-semibold">مجالات للتحسين</h3>
            </div>
            <ul className="space-y-3">
              {report.improvements.map((s, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <AlertCircle className="w-5 h-5 text-tamkeen-amber shrink-0 mt-0.5" />
                  <span className="text-sm leading-relaxed">{s}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {Object.keys(report.agentFeedbacks ?? {}).length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="w-5 h-5 text-tamkeen-blue" />
              <h3 className="text-lg font-semibold">آراء الفريق</h3>
            </div>
            <div className="space-y-4">
              {Object.entries(report.agentFeedbacks).map(([key, value]) => (
                <div key={key} className="p-4 rounded-lg bg-tamkeen-surface2 border border-tamkeen-border">
                  <div className="text-xs font-semibold text-tamkeen-muted mb-2">
                    {FEEDBACK_LABEL[key] ?? key}
                  </div>
                  <p className="text-sm leading-relaxed">{value}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {report.recommendation && (
          <Card className="p-6 border-tamkeen-blue/40 bg-tamkeen-blue/5">
            <h3 className="text-lg font-semibold mb-2">🎯 الخطوة التالية الموصى بها</h3>
            <p className="text-sm leading-relaxed">{report.recommendation}</p>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Link href="/select-major" className="flex-1">
            <Button className="w-full" size="lg">
              جرّب مساراً آخر
            </Button>
          </Link>
          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full" size="lg">
              العودة للرئيسية
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
