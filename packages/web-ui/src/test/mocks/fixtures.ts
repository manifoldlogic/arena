import type { RoundResult, CompetitorStanding, CompetitionStatus } from '@arena/schemas';

export const mockRounds: RoundResult[] = [
  {
    schema_version: 1,
    round_id: 'r-001',
    competitor: 'alpha',
    round_type: 'regular',
    codebase: 'django',
    phase: 1,
    precision: 8,
    recall: 7,
    insight: 9,
    total: 24,
    calls: 12,
    time_s: 45.2,
    source: 'score',
    round_winner: 'alpha',
    is_calibration: false,
    timestamp: '2026-03-20T10:00:00Z',
  },
  {
    schema_version: 1,
    round_id: 'r-002',
    competitor: 'beta',
    round_type: 'regular',
    codebase: 'django',
    phase: 1,
    precision: 6,
    recall: 8,
    insight: 7,
    total: 21,
    calls: 15,
    time_s: 62.1,
    source: 'score',
    round_winner: 'alpha',
    is_calibration: false,
    timestamp: '2026-03-20T10:00:00Z',
  },
];

export const mockStandings: CompetitorStanding[] = [
  {
    competitor: 'alpha',
    total: 48,
    wins: 3,
    ties: 0,
    losses: 1,
    rounds: 4,
    avg: 12,
  },
  {
    competitor: 'beta',
    total: 42,
    wins: 1,
    ties: 0,
    losses: 3,
    rounds: 4,
    avg: 10.5,
  },
];

export const mockCompetition: CompetitionStatus = {
  competition: 'olympics-v1',
  codebase: 'django',
  competitors: ['alpha', 'beta'],
  phase: 1,
  status: 'in_progress',
  rounds_planned: 20,
  rounds_completed: 4,
};
