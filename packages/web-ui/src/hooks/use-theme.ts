import { useContext } from 'react';
import { ThemeContext } from '@/providers/theme-provider';
import type { ThemeContextValue } from '@/providers/theme-provider';

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
