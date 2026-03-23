/**
 * Data hook for competition rounds.
 *
 * In production this will fetch from the API / SSE stream.
 * For now it returns a realistic mock dataset for development.
 */
import { useMemo } from 'react';
import type { RoundResult, QueryCategory } from '@arena/schemas';

const COMPETITORS = ['Claude', 'GPT-4o'] as const;
const CODEBASES = ['django', 'fastapi', 'mattermost-webapp'] as const;
const CATEGORIES: QueryCategory[] = [
  'flow', 'pattern', 'relationship', 'boundary', 'lifecycle',
  'error-handling', 'config', 'performance', 'security', 'testing', 'integration',
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateMockRounds(): RoundResult[] {
  const rng = seededRandom(42);
  const rounds: RoundResult[] = [];
  let roundNum = 1;

  for (const codebase of CODEBASES) {
    const phase = codebase === 'mattermost-webapp' ? 2 : 1;
    const numRounds = codebase === 'mattermost-webapp' ? 8 : 12;

    for (let i = 0; i < numRounds; i++) {
      const roundId = `R${String(roundNum).padStart(3, '0')}`;
      const category = CATEGORIES[Math.floor(rng() * CATEGORIES.length)];

      for (const competitor of COMPETITORS) {
        // Claude slightly stronger overall, GPT-4o better at some categories
        const bias = competitor === 'Claude' ? 0.3 : 0;
        const categoryBonus =
          competitor === 'GPT-4o' && ['config', 'security', 'testing'].includes(category)
            ? 0.5 : 0;

        const precision = Math.min(5, Math.max(1, Math.round(3 + (rng() - 0.5) * 2 + bias + categoryBonus)));
        const recall = Math.min(5, Math.max(1, Math.round(3 + (rng() - 0.5) * 2 + bias)));
        const insight = Math.min(5, Math.max(1, Math.round(2.5 + (rng() - 0.5) * 2.5 + bias + categoryBonus)));
        const total = precision + recall + insight;

        rounds.push({
          schema_version: 1,
          round_id: roundId,
          competitor,
          round_type: 'regular',
          codebase,
          phase,
          query_category: category,
          precision,
          recall,
          insight,
          total,
          calls: Math.round(5 + rng() * 15),
          time_s: Math.round(10 + rng() * 50),
          source: 'score',
          is_calibration: false,
          timestamp: new Date(2025, 0, 1 + roundNum).toISOString(),
        });
      }
      roundNum++;
    }
  }

  // Inject a few close calls (margin ≤ 1)
  const closeCallIndices = [2, 8, 20]; // 0-indexed pairs
  for (const idx of closeCallIndices) {
    const pairStart = idx * 2;
    if (pairStart + 1 < rounds.length) {
      const other = rounds[pairStart + 1];
      const diff = Math.round(rng()); // 0 or 1
      other.precision = rounds[pairStart].precision!;
      other.recall = rounds[pairStart].recall!;
      other.insight = rounds[pairStart].insight! + diff;
      other.total = other.precision! + other.recall! + other.insight!;
    }
  }

  return rounds;
}

const MOCK_ROUNDS = generateMockRounds();

export interface CompetitionData {
  rounds: RoundResult[];
  competitors: string[];
  codebases: string[];
}

export function useCompetitionData(): CompetitionData {
  return useMemo(() => {
    const competitors = [...new Set(MOCK_ROUNDS.map((r) => r.competitor))].sort();
    const codebases = [...new Set(MOCK_ROUNDS.map((r) => r.codebase))].sort();
    return { rounds: MOCK_ROUNDS, competitors, codebases };
  }, []);
}
