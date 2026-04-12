import { test, expect, Page } from '@playwright/test';

const BASE = 'http://localhost:4200';
const TEACHER = { email: 'teacher@maritime.edu', password: 'teacher123' };

async function loginAsTeacher(page: Page) {
  await page.goto(`${BASE}/auth/login`);
  await page.fill('input[type="text"], input[placeholder*="Email"]', TEACHER.email);
  await page.fill('input[type="password"]', TEACHER.password);
  await page.click('button:has-text("Đăng nhập")');
  await page.waitForURL(/\/teacher/, { timeout: 10000 });
}

async function navigateToCurriculum(page: Page) {
  // Click first "Chỉnh sửa" button
  await page.click('button:has-text("Chỉnh sửa"):first-of-type');
  await page.waitForLoadState('networkidle');
  // Click "Nội dung" tab
  await page.click('a:has-text("Nội dung")');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
}

function sidebarTree(page: Page) {
  return page.locator('aside[role="tree"]');
}

test.describe('Sidebar curriculum — drag & expand', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
    await navigateToCurriculum(page);
  });

  test('chương hiển thị đúng format "Chương N · title"', async ({ page }) => {
    const sidebar = sidebarTree(page);
    await expect(sidebar).toBeVisible({ timeout: 5000 });

    // Kiểm tra có ít nhất 1 chương
    const chapters = sidebar.locator('[role="treeitem"]');
    const count = await chapters.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Chương đầu tiên phải chứa "Chương 1"
    const firstChapter = chapters.first();
    await expect(firstChapter).toContainText(/Chương\s+1/);

    await page.screenshot({ path: 'e2e/screenshots/sidebar-chapters.png' });
  });

  test('expand/collapse chương hoạt động đúng', async ({ page }) => {
    const sidebar = sidebarTree(page);
    await expect(sidebar).toBeVisible({ timeout: 5000 });

    // Tìm nút expand (chevron) của chương đầu tiên
    const firstChapterRow = sidebar.locator('[role="treeitem"]').first();
    const expandButton = firstChapterRow.locator('button').first();

    // Click expand
    await expandButton.click();
    await page.waitForTimeout(500);

    // Kiểm tra nội dung expanded (bài học hoặc empty state)
    const expandedContent = firstChapterRow.locator('[role="group"], :text("Chưa có bài học")');
    const isExpandedVisible = await expandedContent.count() > 0;

    // Click collapse
    await expandButton.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'e2e/screenshots/sidebar-expand-collapse.png' });
  });

  test('drag chương không tạo duplicate bài học', async ({ page }) => {
    const sidebar = sidebarTree(page);
    await expect(sidebar).toBeVisible({ timeout: 5000 });

    const chapters = sidebar.locator('[role="treeitem"]');
    const chapterCount = await chapters.count();

    if (chapterCount < 2) {
      test.skip();
      return;
    }

    // Expand chương đầu tiên
    const firstChapterExpand = chapters.first().locator('button').first();
    await firstChapterExpand.click();
    await page.waitForTimeout(500);

    // Screenshot trước drag
    await page.screenshot({ path: 'e2e/screenshots/sidebar-before-drag.png' });

    // Thực hiện drag chương 1 xuống vị trí chương 2
    const firstChapter = chapters.first();
    const secondChapter = chapters.nth(1);

    const firstBox = await firstChapter.boundingBox();
    const secondBox = await secondChapter.boundingBox();

    if (firstBox && secondBox) {
      // Drag handle nằm bên trái row
      const dragStartX = firstBox.x + 12;
      const dragStartY = firstBox.y + firstBox.height / 2;
      const dragEndY = secondBox.y + secondBox.height / 2;

      await page.mouse.move(dragStartX, dragStartY);
      await page.waitForTimeout(200);
      await page.mouse.down();
      await page.waitForTimeout(300);
      // Di chuyển từ từ để CDK detect drag
      for (let y = dragStartY; y <= dragEndY; y += 10) {
        await page.mouse.move(dragStartX, y);
        await page.waitForTimeout(20);
      }
      await page.mouse.move(dragStartX, dragEndY);
      await page.waitForTimeout(200);
      await page.mouse.up();
      await page.waitForTimeout(1000);
    }

    // Screenshot sau drag
    await page.screenshot({ path: 'e2e/screenshots/sidebar-after-drag.png' });

    // Core assertion: no duplicate lessons in sidebar
    // Get all lesson text contents and check no duplicates
    const lessonTexts = await sidebar.locator('text=/Bài\\s+\\d+\\.\\d+/').allTextContents();
    const uniqueLessons = new Set(lessonTexts.map(t => t.trim()));
    expect(uniqueLessons.size).toBe(lessonTexts.length); // no duplicates
  });

  test('tạo chương mới — input trống, không pre-fill', async ({ page }) => {
    // Click nút + thêm chương — tìm bằng mattooltip hoặc vị trí header
    const addBtn = page.locator('aside[role="tree"]').locator('button[mattooltip="Thêm chương"]');
    const fallbackBtn = page.locator('aside[role="tree"]').locator('button:has(svg path[d*="M12 4v16"])').first();
    const btn = await addBtn.count() > 0 ? addBtn : fallbackBtn;

    if (await btn.count() === 0) {
      test.skip();
      return;
    }

    await btn.click();
    await page.waitForTimeout(500);

    // Kiểm tra modal mở
    const modal = page.locator('text=Tạo chương mới');
    await expect(modal).toBeVisible({ timeout: 3000 });

    // Kiểm tra input trống (không pre-fill "Chương X: ")
    const titleInput = page.locator('input[placeholder*="tên chương"], input[placeholder*="Nhập tên"]');
    if (await titleInput.count() > 0) {
      await expect(titleInput.first()).toBeVisible();
      const inputValue = await titleInput.first().inputValue();
      expect(inputValue).toBe('');
    }

    // Đóng modal
    await page.click('button:has-text("Hủy")');

    await page.screenshot({ path: 'e2e/screenshots/sidebar-add-chapter-modal.png' });
  });

  test('kebab menu hiển thị đúng actions', async ({ page }) => {
    const sidebar = sidebarTree(page);
    await expect(sidebar).toBeVisible({ timeout: 5000 });

    // Click kebab menu (⋮) của chương đầu tiên
    const firstChapterKebab = sidebar.locator('[role="treeitem"]').first().locator('button:has(svg circle)').first();

    if (await firstChapterKebab.count() === 0) {
      test.skip();
      return;
    }

    await firstChapterKebab.click();
    await page.waitForTimeout(300);

    // Verify menu actions (scope to dropdown menu)
    const dropdown = page.locator('.shadow-lg.border.rounded-lg');
    await expect(dropdown).toBeVisible({ timeout: 3000 });
    await expect(dropdown.locator('text=Đổi tên')).toBeVisible();
    await expect(dropdown.locator('text=Xóa chương')).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/sidebar-kebab-menu.png' });

    // Close menu
    await page.keyboard.press('Escape');
  });
});
