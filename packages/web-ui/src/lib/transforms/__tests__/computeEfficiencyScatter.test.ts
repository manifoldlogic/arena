import { describe, it, expect } from 'vitest';
import { computeEfficiencyScatter } from '../computeEfficiencyScatter';
import { mockRounds, agentOnlyRound, calibrationRound } from './fixtures';

describe('computeEfficiencyScatter', () => {
  it('produces one point per competitor per round', () => {
    const points = computeEfficiencyScatter(mockRounds);
    // 4 rounds x 2 competitors = 8 points
    expect(points).toHaveLength(8);
  });

  it('maps fields correctly', () => {
    const points = computeEfficiencyScatter(mockRounds);
    const r01Maproom = points.find(
      (p) => p.round_id === 'R01' && p.competitor === 'maproom',
    )!;
    expect(r01Maproom.calls).toBe(15);
    expect(r01Maproom.time_s).toBe(120);
    expect(r01Maproom.total).toBe(9);
  });

  it('excludes agent-only and calibration rounds', () => {
    const points = computeEfficiencyScatter([
      ...mockRounds,
      agentOnlyRound,
      calibrationRound,
    ]);
    expect(points).toHaveLength(8); // unchanged
  });

  it('returns sorted by round_id then competitor', () => {
    const points = computeEfficiencyScatter(mockRounds);
    const keys = points.map((p) => `${p.round_id}:${p.competitor}`);
    expect(keys).toEqual([
      'R01:explore',
      'R01:maproom',
      'R02:explore',
      'R02:maproom',
      'R03:explore',
      'R03:maproom',
      'R04:explore',
      'R04:maproom',
    ]);
  });

  it('returns empty array for empty input', () => {
    expect(computeEfficiencyScatter([])).toEqual([]);
  });
});
