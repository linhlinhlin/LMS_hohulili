import { HttpRequest, HttpHandlerFn, HttpEvent, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable, from, of, throwError, timeout } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { inject } from '@angular/core';
import { ensureOfflineDbReady, offlineDb, getCurrentUserId, type OfflineCourse } from '../../core/db/lms-offline.db';
import { OfflineSyncService } from '../../core/services/offline-sync.service';
import { NetworkStatusService } from '../../core/services/network-status.service';
import { isOfflineCompatibleHttpError } from '../../core/utils/offline-http-error';

/** Paths that must never be intercepted offline (auth, health checks) */
const NEVER_INTERCEPT_PREFIXES = ['/api/v3/auth/', '/api/v3/sync/', '/actuator/'];
const DEFAULT_OFFLINE_COURSES_PAGE_SIZE = 12;
const BACKGROUND_MUTATION_NETWORK_TIMEOUT_MS = 2_000;

/**
 * Offline interceptor — catches network errors and falls back to IndexedDB.
 *
 * For GET requests to /courses, /lessons, /chapters:
 *   → Returns cached data from offlineDb
 *
 * For POST/PUT mutations (progress, submissions):
 *   → Queues to OfflineSyncService for later sync
 *
 * Must be registered AFTER baseUrlInterceptor and authInterceptor.
 */
export const offlineInterceptor = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
  const syncService = inject(OfflineSyncService);
  const networkStatus = inject(NetworkStatusService);
  const path = extractApiPath(req.url) || req.url;

  const forwardToNetwork = () => {
    const requestStartedAt = readNetworkClock();

    return withBackgroundMutationTimeout(
      next(req).pipe(
        tap((event) => {
          if (event instanceof HttpResponse) {
            networkStatus.markOnlineFromHttpSuccess(readNetworkClock() - requestStartedAt);
          }
        }),
      ),
      path,
      req.method,
    ).pipe(
      catchError((error: unknown) => {
        const isBackgroundTimeout =
          isNetworkTimeoutError(error) && isBackgroundLearningMutation(path, req.method);
        const isOfflineError =
          isBackgroundTimeout ||
          isOfflineCompatibleHttpError(error as HttpErrorResponse, req.url, {
            navigatorOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
            appOnline: networkStatus.online(),
            hasRecentOfflineSignal: networkStatus.hasRecentOfflineSignal(),
          });
        if (!isOfflineError) {
          return throwError(() => error);
        }

        // Never intercept auth or health-check endpoints
        if (shouldBypassOfflineInterception(path)) {
          return throwError(() => error);
        }

        if (isBackgroundTimeout) {
          networkStatus.markBackgroundMutationTimeout();
        } else {
          networkStatus.markOfflineFromTransportFailure();
        }

        // For GET requests → try offline fallback
        if (req.method === 'GET') {
          return from(getOfflineFallback(req.url)).pipe(
            switchMap((cached) => {
              if (cached !== null) {
                return of(
                  new HttpResponse({
                    status: 200,
                    body: cached,
                    headers: req.headers,
                    url: req.url,
                  }),
                );
              }
              // No cached data available
              return throwError(
                () =>
                  new HttpErrorResponse({
                    status: 0,
                    statusText: 'Offline',
                    url: req.url,
                    error: { message: 'Không có kết nối mạng và dữ liệu chưa được tải xuống' },
                  }),
              );
            }),
          );
        }

        // For mutation requests → queue for later sync
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
          return buildQueuedMutationResponse(syncService, req, path).pipe(
            catchError(() => throwError(() => error)),
          );
        }

        return throwError(() => error);
      }),
    );
  };

  if (shouldQueueBeforeNetwork(path, req.method, networkStatus.shouldDeferNonCriticalSync())) {
    return buildQueuedMutationResponse(syncService, req, path)
      .pipe(catchError(() => forwardToNetwork()));
  }

  // If online, proceed normally but catch network failures
  return forwardToNetwork();
};

export function shouldBypassOfflineInterception(path: string): boolean {
  return NEVER_INTERCEPT_PREFIXES.some(prefix => path.startsWith(prefix));
}

