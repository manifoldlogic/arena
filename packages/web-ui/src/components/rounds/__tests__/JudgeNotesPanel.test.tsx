import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import type { RoundResult } from '@arena/schemas';
import { JudgeNotesPanel } from '../JudgeNotesPanel';

function makeResult(overrides: Partial<RoundResult> = {}): RoundResult {
  return {
    schema_version: 1,
    round_id: 'R01',
    competitor: 'claude-code',
    round_type: 'regular',
    codebase: 'django',
    phase: 1,
    calls: 10,
    time_s: 30,
    source: 'score',
    is_calibration: false,
    ...overrides,
  };
}

describe('JudgeNotesPanel', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows empty state when no content is available', () => {
    render(<JudgeNotesPanel results={[makeResult()]} />);
    expect(screen.getByText('No judge notes available.')).toBeInTheDocument();
  });

  // --- Headline ---

  it('shows headline for a clear winner', () => {
    const results = [
      makeResult({ competitor: 'claude-code', precision: 9, recall: 8, insight: 8, total: 25 }),
      makeResult({ competitor: 'codex-cli', precision: 7, recall: 6, insight: 5, total: 18 }),
    ];
    render(<JudgeNotesPanel results={results} />);
    const headline = screen.getByTestId('round-headline');
    expect(headline).toHaveTextContent('claude-code takes it by 7 over codex-cli');
  });

  it('shows razor-thin margin headline when difference is 1-2', () => {
    const results = [
      makeResult({ competitor: 'claude-code', precision: 8, recall: 8, insight: 8, total: 24 }),
      makeResult({ competitor: 'codex-cli', precision: 8, recall: 7, insight: 8, total: 23 }),
    ];
    render(<JudgeNotesPanel results={results} />);
    const headline = screen.getByTestId('round-headline');
    expect(headline).toHaveTextContent('razor-thin margin');
  });

  it('shows tie headline when totals are equal', () => {
    const results = [
      makeResult({ competitor: 'claude-code', precision: 8, recall: 8, insight: 8, total: 24 }),
      makeResult({ competitor: 'codex-cli', precision: 8, recall: 8, insight: 8, total: 24 }),
    ];
    render(<JudgeNotesPanel results={results} />);
    const headline = screen.getByTestId('round-headline');
    expect(headline).toHaveTextContent('Tie at 24');
    expect(headline).toHaveTextContent('claude-code');
    expect(headline).toHaveTextContent('codex-cli');
  });

  it('does not show headline with fewer than 2 scored results', () => {
    const results = [
      makeResult({ competitor: 'claude-code', precision: 8, recall: 8, insight: 8, total: 24 }),
    ];
    render(<JudgeNotesPanel results={results} />);
    expect(screen.queryByTestId('round-headline')).toBeNull();
  });

  // --- Decisive Dimension ---

  it('shows decisive dimension with a bar', () => {
    const results = [
      makeResult({ competitor: 'claude-code', precision: 9, recall: 7, insight: 8, total: 24 }),
      makeResult({ competitor: 'codex-cli', precision: 5, recall: 7, insight: 7, total: 19 }),
    ];
    render(<JudgeNotesPanel results={results} />);
    expect(screen.getByTestId('decisive-label')).toHaveTextContent('Precision');
    expect(screen.getByTestId('decisive-delta')).toHaveTextContent('+4');
    expect(screen.getByTestId('decisive-bar')).toBeInTheDocument();
  });

  it('picks recall when recall is the biggest swing', () => {
    const results = [
      makeResult({ competitor: 'claude-code', precision: 7, recall: 10, insight: 7, total: 24 }),
      makeResult({ competitor: 'codex-cli', precision: 7, recall: 5, insight: 7, total: 19 }),
    ];
    render(<JudgeNotesPanel results={results} />);
    expect(screen.getByTestId('decisive-label')).toHaveTextContent('Recall');
    expect(screen.getByTestId('decisive-delta')).toHaveTextContent('+5');
  });

  it('picks insight when insight is the biggest swing', () => {
    const results = [
      makeResult({ competitor: 'claude-code', precision: 7, recall: 7, insight: 10, total: 24 }),
      makeResult({ competitor: 'codex-cli', precision: 7, recall: 7, insight: 4, total: 18 }),
    ];
    render(<JudgeNotesPanel results={results} />);
    expect(screen.getByTestId('decisive-label')).toHaveTextContent('Insight');
    expect(screen.getByTestId('decisive-delta')).toHaveTextContent('+6');
  });

  it('does not show decisive dimension when delta is 0', () => {
    const results = [
      makeResult({ competitor: 'claude-code', precision: 8, recall: 8, insight: 8, total: 24 }),
      makeResult({ competitor: 'codex-cli', precision: 8, recall: 8, insight: 8, total: 24 }),
    ];
    render(<JudgeNotesPanel results={results} />);
    expect(screen.queryByTestId('decisive-bar')).toBeNull();
  });

  // --- Next Query Hint ---

  it('displays next_query_hint when present', () => {
    const results = [
      makeResult({
        competitor: 'claude-code',
        total: 24,
        precision: 8,
        recall: 8,
        insight: 8,
        next_query_hint: 'Try error-handling edge cases',
      }),
      makeResult({ competitor: 'codex-cli', total: 20, precision: 7, recall: 7, insight: 6 }),
    ];
    render(<JudgeNotesPanel results={results} />);
    const hint = screen.getByTestId('next-query-hint');
    expect(hint).toHaveTextContent('Try error-handling edge cases');
  });

  it('does not show hint section when no results have next_query_hint', () => {
    const results = [
      makeResult({ competitor: 'claude-code', total: 24, precision: 8, recall: 8, insight: 8 }),
      makeResult({ competitor: 'codex-cli', total: 20, precision: 7, recall: 7, insight: 6 }),
    ];
    render(<JudgeNotesPanel results={results} />);
    expect(screen.queryByTestId('next-query-hint')).toBeNull();
  });

  // --- Judge Notes ---

  it('displays judge notes for competitors that have them', () => {
    const results = [
      makeResult({
        competitor: 'claude-code',
        judge_notes: 'Strong coverage of edge cases',
      }),
      makeResult({ competitor: 'codex-cli' }),
    ];
    render(<JudgeNotesPanel results={results} />);
    expect(screen.getByText('Strong coverage of edge cases')).toBeInTheDocument();
    expect(screen.getByText('claude-code')).toBeInTheDocument();
  });

  it('shows Judge Notes heading when notes are present', () => {
    const results = [
      makeResult({ competitor: 'claude-code', judge_notes: 'Good work' }),
    ];
    render(<JudgeNotesPanel results={results} />);
    expect(screen.getByText('Judge Notes')).toBeInTheDocument();
  });

  // --- Combined display ---

  it('shows all sections together when all data is present', () => {
    const results = [
      makeResult({
        competitor: 'claude-code',
        precision: 9,
        recall: 8,
        insight: 7,
        total: 24,
        judge_notes: 'Thorough analysis',
        next_query_hint: 'Explore lifecycle methods',
      }),
      makeResult({
        competitor: 'codex-cli',
        precision: 6,
        recall: 7,
        insight: 7,
        total: 20,
        judge_notes: 'Missed key patterns',
      }),
    ];
    render(<JudgeNotesPanel results={results} />);
    expect(screen.getByTestId('round-headline')).toBeInTheDocument();
    expect(screen.getByTestId('decisive-label')).toBeInTheDocument();
    expect(screen.getByTestId('next-query-hint')).toHaveTextContent('Explore lifecycle methods');
    expect(screen.getByText('Thorough analysis')).toBeInTheDocument();
    expect(screen.getByText('Missed key patterns')).toBeInTheDocument();
  });
});
