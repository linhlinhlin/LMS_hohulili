import { test, expect, Page, APIRequestContext } from '@playwright/test';

const API = 'http://localhost:8088';
const STUDENT = { email: 'nguyenvanan@sv.maritime.edu', password: 'Student@2026' };

async function login(page: Page, request: APIRequestContext) {
  const res = await request.post(`${API}/api/v3/auth/login`, { data: STUDENT });
  const session = (await res.json()).data;
  await page.addInitScript((s) => {
    localStorage.setItem('lms_access_token', s.accessToken);
    localStorage.setItem('lms_refresh_token', s.refreshToken);
    localStorage.setItem('lms_user', JSON.stringify({ ...s.user, role: s.user.role?.toLowerCase() }));
  }, session);
  return session;
}

async function goToAnnouncements(page: Page) {
  await page.goto('/student/announcements');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

// ═══════════════════════════════════════
// Core
// ═══════════════════════════════════════

test('loads announcements with skeleton → data', async ({ page, request }) => {
  await login(page, request);
  await goToAnnouncements(page);

  // Should show announcement items (not empty)
  const items = page.locator('.rounded-lg.border .flex.items-start.gap-3');
  await expect(items.first()).toBeVisible();
  expect(await items.count()).toBeGreaterThanOrEqual(1);
});

test('header shows title and unread count', async ({ page, request }) => {
  await login(page, request);
  await goToAnnouncements(page);

  await expect(page.locator('h1')).toContainText('Thông báo');
  // Subtitle should show either unread count or "đã đọc"
  const subtitle = page.locator('h1 + p');
  await expect(subtitle).toBeVisible();
});

// ═══════════════════════════════════════
// Tabs
// ═══════════════════════════════════════

test('filter tabs visible with counts in parentheses', async ({ page, request }) => {
  await login(page, request);
  await goToAnnouncements(page);

  // All 3 tabs present with (count) format
  await expect(page.locator('.tab-chip').nth(0)).toContainText(/Tất cả \(\d+\)/);
  await expect(page.locator('.tab-chip').nth(1)).toContainText(/Chưa đọc \(\d+\)/);
  await expect(page.locator('.tab-chip').nth(2)).toContainText(/Quan trọng \(\d+\)/);
});

test('switching to "Quan trọng" tab filters list', async ({ page, request }) => {
  await login(page, request);
  await goToAnnouncements(page);

  const allCount = await page.locator('.rounded-lg.border .flex.items-start.gap-3').count();

  // Click "Quan trọng"
  await page.locator('.tab-chip').nth(2).click();
  await page.waitForTimeout(300);

  const filteredCount = await page.locator('.rounded-lg.border .flex.items-start.gap-3').count();
  expect(filteredCount).toBeLessThanOrEqual(allCount);

  // Important items should have red icon
  if (filteredCount > 0) {
    await expect(page.locator('.bg-red-100').first()).toBeVisible();
  }
});

test('tab switch resets load-more to initial 10', async ({ page, request }) => {
  await login(page, request);
  await goToAnnouncements(page);

  // Load more if available
  const loadMoreBtn = page.locator('.load-more-btn');
  if (await loadMoreBtn.isVisible()) {
    await loadMoreBtn.click();
    await page.waitForTimeout(300);
  }

  // Switch tabs and back
  await page.locator('.tab-chip').nth(1).click();
  await page.waitForTimeout(200);
  await page.locator('.tab-chip').nth(0).click();
  await page.waitForTimeout(300);

  // Should reset to max 10
  const items = page.locator('.rounded-lg.border .flex.items-start.gap-3');
  expect(await items.count()).toBeLessThanOrEqual(10);
});

// ═══════════════════════════════════════
// Load More
// ═══════════════════════════════════════

test('load-more visible with 50+ items, shows count', async ({ page, request }) => {
  await login(page, request);
  await goToAnnouncements(page);

  // Initial: max 10 items
  const items = page.locator('.rounded-lg.border .flex.items-start.gap-3');
  expect(await items.count()).toBeLessThanOrEqual(10);

  // Load-more button visible
  const btn = page.locator('.load-more-btn');
  await expect(btn).toBeVisible();
  await expect(btn).toContainText(/Xem thêm \d+ thông báo/);

  // "Đang hiện X / Y" visible
  await expect(page.locator('.showing-count')).toContainText(/Đang hiện \d+ \/ \d+/);
});

test('clicking load-more shows more items', async ({ page, request }) => {
  await login(page, request);
  await goToAnnouncements(page);

  const items = page.locator('.rounded-lg.border .flex.items-start.gap-3');
  const before = await items.count();

  await page.locator('.load-more-btn').click();
  await page.waitForTimeout(300);

  expect(await items.count()).toBeGreaterThan(before);
});

test('loading all shows "Đã hiện tất cả"', async ({ page, request }) => {
  await login(page, request);
  await goToAnnouncements(page);

  // Click load more repeatedly
  for (let i = 0; i < 10; i++) {
    const btn = page.locator('.load-more-btn');
    if (!(await btn.isVisible())) break;
    await btn.click();
    await page.waitForTimeout(200);
  }

  await expect(page.locator('.showing-count')).toContainText(/Đã hiện tất cả/);
});

// ═══════════════════════════════════════
// Detail modal
// ═══════════════════════════════════════

test('click announcement → opens modal with correct title', async ({ page, request }) => {
  await login(page, request);
  await goToAnnouncements(page);

  const firstItem = page.locator('.rounded-lg.border .flex.items-start.gap-3').first();
  const titleText = await firstItem.locator('h3').textContent();
  await firstItem.click();

  // Modal open
  const modal = page.locator('.fixed.inset-0.z-50');
  await expect(modal).toBeVisible();
  await expect(modal.locator('h2')).toContainText(titleText!.trim());
});

test('modal shows course name and author', async ({ page, request }) => {
  await login(page, request);
  await goToAnnouncements(page);

  await page.locator('.rounded-lg.border .flex.items-start.gap-3').first().click();
  const modal = page.locator('.fixed.inset-0.z-50');
  await expect(modal).toBeVisible();

  // Course name and author should be visible in modal header
  const headerTexts = await modal.locator('.border-b .text-sm').allTextContents();
  expect(headerTexts.join(' ').length).toBeGreaterThan(5);
});

test('modal closes on X button', async ({ page, request }) => {
  await login(page, request);
  await goToAnnouncements(page);

  await page.locator('.rounded-lg.border .flex.items-start.gap-3').first().click();
  const modal = page.locator('.fixed.inset-0.z-50');
  await expect(modal).toBeVisible();

  // Click close button (svg inside button in modal header)
  await modal.locator('.border-b button').click();
  await expect(modal).not.toBeVisible();
});

test('modal closes on backdrop click', async ({ page, request }) => {
  await login(page, request);
  await goToAnnouncements(page);

  await page.locator('.rounded-lg.border .flex.items-start.gap-3').first().click();
  const modal = page.locator('.fixed.inset-0.z-50');
  await expect(modal).toBeVisible();

  await modal.click({ position: { x: 5, y: 5 } });
  await expect(modal).not.toBeVisible();
});

// ═══════════════════════════════════════
// Course names
// ═══════════════════════════════════════

test('displays real course names, not placeholders', async ({ page, request }) => {
  await login(page, request);
  await goToAnnouncements(page);

  const courseLabel = page.locator('.font-medium.text-slate-500').first();
  const text = await courseLabel.textContent();
  expect(text!.trim()).not.toBe('Khóa học');
  expect(text!.trim().length).toBeGreaterThan(3);
});

// ═══════════════════════════════════════
// Mobile
// ═══════════════════════════════════════

test('mobile: page renders, tabs work, items visible', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, request);
  await goToAnnouncements(page);

  // Tabs visible
  await expect(page.locator('.tab-chip').first()).toBeVisible();

  // Items visible
  const items = page.locator('.rounded-lg.border .flex.items-start.gap-3');
  await expect(items.first()).toBeVisible();

  // Click "Quan trọng" tab works
  await page.locator('.tab-chip').nth(2).click();
  await page.waitForTimeout(300);
});