export function isBackgroundLearningMutation(path: string, method: string): boolean {
  const normalizedMethod = method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH'].includes(normalizedMethod)) {
    return false;
  }

  if (path === '/api/v3/video-progress/track') {
    return normalizedMethod === 'POST';
  }

  if (path.startsWith('/api/v3/learning-activity/')) {
    return normalizedMethod === 'POST';
  }

  return /^\/api\/v3\/student\/progress\/lessons\/[a-f0-9-]+\/sections\/[^/]+\/complete$/i.test(path)
    || /^\/api\/v3\/student\/progress\/lessons\/[a-f0-9-]+\/complete$/i.test(path);
}

export function shouldQueueBeforeNetwork(path: string, method: string, shouldDeferSync: boolean): boolean {
  return shouldDeferSync
    && !shouldBypassOfflineInterception(path)
    && isBackgroundLearningMutation(path, method);
}

function withBackgroundMutationTimeout(
  source: Observable<HttpEvent<any>>,
  path: string,
  method: string,
): Observable<HttpEvent<any>> {
  if (!isBackgroundLearningMutation(path, method)) {
    return source;
  }

  return source.pipe(timeout({ each: BACKGROUND_MUTATION_NETWORK_TIMEOUT_MS }));
}

function isNetworkTimeoutError(error: unknown): boolean {
  return !!error
    && typeof error === 'object'
    && (error as { name?: string }).name === 'TimeoutError';
}

