import { test, expect, Page, APIRequestContext } from '@playwright/test';

const API = 'http://localhost:8088';
const STUDENT = { email: 'nguyenvanan@sv.maritime.edu', password: 'Student@2026' };

async function loginAndSeed(page: Page, request: APIRequestContext) {
  const res = await request.post(`${API}/api/v3/auth/login`, { data: STUDENT });
  const payload = await res.json();
  expect(payload?.success, 'Login failed').toBeTruthy();
  const session = payload.data;

  await page.addInitScript(({ accessToken, refreshToken, user }) => {
    localStorage.setItem('lms_access_token', accessToken);
    localStorage.setItem('lms_refresh_token', refreshToken);
    localStorage.setItem('lms_user', JSON.stringify({ ...user, role: user.role?.toLowerCase() }));
  }, session);

  return session;
}

async function getFirstConversationId(request: APIRequestContext, token: string): Promise<string | null> {
  const res = await request.get(`${API}/api/v3/messages/conversations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data?.data?.[0]?.id ?? null;
}

// ═══════════════════════════════════════════════════
// Desktop (default viewport from playwright.config)
// ═══════════════════════════════════════════════════

test('desktop: conversation shows sidebar + chat + input visible', async ({ page, request }) => {
  const session = await loginAndSeed(page, request);
  const token = (session as any).accessToken;
  const convId = await getFirstConversationId(request, token);
  if (!convId) { test.skip(true, 'No conversations'); return; }

  await page.goto(`/student/messages/${convId}`);
  await page.waitForLoadState('networkidle');

  // Conversation sidebar visible on desktop
  await expect(page.locator('app-conversation-sidebar')).toBeVisible();

  // Input always visible
  const input = page.locator('app-message-input textarea');
  await expect(input).toBeVisible();
  await expect(input).toBeInViewport();
});

test('desktop: input stays visible after scrolling', async ({ page, request }) => {
  const session = await loginAndSeed(page, request);
  const token = (session as any).accessToken;
  const convId = await getFirstConversationId(request, token);
  if (!convId) { test.skip(true, 'No conversations'); return; }

  await page.goto(`/student/messages/${convId}`);
  await page.waitForLoadState('networkidle');

  // Scroll up
  const msgArea = page.locator('[class*="overflow-y-auto"]').first();
  await msgArea.evaluate((el) => el.scrollTo(0, 0));
  await page.waitForTimeout(300);

  const input = page.locator('app-message-input textarea');
  await expect(input).toBeInViewport();
});

// ═══════════════════════════════════════════════════
// Mobile (resize viewport)
// ═══════════════════════════════════════════════════

test('mobile: conversation input visible, not clipped', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14

  const session = await loginAndSeed(page, request);
  const token = (session as any).accessToken;
  const convId = await getFirstConversationId(request, token);
  if (!convId) { test.skip(true, 'No conversations'); return; }

  await page.goto(`/student/messages/${convId}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Input must be visible and in viewport
  const input = page.locator('app-message-input textarea');
  await expect(input).toBeVisible();
  await expect(input).toBeInViewport();

  // Bounding box check — not clipped by viewport
  const box = await input.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    const vp = page.viewportSize()!;
    expect(box.y + box.height).toBeLessThanOrEqual(vp.height + 2);
    expect(box.y).toBeGreaterThanOrEqual(0);
  }
});

test('mobile: back button visible, bottom nav hidden', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  const session = await loginAndSeed(page, request);
  const token = (session as any).accessToken;
  const convId = await getFirstConversationId(request, token);
  if (!convId) { test.skip(true, 'No conversations'); return; }

  await page.goto(`/student/messages/${convId}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Back button visible
  await expect(page.locator('button[aria-label="Quay lại"]')).toBeVisible();

  // Bottom nav should be hidden (opacity 0 or translate off-screen)
  const nav = page.locator('nav.mobile-bottom-nav');
  if (await nav.count() > 0) {
    const opacity = await nav.evaluate((el) => getComputedStyle(el).opacity);
    expect(Number(opacity)).toBeLessThanOrEqual(0.1);
  }
});

test('mobile: back returns to inbox, bottom nav restored', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  const session = await loginAndSeed(page, request);
  const token = (session as any).accessToken;
  const convId = await getFirstConversationId(request, token);
  if (!convId) { test.skip(true, 'No conversations'); return; }

  await page.goto(`/student/messages/${convId}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Go back
  await page.locator('button[aria-label="Quay lại"]').click();
  await page.waitForURL('**/student/messages');
  await page.waitForTimeout(500);

  // Bottom nav should be visible again
  const nav = page.locator('nav.mobile-bottom-nav');
  if (await nav.count() > 0) {
    const opacity = await nav.evaluate((el) => getComputedStyle(el).opacity);
    expect(Number(opacity)).toBeGreaterThan(0.5);
  }
});

// ═══════════════════════════════════════════════════
// Tablet
// ═══════════════════════════════════════════════════

test('tablet: conversation input visible', async ({ page, request }) => {
  await page.setViewportSize({ width: 768, height: 1024 }); // iPad

  const session = await loginAndSeed(page, request);
  const token = (session as any).accessToken;
  const convId = await getFirstConversationId(request, token);
  if (!convId) { test.skip(true, 'No conversations'); return; }

  await page.goto(`/student/messages/${convId}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  const input = page.locator('app-message-input textarea');
  await expect(input).toBeVisible();
  await expect(input).toBeInViewport();

  const box = await input.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    const vp = page.viewportSize()!;
    expect(box.y + box.height).toBeLessThanOrEqual(vp.height + 2);
  }
});
