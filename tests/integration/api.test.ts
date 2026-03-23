/**
 * API Integration Tests
 *
 * Tests the Arena API server endpoints against the consistency test fixture.
 * Depends on ARENA-02 (API server implementation).
 *
 * Run via: scripts/test-api.sh (starts server, runs tests, cleans up)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const API_BASE = process.env.ARENA_API_URL ?? 'http://localhost:3001';
const GOLDEN_PATH = resolve(__dirname, '../../packages/pipeline/tests/cross-system/consistency-expected.json');

function loadGolden(): Record<string, unknown> {
  return JSON.parse(readFileSync(GOLDEN_PATH, 'utf-8'));
}

// Skip all tests if API server is not running (ARENA-02 dependency)
async function isServerUp(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/competition`);
    return res.ok;
  } catch {
    return false;
  }
}

describe('API Integration', () => {
  let serverUp = false;
  let expected: Record<string, unknown>;

  beforeAll(async () => {
    serverUp = await isServerUp();
    if (serverUp) {
      expected = loadGolden();
    }
  });

  describe('GET /api/rounds', () => {
    it.skipIf(!serverUp)('returns all entries with valid schema', async () => {
      const res = await fetch(`${API_BASE}/api/rounds`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      // Each entry should have required fields
      for (const entry of data) {
        expect(entry).toHaveProperty('round_id');
        expect(entry).toHaveProperty('competitor');
        expect(entry).toHaveProperty('source');
      }
    });
  });

  describe('GET /api/standings', () => {
    it.skipIf(!serverUp)('returns correct standings matching golden file', async () => {
      const res = await fetch(`${API_BASE}/api/standings`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(expected.overall);
    });
  });

  describe('GET /api/competition', () => {
    it.skipIf(!serverUp)('returns competition status', async () => {
      const res = await fetch(`${API_BASE}/api/competition`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('status');
    });
  });

  describe('GET /api/rounds/:id', () => {
    it.skipIf(!serverUp)('returns entries for a valid round', async () => {
      const res = await fetch(`${API_BASE}/api/rounds/R01`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      for (const entry of data) {
        expect(entry.round_id).toBe('R01');
      }
    });

    it.skipIf(!serverUp)('returns 404 for nonexistent round', async () => {
      const res = await fetch(`${API_BASE}/api/rounds/NONEXISTENT`);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/analytics', () => {
    it.skipIf(!serverUp)('returns divergences, closest calls, dimension totals', async () => {
      const res = await fetch(`${API_BASE}/api/analytics`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('divergences');
      expect(data).toHaveProperty('closest_calls');
      expect(data).toHaveProperty('dimension_totals');
      expect(data.divergences).toEqual(expected.divergences);
      expect(data.closest_calls).toEqual(expected.closest_calls);
      expect(data.dimension_totals).toEqual(expected.dimension_totals);
    });
  });

  describe('concurrent requests', () => {
    it.skipIf(!serverUp)('10 parallel GETs to /api/standings return identical data', async () => {
      const requests = Array.from({ length: 10 }, () =>
        fetch(`${API_BASE}/api/standings`).then(r => r.json())
      );
      const results = await Promise.all(requests);
      const first = JSON.stringify(results[0]);
      for (const result of results.slice(1)) {
        expect(JSON.stringify(result)).toBe(first);
      }
    });
  });
});
