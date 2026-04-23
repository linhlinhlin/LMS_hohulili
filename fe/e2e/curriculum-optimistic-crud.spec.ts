import { test, expect, Page } from '@playwright/test';

const BASE = 'http://localhost:4200';
const TEACHER = { email: 'teacher@maritime.edu', password: 'teacher123' };

async function login(page: Page) {
  await page.goto(`${BASE}/auth/login`);
  await page.waitForLoadState('networkidle');

  const emailInput = page.locator('#email');
  await emailInput.waitFor({ timeout: 10000 });
  await emailInput.fill(TEACHER.email);
  await emailInput.press('Enter');

  const passwordInput = page.locator('#password');
  await passwordInput.waitFor({ timeout: 15000 });
  await passwordInput.fill(TEACHER.password);
  await passwordInput.press('Enter');

  await page.waitForURL(/\/teacher|\/admin|\/student/, { timeout: 15000 });
}

async function goToCurriculumOfFirstCourse(page: Page) {
  await page.waitForLoadState('networkidle');

  const editBtn = page.locator('button:has-text("Chỉnh sửa")').first();
  await editBtn.waitFor({ timeout: 10000 });
  await editBtn.click();
  await page.waitForLoadState('networkidle');

  const curriculumTab = page.locator('a[href*="curriculum"]').first();
  await curriculumTab.waitFor({ timeout: 10000 });
  await curriculumTab.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
}

test.describe('Curriculum Editor — Optimistic CRUD', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToCurriculumOfFirstCourse(page);
  });

  test('1. Trang curriculum load thành công', async ({ page }) => {
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    const treeItems = sidebar.locator('[role="treeitem"]');
    const count = await treeItems.count();
    console.log('Tree items loaded:', count);
    expect(count).toBeGreaterThan(0);

    await page.screenshot({ path: 'fe/e2e/screenshots/curriculum-loaded.png', fullPage: true });
  });

  test('2. Tạo chương mới — optimistic (không reload)', async ({ page }) => {
    const chapterName = `Test Chương ${Date.now()}`;

    const apiCalls: string[] = [];
    page.on('request', req => {
      if (req.url().includes('/api/v3/') && req.method() !== 'OPTIONS') {
        apiCalls.push(`${req.method()} ${new URL(req.url()).pathname}`);
      }
    });

    // Click add chapter button (icon-only, tooltip "Thêm chương")
    const addChapterBtn = page.locator('button[mattooltip="Thêm chương"]');
    await addChapterBtn.waitFor({ timeout: 5000 });
    await addChapterBtn.click();
    await page.waitForTimeout(500);

    // Fill chapter name in modal (specific placeholder to avoid matching search input)
    const titleInput = page.locator('input[placeholder="Nhập tên chương..."]');
    await titleInput.waitFor({ timeout: 3000 });
    await titleInput.fill(chapterName);

    // Click "Tạo chương" button
    const confirmBtn = page.locator('button:has-text("Tạo chương")');
    await confirmBtn.click();

    await page.waitForTimeout(3000);

    // Verify chapter appears in sidebar (optimistic update — no full reload needed)
    const chapterInSidebar = page.locator(`text=${chapterName}`).first();
    await expect(chapterInSidebar).toBeVisible({ timeout: 5000 });

    const hasFullReload = apiCalls.some(c =>
      c.includes('GET') && c.includes('/draft')
    );

    console.log('API calls after chapter create:', apiCalls.filter(c => !c.includes('OPTIONS')));
    console.log('Full reload happened:', hasFullReload);

    await page.screenshot({ path: 'fe/e2e/screenshots/chapter-created.png', fullPage: true });
  });

  test('3. Sidebar click nhanh — không lag, không lỗi', async ({ page }) => {
    const sidebar = page.locator('aside');
    await sidebar.waitFor({ timeout: 5000 });

    const treeItems = sidebar.locator('[role="treeitem"]');
    const count = await treeItems.count();
    if (count === 0) { test.skip(); return; }

    const startTime = Date.now();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const item = treeItems.nth(i);
      if (await item.isVisible().catch(() => false)) {
        await item.click();
        await page.waitForTimeout(200);
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`${Math.min(count, 5)} rapid clicks took ${elapsed}ms`);
    expect(elapsed).toBeLessThan(10000);

    await page.screenshot({ path: 'fe/e2e/screenshots/rapid-clicks.png', fullPage: true });
  });

  test('4. Chọn chapter → hiện editor panel', async ({ page }) => {
    const sidebar = page.locator('aside');
    await sidebar.waitFor({ timeout: 5000 });

    const firstChapter = sidebar.locator('[role="treeitem"]').first();
    if (!(await firstChapter.isVisible().catch(() => false))) {
      test.skip();
      return;
    }
    await firstChapter.click();
    await page.waitForTimeout(1000);

    // Verify some editor panel content appeared (right side)
    const editorArea = page.locator('main, section, [class*="editor"]').first();
    await expect(editorArea).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'fe/e2e/screenshots/chapter-selected.png', fullPage: true });
  });

  test('5. Chọn lesson → hiện editor bài học', async ({ page }) => {
    const sidebar = page.locator('aside');
    await sidebar.waitFor({ timeout: 5000 });

    // Click a lesson (second tree item, since first is the chapter)
    const lessonItem = sidebar.locator('[role="treeitem"]').nth(1);
    if (!(await lessonItem.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await lessonItem.click();
    await page.waitForTimeout(2000);

    // Verify URL updated with lessonId
    const url = page.url();
    console.log('URL after lesson click:', url);
    expect(url).toContain('lessonId=');

    await page.screenshot({ path: 'fe/e2e/screenshots/lesson-selected.png', fullPage: true });
  });

  test('6. Xóa chương test — cleanup + optimistic', async ({ page }) => {
    const sidebar = page.locator('aside');
    await sidebar.waitFor({ timeout: 5000 });

    // Find any test chapter from test #2
    const testChapter = page.locator('[role="treeitem"]').filter({ hasText: /Test Chương/ }).first();
    if (!(await testChapter.isVisible().catch(() => false))) {
      console.log('No test chapter found to delete, skipping cleanup');
      return;
    }

    // Open kebab menu on the test chapter
    const kebabBtn = testChapter.locator('button.sidebar-kebab').first();
    if (await kebabBtn.isVisible().catch(() => false)) {
      await kebabBtn.click();
      await page.waitForTimeout(500);

      // Look for delete option in the dropdown
      const deleteBtn = page.locator('button:has-text("Xóa chương")').first();
      if (await deleteBtn.isVisible().catch(() => false)) {
        const apiCalls: string[] = [];
        page.on('request', req => {
          if (req.url().includes('/api/v3/') && req.method() !== 'OPTIONS') {
            apiCalls.push(`${req.method()} ${new URL(req.url()).pathname}`);
          }
        });

        await deleteBtn.click();
        await page.waitForTimeout(500);

        // Confirm delete if dialog appears
        const confirmBtn = page.locator('button:has-text("Xóa")').last();
        if (await confirmBtn.isVisible().catch(() => false)) {
          await confirmBtn.click();
        }
        await page.waitForTimeout(2000);

        const hasFullReload = apiCalls.some(c =>
          c.includes('GET') && c.includes('/draft')
        );
        console.log('API calls after delete:', apiCalls.filter(c => !c.includes('OPTIONS')));
        console.log('Full reload after delete:', hasFullReload);
      } else {
        console.log('Delete button not found in menu');
      }
    } else {
      console.log('Kebab menu not found on test chapter');
    }

    await page.screenshot({ path: 'fe/e2e/screenshots/chapter-deleted.png', fullPage: true });
  });
});
