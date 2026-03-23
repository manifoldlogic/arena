import type { RoundResult } from '@arena/schemas';

export interface StreakInfo {
  competitor: string;
  currentStreak: number;
  streakType: 'win' | 'loss' | 'tie';
  longestWinStreak: number;
  comebacks: number;
}

/**
 * Compute streak and momentum data from round results.
 *
 * Filters to scored, non-calibration rounds, deduplicates by
 * (round_id, competitor) keeping the latest entry, sorts
 * chronologically, then computes per-competitor streaks.
 *
 * A "comeback" is a win that directly follows a loss (ties don't count
 * as either side of a comeback).
 */
export function computeStreaks(rounds: RoundResult[]): StreakInfo[] {
  // 1. Filter to scored, non-calibration rounds
  const scored = rounds.filter(
    (r) => r.source === 'score' && !r.is_calibration,
  );

  // 2. Dedup by (round_id, competitor) keeping last entry
  const deduped = new Map<string, RoundResult>();
  for (const r of scored) {
    deduped.set(`${r.round_id}:${r.competitor}`, r);
  }

  // 3. Sort chronologically by timestamp, then round_id as fallback
  const sorted = [...deduped.values()].sort((a, b) => {
    if (a.timestamp && b.timestamp) {
      return a.timestamp.localeCompare(b.timestamp);
    }
    return a.round_id.localeCompare(b.round_id);
  });

  // 4. Group by competitor, preserving chronological order
  const byCompetitor = new Map<string, RoundResult[]>();
  for (const r of sorted) {
    const list = byCompetitor.get(r.competitor) ?? [];
    list.push(r);
    byCompetitor.set(r.competitor, list);
  }

  // 5. Compute streaks per competitor
  const streaks: StreakInfo[] = [];
  for (const [competitor, results] of byCompetitor) {
    let currentStreak = 0;
    let streakType: 'win' | 'loss' | 'tie' = 'tie';
    let longestWinStreak = 0;
    let currentWinStreak = 0;
    let comebacks = 0;
    let lastNonTieOutcome: 'win' | 'loss' | null = null;

    for (const r of results) {
      const outcome = getOutcome(r, competitor);

      if (outcome === streakType) {
        currentStreak++;
      } else {
        streakType = outcome;
        currentStreak = 1;
      }

      if (outcome === 'win') {
        currentWinStreak++;
        if (currentWinStreak > longestWinStreak) {
          longestWinStreak = currentWinStreak;
        }
        if (lastNonTieOutcome === 'loss') {
          comebacks++;
        }
        lastNonTieOutcome = 'win';
      } else {
        currentWinStreak = 0;
        if (outcome === 'loss') {
          lastNonTieOutcome = 'loss';
        }
      }
    }

    streaks.push({
      competitor,
      currentStreak,
      streakType,
      longestWinStreak,
      comebacks,
    });
  }

  return streaks;
}

function getOutcome(
  r: RoundResult,
  competitor: string,
): 'win' | 'loss' | 'tie' {
  if (r.round_winner === competitor) return 'win';
  if (r.round_winner == null || r.round_winner === 'tie') return 'tie';
  return 'loss';
}
