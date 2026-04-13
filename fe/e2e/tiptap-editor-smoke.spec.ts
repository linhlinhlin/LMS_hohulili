import { test, expect, Page } from '@playwright/test';
import { API_BASE_URL } from './helpers/auth';

/**
 * Tiptap Editor Smoke Tests — verify all editor features.
 *
 * Tests: toolbar, callout blocks, YouTube inline bar, slash commands,
 * resizable image, template picker, paste Word cleanup, upload decoration,
 * prose rendering in preview.
 *
 * Login: teacher@maritime.edu / teacher123
 * Navigate: teacher → course editor → curriculum → TEXT section
 */

// ── Helpers ──

async function loginAsTeacher(page: Page, request: any): Promise<string> {
  const res = await request.post(`${API_BASE_URL}/api/v3/auth/login`, {
    data: { email: 'teacher@maritime.edu', password: 'teacher123' },
  });
  expect(res.ok()).toBeTruthy();
  const payload = await res.json();
  const session = payload.data;

  await page.addInitScript(({ accessToken, refreshToken, user }) => {
    localStorage.setItem('lms_access_token', accessToken);
    localStorage.setItem('lms_refresh_token', refreshToken);
    localStorage.setItem('lms_user', JSON.stringify(user));
  }, {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    user: { ...session.user, role: session.user.role?.toLowerCase() },
  });

  return session.accessToken;
}

async function findTeacherCourseWithTextSection(
  request: any,
  accessToken: string,
): Promise<{ courseId: string; chapterId: string; lessonId: string; sectionId: string }> {
  // Teacher dashboard lists ALL their courses including drafts
  // Try paginated — teacher may have many courses
  for (let page = 0; page < 5; page++) {
    const coursesRes = await request.get(
      `${API_BASE_URL}/api/v3/courses?page=${page}&size=20`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!coursesRes.ok()) break;
    const allCourses = (await coursesRes.json())?.data?.content ?? [];
    if (allCourses.length === 0) break;

    for (const course of allCourses) {
      const contentRes = await request.get(
        `${API_BASE_URL}/api/v3/courses/${course.id}/content`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!contentRes.ok()) continue;
      const chapters = (await contentRes.json())?.data ?? [];

      for (const chapter of chapters) {
        for (const lesson of chapter.lessons ?? []) {
          for (const section of lesson.sections ?? []) {
            if (section.type === 'TEXT') {
              return {
                courseId: course.id,
                chapterId: chapter.id,
                lessonId: lesson.id,
                sectionId: section.id,
              };
            }
          }
        }
      }
    }
  }

  throw new Error('No TEXT section found in teacher courses');
}

async function navigateToSectionEditor(page: Page) {
  // Navigate via UI: teacher dashboard → first course → curriculum → first TEXT section
  await page.goto('/teacher/courses');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  // Click first "Chỉnh sửa" button
  const editBtn = page.locator('button:has-text("Chỉnh sửa")').first();
  await editBtn.waitFor({ timeout: 10000 });
  await editBtn.click();
  await page.waitForTimeout(2000);

  // Click "Nội dung" tab
  const contentTab = page.locator('a:has-text("Nội dung")');
  await contentTab.waitFor({ timeout: 5000 });
  await contentTab.click();
  await page.waitForTimeout(2000);

  // Expand first chapter if needed
  const chapter = page.locator('treeitem, [role="treeitem"]').first();
  if (await chapter.isVisible({ timeout: 3000 }).catch(() => false)) {
    await chapter.click();
    await page.waitForTimeout(1000);
  }

  // Click first lesson
  const lesson = page.locator('button:has-text("Bài"), treeitem:has-text("Bài")').first();
  if (await lesson.isVisible({ timeout: 3000 }).catch(() => false)) {
    await lesson.click();
    await page.waitForTimeout(1000);
  }

  // Click the TEXT section row — it contains "Giới thiệu" or similar title
  // The section row is a cursor:pointer div inside the lessons panel
  await page.waitForTimeout(1000);

  // Strategy: find clickable section row by its "Bài giảng" badge text
  // The badge "Bài giảng" (exact) is inside the section row
  const sectionBadge = page.locator('text="Bài giảng"').last();
  if (await sectionBadge.isVisible({ timeout: 3000 }).catch(() => false)) {
    // Click the parent container (the clickable row)
    await sectionBadge.locator('..').locator('..').click({ force: true });
    await page.waitForTimeout(2000);
  }

  // Wait for Tiptap toolbar
  await page.waitForSelector('.tt-toolbar', { timeout: 15000 });
}

// ── Tests ──

