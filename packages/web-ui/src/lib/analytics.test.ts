import { describe, it, expect } from 'vitest';
import type { RoundResult } from '@arena/schemas';
import {
  classifyDivergence,
  computeDivergenceMatrix,
  computeDriftTimeline,
  computeClosestCalls,
  computeDimensionTotals,
  computeCategoryPerformanceMatrix,
} from './analytics';

// ── Test fixtures ───────────────────────────────────────────────────

function mkRound(overrides: Partial<RoundResult> & { round_id: string; competitor: string }): RoundResult {
  return {
    schema_version: 1,
    round_type: 'regular',
    codebase: 'django',
    phase: 1,
    calls: 10,
    time_s: 30,
    source: 'score',
    is_calibration: false,
    precision: 3,
    recall: 3,
    insight: 3,
    total: 9,
    ...overrides,
  };
}

/** Four-round dataset matching known scoreboard answers. */
const FOUR_ROUNDS: RoundResult[] = [
  // R1: spread=2 → gray
  mkRound({ round_id: 'R1', competitor: 'Alpha', total: 8, precision: 3, recall: 3, insight: 2, query_category: 'flow' }),
  mkRound({ round_id: 'R1', competitor: 'Beta',  total: 10, precision: 4, recall: 3, insight: 3, query_category: 'flow' }),
  // R2: spread=3 → yellow  (divergence boundary test)
  mkRound({ round_id: 'R2', competitor: 'Alpha', total: 7, precision: 2, recall: 3, insight: 2, query_category: 'pattern' }),
  mkRound({ round_id: 'R2', competitor: 'Beta',  total: 10, precision: 4, recall: 3, insight: 3, query_category: 'pattern' }),
  // R3: spread=4 → yellow  (divergence boundary test)
  mkRound({ round_id: 'R3', competitor: 'Alpha', total: 6, precision: 2, recall: 2, insight: 2, query_category: 'boundary' }),
  mkRound({ round_id: 'R3', competitor: 'Beta',  total: 10, precision: 4, recall: 3, insight: 3, query_category: 'boundary' }),
  // R4: spread=5 → signal
  mkRound({ round_id: 'R4', competitor: 'Alpha', total: 5, precision: 1, recall: 2, insight: 2, query_category: 'flow' }),
  mkRound({ round_id: 'R4', competitor: 'Beta',  total: 10, precision: 4, recall: 3, insight: 3, query_category: 'flow' }),
];

/** Close-call dataset: margin ≤1 */
const CLOSE_ROUNDS: RoundResult[] = [
  // Tie: margin=0
  mkRound({ round_id: 'C1', competitor: 'Alpha', total: 9, precision: 3, recall: 3, insight: 3, query_category: 'flow' }),
  mkRound({ round_id: 'C1', competitor: 'Beta',  total: 9, precision: 4, recall: 2, insight: 3, query_category: 'flow' }),
  // Margin=1
  mkRound({ round_id: 'C2', competitor: 'Alpha', total: 8, precision: 3, recall: 2, insight: 3, query_category: 'pattern' }),
  mkRound({ round_id: 'C2', competitor: 'Beta',  total: 9, precision: 3, recall: 3, insight: 3, query_category: 'pattern' }),
  // Margin=3 → NOT a closest call
  mkRound({ round_id: 'C3', competitor: 'Alpha', total: 6, precision: 2, recall: 2, insight: 2, query_category: 'boundary' }),
  mkRound({ round_id: 'C3', competitor: 'Beta',  total: 9, precision: 3, recall: 3, insight: 3, query_category: 'boundary' }),
];

// ── classifyDivergence ──────────────────────────────────────────────

