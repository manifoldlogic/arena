import type { CompetitorStanding } from '@arena/schemas';

export interface WinTieLossEntry {
  competitor: string;
  wins: number;
  ties: number;
  losses: number;
  total: number;
}

/**
 * Extract win-tie-loss data from standings for donut chart visualization.
 * Trivially derived from CompetitorStanding[].
 */
export function computeWinTieLoss(standings: CompetitorStanding[]): WinTieLossEntry[] {
  return standings.map((s) => ({
    competitor: s.competitor,
    wins: s.wins,
    ties: s.ties,
    losses: s.losses,
    total: s.rounds,
  }));
}
