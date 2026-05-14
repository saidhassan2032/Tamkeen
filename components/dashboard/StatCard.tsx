import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface Props {
  value: number;
  label: string;
  description?: string;
  /** "brand" (navy) | "accent" (orange) | "deep" (deep brand) */
  color?: 'brand' | 'accent' | 'deep';
  Icon?: LucideIcon;
}

const PALETTE = {
  brand: {
    text:  'text-brand',
    chip:  'bg-brand/10 text-brand',
    bar:   'bg-brand',
    track: 'bg-brand/15',
  },
  accent: {
    text:  'text-accent',
    chip:  'bg-accent/10 text-accent',
    bar:   'bg-accent',
    track: 'bg-accent/20',
  },
  deep: {
    text:  'text-text',
    chip:  'bg-text/10 text-text',
    bar:   'bg-text',
    track: 'bg-text/15',
  },
};

export function StatCard({ value, label, description, color = 'brand', Icon }: Props) {
  const c = PALETTE[color];
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 md:p-6 relative overflow-hidden">
      <div className="flex items-start justify-between mb-4">
        <div className={cn('text-4xl md:text-5xl font-bold tabular-nums', c.text)}>
          {value}
          <span className="text-2xl">%</span>
        </div>
        {Icon && (
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', c.chip)}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="text-sm font-semibold mb-1.5">{label}</div>
      {description && (
        <p className="text-xs text-text-muted leading-relaxed line-clamp-2">{description}</p>
      )}
      <div className={cn('mt-4 h-1 w-full rounded-full overflow-hidden', c.track)}>
        <div
          className={cn('h-full rounded-full', c.bar)}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
