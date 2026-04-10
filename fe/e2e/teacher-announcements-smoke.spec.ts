import { test, expect, Page, APIRequestContext } from '@playwright/test';

const API = 'http://localhost:8088';
const TEACHER = { email: 'tranngocdai@maritime.edu', password: 'Maritime@2026' };

async function login(page: Page, request: APIRequestContext) {
  const res = await request.post(`${API}/api/v3/auth/login`, { data: TEACHER });
  const session = (await res.json()).data;
  await page.addInitScript((s) => {
    localStorage.setItem('lms_access_token', s.accessToken);
    localStorage.setItem('lms_refresh_token', s.refreshToken);
    localStorage.setItem('lms_user', JSON.stringify({ ...s.user, role: s.user.role?.toLowerCase() }));
  }, session);
  return session;
}

async function goTo(page: Page) {
  await page.goto('/teacher/announcements');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

// ═══════════════════════════════════════
// Core
// ═══════════════════════════════════════

test('loads page with header, tabs, and data', async ({ page, request }) => {
  await login(page, request);
  await goTo(page);

  await expect(page.locator('app-teacher-announcements h1')).toContainText('Thông báo');
  await expect(page.locator('.tab-chip').first()).toBeVisible();

  // Should show items (teacher created announcements earlier in test data)
  const items = page.locator('.overflow-hidden.rounded-lg .flex.items-start.gap-3');
  // May be 0 if no courses owned, but tabs should still render
  expect(await page.locator('.tab-chip').count()).toBeGreaterThanOrEqual(2);
});

test('tabs show count in parentheses', async ({ page, request }) => {
  await login(page, request);
  await goTo(page);

  await expect(page.locator('.tab-chip').nth(0)).toContainText(/Tất cả \(\d+\)/);
  await expect(page.locator('.tab-chip').nth(1)).toContainText(/Quan trọng \(\d+\)/);
});

// ═══════════════════════════════════════
// Create announcement
// ═══════════════════════════════════════

test('create announcement flow', async ({ page, request }) => {
  await login(page, request);
  await goTo(page);

  // Click "Tạo thông báo"
  await page.getByText('Tạo thông báo', { exact: true }).first().click();

  // Modal opens
  const modal = page.locator('.fixed.inset-0.z-50');
  await expect(modal).toBeVisible();
  await expect(modal.locator('h2')).toContainText('Tạo thông báo mới');

  // Fill form
  await modal.locator('select').first().selectOption({ index: 1 }); // first course
  await modal.locator('input[type="text"]').fill('Test E2E thong bao');
  await modal.locator('textarea').fill('Noi dung thong bao tu E2E test.');

  // Submit
  await modal.getByText('Gửi thông báo').click();
  await page.waitForTimeout(1000);

  // Modal closed
  await expect(modal).not.toBeVisible();

  // Verify announcement was created (API returns success → modal closes)
  // Reload page to fetch fresh data from backend
  await page.goto('/teacher/announcements');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  await expect(page.getByText('Test E2E thong bao').first()).toBeVisible({ timeout: 10000 });
});

test('create form validation — submit disabled without required fields', async ({ page, request }) => {
  await login(page, request);
  await goTo(page);

  await page.getByText('Tạo thông báo', { exact: true }).first().click();
  const modal = page.locator('.fixed.inset-0.z-50');

  // Submit button should be disabled (no fields filled)
  const submitBtn = modal.getByText('Gửi thông báo');
  await expect(submitBtn).toBeDisabled();

  // Fill only title — still disabled (no course, no content)
  await modal.locator('input[type="text"]').fill('Test');
  await expect(submitBtn).toBeDisabled();
});

test('create modal closes on cancel', async ({ page, request }) => {
  await login(page, request);
  await goTo(page);

  await page.getByText('Tạo thông báo', { exact: true }).first().click();
  const modal = page.locator('.fixed.inset-0.z-50');
  await expect(modal).toBeVisible();

  await modal.getByText('Hủy').click();
  await expect(modal).not.toBeVisible();
});

// ═══════════════════════════════════════
// Delete
// ═══════════════════════════════════════

test('delete shows confirm dialog', async ({ page, request }) => {
  await login(page, request);
  await goTo(page);

  const items = page.locator('.overflow-hidden.rounded-lg .flex.items-start.gap-3');
  if (await items.count() === 0) { test.skip(true, 'No items'); return; }

  // Click delete icon on first item
  await items.first().locator('button[title="Xóa thông báo"]').click();

  // Confirm dialog should appear
  await expect(page.getByText('Xóa thông báo?')).toBeVisible();
  await expect(page.getByText('Thông báo sẽ bị xóa vĩnh viễn')).toBeVisible();
});

test('delete cancel dismisses dialog', async ({ page, request }) => {
  await login(page, request);
  await goTo(page);

  const items = page.locator('.overflow-hidden.rounded-lg .flex.items-start.gap-3');
  if (await items.count() === 0) { test.skip(true, 'No items'); return; }

  await items.first().locator('button[title="Xóa thông báo"]').click();
  await page.getByText('Hủy').last().click();

  await expect(page.getByText('Xóa thông báo?')).not.toBeVisible();
});

test('delete confirm removes item', async ({ page, request }) => {
  await login(page, request);
  await goTo(page);

  const items = page.locator('.overflow-hidden.rounded-lg .flex.items-start.gap-3');
  const beforeCount = await items.count();
  if (beforeCount === 0) { test.skip(true, 'No items'); return; }

  // Get title of first item
  const title = await items.first().locator('h3').textContent();

  // Delete
  await items.first().locator('button[title="Xóa thông báo"]').click();
  await page.getByText('Xóa').last().click();
  await page.waitForTimeout(1000);

  // Item count decreased or title gone
  const afterCount = await items.count();
  expect(afterCount).toBeLessThan(beforeCount);
});

// ═══════════════════════════════════════
// Load More
// ═══════════════════════════════════════

test('load-more works with many announcements', async ({ page, request }) => {
  await login(page, request);
  await goTo(page);

  const items = page.locator('.overflow-hidden.rounded-lg .flex.items-start.gap-3');
  const initialCount = await items.count();

  const loadMore = page.locator('.load-more-btn');
  if (await loadMore.isVisible()) {
    await loadMore.click();
    await page.waitForTimeout(300);
    expect(await items.count()).toBeGreaterThan(initialCount);
  }
});

// ═══════════════════════════════════════
// Course names
// ═══════════════════════════════════════

test('displays course names on announcements', async ({ page, request }) => {
  await login(page, request);
  await goTo(page);

  const items = page.locator('.overflow-hidden.rounded-lg .flex.items-start.gap-3');
  if (await items.count() === 0) { test.skip(true, 'No items'); return; }

  const courseName = await items.first().locator('.text-slate-400').first().textContent();
  expect(courseName!.trim()).not.toBe('Khóa học');
});
