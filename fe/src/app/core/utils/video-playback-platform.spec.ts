import {
  canUseNativeHlsForManifest,
  shouldPreferNativeHlsForManifest,
} from './video-playback-platform';

describe('video-playback-platform', () => {
  const safariDesktop = {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
    vendor: 'Apple Computer, Inc.',
    platform: 'MacIntel',
    maxTouchPoints: 0,
  };

  it('prefers native HLS on iPadOS desktop-mode Safari', () => {
    expect(shouldPreferNativeHlsForManifest('/api/video/master.m3u8', {
      ...safariDesktop,
      maxTouchPoints: 5,
    })).toBeTrue();
  });

  it('prefers native HLS on iOS WebKit browsers', () => {
    expect(shouldPreferNativeHlsForManifest('/api/video/master.m3u8', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/135.0.0.0 Mobile/15E148 Safari/604.1',
      vendor: 'Apple Computer, Inc.',
      platform: 'iPhone',
      maxTouchPoints: 5,
    })).toBeTrue();
  });

  it('keeps Shaka MSE for Android Chrome HLS', () => {
    expect(shouldPreferNativeHlsForManifest('/api/video/master.m3u8', {
      userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36',
      vendor: 'Google Inc.',
      platform: 'Linux armv8l',
      maxTouchPoints: 5,
    })).toBeFalse();
  });

  it('keeps Shaka MSE for desktop macOS Safari', () => {
    expect(shouldPreferNativeHlsForManifest('/api/video/master.m3u8', safariDesktop)).toBeFalse();
  });

  it('does not prefer native HLS for DASH manifests', () => {
    expect(shouldPreferNativeHlsForManifest('/api/video/manifest.mpd', safariDesktop)).toBeFalse();
  });

  it('uses native HLS only when the iOS video element reports HLS support', () => {
    const ios = {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      vendor: 'Apple Computer, Inc.',
      platform: 'iPhone',
      maxTouchPoints: 5,
    };

    expect(canUseNativeHlsForManifest('/api/video/master.m3u8', {
      canPlayType: type => type === 'application/vnd.apple.mpegurl' ? 'probably' : '',
    }, ios)).toBeTrue();

    expect(canUseNativeHlsForManifest('/api/video/master.m3u8', {
      canPlayType: () => '',
    }, ios)).toBeFalse();
  });
});
