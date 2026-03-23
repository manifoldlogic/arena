/**
 * Pure-function analytics engine for Arena competition data.
 *
 * Every export is a stateless computation: RoundResult[] in, derived data out.
 * Memoization is the caller's responsibility (React useMemo / useCompetitionData).
 */
import type { RoundResult, DivergenceSignal, QueryCategory } from '@arena/schemas';

// ── Output types ────────────────────────────────────────────────────

export interface DivergenceCell {
  roundId: string;
  queryCategory: QueryCategory | undefined;
  scores: Record<string, number>; // competitor → total
  spread: number;
  signal: DivergenceSignal;
}

export interface DivergenceMatrix {
  rounds: DivergenceCell[];
  competitors: string[];
}

export interface DriftPoint {
  roundIndex: number;
  roundId: string;
  delta: number;           // competitorA − competitorB rolling avg
  rawDelta: number;        // single-round delta (unsmoothed)
  isAnomaly: boolean;
}

export interface DriftTimeline {
  competitorA: string;
  competitorB: string;
  windowSize: number;
  points: DriftPoint[];
}

export interface ClosestCall {
  roundId: string;
  codebase: string;
  queryCategory: QueryCategory | undefined;
  margin: number;
  competitors: {
    competitor: string;
    total: number;
    precision: number;
    recall: number;
    insight: number;
  }[];
  swingDimensions: ('precision' | 'recall' | 'insight')[];
}

export interface DimensionSnapshot {
  roundIndex: number;
  roundId: string;
  precision: number;
  recall: number;
  insight: number;
  total: number;
}

export interface CompetitorDimensions {
  competitor: string;
  snapshots: DimensionSnapshot[];
}

export interface CategoryCell {
  competitor: string;
  category: QueryCategory;
  avgTotal: number;
  count: number;
  minTotal: number;
  maxTotal: number;
}

export interface CategoryPerformanceMatrix {
  cells: CategoryCell[];
  competitors: string[];
  categories: QueryCategory[];
  competitorAverages: Record<string, number>;
  categoryAverages: Record<string, number>;
}

// ── Helpers ─────────────────────────────────────────────────────────

/** Classify spread into a divergence signal matching Python _compute_divergence. */
export function classifyDivergence(spread: number): DivergenceSignal {
  if (spread >= 5) return 'signal';
  if (spread >= 3) return 'yellow';
  return 'gray';
}

/** Deduplicate and sort competitors alphabetically. */
function uniqueCompetitors(rounds: RoundResult[]): string[] {
  return [...new Set(rounds.map((r) => r.competitor))].sort();
}

/** Group round results by round_id so each group has all competitors' rows. */
function groupByRound(rounds: RoundResult[]): Map<string, RoundResult[]> {
  const map = new Map<string, RoundResult[]>();
  for (const r of rounds) {
    const arr = map.get(r.round_id) ?? [];
    arr.push(r);
    map.set(r.round_id, arr);
  }
  return map;
}

/** Order round groups chronologically (by first occurrence in the input array). */
function orderedRoundIds(rounds: RoundResult[]): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const r of rounds) {
    if (!seen.has(r.round_id)) {
      seen.add(r.round_id);
      ids.push(r.round_id);
    }
  }
  return ids;
}

/** Compute rolling average of an array with the given window size. */
function rollingAverage(values: number[], windowSize: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = values.slice(start, i + 1);
    result.push(window.reduce((a, b) => a + b, 0) / window.length);
  }
  return result;
}

/** Standard deviation of an array. */
function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export type DiscriminationStatus = 'drought' | 'emerging' | 'signal_found';

