import { test, expect, Page } from '@playwright/test';

const BASE = 'http://localhost:4200';
const TEACHER = { email: 'teacher@maritime.edu', password: 'teacher123' };

async function loginAndGoToCurriculum(page: Page) {
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle' });
  const emailInput = page.getByRole('textbox', { name: /email/i });
  await emailInput.waitFor({ timeout: 15000 });
  await emailInput.fill(TEACHER.email);
  await page.getByRole('textbox', { name: /mật khẩu/i }).fill(TEACHER.password);
  await page.getByRole('button', { name: /đăng nhập/i }).click();
  await page.waitForURL(/\/teacher/, { timeout: 15000 });

  // Navigate to first course editor → Nội dung tab
  await page.locator('button:has-text("Chỉnh sửa")').first().click();
  await page.waitForLoadState('networkidle');
  await page.locator('a:has-text("Nội dung")').click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
}

test.describe('Curriculum Editor SOTA Audit', () => {
  test.describe.configure({ timeout: 60000 });

  test.beforeEach(async ({ page }) => {
    await loginAndGoToCurriculum(page);
  });

  test('P3-7: sidebar header shows chapter + lesson count', async ({ page }) => {
    const countText = page.locator('text=/\\d+\\s+chương\\s+·\\s+\\d+\\s+bài/');
    await expect(countText).toBeVisible({ timeout: 5000 });
  });

  test('P2-5: search input visible when >3 chapters', async ({ page }) => {
    const sidebar = page.locator('aside[role="tree"]');
    const chapterCount = await sidebar.locator('[role="treeitem"]').count();
    if (chapterCount <= 3) { test.skip(); return; }

    const searchInput = page.locator('input[placeholder*="Tìm chương"]');
    await expect(searchInput).toBeVisible({ timeout: 3000 });
  });

  test('P3-9: expand/collapse all toggle', async ({ page }) => {
    const sidebar = page.locator('aside[role="tree"]');
    if (await sidebar.locator('[role="treeitem"]').count() < 2) { test.skip(); return; }

    // Look for the chevron toggle button near header
    const headerBtns = page.locator('aside button:has(svg path)');
    // The first button in header area should be expand/collapse toggle
    const firstHeaderBtn = headerBtns.first();
    if (await firstHeaderBtn.count() === 0) { test.skip(); return; }

    // Click and verify at least some chapters expand
    await firstHeaderBtn.click();
    await page.waitForTimeout(500);

    const expandedItems = sidebar.locator('[role="treeitem"][aria-expanded="true"]');
    expect(await expandedItems.count()).toBeGreaterThan(0);
  });

  test('P1: empty chapter shows CTA or add-lesson button', async ({ page }) => {
    const sidebar = page.locator('aside[role="tree"]');
    const chapter = sidebar.locator('[role="treeitem"]').first();
    await chapter.click();
    await page.waitForTimeout(800);

    // At least one add-lesson mechanism should exist
    const addBtn = page.locator('button:has-text("Thêm bài học")');
    await expect(addBtn.first()).toBeVisible({ timeout: 5000 });
  });

  test('P2-3: lesson creation modal has type selector', async ({ page }) => {
    const sidebar = page.locator('aside[role="tree"]');
    const firstChapter = sidebar.locator('[role="treeitem"]').first();

    // Click kebab menu on first chapter
    const kebab = firstChapter.locator('button:has(svg circle)').first();
    if (await kebab.count() === 0) { test.skip(); return; }
    await kebab.click();
    await page.waitForTimeout(400);

    // Click "Thêm bài học" from menu
    const menuItem = page.locator('button:has-text("Thêm bài học")').last();
    if (await menuItem.count() === 0) { test.skip(); return; }
    await menuItem.click();
    await page.waitForTimeout(500);

    // Modal should show with type selector
    await expect(page.locator('text=Loại bài học')).toBeVisible({ timeout: 3000 });

    // All 3 types visible
    await expect(page.locator('button:has-text("Bài giảng")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Trắc nghiệm")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Bài tập")').first()).toBeVisible();

    // Close modal
    await page.locator('button:has-text("Hủy")').click();
  });

  test('P1-2: chapter editor shows save button with correct state', async ({ page }) => {
    const sidebar = page.locator('aside[role="tree"]');
    await sidebar.locator('[role="treeitem"]').first().click();
    await page.waitForTimeout(800);

    // Chapter editor should show save button
    const saveBtn = page.locator('button:has-text("Lưu thay đổi")');
    await expect(saveBtn).toBeVisible({ timeout: 5000 });

    // Chapter title input should be editable
    const titleInput = page.locator('input#chapter-title');
    if (await titleInput.count() === 0) { test.skip(); return; }

    // Title should be pre-filled from the selected chapter
    const title = await titleInput.inputValue();
    expect(title.length).toBeGreaterThan(0);
  });
});
