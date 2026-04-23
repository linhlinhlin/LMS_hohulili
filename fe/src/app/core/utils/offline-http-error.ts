import { HttpErrorResponse } from '@angular/common/http';

const OFFLINE_COMPATIBLE_GATEWAY_STATUSES = new Set([502, 503, 504]);

export type OfflineHttpSignal = {
  navigatorOnline: boolean;
  appOnline: boolean;
  hasRecentOfflineSignal: boolean;
  currentOrigin?: string | null;
};

export function isRawOfflineTransportError(error: HttpErrorResponse): boolean {
  return error.status === 0 || error.error instanceof ProgressEvent;
}

export function isOfflineGatewayStatus(status: number): boolean {
  return OFFLINE_COMPATIBLE_GATEWAY_STATUSES.has(status);
}

export function isSameOriginRequestUrl(
  requestUrl: string,
  currentOrigin = getCurrentOrigin(),
): boolean {
  if (requestUrl.startsWith('/')) {
    return true;
  }

  if (!currentOrigin) {
    return false;
  }

  try {
    return new URL(requestUrl, currentOrigin).origin === currentOrigin;
  } catch {
    return false;
  }
}

export function isOfflineCompatibleGatewayError(
  error: HttpErrorResponse,
  requestUrl: string,
  signal: OfflineHttpSignal,
): boolean {
  if (!isOfflineGatewayStatus(error.status)) {
    return false;
  }

  if (!isSameOriginRequestUrl(requestUrl, signal.currentOrigin)) {
    return false;
  }

  return signal.navigatorOnline === false
    || signal.appOnline === false
    || signal.hasRecentOfflineSignal;
}

export function isOfflineCompatibleHttpError(
  error: HttpErrorResponse,
  requestUrl: string,
  signal: OfflineHttpSignal,
): boolean {
  return isRawOfflineTransportError(error)
    || isOfflineCompatibleGatewayError(error, requestUrl, signal);
}

function getCurrentOrigin(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.location.origin;
}
