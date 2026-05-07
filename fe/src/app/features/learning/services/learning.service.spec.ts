import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { LearningService } from './learning.service';
import { CourseApi } from '../../../api/client/course.api';
import { LessonApi } from '../../../api/client/lesson.api';
import { ApiClient } from '../../../api/client/api-client';
import { CourseDownloadService } from '../../../core/services/course-download.service';
import { NetworkStatusService } from '../../../core/services/network-status.service';
import { signal } from '@angular/core';
import { LessonDetail, SectionContent } from '../models/learning.models';
import { LessonType } from '../models/lesson-types.enum';

/**
 * Regression tests cho LearningService.
 *
 * Bug fix (commit eeb6420f): `backgroundRefreshLesson()` đã wipe sạch
 * `videoOfflineUri` ở cả lesson level lẫn section level vì server response
 * không bao giờ trả field này. Hậu quả production (2026-04-28): video player
 * fallback về `videoUrl` (raw R2/Stream URL) → 504 timeout khi user offline
 * hoặc server slow.
 *
 * Fix: `mergeOfflineFields(target, source)` private helper preserve
 * `videoOfflineUri` từ current state vào fresh API response.
 *
 * Sub-agent A đang apply same merge cho `fetchLessonFromApi()` (initial load
 * sau khi user đã download lesson). Test 5 dưới đây cover scenario đó.
 */
