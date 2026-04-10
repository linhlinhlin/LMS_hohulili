import { test, expect, Page, APIRequestContext } from '@playwright/test';
const API = 'http://localhost:8088';
async function login(page: Page, request: APIRequestContext) {
  const res = await request.post(`${API}/api/v3/auth/login`, { data: { email: 'nguyenvanan@sv.maritime.edu', password: 'Student@2026' } });
  const session = (await res.json()).data;
  await page.addInitScript((s) => { localStorage.setItem('lms_access_token', s.accessToken); localStorage.setItem('lms_refresh_token', s.refreshToken); localStorage.setItem('lms_user', JSON.stringify({...s.user, role: s.user.role?.toLowerCase()})); }, session);
  return session;
}
test('debug: check portal sidebar on desktop conversation', async ({ page, request }) => {
  const session = await login(page, request);
  const convRes = await request.get(`${API}/api/v3/messages/conversations`, { headers: { Authorization: `Bearer ${session.accessToken}` } });
  const convId = (await convRes.json())?.data?.[0]?.id;
  if (!convId) { test.skip(); return; }
  
  await page.goto(`/student/messages/${convId}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  // Check portal sidebar
  const portalSidebar = page.locator('app-sidebar');
  const count = await portalSidebar.count();
  console.log('Portal sidebar count:', count);
  
  // Check content wrapper padding
  const wrapper = page.locator('[class*="md:pl-"]').first();
  const wrapperCount = await wrapper.count();
  console.log('Wrapper with pl- count:', wrapperCount);
  if (wrapperCount > 0) {
    const pl = await wrapper.evaluate(el => getComputedStyle(el).paddingLeft);
    console.log('Padding-left:', pl);
  }
  
  // Check shouldHideSidebar
  const sidebarHiddenInLS = await page.evaluate(() => localStorage.getItem('student_sidebar_hidden'));
  console.log('student_sidebar_hidden in LS:', sidebarHiddenInLS);
  
  await page.screenshot({ path: 'e2e-screenshots/debug-desktop.png' });
});
