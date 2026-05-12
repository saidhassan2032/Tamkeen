'use client';

import { useEffect, useState } from 'react';
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

// Read CSS variables at runtime so charts auto-adapt to light/dark mode.
function useThemeColors() {
  const [colors, setColors] = useState({
    brand: '#1F1B98',
    accent: '#FF6A00',
    success: '#16A34A',
    surface: '#F8F9FB',
    surface2: '#EEF0F6',
    border: '#E4E5F3',
    muted: '#6B7280',
  });

  useEffect(() => {
    const read = () => {
      const cs = getComputedStyle(document.documentElement);
      const v = (name: string) => `hsl(${cs.getPropertyValue(name).trim()})`;
      setColors({
        brand:    v('--brand'),
        accent:   v('--accent'),
        success:  v('--success'),
        surface:  v('--surface'),
        surface2: v('--surface-2'),
        border:   v('--border'),
        muted:    v('--text-muted'),
      });
    };
    read();
    // Re-read on theme change
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  return colors;
}

export function ReportCharts({ report }: { report: Report }) {
  const c = useThemeColors();

  const gaugeData = [
    { name: 'جودة العمل',    value: report.qualityScore,       fill: c.brand },
    { name: 'سرعة الإنجاز',  value: report.speedScore,         fill: c.success },
    { name: 'التواصل',        value: report.communicationScore, fill: c.accent },
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
            className="bg-surface border border-border rounded-xl p-5 text-center"
          >
            <ResponsiveContainer width="100%" height={140}>
              <RadialBarChart
                innerRadius="65%"
                outerRadius="100%"
                data={[item]}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar dataKey="value" cornerRadius={8} fill={item.fill} background={{ fill: c.surface2 }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="text-2xl font-bold mt-1" style={{ color: item.fill }}>
              {item.value}%
            </div>
            <div className="text-xs text-text-muted mt-1">{item.name}</div>
          </div>
        ))}
      </div>

      {taskBars.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="text-base font-semibold mb-4">أداؤك في كل مهمة</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={taskBars} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.border} />
              <XAxis dataKey="name" stroke={c.muted} fontSize={12} />
              <YAxis stroke={c.muted} fontSize={12} domain={[0, 100]} />
              <Tooltip
                cursor={{ fill: c.surface2, opacity: 0.5 }}
                contentStyle={{
                  backgroundColor: c.surface,
                  border: `1px solid ${c.border}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={(label, payload) => {
                  const item = payload?.[0]?.payload;
                  const skippedLabel = item?.skipped ? ' (تم التخطي)' : '';
                  return `${item?.title ?? label}${skippedLabel}`;
                }}
              />
              <Bar dataKey="جودة" fill={c.brand}   radius={[6, 6, 0, 0]} />
              <Bar dataKey="سرعة" fill={c.success} radius={[6, 6, 0, 0]} />
              <Bar dataKey="تواصل" fill={c.accent}  radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
}