describe('LearningService — videoOfflineUri preservation', () => {
  let service: LearningService;

  // Spies — typed `any` to match jasmine.SpyObj inference for partial mocks
  let courseApiSpy: jasmine.SpyObj<CourseApi>;
  let lessonApiSpy: jasmine.SpyObj<LessonApi>;
  let apiClientSpy: jasmine.SpyObj<ApiClient>;
  let courseDownloadSpy: jasmine.SpyObj<CourseDownloadService>;
  let networkSpy: { online: ReturnType<typeof signal<boolean>> };

  /**
   * Build a minimal LessonDetail giống shape mà mapLessonResponse() output.
   * Override fields theo nhu cầu test.
   */
  const buildLesson = (overrides: Partial<LessonDetail> = {}): LessonDetail => ({
    id: 'lesson-1',
    title: 'Test Lesson',
    description: '',
    lessonType: LessonType.LECTURE,
    duration: 0,
    orderIndex: 0,
    content: '',
    videoUrl: undefined,
    videoOfflineUri: undefined,
    thumbnail: '',
    attachments: [],
    sectionId: 'chapter-1',
    sectionTitle: '',
    courseId: 'course-1',
    courseTitle: '',
    durationMinutes: 0,
    sections: [],
    ...overrides,
  });

  /**
   * Build a SectionContent — used cho section-level offline URI tests.
   */
  const buildSection = (overrides: Partial<SectionContent> = {}): SectionContent => ({
    id: 'section-1',
    title: 'Section',
    type: 'VIDEO',
    orderIndex: 0,
    isRequired: false,
    videoOfflineUri: undefined,
    ...overrides,
  });

  /**
   * Shape của API response — getLessonById trả `{ data: ... }`. mapLessonResponse
   * convert sections via mapSectionContent, nên data.sections phải có raw shape
   * (matching what backend returns — flat fields).
   */
  const buildApiResponse = (overrides: Partial<any> = {}): any => ({
    data: {
      id: 'lesson-1',
      title: 'Test Lesson',
      description: '',
      lessonType: LessonType.LECTURE,
      durationMinutes: 0,
      content: '',
      videoUrl: undefined,
      videoOfflineUri: undefined,
      sectionId: 'chapter-1',
      sectionTitle: '',
      courseId: 'course-1',
      courseTitle: '',
      attachments: [],
      sections: [],
      ...overrides,
    },
  });

  beforeEach(() => {
    courseApiSpy = jasmine.createSpyObj<CourseApi>('CourseApi', [
      'getCourseById',
      'getCourseContent',
      'enrollCourse',
    ]);
    lessonApiSpy = jasmine.createSpyObj<LessonApi>('LessonApi', ['getLessonById']);
    apiClientSpy = jasmine.createSpyObj<ApiClient>('ApiClient', ['get']);
    courseDownloadSpy = jasmine.createSpyObj<CourseDownloadService>(
      'CourseDownloadService',
      [
        'isDownloadedSync',
        'getOfflineLesson',
        'getOfflineLessons',
        'getOfflineChapters',
        'getOfflineCourse',
        'getOfflineProgressState',
        'markLessonCompletedOffline',
      ],
      {
        downloadedCourses: signal([]) as any,
      },
    );
    // Default: course chưa download → backgroundRefresh không tự kick off
    courseDownloadSpy.isDownloadedSync.and.returnValue(false);
    courseDownloadSpy.getOfflineProgressState.and.returnValue(
      Promise.resolve({ completedLessons: [], lastAccessedLessonId: undefined }) as any,
    );

    // NetworkStatusService — service chỉ gọi `network.online()` nên ta mock
    // bằng object có signal. Default = online để background refresh chạy.
    networkSpy = { online: signal<boolean>(true) };

    TestBed.configureTestingModule({
      providers: [
        LearningService,
        { provide: CourseApi, useValue: courseApiSpy },
        { provide: LessonApi, useValue: lessonApiSpy },
        { provide: ApiClient, useValue: apiClientSpy },
        { provide: CourseDownloadService, useValue: courseDownloadSpy },
        { provide: NetworkStatusService, useValue: networkSpy },
      ],
    });

    service = TestBed.inject(LearningService);
  });

  /**
   * Helper: seed currentLesson signal bằng cách invoke private lessonState
   * setter. Bypass private modifier qua bracket access — chấp nhận được
   * trong test suite.
   */
  const seedCurrentLesson = (lesson: LessonDetail): void => {
    (service as any).lessonState.set({
      currentLesson: lesson,
      loading: false,
      error: null,
    });
  };

  /**
   * Helper: invoke private backgroundRefreshLesson directly. Đây là
   * approach đơn giản nhất — bypass timing complexity của visibilitychange
   * event hoặc full loadLesson() flow.
   */
  const triggerBackgroundRefresh = (lessonId: string): void => {
    (service as any).backgroundRefreshLesson(lessonId);
  };

  describe('Test 1: backgroundRefreshLesson preserves lesson-level videoOfflineUri', () => {
    it('keeps existing videoOfflineUri khi API response không có field', () => {
      // GIVEN current state có lesson với videoOfflineUri
      const localLesson = buildLesson({
        videoOfflineUri: '/offline-video/lesson-1',
        videoUrl: 'https://r2.example.com/raw-video.mp4',
      });
      seedCurrentLesson(localLesson);

      // GIVEN API trả lesson WITHOUT videoOfflineUri (real server case)
      lessonApiSpy.getLessonById.and.returnValue(
        of(buildApiResponse({
          videoUrl: 'https://r2.example.com/raw-video.mp4',
          videoOfflineUri: undefined,
        })) as any,
      );

      // WHEN
      triggerBackgroundRefresh('lesson-1');

      // THEN state vẫn có videoOfflineUri từ local
      const after = service.currentLesson();
      expect(after).not.toBeNull();
      expect(after!.videoOfflineUri).toBe('/offline-video/lesson-1');
    });
  });

  describe('Test 2: backgroundRefreshLesson preserves section-level videoOfflineUri', () => {
    it('keeps section videoOfflineUri khi API trả same section without field', () => {
      // GIVEN current state có section với offline URI
      const localLesson = buildLesson({
        sections: [
          buildSection({
            id: 'section-1',
            videoOfflineUri: '/offline-video/section-1',
            videoUrl: 'https://r2.example.com/section-1.mp4',
          }),
        ],
      });
      seedCurrentLesson(localLesson);

      // GIVEN API returns same section ID nhưng không có videoOfflineUri
      lessonApiSpy.getLessonById.and.returnValue(
        of(buildApiResponse({
          sections: [
            {
              id: 'section-1',
              title: 'Section',
              type: 'VIDEO',
              orderIndex: 0,
              isRequired: false,
              videoUrl: 'https://r2.example.com/section-1.mp4',
              videoOfflineUri: undefined,
            },
          ],
        })) as any,
      );

      // WHEN
      triggerBackgroundRefresh('lesson-1');

      // THEN
      const after = service.currentLesson();
      expect(after?.sections?.length).toBe(1);
      expect(after?.sections?.[0].videoOfflineUri).toBe('/offline-video/section-1');
    });
  });

  describe('Test 3: backgroundRefreshLesson does NOT mask fresh API videoOfflineUri', () => {
    it('uses API videoOfflineUri khi API trả non-undefined value (target wins)', () => {
      // GIVEN current state có URI cũ
      const localLesson = buildLesson({
        videoOfflineUri: '/offline-video/old',
      });
      seedCurrentLesson(localLesson);

      // GIVEN API rare case trả URI mới (defensive — unlikely but possible)
      lessonApiSpy.getLessonById.and.returnValue(
        of(buildApiResponse({
          videoOfflineUri: '/offline-video/new',
        })) as any,
      );

      // WHEN
      triggerBackgroundRefresh('lesson-1');

      // THEN API value wins — mergeOfflineFields chỉ fill missing target fields
      const after = service.currentLesson();
      expect(after!.videoOfflineUri).toBe('/offline-video/new');
    });
  });

  describe('Test 4: backgroundRefreshLesson handles new sections gracefully', () => {
    it('preserves URI cho s1 và để s2 (new section without URI) as-is', () => {
      // GIVEN current state có 1 section với offline URI
      const localLesson = buildLesson({
        sections: [
          buildSection({
            id: 's1',
            videoOfflineUri: '/offline-video/s1',
          }),
        ],
      });
      seedCurrentLesson(localLesson);

      // GIVEN API returns 2 sections — s1 (cùng id) + s2 (new, no URI)
      lessonApiSpy.getLessonById.and.returnValue(
        of(buildApiResponse({
          sections: [
            {
              id: 's1',
              title: 'Section 1',
              type: 'VIDEO',
              orderIndex: 0,
              isRequired: false,
              videoOfflineUri: undefined,
            },
            {
              id: 's2',
              title: 'Section 2',
              type: 'VIDEO',
              orderIndex: 1,
              isRequired: false,
              videoOfflineUri: undefined,
            },
          ],
        })) as any,
      );

      // WHEN
      triggerBackgroundRefresh('lesson-1');

      // THEN both sections present; s1 preserved offline URI; s2 stays undefined
      const after = service.currentLesson();
      expect(after?.sections?.length).toBe(2);

      const s1 = after?.sections?.find(s => s.id === 's1');
      const s2 = after?.sections?.find(s => s.id === 's2');

      expect(s1?.videoOfflineUri).toBe('/offline-video/s1');
      expect(s2?.videoOfflineUri).toBeUndefined();
    });
  });

  describe('Interactive video section mapping', () => {
    it('normalizes timeline aliases and keeps interactions sorted by time', () => {
      const section = (service as any).mapSectionContent({
        id: 'iv-section',
        title: 'Interactive section',
        type: 'VIDEO',
        interactiveVideoSpec: {
          enabled: true,
          timeline: [
            {
              id: 'branch-later',
              type: 'branch',
              time: '30',
              prompt: 'Choose the next path',
              choices: [{ text: 'Review checkpoint', targetInteractionId: 'check-earlier' }],
            },
            {
              id: 'check-earlier',
              type: 'single_choice',
              atSeconds: 10,
              choices: [{ label: 'Correct answer', isCorrect: true }],
            },
          ],
        },
      }) as SectionContent;

      expect(section.interactiveVideoSpec?.version).toBe(2);
      expect(section.interactiveVideoSpec?.enabled).toBeTrue();
      expect(section.interactiveVideoSpec?.timeline.map(item => item.id))
        .toEqual(['check-earlier', 'branch-later']);
      expect(section.interactiveVideoSpec?.timeline[1].atSeconds).toBe(30);
      expect(section.interactiveVideoSpec?.timeline[1].body).toBe('Choose the next path');
      expect(section.interactiveVideoSpec?.timeline[1].choices?.[0]).toEqual(jasmine.objectContaining({
        id: 'choice-1',
        label: 'Review checkpoint',
        targetInteractionId: 'check-earlier',
      }));
    });
  });

  describe('Test 5: fetchLessonFromApi merges from IndexedDB on fresh load', () => {
    /**
     * NOTE: Test này depends on sub-agent A's pending fix — apply
     * `mergeOfflineFields()` (or equivalent) to `fetchLessonFromApi()`. Hiện
     * tại standalone không pass vì fetchLessonFromApi chỉ gọi mapLessonResponse
     * mà không merge từ IndexedDB.
     *
     * Khi fix landed, scenario này verify: user đã download lesson →
     * IndexedDB có videoOfflineUri → user chuyển tab khác → quay lại tab này
     * (no current state) → fetchLessonFromApi fires → API không trả
     * videoOfflineUri → state phải có videoOfflineUri từ IndexedDB.
     *
     * Skip nếu chưa có signature rõ ràng cho IndexedDB merge entrypoint.
     */
    it('uses IndexedDB videoOfflineUri khi fresh load (fetchLessonFromApi merges)', async () => {
      // Sub-agent A's implementation: loadOfflineDataForLesson reads offlineDb
      // directly. Spy on private helper to inject mock offline data without
      // needing to mock the Dexie global.
      const offlineMock: LessonDetail = {
        id: 'lesson-1',
        title: '',
        chapterId: '',
        sortOrder: 0,
        type: 'reading',
        videoOfflineUri: '/offline-video/lesson-1-from-idb',
        sections: [
          { id: 'sec-1', title: '', type: 'TEXT', content: '', orderIndex: 0,
            isRequired: false, videoOfflineUri: '/offline-video/sec-1-from-idb' } as any,
        ],
      } as any;

      spyOn<any>(service, 'loadOfflineDataForLesson').and.resolveTo(offlineMock);

      // API trả lesson WITHOUT videoOfflineUri
      const apiResponse = buildApiResponse({
        id: 'lesson-1',
        sections: [{ id: 'sec-1', title: 'Section 1', type: 'TEXT', content: '', orderIndex: 0, isRequired: false }],
      });
      lessonApiSpy.getLessonById.and.returnValue(of(apiResponse) as any);

      // WHEN — fire fetchLessonFromApi directly (it's now async)
      await (service as any).fetchLessonFromApi('lesson-1');
      // Flush observable.subscribe microtasks
      await Promise.resolve();

      // THEN — final state has videoOfflineUri từ IndexedDB
      const final = service.currentLesson();
      expect(final?.videoOfflineUri).toBe('/offline-video/lesson-1-from-idb');
      expect(final?.sections?.find(s => s.id === 'sec-1')?.videoOfflineUri)
        .toBe('/offline-video/sec-1-from-idb');
    });
  });
});
