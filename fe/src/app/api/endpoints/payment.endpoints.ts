/**
 * Payment API Endpoints
 */
export const PAYMENT_ENDPOINTS = {
  CHECKOUT: '/api/v1/payments/checkout',
  STATUS: (courseId: string) => `/api/v1/payments/status/${courseId}`,
  MY_PAYMENTS: '/api/v1/payments/my-payments',
  CAN_ACCESS_LESSON: (courseId: string, lessonIndex: number) => 
    `/api/v1/payments/can-access/${courseId}/lesson/${lessonIndex}`
} as const;
