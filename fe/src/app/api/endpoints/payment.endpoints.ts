/**
 * Payment API Endpoints - V3
 * Standardized RESTful endpoints for Payment operations
 * Note: Backend PaymentControllerV3 may need to be created
 */
export const PAYMENT_ENDPOINTS = {
  // === Payment Operations ===
  CHECKOUT: '/api/v3/payments/checkout',
  STATUS: (courseId: string) => `/api/v3/payments/status/${courseId}`,
  MY_PAYMENTS: '/api/v3/payments/my-payments',

  // === Lesson Access Check ===
  CAN_ACCESS_LESSON: (courseId: string, lessonIndex: number) =>
    `/api/v3/payments/can-access/${courseId}/lesson/${lessonIndex}`,

  // === Payment History ===
  HISTORY: '/api/v3/payments/history',
  INVOICE: (paymentId: string) => `/api/v3/payments/${paymentId}/invoice`
} as const;
