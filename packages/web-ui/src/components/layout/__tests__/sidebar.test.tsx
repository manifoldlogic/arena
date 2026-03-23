import { screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { renderWithRouter } from '@/test/test-utils';

describe('Sidebar', () => {
  it('renders all nav items', async () => {
    renderWithRouter(['/']);
    const sidebar = await screen.findByRole('navigation');
    expect(within(sidebar).getByText('Overview')).toBeInTheDocument();
    expect(within(sidebar).getByText('Standings')).toBeInTheDocument();
    expect(within(sidebar).getByText('Rounds')).toBeInTheDocument();
    expect(within(sidebar).getByText('Analytics')).toBeInTheDocument();
    expect(within(sidebar).getByText('Config')).toBeInTheDocument();
  });

  it('highlights the active route', async () => {
    renderWithRouter(['/standings']);
    const sidebar = await screen.findByRole('navigation');
    const standingsLink = within(sidebar).getByText('Standings').closest('a');
    expect(standingsLink).toHaveClass('bg-accent');
  });
});