describe('classifyDivergence', () => {
  it('returns gray for spread 0', () => expect(classifyDivergence(0)).toBe('gray'));
  it('returns gray for spread 1', () => expect(classifyDivergence(1)).toBe('gray'));
  it('returns gray for spread 2', () => expect(classifyDivergence(2)).toBe('gray'));
  it('returns yellow for spread 3 (boundary)', () => expect(classifyDivergence(3)).toBe('yellow'));
  it('returns yellow for spread 4 (boundary)', () => expect(classifyDivergence(4)).toBe('yellow'));
  it('returns signal for spread 5 (boundary)', () => expect(classifyDivergence(5)).toBe('signal'));
  it('returns signal for spread 10', () => expect(classifyDivergence(10)).toBe('signal'));
});

// ── computeDivergenceMatrix ─────────────────────────────────────────

describe('computeDivergenceMatrix', () => {
  it('produces correct signals for 4 known rounds', () => {
    const { rounds, competitors } = computeDivergenceMatrix(FOUR_ROUNDS);
    expect(competitors).toEqual(['Alpha', 'Beta']);
    expect(rounds).toHaveLength(4);

    expect(rounds[0].signal).toBe('gray');     // spread=2
    expect(rounds[0].spread).toBe(2);
    expect(rounds[1].signal).toBe('yellow');   // spread=3
    expect(rounds[1].spread).toBe(3);
    expect(rounds[2].signal).toBe('yellow');   // spread=4
    expect(rounds[2].spread).toBe(4);
    expect(rounds[3].signal).toBe('signal');   // spread=5
    expect(rounds[3].spread).toBe(5);
  });

  it('preserves round ordering and query categories', () => {
    const { rounds } = computeDivergenceMatrix(FOUR_ROUNDS);
    expect(rounds.map((r) => r.roundId)).toEqual(['R1', 'R2', 'R3', 'R4']);
    expect(rounds[0].queryCategory).toBe('flow');
    expect(rounds[1].queryCategory).toBe('pattern');
  });

  it('uses pre-computed divergence_signal when present', () => {
    const withSignal = FOUR_ROUNDS.map((r) =>
      r.round_id === 'R1' ? { ...r, divergence_signal: 'signal' as const } : r,
    );
    const { rounds } = computeDivergenceMatrix(withSignal);
    // R1 has spread=2 but pre-computed says signal
    expect(rounds[0].signal).toBe('signal');
  });

  it('returns empty for no scored rounds', () => {
    const agentOnly = FOUR_ROUNDS.map((r) => ({ ...r, source: 'agent' as const }));
    const { rounds, competitors } = computeDivergenceMatrix(agentOnly);
    expect(rounds).toHaveLength(0);
    expect(competitors).toHaveLength(0);
  });

  it('records per-competitor scores in each cell', () => {
    const { rounds } = computeDivergenceMatrix(FOUR_ROUNDS);
    expect(rounds[0].scores).toEqual({ Alpha: 8, Beta: 10 });
    expect(rounds[3].scores).toEqual({ Alpha: 5, Beta: 10 });
  });
});

// ── computeDriftTimeline ────────────────────────────────────────────

