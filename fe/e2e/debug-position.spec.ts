import { test } from '@playwright/test';
const API = 'http://localhost:8088';
test('debug desktop input position', async ({ page, request }) => {
  const res = await request.post(`${API}/api/v3/auth/login`, { data: { email: 'nguyenvanan@sv.maritime.edu', password: 'Student@2026' } });
  const session = (await res.json()).data;
  await page.addInitScript((s) => { localStorage.setItem('lms_access_token', s.accessToken); localStorage.setItem('lms_refresh_token', s.refreshToken); localStorage.setItem('lms_user', JSON.stringify({...s.user, role: s.user.role?.toLowerCase()})); }, session);
  const convRes = await request.get(`${API}/api/v3/messages/conversations`, { headers: { Authorization: `Bearer ${session.accessToken}` } });
  const convId = (await convRes.json())?.data?.[0]?.id;
  await page.goto(`/student/messages/${convId}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => {
    const input = document.querySelector('app-message-input textarea');
    const layout = document.querySelector('.messages-layout');
    const host = document.querySelector('app-messages-layout');
    const main = host?.parentElement;
    return {
      viewport: { w: window.innerWidth, h: window.innerHeight },
      input: input ? { top: input.getBoundingClientRect().top, bottom: input.getBoundingClientRect().bottom } : null,
      layout: layout ? { pos: getComputedStyle(layout).position, h: layout.getBoundingClientRect().height } : null,
      host: host ? { h: host.getBoundingClientRect().height, display: getComputedStyle(host).display } : null,
      main: main ? { h: main.getBoundingClientRect().height, overflow: getComputedStyle(main).overflow, tag: main.tagName } : null,
    };
  });
  console.log(JSON.stringify(info, null, 2));
});