export interface DiscriminationResult {
  status: DiscriminationStatus;
  streak: number;
  lastSignalRound: string | null;
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * FR-1 / FR-7.5: Divergence heatmap data.
 * Spread = max(totals) − min(totals) across competitors in a round.
 * Uses pre-computed divergence_signal when available; otherwise classifies from spread.
 */
export function computeDivergenceMatrix(rounds: RoundResult[]): DivergenceMatrix {
  const scored = rounds.filter((r) => r.source === 'score' && r.total != null);
  const competitors = uniqueCompetitors(scored);
  const byRound = groupByRound(scored);
  const orderedIds = orderedRoundIds(scored);

  const cells: DivergenceCell[] = [];

  for (const roundId of orderedIds) {
    const group = byRound.get(roundId)!;
    const scores: Record<string, number> = {};
    for (const r of group) {
      scores[r.competitor] = r.total!;
    }

    const totals = Object.values(scores);
    const spread = totals.length > 1 ? Math.max(...totals) - Math.min(...totals) : 0;

    // Prefer pre-computed signal if all rows agree; otherwise classify from spread
    const precomputed = group[0]?.divergence_signal;
    const signal = precomputed ?? classifyDivergence(spread);

    cells.push({
      roundId,
      queryCategory: group[0]?.query_category,
      scores,
      spread,
      signal,
    });
  }

  return { rounds: cells, competitors };
}

/**
 * FR-2: Drift detection timeline.
 *
 * Computes the rolling average of (competitorA.total − competitorB.total) per round.
 * Marks anomaly points where the delta deviates by >2σ from the rolling mean.
 *
 * Minimum-data guard: returns empty points array when fewer than `minRounds` shared
 * rounds exist (default 5). This prevents misleading statistical artifacts from
 * tiny samples.
 */
export function computeDriftTimeline(
  rounds: RoundResult[],
  competitorA: string,
  competitorB: string,
  windowSize: number = 3,
  minRounds: number = 5,
): DriftTimeline {
  const scored = rounds.filter((r) => r.source === 'score' && r.total != null);
  const byRound = groupByRound(scored);
  const orderedIds = orderedRoundIds(scored);

  // Build paired deltas for rounds where both competitors have data
  const rawDeltas: { roundId: string; delta: number }[] = [];
  for (const roundId of orderedIds) {
    const group = byRound.get(roundId)!;
    const a = group.find((r) => r.competitor === competitorA);
    const b = group.find((r) => r.competitor === competitorB);
    if (a?.total != null && b?.total != null) {
      rawDeltas.push({ roundId, delta: a.total - b.total });
    }
  }

  // Minimum-data guard
  if (rawDeltas.length < minRounds) {
    return { competitorA, competitorB, windowSize, points: [] };
  }

  const deltaValues = rawDeltas.map((d) => d.delta);
  const rolling = rollingAverage(deltaValues, windowSize);

  // Anomaly detection: delta deviates by >2σ from rolling mean
  const rollingStd = stdDev(rolling);
  const rollingMean = rolling.reduce((a, b) => a + b, 0) / rolling.length;

  const points: DriftPoint[] = rawDeltas.map((d, i) => ({
    roundIndex: i,
    roundId: d.roundId,
    delta: rolling[i],
    rawDelta: d.delta,
    isAnomaly: rollingStd > 0 && Math.abs(rolling[i] - rollingMean) > 2 * rollingStd,
  }));

  return { competitorA, competitorB, windowSize, points };
}

/**
 * FR-4: Closest calls — rounds where winning margin ≤ 1 point.
 */
export function computeClosestCalls(rounds: RoundResult[]): ClosestCall[] {
  const scored = rounds.filter((r) => r.source === 'score' && r.total != null);
  const byRound = groupByRound(scored);
  const orderedIds = orderedRoundIds(scored);
  const results: ClosestCall[] = [];

  for (const roundId of orderedIds) {
    const group = byRound.get(roundId)!;
    if (group.length < 2) continue;

    const totals = group.map((r) => r.total!);
    const margin = Math.max(...totals) - Math.min(...totals);
    if (margin > 1) continue;

    const competitors = group.map((r) => ({
      competitor: r.competitor,
      total: r.total!,
      precision: r.precision ?? 0,
      recall: r.recall ?? 0,
      insight: r.insight ?? 0,
    }));

    // Swing dimensions: those where competitors' scores differ
    const dims = ['precision', 'recall', 'insight'] as const;
    const swingDimensions = dims.filter((dim) => {
      const vals = competitors.map((c) => c[dim]);
      return Math.max(...vals) !== Math.min(...vals);
    });

    results.push({
      roundId,
      codebase: group[0].codebase,
      queryCategory: group[0].query_category,
      margin,
      competitors,
      swingDimensions,
    });
  }

  return results;
}

/**
 * FR-5: Dimension stacked-area data per competitor (cumulative).
 */
export function computeDimensionTotals(rounds: RoundResult[]): CompetitorDimensions[] {
  const scored = rounds.filter((r) => r.source === 'score' && r.total != null);
  const competitors = uniqueCompetitors(scored);
  const orderedIds = orderedRoundIds(scored);
  const byRound = groupByRound(scored);

  return competitors.map((competitor) => {
    let cumP = 0, cumR = 0, cumI = 0;
    const snapshots: DimensionSnapshot[] = [];

    orderedIds.forEach((roundId, idx) => {
      const group = byRound.get(roundId)!;
      const row = group.find((r) => r.competitor === competitor);
      if (!row) return;

      cumP += row.precision ?? 0;
      cumR += row.recall ?? 0;
      cumI += row.insight ?? 0;

      snapshots.push({
        roundIndex: idx,
        roundId,
        precision: cumP,
        recall: cumR,
        insight: cumI,
        total: cumP + cumR + cumI,
      });
    });

    return { competitor, snapshots };
  });
}

/**
 * FR-6: Category performance matrix.
 * Renamed from computeCategoryPerformance per ticket instruction.
 */
export function computeCategoryPerformanceMatrix(
  rounds: RoundResult[],
): CategoryPerformanceMatrix {
  const scored = rounds.filter(
    (r) => r.source === 'score' && r.total != null && r.query_category != null,
  );
  const competitors = uniqueCompetitors(scored);
  const categoriesSet = new Set<QueryCategory>();

  // Accumulator keyed by "competitor\0category" (null byte avoids collisions with any name)
  const acc = new Map<
    string,
    { competitor: string; category: QueryCategory; sum: number; count: number; min: number; max: number }
  >();

  for (const r of scored) {
    const cat = r.query_category!;
    categoriesSet.add(cat);
    const key = `${r.competitor}\0${cat}`;
    const entry = acc.get(key) ?? {
      competitor: r.competitor,
      category: cat,
      sum: 0,
      count: 0,
      min: Infinity,
      max: -Infinity,
    };
    entry.sum += r.total!;
    entry.count += 1;
    entry.min = Math.min(entry.min, r.total!);
    entry.max = Math.max(entry.max, r.total!);
    acc.set(key, entry);
  }

  const categories = [...categoriesSet].sort();

  const cells: CategoryCell[] = [];
  for (const entry of acc.values()) {
    cells.push({
      competitor: entry.competitor,
      category: entry.category,
      avgTotal: entry.sum / entry.count,
      count: entry.count,
      minTotal: entry.min,
      maxTotal: entry.max,
    });
  }

  // Row averages (per competitor)
  const competitorAverages: Record<string, number> = {};
  for (const c of competitors) {
    const competitorCells = cells.filter((cell) => cell.competitor === c);
    if (competitorCells.length > 0) {
      const totalSum = competitorCells.reduce((s, cell) => s + cell.avgTotal * cell.count, 0);
      const totalCount = competitorCells.reduce((s, cell) => s + cell.count, 0);
      competitorAverages[c] = totalSum / totalCount;
    }
  }

  // Column averages (per category)
  const categoryAverages: Record<string, number> = {};
  for (const cat of categories) {
    const catCells = cells.filter((cell) => cell.category === cat);
    if (catCells.length > 0) {
      const totalSum = catCells.reduce((s, cell) => s + cell.avgTotal * cell.count, 0);
      const totalCount = catCells.reduce((s, cell) => s + cell.count, 0);
      categoryAverages[cat] = totalSum / totalCount;
    }
  }

  return { cells, competitors, categories, competitorAverages, categoryAverages };
}

/**
 * Divergence drought indicator.
 *
 * Examines the most recent `windowSize` rounds from the divergence matrix and
 * classifies the current discrimination state:
 * - **drought**: all rounds in the window are gray (no separation)
 * - **emerging**: 2+ yellow rounds in the window (discrimination improving)
 * - **signal_found**: any signal-level round in the window
 *
 * `streak` counts consecutive gray rounds from the most recent round backwards.
 * `lastSignalRound` is the round_id of the most recent signal-level round overall.
 */
export function computeDiscriminationStatus(
  rounds: RoundResult[],
  windowSize: number = 5,
): DiscriminationResult {
  const { rounds: cells } = computeDivergenceMatrix(rounds);

  if (cells.length === 0) {
    return { status: 'drought', streak: 0, lastSignalRound: null };
  }

  // Find last signal round across all cells
  let lastSignalRound: string | null = null;
  for (let i = cells.length - 1; i >= 0; i--) {
    if (cells[i].signal === 'signal') {
      lastSignalRound = cells[i].roundId;
      break;
    }
  }

  // Count consecutive gray streak from end
  let streak = 0;
  for (let i = cells.length - 1; i >= 0; i--) {
    if (cells[i].signal === 'gray') {
      streak++;
    } else {
      break;
    }
  }

  // Examine the window (last windowSize rounds)
  const window = cells.slice(-windowSize);

  const hasSignal = window.some((c) => c.signal === 'signal');
  if (hasSignal) {
    return { status: 'signal_found', streak, lastSignalRound };
  }

  const yellowCount = window.filter((c) => c.signal === 'yellow').length;
  if (yellowCount >= 2) {
    return { status: 'emerging', streak, lastSignalRound };
  }

  return { status: 'drought', streak, lastSignalRound };
}

// ── Milestones ──────────────────────────────────────────────────────

export interface Milestone {
  id: string;
  name: string;
  description: string;
  achieved: boolean;
  achievedRound?: string;
}

/**
 * Compute research milestones from round results.
 *
 * Returns a fixed set of 5 milestones, each checked against the data:
 * 1. First Signal Round — spread >= 5 in any round
 * 2. Category Domination — one competitor leads all query categories
 * 3. Depth Query Explored — any round with query_difficulty="depth"
 * 4. Comeback Confirmed — trailing competitor wins 3 consecutive rounds
 * 5. Paradigm Signature Found — one competitor leads a dimension across 5+ rounds
 */
export function computeMilestones(rounds: RoundResult[]): Milestone[] {
  const scored = rounds.filter((r) => r.source === 'score' && r.total != null);

  return [
    checkFirstSignalRound(scored),
    checkCategoryDomination(scored),
    checkDepthQueryExplored(scored),
    checkComebackConfirmed(scored),
    checkParadigmSignatureFound(scored),
  ];
}

function checkFirstSignalRound(scored: RoundResult[]): Milestone {
  const base: Milestone = {
    id: 'first-signal-round',
    name: 'First Signal Round',
    description: 'A round where competitor scores diverged by 5+ points.',
  achieved: false,
  };

  const byRound = new Map<string, RoundResult[]>();
  const orderedIds: string[] = [];
  for (const r of scored) {
    if (!byRound.has(r.round_id)) orderedIds.push(r.round_id);
    const arr = byRound.get(r.round_id) ?? [];
    arr.push(r);
    byRound.set(r.round_id, arr);
  }

  for (const roundId of orderedIds) {
    const group = byRound.get(roundId)!;
    if (group.length < 2) continue;
    const totals = group.map((r) => r.total!);
    const spread = Math.max(...totals) - Math.min(...totals);
    if (spread >= 5) {
      return { ...base, achieved: true, achievedRound: roundId };
    }
  }

  return base;
}

function checkCategoryDomination(scored: RoundResult[]): Milestone {
  const base: Milestone = {
    id: 'category-domination',
    name: 'Category Domination',
    description: 'One competitor leads every query category by average score.',
    achieved: false,
  };

  const withCat = scored.filter((r) => r.query_category != null);
  if (withCat.length === 0) return base;

  // Compute average total per (competitor, category)
  const acc = new Map<string, { sum: number; count: number }>();
  const categories = new Set<string>();
  const competitors = new Set<string>();

  for (const r of withCat) {
    const key = `${r.competitor}\0${r.query_category}`;
    const entry = acc.get(key) ?? { sum: 0, count: 0 };
    entry.sum += r.total!;
    entry.count += 1;
    acc.set(key, entry);
    categories.add(r.query_category!);
    competitors.add(r.competitor);
  }

  // For each category, find the leader
  const catLeaders = new Map<string, string>();
  for (const cat of categories) {
    let bestComp: string | null = null;
    let bestAvg = -Infinity;
    let tied = false;
    for (const comp of competitors) {
      const entry = acc.get(`${comp}\0${cat}`);
      if (!entry) continue;
      const avg = entry.sum / entry.count;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestComp = comp;
        tied = false;
      } else if (avg === bestAvg) {
        tied = true;
      }
    }
    if (tied || !bestComp) return base;
    catLeaders.set(cat, bestComp);
  }

