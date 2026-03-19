import { expect, test } from '@playwright/test';
import { findAdaptiveVideoFixture, seedStudentSession } from './helpers/auth';

test.describe('Student adaptive video playback', () => {
  test('learner can open an ADAPTIVE_R2 lesson section and request the HLS session', async ({ page, request }) => {
    const session = await seedStudentSession(page, request);
    const fixture = await findAdaptiveVideoFixture(request, session.accessToken);
    const sectionNavLabel = `${fixture.lessonIndex + 1}.${fixture.sectionIndex + 1}`;

    await page.goto(`/student/courses/${fixture.courseId}`);

    const entryButton = page.locator('header.hero .btn-cta').first();
    await expect(entryButton).toBeVisible({ timeout: 15_000 });

    await Promise.all([
      page.waitForURL(new RegExp(`/student/learn/course/${fixture.courseId}`)),
      entryButton.click(),
    ]);

    await expect(page.locator('app-course-learning aside')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('app-course-learning main').first()).toBeVisible({ timeout: 15_000 });

    const playResponsePromise = page.waitForResponse((response) =>
      response.url().includes(`/api/v3/sections/${fixture.sectionId}/video/play?format=hls`),
    );
    const manifestResponsePromise = page.waitForResponse((response) =>
      response.url().includes(`/api/v3/video-assets/${fixture.videoAssetId}/adaptive/`)
      && response.url().includes('/hls/master.m3u8'),
    );

    const lessonButton = page.locator('app-course-learning aside button').filter({ hasText: fixture.lessonTitle }).first();
    await expect(lessonButton).toBeVisible({ timeout: 15_000 });
    await lessonButton.click();

    const sectionButton = page.locator('app-course-learning aside button').filter({ hasText: sectionNavLabel }).first();
    await expect(sectionButton).toBeVisible({ timeout: 15_000 });
    await sectionButton.click();

    const playPayload = await (await playResponsePromise).json();
    expect(playPayload.videoSourceKind).toBe('ADAPTIVE_R2');
    expect(playPayload.videoAssetId).toBe(fixture.videoAssetId);
    expect(playPayload.playUrl).toContain('/hls/master.m3u8');

    const manifestResponse = await manifestResponsePromise;
    expect(manifestResponse.ok()).toBeTruthy();

    await expect(page.getByTestId('adaptive-video-player')).toBeVisible();
    await expect(page.getByTestId('adaptive-video-element')).toBeVisible();
    await expect(page.getByTestId('adaptive-video-error')).toHaveCount(0);
  });
});
