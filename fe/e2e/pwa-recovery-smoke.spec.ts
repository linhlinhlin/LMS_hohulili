import { expect, test } from '@playwright/test';

test.describe('PWA recovery routes', () => {
  test('legacy reset-sw alias opens the repair surface', async ({ page }) => {
    await page.goto('/reset-sw?returnUrl=%2Fstudent%2Fstorage');

    await expect(page.getByRole('heading', { name: /service worker/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /bat dau khoi phuc|bắt đầu khôi phục/i })).toBeVisible();
  });

  test('clear-site-data route shows manual browser cleanup guidance', async ({ page }) => {
    await page.goto('/clear-site-data?returnUrl=%2Fauth%2Flogin');

    await expect(page.getByTestId('clear-site-data-page')).toBeVisible();
    await expect(page.getByText(/Site settings/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /Thu khoi phuc trong app truoc/i })).toHaveAttribute('href', '/reset-sw');
  });
});
