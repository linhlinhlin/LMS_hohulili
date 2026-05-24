import {
  extractAdaptivePlaybackHttpStatus,
  isRecoverableAdaptiveStreamError,
  resolvePlaybackManifestFormat,
  shouldRefreshAdaptivePlaybackUrl,
} from './video-stream-recovery';

describe('video-stream-recovery', () => {
  it('detects DASH manifests from signed playback URLs', () => {
    expect(
      resolvePlaybackManifestFormat('/api/v3/video-assets/a/adaptive/t/dash/manifest.mpd?token=1'),
    ).toBe('dash');
    expect(
      resolvePlaybackManifestFormat('/api/v3/video-assets/a/adaptive/t/hls/master.m3u8'),
    ).toBe('hls');
  });

  it('extracts Shaka BAD_HTTP_STATUS style numeric data', () => {
    expect(extractAdaptivePlaybackHttpStatus({
      category: 1,
      code: 1001,
      data: ['/segment-1.m4s', 403, 'Forbidden'],
    })).toBe(403);
  });

  it('extracts nested response status values', () => {
    expect(extractAdaptivePlaybackHttpStatus({
      detail: {
        response: {
          status: '503',
        },
      },
    })).toBe(503);
  });

  it('classifies signed URL and CDN edge failures as recoverable', () => {
    expect(isRecoverableAdaptiveStreamError({ data: ['/manifest.m3u8', 401] })).toBeTrue();
    expect(isRecoverableAdaptiveStreamError({ response: { status: 429 } })).toBeTrue();
    expect(isRecoverableAdaptiveStreamError({ status: 504 })).toBeTrue();
  });

  it('does not classify unsupported media responses as refreshable stream expiry', () => {
    expect(isRecoverableAdaptiveStreamError({ status: 415 })).toBeFalse();
  });

  it('allows one adaptive playback URL refresh when the video element hides HTTP detail', () => {
    expect(shouldRefreshAdaptivePlaybackUrl({
      activeAdaptiveManifestUrl: '/api/v3/video-assets/a/adaptive/t/hls/master.m3u8',
      attemptedRefresh: false,
      hasOfflineSource: false,
    })).toBeTrue();
  });

  it('blocks refresh when there is no adaptive source, an offline source, or a previous refresh', () => {
    expect(shouldRefreshAdaptivePlaybackUrl({
      activeAdaptiveManifestUrl: null,
      attemptedRefresh: false,
      hasOfflineSource: false,
    })).toBeFalse();

    expect(shouldRefreshAdaptivePlaybackUrl({
      activeAdaptiveManifestUrl: '/manifest.m3u8',
      attemptedRefresh: true,
      hasOfflineSource: false,
    })).toBeFalse();

    expect(shouldRefreshAdaptivePlaybackUrl({
      activeAdaptiveManifestUrl: '/manifest.m3u8',
      attemptedRefresh: false,
      hasOfflineSource: true,
    })).toBeFalse();
  });
});
