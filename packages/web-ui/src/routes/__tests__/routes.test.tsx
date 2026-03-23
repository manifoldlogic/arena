import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { renderWithRouter } from '@/test/test-utils';

describe('Route rendering', () => {
  it('renders Overview at /', async () => {
    renderWithRouter(['/']);
    expect(
      await screen.findByRole('heading', { name: 'Overview' }),
    ).toBeInTheDocument();
  });

  it('renders Standings at /standings', async () => {
    renderWithRouter(['/standings']);
    expect(
      await screen.findByRole('heading', { name: 'Standings' }),
    ).toBeInTheDocument();
  });

  it('renders Rounds at /rounds', async () => {
    renderWithRouter(['/rounds']);
    expect(
      await screen.findByRole('heading', { name: 'Rounds' }),
    ).toBeInTheDocument();
  });

  it('renders RoundDetail at /rounds/:roundId', async () => {
    renderWithRouter(['/rounds/r-001']);
    expect(
      await screen.findByRole('heading', { name: 'Round r-001' }),
    ).toBeInTheDocument();
  });

  it('renders Analytics at /analytics', async () => {
    renderWithRouter(['/analytics']);
    expect(
      await screen.findByRole('heading', { name: 'Analytics' }),
    ).toBeInTheDocument();
  });

  it('renders Config at /config', async () => {
    renderWithRouter(['/config']);
    expect(
      await screen.findByRole('heading', { name: 'Config' }),
    ).toBeInTheDocument();
  });

  it('renders 404 for unknown paths', async () => {
    renderWithRouter(['/nonexistent']);
    expect(
      await screen.findByRole('heading', { name: '404' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Go home')).toBeInTheDocument();
  });
});
