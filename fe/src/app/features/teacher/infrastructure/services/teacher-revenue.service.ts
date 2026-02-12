import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, throwError, BehaviorSubject, firstValueFrom } from 'rxjs';
import { map, catchError, finalize, tap } from 'rxjs/operators';
import { ApiClient } from '../../../../api/client/api-client';

// ============================================
// INTERFACES
// ============================================

export interface RevenueSummary {
    totalRevenue: number;
    thisMonthRevenue: number;
    lastMonthRevenue: number;
    totalCoursesSold: number;
    growthPercentage: number;
}

export interface RevenueHistoryItem {
    id: string;
    courseId: string;
    courseName: string;
    studentName: string;
    amount: number;
    platformFee: number;
    netAmount: number;
    transactionDate: string;
    status: 'completed' | 'pending' | 'refunded';
}

export interface PayoutBalance {
    availableBalance: number;
    pendingBalance: number;
    totalWithdrawn: number;
    minWithdrawAmount: number;
}

export interface PayoutRequest {
    amount: number;
    bankAccount: string;
    bankName: string;
    note?: string;
}

export interface PayoutHistoryItem {
    id: string;
    amount: number;
    bankAccount: string;
    bankName: string;
    requestedAt: string;
    processedAt?: string;
    status: 'pending' | 'processing' | 'completed' | 'rejected';
    rejectionReason?: string;
}

// ============================================
// API ENDPOINTS
// ============================================

const TEACHER_REVENUE_ENDPOINTS = {
    SUMMARY: '/api/v3/teacher/revenue/summary',
    HISTORY: '/api/v3/teacher/revenue/history',
    PAYOUT_BALANCE: '/api/v3/teacher/payout/balance',
    PAYOUT_REQUEST: '/api/v3/teacher/payout/request',
    PAYOUT_HISTORY: '/api/v3/teacher/payout/history',
};

// ============================================
// SERVICE
// ============================================

@Injectable({
    providedIn: 'root'
})
export class TeacherRevenueService {
    private apiClient = inject(ApiClient);

    // Loading state
    private _isLoading = new BehaviorSubject<boolean>(false);
    readonly isLoading$ = this._isLoading.asObservable();
    readonly isLoading = signal(false);

    // Cached data signals
    private _revenueSummary = signal<RevenueSummary | null>(null);
    private _revenueHistory = signal<RevenueHistoryItem[]>([]);
    private _payoutBalance = signal<PayoutBalance | null>(null);
    private _payoutHistory = signal<PayoutHistoryItem[]>([]);

    // Public readonly signals
    readonly revenueSummary = this._revenueSummary.asReadonly();
    readonly revenueHistory = this._revenueHistory.asReadonly();
    readonly payoutBalance = this._payoutBalance.asReadonly();
    readonly payoutHistory = this._payoutHistory.asReadonly();

    // Computed values
    readonly availableBalance = computed(() => this._payoutBalance()?.availableBalance ?? 0);
    readonly totalRevenue = computed(() => this._revenueSummary()?.totalRevenue ?? 0);
    readonly thisMonthRevenue = computed(() => this._revenueSummary()?.thisMonthRevenue ?? 0);

    // ============================================
    // REVENUE METHODS
    // ============================================

    /**
     * Get revenue summary (total, this month, growth)
     */
    getRevenueSummary(): Observable<RevenueSummary> {
        this._isLoading.next(true);
        this.isLoading.set(true);

        return this.apiClient.getWithResponse<RevenueSummary>(TEACHER_REVENUE_ENDPOINTS.SUMMARY).pipe(
            finalize(() => {
                this._isLoading.next(false);
                this.isLoading.set(false);
            }),
            map(response => {
                const summary = response.data;
                this._revenueSummary.set(summary);
                return summary;
            }),
            catchError(error => {
                return throwError(() => error);
            })
        );
    }

