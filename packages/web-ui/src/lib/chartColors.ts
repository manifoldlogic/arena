/**
 * Chart color utilities — thin delegation to competitor-colors.ts.
 *
 * Kept as a module so existing imports don't break.
 * All logic lives in competitor-colors.ts (the single authority).
 */
export { buildColorMap, resolveColorMap } from './competitor-colors';
