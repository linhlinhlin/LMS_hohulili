import { expect, test } from '@playwright/test';
import {
  findLearningProgressFixture,
  getAuthorizedJson,
  resetAppOriginState,
  seedStudentSession,
} from './helpers/auth';

type CourseEnvelope = {
  content?: Array<Record<string, any>>;
};

type LessonProgressSnapshot = {
  status?: string;
  completedSections?: string[];
};

function unwrapData<T>(payload: any): T {
  return (payload?.data ?? payload) as T;
}

function extractCourseProgress(rawCourse: any): number {
  return Number(
    rawCourse?.progressPercentage
    ?? rawCourse?.completionPercent
    ?? rawCourse?.progress
    ?? 0,
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test.describe('@smoke Online learning progress baseline', () => {
  test('@smoke completing a lesson keeps backend progress and next-lesson state aligned', async ({ page, request }) => {
    test.slow();

    await resetAppOriginState(page);
    const session = await seedStudentSession(page, request);
    const fixture = await findLearningProgressFixture(request, session.accessToken);

    const enrolledBeforePayload = await getAuthorizedJson<any>(
      request,
      session.accessToken,
      '/api/v3/student/courses/enrolled?page=0&size=100',
    );
    const enrolledBefore = unwrapData<CourseEnvelope>(enrolledBeforePayload).content ?? [];
    const courseBefore = enrolledBefore.find((course) => course?.id === fixture.courseId);
    const baselineProgress = extractCourseProgress(courseBefore);

    const completedBeforePayload = await getAuthorizedJson<any>(
      request,
      session.accessToken,
      `/api/v3/student/progress/courses/${fixture.courseId}/completed-ids`,
    );
    const completedBefore = new Set(unwrapData<string[]>(completedBeforePayload) ?? []);

    await page.goto(`/student/learn/course/${fixture.courseId}/lesson/${fixture.lessonId}`);
    await expect(page.getByText(fixture.lessonTitle).first()).toBeVisible({ timeout: 20_000 });

    const completionButton = page.getByRole('button', { name: /Đánh dấu hoàn thành|Đã hoàn thành/i });
    for (let step = 0; step < fixture.sectionIds.length; step += 1) {
      await expect(completionButton).toBeVisible({ timeout: 10_000 });

      if (step === fixture.sectionIds.length - 1) {
        const lessonCompleteResponse = page.waitForResponse((response) =>
          response.request().method() === 'POST'
          && response.url().includes(`/api/v3/student/progress/lessons/${fixture.lessonId}/complete`),
        );

        await completionButton.click();
        expect((await lessonCompleteResponse).ok()).toBeTruthy();
      } else {
        const currentSectionId = fixture.sectionIds[step];
        const sectionCompleteResponse = page.waitForResponse((response) =>
          response.request().method() === 'POST'
          && response.url().includes(`/api/v3/student/progress/lessons/${fixture.lessonId}/sections/${currentSectionId}/complete`),
        );

        await completionButton.click();
        expect((await sectionCompleteResponse).ok()).toBeTruthy();
      }
    }

    await expect
      .poll(async () => {
        const lessonProgressPayload = await getAuthorizedJson<any>(
          request,
          session.accessToken,
          `/api/v3/student/lessons/${fixture.lessonId}/progress`,
        );
        const lessonProgress = unwrapData<LessonProgressSnapshot>(lessonProgressPayload);
        return {
          status: lessonProgress.status ?? null,
          completedSections: Array.isArray(lessonProgress.completedSections)
            ? lessonProgress.completedSections.length
            : 0,
        };
      }, { timeout: 30_000, intervals: [500, 1_000, 2_000] })
      .toEqual({
        status: 'COMPLETED',
        completedSections: fixture.sectionIds.length,
      });

    const completedAfterPayload = await getAuthorizedJson<any>(
      request,
      session.accessToken,
      `/api/v3/student/progress/courses/${fixture.courseId}/completed-ids`,
    );
    const completedAfter = new Set(unwrapData<string[]>(completedAfterPayload) ?? []);
    expect(completedAfter.has(fixture.lessonId)).toBeTruthy();
    expect(completedAfter.size).toBeGreaterThanOrEqual(completedBefore.size + 1);

    const enrolledAfterPayload = await getAuthorizedJson<any>(
      request,
      session.accessToken,
      '/api/v3/student/courses/enrolled?page=0&size=100',
    );
    const enrolledAfter = unwrapData<CourseEnvelope>(enrolledAfterPayload).content ?? [];
    const courseAfter = enrolledAfter.find((course) => course?.id === fixture.courseId);
    expect(extractCourseProgress(courseAfter)).toBeGreaterThanOrEqual(baselineProgress);

    if (fixture.nextLessonTitle) {
      const nextLessonButton = page.getByRole('button', { name: /Bài tiếp theo/i });
      await expect(nextLessonButton).toBeEnabled({ timeout: 15_000 });
      await nextLessonButton.click();
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: new RegExp(escapeRegExp(fixture.nextLessonTitle), 'i'),
        }),
      ).toBeVisible({ timeout: 15_000 });
    }
  });
});