  // Check if one competitor leads all categories
  const leaders = new Set(catLeaders.values());
  if (leaders.size === 1) {
    return { ...base, achieved: true };
  }

  return base;
}

function checkDepthQueryExplored(scored: RoundResult[]): Milestone {
  const base: Milestone = {
    id: 'depth-query-explored',
    name: 'Depth Query Explored',
    description: 'A round with a depth-level query was completed.',
    achieved: false,
  };

  for (const r of scored) {
    if (r.query_difficulty === 'depth') {
      return { ...base, achieved: true, achievedRound: r.round_id };
    }
  }

  return base;
}

function checkComebackConfirmed(scored: RoundResult[]): Milestone {
  const base: Milestone = {
    id: 'comeback-confirmed',
    name: 'Comeback Confirmed',
    description: 'A trailing competitor won 3 consecutive rounds.',
    achieved: false,
  };

  // Group by round, maintaining order
  const byRound = new Map<string, RoundResult[]>();
  const orderedIds: string[] = [];
  for (const r of scored) {
    if (!byRound.has(r.round_id)) orderedIds.push(r.round_id);
    const arr = byRound.get(r.round_id) ?? [];
    arr.push(r);
    byRound.set(r.round_id, arr);
  }

  // Track cumulative scores and consecutive wins per competitor
  const cumScores = new Map<string, number>();
  const consecutiveWins = new Map<string, number>();

  for (const roundId of orderedIds) {
    const group = byRound.get(roundId)!;
    if (group.length < 2) continue;

    // Determine winner of this round
    const sorted = [...group].sort((a, b) => b.total! - a.total!);
    const winner = sorted[0].total! > sorted[1].total! ? sorted[0].competitor : null;

    // Check if winner is currently trailing before this round's scores are added
    if (winner) {
      const winnerCum = cumScores.get(winner) ?? 0;
      const isTrailing = [...cumScores.entries()].some(
        ([comp, score]) => comp !== winner && score > winnerCum,
      );

      if (isTrailing) {
        consecutiveWins.set(winner, (consecutiveWins.get(winner) ?? 0) + 1);
        if ((consecutiveWins.get(winner) ?? 0) >= 3) {
          return { ...base, achieved: true, achievedRound: roundId };
        }
      } else {
        consecutiveWins.set(winner, 0);
      }

      // Reset other competitors' consecutive win counts
      for (const comp of consecutiveWins.keys()) {
        if (comp !== winner) consecutiveWins.set(comp, 0);
      }
    } else {
      // Tie — reset all
      for (const comp of consecutiveWins.keys()) {
        consecutiveWins.set(comp, 0);
      }
    }

    // Update cumulative scores
    for (const r of group) {
      cumScores.set(r.competitor, (cumScores.get(r.competitor) ?? 0) + r.total!);
    }
  }

  return base;
}

