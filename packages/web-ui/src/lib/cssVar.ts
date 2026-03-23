/**
 * Read a CSS custom property from :root.
 * Returns the trimmed value (e.g. "217 91% 65%") or empty string
 * when running outside a browser (SSR / tests).
 */
export function cssVar(name: string): string {
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
