'use client';

import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface TaskScore {
  title: string;
  quality?: number | null;
  speed?: number | null;
  communication?: number | null;
  verdict?: string | null;
}

interface Report {
  qualityScore: number;
  speedScore: number;
  communicationScore: number;
  taskScores?: TaskScore[];
}

export function ReportCharts({ report }: { report: Report }) {
  const gaugeData = [
    { name: 'جودة العمل', value: report.qualityScore, fill: '#388BFD' },
    { name: 'سرعة الإنجاز', value: report.speedScore, fill: '#3FB950' },
    { name: 'التواصل', value: report.communicationScore, fill: '#D29922' },
  ];

  const taskBars = (report.taskScores ?? [])
    .filter((t) => t.quality != null || t.speed != null || t.communication != null)
    .map((t, i) => ({
      name: `م${i + 1}`,
      title: t.title,
      جودة: t.quality ?? 0,
      سرعة: t.speed ?? 0,
      تواصل: t.communication ?? 0,
      skipped: t.verdict?.includes('تم التخطي') ?? false,
    }));

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {gaugeData.map((item) => (
          <div
            key={item.name}
            className="bg-tamkeen-surface border border-tamkeen-border rounded-xl p-4 text-center"
          >
            <ResponsiveContainer width="100%" height={140}>
              <RadialBarChart
                innerRadius="60%"
                outerRadius="100%"
                data={[item]}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar dataKey="value" cornerRadius={6} fill={item.fill} background={{ fill: '#21262D' }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="text-2xl font-bold mt-1" style={{ color: item.fill }}>
              {item.value}%
            </div>
            <div className="text-sm text-tamkeen-muted mt-1">{item.name}</div>
          </div>
        ))}
      </div>

      {taskBars.length > 0 && (
        <div className="bg-tamkeen-surface border border-tamkeen-border rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">أداؤك في كل مهمة</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={taskBars} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
              <XAxis dataKey="name" stroke="#8B949E" fontSize={12} />
              <YAxis stroke="#8B949E" fontSize={12} domain={[0, 100]} />
              <Tooltip
                cursor={{ fill: 'rgba(56, 139, 253, 0.1)' }}
                contentStyle={{
                  backgroundColor: '#161B22',
                  border: '1px solid #30363D',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={(label, payload) => {
                  const item = payload?.[0]?.payload;
                  const skippedLabel = item?.skipped ? ' (تم التخطي)' : '';
                  return `${item?.title ?? label}${skippedLabel}`;
                }}
              />
              <Bar dataKey="جودة" fill="#388BFD" radius={[4, 4, 0, 0]} />
              <Bar dataKey="سرعة" fill="#3FB950" radius={[4, 4, 0, 0]} />
              <Bar dataKey="تواصل" fill="#D29922" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
}