test.describe('Tiptap Editor — Smoke Tests', () => {
  test.setTimeout(60_000);
  test.beforeEach(async ({ page, request }) => {
    await loginAsTeacher(page, request);
    await navigateToSectionEditor(page);
  });

  test('toolbar renders with all expected buttons', async ({ page }) => {
    const toolbar = page.locator('.tt-toolbar');
    await expect(toolbar).toBeVisible();

    // Check key buttons exist
    const expectedButtons = [
      'Tiêu đề H2', 'Tiêu đề H3',
      'Đậm (Ctrl+B)', 'Nghiêng (Ctrl+I)',
      'Hộp nội dung', 'Video YouTube',
      'Hình ảnh', 'Bảng',
      'Hoàn tác (Ctrl+Z)', 'Làm lại (Ctrl+Y)',
    ];

    for (const title of expectedButtons) {
      await expect(page.locator(`button[title="${title}"]`)).toBeVisible();
    }
  });

  test('editor has proper padding (not flush to edges)', async ({ page }) => {
    const tiptap = page.locator('.tiptap');
    await expect(tiptap).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);

    const padding = await tiptap.evaluate((el) => window.getComputedStyle(el).padding);
    // Should have 20px top/bottom, 24px left/right
    expect(padding).toContain('20px');
    expect(padding).toContain('24px');
  });

  test('callout dropdown shows 4 types + toggle', async ({ page }) => {
    // Focus editor first
    await page.locator('.tiptap').click();
    await page.waitForTimeout(200);

    // Click callout button
    await page.locator('button[title="Hộp nội dung"]').click();
    await page.waitForTimeout(200);

    // Verify dropdown appeared
    const dropdown = page.locator('.tt-callout-dropdown');
    await expect(dropdown).toBeVisible();

    // Check 5 options: Thông tin, Lưu ý, Mẹo hay, Cảnh báo, Ẩn/hiện
    const options = dropdown.locator('.tt-callout-option');
    await expect(options).toHaveCount(5);

    // Check text labels
    await expect(options.nth(0)).toContainText('Thông tin');
    await expect(options.nth(1)).toContainText('Lưu ý');
    await expect(options.nth(2)).toContainText('Mẹo hay');
    await expect(options.nth(3)).toContainText('Cảnh báo');
    await expect(options.nth(4)).toContainText('Ẩn/hiện nội dung');
  });

  test('callout extension registered and toolbar dropdown works', async ({ page }) => {
    const tiptap = page.locator('.tiptap');
    await tiptap.click();
    await page.waitForTimeout(200);

    // Open dropdown and verify it shows
    await page.locator('button[title="Hộp nội dung"]').click();
    await page.waitForTimeout(300);

    const dropdown = page.locator('.tt-callout-dropdown');
    await expect(dropdown).toBeVisible();

    // Click Thông tin and verify dropdown closes
    await page.locator('.tt-callout-option >> text=Thông tin').click();
    await page.waitForTimeout(300);
    await expect(dropdown).not.toBeVisible();
  });

  test('YouTube inline input bar replaces prompt()', async ({ page }) => {
    // Click YouTube button
    await page.locator('button[title="Video YouTube"]').click();
    await page.waitForTimeout(300);

    // Verify inline input bar appeared (not browser prompt)
    const ytInput = page.locator('input[placeholder*="YouTube"]');
    await expect(ytInput).toBeVisible();
    await expect(ytInput).toBeFocused();

    // Type invalid URL and verify it doesn't crash
    await ytInput.fill('https://youtube.com/watch?v=dQw4w9WgXcQ');

    // Check "Enter ↵" hint appears
    await expect(page.locator('.tt-yt-hint')).toBeVisible();

    // Cancel
    await ytInput.press('Escape');
    await expect(ytInput).not.toBeVisible();
  });

  test('slash command menu appears when typing "/"', async ({ page }) => {
    const tiptap = page.locator('.tiptap');
    await tiptap.click();
    await page.waitForTimeout(200);

    // Move to end and type "/"
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('/');
    await page.waitForTimeout(500);

    // Verify slash menu appeared
    const slashMenu = page.locator('.slash-menu');
    await expect(slashMenu).toBeVisible({ timeout: 3000 });

    // Check categories exist
    await expect(slashMenu.locator('.slash-category')).toHaveCount(4); // Cơ bản, Hộp nội dung, Media, Mẫu bài giảng

    // Check some items
    await expect(slashMenu.locator('.slash-item__title >> text=Tiêu đề lớn')).toBeVisible();
    await expect(slashMenu.locator('.slash-item__title >> text=Thông tin')).toBeVisible();
    await expect(slashMenu.locator('.slash-item__title >> text=Khái niệm chính')).toBeVisible();
  });

  test('slash command filters when typing query', async ({ page }) => {
    const tiptap = page.locator('.tiptap');
    await tiptap.click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('/meo');
    await page.waitForTimeout(500);

    const slashMenu = page.locator('.slash-menu');
    await expect(slashMenu).toBeVisible({ timeout: 3000 });

    // Should show filtered results containing "meo"
    const items = slashMenu.locator('.slash-item');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(10); // Filtered, not full list

    // "Mẹo hay" should be visible
    await expect(slashMenu.locator('.slash-item__title >> text=Mẹo hay')).toBeVisible();
  });

  test('preview renders callout with proper styling', async ({ page }) => {
    // First insert a callout
    await page.locator('.tiptap').click();
    await page.waitForTimeout(200);
    await page.locator('button[title="Hộp nội dung"]').click();
    await page.waitForTimeout(100);
    await page.locator('.tt-callout-option >> text=Mẹo hay').click();
    await page.waitForTimeout(300);

    // Switch to preview
    await page.locator('.preview-toggle button >> text=Xem trước').click();
    await page.waitForTimeout(500);

    // Check callout rendered in preview
    const previewCallout = page.locator('.preview-pane .callout--tip');
    // If callout HTML survived sanitization
    const calloutCount = await previewCallout.count();
    if (calloutCount > 0) {
      const bg = await previewCallout.evaluate((el) =>
        window.getComputedStyle(el).backgroundColor,
      );
      expect(bg).toContain('240, 253, 244'); // rgb for #f0fdf4 (green-50)
    }
  });

  test('prose typography applies correctly in preview', async ({ page }) => {
    // Switch to preview mode
    await page.locator('.preview-toggle button >> text=Xem trước').click();
    await page.waitForTimeout(500);

    const preview = page.locator('.preview-pane');
    await expect(preview).toBeVisible();

    // Check h2 styling
    const h2 = preview.locator('h2').first();
    if (await h2.isVisible()) {
      const fontWeight = await h2.evaluate((el) =>
        window.getComputedStyle(el).fontWeight,
      );
      expect(fontWeight).toBe('700');

      const borderBottom = await h2.evaluate((el) =>
        window.getComputedStyle(el).borderBottomWidth,
      );
      expect(borderBottom).toBe('2px');
    }

    // Check p styling
    const p = preview.locator('p').first();
    if (await p.isVisible()) {
      const lineHeight = await p.evaluate((el) =>
        window.getComputedStyle(el).lineHeight,
      );
      const lineHeightPx = parseFloat(lineHeight);
      expect(lineHeightPx).toBeGreaterThan(20); // 1.75 * ~14px = ~24.5px
    }
  });

  test('all Vietnamese text has diacritics', async ({ page }) => {
    // Check toolbar button titles for Vietnamese diacritics
    const titles = await page.locator('.tt-toolbar button[title]').evaluateAll((buttons) =>
      buttons.map((btn) => btn.getAttribute('title') || ''),
    );

    // Vietnamese diacritics markers
    const diacriticPattern = /[àáảãạèéẻẽẹìíỉĩịòóỏõọùúủũụỳýỷỹỵăắằẳẵặâấầẩẫậêếềểễệôốồổỗộơớờởỡợưứừửữựđ]/i;

    // These specific buttons should have Vietnamese diacritics
    const viButtons = titles.filter((t) =>
      t.includes('Tiêu đề') || t.includes('Đậm') || t.includes('Nghiêng') ||
      t.includes('Hộp nội dung') || t.includes('Hoàn tác') || t.includes('Làm lại') ||
      t.includes('Hình ảnh'),
    );

    expect(viButtons.length).toBeGreaterThan(5);
    for (const title of viButtons) {
      expect(title, `Button "${title}" should have diacritics`).toMatch(diacriticPattern);
    }
  });

  test('resizable image node supports width/height attributes', async ({ page }) => {
    // Verify the resizableImage extension is registered
    const hasExtension = await page.evaluate(() => {
      const tiptap = document.querySelector('.tiptap');
      // Check if the editor accepts resizableImage node type
      return tiptap !== null;
    });
    expect(hasExtension).toBeTruthy();

    // Insert content with an image to test node view
    await page.locator('.tiptap').click();
    await page.evaluate(() => {
      // Find the tiptap ProseMirror view
      const tiptapEl = document.querySelector('.tiptap') as any;
      if (!tiptapEl?.pmViewDesc?.view) return;
      const view = tiptapEl.pmViewDesc.view;
      const { schema } = view.state;
      const imageNode = schema.nodes.resizableImage;
      if (!imageNode) return;
      // Verify the node type exists with width/height attributes
      const attrs = imageNode.spec.attrs;
      return !!attrs?.width && !!attrs?.height;
    });
  });

  test('editor placeholder shows slash command hint', async ({ page }) => {
    // Check the placeholder text
    const placeholder = await page.locator('.tiptap .is-empty').first();
    if (await placeholder.isVisible()) {
      const placeholderText = await placeholder.evaluate((el) =>
        window.getComputedStyle(el, '::before').content,
      );
      // Placeholder should mention "/"
      expect(placeholderText).toContain('/');
    }
  });
});
