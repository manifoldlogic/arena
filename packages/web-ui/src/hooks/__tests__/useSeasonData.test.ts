import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSeasonData } from '@/hooks/useSeasonData';
import type { SeasonsData } from '@arena/schemas';

const MOCK_SEASONS: SeasonsData = {
  seasons: [
    {
      id: 's1',
      name: 'The Mattermost Campaign',
      codebase: 'mattermost-webapp',
      chapters: [
        {
          id: 's1-ch1',
          name: 'First Contact',
          round_range: ['R19', 'R22'],
          theme: 'Initial exploration.',
          status: 'closed',
        },
        {
          id: 's1-ch2',
          name: 'Pattern Recognition',
          round_range: ['R23', 'R27'],
          theme: 'Deeper queries.',
          status: 'in_progress',
          thesis: 'Structured traversal wins.',
        },
      ],
    },
  ],
};

describe('useSeasonData', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('starts in loading state', () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {}), // never resolves
    );
    const { result } = renderHook(() => useSeasonData());
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('fetches and returns season data', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_SEASONS),
    });

    const { result } = renderHook(() => useSeasonData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(MOCK_SEASONS);
    expect(result.current.error).toBeNull();
  });

  it('handles fetch errors', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 503,
    });

    const { result } = renderHook(() => useSeasonData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error!.message).toContain('503');
  });

  it('handles network errors', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Network failure'),
    );

    const { result } = renderHook(() => useSeasonData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error!.message).toBe('Network failure');
  });
});
