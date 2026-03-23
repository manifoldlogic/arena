import type { RoundResult } from '@arena/schemas';

export interface BreakdownEntry {
  group: string;
  competitor: string;
  totalScore: number;
  precision: number;
  recall: number;
  insight: number;
}

/**
 * Group scored rounds by a dimension (codebase or query_category)
 * and sum quality scores per competitor within each group.
 */
export function computeCodebaseBreakdown(
  rounds: RoundResult[],
  groupBy: 'codebase' | 'query_category' = 'codebase',
): BreakdownEntry[] {
  // 1. Filter to scored, non-calibration
  const scored = rounds.filter(
    (r) => r.source === 'score' && !r.is_calibration,
  );

  // 2. Dedup by (round_id, competitor) keeping last entry
  const deduped = new Map<string, RoundResult>();
  for (const r of scored) {
    deduped.set(`${r.round_id}:${r.competitor}`, r);
  }

  // 3. Group by (dimension, competitor) and sum
  const groups = new Map<string, BreakdownEntry>();
  for (const r of deduped.values()) {
    const groupValue = groupBy === 'codebase' ? r.codebase : (r.query_category ?? 'unknown');
    const key = `${groupValue}:${r.competitor}`;

    const entry = groups.get(key) ?? {
      group: groupValue,
      competitor: r.competitor,
      totalScore: 0,
      precision: 0,
      recall: 0,
      insight: 0,
    };

    entry.totalScore += r.total ?? 0;
    entry.precision += r.precision ?? 0;
    entry.recall += r.recall ?? 0;
    entry.insight += r.insight ?? 0;
    groups.set(key, entry);
  }

  // 4. Sort by group then competitor for deterministic output
  return [...groups.values()].sort(
    (a, b) => a.group.localeCompare(b.group) || a.competitor.localeCompare(b.competitor),
  );
}
