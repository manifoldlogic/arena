import { describe, it, expect } from 'vitest';
import { computeEfficiencyBonus, computeQAS } from '../computeQAS';
import { computeStandings } from '../computeStandings';
import { mockRounds } from './fixtures';

describe('computeEfficiencyBonus', () => {
  it('returns 0.15 for zero calls (maximum efficiency)', () => {
    expect(computeEfficiencyBonus(0, 100)).toBeCloseTo(0.15, 10);
  });

  it('returns 0 when calls equal max_calls (no bonus)', () => {
    expect(computeEfficiencyBonus(100, 100)).toBeCloseTo(0, 10);
  });

  it('clamps to 0 when calls exceed max_calls', () => {
    expect(computeEfficiencyBonus(200, 100)).toBe(0);
  });

  it('computes correctly for partial usage', () => {
    // 15 of 100 calls → (1 - 0.15) * 0.15 = 0.85 * 0.15 = 0.1275
    expect(computeEfficiencyBonus(15, 100)).toBeCloseTo(0.1275, 10);
  });

  it('computes correctly for explore budget (150 max)', () => {
    // 22 of 150 calls → (1 - 22/150) * 0.15 = (128/150) * 0.15 = 0.128
    expect(computeEfficiencyBonus(22, 150)).toBeCloseTo(0.128, 10);
  });
});

describe('computeQAS', () => {
  it('returns 0 when total is 0 regardless of efficiency', () => {
    expect(computeQAS(0, 5, 100)).toBe(0);
  });

  it('returns total unchanged when calls equal max_calls', () => {
    expect(computeQAS(10, 100, 100)).toBe(10);
  });

  it('applies maximum 15% bonus for zero calls', () => {
    // QAS = 10 * (1 + 0.15) = 11.5
    expect(computeQAS(10, 0, 100)).toBe(11.5);
  });

  it('computes known answer for maproom R01 (9 pts, 15/100 calls)', () => {
    // eff = 0.1275, QAS = 9 * 1.1275 = 10.1475 → toFixed(3) = 10.148
    const result = computeQAS(9, 15, 100);
    expect(result).toBeCloseTo(10.148, 2);
  });

  it('computes known answer for explore R01 (7 pts, 22/150 calls)', () => {
    // eff = 0.128, QAS = 7 * 1.128 = 7.896
    const result = computeQAS(7, 22, 150);
    expect(result).toBeCloseTo(7.896, 2);
  });

  it('rounds to 3 decimal places', () => {
    const result = computeQAS(9, 15, 100);
    const decimals = result.toString().split('.')[1] ?? '';
    expect(decimals.length).toBeLessThanOrEqual(3);
  });
});

describe('computeStandings with QAS', () => {
  const maxCallsMap = { maproom: 100, explore: 150 };

  it('includes qas field when maxCallsMap is provided', () => {
    const standings = computeStandings(mockRounds, maxCallsMap);
    for (const s of standings) {
      expect(s.qas).toBeDefined();
      expect(typeof s.qas).toBe('number');
    }
  });

  it('omits qas field when maxCallsMap is not provided', () => {
    const standings = computeStandings(mockRounds);
    for (const s of standings) {
      expect(s.qas).toBeUndefined();
    }
  });

  it('computes aggregate QAS for maproom across all rounds', () => {
    // maproom (max_calls=100):
    //   R01: total=9,  calls=15 → QAS ≈ 10.148
    //   R02: total=7,  calls=10 → QAS ≈ 7.945
    //   R03: total=10, calls=12 → QAS ≈ 11.320
    //   R04: total=5,  calls=8  → QAS ≈ 5.690
    //   Sum ≈ 35.103
    const standings = computeStandings(mockRounds, maxCallsMap);
    const maproom = standings.find((s) => s.competitor === 'maproom')!;
    expect(maproom.qas).toBeCloseTo(35.103, 1);
  });

  it('computes aggregate QAS for explore across all rounds', () => {
    // explore (max_calls=150):
    //   R01: total=7, calls=22 → QAS ≈ 7.896
    //   R02: total=7, calls=18 → QAS ≈ 7.924
    //   R03: total=8, calls=25 → QAS ≈ 9.000
    //   R04: total=9, calls=20 → QAS ≈ 10.170
    //   Sum ≈ 34.990
    const standings = computeStandings(mockRounds, maxCallsMap);
    const explore = standings.find((s) => s.competitor === 'explore')!;
    expect(explore.qas).toBeCloseTo(34.99, 1);
  });

  it('QAS is always >= raw total (bonus is non-negative)', () => {
    const standings = computeStandings(mockRounds, maxCallsMap);
    for (const s of standings) {
      expect(s.qas!).toBeGreaterThanOrEqual(s.total);
    }
  });
});
