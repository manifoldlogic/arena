/**
 * SSE Hook Smoke Test
 *
 * Tests the useSSE hook with a mocked EventSource.
 * jsdom does not provide EventSource natively, so we mock it.
 *
 * Depends on ARENA-03 for the actual useSSE hook implementation.
 * Until then, tests the mock infrastructure and basic contract.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock EventSource for jsdom environment
class MockEventSource {
  static instances: MockEventSource[] = [];

  url: string;
  readyState = 0; // CONNECTING
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;
  private listeners = new Map<string, Set<(event: MessageEvent) => void>>();

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
    // Simulate connection
    setTimeout(() => {
      this.readyState = 1; // OPEN
      this.onopen?.(new Event('open'));
    }, 0);
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void) {
    this.listeners.get(type)?.delete(listener);
  }

  close() {
    this.readyState = 2; // CLOSED
  }

  // Test helper: simulate receiving a message
  _emit(type: string, data: string) {
    const event = new MessageEvent(type, { data });
    if (type === 'message') this.onmessage?.(event);
    this.listeners.get(type)?.forEach(l => l(event));
  }

  // Test helper: simulate an error
  _emitError() {
    this.onerror?.(new Event('error'));
  }

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;
}

describe('smoke: SSE mock infrastructure', () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    vi.stubGlobal('EventSource', MockEventSource);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('MockEventSource captures constructor URL', () => {
    const es = new EventSource('/events');
    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toBe('/events');
    (es as unknown as MockEventSource).close();
  });

  it('MockEventSource dispatches message events', () => {
    const es = new EventSource('/events') as unknown as MockEventSource;
    const messages: string[] = [];
    es.onmessage = (e) => messages.push(e.data);
    es._emit('message', '{"round_id":"R01"}');
    expect(messages).toEqual(['{"round_id":"R01"}']);
    es.close();
  });

  it('MockEventSource fires error for reconnection testing', () => {
    const es = new EventSource('/events') as unknown as MockEventSource;
    let errorFired = false;
    es.onerror = () => { errorFired = true; };
    es._emitError();
    expect(errorFired).toBe(true);
    es.close();
  });

  it('close sets readyState to CLOSED', () => {
    const es = new EventSource('/events') as unknown as MockEventSource;
    es.close();
    expect(es.readyState).toBe(2);
  });

  // TODO (ARENA-03): Add tests for actual useSSE hook:
  //   - import { useSSE } from '@/hooks/useSSE';
  //   - renderHook(() => useSSE('/events'));
  //   - Verify subscription URL, state updates, cleanup on unmount, reconnect on error
});
