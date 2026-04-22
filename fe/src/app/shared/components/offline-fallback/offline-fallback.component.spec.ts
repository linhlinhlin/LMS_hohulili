import { OFFLINE_FALLBACK_COURSE_ROUTE_PREFIX } from './offline-fallback.component';

describe('OfflineFallbackComponent route constants', () => {
  it('uses the canonical student learning route for downloaded courses', () => {
    expect(OFFLINE_FALLBACK_COURSE_ROUTE_PREFIX).toBe('/student/learn/course');
  });
});
