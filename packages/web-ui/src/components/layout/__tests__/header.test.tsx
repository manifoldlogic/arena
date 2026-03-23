import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { renderWithRouter } from '@/test/test-utils';

describe('Header', () => {
  it('renders title and subtitle', async () => {
    renderWithRouter(['/']);
    expect(await screen.findByText('Arena')).toBeInTheDocument();
    expect(screen.getByText('Agent Olympics Dashboard')).toBeInTheDocument();
  });

  it('renders theme toggle button', async () => {
    renderWithRouter(['/']);
    expect(await screen.findByLabelText('Toggle theme')).toBeInTheDocument();
  });
});
