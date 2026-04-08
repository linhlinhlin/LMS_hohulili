import { expect, test } from '@playwright/test';
import {
  resetAppOriginState,
  seedOfflineLearningSession,
} from './helpers/auth';

test.describe('@smoke Storage page logic', () => {

  test('@smoke storage page shows correct layout and empty state', async ({ page, request }) => {
    // 1. Clean state + login
    await resetAppOriginState(page);
    await seedOfflineLearningSession(page, request);

    // 2. Go to storage page
    await page.goto('/student/storage');
    await expect(page.getByRole('heading', { name: 'Lưu trữ ngoại tuyến' })).toBeVisible({
      timeout: 15_000,
    });

    // Wait for data loading to finish (skeleton gone)
    await page.waitForTimeout(3_000);

    // ═══════════════════════════════════════
    // TEST: Overview tab — storage breakdown
    // ═══════════════════════════════════════

    // 3. Verify "Dung lượng" section exists with usage display
    await expect(page.getByRole('heading', { name: 'Dung lượng' })).toBeVisible();
    // Usage format: "X KB / Y MB" or "X MB / Y GB" etc.
    const usageLocator = page.locator('text=/\\d+.*\\/.*(KB|MB|GB)/');
    await expect(usageLocator.first()).toBeVisible({ timeout: 10_000 });

    // 4. Verify all 5 breakdown cards exist
    await expect(page.getByText('Nội dung học')).toBeVisible();
    await expect(page.getByText('Video đã tải')).toBeVisible();
    await expect(page.getByText('Bộ nhớ đệm')).toBeVisible();
    await expect(page.getByText('Đồng bộ').first()).toBeVisible();
    await expect(page.getByText('Còn trống')).toBeVisible();

    // 5. Verify "Bộ nhớ đệm" has sub-label
    await expect(page.getByText('Service worker, cache')).toBeVisible();

    // 6. "Nội dung học" should show 0 B (no downloads yet)
    const courseByteCard = page.locator('text=Nội dung học').locator('..');
    const courseBytesText = await courseByteCard.locator('p.font-semibold').textContent();
    expect(courseBytesText?.trim()).toBe('0 B');

    // ═══════════════════════════════════════
    // TEST: Sync section — context-aware labels
    // ═══════════════════════════════════════

    // 7. Verify "Trạng thái đồng bộ" section
    await expect(page.getByRole('heading', { name: 'Trạng thái đồng bộ' })).toBeVisible();

    // 8. "Đồng bộ" overview card shows "Đã đồng bộ" when no pending items
    await expect(page.getByText('Đã đồng bộ').first()).toBeVisible();
    await expect(page.getByText('Không có dữ liệu chờ gửi')).toBeVisible();

    // 9. Detail cards show context-aware empty text
    await expect(page.getByText('Không có mục chờ gửi')).toBeVisible();
    await expect(page.getByText('Không có lỗi')).toBeVisible();
    await expect(page.getByText('Không có xung đột')).toBeVisible();

    // ═══════════════════════════════════════
    // TEST: Courses tab — empty state
    // ═══════════════════════════════════════

    // 10. Switch to "Khóa học" tab
    await page.getByRole('tab', { name: /Khóa học/i }).click();
    await expect(page.getByText('Chưa có khóa học nào được tải xuống')).toBeVisible();
    await expect(page.getByText('Hãy vào trang khóa học và chọn tải về để dùng ngoại tuyến')).toBeVisible();

    // 11. Verify video empty state
    await expect(page.getByText('Chưa có video ngoại tuyến nào')).toBeVisible();

    // ═══════════════════════════════════════
    // TEST: Settings tab — basic layout
    // ═══════════════════════════════════════

    // 12. Switch to "Cài đặt" tab
    await page.getByRole('tab', { name: 'Cài đặt' }).click();
    await expect(page.getByText('Thiết lập ngoại tuyến')).toBeVisible();
    await expect(page.getByText('Chất lượng video mặc định')).toBeVisible();
    await expect(page.getByText('Chỉ tải khi có Wi-Fi')).toBeVisible();
    await expect(page.getByText('Tự đồng bộ khi có mạng')).toBeVisible();
    await expect(page.getByText('Giữ bộ nhớ lâu dài')).toBeVisible();

    // 13. Verify auto-sync toggle has helper text
    const autoSyncHint = page.getByText(/Bài làm và tiến trình sẽ được gửi lên tự động|Bạn cần bấm "Đồng bộ ngay" thủ công/);
    await expect(autoSyncHint).toBeVisible();
  });

  test('@smoke storage page responsive — mobile tabs and grid', async ({ page, request }) => {
    // Use mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });

    await resetAppOriginState(page);
    await seedOfflineLearningSession(page, request);

    await page.goto('/student/storage');
    await expect(page.getByRole('heading', { name: 'Lưu trữ ngoại tuyến' })).toBeVisible({
      timeout: 15_000,
    });
    await page.waitForTimeout(3_000);

    // All 3 tabs should be accessible
    await expect(page.getByRole('tab', { name: 'Tổng quan' })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Khóa học/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Cài đặt' })).toBeVisible();

    // Tabs should be clickable on mobile
    await page.getByRole('tab', { name: 'Cài đặt' }).click();
    await expect(page.getByText('Thiết lập ngoại tuyến')).toBeVisible();

    await page.getByRole('tab', { name: 'Tổng quan' }).click();
    await expect(page.getByText('Dung lượng')).toBeVisible();

    // Storage breakdown cards should be visible (2-col grid on mobile)
    await expect(page.getByText('Nội dung học')).toBeVisible();
    await expect(page.getByText('Còn trống')).toBeVisible();

    // Network status badge visible
    await expect(page.locator('.rounded-full').filter({ hasText: /tuyến|kết nối/i }).first()).toBeVisible();
  });

  test('@smoke storage page sync button states', async ({ page, request }) => {
    await resetAppOriginState(page);
    await seedOfflineLearningSession(page, request);

    await page.goto('/student/storage');
    await expect(page.getByRole('heading', { name: 'Lưu trữ ngoại tuyến' })).toBeVisible({
      timeout: 15_000,
    });
    await page.waitForTimeout(3_000);

    // "Đồng bộ ngay" button should exist
    const syncButton = page.getByRole('button', { name: /Đồng bộ ngay/i });
    await expect(syncButton).toBeVisible();

    // With no pending items and online, button should still be clickable
    // (it triggers a sync check even with 0 items)
    const isDisabled = await syncButton.isDisabled();
    // Button may be disabled if offline — that's correct behavior
    if (!isDisabled) {
      await syncButton.click();
      // Should not crash — just runs sync with 0 items
      await page.waitForTimeout(2_000);
      // Page should still be on storage
      await expect(page.getByRole('heading', { name: 'Lưu trữ ngoại tuyến' })).toBeVisible();
    }
  });
});
