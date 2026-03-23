import { useEffect, useRef, useState, useCallback } from 'react';
import type { RoundResult, CompetitorStanding } from '@arena/schemas';

export interface UseSSEOptions {
  url: string;
  onRoundUpdate: (round: RoundResult) => void;
  onStandingsUpdate: (standings: CompetitorStanding[]) => void;
  enabled?: boolean;
}

export interface UseSSEReturn {
  connected: boolean;
  reconnecting: boolean;
  error: Error | null;
}

const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;
const BACKOFF_MULTIPLIER = 2;
const STABLE_CONNECTION_MS = 5000;

export function useSSE({
  url,
  onRoundUpdate,
  onStandingsUpdate,
  enabled = true,
}: UseSSEOptions): UseSSEReturn {
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const retryDelayRef = useRef(INITIAL_RETRY_DELAY);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const connectedAtRef = useRef<number>(0);
  const eventSourceRef = useRef<EventSource | undefined>(undefined);

  // Use refs for callbacks to avoid reconnection cycles
  const onRoundUpdateRef = useRef(onRoundUpdate);
  onRoundUpdateRef.current = onRoundUpdate;
  const onStandingsUpdateRef = useRef(onStandingsUpdate);
  onStandingsUpdateRef.current = onStandingsUpdate;

  const connect = useCallback(() => {
    if (typeof EventSource === 'undefined') return;

    try {
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        setConnected(true);
        setReconnecting(false);
        setError(null);
        connectedAtRef.current = Date.now();
      };

      es.addEventListener('round-update', (event) => {
        try {
          const round = JSON.parse(event.data) as RoundResult;
          onRoundUpdateRef.current(round);
        } catch {
          // Ignore malformed events
        }
      });

      es.addEventListener('standings-update', (event) => {
        try {
          const standings = JSON.parse(event.data) as CompetitorStanding[];
          onStandingsUpdateRef.current(standings);
        } catch {
          // Ignore malformed events
        }
      });

      es.onerror = () => {
        es.close();
        setConnected(false);

        // Reset delay if connection was stable
        const connectionDuration = Date.now() - connectedAtRef.current;
        if (connectionDuration > STABLE_CONNECTION_MS) {
          retryDelayRef.current = INITIAL_RETRY_DELAY;
        }

        setReconnecting(true);
        setError(new Error('SSE connection lost'));

        retryTimeoutRef.current = setTimeout(() => {
          retryDelayRef.current = Math.min(
            retryDelayRef.current * BACKOFF_MULTIPLIER,
            MAX_RETRY_DELAY,
          );
          connect();
        }, retryDelayRef.current);
      };
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to connect'));
    }
  }, [url]);

  useEffect(() => {
    if (!enabled) {
      eventSourceRef.current?.close();
      setConnected(false);
      setReconnecting(false);
      return;
    }

    connect();

    return () => {
      eventSourceRef.current?.close();
      clearTimeout(retryTimeoutRef.current);
      setConnected(false);
      setReconnecting(false);
    };
  }, [enabled, connect]);

  return { connected, reconnecting, error };
}
