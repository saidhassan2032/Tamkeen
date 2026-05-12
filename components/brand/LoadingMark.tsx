import Image from 'next/image';
import { cn } from '@/lib/utils';

interface Props {
  size?: number;
  className?: string;
  label?: string;
}

/**
 * Branded loading indicator — uses the glowing mark and gently pulses.
 * Replace generic <Loader2 className="animate-spin" /> with this for full-page loads.
 */
export function LoadingMark({ size = 96, className, label }: Props) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
      <Image
        src="/mark-glow.png"
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
