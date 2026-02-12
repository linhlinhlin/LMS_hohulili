import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CourseApi } from '../../api/client/course.api';
import { firstValueFrom } from 'rxjs';

/**
 * Enrollment Guard - Ensures student is enrolled in the course before accessing learning content.
 *
 * SOTA (Coursera/edX pattern): Paywall enforcement at route level.
 * Checks enrollment status via GET /api/v3/student/progress/courses/:courseId.
 * If status === "not_enrolled", redirects to course detail page for enrollment.
 */
export const enrollmentGuard: CanActivateFn = async (route) => {
  const courseApi = inject(CourseApi);
  const router = inject(Router);

  const courseId = route.paramMap.get('courseId') || route.paramMap.get('id');
  if (!courseId) {
    return router.createUrlTree(['/student/my-courses']);
  }

  try {
    const response = await firstValueFrom(courseApi.getCourseProgress(courseId));
    const status = response?.data?.status;

    if (status === 'not_enrolled' || status === 'not_authenticated') {
      return router.createUrlTree(['/student/course', courseId]);
    }

    return true;
  } catch {
    // On API error, allow access (don't block due to network issues)
    return true;
  }
};
