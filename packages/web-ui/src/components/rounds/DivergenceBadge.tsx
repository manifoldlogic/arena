import type { DivergenceSignal } from '@arena/schemas';
import { cn } from '@/lib/utils';

const BADGE_STYLES: Record<DivergenceSignal, string> = {
  gray: 'bg-slate-100 text-slate-600',
  yellow: 'bg-amber-100 text-amber-700',
  signal: 'bg-red-100 text-red-700',
};

const LABELS: Record<DivergenceSignal, string> = {
  gray: 'Gray',
  yellow: 'Yellow',
  signal: 'Signal',
};

interface DivergenceBadgeProps {
  signal: DivergenceSignal | undefined;
  className?: string;
}

export function DivergenceBadge({ signal, className }: DivergenceBadgeProps) {
  if (!signal) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        BADGE_STYLES[signal],
        className,
      )}
    >
      {LABELS[signal]}
    </span>
  );
}
