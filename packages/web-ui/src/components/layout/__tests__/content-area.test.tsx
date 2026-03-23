import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, afterEach } from 'vitest';
import { mockFetchSuccess, mockFetchFailure } from '@/test/mocks/handlers';
import { renderWithRouter } from '@/test/test-utils';

// Mock EventSource globally
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

describe('ContentArea', () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
  });

  it('shows loading skeleton during initial fetch', () => {
    // Override fetch with a never-resolving promise to observe loading state
    const original = globalThis.fetch;
    globalThis.fetch = () => new Promise(() => {});
    try {
      renderWithRouter(['/']);
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    } finally {
      globalThis.fetch = original;
    }
  });

  it('shows content after successful fetch', async () => {
    cleanup = mockFetchSuccess();
    renderWithRouter(['/']);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    });
  });

  it('shows error display on fetch failure', async () => {
    cleanup = mockFetchFailure('API unavailable');
    renderWithRouter(['/']);
    await waitFor(() => {
      expect(screen.getByTestId('error-display')).toBeInTheDocument();
    });
    expect(screen.getByText('API unavailable')).toBeInTheDocument();
  });

  it('retries on error retry button click', async () => {
    const user = userEvent.setup();
    cleanup = mockFetchFailure('API unavailable');
    renderWithRouter(['/']);

    await waitFor(() => {
      expect(screen.getByTestId('error-display')).toBeInTheDocument();
    });

    // Switch to success
    cleanup();
    cleanup = mockFetchSuccess();
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    });
  });
});
