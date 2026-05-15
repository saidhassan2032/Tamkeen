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
  Legend,
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

function useThemeColors() {
  const [colors, setColors] = useState({
    brand:    '#1F1B98',
    accent:   '#FF6A00',
    success:  '#16A34A',
    surface:  '#F8F9FB',
    surface2: '#EEF0F6',
    border:   '#E4E5F3',
    muted:    '#6B7280',
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
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  return colors;
}

const GAUGE_META = [
  { key: 'qualityScore',       label: 'الكفاءة التقنية',  color: 'brand'   },
  { key: 'speedScore',         label: 'سرعة الإنجاز',     color: 'success' },
  { key: 'communicationScore', label: 'مهارات التواصل',   color: 'accent'  },
] as const;

function ScoreArc({
  value,
  color,
  bgColor,
  size = 120,
}: {
  value: number;
  color: string;
  bgColor: string;
  size?: number;
}) {
  const r = 44;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - value / 100);

  return (
    <svg width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={bgColor} strokeWidth="9" />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={color}
        strokeWidth="9"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
    </svg>
  );
}

export function ReportCharts({ report }: { report: Report }) {
  const c = useThemeColors();

  const colorMap: Record<string, string> = {
    brand:   c.brand,
    success: c.success,
    accent:  c.accent,
  };

  const taskBars = (report.taskScores ?? [])
    .filter((t) => t.quality != null || t.speed != null || t.communication != null)
    .map((t, i) => ({
      name:  `م${i + 1}`,
      title: t.title,
      جودة:   t.quality       ?? 0,
      سرعة:   t.speed         ?? 0,
      تواصل:  t.communication ?? 0,
      skipped: t.verdict?.includes('تم التخطي') ?? false,
    }));

  return (
    <>
      {/* Gauge cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {GAUGE_META.map(({ key, label, color }) => {
          const val = report[key];
          const fill = colorMap[color];
          return (
            <div
              key={key}
              className="bg-surface border border-border rounded-2xl p-6 flex flex-col items-center gap-3"
            >
              <div className="relative">
                <ScoreArc value={val} color={fill} bgColor={c.surface2} />
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center"
                  style={{ color: fill }}
                >
                  <span className="text-2xl font-bold leading-none">{val}</span>
                  <span className="text-[10px] opacity-60 mt-0.5">%</span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold">{label}</div>
                <div
                  className="text-xs mt-1 font-medium px-2.5 py-0.5 rounded-full"
                  style={{ backgroundColor: `${fill}18`, color: fill }}
                >
                  {val >= 80 ? 'ممتاز' : val >= 65 ? 'جيد جداً' : val >= 50 ? 'مقبول' : 'يحتاج تطوير'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Task-by-task bar chart */}
      {taskBars.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-6 md:p-8">
          <div className="mb-5">
            <h3 className="text-base font-bold">أداؤك في كل مهمة</h3>
            <p className="text-xs text-text-muted mt-1">مقارنة تفصيلية بين المهارات لكل مهمة منجَزة</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={taskBars} margin={{ top: 8, right: 4, left: -12, bottom: 0 }} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false} />
              <XAxis
                dataKey="name"
                stroke={c.muted}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke={c.muted}
                fontSize={12}
                domain={[0, 10]}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: c.surface2, opacity: 0.6, rx: 4 }}
                contentStyle={{
                  backgroundColor: c.surface,
                  border: `1px solid ${c.border}`,
                  borderRadius: 10,
                  fontSize: 12,
                  padding: '8px 12px',
                }}
                labelFormatter={(label, payload) => {
                  const item = payload?.[0]?.payload;
                  const skippedLabel = item?.skipped ? ' (تم التخطي)' : '';
                  return `${item?.title ?? label}${skippedLabel}`;
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
                iconType="circle"
                iconSize={8}
              />
              <Bar dataKey="جودة"  fill={c.brand}   radius={[5, 5, 0, 0]} maxBarSize={24} />
              <Bar dataKey="سرعة"  fill={c.success} radius={[5, 5, 0, 0]} maxBarSize={24} />
              <Bar dataKey="تواصل" fill={c.accent}  radius={[5, 5, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
}
