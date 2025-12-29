import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Payment API Client
 * 
 * SOTA Design (Dec 2025):
 * - Typed request/response interfaces
 * - Support multiple payment methods (VNPay, ZaloPay, MoMo, Simulated)
 * - Payment status checking and history
 */

// === REQUEST/RESPONSE TYPES ===

export interface CheckoutRequest {
    courseId: string;
    amount: number;
    paymentMethod: string;
}

export interface PaymentResponse {
    id: string;
    courseId: string;
    courseTitle: string;
    amount: number;
    status: PaymentStatus;
    transactionId: string | null;
    paidAt: string | null;
    createdAt: string | null;
}

export interface PaymentStatusResponse {
    courseId: string;
    hasPaid: boolean;
    status: PaymentStatus | null;
    freeLessonsCount: number | null;
    transactionId: string | null;
    paidAt: string | null;
}

export interface LessonAccessResponse {
    courseId: string;
    lessonIndex: number;
    canAccess: boolean;
    hasPaid: boolean;
    message: string | null;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message: string;
    error?: string;
}

export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

export type PaymentMethod = 'VNPAY' | 'ZALOPAY' | 'MOMO' | 'BANK_TRANSFER' | 'SIMULATED';

export const PAYMENT_METHODS: { code: PaymentMethod; name: string; icon: string; description: string }[] = [
    { code: 'VNPAY', name: 'VNPay', icon: '💳', description: 'Thanh toán qua VNPay' },
    { code: 'ZALOPAY', name: 'ZaloPay', icon: '📱', description: 'Thanh toán qua ZaloPay' },
    { code: 'MOMO', name: 'MoMo', icon: '💜', description: 'Thanh toán qua MoMo' },
    { code: 'BANK_TRANSFER', name: 'Chuyển khoản', icon: '🏦', description: 'Chuyển khoản ngân hàng' },
    { code: 'SIMULATED', name: 'Thanh toán nhanh', icon: '⚡', description: 'Thanh toán giả lập (Dev)' }
];

@Injectable({ providedIn: 'root' })
export class PaymentApi {
    private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrl}/payments`;

    /**
     * Process checkout/payment
     */
    checkout(request: CheckoutRequest): Observable<ApiResponse<PaymentResponse>> {
        return this.http.post<ApiResponse<PaymentResponse>>(`${this.baseUrl}/checkout`, request);
    }

    /**
     * Get payment status for a course
     */
    getPaymentStatus(courseId: string): Observable<ApiResponse<PaymentStatusResponse>> {
        return this.http.get<ApiResponse<PaymentStatusResponse>>(`${this.baseUrl}/status/${courseId}`);
    }

    /**
     * Get payment history for current user
     */
    getMyPayments(): Observable<ApiResponse<PaymentResponse[]>> {
        return this.http.get<ApiResponse<PaymentResponse[]>>(`${this.baseUrl}/my-payments`);
    }

    /**
     * Check if user can access a specific lesson
     */
    canAccessLesson(courseId: string, lessonIndex: number): Observable<ApiResponse<LessonAccessResponse>> {
        return this.http.get<ApiResponse<LessonAccessResponse>>(
            `${this.baseUrl}/can-access/${courseId}/lesson/${lessonIndex}`
        );
    }
}
