import type { LessonDetail, SectionContent } from '../models/learning.models';

type PlayableVideoSource = {
  videoUrl?: string | null;
  streamVideoUid?: string | null;
  videoAssetId?: string | null;
  videoSourceKind?: string | null;
  videoType?: string | null;
};

export function hasPlayableVideoSource(source: PlayableVideoSource | null | undefined): boolean {
  if (!source) {
    return false;
  }

  return Boolean(
    hasText(source.videoUrl)
    || hasText(source.streamVideoUid)
    || hasText(source.videoAssetId)
    || source.videoSourceKind === 'ADAPTIVE_R2'
    || source.videoType === 'ADAPTIVE_R2',
  );
}

export function isPlayableVideoSection(
  section: Partial<SectionContent> | null | undefined,
): boolean {
  return section?.type === 'VIDEO' && hasPlayableVideoSource(section);
}

export function hasPlayableVideoContent(
  lesson: Partial<LessonDetail> | null | undefined,
): boolean {
  if (!lesson) {
    return false;
  }

  return hasPlayableVideoSource(lesson)
    || (Array.isArray(lesson.sections) && lesson.sections.some(isPlayableVideoSection));
}

export function getFirstPlayableVideoSection(
  lesson: Partial<LessonDetail> | null | undefined,
): SectionContent | null {
  if (!Array.isArray(lesson?.sections)) {
    return null;
  }

  return lesson.sections.find(isPlayableVideoSection) ?? null;
}

export function resolveProgressTrackingVideoSectionId(
  lesson: Partial<LessonDetail> | null | undefined,
): string | null {
  const section = getFirstPlayableVideoSection(lesson);
  if (hasText(section?.id)) {
    return section.id;
  }

  return hasPlayableVideoSource(lesson) && hasText(lesson?.id)
    ? `lesson-${lesson.id}`
    : null;
}

function hasText(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
