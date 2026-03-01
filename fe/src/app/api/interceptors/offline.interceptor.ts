import { HttpRequest, HttpHandlerFn, HttpEvent, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { inject } from '@angular/core';
import { offlineDb, getCurrentUserId } from '../../core/db/lms-offline.db';
import { NetworkStatusService } from '../../core/services/network-status.service';
import { OfflineSyncService } from '../../core/services/offline-sync.service';

/** Paths that must never be intercepted offline (auth, health checks) */
const NEVER_INTERCEPT_PREFIXES = ['/api/v3/auth/', '/api/v3/sync/', '/actuator/'];

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
  const network = inject(NetworkStatusService);
  const syncService = inject(OfflineSyncService);

  // If online, proceed normally but catch network failures
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Only handle network errors (status 0 = no connection, or TypeError)
      const isNetworkError = error.status === 0 || error.error instanceof ProgressEvent;
      if (!isNetworkError) {
        return throwError(() => error);
      }

      // Never intercept auth or health-check endpoints
      const path = extractApiPath(req.url) || req.url;
      if (NEVER_INTERCEPT_PREFIXES.some(prefix => path.startsWith(prefix))) {
        return throwError(() => error);
      }

      // For GET requests → try offline fallback
      if (req.method === 'GET') {
        return from(getOfflineFallback(req.url)).pipe(
          switchMap(cached => {
            if (cached !== null) {
              return of(new HttpResponse({
                status: 200,
                body: cached,
                headers: req.headers,
                url: req.url,
              }));
            }
            // No cached data available
            return throwError(() => new HttpErrorResponse({
              status: 0,
              statusText: 'Offline',
              url: req.url,
              error: { message: 'Không có kết nối mạng và dữ liệu chưa được tải xuống' },
            }));
          }),
        );
      }

      // For mutation requests → queue for later sync
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        return from(queueMutation(syncService, req)).pipe(
          switchMap(() => {
            // Return a fake success response so the UI doesn't break
            return of(new HttpResponse({
              status: 202,
              body: {
                success: true,
                message: 'Đã lưu ngoại tuyến, sẽ đồng bộ khi có mạng',
                data: req.body,
                _offline: true,
              },
              url: req.url,
            }));
          }),
          catchError(() => throwError(() => error)),
        );
      }

      return throwError(() => error);
    }),
  );
};

// ─── Offline Fallback Logic ──────────────────────────────────────────

/**
 * Try to serve data from IndexedDB based on the request URL.
 * Returns null if no cached data available.
 */
async function getOfflineFallback(url: string): Promise<any | null> {
  try {
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
        return {
          success: true,
          data: courses,
          message: 'Dữ liệu ngoại tuyến',
          _offline: true,
        };
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
): Promise<void> {
  const path = extractApiPath(req.url) || req.url;

  // Determine entity type from path
  let entityType: 'progress' | 'submission' | 'quizAttempt' | 'videoProgress' = 'progress';
  if (path.includes('/submissions') || path.includes('/assignments')) {
    entityType = 'submission';
  } else if (path.includes('/quiz') || path.includes('/attempts')) {
    entityType = 'quizAttempt';
  } else if (path.includes('/video-progress') || path.includes('/progress')) {
    entityType = 'videoProgress';
  }

  const operationType = req.method === 'POST' ? 'CREATE'
    : req.method === 'DELETE' ? 'DELETE' : 'UPDATE';

  await syncService.queueOperation(entityType, operationType, path, req.body);
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
