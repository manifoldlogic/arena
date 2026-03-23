/**
 * Hook for managing round list filters and sorting via URL search params.
 */
import { useSearchParams } from 'react-router-dom';
import { useMemo, useCallback } from 'react';
import type { RoundGroup } from '@/lib/round-transforms';
import type { QueryCategory, RoundType } from '@arena/schemas';

export interface RoundFilters {
  codebase: string | null;
  category: QueryCategory | null;
  roundType: RoundType | null;
  winner: string | null;
}

export type SortField = 'roundId' | 'codebase' | 'total' | 'winner';
export type SortDir = 'asc' | 'desc';

export interface RoundFiltersState {
  filters: RoundFilters;
  sortField: SortField;
  sortDir: SortDir;
  setFilter: <K extends keyof RoundFilters>(key: K, value: RoundFilters[K]) => void;
  clearFilters: () => void;
  setSort: (field: SortField) => void;
  applyFilters: (groups: RoundGroup[]) => RoundGroup[];
}

const FILTER_KEYS: (keyof RoundFilters)[] = ['codebase', 'category', 'roundType', 'winner'];

export function useRoundFilters(): RoundFiltersState {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: RoundFilters = useMemo(
    () => ({
      codebase: searchParams.get('codebase'),
      category: searchParams.get('category') as QueryCategory | null,
      roundType: searchParams.get('roundType') as RoundType | null,
      winner: searchParams.get('winner'),
    }),
    [searchParams],
  );

  const sortField = (searchParams.get('sort') as SortField) || 'roundId';
  const sortDir = (searchParams.get('dir') as SortDir) || 'desc';

  const setFilter = useCallback(
    <K extends keyof RoundFilters>(key: K, value: RoundFilters[K]) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value == null || value === '') {
          next.delete(key);
        } else {
          next.set(key, value);
        }
        return next;
      });
    },
    [setSearchParams],
  );

  const clearFilters = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const key of FILTER_KEYS) next.delete(key);
      return next;
    });
  }, [setSearchParams]);

  const setSort = useCallback(
    (field: SortField) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (field === sortField) {
          next.set('dir', sortDir === 'asc' ? 'desc' : 'asc');
        } else {
          next.set('sort', field);
          next.set('dir', 'desc');
        }
        return next;
      });
    },
    [setSearchParams, sortField, sortDir],
  );

  const applyFilters = useCallback(
    (groups: RoundGroup[]): RoundGroup[] => {
      let filtered = groups;

      if (filters.codebase) {
        filtered = filtered.filter((g) => g.codebase === filters.codebase);
      }
      if (filters.roundType) {
        filtered = filtered.filter((g) => g.roundType === filters.roundType);
      }
      if (filters.category) {
        filtered = filtered.filter((g) =>
          g.results.some((r) => r.query_category === filters.category),
        );
      }
      if (filters.winner) {
        filtered = filtered.filter((g) =>
          g.results.some((r) => r.round_winner === filters.winner),
        );
      }

      // Sort
      const sorted = [...filtered].sort((a, b) => {
        let cmp = 0;
        switch (sortField) {
          case 'roundId':
            cmp = a.roundId.localeCompare(b.roundId);
            break;
          case 'codebase':
            cmp = a.codebase.localeCompare(b.codebase);
            break;
          case 'total': {
            const scoresA = a.results.map((r) => r.total ?? 0);
            const scoresB = b.results.map((r) => r.total ?? 0);
            const maxA = scoresA.length > 0 ? Math.max(...scoresA) : 0;
            const maxB = scoresB.length > 0 ? Math.max(...scoresB) : 0;
            cmp = maxA - maxB;
            break;
          }
          case 'winner': {
            const winA = a.results.find((r) => r.round_winner)?.round_winner ?? '';
            const winB = b.results.find((r) => r.round_winner)?.round_winner ?? '';
            cmp = winA.localeCompare(winB);
            break;
          }
        }
        return sortDir === 'asc' ? cmp : -cmp;
      });

      return sorted;
    },
    [filters, sortField, sortDir],
  );

  return { filters, sortField, sortDir, setFilter, clearFilters, setSort, applyFilters };
}
