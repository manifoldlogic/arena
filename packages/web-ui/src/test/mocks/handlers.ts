import { mockRounds, mockStandings, mockCompetition } from './fixtures';

export function mockFetchSuccess() {
  const original = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();

    if (url.includes('/api/rounds')) {
      return new Response(JSON.stringify(mockRounds), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url.includes('/api/standings')) {
      return new Response(JSON.stringify(mockStandings), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url.includes('/api/competition')) {
      return new Response(JSON.stringify(mockCompetition), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response('Not Found', { status: 404 });
  };

  return () => {
    globalThis.fetch = original;
  };
}

export function mockFetchFailure(errorMessage = 'Network error') {
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error(errorMessage);
  };

  return () => {
    globalThis.fetch = original;
  };
}
