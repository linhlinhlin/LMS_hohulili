import { Injectable, inject, signal, computed } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
    PaymentApi,
    PaymentResponse,
    PaymentStatusResponse,
    CheckoutRequest,
    PaymentMethod,
    PaymentStatus,
    SepayQrData
} from '../../api/client/payment.api';

/**
 * Payment Service
 * 
 * SOTA Design (Dec 2025):
 * - Reactive state with Angular Signals
 * - Cached payment status for performance
 * - Support multiple payment gateways
 */

export interface PaymentState {
    courseId: string;
    hasPaid: boolean;
    status: PaymentStatus | null;
    freeLessonsCount: number;
    transactionId: string | null;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
    private paymentApi = inject(PaymentApi);

    // === STATE ===
    private _paymentStatusCache = signal<Map<string, PaymentState>>(new Map());
    private _isProcessing = signal(false);
    private _lastPayment = signal<PaymentResponse | null>(null);
    private _error = signal<string | null>(null);

    // === PUBLIC SIGNALS ===
    readonly isProcessing = this._isProcessing.asReadonly();
    readonly lastPayment = this._lastPayment.asReadonly();
    readonly error = this._error.asReadonly();

    // Free lessons count for unpaid courses
    readonly FREE_LESSONS_COUNT = 2;

    /**
     * Check if user has paid for a course (cached)
     */
    hasPaidForCourse(courseId: string): boolean {
        const cache = this._paymentStatusCache();
        const status = cache.get(courseId);
        return status?.hasPaid ?? false;
    }

    /**
     * Get payment state for a course
     */
    getPaymentState(courseId: string): PaymentState | undefined {
        return this._paymentStatusCache().get(courseId);
    }

    /**
     * Load and cache payment status for a course
     */
    async loadPaymentStatus(courseId: string): Promise<PaymentState> {
        try {
            const response = await firstValueFrom(this.paymentApi.getPaymentStatus(courseId));

            if (response.success) {
                const state: PaymentState = {
                    courseId,
                    hasPaid: response.data.hasPaid,
                    status: response.data.status,
                    freeLessonsCount: response.data.freeLessonsCount ?? this.FREE_LESSONS_COUNT,
                    transactionId: response.data.transactionId
                };

                // Update cache
                this._paymentStatusCache.update(cache => {
                    const newCache = new Map(cache);
                    newCache.set(courseId, state);
                    return newCache;
                });

                return state;
            } else {
                throw new Error(response.message || 'Failed to load payment status');
            }
        } catch (error: any) {
            // Return default unpaid state
            return {
                courseId,
                hasPaid: false,
                status: null,
                freeLessonsCount: this.FREE_LESSONS_COUNT,
                transactionId: null
            };
        }
    }

    /**
     * Process checkout/payment
     */
    async checkout(courseId: string, amount: number, method: PaymentMethod = 'SIMULATED'): Promise<PaymentResponse> {
        this._isProcessing.set(true);
        this._error.set(null);

        try {
            // VNPay redirect flow
            if (method === 'VNPAY') {
                const vnpayResponse = await firstValueFrom(this.paymentApi.createVnPayUrl(courseId, amount));
                if (vnpayResponse.success && vnpayResponse.data?.paymentUrl) {
                    window.location.href = vnpayResponse.data.paymentUrl;
                    // Will redirect — return a placeholder (never reached)
                    return {} as PaymentResponse;
                } else if (vnpayResponse.success && !vnpayResponse.data?.paymentUrl) {
                    // Already paid — no redirect needed, treat as completed
                    return vnpayResponse.data as unknown as PaymentResponse;
                } else {
                    throw new Error(vnpayResponse.message || 'Không thể tạo liên kết thanh toán VNPay');
                }
            }

            // Simulated / other payment methods
            const request: CheckoutRequest = {
                courseId,
                amount,
                paymentMethod: method
            };

            const response = await firstValueFrom(this.paymentApi.checkout(request));

            if (response.success) {
                this._lastPayment.set(response.data);

                // Update cache with paid status
                this._paymentStatusCache.update(cache => {
                    const newCache = new Map(cache);
                    newCache.set(courseId, {
                        courseId,
                        hasPaid: response.data.status === 'COMPLETED',
                        status: response.data.status,
                        freeLessonsCount: 0, // Full access after payment
                        transactionId: response.data.transactionId
                    });
                    return newCache;
                });

                return response.data;
            } else {
                throw new Error(response.message || 'Payment failed');
            }
        } catch (error: any) {
            // Extract backend's actual error message from HttpErrorResponse body
            const backendMsg = error?.error?.message || error?.error?.error;
            const errorMessage = backendMsg || error?.message || 'Thanh toán thất bại. Vui lòng thử lại.';
            this._error.set(errorMessage);
            throw error;
        } finally {
            this._isProcessing.set(false);
        }
    }

