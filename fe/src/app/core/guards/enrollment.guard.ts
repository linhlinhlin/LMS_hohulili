import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CourseApi } from '../../api/client/course.api';
import { firstValueFrom } from 'rxjs';
import { CourseDownloadService } from '../services/course-download.service';

/**
 * Enrollment Guard - Ensures student is enrolled in the course before accessing learning content.
 *
 * SOTA (Coursera/edX pattern): Paywall enforcement at route level.
 * Checks enrollment status via GET /api/v3/student/progress/courses/:courseId.
 * If status === "not_enrolled", redirects to course detail page for enrollment.
 */
export const enrollmentGuard: CanActivateFn = async (route) => {
  const courseApi = inject(CourseApi);
  const courseDownload = inject(CourseDownloadService);
  const router = inject(Router);

  const courseId = route.paramMap.get('courseId') || route.paramMap.get('id');
  if (!courseId) {
    return router.createUrlTree(['/student/courses']);
  }

  try {
    const response = await firstValueFrom(courseApi.getCourseProgress(courseId));
    const status = response?.data?.status;

    if (status === 'not_enrolled' || status === 'not_authenticated') {
      return router.createUrlTree(['/student/courses', courseId]);
    }

    return true;
  } catch {
    if (await courseDownload.isDownloaded(courseId)) {
      // A downloaded course must remain accessible when the progress endpoint
      // is temporarily unavailable or the learner is offline.
      return true;
    }

    // No verified enrollment and no offline copy — keep the route fail-closed.
    return router.createUrlTree(['/student/courses', courseId]);
  }
};
