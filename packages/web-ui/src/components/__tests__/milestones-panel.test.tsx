/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { RoundResult } from '@arena/schemas';
import { MilestonesPanel } from '../rounds/MilestonesPanel';

function mkRound(overrides: Partial<RoundResult> & { round_id: string; competitor: string }): RoundResult {
  return {
    schema_version: 1,
    round_type: 'regular',
    codebase: 'django',
    phase: 1,
    calls: 10,
    time_s: 30,
    source: 'score',
    is_calibration: false,
    precision: 3,
    recall: 3,
    insight: 3,
    total: 9,
    ...overrides,
  };
}

afterEach(() => cleanup());

describe('MilestonesPanel', () => {
  it('renders all 5 milestones', () => {
    render(<MilestonesPanel results={[]} />);
    expect(screen.getByText('First Signal Round')).toBeInTheDocument();
    expect(screen.getByText('Category Domination')).toBeInTheDocument();
    expect(screen.getByText('Depth Query Explored')).toBeInTheDocument();
    expect(screen.getByText('Comeback Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Paradigm Signature Found')).toBeInTheDocument();
  });

  it('shows 0/5 achieved with no data', () => {
    render(<MilestonesPanel results={[]} />);
    expect(screen.getByText('0/5 achieved')).toBeInTheDocument();
  });

  it('shows achieved count and round info', () => {
    const data = [
      mkRound({ round_id: 'S1', competitor: 'A', total: 3 }),
      mkRound({ round_id: 'S1', competitor: 'B', total: 10 }),
    ];
    render(<MilestonesPanel results={data} />);
    // First Signal Round achieved (spread=7)
    expect(screen.getByText(/1\/5 achieved/)).toBeInTheDocument();
    expect(screen.getByText(/Achieved in S1/)).toBeInTheDocument();
  });

  it('renders the heading', () => {
    render(<MilestonesPanel results={[]} />);
    expect(screen.getByText('Research Milestones')).toBeInTheDocument();
  });

  it('renders milestone descriptions', () => {
    render(<MilestonesPanel results={[]} />);
    expect(screen.getByText(/scoring spread reached 5/)).toBeInTheDocument();
    expect(screen.getByText(/depth-difficulty query/)).toBeInTheDocument();
  });
});
