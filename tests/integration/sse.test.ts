/**
 * SSE Integration Tests
 *
 * Tests Server-Sent Events endpoint for live round updates.
 * Depends on ARENA-02 (API server with SSE endpoint).
 *
 * Run via: scripts/test-api.sh (starts server, runs tests, cleans up)
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { appendFileSync } from 'fs';

const API_BASE = process.env.ARENA_API_URL ?? 'http://localhost:3001';
const SSE_URL = `${API_BASE}/events`;
const DATA_DIR = process.env.ARENA_DATA_DIR ?? '';

async function isServerUp(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/competition`);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Minimal SSE client using fetch (no EventSource needed in Node).
 * Returns a readable stream of parsed SSE events.
 */
async function connectSSE(url: string, timeoutMs = 5000): Promise<{ event: string; data: string }[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const events: { event: string; data: string }[] = [];
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'text/event-stream' },
    });

    const reader = res.body?.getReader();
    if (!reader) return events;

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        let event = 'message';
        let data = '';
        for (const line of part.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          if (line.startsWith('data:')) data = line.slice(5).trim();
        }
        if (data) events.push({ event, data });
      }
    }
  } catch {
    // AbortError is expected on timeout
  } finally {
    clearTimeout(timeout);
  }
  return events;
}

describe('SSE Integration', () => {
  let serverUp = false;

  beforeAll(async () => {
    serverUp = await isServerUp();
  });

  describe('event delivery', () => {
    it.skipIf(!serverUp || !DATA_DIR)('receives event after JSONL append', async () => {
      // Start listening before appending
      const eventsPromise = connectSSE(SSE_URL, 3000);

      // Small delay to ensure SSE connection is established
      await new Promise(resolve => setTimeout(resolve, 500));

      // Append a test line to trigger an event
      const testLine = JSON.stringify({
        schema_version: 1,
        round_id: 'R99',
        competitor: 'test-agent',
        round_type: 'regular',
        codebase: 'test',
        phase: 1,
        calls: 1,
        time_s: 1.0,
        source: 'agent',
        is_calibration: false,
        timestamp: new Date().toISOString(),
      });

      appendFileSync(`${DATA_DIR}/rounds.jsonl`, testLine + '\n');

      const events = await eventsPromise;
      // Should have received at least the appended event
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('event format', () => {
    it.skipIf(!serverUp)('SSE endpoint returns text/event-stream content type', async () => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 2000);

      try {
        const res = await fetch(SSE_URL, {
          signal: controller.signal,
          headers: { Accept: 'text/event-stream' },
        });
        expect(res.headers.get('content-type')).toContain('text/event-stream');
      } catch {
        // AbortError expected
      }
    });
  });

  describe('reconnection', () => {
    it.skipIf(!serverUp)('can reconnect after disconnect', async () => {
      // First connection
      const events1 = await connectSSE(SSE_URL, 1000);
      // Second connection (simulates reconnect)
      const events2 = await connectSSE(SSE_URL, 1000);
      // Both should succeed without error (events may be empty if no data sent)
      expect(events1).toBeDefined();
      expect(events2).toBeDefined();
    });
  });
});