    /**
     * Check if user can access a specific lesson
     */
    canAccessLesson(courseId: string, lessonIndex: number): boolean {
        const state = this.getPaymentState(courseId);

        // If paid, full access
        if (state?.hasPaid) {
            return true;
        }

        // If not paid, only first N lessons are accessible (0-indexed)
        return lessonIndex < this.FREE_LESSONS_COUNT;
    }

    /**
     * Get number of accessible lessons for unpaid course
     */
    getAccessibleLessonsCount(courseId: string, totalLessons: number): number {
        const state = this.getPaymentState(courseId);

        if (state?.hasPaid) {
            return totalLessons; // Full access
        }

        return Math.min(this.FREE_LESSONS_COUNT, totalLessons);
    }

    /**
     * Immediately mark a course as paid in the local cache.
     * Used by SePay flow: once polling confirms hasPaid=true, cache is updated
     * so the UI stops showing the "Buy" button without waiting for a server reload.
     */
    markCourseAsPaid(courseId: string): void {
        this._paymentStatusCache.update(cache => {
            const newCache = new Map(cache);
            const existing = cache.get(courseId);
            newCache.set(courseId, {
                courseId,
                hasPaid: true,
                status: 'COMPLETED',
                freeLessonsCount: 0,
                transactionId: existing?.transactionId ?? null
            });
            return newCache;
        });
    }

    /**
     * Clear cache for a course (e.g., after logout)
     */
    clearCache(courseId?: string): void {
        if (courseId) {
            this._paymentStatusCache.update(cache => {
                const newCache = new Map(cache);
                newCache.delete(courseId);
                return newCache;
            });
        } else {
            this._paymentStatusCache.set(new Map());
        }
    }

    /**
     * Create SePay QR payment and return QR display data
     */
    async createSepayPayment(courseId: string): Promise<SepayQrData> {
        this._isProcessing.set(true);
        this._error.set(null);
        try {
            const response = await firstValueFrom(this.paymentApi.createSepayQr(courseId));
            if (response.success) {
                return response.data;
            } else {
                throw new Error(response.message || 'Không thể tạo QR thanh toán SePay');
            }
        } catch (error: any) {
            const backendMsg = error?.error?.message || error?.error?.error;
            const errorMessage = backendMsg || error?.message || 'Không thể tạo QR thanh toán.';
            this._error.set(errorMessage);
            throw error;
        } finally {
            this._isProcessing.set(false);
        }
    }

    /**
     * Poll SePay payment status
     */
    async pollSepayStatus(txnId: string): Promise<{ hasPaid: boolean; status: string }> {
        try {
            const response = await firstValueFrom(this.paymentApi.pollSepayStatus(txnId));
            if (response.success) {
                return { hasPaid: response.data.hasPaid, status: response.data.status };
            }
            return { hasPaid: false, status: 'PENDING' };
        } catch {
            return { hasPaid: false, status: 'PENDING' };
        }
    }

    /**
     * Get payment history
     */
    async getPaymentHistory(): Promise<PaymentResponse[]> {
        try {
            const response = await firstValueFrom(this.paymentApi.getMyPayments());
            return response.success ? response.data : [];
        } catch (error) {
            return [];
        }
    }
}
