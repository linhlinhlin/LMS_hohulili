import { Routes } from '@angular/router';

/**
 * Payment Routes
 * 
 * Routes for payment result pages:
 * - /payment/success - After successful payment
 * - /payment/failed - After failed/cancelled payment
 * - /payment/callback/vnpay - VNPay return URL handler
 */
export const paymentRoutes: Routes = [
    {
        path: 'success',
        loadComponent: () => import('./payment-success.component').then(m => m.PaymentSuccessComponent),
        title: 'Thanh toán thành công - LMS Maritime'
    },
    {
        path: 'failed',
        loadComponent: () => import('./payment-failed.component').then(m => m.PaymentFailedComponent),
        title: 'Thanh toán thất bại - LMS Maritime'
    },
    // VNPay callback handler - redirects to success/failed based on params
    {
        path: 'callback/vnpay',
        loadComponent: () => import('./payment-callback.component').then(m => m.PaymentCallbackComponent),
        title: 'Đang xử lý thanh toán...'
    },
    // Default redirect
    {
        path: '',
        redirectTo: '/courses',
        pathMatch: 'full'
    }
];
