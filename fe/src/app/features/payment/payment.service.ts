import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
    PaymentAccessActivationState,
    CheckoutRequest,
    PaymentGatewayAvailabilityResponse,
    PaymentApi,
    PaymentMethod,
    PaymentResponse,
    PaymentStatus,
    SepayQrData
} from '../../api/client/payment.api';
import { CourseApi } from '../../api/client/course.api';
import { AuthService } from '../../core/services/auth.service';

export type { PaymentAccessActivationState } from '../../api/client/payment.api';

/**
 * Payment Service
 *
 * Runtime truth:
 * - Payment completion and learning activation are related but not identical states
 * - A payment can be COMPLETED while access activation is still pending or manual
 */

export interface PaymentState {
    courseId: string;
    hasPaid: boolean;
    status: PaymentStatus | null;
    freeLessonsCount: number;
    transactionId: string | null;
    accessActivationState: PaymentAccessActivationState | null;
    accessActivationMessage: string | null;
}

export interface PaymentAccessActivationResult {
    state: PaymentAccessActivationState;
    message: string | null;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
    private paymentApi = inject(PaymentApi);
    private courseApi = inject(CourseApi);
    private authService = inject(AuthService);

    private _paymentStatusCache = signal<Map<string, PaymentState>>(new Map());
    private _isProcessing = signal(false);
    private _lastPayment = signal<PaymentResponse | null>(null);
    private _error = signal<string | null>(null);

    readonly isProcessing = this._isProcessing.asReadonly();
    readonly lastPayment = this._lastPayment.asReadonly();
    readonly error = this._error.asReadonly();

    hasPaidForCourse(courseId: string): boolean {
        const cache = this._paymentStatusCache();
        const status = cache.get(this.getCacheKey(courseId));
        return status?.hasPaid ?? false;
    }

    getPaymentState(courseId: string): PaymentState | undefined {
        return this._paymentStatusCache().get(this.getCacheKey(courseId));
    }

    async loadPaymentStatus(courseId: string): Promise<PaymentState> {
        try {
            const response = await firstValueFrom(this.paymentApi.getPaymentStatus(courseId));
            if (!response.success) {
                throw new Error(response.message || 'Failed to load payment status');
            }

            const state: PaymentState = {
                courseId,
                hasPaid: response.data.hasPaid,
                status: response.data.status,
                freeLessonsCount: response.data.freeLessonsCount ?? 0,
                transactionId: response.data.transactionId,
                accessActivationState: response.data.accessActivationState ?? null,
                accessActivationMessage: response.data.accessActivationMessage ?? null
            };

            this.cachePaymentState(state);
            return state;
        } catch {
            const cached = this.getPaymentState(courseId);
            if (cached) {
                return cached;
            }
            throw new Error('Failed to load payment status');
        }
    }

    async checkout(courseId: string, amount: number, method: PaymentMethod = 'SIMULATED'): Promise<PaymentResponse> {
        this._isProcessing.set(true);
        this._error.set(null);

        try {
            if (method === 'VNPAY') {
                const vnpayResponse = await firstValueFrom(this.paymentApi.createVnPayUrl(courseId, amount));
                if (vnpayResponse.success && vnpayResponse.data?.paymentUrl) {
                    window.location.href = vnpayResponse.data.paymentUrl;
                    return {} as PaymentResponse;
                }
                if (vnpayResponse.success && !vnpayResponse.data?.paymentUrl) {
                    const existingPayment = vnpayResponse.data as unknown as PaymentResponse;
                    this._lastPayment.set(existingPayment);
                    if (existingPayment.courseId && existingPayment.status === 'COMPLETED') {
                        this.cachePaymentState({
                            courseId: existingPayment.courseId,
                            hasPaid: true,
                            status: existingPayment.status,
                            freeLessonsCount: 0,
                            transactionId: existingPayment.transactionId,
                            accessActivationState: existingPayment.accessActivationState ?? null,
                            accessActivationMessage: existingPayment.accessActivationMessage ?? null
                        });
                    }
                    return existingPayment;
                }
                throw new Error(vnpayResponse.message || 'Không thể tạo liên kết thanh toán VNPay');
            }

            const request: CheckoutRequest = {
                courseId,
                amount,
                paymentMethod: method
            };

            const response = await firstValueFrom(this.paymentApi.checkout(request));
            if (!response.success) {
                throw new Error(response.message || 'Payment failed');
            }

            this._lastPayment.set(response.data);
            this.cachePaymentState({
                courseId,
                hasPaid: response.data.status === 'COMPLETED',
                status: response.data.status,
                freeLessonsCount: 0,
                transactionId: response.data.transactionId,
                accessActivationState: response.data.accessActivationState ?? null,
                accessActivationMessage: response.data.accessActivationMessage ?? null
            });
            return response.data;
        } catch (error: any) {
            const backendMsg = error?.error?.message || error?.error?.error;
            const errorMessage = backendMsg || error?.message || 'Thanh toán thất bại. Vui lòng thử lại.';
            this._error.set(errorMessage);
            throw error;
        } finally {
            this._isProcessing.set(false);
        }
    }

