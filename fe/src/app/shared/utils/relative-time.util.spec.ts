import { formatRelativeTimeVN } from './relative-time.util';

describe('formatRelativeTimeVN', () => {
  const NOW = new Date('2026-04-26T10:00:00Z').getTime();

  it('trả chuỗi rỗng nếu input null/undefined/invalid', () => {
    expect(formatRelativeTimeVN(null, NOW)).toBe('');
    expect(formatRelativeTimeVN(undefined, NOW)).toBe('');
    expect(formatRelativeTimeVN('not-a-date', NOW)).toBe('');
  });

  it('trả "vừa xong" khi < 1 phút', () => {
    const t = new Date(NOW - 30_000).toISOString();
    expect(formatRelativeTimeVN(t, NOW)).toBe('vừa xong');
  });

  it('trả "X phút trước" khi 1-59 phút', () => {
    expect(formatRelativeTimeVN(new Date(NOW - 5 * 60_000).toISOString(), NOW)).toBe('5 phút trước');
    expect(formatRelativeTimeVN(new Date(NOW - 59 * 60_000).toISOString(), NOW)).toBe('59 phút trước');
  });

  it('trả "X giờ trước" khi 1-23 giờ', () => {
    expect(formatRelativeTimeVN(new Date(NOW - 1 * 3600_000).toISOString(), NOW)).toBe('1 giờ trước');
    expect(formatRelativeTimeVN(new Date(NOW - 23 * 3600_000).toISOString(), NOW)).toBe('23 giờ trước');
  });

  it('trả "X ngày trước" khi 1-6 ngày', () => {
    expect(formatRelativeTimeVN(new Date(NOW - 1 * 86400_000).toISOString(), NOW)).toBe('1 ngày trước');
    expect(formatRelativeTimeVN(new Date(NOW - 6 * 86400_000).toISOString(), NOW)).toBe('6 ngày trước');
  });

  it('trả "X tuần trước" khi 7-29 ngày', () => {
    expect(formatRelativeTimeVN(new Date(NOW - 7 * 86400_000).toISOString(), NOW)).toBe('1 tuần trước');
    expect(formatRelativeTimeVN(new Date(NOW - 29 * 86400_000).toISOString(), NOW)).toBe('4 tuần trước');
  });

  it('fallback về full date khi >= 30 ngày', () => {
    const t = new Date(NOW - 60 * 86400_000).toISOString();
    const result = formatRelativeTimeVN(t, NOW);
    expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
  });

  it('xử lý future timestamp (clock skew) bằng "vừa xong"', () => {
    const t = new Date(NOW + 60_000).toISOString();
    expect(formatRelativeTimeVN(t, NOW)).toBe('vừa xong');
  });
});
