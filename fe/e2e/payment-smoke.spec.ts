import { expect, test } from '@playwright/test';
import {
  getAuthorizedJson,
  postAuthorizedJson,
  resetAppOriginState,
  seedPaymentSmokeSession,
} from './helpers/auth';

type PaymentStatusSnapshot = {
  hasPaid?: boolean;
  status?: string | null;
  accessActivationState?: string | null;
};

function unwrapData<T>(payload: any): T {
  return (payload?.data ?? payload) as T;
}

test.describe('@release Payment gating and simulated checkout', () => {
  test('@release learner sees free vs paid gating and can unlock a paid course with simulated checkout', async ({
    page,
    request,
  }) => {
    test.slow();
    test.setTimeout(180_000);

    await resetAppOriginState(page);
    const { session, fixture } = await seedPaymentSmokeSession(page, request, {
      requireDirectAccessCourse: true,
    });

    await page.goto(`/courses/${fixture.freeCourseId}`);
    await expect(
      page.getByRole('button', { name: /Đăng ký miễn phí|Tiếp tục học/i }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole('button', { name: /Đăng ký và thanh toán|Mở khóa khóa học/i }),
    ).toHaveCount(0);

    await page.goto(`/courses/${fixture.paidCourseId}`);
    const paidCta = page.getByRole('button', { name: /Đăng ký và thanh toán|Mở khóa khóa học/i });
    await expect(paidCta).toBeVisible({ timeout: 20_000 });
    await paidCta.click();

    await expect(page.getByRole('heading', { name: /Thanh toán khóa học/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Chọn phương thức thanh toán/i)).toBeVisible();
    const methodsPayload = await getAuthorizedJson<any>(
      request,
      session.accessToken,
      '/api/v3/payments/available-methods',
    );
    const availableMethods = unwrapData<{ availableMethods: string[] }>(methodsPayload).availableMethods ?? [];
    await expect(page.getByRole('radio')).toHaveCount(availableMethods.length);

    const checkoutPayload = await postAuthorizedJson<any>(
      request,
      session.accessToken,
      '/api/v3/payments/checkout',
      {
        courseId: fixture.paidCourseId,
        amount: 1,
        paymentMethod: 'SIMULATED',
      },
    );
    expect(checkoutPayload?.success).toBeTruthy();
    expect(unwrapData<PaymentStatusSnapshot>(checkoutPayload)?.status).toBe('COMPLETED');

    await page.reload();
    await expect(page.getByRole('button', { name: /Tiếp tục học/i })).toBeVisible({ timeout: 20_000 });

    await Promise.all([
      page.waitForURL(new RegExp(`/student/learn/course/${fixture.paidCourseId}`), { timeout: 30_000 }),
      page.getByRole('button', { name: /Tiếp tục học/i }).click(),
    ]);

    const paymentStatusPayload = await getAuthorizedJson<any>(
      request,
      session.accessToken,
      `/api/v3/payments/status/${fixture.paidCourseId}`,
    );
    const paymentStatus = unwrapData<PaymentStatusSnapshot>(paymentStatusPayload);
    expect(paymentStatus.hasPaid).toBeTruthy();
    expect(paymentStatus.status).toBe('COMPLETED');
  });

  test('@release instructor-led checkout records payment without pretending direct access is ready', async ({
    page,
    request,
  }) => {
    test.slow();
    test.setTimeout(180_000);

    await resetAppOriginState(page);
    const { session, fixture } = await seedPaymentSmokeSession(page, request, {
      requireFreeCourse: false,
      requirePaidCourse: false,
      requireManualActivationCourse: true,
    });

    test.skip(
      !fixture.manualActivationCourseId,
      'No unpaid instructor-led paid course is available in the current seed dataset.',
    );

    await page.goto(`/courses/${fixture.manualActivationCourseId}`);
    const paidCta = page.getByRole('button', { name: /Đăng ký và thanh toán|Mở khóa khóa học/i });
    await expect(paidCta).toBeVisible({ timeout: 20_000 });

    const checkoutPayload = await postAuthorizedJson<any>(
      request,
      session.accessToken,
      '/api/v3/payments/checkout',
      {
        courseId: fixture.manualActivationCourseId,
        amount: 1,
        paymentMethod: 'SIMULATED',
      },
    );
    expect(checkoutPayload?.success).toBeTruthy();
    expect(unwrapData<PaymentStatusSnapshot>(checkoutPayload)?.status).toBe('COMPLETED');

    await page.reload();

    await expect(page.getByRole('button', { name: /Tiếp tục học/i })).toHaveCount(0);
    await expect(page.locator('a[href="/student/payments"]')).toBeVisible({ timeout: 20_000 });

    const paymentStatusPayload = await getAuthorizedJson<any>(
      request,
      session.accessToken,
      `/api/v3/payments/status/${fixture.manualActivationCourseId}`,
    );
    const paymentStatus = unwrapData<any>(paymentStatusPayload);
    expect(paymentStatus.hasPaid).toBeTruthy();
    expect(paymentStatus.status).toBe('COMPLETED');
    expect(paymentStatus.accessActivationState).toBe('MANUAL_ACTIVATION_REQUIRED');
  });
});
