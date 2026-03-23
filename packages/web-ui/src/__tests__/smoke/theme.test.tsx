/**
 * Theme Toggle Smoke Test
 *
 * Tests dark/light theme toggling by verifying the `dark` class
 * on the document root element.
 *
 * Depends on ARENA-03 for the actual ThemeToggle component.
 * Until then, tests the theme class toggling mechanism directly.
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('smoke: theme toggling', () => {
  beforeEach(() => {
    // Reset to light mode
    document.documentElement.classList.remove('dark');
  });

  it('starts in light mode (no dark class)', () => {
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('adds dark class for dark mode', () => {
    document.documentElement.classList.add('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('removes dark class to return to light mode', () => {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('toggle cycles dark/light', () => {
    const toggle = () => document.documentElement.classList.toggle('dark');

    toggle(); // light -> dark
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    toggle(); // dark -> light
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    toggle(); // light -> dark
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  // TODO (ARENA-03): Replace with actual ThemeToggle component test:
  //   render(<ThemeToggle />);
  //   await userEvent.click(screen.getByRole('button'));
  //   expect(document.documentElement.classList.contains('dark')).toBe(true);
});
