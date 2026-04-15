import { test, expect } from '@playwright/test';

const TEACHER_EMAIL = 'teacher@maritime.edu';
const TEACHER_PASS = 'teacher123';
const BE_URL = 'http://localhost:8088';
const FE_URL = 'http://localhost:4200';

test.describe('System Smoke Tests', () => {

  test('1. Backend login returns 200', async ({ page }) => {
    await page.goto(FE_URL);
    const result = await page.evaluate(async (url) => {
      const resp = await fetch(`${url}/api/v3/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'teacher@maritime.edu', password: 'teacher123' }),
      });
      return { status: resp.status, body: await resp.json() };
    }, BE_URL);

    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    expect(result.body.data.accessToken).toBeTruthy();
  });

  test('2. FE proxy forwards /api correctly', async ({ page }) => {
    await page.goto(FE_URL);
    const result = await page.evaluate(async () => {
      const resp = await fetch('/api/v3/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'teacher@maritime.edu', password: 'teacher123' }),
      });
      return { status: resp.status, body: await resp.json() };
    });

    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
  });

  test('3. Settings page: no "Vùng nguy hiểm", has "Xóa khóa học"', async ({ page }) => {
    // Login
    await page.goto(FE_URL);
    const loginData = await page.evaluate(async (beUrl) => {
      const resp = await fetch(`${beUrl}/api/v3/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'teacher@maritime.edu', password: 'teacher123' }),
      });
      return resp.json();
    }, BE_URL);

    await page.evaluate((data) => {
      localStorage.setItem('access_token', data.data.accessToken);
      localStorage.setItem('refresh_token', data.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.data.user));
    }, loginData);

    // Go to teacher courses
    await page.goto(`${FE_URL}/teacher/courses`);
    await page.waitForLoadState('networkidle');

    // Find first course
    const courseCard = page.locator('a[href*="/editor/"]').first();
    if (await courseCard.count() === 0) {
      test.skip(true, 'No courses found');
      return;
    }
    await courseCard.click();
    await page.waitForLoadState('networkidle');

    // Click Settings tab
    const settingsTab = page.locator('text=Cài đặt').first();
    await settingsTab.click();
    await page.waitForTimeout(1500);

    // Assertions
    await expect(page.locator('text=Vùng nguy hiểm')).toHaveCount(0);
    await expect(page.locator('text=Xóa khóa học')).toBeVisible();
    await expect(page.locator('text=Xóa vĩnh viễn')).toBeVisible();
    await expect(page.locator('text=Mời giảng viên')).toHaveCount(0);
    await expect(page.locator('text=Cho phép tải về ngoại tuyến')).toBeVisible();
  });

  test('4. Co-teacher API endpoints work', async ({ page }) => {
    await page.goto(FE_URL);
    const result = await page.evaluate(async (beUrl) => {
      // Login
      const loginResp = await fetch(`${beUrl}/api/v3/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'teacher@maritime.edu', password: 'teacher123' }),
      });
      const loginData = await loginResp.json();
      const token = loginData.data.accessToken;
      const headers = { Authorization: `Bearer ${token}` };

      // Test endpoints
      const [instructors, assignments, courses] = await Promise.all([
        fetch(`${beUrl}/api/v3/users/instructors`, { headers }).then(r => r.status),
        fetch(`${beUrl}/api/v3/teacher/assignments/summary`, { headers }).then(r => r.status),
        fetch(`${beUrl}/api/v3/teacher/courses/my-courses`, { headers }).then(r => r.status),
      ]);

      return { instructors, assignments, courses };
    }, BE_URL);

    expect(result.instructors).toBe(200);
    expect(result.assignments).toBe(200);
    expect(result.courses).toBe(200);
  });
});
