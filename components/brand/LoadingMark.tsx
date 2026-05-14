'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeProvider';

interface Props {
  size?: number;
  className?: string;
  label?: string;
}

/**
 * Branded loading indicator — uses the glowing mark and gently pulses.
 * Replace generic <Loader2 className="animate-spin" /> with this for full-page loads.
 * In dark mode the white mark variant is used instead of the glowing mark.
 */
export function LoadingMark({ size = 96, className, label }: Props) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
      <Image
        src={isDark ? '/white_mark.png' : '/mark-glow.png'}
        alt=""
        width={size}
        height={size}
        priority
        className="mark-pulse select-none drop-shadow-[0_0_24px_hsl(var(--accent)/0.45)]"
      />
      {label && <p className="text-sm text-text-muted">{label}</p>}
    </div>
  );
}
