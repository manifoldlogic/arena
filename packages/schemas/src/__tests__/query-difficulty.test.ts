import { describe, it, expect } from 'vitest';
import type { QueryDifficulty, RoundResult } from '../index.js';

describe('QueryDifficulty type', () => {
  const validDifficulties: QueryDifficulty[] = ['breadth', 'depth', 'constrained'];

  it('accepts all valid difficulty values on RoundResult', () => {
    for (const difficulty of validDifficulties) {
      const result: RoundResult = {
        schema_version: 1,
        round_id: 'r1',
        competitor: 'claude-code',
        round_type: 'regular',
        codebase: 'django',
        phase: 1,
        calls: 5,
        time_s: 30,
        source: 'score',
        is_calibration: false,
        query_difficulty: difficulty,
      };
      expect(result.query_difficulty).toBe(difficulty);
    }
  });

  it('allows query_difficulty to be omitted', () => {
    const result: RoundResult = {
      schema_version: 1,
      round_id: 'r1',
      competitor: 'claude-code',
      round_type: 'regular',
      codebase: 'django',
      phase: 1,
      calls: 5,
      time_s: 30,
      source: 'score',
      is_calibration: false,
    };
    expect(result.query_difficulty).toBeUndefined();
  });
});
