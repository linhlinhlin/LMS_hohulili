/**
 * Trend classification helpers — used by KPI cards across the admin portal
 * to render the ▲ / ▼ / → arrow + semantic color (green / red / gray).
 *
 * Extracted from AdminSystemDashboardComponent (PR #163) so per-surface
 * KPI components don't each have to copy the same 3 helpers.
 *
 * Sign convention: anything > 0 = up (good), < 0 = down (bad), 0 / null = flat.
 * "Bad" semantics is up to the caller — if a metric like "rejected" is meant
 * to read negatively when up, swap arrow / color at the call site rather than
 * complicating this utility.
 */
export type TrendKind = 'up' | 'down' | 'flat';

export function trendOf(rate: number | null | undefined): TrendKind {
  if (rate == null || rate === 0) return 'flat';
  return rate > 0 ? 'up' : 'down';
}

export function trendArrow(rate: number | null | undefined): string {
  const t = trendOf(rate);
  return t === 'up' ? '▲' : t === 'down' ? '▼' : '→';
}

export function trendMagnitude(rate: number | null | undefined): number {
  return Math.abs(rate ?? 0);
}
