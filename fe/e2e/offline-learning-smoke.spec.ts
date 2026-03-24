import { expect, test } from '@playwright/test';
import {
  getAuthorizedJson,
  readOfflineCourseRecord,
  readOfflineProgressRecord,
  readOfflineSyncQueue,
  resetAppOriginState,
  seedOfflineLearningSession,
} from './helpers/auth';

type LessonProgressSnapshot = {
  status?: string;
  completedSections?: string[];
};

type ResumeSnapshot = {
  position?: number;
};

function unwrapData<T>(payload: any): T {
  return (payload?.data ?? payload) as T;
}

test.describe('@smoke Offline learning continuity', () => {
  test('@smoke learner can keep lesson progress offline and converge back online', async ({ page, request }) => {
    test.slow();

    await resetAppOriginState(page);
    const { session, fixture } = await seedOfflineLearningSession(page, request);

    await page.goto('/student/courses/library');

    const courseCard = page.locator('.course-card-outer').filter({ hasText: fixture.courseTitle }).first();
    await expect(courseCard).toBeVisible({ timeout: 30_000 });

    const downloadButton = courseCard.locator('app-course-download-button button').first();
    await expect(downloadButton).toBeVisible();
    await downloadButton.click();

    await expect(
      page.getByRole('heading', { name: new RegExp(`Tải về:.*${fixture.courseTitle}`, 'i') }),
    ).toBeVisible({ timeout: 15_000 });
    await page.locator('input[name="videoQuality"][value="none"]').check();
    await page.getByRole('button', { name: /^Tải về$/i }).click();

    await expect
      .poll(async () => {
        const courseRecord = await readOfflineCourseRecord(page, fixture.courseId);
        return Boolean(courseRecord);
      }, { timeout: 120_000, intervals: [1_000, 2_000, 3_000] })
      .toBeTruthy();

    await page.goto('/student/storage');
    await expect(page.getByText(fixture.courseTitle).first()).toBeVisible({ timeout: 120_000 });

    await page.goto(`/student/learn/course/${fixture.courseId}/lesson/${fixture.videoLessonId}`);
    await expect(page.getByText(fixture.videoLessonTitle).first()).toBeVisible({ timeout: 20_000 });

    const advanceSectionButton = page.getByRole('button', { name: /Bài tiếp theo/i });
    for (let index = 0; index < fixture.videoSectionIndex; index += 1) {
      await expect(advanceSectionButton).toBeEnabled({ timeout: 10_000 });
      await advanceSectionButton.click();
    }

    const videoElement = page.getByTestId('adaptive-video-element');
    await expect(videoElement).toBeVisible({ timeout: 20_000 });

    await page.context().setOffline(true);

    await videoElement.evaluate((element) => {
      const video = element as HTMLVideoElement;
      try {
        Object.defineProperty(video, 'duration', {
          configurable: true,
          value: 120,
        });
      } catch {
        // Best-effort only for smoke.
      }
      video.dispatchEvent(new Event('loadedmetadata'));
      try {
        video.currentTime = 42;
      } catch {
        // Best-effort only for smoke.
      }
      video.dispatchEvent(new Event('timeupdate'));
      try {
        video.currentTime = 64;
      } catch {
        // Best-effort only for smoke.
      }
      video.dispatchEvent(new Event('timeupdate'));
    });

    const safeLessonButton = page.locator('app-course-learning aside button').filter({ hasText: fixture.lessonTitle }).first();
    const safeChapterButton = page.locator('app-course-learning aside button').filter({ hasText: fixture.chapterTitle }).first();
    if ((await safeChapterButton.count()) && !(await safeLessonButton.isVisible())) {
      await safeChapterButton.click();
    }
    await expect(safeLessonButton).toBeVisible({ timeout: 20_000 });
    await safeLessonButton.click();

    await expect(page.getByText(fixture.lessonTitle).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Lỗi tải bài học/i)).toHaveCount(0);

    const completionButton = page.getByRole('button', { name: /Đánh dấu hoàn thành|Đã hoàn thành/i });
    for (let step = 0; step < fixture.sectionIds.length; step += 1) {
      await expect(completionButton).toBeVisible({ timeout: 10_000 });
      await completionButton.click();
    }

    await expect
      .poll(async () => {
        const queue = await readOfflineSyncQueue(page);
        return queue.some((item) => item?.entityType === 'videoProgress' && item?.syncStatus === 'pending');
      }, { timeout: 30_000, intervals: [500, 1_000, 2_000] })
      .toBeTruthy();

    await expect
      .poll(async () => {
        const queue = await readOfflineSyncQueue(page);
        return queue.some((item) => item?.entityType === 'progress' && item?.syncStatus === 'pending');
      }, { timeout: 30_000, intervals: [500, 1_000, 2_000] })
      .toBeTruthy();

    await expect
      .poll(async () => {
        const record = await readOfflineProgressRecord(page, fixture.lessonId);
        return {
          completedCount: Array.isArray(record?.completedSectionIds) ? record.completedSectionIds.length : 0,
          isCompleted: Boolean(record?.completedAt),
          syncStatus: record?.syncStatus ?? null,
        };
      }, { timeout: 30_000, intervals: [500, 1_000, 2_000] })
      .toMatchObject({
        completedCount: fixture.sectionIds.length,
        isCompleted: true,
      });

    await page.context().setOffline(false);
    await page.goto('/student/storage');

    const syncNowButton = page.getByRole('button', { name: /Đồng bộ ngay/i });
    await expect(syncNowButton).toBeEnabled({ timeout: 30_000 });
    await syncNowButton.click();

    await expect
      .poll(async () => {
        const queue = await readOfflineSyncQueue(page);
        return queue.filter(
          (item) =>
            (item?.entityType === 'progress' || item?.entityType === 'videoProgress')
            && item?.syncStatus !== 'synced',
        ).length;
      }, { timeout: 90_000, intervals: [1_000, 2_000, 3_000, 5_000] })
      .toBe(0);

    const lessonProgressPayload = await getAuthorizedJson<any>(
      request,
      session.accessToken,
      `/api/v3/student/lessons/${fixture.lessonId}/progress`,
    );
    const lessonProgress = unwrapData<LessonProgressSnapshot>(lessonProgressPayload);
    expect(lessonProgress.status).toBe('COMPLETED');
    expect(new Set(lessonProgress.completedSections ?? [])).toEqual(new Set(fixture.sectionIds));

    const resumePayload = await getAuthorizedJson<any>(
      request,
      session.accessToken,
      `/api/v3/video-progress/${fixture.videoSectionId}/resume`,
    );
    const resume = unwrapData<ResumeSnapshot>(resumePayload);
    expect(Number(resume.position ?? 0)).toBeGreaterThan(0);
  });
});
