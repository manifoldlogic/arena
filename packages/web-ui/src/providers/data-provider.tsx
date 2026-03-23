import { createContext, useCallback, useEffect, useMemo, useReducer } from 'react';
import type { RoundResult, CompetitorStanding, CompetitionStatus } from '@arena/schemas';
import { useSSE } from '@/hooks/use-sse';
import type { CompetitionData } from '@/types/api';

export interface DataContextValue extends CompetitionData {
  sseConnected: boolean;
  sseReconnecting: boolean;
}

export const DataContext = createContext<DataContextValue | null>(null);

interface State {
  rounds: RoundResult[];
  standings: CompetitorStanding[];
  competition: CompetitionStatus | null;
  loading: boolean;
  error: Error | null;
}

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; rounds: RoundResult[]; standings: CompetitorStanding[]; competition: CompetitionStatus | null }
  | { type: 'FETCH_ERROR'; error: Error }
  | { type: 'UPDATE_ROUND'; round: RoundResult }
  | { type: 'UPDATE_STANDINGS'; standings: CompetitorStanding[] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return {
        rounds: action.rounds,
        standings: action.standings,
        competition: action.competition,
        loading: false,
        error: null,
      };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.error };
    case 'UPDATE_ROUND': {
      const exists = state.rounds.some(r => r.round_id === action.round.round_id);
      const rounds = exists
        ? state.rounds.map(r => r.round_id === action.round.round_id ? action.round : r)
        : [...state.rounds, action.round];
      return { ...state, rounds };
    }
    case 'UPDATE_STANDINGS':
      return { ...state, standings: action.standings };
  }
}

const initialState: State = {
  rounds: [],
  standings: [],
  competition: null,
  loading: true,
  error: null,
};

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const fetchData = useCallback(async () => {
    dispatch({ type: 'FETCH_START' });
    try {
      const [roundsRes, standingsRes, competitionRes] = await Promise.all([
        fetch('/api/rounds'),
        fetch('/api/standings'),
        fetch('/api/competition').catch(() => null),
      ]);

      if (!roundsRes.ok || !standingsRes.ok) {
        throw new Error('Failed to fetch competition data');
      }

      const rounds = await roundsRes.json() as RoundResult[];
      const standings = await standingsRes.json() as CompetitorStanding[];
      const competition = competitionRes?.ok
        ? await competitionRes.json() as CompetitionStatus
        : null;

      dispatch({ type: 'FETCH_SUCCESS', rounds, standings, competition });
    } catch (err) {
      dispatch({
        type: 'FETCH_ERROR',
        error: err instanceof Error ? err : new Error('Unknown error'),
      });
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // SSE integration — merges live updates into state
  const handleRoundUpdate = useCallback((round: RoundResult) => {
    dispatch({ type: 'UPDATE_ROUND', round });
  }, []);

  const handleStandingsUpdate = useCallback((standings: CompetitorStanding[]) => {
    dispatch({ type: 'UPDATE_STANDINGS', standings });
  }, []);

  const { connected: sseConnected, reconnecting: sseReconnecting } = useSSE({
    url: '/events',
    onRoundUpdate: handleRoundUpdate,
    onStandingsUpdate: handleStandingsUpdate,
    enabled: !state.loading && !state.error,
  });

  const value = useMemo<DataContextValue>(
    () => ({
      ...state,
      refetch: fetchData,
      sseConnected,
      sseReconnecting,
    }),
    [state, fetchData, sseConnected, sseReconnecting],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
