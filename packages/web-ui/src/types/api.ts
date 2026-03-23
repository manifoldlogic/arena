import type { RoundResult, CompetitorStanding, CompetitionStatus } from '@arena/schemas';

export interface CompetitionData {
  rounds: RoundResult[];
  standings: CompetitorStanding[];
  competition: CompetitionStatus | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface SSEEvent {
  type: 'round-update' | 'standings-update';
  data: unknown;
}

export interface RoundUpdateEvent {
  type: 'round-update';
  data: RoundResult;
}

export interface StandingsUpdateEvent {
  type: 'standings-update';
  data: CompetitorStanding[];
}
