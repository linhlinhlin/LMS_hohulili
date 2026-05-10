export interface VideoPlaybackNavigatorLike {
  userAgent?: string;
  vendor?: string;
  platform?: string;
  maxTouchPoints?: number;
}

export interface NativeHlsCapableVideoLike {
  canPlayType(type: string): string;
}

export function shouldPreferNativeHlsForManifest(
  manifestUrl: string,
  nav: VideoPlaybackNavigatorLike | null | undefined = getNavigator(),
): boolean {
  if (!isHlsManifestUrl(manifestUrl) || !nav) {
    return false;
  }

  const userAgent = nav.userAgent ?? '';
  const vendor = nav.vendor ?? '';
  const platform = nav.platform ?? '';
  const maxTouchPoints = nav.maxTouchPoints ?? 0;
  const isIOS = /iPad|iPhone|iPod/i.test(userAgent);
  const isIPadDesktopMode = vendor.includes('Apple')
    && platform === 'MacIntel'
    && maxTouchPoints > 1;

  // All iOS/iPadOS browsers use WebKit and Apple's native HLS stack. On iPadOS
  // 13+ MSE may also exist, but native HLS is still the smoother path for VOD.
  return isIOS || isIPadDesktopMode;
}

export function canUseNativeHlsForManifest(
  manifestUrl: string,
  videoElement: NativeHlsCapableVideoLike | null | undefined,
  nav: VideoPlaybackNavigatorLike | null | undefined = getNavigator(),
): boolean {
  if (!videoElement || !shouldPreferNativeHlsForManifest(manifestUrl, nav)) {
    return false;
  }

  return Boolean(
    videoElement.canPlayType('application/vnd.apple.mpegurl')
      || videoElement.canPlayType('application/x-mpegURL')
  );
}

function isHlsManifestUrl(url: string): boolean {
  return /\.m3u8(?:[?#]|$)/i.test(url);
}

function getNavigator(): VideoPlaybackNavigatorLike | null {
  return typeof navigator === 'undefined' ? null : navigator;
}
