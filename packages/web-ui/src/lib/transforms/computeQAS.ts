/**
 * Quality-Adjusted Score (QAS) — pure computation functions.
 *
 * efficiency_bonus = max(0, 1 - calls/max_calls) * 0.15
 * QAS = total * (1 + efficiency_bonus)
 */

export function computeEfficiencyBonus(calls: number, maxCalls: number): number {
  return Math.max(0, 1 - calls / maxCalls) * 0.15;
}

export function computeQAS(total: number, calls: number, maxCalls: number): number {
  return +(total * (1 + computeEfficiencyBonus(calls, maxCalls))).toFixed(3);
}
