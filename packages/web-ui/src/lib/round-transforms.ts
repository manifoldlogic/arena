/**
 * Pure transform functions for round analysis data.
 *
 * All functions are side-effect-free and operate on RoundResult arrays.
 */
import type {
  RoundResult,
  QueryCategory,
} from '@arena/schemas';

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

/** A single axis on a radar chart. */
export interface RadarDataPoint {
  axis: string;
  value: number;
}

/** One competitor's radar series. */
export interface RadarSeries {
  competitor: string;
  dataPoints: RadarDataPoint[];
}

/** Per-round margin between two competitors. */
export interface MarginDataPoint {
  roundId: string;
  codebase: string;
  margin: number; // positive = competitorA leads
  competitorA: string;
  competitorB: string;
}

/** Averaged dimension scores for a head-to-head pair. */
export interface H2HAverages {
  competitorA: string;
  competitorB: string;
  avgA: { precision: number; recall: number; insight: number; total: number };
  avgB: { precision: number; recall: number; insight: number; total: number };
  roundCount: number;
}

/** One row in the category performance matrix. */
export interface CategoryMatrixRow {
  category: QueryCategory;
  avgA: number;
  avgB: number;
  advantage: number; // positive = A leads
  roundCount: number;
}

/** Delta between bridge series scores and baseline. */
export interface BridgeDelta {
  roundId: string;
  competitor: string;
  codebase: string;
  deltas: { precision: number; recall: number; insight: number };
}

/** A group of RoundResults sharing the same round_id. */
export interface RoundGroup {
  roundId: string;
  codebase: string;
  roundType: RoundResult['round_type'];
  results: RoundResult[];
}

// ---------------------------------------------------------------------------
// groupRoundsByRoundId
// ---------------------------------------------------------------------------

/**
 * Groups round results by round_id.
 *
 * Dedup rule: when multiple entries exist for the same (round_id, competitor)
 * pair, prefer the one with source="score" over source="agent". If both have
 * the same source, keep the last one encountered.
 */
export function groupRoundsByRoundId(rounds: RoundResult[]): RoundGroup[] {
  const groupMap = new Map<string, {
    codebase: string;
    roundType: RoundResult['round_type'];
    resultMap: Map<string, RoundResult>;
  }>();

  for (const r of rounds) {
    let group = groupMap.get(r.round_id);
    if (!group) {
      group = {
        codebase: r.codebase,
        roundType: r.round_type,
        resultMap: new Map(),
      };
      groupMap.set(r.round_id, group);
    }

    const existing = group.resultMap.get(r.competitor);
    if (!existing) {
      group.resultMap.set(r.competitor, r);
    } else if (existing.source !== 'score' && r.source === 'score') {
      // Prefer source="score"
      group.resultMap.set(r.competitor, r);
    } else if (existing.source === r.source) {
      // Same source — keep last
      group.resultMap.set(r.competitor, r);
    }
    // else: existing is "score" and r is "agent" — keep existing
  }

  return Array.from(groupMap.entries()).map(([roundId, g]) => ({
    roundId,
    codebase: g.codebase,
    roundType: g.roundType,
    results: Array.from(g.resultMap.values()),
  }));
}

// ---------------------------------------------------------------------------
// computeRadarData
// ---------------------------------------------------------------------------

/**
 * Converts an array of RoundResults (for one or more competitors in a single
 * round or averaged across rounds) into radar chart series.
 *
 * Each competitor gets a series with axes: precision, recall, insight.
 * Entries without scores (source="agent" with no judging) are skipped.
 */
export function computeRadarData(results: RoundResult[]): RadarSeries[] {
  const axes = ['precision', 'recall', 'insight'] as const;
  const byCompetitor = new Map<string, RoundResult[]>();

  for (const r of results) {
    if (r.precision == null || r.recall == null || r.insight == null) continue;
    const list = byCompetitor.get(r.competitor) ?? [];
    list.push(r);
    byCompetitor.set(r.competitor, list);
  }

  return Array.from(byCompetitor.entries()).map(([competitor, entries]) => ({
    competitor,
    dataPoints: axes.map((axis) => ({
      axis,
      value:
        entries.reduce((sum, e) => sum + (e[axis] ?? 0), 0) / entries.length,
    })),
  }));
}

// ---------------------------------------------------------------------------
// computeH2HAverages
// ---------------------------------------------------------------------------

/**
 * Computes averaged dimension scores for two competitors across all rounds
 * where they both have scored results.
 */
