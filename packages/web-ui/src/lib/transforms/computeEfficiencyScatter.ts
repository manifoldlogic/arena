import type { RoundResult } from '@arena/schemas';

export interface ScatterPoint {
  competitor: string;
  calls: number;
  time_s: number;
  round_id: string;
  total: number;
}

/**
 * Extract efficiency scatter data points from round results.
 * Each point is one competitor's performance in one scored round.
 */
export function computeEfficiencyScatter(rounds: RoundResult[]): ScatterPoint[] {
  // 1. Filter to scored, non-calibration
  const scored = rounds.filter(
    (r) => r.source === 'score' && !r.is_calibration,
  );

  // 2. Dedup by (round_id, competitor) keeping last entry
  const deduped = new Map<string, RoundResult>();
  for (const r of scored) {
    deduped.set(`${r.round_id}:${r.competitor}`, r);
  }

  // 3. Map to scatter points
  return [...deduped.values()]
    .map((r) => ({
      competitor: r.competitor,
      calls: r.calls,
      time_s: r.time_s,
      round_id: r.round_id,
      total: r.total ?? 0,
    }))
    .sort((a, b) => a.round_id.localeCompare(b.round_id) || a.competitor.localeCompare(b.competitor));
}
