import { test, expect, Page, APIRequestContext } from '@playwright/test';

const API = 'http://localhost:8088';
const STUDENT = { email: 'nguyenvanan@sv.maritime.edu', password: 'Student@2026' };

async function loginAndSeed(page: Page, request: APIRequestContext) {
  const res = await request.post(`${API}/api/v3/auth/login`, { data: STUDENT });
  const payload = await res.json();
  const session = payload.data;
  await page.addInitScript(({ accessToken, refreshToken, user }) => {
    localStorage.setItem('lms_access_token', accessToken);
    localStorage.setItem('lms_refresh_token', refreshToken);
    localStorage.setItem('lms_user', JSON.stringify({ ...user, role: user.role?.toLowerCase() }));
  }, session);
  return session;
}

async function getFirstConversationId(request: APIRequestContext, token: string) {
  const res = await request.get(`${API}/api/v3/messages/conversations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data?.data?.[0]?.id ?? null;
}

test('screenshot: desktop conversation', async ({ page, request }) => {
  const session = await loginAndSeed(page, request);
  const convId = await getFirstConversationId(request, session.accessToken);
  if (!convId) { test.skip(true, 'No conv'); return; }

  await page.goto(`/student/messages/${convId}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'e2e-screenshots/desktop-chat.png', fullPage: false });
});

test('screenshot: mobile conversation', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const session = await loginAndSeed(page, request);
  const convId = await getFirstConversationId(request, session.accessToken);
  if (!convId) { test.skip(true, 'No conv'); return; }

  await page.goto(`/student/messages/${convId}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'e2e-screenshots/mobile-chat.png', fullPage: false });
});

test('screenshot: tablet conversation', async ({ page, request }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  const session = await loginAndSeed(page, request);
  const convId = await getFirstConversationId(request, session.accessToken);
  if (!convId) { test.skip(true, 'No conv'); return; }

  await page.goto(`/student/messages/${convId}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'e2e-screenshots/tablet-chat.png', fullPage: false });
});