describe('computeDriftTimeline', () => {
  it('returns empty points when fewer than minRounds (default 5)', () => {
    const result = computeDriftTimeline(FOUR_ROUNDS, 'Alpha', 'Beta');
    expect(result.points).toHaveLength(0);
    expect(result.competitorA).toBe('Alpha');
    expect(result.competitorB).toBe('Beta');
  });

  it('returns empty points when fewer than custom minRounds', () => {
    const result = computeDriftTimeline(FOUR_ROUNDS, 'Alpha', 'Beta', 3, 10);
    expect(result.points).toHaveLength(0);
  });

  it('computes drift when minRounds is lowered to match data', () => {
    const result = computeDriftTimeline(FOUR_ROUNDS, 'Alpha', 'Beta', 3, 4);
    expect(result.points).toHaveLength(4);

    // Raw deltas: R1=-2, R2=-3, R3=-4, R4=-5
    expect(result.points[0].rawDelta).toBe(-2);
    expect(result.points[1].rawDelta).toBe(-3);
    expect(result.points[2].rawDelta).toBe(-4);
    expect(result.points[3].rawDelta).toBe(-5);
  });

  it('computes correct rolling averages with window=3', () => {
    const result = computeDriftTimeline(FOUR_ROUNDS, 'Alpha', 'Beta', 3, 4);
    // window=3: [−2], [−2,−3], [−2,−3,−4], [−3,−4,−5]
    expect(result.points[0].delta).toBeCloseTo(-2);
    expect(result.points[1].delta).toBeCloseTo(-2.5);
    expect(result.points[2].delta).toBeCloseTo(-3);
    expect(result.points[3].delta).toBeCloseTo(-4);
  });

  it('handles reversed competitor order', () => {
    const result = computeDriftTimeline(FOUR_ROUNDS, 'Beta', 'Alpha', 3, 4);
    // Delta should be positive (Beta − Alpha)
    expect(result.points[0].rawDelta).toBe(2);
    expect(result.points[3].rawDelta).toBe(5);
  });

  it('skips rounds missing one competitor', () => {
    const partial = [
      ...FOUR_ROUNDS,
      // R5 only has Alpha
      mkRound({ round_id: 'R5', competitor: 'Alpha', total: 7 }),
    ];
    const result = computeDriftTimeline(partial, 'Alpha', 'Beta', 3, 4);
    // R5 is skipped — still only 4 paired rounds
    expect(result.points).toHaveLength(4);
  });

  it('produces 6 points with enough data', () => {
    const sixRounds: RoundResult[] = [];
    for (let i = 1; i <= 6; i++) {
      sixRounds.push(mkRound({ round_id: `R${i}`, competitor: 'Alpha', total: 5 + i }));
      sixRounds.push(mkRound({ round_id: `R${i}`, competitor: 'Beta',  total: 10 }));
    }
    const result = computeDriftTimeline(sixRounds, 'Alpha', 'Beta', 3, 5);
    expect(result.points).toHaveLength(6);
  });
});

// ── computeClosestCalls ─────────────────────────────────────────────

describe('computeClosestCalls', () => {
  it('finds rounds with margin ≤ 1', () => {
    const calls = computeClosestCalls(CLOSE_ROUNDS);
    expect(calls).toHaveLength(2);
    expect(calls.map((c) => c.roundId)).toEqual(['C1', 'C2']);
  });

  it('computes correct margins', () => {
    const calls = computeClosestCalls(CLOSE_ROUNDS);
    expect(calls[0].margin).toBe(0); // tie
    expect(calls[1].margin).toBe(1);
  });

  it('identifies swing dimensions', () => {
    const calls = computeClosestCalls(CLOSE_ROUNDS);
    // C1: Alpha p=3,r=3,i=3; Beta p=4,r=2,i=3 → precision and recall swing
    expect(calls[0].swingDimensions).toContain('precision');
    expect(calls[0].swingDimensions).toContain('recall');
    expect(calls[0].swingDimensions).not.toContain('insight');

    // C2: Alpha p=3,r=2,i=3; Beta p=3,r=3,i=3 → recall is the swing
    expect(calls[1].swingDimensions).toEqual(['recall']);
  });

  it('returns empty for rounds with no close calls', () => {
    const wide = [
      mkRound({ round_id: 'W1', competitor: 'Alpha', total: 3 }),
      mkRound({ round_id: 'W1', competitor: 'Beta', total: 10 }),
    ];
    expect(computeClosestCalls(wide)).toHaveLength(0);
  });

  it('includes codebase and category metadata', () => {
    const calls = computeClosestCalls(CLOSE_ROUNDS);
    expect(calls[0].codebase).toBe('django');
    expect(calls[0].queryCategory).toBe('flow');
  });
});

// ── computeDimensionTotals ──────────────────────────────────────────

