import type { StreakInfo } from '@/lib/transforms';
import { cn } from '@/lib/utils';

interface Props {
  streaks: StreakInfo[];
  className?: string;
}

const BANNER_STYLES = {
  win: 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30',
  loss: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30',
  tie: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30',
} as const;

const BANNER_TEXT = {
  win: 'text-emerald-700 dark:text-emerald-400',
  loss: 'text-red-700 dark:text-red-400',
  tie: 'text-amber-700 dark:text-amber-400',
} as const;

const STREAK_LABEL = {
  win: 'winning',
  loss: 'losing',
  tie: 'tie',
} as const;

/**
 * Shows the most notable active streak across all competitors.
 * Picks the longest current win streak, falling back to longest active streak of any type.
 */
export function StreakBanner({ streaks, className }: Props) {
  if (streaks.length === 0) return null;

  const best = pickBestStreak(streaks);
  if (!best || best.currentStreak === 0) return null;

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        BANNER_STYLES[best.streakType],
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl font-bold tabular-nums">
          {best.currentStreak}
        </span>
        <div>
          <p className={cn('text-sm font-semibold', BANNER_TEXT[best.streakType])}>
            {best.competitor} is on a {best.currentStreak}-round {STREAK_LABEL[best.streakType]} streak
          </p>
          {best.longestWinStreak > best.currentStreak && (
            <p className="text-xs text-muted-foreground">
              Longest win streak: {best.longestWinStreak}
            </p>
          )}
          {best.comebacks > 0 && (
            <p className="text-xs text-muted-foreground">
              {best.comebacks} comeback{best.comebacks !== 1 ? 's' : ''} this competition
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function pickBestStreak(streaks: StreakInfo[]): StreakInfo | null {
  // Prefer the longest active win streak
  const winStreaks = streaks.filter((s) => s.streakType === 'win' && s.currentStreak > 0);
  if (winStreaks.length > 0) {
    return winStreaks.reduce((a, b) => (a.currentStreak >= b.currentStreak ? a : b));
  }
  // Otherwise, the longest active streak of any type
  const active = streaks.filter((s) => s.currentStreak > 0);
  if (active.length === 0) return null;
  return active.reduce((a, b) => (a.currentStreak >= b.currentStreak ? a : b));
}
