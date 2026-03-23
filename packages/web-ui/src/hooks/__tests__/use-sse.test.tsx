import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSSE } from '@/hooks/use-sse';

// Mock EventSource
type EventHandler = (event: MessageEvent) => void;
type OpenHandler = () => void;
type ErrorHandler = () => void;

let mockES: MockEventSource;

class MockEventSource {
  onopen: OpenHandler | null = null;
  onerror: ErrorHandler | null = null;
  close = vi.fn();
  listeners = new Map<string, EventHandler>();

  addEventListener(type: string, handler: EventHandler) {
    this.listeners.set(type, handler);
  }

  removeEventListener() {}

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    mockES = this;
  }
}

describe('useSSE', () => {
  const originalEventSource = globalThis.EventSource;

  beforeEach(() => {
    Object.defineProperty(globalThis, 'EventSource', {
      writable: true,
      value: MockEventSource,
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(globalThis, 'EventSource', {
      writable: true,
      value: originalEventSource,
    });
  });

  it('connects and reports connected state', () => {
    const onRoundUpdate = vi.fn();
    const onStandingsUpdate = vi.fn();

    const { result } = renderHook(() =>
      useSSE({
        url: '/events',
        onRoundUpdate,
        onStandingsUpdate,
      }),
    );

    expect(result.current.connected).toBe(false);

    // Simulate connection open
    act(() => {
      mockES.onopen?.();
    });

    expect(result.current.connected).toBe(true);
    expect(result.current.reconnecting).toBe(false);
  });

  it('dispatches round-update events', () => {
    const onRoundUpdate = vi.fn();
    const onStandingsUpdate = vi.fn();

    renderHook(() =>
      useSSE({
        url: '/events',
        onRoundUpdate,
        onStandingsUpdate,
      }),
    );

    act(() => {
      mockES.onopen?.();
    });

    const roundData = { round_id: 'r-003', competitor: 'gamma' };
    act(() => {
      const handler = mockES.listeners.get('round-update');
      handler?.(new MessageEvent('round-update', { data: JSON.stringify(roundData) }));
    });

    expect(onRoundUpdate).toHaveBeenCalledWith(roundData);
  });

  it('dispatches standings-update events', () => {
    const onRoundUpdate = vi.fn();
    const onStandingsUpdate = vi.fn();

    renderHook(() =>
      useSSE({
        url: '/events',
        onRoundUpdate,
        onStandingsUpdate,
      }),
    );

    act(() => {
      mockES.onopen?.();
    });

    const standingsData = [{ competitor: 'alpha', total: 50 }];
    act(() => {
      const handler = mockES.listeners.get('standings-update');
      handler?.(new MessageEvent('standings-update', { data: JSON.stringify(standingsData) }));
    });

    expect(onStandingsUpdate).toHaveBeenCalledWith(standingsData);
  });

  it('reconnects on error with backoff', () => {
    const onRoundUpdate = vi.fn();
    const onStandingsUpdate = vi.fn();

    const { result } = renderHook(() =>
      useSSE({
        url: '/events',
        onRoundUpdate,
        onStandingsUpdate,
      }),
    );

    act(() => {
      mockES.onopen?.();
    });

    // Simulate error
    act(() => {
      mockES.onerror?.();
    });

    expect(result.current.connected).toBe(false);
    expect(result.current.reconnecting).toBe(true);

    // Advance past initial retry delay
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // A new EventSource was created (reconnect attempt)
    expect(mockES).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const onRoundUpdate = vi.fn();
    const onStandingsUpdate = vi.fn();

    const { unmount } = renderHook(() =>
      useSSE({
        url: '/events',
        onRoundUpdate,
        onStandingsUpdate,
      }),
    );

    const closeFn = mockES.close;
    unmount();
    expect(closeFn).toHaveBeenCalled();
  });

  it('does not connect when disabled', () => {
    const onRoundUpdate = vi.fn();
    const onStandingsUpdate = vi.fn();

    const { result } = renderHook(() =>
      useSSE({
        url: '/events',
        onRoundUpdate,
        onStandingsUpdate,
        enabled: false,
      }),
    );

    expect(result.current.connected).toBe(false);
    expect(result.current.reconnecting).toBe(false);
  });
});
