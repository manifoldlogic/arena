import { useState, useEffect } from 'react';
import type { SeasonsData } from '@arena/schemas';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export interface SeasonDataResult {
  data: SeasonsData | null;
  loading: boolean;
  error: Error | null;
}

export function useSeasonData(): SeasonDataResult {
  const [data, setData] = useState<SeasonsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSeasons() {
      try {
        const res = await fetch(`${API_BASE}/api/seasons`);
        if (!res.ok) {
          throw new Error(`Failed to fetch seasons: ${res.status}`);
        }
        const json = await res.json() as SeasonsData;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchSeasons();
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error };
}
