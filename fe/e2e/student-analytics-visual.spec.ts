import { expect, test } from '@playwright/test';

test.setTimeout(30000);

test('analytics debug', async ({ browser, request }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const res = await request.post('http://localhost:8088/api/v3/auth/login', {
    data: { email: 'nguyenvanan@sv.maritime.edu', password: 'Student@2026' }
  });
  const { accessToken, refreshToken, user } = (await res.json()).data;

  await page.goto('http://localhost:4200', { waitUntil: 'domcontentloaded' });
  await page.evaluate(([t, r, u]: string[]) => {
    localStorage.setItem('lms_access_token', t);
    localStorage.setItem('lms_refresh_token', r);
    localStorage.setItem('lms_user', u);
  }, [accessToken, refreshToken, JSON.stringify(user)]);

  await page.goto('http://localhost:4200/student/analytics', { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForTimeout(3000);

  const url = page.url();
  const title = await page.title();
  const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 500) || 'EMPTY');

  console.log('URL:', url);
  console.log('Title:', title);
  console.log('Body:', bodyText);

  expect(url).toContain('/student');
  await context.close();
});
