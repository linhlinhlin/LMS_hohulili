import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:4200';
const COURSE_ID = 'df34d812-48d8-416b-9065-f53149733eb9';

async function login(page: any) {
  await page.goto(`${BASE}/auth/login`);
  await page.fill('input[type="email"], input[formControlName="email"]', 'teacher@maritime.edu');
  await page.fill('input[type="password"], input[formControlName="password"]', 'teacher123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/teacher/**', { timeout: 15000 });
}

test.describe('Classes Tab Visual Audit', () => {

  test('1. Classes tab — full width + version badges + capacity', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/teacher/courses/${COURSE_ID}/editor/classes`);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'e2e/screenshots/01-classes-tab.png', fullPage: true });
  });

  test('2. Create class dialog', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/teacher/courses/${COURSE_ID}/editor/classes`);
    await page.waitForTimeout(2000);
    // Click "Tạo lớp mới" button
    await page.click('button:has-text("Tạo lớp mới")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/02-create-class-dialog.png', fullPage: true });
    // Close dialog
    await page.click('button:has-text("Hủy bỏ")');
  });

  test('3. Student list page (eye icon)', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/teacher/courses/${COURSE_ID}/editor/classes`);
    await page.waitForTimeout(2000);
    // Click eye icon (view students) on first row
    const eyeButton = page.locator('button[title="Danh sách học viên"]').first();
    if (await eyeButton.isVisible()) {
      await eyeButton.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'e2e/screenshots/03-student-list-page.png', fullPage: true });
    } else {
      await page.screenshot({ path: 'e2e/screenshots/03-no-eye-button.png', fullPage: true });
    }
  });

  test('4. Add student drawer', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/teacher/courses/${COURSE_ID}/editor/classes`);
    await page.waitForTimeout(2000);
    // Click green add student icon on first row
    const addBtn = page.locator('button[title="Thêm học viên"]').first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'e2e/screenshots/04-add-student-drawer.png', fullPage: true });
    }
  });

  test('5. Co-teacher drawer', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/teacher/courses/${COURSE_ID}/editor/classes`);
    await page.waitForTimeout(2000);
    // Click purple co-teacher icon on first row
    const coTeacherBtn = page.locator('button[title="Đồng giảng viên"]').first();
    if (await coTeacherBtn.isVisible()) {
      await coTeacherBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'e2e/screenshots/05-co-teacher-drawer.png', fullPage: true });
    }
  });

  test('6. Edit class dialog', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/teacher/courses/${COURSE_ID}/editor/classes`);
    await page.waitForTimeout(2000);
    // Click edit icon on first row
    const editBtn = page.locator('button[title="Chỉnh sửa"]').first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'e2e/screenshots/06-edit-class-dialog.png', fullPage: true });
    }
  });

  test('7. Content tab for width comparison', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/teacher/courses/${COURSE_ID}/editor/curriculum`);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'e2e/screenshots/07-content-tab-comparison.png', fullPage: true });
  });

});