describe('computeDimensionTotals', () => {
  it('produces cumulative snapshots per competitor', () => {
    const results = computeDimensionTotals(FOUR_ROUNDS);
    expect(results).toHaveLength(2); // Alpha and Beta

    const alpha = results.find((r) => r.competitor === 'Alpha')!;
    expect(alpha.snapshots).toHaveLength(4);

    // Alpha: R1 p=3,r=3,i=2; R2 p=2,r=3,i=2; R3 p=2,r=2,i=2; R4 p=1,r=2,i=2
    // Cumulative after R1: p=3, r=3, i=2
    expect(alpha.snapshots[0]).toMatchObject({ precision: 3, recall: 3, insight: 2 });
    // Cumulative after R2: p=5, r=6, i=4
    expect(alpha.snapshots[1]).toMatchObject({ precision: 5, recall: 6, insight: 4 });
    // Cumulative after R4: p=8, r=10, i=8
    expect(alpha.snapshots[3]).toMatchObject({ precision: 8, recall: 10, insight: 8 });
  });

  it('ensures precision + recall + insight = total at every point', () => {
    const results = computeDimensionTotals(FOUR_ROUNDS);
    for (const { snapshots } of results) {
      for (const s of snapshots) {
        expect(s.precision + s.recall + s.insight).toBe(s.total);
      }
    }
  });

  it('handles empty input', () => {
    expect(computeDimensionTotals([])).toEqual([]);
  });
});

// ── computeCategoryPerformanceMatrix ────────────────────────────────

describe('computeCategoryPerformanceMatrix', () => {
  it('computes correct averages per (competitor, category)', () => {
    const result = computeCategoryPerformanceMatrix(FOUR_ROUNDS);

    // Alpha has flow rounds: R1 total=8, R4 total=5 → avg=6.5
    const alphaFlow = result.cells.find(
      (c) => c.competitor === 'Alpha' && c.category === 'flow',
    )!;
    expect(alphaFlow.avgTotal).toBeCloseTo(6.5);
    expect(alphaFlow.count).toBe(2);
    expect(alphaFlow.minTotal).toBe(5);
    expect(alphaFlow.maxTotal).toBe(8);
  });

  it('identifies categories with count=1 (low sample)', () => {
    const result = computeCategoryPerformanceMatrix(FOUR_ROUNDS);
    // Alpha pattern: only R2 → count=1
    const alphaPattern = result.cells.find(
      (c) => c.competitor === 'Alpha' && c.category === 'pattern',
    )!;
    expect(alphaPattern.count).toBe(1);
  });

  it('returns sorted competitors and categories', () => {
    const result = computeCategoryPerformanceMatrix(FOUR_ROUNDS);
    expect(result.competitors).toEqual(['Alpha', 'Beta']);
    expect(result.categories).toEqual(['boundary', 'flow', 'pattern']);
  });

  it('computes competitor averages (weighted by count)', () => {
    const result = computeCategoryPerformanceMatrix(FOUR_ROUNDS);
    // Alpha: (8+5)/2 for flow=6.5, 7/1 for pattern=7, 6/1 for boundary=6
    // Weighted: (6.5*2 + 7*1 + 6*1) / (2+1+1) = 26/4 = 6.5
    expect(result.competitorAverages['Alpha']).toBeCloseTo(6.5);
  });

  it('computes category averages (weighted by count)', () => {
    const result = computeCategoryPerformanceMatrix(FOUR_ROUNDS);
    // Flow: Alpha (8+5)=13/2=6.5, Beta (10+10)=20/2=10 → weighted (13+20)/(2+2) = 33/4 = 8.25
    expect(result.categoryAverages['flow']).toBeCloseTo(8.25);
  });

  it('excludes rounds without query_category', () => {
    const noCat = [mkRound({ round_id: 'X1', competitor: 'Alpha', total: 5 })];
    const result = computeCategoryPerformanceMatrix(noCat);
    expect(result.cells).toHaveLength(0);
    expect(result.categories).toHaveLength(0);
  });

  it('handles empty input', () => {
    const result = computeCategoryPerformanceMatrix([]);
    expect(result.cells).toHaveLength(0);
    expect(result.competitors).toHaveLength(0);
    expect(result.categories).toHaveLength(0);
  });
});

