import { isAiHealthReady } from './ai-health.util';

describe('isAiHealthReady', () => {
  it('treats the production configured status as ready when the API is healthy', () => {
    expect(isAiHealthReady({ status: 'healthy', aiServiceStatus: 'configured' })).toBeTrue();
  });

  it('keeps unavailable or unhealthy states disabled', () => {
    expect(isAiHealthReady({ status: 'healthy', aiServiceStatus: 'unknown' })).toBeFalse();
    expect(isAiHealthReady({ status: 'unhealthy', aiServiceStatus: 'configured' })).toBeFalse();
  });
});
