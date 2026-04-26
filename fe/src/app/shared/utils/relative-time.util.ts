/**
 * Format a timestamp as a Vietnamese relative time phrase
 * (Linear / GitHub / Stripe pattern). Falls back to localized date for
 * timestamps older than 30 days so admins still see absolute dates for
 * archival data without needing tooltip hover.
 *
 * Accepts ISO string, `Date` instance, hoặc null/undefined. FE service
 * thường convert ISO -> Date (xem `admin.service.ts:885`), template render
 * có thể nhận Date trực tiếp — union type tránh boilerplate ở call site.
 *
 * Usage:
 *   formatRelativeTimeVN('2026-04-26T10:30:00Z') -> "5 phút trước"
 *   formatRelativeTimeVN(new Date()) -> "vừa xong"
 *   formatRelativeTimeVN('2026-03-01T10:30:00Z') -> "01/03/2026"
 *
 * Future timestamps (clock skew between client + server) collapse to
 * "vừa xong" rather than "in 3 minutes" — admins do not expect to see
 * future-dated audit records on the dashboard.
 */
export function formatRelativeTimeVN(
  input: string | Date | null | undefined,
  now: number = Date.now(),
): string {
  if (!input) return '';
  const then = input instanceof Date ? input.getTime() : new Date(input).getTime();
  if (Number.isNaN(then)) return '';

  const diffMs = now - then;
  if (diffMs < 60_000) return 'vừa xong';

  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return `${diffMin} phút trước`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} ngày trước`;

  if (diffDay < 30) {
    const weeks = Math.floor(diffDay / 7);
    return `${weeks} tuần trước`;
  }

  const fallbackDate = input instanceof Date ? input : new Date(input);
  return fallbackDate.toLocaleDateString('vi-VN');
}
