import type { RoundResult, CompetitorStanding } from '@arena/schemas';
import { computeQAS } from './computeQAS';

/**
 * Compute overall standings from round results.
 *
 * Filters to scored, non-calibration rounds, deduplicates by
 * (round_id, competitor) keeping the latest entry, then aggregates
 * per competitor.
 *
 * When maxCallsMap is provided, also computes aggregate QAS per competitor.
 */
export function computeStandings(
  rounds: RoundResult[],
  maxCallsMap?: Record<string, number>,
): CompetitorStanding[] {
  // 1. Filter to scored, non-calibration rounds
  const scored = rounds.filter(
    (r) => r.source === 'score' && !r.is_calibration,
  );

  // 2. Dedup by (round_id, competitor) keeping last entry
  const deduped = new Map<string, RoundResult>();
  for (const r of scored) {
    deduped.set(`${r.round_id}:${r.competitor}`, r);
  }

  // 3. Group by competitor
  const byCompetitor = new Map<string, RoundResult[]>();
  for (const r of deduped.values()) {
    const list = byCompetitor.get(r.competitor) ?? [];
    list.push(r);
    byCompetitor.set(r.competitor, list);
  }

  // 4. Aggregate
  const standings: CompetitorStanding[] = [];
  for (const [competitor, results] of byCompetitor) {
    const totalScore = results.reduce((sum, r) => sum + (r.total ?? 0), 0);
    const wins = results.filter((r) => r.round_winner === competitor).length;
    const ties = results.filter(
      (r) => r.round_winner == null || r.round_winner === 'tie',
    ).length;
    const losses = results.length - wins - ties;

    const maxCalls = maxCallsMap?.[competitor];
    const qas =
      maxCalls != null
        ? results.reduce(
            (sum, r) => sum + computeQAS(r.total ?? 0, r.calls, maxCalls),
            0,
          )
        : undefined;

    standings.push({
      competitor,
      total: totalScore,
      wins,
      ties,
      losses,
      rounds: results.length,
      avg: results.length > 0 ? totalScore / results.length : 0,
      qas,
    });
  }

  // 5. Sort: total desc, then avg desc as tiebreaker
  standings.sort((a, b) => b.total - a.total || b.avg - a.avg);

  return standings;
}
