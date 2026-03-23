/**
 * Dashboard Route Smoke Tests
 *
 * Verifies that route components render without throwing errors.
 * Tests the current App shell and will extend to all 6 routes
 * once ARENA-03/04/05/06 (dashboard views) are implemented.
 *
 * Each test:
 *   - Renders the component in a test provider
 *   - Asserts no thrown exceptions
 *   - Asserts expected landmark elements are present
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { App } from '../../App';

describe('smoke: route rendering', () => {
  afterEach(() => cleanup());

  it('renders App shell without error', () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });

  it('displays Arena heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Arena');
  });

  it('displays dashboard subtitle', () => {
    render(<App />);
    expect(screen.getByText('Agent Olympics Dashboard')).toBeInTheDocument();
  });

  it('has header and main landmarks', () => {
    const { container } = render(<App />);
    expect(container.querySelector('header')).toBeTruthy();
    expect(container.querySelector('main')).toBeTruthy();
  });

  // TODO (ARENA-03): Add route tests for /standings, /rounds, /analytics, /config
  // Each should render within a MemoryRouter + mock DataProvider
  // Example pattern:
  //   render(
  //     <MemoryRouter initialEntries={['/standings']}>
  //       <DataProvider value={mockData}><Routes /></DataProvider>
  //     </MemoryRouter>
  //   );
  //   expect(screen.getByRole('table')).toBeInTheDocument();
});
