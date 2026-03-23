/**
 * JSONL Schema Validation Tests
 *
 * Validates that JSONL fixtures conform to the RoundResult schema.
 * Tests both the consistency test fixture and (when present) production data.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import type { RoundResult, RoundType, Source, DivergenceSignal, QueryCategory } from '../index.js';

const VALID_ROUND_TYPES: RoundType[] = ['regular', 'bridge', 'calibration'];
const VALID_SOURCES: Source[] = ['agent', 'score'];
const VALID_DIVERGENCE_SIGNALS: DivergenceSignal[] = ['gray', 'yellow', 'signal'];
const VALID_CATEGORIES: QueryCategory[] = [
  'flow', 'pattern', 'relationship', 'boundary', 'lifecycle',
  'error-handling', 'config', 'performance', 'security', 'testing', 'integration',
];

function validateRoundResult(entry: Record<string, unknown>, lineNum: number): string[] {
  const errors: string[] = [];
  const ctx = `line ${lineNum} (${entry.round_id}/${entry.competitor})`;

  // Required fields
  if (typeof entry.schema_version !== 'number') errors.push(`${ctx}: schema_version must be number`);
  if (typeof entry.round_id !== 'string') errors.push(`${ctx}: round_id must be string`);
  if (typeof entry.competitor !== 'string') errors.push(`${ctx}: competitor must be string`);
  if (!VALID_ROUND_TYPES.includes(entry.round_type as RoundType)) {
    errors.push(`${ctx}: round_type '${entry.round_type}' not in ${VALID_ROUND_TYPES}`);
  }
  if (typeof entry.codebase !== 'string') errors.push(`${ctx}: codebase must be string`);
  if (typeof entry.phase !== 'number') errors.push(`${ctx}: phase must be number`);
  if (typeof entry.calls !== 'number') errors.push(`${ctx}: calls must be number`);
  if (typeof entry.time_s !== 'number') errors.push(`${ctx}: time_s must be number`);
  if (!VALID_SOURCES.includes(entry.source as Source)) {
    errors.push(`${ctx}: source '${entry.source}' not in ${VALID_SOURCES}`);
  }
  if (typeof entry.is_calibration !== 'boolean') errors.push(`${ctx}: is_calibration must be boolean`);

  // Conditional: score source should have quality fields
  if (entry.source === 'score') {
    if (entry.total == null) errors.push(`${ctx}: source=score should have total`);
    if (entry.precision == null) errors.push(`${ctx}: source=score should have precision`);
    if (entry.recall == null) errors.push(`${ctx}: source=score should have recall`);
    if (entry.insight == null) errors.push(`${ctx}: source=score should have insight`);
  }

  // Optional field type checks
  if (entry.query_category != null && !VALID_CATEGORIES.includes(entry.query_category as QueryCategory)) {
    errors.push(`${ctx}: query_category '${entry.query_category}' not valid`);
  }
  if (entry.divergence_signal != null && !VALID_DIVERGENCE_SIGNALS.includes(entry.divergence_signal as DivergenceSignal)) {
    errors.push(`${ctx}: divergence_signal '${entry.divergence_signal}' not valid`);
  }

  return errors;
}

function loadJsonl(path: string): Record<string, unknown>[] {
  return readFileSync(path, 'utf-8')
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
}

describe('JSONL Schema Validation', () => {
  const fixturePath = resolve(__dirname, '../../../pipeline/tests/cross-system/consistency-test-rounds.jsonl');

  describe('consistency-test-rounds.jsonl', () => {
    const entries = loadJsonl(fixturePath);

    it('has at least 16 entries', () => {
      expect(entries.length).toBeGreaterThanOrEqual(16);
    });

    it('all entries pass schema validation', () => {
      const allErrors: string[] = [];
      entries.forEach((entry, i) => {
        allErrors.push(...validateRoundResult(entry, i + 1));
      });
      expect(allErrors).toEqual([]);
    });

    it('all schema_version fields are 1', () => {
      for (const entry of entries) {
        expect(entry.schema_version).toBe(1);
      }
    });

    it('round_id format is consistent', () => {
      for (const entry of entries) {
        expect(entry.round_id).toMatch(/^R\d+$/);
      }
    });

    it('calibration rounds have is_calibration=true and round_type=calibration', () => {
      const calibration = entries.filter(e => e.round_type === 'calibration');
      for (const entry of calibration) {
        expect(entry.is_calibration).toBe(true);
      }
    });

    it('bridge rounds have series1_scores and series1_baseline', () => {
      const bridges = entries.filter(e => e.round_type === 'bridge');
      expect(bridges.length).toBeGreaterThan(0);
      for (const entry of bridges) {
        expect(entry.series1_scores).toBeDefined();
        expect(entry.series1_baseline).toBeDefined();
      }
    });
  });

  describe('production data/rounds.jsonl (if present)', () => {
    const prodPath = resolve(__dirname, '../../../../data/rounds.jsonl');
    const exists = existsSync(prodPath);

    it.skipIf(!exists)('all production entries pass schema validation', () => {
      const entries = loadJsonl(prodPath);
      const allErrors: string[] = [];
      entries.forEach((entry, i) => {
        allErrors.push(...validateRoundResult(entry, i + 1));
      });
      expect(allErrors).toEqual([]);
    });
  });
});
