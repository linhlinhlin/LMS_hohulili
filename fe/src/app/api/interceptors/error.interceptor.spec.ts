import { HttpErrorResponse } from '@angular/common/http';
import { shouldRetryHttpRequest } from './error.interceptor';

describe('shouldRetryHttpRequest', () => {
  const onlineNetworkStatus = {
    online: () => true,
    hasRecentOfflineSignal: () => false,
  };

  it('retries genuine server errors while online', () => {
    const error = new HttpErrorResponse({ status: 500, url: '/api/v3/courses' });

    expect(shouldRetryHttpRequest(error, '/api/v3/courses', onlineNetworkStatus as any)).toBeTrue();
  });

  it('does not retry gateway timeouts when app transport is already offline', () => {
    const error = new HttpErrorResponse({ status: 504, url: '/api/v3/courses' });
    const offlineNetworkStatus = {
      online: () => false,
      hasRecentOfflineSignal: () => false,
    };

    expect(shouldRetryHttpRequest(error, '/api/v3/courses', offlineNetworkStatus as any)).toBeFalse();
  });

  it('does not retry when app state still carries a recent offline signal', () => {
    const error = new HttpErrorResponse({ status: 504, url: '/api/v3/courses' });
    const networkStatus = {
      online: () => true,
      hasRecentOfflineSignal: () => true,
    };

    expect(shouldRetryHttpRequest(error, '/api/v3/courses', networkStatus as any)).toBeFalse();
  });
});
