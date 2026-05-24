export type VideoPlaybackManifestFormat = 'hls' | 'dash';

export interface AdaptivePlaybackRefreshState {
  activeAdaptiveManifestUrl: string | null;
  attemptedRefresh: boolean;
  hasOfflineSource: boolean;
  error?: unknown;
}

const RECOVERABLE_HTTP_STATUSES = new Set([
  401,
  403,
  404,
  408,
  409,
  410,
  425,
  429,
  500,
  502,
  503,
  504,
]);

const HTTP_STATUS_FIELDS = [
  'status',
  'statusCode',
  'httpStatus',
  'responseStatus',
  'responseCode',
];

const NESTED_ERROR_FIELDS = [
  'detail',
  'error',
  'cause',
  'response',
  'originalError',
];

export function resolvePlaybackManifestFormat(
  manifestUrl: string | null | undefined,
): VideoPlaybackManifestFormat {
  return /\.mpd(?:[?#]|$)/i.test(manifestUrl ?? '') ? 'dash' : 'hls';
}

export function shouldRefreshAdaptivePlaybackUrl(state: AdaptivePlaybackRefreshState): boolean {
  if (!state.activeAdaptiveManifestUrl || state.attemptedRefresh || state.hasOfflineSource) {
    return false;
  }

  if (state.error == null) {
    return true;
  }

  return isRecoverableAdaptiveStreamError(state.error);
}

export function isRecoverableAdaptiveStreamError(error: unknown): boolean {
  const status = extractAdaptivePlaybackHttpStatus(error);
  return status != null && RECOVERABLE_HTTP_STATUSES.has(status);
}

export function extractAdaptivePlaybackHttpStatus(error: unknown): number | null {
  const queue: unknown[] = [error];
  const seen = new Set<object>();

  while (queue.length > 0) {
    const value = queue.shift();
    const directStatus = coerceHttpStatus(value);
    if (directStatus != null) {
      return directStatus;
    }

    if (!isRecord(value)) {
      continue;
    }

    if (seen.has(value)) {
      continue;
    }
    seen.add(value);

    for (const field of HTTP_STATUS_FIELDS) {
      const fieldStatus = coerceHttpStatus(value[field]);
      if (fieldStatus != null) {
        return fieldStatus;
      }
    }

    const data = value['data'];
    if (Array.isArray(data)) {
      queue.push(...data);
    }

    for (const field of NESTED_ERROR_FIELDS) {
      const nestedValue = value[field];
      if (nestedValue != null) {
        queue.push(nestedValue);
      }
    }
  }

  return null;
}

function coerceHttpStatus(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!/^[1-5]\d\d$/.test(trimmed)) {
    return null;
  }

  return Number(trimmed);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
