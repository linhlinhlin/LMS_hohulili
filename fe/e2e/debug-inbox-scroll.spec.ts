import { test, expect, Page, APIRequestContext } from '@playwright/test';
const API = 'http://localhost:8088';
async function login(page: Page, request: APIRequestContext) {
  const res = await request.post(`${API}/api/v3/auth/login`, { data: { email: 'nguyenvanan@sv.maritime.edu', password: 'Student@2026' } });
  const session = (await res.json()).data;
  await page.addInitScript((s) => { localStorage.setItem('lms_access_token', s.accessToken); localStorage.setItem('lms_refresh_token', s.refreshToken); localStorage.setItem('lms_user', JSON.stringify({...s.user, role: s.user.role?.toLowerCase()})); }, session);
}
test('mobile inbox: sticky header check', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, request);
  await page.goto('/student/messages');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  // Screenshot before scroll
  await page.screenshot({ path: 'e2e-screenshots/inbox-mobile-top.png' });
  
  // Check sticky header position
  const stickyHeader = page.locator('.sticky.top-0').first();
  const info = await stickyHeader.evaluate(el => {
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return { position: cs.position, top: cs.top, rectTop: rect.top, rectHeight: rect.height };
  });
  console.log('Sticky header:', JSON.stringify(info));
  
  // Check scroll container
  const scrollInfo = await page.evaluate(() => {
    // Find the <main> with overflow-auto
    const mains = document.querySelectorAll('main');
    for (const m of mains) {
      const cs = getComputedStyle(m);
      if (cs.overflow === 'auto' || cs.overflowY === 'auto') {
        return { tag: 'main', overflow: cs.overflow, scrollHeight: m.scrollHeight, clientHeight: m.clientHeight, canScroll: m.scrollHeight > m.clientHeight };
      }
    }
    return { tag: 'none', overflow: 'none', scrollHeight: 0, clientHeight: 0, canScroll: false };
  });
  console.log('Scroll container:', JSON.stringify(scrollInfo));
});
