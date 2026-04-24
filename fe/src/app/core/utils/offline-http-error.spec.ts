import { HttpErrorResponse } from '@angular/common/http';
import {
  isOfflineCompatibleGatewayError,
  isOfflineCompatibleHttpError,
  isSameOriginRequestUrl,
  isRawOfflineTransportError,
} from './offline-http-error';

describe('offline-http-error utils', () => {
  it('treats status 0 as an offline transport error', () => {
    const error = new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') });

    expect(isRawOfflineTransportError(error)).toBeTrue();
    expect(isOfflineCompatibleHttpError(error, '/api/v3/courses', {
      navigatorOnline: true,
      appOnline: true,
      hasRecentOfflineSignal: false,
    })).toBeTrue();
  });

  it('treats same-origin 504 as offline-compatible when the browser is offline', () => {
    const error = new HttpErrorResponse({ status: 504, url: '/api/v3/courses' });

    expect(isOfflineCompatibleGatewayError(error, '/api/v3/courses', {
      navigatorOnline: false,
      appOnline: true,
      hasRecentOfflineSignal: false,
      currentOrigin: 'https://holilihu.online',
    })).toBeTrue();
  });

  it('does not treat cross-origin 504 as an offline-compatible LMS request', () => {
    const error = new HttpErrorResponse({ status: 504, url: 'https://cdn.example.com/chunk.js' });

    expect(isOfflineCompatibleGatewayError(error, 'https://cdn.example.com/chunk.js', {
      navigatorOnline: false,
      appOnline: false,
      hasRecentOfflineSignal: true,
      currentOrigin: 'https://holilihu.online',
    })).toBeFalse();
  });

  it('keeps same-origin detection for relative LMS URLs', () => {
    expect(isSameOriginRequestUrl('/api/v3/courses', 'https://holilihu.online')).toBeTrue();
  });
});
