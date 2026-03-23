import type { DivergenceSignal, QueryDifficulty } from '@arena/schemas';
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
  difficulty?: QueryDifficulty;
  className?: string;
}

export function DivergenceBadge({ signal, difficulty, className }: DivergenceBadgeProps) {
  if (!signal) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        BADGE_STYLES[signal],
        className,
      )}
    >
      {LABELS[signal]}
      {difficulty && (
        <DifficultyBadge difficulty={difficulty} />
      )}
    </span>
  );
}

const DIFFICULTY_STYLES: Record<QueryDifficulty, string> = {
  breadth: 'bg-blue-100 text-blue-700',
  depth: 'bg-purple-100 text-purple-700',
  constrained: 'bg-orange-100 text-orange-700',
};

const DIFFICULTY_LABELS: Record<QueryDifficulty, string> = {
  breadth: 'Breadth',
  depth: 'Depth',
  constrained: 'Constrained',
};

interface DifficultyBadgeProps {
  difficulty: QueryDifficulty;
  className?: string;
}

export function DifficultyBadge({ difficulty, className }: DifficultyBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        DIFFICULTY_STYLES[difficulty],
        className,
      )}
    >
      {DIFFICULTY_LABELS[difficulty]}
    </span>
  );
}