function readNetworkClock(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function buildQueuedMutationResponse(
  syncService: OfflineSyncService,
  req: HttpRequest<any>,
  path: string,
): Observable<HttpEvent<any>> {
  return from(queueMutation(syncService, req)).pipe(
    switchMap(async (queuedPayload) => {
      const body = await buildOfflineMutationResponse(path, queuedPayload);
      // Return a fake success response so the UI doesn't break
      return new HttpResponse({
        status: 202,
        body,
        url: req.url,
      });
    }),
  );
}

// ─── Offline Fallback Logic ──────────────────────────────────────────

/**
 * Try to serve data from IndexedDB based on the request URL.
 * Returns null if no cached data available.
 */
async function getOfflineFallback(url: string): Promise<any | null> {
  try {
    await ensureOfflineDbReady();

    // Extract path from full URL (remove base URL)
    const path = extractApiPath(url);
    if (!path) return null;

    // Pattern: /api/v3/courses/{id}
    const courseMatch = path.match(/^\/api\/v3\/courses\/([a-f0-9-]+)$/);
    if (courseMatch) {
      const userId = getCurrentUserId();
      const course = await offlineDb.courses.get([userId, courseMatch[1]]);
      if (course) {
        return { success: true, data: course, _offline: true };
      }
    }

    // Pattern: /api/v3/courses (list)
    if (path === '/api/v3/courses' || path.startsWith('/api/v3/courses?')) {
      const userId = getCurrentUserId();
      const courses = await offlineDb.courses.where('userId').equals(userId).toArray();
      if (courses.length > 0) {
        return buildOfflineCoursesListingResponse(courses, path);
      }
    }

    // Pattern: /api/v3/courses/{id}/chapters
    const chaptersMatch = path.match(/^\/api\/v3\/courses\/([a-f0-9-]+)\/chapters$/);
    if (chaptersMatch) {
      const userId = getCurrentUserId();
      const chapters = await offlineDb.chapters
        .where('[userId+courseId]').equals([userId, chaptersMatch[1]])
        .sortBy('sortOrder');
      if (chapters.length > 0) {
        return { success: true, data: chapters, _offline: true };
      }
    }

    // Pattern: /api/v3/courses/{id}/chapters/{chId}/lessons
    const lessonsMatch = path.match(
      /^\/api\/v3\/courses\/([a-f0-9-]+)\/chapters\/([a-f0-9-]+)\/lessons$/
    );
    if (lessonsMatch) {
      const userId = getCurrentUserId();
      const lessons = await offlineDb.lessons
        .where('[userId+courseId]').equals([userId, lessonsMatch[1]])
        .filter(l => l.chapterId === lessonsMatch[2])
        .toArray();
      if (lessons.length > 0) {
        return { success: true, data: lessons, _offline: true };
      }
    }

    // Pattern: /api/v3/lessons/{id} or similar lesson paths
    const lessonMatch = path.match(/\/lessons\/([a-f0-9-]+)$/);
    if (lessonMatch) {
      const userId = getCurrentUserId();
      const lesson = await offlineDb.lessons.get([userId, lessonMatch[1]]);
      if (lesson) {
        return { success: true, data: lesson, _offline: true };
      }
    }

    // Pattern: /api/v3/enrollments or student enrollments
    if (path.includes('/enrollments')) {
      const userId = getCurrentUserId();
      const courses = await offlineDb.courses.where('userId').equals(userId).toArray();
      if (courses.length > 0) {
        // Calculate real progress from local lesson progress data
        const enrollments = await Promise.all(courses.map(async (c) => {
          const progressRecords = await offlineDb.progress
            .where('courseId').equals(c.id)
            .toArray();
          const completedLessons = progressRecords.filter(p => p.completedAt != null && p.userId === userId).length;
          const totalLessons = c.totalLessons || 1;
          const progress = totalLessons > 0
            ? Math.round((completedLessons / totalLessons) * 100)
            : 0;
          return {
            courseId: c.id,
            courseTitle: c.title,
            courseThumbnail: c.thumbnailUrl,
            status: progress >= 100 ? 'completed' : 'in-progress',
            progress,
            totalLessons: c.totalLessons,
            completedLessons,
            _offline: true,
          };
        }));
        return {
          success: true,
          data: enrollments,
          _offline: true,
        };
      }
    }

    // Pattern: /api/v3/video-progress/{sectionId}/can-proceed
    const canProceedMatch = path.match(/^\/api\/v3\/video-progress\/([^/]+)\/can-proceed$/);
    if (canProceedMatch) {
      const progress = await getQueuedVideoProgress(canProceedMatch[1]);
      if (progress) {
        return {
          success: true,
          data: { canProceed: progress.progressPercent >= 90 },
          _offline: true,
        };
      }
    }

    // Pattern: /api/v3/video-progress/{sectionId}/resume
    const resumeMatch = path.match(/^\/api\/v3\/video-progress\/([^/]+)\/resume$/);
    if (resumeMatch) {
      const progress = await getQueuedVideoProgress(resumeMatch[1]);
      if (progress) {
        return {
          success: true,
          data: { position: progress.lastPosition },
          _offline: true,
        };
      }
    }

    // Pattern: /api/v3/video-progress/{sectionId}
    const videoProgressMatch = path.match(/^\/api\/v3\/video-progress\/([^/]+)$/);
    if (videoProgressMatch) {
      const progress = await getQueuedVideoProgress(videoProgressMatch[1]);
      if (progress) {
        return {
          success: true,
          data: progress,
          _offline: true,
        };
      }
    }

    const lessonProgressMatch = path.match(/^\/api\/v3\/student\/lessons\/([a-f0-9-]+)\/progress$/i);
    if (lessonProgressMatch) {
      const userId = getCurrentUserId();
      const progress = await offlineDb.progress
        .where('lessonId').equals(lessonProgressMatch[1])
        .filter(record => record.userId === userId)
        .first();

      if (progress) {
        return {
          success: true,
          data: {
            lessonId: lessonProgressMatch[1],
            status: progress.completedAt != null ? 'COMPLETED' : (progress.progressPercent > 0 ? 'IN_PROGRESS' : 'NOT_STARTED'),
            watchTimeSeconds: progress.videoPosition,
            completionPercent: progress.completedAt != null ? 100 : progress.progressPercent,
            completedSections: progress.completedSectionIds ?? [],
          },
          _offline: true,
        };
      }

      return {
        success: true,
        data: {
          lessonId: lessonProgressMatch[1],
          status: 'NOT_STARTED',
          watchTimeSeconds: 0,
          completionPercent: 0,
          completedSections: [],
        },
        _offline: true,
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Queue a mutation (POST/PUT/PATCH) for later sync.
 */
async function queueMutation(
  syncService: OfflineSyncService,
  req: HttpRequest<any>,
): Promise<unknown> {
  await ensureOfflineDbReady();
  const path = extractApiPath(req.url) || req.url;
  const syncDescriptor = await resolveSyncDescriptor(path, req.body);
  const payload = await enrichQueuedPayload(path, req.body, syncDescriptor.metadata);

  const operationType = req.method === 'POST' ? 'CREATE'
    : req.method === 'DELETE' ? 'DELETE' : 'UPDATE';

  await syncService.queueOperation(
    syncDescriptor.entityType,
    operationType,
    path,
    payload,
    syncDescriptor.metadata,
  );

  return payload;
}

async function buildOfflineMutationResponse(
  path: string,
  payload: unknown,
): Promise<Record<string, unknown>> {
  const sectionCompleteMatch = path.match(
    /^\/api\/v3\/student\/progress\/lessons\/([a-f0-9-]+)\/sections\/([^/]+)\/complete$/i,
  );
  if (sectionCompleteMatch) {
    const payloadRecord = (payload && typeof payload === 'object')
      ? payload as Record<string, unknown>
      : {};
    const persisted = await persistOfflineSectionCompletion(
      sectionCompleteMatch[1],
      sectionCompleteMatch[2],
      payloadRecord,
    );

    if (persisted) {
      return {
        success: true,
        message: 'Đã lưu hoàn thành phần học ngoại tuyến, sẽ đồng bộ khi có mạng',
        data: persisted,
        _offline: true,
      };
    }
  }

  const lessonCompleteMatch = path.match(
    /^\/api\/v3\/student\/progress\/lessons\/([a-f0-9-]+)\/complete$/i,
  );
  if (lessonCompleteMatch) {
    const payloadRecord = (payload && typeof payload === 'object')
      ? payload as Record<string, unknown>
      : {};
    const persisted = await persistOfflineLessonCompletion(
      lessonCompleteMatch[1],
      payloadRecord,
    );

    if (persisted) {
      return {
        success: true,
        message: 'Đã lưu hoàn thành bài học ngoại tuyến, sẽ đồng bộ khi có mạng',
        data: persisted,
        _offline: true,
      };
    }
  }

  if (path === '/api/v3/video-progress/track') {
    const payloadRecord = (payload && typeof payload === 'object')
      ? payload as Record<string, unknown>
      : {};
    const sectionId = typeof payloadRecord['sectionId'] === 'string'
      ? payloadRecord['sectionId']
      : null;

    if (sectionId) {
      const progress = await getQueuedVideoProgress(sectionId);
      if (progress) {
        return {
          success: true,
          message: 'Đã lưu tiến độ video ngoại tuyến, sẽ đồng bộ khi có mạng',
          data: progress,
          _offline: true,
        };
      }
    }
  }

  return {
    success: true,
    message: 'Đã lưu ngoại tuyến, sẽ đồng bộ khi có mạng',
    data: payload,
    _offline: true,
  };
}

async function enrichQueuedPayload(
  path: string,
  payload: unknown,
  metadata: SyncDescriptor['metadata'],
): Promise<unknown> {
  const payloadRecord = (payload && typeof payload === 'object')
    ? { ...(payload as Record<string, unknown>) }
    : {};

  const sectionCompleteMatch = path.match(
    /^\/api\/v3\/student\/progress\/lessons\/([a-f0-9-]+)\/sections\/([^/]+)\/complete$/i,
  );
  if (sectionCompleteMatch) {
    return {
      ...payloadRecord,
      lessonId: sectionCompleteMatch[1],
      sectionId: sectionCompleteMatch[2],
      courseId: metadata.courseId ?? payloadRecord['courseId'] ?? inferRouteCourseId(),
      publicationId: metadata.publicationId ?? payloadRecord['publicationId'] ?? null,
      entityId: metadata.entityId ?? sectionCompleteMatch[2],
    };
  }

  const lessonCompleteMatch = path.match(
    /^\/api\/v3\/student\/progress\/lessons\/([a-f0-9-]+)\/complete$/i,
  );
  if (lessonCompleteMatch) {
    return {
      ...payloadRecord,
      lessonId: lessonCompleteMatch[1],
      courseId: metadata.courseId ?? payloadRecord['courseId'] ?? inferRouteCourseId(),
      publicationId: metadata.publicationId ?? payloadRecord['publicationId'] ?? null,
      entityId: metadata.entityId ?? lessonCompleteMatch[1],
    };
  }

  return {
    ...payloadRecord,
    courseId: metadata.courseId ?? payloadRecord['courseId'] ?? inferRouteCourseId(),
    publicationId: metadata.publicationId ?? payloadRecord['publicationId'] ?? null,
    entityId: metadata.entityId ?? getEntityIdFromPayload(payloadRecord),
  };
}

/**
 * Extract API path from full URL, stripping the base URL.
 */
function extractApiPath(fullUrl: string): string | null {
  try {
    const url = new URL(fullUrl);
    return url.pathname + url.search;
  } catch {
    // URL might be relative already
    if (fullUrl.startsWith('/api/')) return fullUrl;
    return null;
  }
}

type OfflineCourseSummary = {
  id: string;
  code: string;
  title: string;
  description: string;
  status: 'APPROVED';
  teacherName: string;
  enrolledCount: number;
  createdAt: string;
  updatedAt: string;
  enrolled: true;
  isEnrolled: true;
  deliveryMode?: 'SELF_PACED' | 'INSTRUCTOR_LED';
  allowOfflineDownload: true;
  lessonCount: number;
  totalLessons: number;
  completedLessons: number;
  thumbnailUrl?: string;
};

type OfflineCoursesPageResponse = {
  success: true;
  message: string;
  data: {
    content: OfflineCourseSummary[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
    empty: boolean;
  };
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    first: boolean;
    last: boolean;
  };
  timestamp: string;
  _offline: true;
};

export function buildOfflineCoursesListingResponse(
  courses: OfflineCourse[],
  path: string,
  timestamp = new Date().toISOString(),
): OfflineCoursesPageResponse {
  const searchParams = getPathSearchParams(path);
  const search = normalizeOfflineSearchTerm(searchParams.get('search'));
  const teacher = normalizeOfflineSearchTerm(searchParams.get('teacher'));
  const sort = searchParams.get('sort');
  const order = searchParams.get('order');
  const page = parseNonNegativeInt(searchParams.get('page'));
  const size = parsePositiveInt(searchParams.get('size'), DEFAULT_OFFLINE_COURSES_PAGE_SIZE);

  const filteredCourses = sortOfflineCourses(
    courses.filter(course => matchesOfflineCourseSearch(course, search, teacher)),
    sort,
    order,
  );

  const totalItems = filteredCourses.length;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / size);
  const startIndex = page * size;
  const pagedCourses = filteredCourses.slice(startIndex, startIndex + size).map(mapOfflineCourseToSummary);
  const last = totalPages === 0 ? true : page >= totalPages - 1;

  return {
    success: true,
    message: 'Dữ liệu ngoại tuyến',
    data: {
      content: pagedCourses,
      totalElements: totalItems,
      totalPages,
      size,
      number: page,
      first: page === 0,
      last,
      empty: pagedCourses.length === 0,
    },
    pagination: {
      page,
      limit: size,
      totalItems,
      totalPages,
      first: page === 0,
      last,
    },
    timestamp,
    _offline: true,
  };
}

function mapOfflineCourseToSummary(course: OfflineCourse): OfflineCourseSummary {
  const normalizedTimestamp = toIsoTimestamp(course.downloadedAt);

  return {
    id: course.id,
    code: `OFFLINE-${course.id.slice(0, 8).toUpperCase()}`,
    title: course.title,
    description: course.description || '',
    status: 'APPROVED',
    teacherName: course.teacherName || 'LMS Maritime',
    enrolledCount: 1,
    createdAt: normalizedTimestamp,
    updatedAt: normalizedTimestamp,
    enrolled: true,
    isEnrolled: true,
    deliveryMode: course.deliveryMode,
    allowOfflineDownload: true,
    lessonCount: course.totalLessons ?? 0,
    totalLessons: course.totalLessons ?? 0,
    completedLessons: 0,
    thumbnailUrl: course.thumbnailUrl,
  };
}

function matchesOfflineCourseSearch(
  course: OfflineCourse,
  search: string,
  teacher: string,
): boolean {
  const searchableValues = [
    course.title,
    course.description,
    course.teacherName,
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map(normalizeOfflineSearchTerm);

  if (search && !searchableValues.some(value => value.includes(search))) {
    return false;
  }

  if (teacher && !normalizeOfflineSearchTerm(course.teacherName).includes(teacher)) {
    return false;
  }

  return true;
}

function sortOfflineCourses(
  courses: OfflineCourse[],
  sort: string | null,
  order: string | null,
): OfflineCourse[] {
  const direction = order?.toLowerCase() === 'asc' ? 1 : -1;
  const next = [...courses];

  next.sort((left, right) => {
    if (sort === 'title') {
      return direction * left.title.localeCompare(right.title, 'vi', { sensitivity: 'base' });
    }

    return direction * (toTimestampValue(left.downloadedAt) - toTimestampValue(right.downloadedAt));
  });

  return next;
}

function getPathSearchParams(path: string): URLSearchParams {
  const queryIndex = path.indexOf('?');
  return new URLSearchParams(queryIndex >= 0 ? path.slice(queryIndex + 1) : '');
}

function normalizeOfflineSearchTerm(value: string | null | undefined): string {
  return (value ?? '').trim().toLocaleLowerCase('vi');
}

function parseNonNegativeInt(value: string | null | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function parsePositiveInt(value: string | null | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function toIsoTimestamp(value: Date | string | undefined): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  return new Date(0).toISOString();
}

function toTimestampValue(value: Date | string | undefined): number {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

type SyncDescriptor = {
  entityType: 'progress' | 'submission' | 'quizAttempt' | 'videoProgress' | 'learningEvent';
  metadata: {
    courseId?: string;
    publicationId?: string | null;
    entityId?: string;
  };
};

async function resolveSyncDescriptor(path: string, payload: unknown): Promise<SyncDescriptor> {
  const payloadRecord = (payload && typeof payload === 'object')
    ? payload as Record<string, unknown>
    : {};
  const courseId = typeof payloadRecord['courseId'] === 'string'
    ? payloadRecord['courseId']
    : inferRouteCourseId();
  const publicationId = courseId
    ? await findOfflinePublicationId(courseId)
    : null;

  const sectionCompleteMatch = path.match(
    /^\/api\/v3\/student\/progress\/lessons\/([a-f0-9-]+)\/sections\/([^/]+)\/complete$/i,
  );
  if (sectionCompleteMatch) {
    return {
      entityType: 'progress',
      metadata: {
        courseId: courseId ?? undefined,
        publicationId,
        entityId: sectionCompleteMatch[2],
      },
    };
  }

  const lessonCompleteMatch = path.match(
    /^\/api\/v3\/student\/progress\/lessons\/([a-f0-9-]+)\/complete$/i,
  );
  if (lessonCompleteMatch) {
    return {
      entityType: 'progress',
      metadata: {
        courseId: courseId ?? undefined,
        publicationId,
        entityId: lessonCompleteMatch[1],
      },
    };
  }

  if (path === '/api/v3/video-progress/track') {
    const entityId = typeof payloadRecord['sectionId'] === 'string'
      ? payloadRecord['sectionId']
      : (typeof payloadRecord['lessonId'] === 'string' ? payloadRecord['lessonId'] : undefined);
    return {
      entityType: 'videoProgress',
      metadata: {
        courseId: courseId ?? undefined,
        publicationId,
        entityId,
      },
    };
  }

  if (path.startsWith('/api/v3/learning-activity/')) {
    const entityId = typeof payloadRecord['sectionId'] === 'string'
      ? payloadRecord['sectionId']
      : (typeof payloadRecord['lessonId'] === 'string' ? payloadRecord['lessonId'] : undefined);
    return {
      entityType: 'learningEvent',
      metadata: {
        courseId: courseId ?? undefined,
        publicationId,
        entityId,
      },
    };
  }

  if (path.includes('/submissions') || path.includes('/assignments')) {
    return {
      entityType: 'submission',
      metadata: {
        courseId: courseId ?? undefined,
        publicationId,
        entityId: getEntityIdFromPayload(payloadRecord),
      },
    };
  }

  if (path.includes('/quiz') || path.includes('/attempts')) {
    return {
      entityType: 'quizAttempt',
      metadata: {
        courseId: courseId ?? undefined,
        publicationId,
        entityId: getEntityIdFromPayload(payloadRecord),
      },
    };
  }

  if (path.includes('/video-progress')) {
    return {
      entityType: 'videoProgress',
      metadata: {
        courseId: courseId ?? undefined,
        publicationId,
        entityId: getEntityIdFromPayload(payloadRecord),
      },
    };
  }

  return {
    entityType: 'progress',
    metadata: {
      courseId: courseId ?? undefined,
      publicationId,
      entityId: getEntityIdFromPayload(payloadRecord),
    },
  };
}

function inferRouteCourseId(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const path = window.location.pathname;
  const courseMatch = path.match(/\/course\/([a-f0-9-]{36})(?:\/|$)/i)
    || path.match(/\/courses\/([a-f0-9-]{36})(?:\/|$)/i);

  return courseMatch?.[1];
}

async function findOfflinePublicationId(courseId: string): Promise<string | null> {
  try {
    const userId = getCurrentUserId();
    const offlineCourse = await offlineDb.courses.get([userId, courseId]);
    return offlineCourse?.publicationId ?? null;
  } catch {
    return null;
  }
}

async function persistOfflineLessonCompletion(
  lessonId: string,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const courseId = typeof payload['courseId'] === 'string'
    ? payload['courseId']
    : inferRouteCourseId();
  if (!courseId) {
    return null;
  }

  const userId = getCurrentUserId();
  const existing = await offlineDb.progress
    .where('lessonId').equals(lessonId)
    .filter(record => record.userId === userId && record.courseId === courseId)
    .first();
  const payloadCompletedSections = Array.isArray(payload['completedSectionIds'])
    ? payload['completedSectionIds'].filter((sectionId): sectionId is string => typeof sectionId === 'string' && sectionId.length > 0)
    : [];
  const completedSectionIds = Array.from(new Set([
    ...(existing?.completedSectionIds ?? []),
    ...payloadCompletedSections,
  ]));
  const completedAt = existing?.completedAt ?? new Date();

  if (existing?.id != null) {
    await offlineDb.progress.update(existing.id, {
      progressPercent: 100,
      completedAt,
      completedSectionIds,
      syncStatus: existing.syncStatus === 'conflict' ? 'conflict' : 'synced',
      updatedAt: new Date(),
    });
  } else {
    await offlineDb.progress.add({
      lessonId,
      courseId,
      userId,
      progressPercent: 100,
      videoPosition: 0,
      completedSectionIds,
      completedAt,
      syncStatus: 'synced',
      updatedAt: new Date(),
    });
  }

  return {
    lessonId,
    status: 'COMPLETED',
    completedAt: completedAt.toISOString(),
    completedSections: completedSectionIds,
  };
}

async function persistOfflineSectionCompletion(
  lessonId: string,
  sectionId: string,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const courseId = typeof payload['courseId'] === 'string'
    ? payload['courseId']
    : inferRouteCourseId();
  if (!courseId) {
    return null;
  }

  const userId = getCurrentUserId();
  const existing = await offlineDb.progress
    .where('lessonId').equals(lessonId)
    .filter(record => record.userId === userId && record.courseId === courseId)
    .first();
  const completedSections = Array.from(new Set([
    ...(existing?.completedSectionIds ?? []),
    sectionId,
  ]));

  if (existing?.id != null) {
    await offlineDb.progress.update(existing.id, {
      completedSectionIds: completedSections,
      progressPercent: Math.max(existing.progressPercent, 1),
      syncStatus: existing.syncStatus === 'conflict' ? 'conflict' : 'synced',
      updatedAt: new Date(),
    });
  } else {
    await offlineDb.progress.add({
      lessonId,
      courseId,
      userId,
      progressPercent: 1,
      videoPosition: 0,
      completedSectionIds: completedSections,
      syncStatus: 'synced',
      updatedAt: new Date(),
    });
  }

  return {
    lessonId,
    sectionId,
    status: 'SECTION_COMPLETED',
    completedSections,
  };
}

function getEntityIdFromPayload(payload: Record<string, unknown>): string | undefined {
  const rawValue = payload['entityId']
    ?? payload['id']
    ?? payload['sectionId']
    ?? payload['lessonId']
    ?? payload['quizId']
    ?? payload['assignmentId'];
  return typeof rawValue === 'string' && rawValue.length > 0 ? rawValue : undefined;
}

type QueuedVideoProgress = {
  id: null;
  studentId: null;
  lessonId: string | null;
  sectionId: string;
  durationSeconds: number;
  watchedSeconds: number;
  progressPercent: number;
  completed: boolean;
  lastPosition: number;
};

async function getQueuedVideoProgress(sectionId: string): Promise<QueuedVideoProgress | null> {
  await ensureOfflineDbReady();
  const userId = getCurrentUserId();
  const matchingItems = await offlineDb.syncQueue
    .where('userId').equals(userId)
    .filter(item => item.entityType === 'videoProgress' && item.syncStatus !== 'synced')
    .toArray();

  const sectionPayloads = matchingItems
    .map(item => (item.payload && typeof item.payload === 'object')
      ? item.payload as Record<string, unknown>
      : null)
    .filter((payload): payload is Record<string, unknown> => payload !== null)
    .filter(payload => payload['sectionId'] === sectionId);

  if (sectionPayloads.length === 0) {
    return null;
  }

  const durationSeconds = sectionPayloads.reduce((max, payload) => {
    const duration = typeof payload['durationSeconds'] === 'number'
      ? Math.max(0, Math.trunc(payload['durationSeconds']))
      : 0;
    return Math.max(max, duration);
  }, 0);

  const lessonId = sectionPayloads.find(payload => typeof payload['lessonId'] === 'string')?.['lessonId'] as string | undefined;
  const lastPosition = sectionPayloads.reduce((max, payload) => {
    const candidate = typeof payload['lastPosition'] === 'number'
      ? Math.max(0, Math.trunc(payload['lastPosition']))
      : 0;
    return Math.max(max, candidate);
  }, 0);

  const mergedRanges = mergeProgressRanges(sectionPayloads);
  const watchedSeconds = mergedRanges.reduce((total, range) => total + (range.to - range.from), 0);
  const progressPercent = durationSeconds > 0
    ? Math.min(100, Math.round((watchedSeconds / durationSeconds) * 100))
    : 0;

  return {
    id: null,
    studentId: null,
    lessonId: lessonId ?? null,
    sectionId,
    durationSeconds,
    watchedSeconds,
    progressPercent,
    completed: progressPercent >= 90,
    lastPosition,
  };
}

function mergeProgressRanges(
  payloads: Record<string, unknown>[],
): Array<{ from: number; to: number }> {
  const ranges = payloads
    .map((payload) => {
      const from = typeof payload['fromSecond'] === 'number'
        ? Math.max(0, Math.trunc(payload['fromSecond']))
        : 0;
      const to = typeof payload['toSecond'] === 'number'
        ? Math.max(from, Math.trunc(payload['toSecond']))
        : from;
      return { from, to };
    })
    .filter((range) => range.to > range.from)
    .sort((left, right) => left.from - right.from);

  if (ranges.length === 0) {
    return [];
  }

  const merged: Array<{ from: number; to: number }> = [ranges[0]];
  for (let index = 1; index < ranges.length; index++) {
    const current = ranges[index];
    const previous = merged[merged.length - 1];
    if (current.from <= previous.to) {
      previous.to = Math.max(previous.to, current.to);
      continue;
    }
    merged.push({ ...current });
  }

  return merged;
}
