import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:4200';
const COURSE_ID = 'df34d812-48d8-416b-9065-f53149733eb9';

// Force desktop viewport for all tests
test.use({ viewport: { width: 1440, height: 900 } });

async function login(page: any) {
  await page.goto(`${BASE}/auth/login`);
  await page.fill('input[type="email"], input[formControlName="email"]', 'teacher@maritime.edu');
  await page.fill('input[type="password"], input[formControlName="password"]', 'teacher123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/teacher/**', { timeout: 15000 });
}

test.describe('Desktop Classes Audit', () => {

  test('1. Classes tab full width', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/teacher/courses/${COURSE_ID}/editor/classes`);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'e2e/screenshots/desktop-01-classes.png', fullPage: true });
  });

  test('2. Create dialog', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/teacher/courses/${COURSE_ID}/editor/classes`);
    await page.waitForTimeout(2000);
    await page.click('button:has-text("Tạo lớp mới")');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'e2e/screenshots/desktop-02-create-dialog.png', fullPage: true });
  });

  test('3. Edit dialog', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/teacher/courses/${COURSE_ID}/editor/classes`);
    await page.waitForTimeout(2000);
    const editBtn = page.locator('button[title="Chỉnh sửa"]').first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'e2e/screenshots/desktop-03-edit-dialog.png', fullPage: true });
    }
  });

  test('4. Add student drawer', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/teacher/courses/${COURSE_ID}/editor/classes`);
    await page.waitForTimeout(2000);
    const btn = page.locator('button[title="Thêm học viên"]').first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'e2e/screenshots/desktop-04-add-student.png', fullPage: true });
    }
  });

  test('5. Co-teacher drawer', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/teacher/courses/${COURSE_ID}/editor/classes`);
    await page.waitForTimeout(2000);
    const btn = page.locator('button[title="Đồng giảng viên"]').first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'e2e/screenshots/desktop-05-co-teacher.png', fullPage: true });
    }
  });

  test('6. Student list page', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/teacher/courses/${COURSE_ID}/editor/classes`);
    await page.waitForTimeout(2000);
    const eyeBtn = page.locator('button[title="Danh sách học viên"]').first();
    if (await eyeBtn.isVisible()) {
      await eyeBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'e2e/screenshots/desktop-06-student-list.png', fullPage: true });
    }
  });

  test('7. Content tab comparison', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/teacher/courses/${COURSE_ID}/editor/curriculum`);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'e2e/screenshots/desktop-07-content-tab.png', fullPage: true });
  });

});
