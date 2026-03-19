export const OFFLINE_VIDEO_PREFERENCES = ['SAVER', 'STANDARD', 'HIGH'] as const;
export const OFFLINE_VIDEO_PROFILE_IDS = ['SAVER', 'STANDARD', 'HIGH', 'ORIGINAL'] as const;

const LEGACY_DOWNLOADABLE_VIDEO_QUALITIES = ['144p', '360p', '480p', '720p', '1080p'] as const;

type LegacyDownloadableVideoQuality = typeof LEGACY_DOWNLOADABLE_VIDEO_QUALITIES[number];
export type OfflineVideoPreference = typeof OFFLINE_VIDEO_PREFERENCES[number];
export type OfflineVideoProfileId = typeof OFFLINE_VIDEO_PROFILE_IDS[number];
export type VideoQuality = 'none' | OfflineVideoProfileId;
export type VideoSourceKind = 'ADAPTIVE_R2' | 'STREAM' | 'EXTERNAL' | 'LEGACY_DIRECT';

export interface OfflineVideoProfileDescriptor {
  id: OfflineVideoProfileId;
  label: string;
  actualResolution?: string | null;
  sizeBytes?: number | null;
  sourceKind?: VideoSourceKind;
}

const OFFLINE_VIDEO_PREFERENCE_ORDER: OfflineVideoPreference[] = [...OFFLINE_VIDEO_PREFERENCES];

const LEGACY_QUALITY_TO_PREFERENCE: Record<LegacyDownloadableVideoQuality, OfflineVideoPreference> = {
  '144p': 'SAVER',
  '360p': 'SAVER',
  '480p': 'STANDARD',
  '720p': 'STANDARD',
  '1080p': 'HIGH',
};

const PROFILE_LABELS: Record<OfflineVideoProfileId, string> = {
  SAVER: 'Tiết kiệm dữ liệu',
  STANDARD: 'Chuẩn',
  HIGH: 'Chất lượng cao',
  ORIGINAL: 'Bản gốc',
};

export function isVideoQuality(value: unknown): value is VideoQuality {
  return value === 'none' || isOfflineVideoProfileId(value);
}

function isLegacyDownloadableVideoQuality(value: unknown): value is LegacyDownloadableVideoQuality {
  return typeof value === 'string'
    && LEGACY_DOWNLOADABLE_VIDEO_QUALITIES.includes(value as LegacyDownloadableVideoQuality);
}

export function isOfflineVideoPreference(value: unknown): value is OfflineVideoPreference {
  return typeof value === 'string'
    && OFFLINE_VIDEO_PREFERENCES.includes(value as OfflineVideoPreference);
}

export function isOfflineVideoProfileId(value: unknown): value is OfflineVideoProfileId {
  return typeof value === 'string'
    && OFFLINE_VIDEO_PROFILE_IDS.includes(value as OfflineVideoProfileId);
}

export function normalizeVideoQuality(value: unknown): VideoQuality {
  if (value === 'none') {
    return 'none';
  }

  if (isOfflineVideoPreference(value)) {
    return value;
  }

  if (value === 'ORIGINAL') {
    return 'ORIGINAL';
  }

  if (isLegacyDownloadableVideoQuality(value)) {
    return LEGACY_QUALITY_TO_PREFERENCE[value];
  }

  return 'STANDARD';
}

export function getOfflineVideoProfileLabel(profileId: OfflineVideoProfileId): string {
  return PROFILE_LABELS[profileId];
}

export function formatOfflineVideoProfileLabel(
  profile: Pick<OfflineVideoProfileDescriptor, 'id' | 'actualResolution'>,
): string {
  const baseLabel = getOfflineVideoProfileLabel(profile.id);
  return profile.actualResolution
    ? `${baseLabel} (${profile.actualResolution})`
    : baseLabel;
}

export function pickBestSupportedOfflineVideoPreference(
  requested: OfflineVideoPreference,
  availablePreferences: Iterable<OfflineVideoPreference>,
): OfflineVideoPreference | null {
  const available = new Set(availablePreferences);
  if (available.has(requested)) {
    return requested;
  }

  const requestedIndex = OFFLINE_VIDEO_PREFERENCE_ORDER.indexOf(requested);
  if (requestedIndex < 0) {
    return null;
  }

  for (let index = requestedIndex - 1; index >= 0; index -= 1) {
    const candidate = OFFLINE_VIDEO_PREFERENCE_ORDER[index];
    if (available.has(candidate)) {
      return candidate;
    }
  }

  for (let index = requestedIndex + 1; index < OFFLINE_VIDEO_PREFERENCE_ORDER.length; index += 1) {
    const candidate = OFFLINE_VIDEO_PREFERENCE_ORDER[index];
    if (available.has(candidate)) {
      return candidate;
    }
  }

  return null;
}
