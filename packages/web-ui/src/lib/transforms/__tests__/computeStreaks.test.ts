import { describe, it, expect } from 'vitest';
import type { RoundResult } from '@arena/schemas';
import { computeStreaks } from '../computeStreaks';
import { mockRounds, agentOnlyRound, calibrationRound, duplicateRound } from './fixtures';

describe('computeStreaks', () => {
  it('computes current streaks from scored rounds', () => {
    const streaks = computeStreaks(mockRounds);
    expect(streaks).toHaveLength(2);

    // maproom: R01=WIN, R02=TIE, R03=WIN, R04=LOSS
    const maproom = streaks.find((s) => s.competitor === 'maproom')!;
    expect(maproom.currentStreak).toBe(1);
    expect(maproom.streakType).toBe('loss');
    expect(maproom.longestWinStreak).toBe(1);
    expect(maproom.comebacks).toBe(0);

    // explore: R01=LOSS, R02=TIE, R03=LOSS, R04=WIN
    const explore = streaks.find((s) => s.competitor === 'explore')!;
    expect(explore.currentStreak).toBe(1);
    expect(explore.streakType).toBe('win');
    expect(explore.longestWinStreak).toBe(1);
    expect(explore.comebacks).toBe(1); // win after loss (R03→R04)
  });

  it('tracks multi-round win streaks', () => {
    const rounds: RoundResult[] = [
      makeRound('R01', 'alpha', 'alpha', '2025-01-01T00:00:00Z'),
      makeRound('R02', 'alpha', 'alpha', '2025-01-02T00:00:00Z'),
      makeRound('R03', 'alpha', 'alpha', '2025-01-03T00:00:00Z'),
    ];
    const streaks = computeStreaks(rounds);
    const alpha = streaks.find((s) => s.competitor === 'alpha')!;
    expect(alpha.currentStreak).toBe(3);
    expect(alpha.streakType).toBe('win');
    expect(alpha.longestWinStreak).toBe(3);
  });

  it('tracks multi-round loss streaks', () => {
    const rounds: RoundResult[] = [
      makeRound('R01', 'alpha', 'beta', '2025-01-01T00:00:00Z'),
      makeRound('R02', 'alpha', 'beta', '2025-01-02T00:00:00Z'),
      makeRound('R03', 'alpha', 'beta', '2025-01-03T00:00:00Z'),
    ];
    const streaks = computeStreaks(rounds);
    const alpha = streaks.find((s) => s.competitor === 'alpha')!;
    expect(alpha.currentStreak).toBe(3);
    expect(alpha.streakType).toBe('loss');
    expect(alpha.longestWinStreak).toBe(0);
  });

  it('counts comebacks (win after a loss, ignoring ties)', () => {
    const rounds: RoundResult[] = [
      makeRound('R01', 'alpha', 'beta', '2025-01-01T00:00:00Z'),   // loss
      makeRound('R02', 'alpha', null, '2025-01-02T00:00:00Z'),     // tie
      makeRound('R03', 'alpha', 'alpha', '2025-01-03T00:00:00Z'),  // win (comeback — last non-tie was loss)
      makeRound('R04', 'alpha', 'beta', '2025-01-04T00:00:00Z'),   // loss
      makeRound('R05', 'alpha', 'alpha', '2025-01-05T00:00:00Z'),  // win (comeback)
    ];
    const streaks = computeStreaks(rounds);
    const alpha = streaks.find((s) => s.competitor === 'alpha')!;
    expect(alpha.comebacks).toBe(2);
    expect(alpha.currentStreak).toBe(1);
    expect(alpha.streakType).toBe('win');
  });

  it('tracks longest win streak across broken streaks', () => {
    const rounds: RoundResult[] = [
      makeRound('R01', 'alpha', 'alpha', '2025-01-01T00:00:00Z'),
      makeRound('R02', 'alpha', 'alpha', '2025-01-02T00:00:00Z'),
      makeRound('R03', 'alpha', 'beta', '2025-01-03T00:00:00Z'),   // loss breaks streak
      makeRound('R04', 'alpha', 'alpha', '2025-01-04T00:00:00Z'),
      makeRound('R05', 'alpha', 'alpha', '2025-01-05T00:00:00Z'),
      makeRound('R06', 'alpha', 'alpha', '2025-01-06T00:00:00Z'),
    ];
    const streaks = computeStreaks(rounds);
    const alpha = streaks.find((s) => s.competitor === 'alpha')!;
    expect(alpha.longestWinStreak).toBe(3); // R04-R06
    expect(alpha.currentStreak).toBe(3);
    expect(alpha.streakType).toBe('win');
  });

  it('sorts rounds chronologically by timestamp', () => {
    // Provide rounds out of order — should still compute correctly
    const rounds: RoundResult[] = [
      makeRound('R03', 'alpha', 'alpha', '2025-01-03T00:00:00Z'),
      makeRound('R01', 'alpha', 'beta', '2025-01-01T00:00:00Z'),
      makeRound('R02', 'alpha', 'alpha', '2025-01-02T00:00:00Z'),
    ];
    const streaks = computeStreaks(rounds);
    const alpha = streaks.find((s) => s.competitor === 'alpha')!;
    // Chronological: LOSS, WIN, WIN → current streak W2
    expect(alpha.currentStreak).toBe(2);
    expect(alpha.streakType).toBe('win');
    expect(alpha.longestWinStreak).toBe(2);
    expect(alpha.comebacks).toBe(1);
  });

  it('falls back to round_id sorting when timestamps missing', () => {
    const rounds: RoundResult[] = [
      makeRound('R03', 'alpha', 'alpha'),
      makeRound('R01', 'alpha', 'beta'),
      makeRound('R02', 'alpha', 'alpha'),
    ];
    const streaks = computeStreaks(rounds);
    const alpha = streaks.find((s) => s.competitor === 'alpha')!;
    // round_id order: R01=LOSS, R02=WIN, R03=WIN → current W2
    expect(alpha.currentStreak).toBe(2);
    expect(alpha.streakType).toBe('win');
  });

  it('excludes agent-only rounds', () => {
    const streaks = computeStreaks([...mockRounds, agentOnlyRound]);
    const maproom = streaks.find((s) => s.competitor === 'maproom')!;
    expect(maproom.currentStreak).toBe(1);
    expect(maproom.streakType).toBe('loss');
  });

  it('excludes calibration rounds', () => {
    const streaks = computeStreaks([...mockRounds, calibrationRound]);
    const maproom = streaks.find((s) => s.competitor === 'maproom')!;
    expect(maproom.currentStreak).toBe(1);
    expect(maproom.streakType).toBe('loss');
  });

  it('deduplicates by (round_id, competitor) keeping last entry', () => {
    // duplicateRound replaces R01 maproom — winner stays 'maproom' so no change in streaks
    const streaks = computeStreaks([...mockRounds, duplicateRound]);
    const maproom = streaks.find((s) => s.competitor === 'maproom')!;
    expect(maproom.currentStreak).toBe(1);
    expect(maproom.streakType).toBe('loss');
  });

  it('returns empty array for empty input', () => {
    expect(computeStreaks([])).toEqual([]);
  });

  it('returns empty array when no scored rounds exist', () => {
    expect(computeStreaks([agentOnlyRound, calibrationRound])).toEqual([]);
  });

  it('handles a single round', () => {
    const rounds: RoundResult[] = [
      makeRound('R01', 'alpha', 'alpha', '2025-01-01T00:00:00Z'),
    ];
    const streaks = computeStreaks(rounds);
    expect(streaks).toHaveLength(1);
    const alpha = streaks[0];
    expect(alpha.currentStreak).toBe(1);
    expect(alpha.streakType).toBe('win');
    expect(alpha.longestWinStreak).toBe(1);
    expect(alpha.comebacks).toBe(0);
  });

  it('handles tie streaks', () => {
    const rounds: RoundResult[] = [
      makeRound('R01', 'alpha', null, '2025-01-01T00:00:00Z'),
      makeRound('R02', 'alpha', 'tie', '2025-01-02T00:00:00Z'),
      makeRound('R03', 'alpha', null, '2025-01-03T00:00:00Z'),
    ];
    const streaks = computeStreaks(rounds);
    const alpha = streaks.find((s) => s.competitor === 'alpha')!;
    expect(alpha.currentStreak).toBe(3);
    expect(alpha.streakType).toBe('tie');
    expect(alpha.longestWinStreak).toBe(0);
  });
});

/** Helper to create a minimal scored round */
function makeRound(
  round_id: string,
  competitor: string,
  round_winner: string | null,
  timestamp?: string,
): RoundResult {
  return {
    schema_version: 1,
    round_id,
    competitor,
    round_type: 'regular',
    codebase: 'django',
    phase: 1,
    precision: 3,
    recall: 3,
    insight: 3,
    total: 9,
    calls: 10,
    time_s: 100,
    source: 'score',
    round_winner,
    is_calibration: false,
    ...(timestamp ? { timestamp } : {}),
  };
}
