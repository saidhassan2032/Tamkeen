import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-tamkeen-blue text-white',
        secondary: 'border-transparent bg-tamkeen-surface2 text-tamkeen-text',
        destructive: 'border-transparent bg-tamkeen-red text-white',
        outline: 'border-tamkeen-border text-tamkeen-text',
        success: 'border-transparent bg-tamkeen-green text-white',
        warning: 'border-transparent bg-tamkeen-amber text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