// ── Edge cases ──────────────────────────────────────────────────────

describe('edge cases', () => {
  it('computeDivergenceMatrix handles single competitor (spread=0)', () => {
    const solo = [mkRound({ round_id: 'S1', competitor: 'Alpha', total: 8, query_category: 'flow' })];
    const { rounds, competitors } = computeDivergenceMatrix(solo);
    expect(competitors).toEqual(['Alpha']);
    expect(rounds).toHaveLength(1);
    expect(rounds[0].spread).toBe(0);
    expect(rounds[0].signal).toBe('gray');
  });

  it('computeDivergenceMatrix handles empty input', () => {
    const { rounds, competitors } = computeDivergenceMatrix([]);
    expect(rounds).toHaveLength(0);
    expect(competitors).toHaveLength(0);
  });

  it('computeClosestCalls handles all-tie rounds', () => {
    const ties = [
      mkRound({ round_id: 'T1', competitor: 'Alpha', total: 9, precision: 3, recall: 3, insight: 3, query_category: 'flow' }),
      mkRound({ round_id: 'T1', competitor: 'Beta',  total: 9, precision: 3, recall: 3, insight: 3, query_category: 'flow' }),
      mkRound({ round_id: 'T2', competitor: 'Alpha', total: 7, precision: 2, recall: 3, insight: 2, query_category: 'pattern' }),
      mkRound({ round_id: 'T2', competitor: 'Beta',  total: 7, precision: 2, recall: 3, insight: 2, query_category: 'pattern' }),
    ];
    const calls = computeClosestCalls(ties);
    expect(calls).toHaveLength(2);
    calls.forEach((c) => {
      expect(c.margin).toBe(0);
      expect(c.swingDimensions).toHaveLength(0);
    });
  });

  it('computeClosestCalls handles empty input', () => {
    expect(computeClosestCalls([])).toHaveLength(0);
  });

  it('computeDriftTimeline handles empty input', () => {
    const result = computeDriftTimeline([], 'A', 'B');
    expect(result.points).toHaveLength(0);
  });

  it('computeDimensionTotals handles competitor missing from some rounds', () => {
    const partial = [
      mkRound({ round_id: 'P1', competitor: 'Alpha', total: 9, precision: 3, recall: 3, insight: 3 }),
      mkRound({ round_id: 'P1', competitor: 'Beta',  total: 8, precision: 3, recall: 3, insight: 2 }),
      // P2 only has Alpha
      mkRound({ round_id: 'P2', competitor: 'Alpha', total: 10, precision: 4, recall: 3, insight: 3 }),
    ];
    const results = computeDimensionTotals(partial);
    const alpha = results.find((r) => r.competitor === 'Alpha')!;
    const beta = results.find((r) => r.competitor === 'Beta')!;
    expect(alpha.snapshots).toHaveLength(2);
    expect(beta.snapshots).toHaveLength(1);
    // Beta only participated in P1
    expect(beta.snapshots[0].total).toBe(8);
  });

  it('computeDivergenceMatrix handles single round with many competitors', () => {
    const multi = [
      mkRound({ round_id: 'M1', competitor: 'A', total: 3, query_category: 'flow' }),
      mkRound({ round_id: 'M1', competitor: 'B', total: 8, query_category: 'flow' }),
      mkRound({ round_id: 'M1', competitor: 'C', total: 10, query_category: 'flow' }),
    ];
    const { rounds } = computeDivergenceMatrix(multi);
    expect(rounds[0].spread).toBe(7); // 10-3
    expect(rounds[0].signal).toBe('signal');
  });
});
