export type VideoOfflinePolicySource = {
  videoUrl?: string | null;
  videoType?: string | null;
  videoSourceKind?: string | null;
};

export function isYoutubeVideoUrl(url: string | null | undefined): boolean {
  return typeof url === 'string'
    && /(?:youtube(?:-nocookie)?\.com|youtu\.be)/i.test(url);
}

export function isOnlineOnlyVideoSource(
  source: VideoOfflinePolicySource | null | undefined,
): boolean {
  if (!source) {
    return false;
  }

  const videoType = normalizeVideoPolicyToken(source.videoType);
  const sourceKind = normalizeVideoPolicyToken(source.videoSourceKind);

  return videoType === 'YOUTUBE'
    || sourceKind === 'EXTERNAL'
    || isYoutubeVideoUrl(source.videoUrl);
}

function normalizeVideoPolicyToken(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}
