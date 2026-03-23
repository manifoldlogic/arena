import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, afterEach } from 'vitest';
import { DataProvider } from '@/providers/data-provider';
import { useCompetitionData } from '@/hooks/use-competition-data';
import { mockFetchSuccess, mockFetchFailure } from '@/test/mocks/handlers';

// Mock EventSource globally to prevent SSE connections in tests
class MockEventSource {
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  close() {}
  addEventListener() {}
  removeEventListener() {}
}
Object.defineProperty(globalThis, 'EventSource', {
  writable: true,
  value: MockEventSource,
});

function DataDisplay() {
  const { rounds, standings, loading, error, refetch } = useCompetitionData();
  if (loading) return <div>Loading...</div>;
  if (error) return (
    <div>
      <span>Error: {error.message}</span>
      <button onClick={refetch}>Retry</button>
    </div>
  );
  return (
    <div>
      <span data-testid="rounds-count">{rounds.length} rounds</span>
      <span data-testid="standings-count">{standings.length} standings</span>
    </div>
  );
}

describe('DataProvider', () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
  });

  it('shows loading state initially', () => {
    cleanup = mockFetchSuccess();
    render(
      <DataProvider>
        <DataDisplay />
      </DataProvider>,
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('fetches and displays data on success', async () => {
    cleanup = mockFetchSuccess();
    render(
      <DataProvider>
        <DataDisplay />
      </DataProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('rounds-count')).toHaveTextContent('2 rounds');
    });
    expect(screen.getByTestId('standings-count')).toHaveTextContent('2 standings');
  });

  it('shows error on fetch failure', async () => {
    cleanup = mockFetchFailure('Server down');
    render(
      <DataProvider>
        <DataDisplay />
      </DataProvider>,
    );
    await waitFor(() => {
      expect(screen.getByText('Error: Server down')).toBeInTheDocument();
    });
  });

  it('refetches data on retry', async () => {
    const user = userEvent.setup();
    // Start with failure
    cleanup = mockFetchFailure('Server down');
    render(
      <DataProvider>
        <DataDisplay />
      </DataProvider>,
    );
    await waitFor(() => {
      expect(screen.getByText('Error: Server down')).toBeInTheDocument();
    });

    // Switch to success and retry
    cleanup();
    cleanup = mockFetchSuccess();
    await user.click(screen.getByText('Retry'));

    await waitFor(() => {
      expect(screen.getByTestId('rounds-count')).toHaveTextContent('2 rounds');
    });
  });
});