export function computeH2HAverages(
  rounds: RoundResult[],
  competitorA: string,
  competitorB: string,
): H2HAverages | null {
  const groups = groupRoundsByRoundId(rounds);

  const sharedRounds: { a: RoundResult; b: RoundResult }[] = [];

  for (const group of groups) {
    const a = group.results.find(
      (r) => r.competitor === competitorA && r.total != null,
    );
    const b = group.results.find(
      (r) => r.competitor === competitorB && r.total != null,
    );
    if (a && b) sharedRounds.push({ a, b });
  }

  if (sharedRounds.length === 0) return null;

  const sum = (items: RoundResult[], key: 'precision' | 'recall' | 'insight' | 'total') =>
    items.reduce((s, r) => s + (r[key] ?? 0), 0) / items.length;

  const aResults = sharedRounds.map((s) => s.a);
  const bResults = sharedRounds.map((s) => s.b);

  return {
    competitorA,
    competitorB,
    avgA: {
      precision: sum(aResults, 'precision'),
      recall: sum(aResults, 'recall'),
      insight: sum(aResults, 'insight'),
      total: sum(aResults, 'total'),
    },
    avgB: {
      precision: sum(bResults, 'precision'),
      recall: sum(bResults, 'recall'),
      insight: sum(bResults, 'insight'),
      total: sum(bResults, 'total'),
    },
    roundCount: sharedRounds.length,
  };
}

// ---------------------------------------------------------------------------
// computeMargins
// ---------------------------------------------------------------------------

/**
 * Computes per-round score margins between two competitors.
 * Positive margin = competitorA scored higher.
 */
export function computeMargins(
  rounds: RoundResult[],
  competitorA: string,
  competitorB: string,
): MarginDataPoint[] {
  const groups = groupRoundsByRoundId(rounds);
  const margins: MarginDataPoint[] = [];

  for (const group of groups) {
    const a = group.results.find(
      (r) => r.competitor === competitorA && r.total != null,
    );
    const b = group.results.find(
      (r) => r.competitor === competitorB && r.total != null,
    );
    if (a && b) {
      margins.push({
        roundId: group.roundId,
        codebase: group.codebase,
        margin: (a.total ?? 0) - (b.total ?? 0),
        competitorA,
        competitorB,
      });
    }
  }

  return margins;
}

// ---------------------------------------------------------------------------
// computeCategoryMatrix
// ---------------------------------------------------------------------------

/**
 * Computes per-category average scores for two competitors.
 * Only includes rounds where both competitors have scored results
 * in the same category.
 */
export function computeCategoryMatrix(
  rounds: RoundResult[],
  competitorA: string,
  competitorB: string,
): CategoryMatrixRow[] {
  const groups = groupRoundsByRoundId(rounds);
  const categoryData = new Map<
    QueryCategory,
    { aScores: number[]; bScores: number[] }
  >();

  for (const group of groups) {
    const a = group.results.find(
      (r) => r.competitor === competitorA && r.total != null,
    );
    const b = group.results.find(
      (r) => r.competitor === competitorB && r.total != null,
    );
    if (!a || !b || !a.query_category) continue;

    const cat = a.query_category;
    const entry = categoryData.get(cat) ?? { aScores: [], bScores: [] };
    entry.aScores.push(a.total ?? 0);
    entry.bScores.push(b.total ?? 0);
    categoryData.set(cat, entry);
  }

  return Array.from(categoryData.entries()).map(([category, data]) => {
    const avgA = data.aScores.reduce((s, v) => s + v, 0) / data.aScores.length;
    const avgB = data.bScores.reduce((s, v) => s + v, 0) / data.bScores.length;
    return {
      category,
      avgA,
      avgB,
      advantage: avgA - avgB,
      roundCount: data.aScores.length,
    };
  });
}

// ---------------------------------------------------------------------------
// computeBridgeDeltas
// ---------------------------------------------------------------------------

/**
 * Computes deltas between bridge series1 scores and their baselines.
 * Only applicable to bridge-type rounds that have both series1_scores
 * and series1_baseline.
 */
export function computeBridgeDeltas(rounds: RoundResult[]): BridgeDelta[] {
  return rounds
    .filter(
      (r): r is RoundResult & Required<Pick<RoundResult, 'series1_scores' | 'series1_baseline'>> =>
        r.round_type === 'bridge' &&
        r.series1_scores != null &&
        r.series1_baseline != null,
    )
    .map((r) => ({
      roundId: r.round_id,
      competitor: r.competitor,
      codebase: r.codebase,
      deltas: {
        precision: r.series1_scores.precision - r.series1_baseline.precision,
        recall: r.series1_scores.recall - r.series1_baseline.recall,
        insight: r.series1_scores.insight - r.series1_baseline.insight,
      },
    }));
}
