import { offlineDb, type OfflineLesson } from '../db/lms-offline.db';
import { CourseDownloadService } from './course-download.service';

type OfflineLessonSection = NonNullable<OfflineLesson['sections']>[number];

describe('CourseDownloadService repairLessonVideoFallbackInStorage', () => {
  const buildService = (): CourseDownloadService => {
    const service = Object.create(CourseDownloadService.prototype) as CourseDownloadService;
    spyOn<any>(service, 'resolveLessonQuizMetadataRepair').and.resolveTo(null);
    return service;
  };

  const buildLesson = (sectionOverrides: Partial<OfflineLessonSection>): OfflineLesson => ({
    id: 'lesson-1',
    courseId: 'course-1',
    chapterId: 'chapter-1',
    title: 'Lesson',
    contentHtml: '',
    lessonType: 'LECTURE',
    quizType: 'PRACTICE',
    countsTowardCertificate: false,
    quizAllowOffline: true,
    videoOfflineUri: '/offline-video/lesson-1',
    sections: [{
      id: 'section-1',
      lessonId: 'lesson-1',
      title: 'Video section',
      type: 'VIDEO',
      ...sectionOverrides,
    }],
    sortOrder: 0,
    downloadedAt: new Date('2026-05-24T00:00:00.000Z'),
    userId: 'user-1',
  });

  it('does not repair explicit external section sources with a lesson offline URI', async () => {
    const service = buildService();
    const updateSpy = spyOn(offlineDb.lessons, 'update').and.resolveTo(0);
    const lesson = buildLesson({
      videoUrl: 'https://video.example-cdn.com/watch/abc',
      videoSourceKind: 'EXTERNAL',
    });

    const repaired = await (service as any).repairLessonVideoFallbackInStorage('user-1', lesson) as OfflineLesson;

    expect(repaired.sections?.[0].videoOfflineUri).toBeUndefined();
    expect(repaired.sections?.[0].videoUrl).toBe('https://video.example-cdn.com/watch/abc');
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('does not repair youtube-nocookie section URLs with a lesson offline URI', async () => {
    const service = buildService();
    const updateSpy = spyOn(offlineDb.lessons, 'update').and.resolveTo(0);
    const lesson = buildLesson({
      videoUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    });

    const repaired = await (service as any).repairLessonVideoFallbackInStorage('user-1', lesson) as OfflineLesson;

    expect(repaired.sections?.[0].videoOfflineUri).toBeUndefined();
    expect(repaired.sections?.[0].videoUrl).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('still repairs internal direct video sections with the lesson offline URI', async () => {
    const service = buildService();
    const updateSpy = spyOn(offlineDb.lessons, 'update').and.resolveTo(1);
    const lesson = buildLesson({
      videoUrl: '/media/lesson-1.mp4',
      videoSourceKind: 'LEGACY_DIRECT',
    });

    const repaired = await (service as any).repairLessonVideoFallbackInStorage('user-1', lesson) as OfflineLesson;

    expect(repaired.sections?.[0].videoOfflineUri).toBe('/offline-video/lesson-1');
    expect(repaired.sections?.[0].videoUrl).toBe('/offline-video/lesson-1');
    expect(updateSpy).toHaveBeenCalledWith(['user-1', 'lesson-1'], jasmine.objectContaining({
      sections: [jasmine.objectContaining({
        id: 'section-1',
        videoUrl: '/offline-video/lesson-1',
        videoOfflineUri: '/offline-video/lesson-1',
      })],
    }));
  });
});
