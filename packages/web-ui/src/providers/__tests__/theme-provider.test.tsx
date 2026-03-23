import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { ThemeProvider } from '@/providers/theme-provider';
import { useTheme } from '@/hooks/use-theme';

function ThemeDisplay() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('light')}>Set Light</button>
      <button onClick={() => setTheme('system')}>Set System</button>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('light', 'dark');
  });

  it('defaults to system theme', () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme')).toHaveTextContent('system');
  });

  it('persists theme to localStorage', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );

    await user.click(screen.getByText('Set Dark'));
    expect(localStorage.getItem('arena-theme')).toBe('dark');
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
  });

  it('reads stored theme on mount', () => {
    localStorage.setItem('arena-theme', 'dark');
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
  });

  it('applies dark class to document', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );

    await user.click(screen.getByText('Set Dark'));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