    /**
     * Get revenue history with pagination
     */
    getRevenueHistory(params?: { page?: number; size?: number; status?: string }): Observable<RevenueHistoryItem[]> {
        this._isLoading.next(true);
        this.isLoading.set(true);

        return this.apiClient.getWithResponse<RevenueHistoryItem[]>(TEACHER_REVENUE_ENDPOINTS.HISTORY, { params }).pipe(
            finalize(() => {
                this._isLoading.next(false);
                this.isLoading.set(false);
            }),
            map(response => {
                const history = response.data ?? [];
                this._revenueHistory.set(history);
                return history;
            }),
            catchError(error => {
                return throwError(() => error);
            })
        );
    }

    // ============================================
    // PAYOUT METHODS
    // ============================================

    /**
     * Get payout balance (available, pending, withdrawn)
     */
    getPayoutBalance(): Observable<PayoutBalance> {
        this._isLoading.next(true);
        this.isLoading.set(true);

        return this.apiClient.getWithResponse<PayoutBalance>(TEACHER_REVENUE_ENDPOINTS.PAYOUT_BALANCE).pipe(
            finalize(() => {
                this._isLoading.next(false);
                this.isLoading.set(false);
            }),
            map(response => {
                const balance = response.data;
                this._payoutBalance.set(balance);
                return balance;
            }),
            catchError(error => {
                return throwError(() => error);
            })
        );
    }

    /**
     * Request a payout (withdrawal)
     */
    requestPayout(request: PayoutRequest): Observable<{ message: string; payoutId: string }> {
        this._isLoading.next(true);
        this.isLoading.set(true);

        return this.apiClient.postWithResponse<{ payoutId: string }>(TEACHER_REVENUE_ENDPOINTS.PAYOUT_REQUEST, request).pipe(
            finalize(() => {
                this._isLoading.next(false);
                this.isLoading.set(false);
            }),
            tap(() => {
                // Refresh balance after successful payout request
                this.getPayoutBalance().subscribe({ error: () => {} }); // best-effort refresh
                this.getPayoutHistory().subscribe({ error: () => {} }); // best-effort refresh
            }),
            map(response => {
                return {
                    message: response.message || 'Yêu cầu rút tiền đã được gửi thành công!',
                    payoutId: response.data?.payoutId ?? ''
                };
            }),
            catchError(error => {
                return throwError(() => error);
            })
        );
    }

    /**
     * Get payout history
     */
    getPayoutHistory(params?: { page?: number; size?: number; status?: string }): Observable<PayoutHistoryItem[]> {
        this._isLoading.next(true);
        this.isLoading.set(true);

        return this.apiClient.getWithResponse<PayoutHistoryItem[]>(TEACHER_REVENUE_ENDPOINTS.PAYOUT_HISTORY, { params }).pipe(
            finalize(() => {
                this._isLoading.next(false);
                this.isLoading.set(false);
            }),
            map(response => {
                const history = response.data ?? [];
                this._payoutHistory.set(history);
                return history;
            }),
            catchError(error => {
                return throwError(() => error);
            })
        );
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    /**
     * Load all dashboard data at once
     */
    async loadDashboardData(): Promise<void> {
        try {
            await Promise.all([
                firstValueFrom(this.getRevenueSummary()),
                firstValueFrom(this.getRevenueHistory()),
                firstValueFrom(this.getPayoutBalance())
            ]);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Format currency in VND
     */
    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    }

    /**
     * Format date for display
     */
    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Get status badge class
     */
    getStatusClass(status: string): string {
        const statusMap: Record<string, string> = {
            'completed': 'bg-green-100 text-green-800',
            'pending': 'bg-yellow-100 text-yellow-800',
            'processing': 'bg-blue-100 text-blue-800',
            'rejected': 'bg-red-100 text-red-800',
            'refunded': 'bg-gray-100 text-gray-800'
        };
        return statusMap[status] || 'bg-gray-100 text-gray-800';
    }

    /**
     * Get status label in Vietnamese
     */
    getStatusLabel(status: string): string {
        const labelMap: Record<string, string> = {
            'completed': 'Hoàn thành',
            'pending': 'Chờ xử lý',
            'processing': 'Đang xử lý',
            'rejected': 'Bị từ chối',
            'refunded': 'Hoàn tiền'
        };
        return labelMap[status] || status;
    }
}