function checkParadigmSignatureFound(scored: RoundResult[]): Milestone {
  const base: Milestone = {
    id: 'paradigm-signature-found',
    name: 'Paradigm Signature Found',
    description: 'One competitor leads a scoring dimension across 5+ rounds.',
    achieved: false,
  };

  // Group by round
  const byRound = new Map<string, RoundResult[]>();
  const orderedIds: string[] = [];
  for (const r of scored) {
    if (!byRound.has(r.round_id)) orderedIds.push(r.round_id);
    const arr = byRound.get(r.round_id) ?? [];
    arr.push(r);
    byRound.set(r.round_id, arr);
  }

  const dims = ['precision', 'recall', 'insight'] as const;

  // For each dimension, count per-round wins per competitor
  for (const dim of dims) {
    const dimWins = new Map<string, number>();

    for (const roundId of orderedIds) {
      const group = byRound.get(roundId)!;
      if (group.length < 2) continue;

      // Find the leader in this dimension for this round
      let bestComp: string | null = null;
      let bestVal = -Infinity;
      let tied = false;
      for (const r of group) {
        const val = r[dim] ?? 0;
        if (val > bestVal) {
          bestVal = val;
          bestComp = r.competitor;
          tied = false;
        } else if (val === bestVal) {
          tied = true;
        }
      }

      if (!tied && bestComp) {
        dimWins.set(bestComp, (dimWins.get(bestComp) ?? 0) + 1);
      }
    }

    for (const count of dimWins.values()) {
      if (count >= 5) {
        return { ...base, achieved: true };
      }
    }
  }

  return base;
}
