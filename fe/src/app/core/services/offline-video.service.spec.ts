import {
  OFFLINE_VIDEO_MAX_CACHE_BYTES,
  OfflineVideoTooLargeError,
  isOfflineVideoTooLargeError,
} from './offline-video.service';

describe('OfflineVideoService download guards', () => {
  it('classifies oversized video errors for non-fatal course downloads', () => {
    const error = new OfflineVideoTooLargeError(OFFLINE_VIDEO_MAX_CACHE_BYTES + 1);

    expect(isOfflineVideoTooLargeError(error)).toBeTrue();
    expect(error.message).toContain('Video too large to cache');
  });

  it('recognizes the legacy oversized video error message', () => {
    const error = new Error('Video too large to cache (720MB > 500MB). Reduce quality or skip download.');

    expect(isOfflineVideoTooLargeError(error)).toBeTrue();
  });
});