    clearCache(courseId?: string): void {
        if (courseId) {
            this._paymentStatusCache.update(cache => {
                const next = new Map(cache);
                next.delete(this.getCacheKey(courseId));
                return next;
            });
            return;
        }
        this._paymentStatusCache.set(new Map());
    }

    async createSepayPayment(courseId: string): Promise<SepayQrData> {
        this._isProcessing.set(true);
        this._error.set(null);
        try {
            const response = await firstValueFrom(this.paymentApi.createSepayQr(courseId));
            if (response.success) {
                return response.data;
            }
            throw new Error(response.message || 'Không thể tạo QR thanh toán SePay');
        } catch (error: any) {
            const backendMsg = error?.error?.message || error?.error?.error;
            const errorMessage = backendMsg || error?.message || 'Không thể tạo QR thanh toán.';
            this._error.set(errorMessage);
            throw error;
        } finally {
            this._isProcessing.set(false);
        }
    }

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

    async getAvailablePaymentMethods(): Promise<PaymentGatewayAvailabilityResponse> {
        const response = await firstValueFrom(this.paymentApi.getAvailablePaymentMethods());
        if (!response.success) {
            throw new Error(response.message || 'Không thể tải phương thức thanh toán khả dụng');
        }
        return response.data;
    }

    async getPaymentByTxnRef(txnRef: string): Promise<PaymentResponse> {
        const response = await firstValueFrom(this.paymentApi.getPaymentByTxnRef(txnRef));
        if (!response.success) {
            throw new Error(response.message || 'Không thể tải trạng thái giao dịch');
        }

        const payment = response.data;
        if (payment?.courseId && payment.status === 'COMPLETED') {
            this.cachePaymentState({
                courseId: payment.courseId,
                hasPaid: true,
                status: payment.status,
                freeLessonsCount: 0,
                transactionId: payment.transactionId ?? null,
                accessActivationState: payment.accessActivationState ?? null,
                accessActivationMessage: payment.accessActivationMessage ?? null
            });
        }
        this._lastPayment.set(payment);
        return payment;
    }

    async getPaymentHistory(): Promise<PaymentResponse[]> {
        const response = await firstValueFrom(this.paymentApi.getMyPayments());
        if (!response.success) {
            throw new Error(response.message || 'Không thể tải lịch sử thanh toán');
        }
        return response.data;
    }

    async ensureEnrollment(courseId: string): Promise<PaymentAccessActivationResult> {
        if (!this.authService.isAuthenticated() || this.authService.userRole() !== 'student') {
            return {
                state: 'ACCESS_PENDING',
                message: 'Hãy đăng nhập bằng tài khoản học viên để kích hoạt quyền học.'
            };
        }

        try {
            await firstValueFrom(this.courseApi.enrollCourse(courseId));
            return { state: 'READY', message: null };
        } catch (error: any) {
            const backendMsg = error?.error?.message || error?.error?.error || error?.message || '';
            const normalized = String(backendMsg).toLowerCase();

            if (normalized.includes('đã đăng ký')
                || normalized.includes('đã thanh toán')
                || normalized.includes('already enrolled')
                || normalized.includes('already paid')) {
                return { state: 'READY', message: null };
            }

            if (normalized.includes('khóa học dạng lớp học không hỗ trợ tự đăng ký trực tiếp')
                || normalized.includes('does not support direct self-enrollment')) {
                return {
                    state: 'MANUAL_ACTIVATION_REQUIRED',
                    message: 'Thanh toán đã được ghi nhận. Khóa học này học theo lớp, nên bạn sẽ vào học sau khi được xếp lớp hoặc kích hoạt.'
                };
            }

            return {
                state: 'ACCESS_PENDING',
                message: 'Thanh toán đã được ghi nhận, nhưng quyền học vẫn đang được kích hoạt. Bạn có thể kiểm tra lại trong ít phút tới tại lịch sử thanh toán.'
            };
        }
    }

    private cachePaymentState(state: PaymentState): void {
        this._paymentStatusCache.update(cache => {
            const next = new Map(cache);
            next.set(this.getCacheKey(state.courseId), state);
            return next;
        });
    }

    private getCacheKey(courseId: string): string {
        const userId = this.authService.currentUser()?.id ?? 'anon';
        return `${userId}:${courseId}`;
    }
}
