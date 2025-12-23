import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { PAYMENT_ENDPOINTS } from '../../../api/endpoints/payment.endpoints';

/**
 * Payment Types
 */
export interface CheckoutRequest {
    courseId: string;
    amount: number;
    paymentMethod?: string;
}

export interface PaymentResponse {
    id: string;
    courseId: string;
    courseTitle: string;
    amount: number;
    status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
    transactionId?: string;
    paidAt?: string;
    createdAt?: string;
}

export interface PaymentStatusResponse {
    courseId: string;
    hasPaid: boolean;
    status?: string;
    freeLessonsCount?: number;
    transactionId?: string;
    paidAt?: string;
}

export interface LessonAccessResponse {
    courseId: string;
    lessonIndex: number;
    canAccess: boolean;
    hasPaid: boolean;
    message?: string;
}

/**
 * Backend ApiResponse format (không có success field)
 * Response thành công khi có data, thất bại khi chỉ có message
 */
interface ApiResponse<T> {
    data?: T;
    message?: string;
    pagination?: any;
}

/**
 * Payment Service - Xử lý thanh toán khóa học
 * 
 * Features:
 * - Checkout (giả lập thanh toán)
 * - Kiểm tra trạng thái thanh toán
 * - Lịch sử thanh toán
 * - Kiểm tra quyền truy cập bài học
 */
@Injectable({ providedIn: 'root' })
export class PaymentService {
    private http = inject(HttpClient);

    // State
    private _loading = signal(false);
    private _error = signal<string | null>(null);
    private _paymentHistory = signal<PaymentResponse[]>([]);
    private _paymentStatusCache = new Map<string, PaymentStatusResponse>();

    // Public readonly signals
    readonly loading = this._loading.asReadonly();
    readonly error = this._error.asReadonly();
    readonly paymentHistory = this._paymentHistory.asReadonly();

    // Số bài học miễn phí
    readonly FREE_LESSONS_COUNT = 2;

    /**
     * Thanh toán khóa học (giả lập)
     */
    checkout(request: CheckoutRequest): Observable<ApiResponse<PaymentResponse>> {
        this._loading.set(true);
        this._error.set(null);

        return this.http.post<ApiResponse<PaymentResponse>>(
            PAYMENT_ENDPOINTS.CHECKOUT,
            request
        ).pipe(
            tap(response => {
                this._loading.set(false);
                // Check by data presence instead of success field
                if (response.data) {
                    // Cập nhật cache
                    this._paymentStatusCache.set(request.courseId, {
                        courseId: request.courseId,
                        hasPaid: true,
                        status: 'COMPLETED',
                        transactionId: response.data.transactionId,
                        paidAt: response.data.paidAt
                    });
                    // Reload payment history
                    this.loadPaymentHistory().subscribe();
                }
            }),
            catchError(error => {
                this._loading.set(false);
                this._error.set(error.error?.message || 'Thanh toán thất bại');
                throw error;
            })
        );
    }

    /**
     * Kiểm tra trạng thái thanh toán của course
     * @param forceRefresh Bỏ qua cache và gọi API trực tiếp
     */
    getPaymentStatus(courseId: string, forceRefresh: boolean = false): Observable<ApiResponse<PaymentStatusResponse>> {
        // Check cache first (skip if forceRefresh)
        if (!forceRefresh) {
            const cached = this._paymentStatusCache.get(courseId);
            if (cached) {
                return of({ data: cached, message: 'Cached' });
            }
        }

        return this.http.get<ApiResponse<PaymentStatusResponse>>(
            PAYMENT_ENDPOINTS.STATUS(courseId)
        ).pipe(
            tap(response => {
                if (response.data) {
                    this._paymentStatusCache.set(courseId, response.data);
                }
            })
        );
    }

    /**
     * Kiểm tra nhanh: đã thanh toán chưa (dùng cache)
     */
    hasPaidForCourse(courseId: string): boolean {
        const cached = this._paymentStatusCache.get(courseId);
        return cached?.hasPaid ?? false;
    }

    /**
     * Lấy lịch sử thanh toán
     */
    loadPaymentHistory(): Observable<ApiResponse<PaymentResponse[]>> {
        this._loading.set(true);

        return this.http.get<ApiResponse<PaymentResponse[]>>(
            PAYMENT_ENDPOINTS.MY_PAYMENTS
        ).pipe(
            tap(response => {
                this._loading.set(false);
                if (response.data) {
                    this._paymentHistory.set(response.data);
                }
            }),
            catchError(error => {
                this._loading.set(false);
                console.error('Error loading payment history:', error);
                return of({ message: error.message, data: [] });
            })
        );
    }

    /**
     * Kiểm tra quyền truy cập bài học
     */
    canAccessLesson(courseId: string, lessonIndex: number): Observable<ApiResponse<LessonAccessResponse>> {
        return this.http.get<ApiResponse<LessonAccessResponse>>(
            PAYMENT_ENDPOINTS.CAN_ACCESS_LESSON(courseId, lessonIndex)
        );
    }

    /**
     * Kiểm tra nhanh quyền truy cập (local, không gọi API)
     * - Chưa thanh toán: chỉ 2 bài đầu
     * - Đã thanh toán: full access
     */
    canAccessLessonLocal(courseId: string, lessonIndex: number): boolean {
        const cached = this._paymentStatusCache.get(courseId);
        if (cached?.hasPaid) {
            return true; // Full access
        }
        return lessonIndex < this.FREE_LESSONS_COUNT;
    }

    /**
     * Clear cache khi cần (ví dụ: logout)
     */
    clearCache(): void {
        this._paymentStatusCache.clear();
        this._paymentHistory.set([]);
    }
}
