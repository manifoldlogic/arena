/**
 * Standings engine — computes CompetitorStanding from scored RoundResult[].
 *
 * Matches the Python pipeline algorithm exactly:
 * - Group results by round_id
 * - In each round, competitor(s) with the max total get a WIN
 * - If multiple competitors tie at max, ALL get a WIN (not a TIE)
 * - Everyone else gets a LOSS
 * - Ties field counts rounds where a competitor tied with another at max
 *   (i.e., shared the win — only applies when 2+ share the highest score)
 */
import type { RoundResult, CompetitorStanding } from "@arena/schemas";

interface RoundGroup {
  roundId: string;
  entries: RoundResult[];
}

/** Group round results by round_id. */
function groupByRound(rounds: RoundResult[]): RoundGroup[] {
  const map = new Map<string, RoundResult[]>();
  for (const r of rounds) {
    const existing = map.get(r.round_id);
    if (existing) {
      existing.push(r);
    } else {
      map.set(r.round_id, [r]);
    }
  }
  return Array.from(map.entries()).map(([roundId, entries]) => ({
    roundId,
    entries,
  }));
}

/**
 * Compute overall standings from scored (non-calibration) rounds.
 * Returns standings sorted by total descending, then avg descending.
 */
export function computeStandings(
  scoredRounds: RoundResult[],
): CompetitorStanding[] {
  const stats = new Map<
    string,
    { total: number; wins: number; ties: number; losses: number; rounds: number }
  >();

  const ensure = (c: string) => {
    if (!stats.has(c)) {
      stats.set(c, { total: 0, wins: 0, ties: 0, losses: 0, rounds: 0 });
    }
    return stats.get(c)!;
  };

  const groups = groupByRound(scoredRounds);

  for (const { entries } of groups) {
    // Find max total in this round
    const maxTotal = Math.max(...entries.map((e) => e.total ?? 0));

    // Count how many competitors achieved max
    const winnersCount = entries.filter(
      (e) => (e.total ?? 0) === maxTotal,
    ).length;

    for (const entry of entries) {
      const s = ensure(entry.competitor);
      s.total += entry.total ?? 0;
      s.rounds += 1;

      const entryTotal = entry.total ?? 0;
      if (entryTotal === maxTotal) {
        if (winnersCount > 1) {
          // Tied at max — both get WIN and TIE
          s.wins += 1;
          s.ties += 1;
        } else {
          // Sole winner
          s.wins += 1;
        }
      } else {
        s.losses += 1;
      }
    }
  }

  const standings: CompetitorStanding[] = [];
  for (const [competitor, s] of stats) {
    standings.push({
      competitor,
      total: s.total,
      wins: s.wins,
      ties: s.ties,
      losses: s.losses,
      rounds: s.rounds,
      avg: s.rounds > 0 ? Math.round((s.total / s.rounds) * 100) / 100 : 0,
    });
  }

  // Sort: total desc, then avg desc
  standings.sort((a, b) => b.total - a.total || b.avg - a.avg);

  return standings;
}

/**
 * Compute standings filtered to a specific codebase.
 */
export function computeStandingsByCodebase(
  scoredRounds: RoundResult[],
  codebase: string,
): CompetitorStanding[] {
  return computeStandings(scoredRounds.filter((r) => r.codebase === codebase));
}

/**
 * Compute standings filtered to a specific query category.
 */
export function computeStandingsByCategory(
  scoredRounds: RoundResult[],
  category: string,
): CompetitorStanding[] {
  return computeStandings(
    scoredRounds.filter((r) => r.query_category === category),
  );
}

/** Get unique codebases from rounds. */
export function getCodebases(rounds: RoundResult[]): string[] {
  return [...new Set(rounds.map((r) => r.codebase))].sort();
}

/** Get unique query categories from rounds. */
export function getCategories(rounds: RoundResult[]): string[] {
  return [
    ...new Set(
      rounds.map((r) => r.query_category).filter((c): c is string => c != null),
    ),
  ].sort();
}
