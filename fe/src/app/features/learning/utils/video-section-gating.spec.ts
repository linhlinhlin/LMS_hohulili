import type { LessonDetail, SectionContent } from '../models/learning.models';
import { LessonType } from '../models/lesson-types.enum';
import {
  getFirstPlayableVideoSection,
  hasPlayableVideoContent,
  isPlayableVideoSection,
  resolveProgressTrackingVideoSectionId,
} from './video-section-gating';

describe('video-section-gating', () => {
  const buildSection = (overrides: Partial<SectionContent> = {}): SectionContent => ({
    id: 'section-1',
    title: 'Video section',
    type: 'VIDEO',
    orderIndex: 0,
    isRequired: true,
    ...overrides,
  });

  const buildLesson = (overrides: Partial<LessonDetail> = {}): LessonDetail => ({
    id: 'lesson-1',
    title: 'Lesson',
    description: '',
    lessonType: LessonType.LECTURE,
    duration: 0,
    orderIndex: 0,
    content: '',
    attachments: [],
    sectionId: 'chapter-1',
    sectionTitle: 'Chapter',
    courseId: 'course-1',
    courseTitle: 'Course',
    sections: [],
    ...overrides,
  });

  it('treats uploaded adaptive video sections as gated video content', () => {
    const section = buildSection({
      videoAssetId: 'asset-1',
      videoUrl: undefined,
      streamVideoUid: undefined,
    });

    expect(isPlayableVideoSection(section)).toBeTrue();
    expect(hasPlayableVideoContent(buildLesson({ sections: [section] }))).toBeTrue();
    expect(getFirstPlayableVideoSection(buildLesson({ sections: [section] }))?.id).toBe('section-1');
  });

  it('keeps ADAPTIVE_R2 sections gated even when only source metadata is present', () => {
    const section = buildSection({
      videoAssetId: undefined,
      videoUrl: undefined,
      streamVideoUid: undefined,
      videoSourceKind: 'ADAPTIVE_R2',
    });

    expect(isPlayableVideoSection(section)).toBeTrue();
  });

  it('does not gate non-video sections or empty video shells', () => {
    expect(isPlayableVideoSection(buildSection({ videoAssetId: undefined }))).toBeFalse();
    expect(isPlayableVideoSection({
      id: 'text-1',
      type: 'TEXT',
      title: 'Reading',
      orderIndex: 0,
      isRequired: true,
      videoAssetId: 'asset-1',
    })).toBeFalse();
  });

  it('resolves the server progress id for section-level and lesson-level videos', () => {
    expect(resolveProgressTrackingVideoSectionId(buildLesson({
      sections: [buildSection({ streamVideoUid: 'stream-1' })],
    }))).toBe('section-1');

    expect(resolveProgressTrackingVideoSectionId(buildLesson({
      videoUrl: 'https://cdn.example.com/video.mp4',
    }))).toBe('lesson-lesson-1');
  });
});
