import type { RoundResult } from '@arena/schemas';

export interface TimelinePoint {
  round_id: string;
  [competitor: string]: number | string;
}

/**
 * Compute cumulative score timeline for each competitor over rounds.
 *
 * Rounds are sorted by timestamp (falling back to round_id).
 * If a competitor has no result for a round, their cumulative score
 * carries forward (flat segment, no gap).
 */
export function computeScoreTimeline(rounds: RoundResult[]): TimelinePoint[] {
  // 1. Filter to scored, non-calibration
  const scored = rounds.filter(
    (r) => r.source === 'score' && !r.is_calibration,
  );

  if (scored.length === 0) return [];

  // 2. Dedup by (round_id, competitor) keeping last entry
  const deduped = new Map<string, RoundResult>();
  for (const r of scored) {
    deduped.set(`${r.round_id}:${r.competitor}`, r);
  }
  const results = Array.from(deduped.values());

  // 3. Collect all competitors
  const competitors = [...new Set(results.map((r) => r.competitor))];

  // 4. Collect unique round_ids in order (by timestamp, then round_id)
  const roundOrder = new Map<string, string>(); // round_id -> sort key
  for (const r of results) {
    const existing = roundOrder.get(r.round_id);
    const key = r.timestamp ?? r.round_id;
    if (!existing || key > existing) {
      roundOrder.set(r.round_id, key);
    }
  }
  const sortedRoundIds = [...roundOrder.entries()]
    .sort((a, b) => (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0))
    .map(([id]) => id);

  // 5. Index scores by (round_id, competitor)
  const scoreMap = new Map<string, number>();
  for (const r of results) {
    scoreMap.set(`${r.round_id}:${r.competitor}`, r.total ?? 0);
  }

  // 6. Build cumulative timeline
  const cumulative: Record<string, number> = {};
  for (const c of competitors) {
    cumulative[c] = 0;
  }

  const timeline: TimelinePoint[] = [];
  for (const roundId of sortedRoundIds) {
    for (const c of competitors) {
      const score = scoreMap.get(`${roundId}:${c}`);
      if (score !== undefined) {
        cumulative[c] += score;
      }
      // If no score for this round, cumulative carries forward
    }
    const point: TimelinePoint = { round_id: roundId };
    for (const c of competitors) {
      point[c] = cumulative[c];
    }
    timeline.push(point);
  }

  return timeline;
}
