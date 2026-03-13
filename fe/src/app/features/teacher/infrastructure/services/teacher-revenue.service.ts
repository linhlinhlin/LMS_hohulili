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
    grossAmount: number;
    platformFeePct: number;
    teacherSharePct: number;
    platformAmount: number;
    teacherAmount: number;
    createdAt: string;
}

export interface PayoutBalance {
    availableBalance: number;
    pendingBalance: number;
    totalWithdrawn: number;
    minPayoutAmount: number;
}

export interface BankAccount {
    id: string;
    bankCode: string;
    accountNumberMasked: string;
    accountName: string;
    isDefault: boolean;
    verified: boolean;
}

export interface PayoutRequestBody {
    bankAccountId: string;
    amount: number;
    teacherNote?: string;
}

export interface PayoutHistoryItem {
    id: string;
    amount: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
    teacherNote?: string;
    adminNote?: string;
    requestedAt: string;
    processedAt?: string;
    bankAccountId: string;
    bankCode: string;
    accountNumberMasked: string;
}

// ============================================
// API ENDPOINTS
// ============================================

const TEACHER_REVENUE_ENDPOINTS = {
    SUMMARY:        '/api/v3/teacher/revenue/summary',
    HISTORY:        '/api/v3/teacher/revenue/history',
    PAYOUT_BALANCE: '/api/v3/teacher/payout/balance',
    PAYOUT_REQUEST: '/api/v3/teacher/payout/request',
    PAYOUT_HISTORY: '/api/v3/teacher/payout/history',
    BANK_ACCOUNTS:  '/api/v3/teacher/bank-accounts',
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
    private _payoutBalance  = signal<PayoutBalance | null>(null);
    private _payoutHistory  = signal<PayoutHistoryItem[]>([]);
    private _bankAccounts   = signal<BankAccount[]>([]);

    // Public readonly signals
    readonly revenueSummary = this._revenueSummary.asReadonly();
    readonly revenueHistory = this._revenueHistory.asReadonly();
    readonly payoutBalance  = this._payoutBalance.asReadonly();
    readonly payoutHistory  = this._payoutHistory.asReadonly();
    readonly bankAccounts   = this._bankAccounts.asReadonly();

    // Computed values
    readonly availableBalance  = computed(() => this._payoutBalance()?.availableBalance ?? 0);
    readonly totalRevenue      = computed(() => this._revenueSummary()?.totalRevenue ?? 0);
    readonly thisMonthRevenue  = computed(() => this._revenueSummary()?.thisMonthRevenue ?? 0);
    readonly defaultBankAccount = computed(() =>
        this._bankAccounts().find(a => a.isDefault) ?? this._bankAccounts()[0] ?? null
    );

    // ============================================
    // REVENUE METHODS
    // ============================================

    getRevenueSummary(): Observable<RevenueSummary> {
        this._isLoading.next(true);
        this.isLoading.set(true);
        return this.apiClient.getWithResponse<RevenueSummary>(TEACHER_REVENUE_ENDPOINTS.SUMMARY).pipe(
            finalize(() => { this._isLoading.next(false); this.isLoading.set(false); }),
            map(r => { this._revenueSummary.set(r.data); return r.data; }),
            catchError(e => throwError(() => e))
        );
    }

    getRevenueHistory(params?: { page?: number; size?: number }): Observable<RevenueHistoryItem[]> {
        this._isLoading.next(true);
        this.isLoading.set(true);
        return this.apiClient.getWithResponse<any>(TEACHER_REVENUE_ENDPOINTS.HISTORY, { params }).pipe(
            finalize(() => { this._isLoading.next(false); this.isLoading.set(false); }),
            map(r => {
                const data = r.data;
                const history: RevenueHistoryItem[] = Array.isArray(data) ? data : (data?.content ?? []);
                this._revenueHistory.set(history);
                return history;
            }),
            catchError(e => throwError(() => e))
        );
    }

    // ============================================
    // PAYOUT METHODS
    // ============================================

    getPayoutBalance(): Observable<PayoutBalance> {
        this._isLoading.next(true);
        this.isLoading.set(true);
        return this.apiClient.getWithResponse<PayoutBalance>(TEACHER_REVENUE_ENDPOINTS.PAYOUT_BALANCE).pipe(
            finalize(() => { this._isLoading.next(false); this.isLoading.set(false); }),
            map(r => { this._payoutBalance.set(r.data); return r.data; }),
            catchError(e => throwError(() => e))
        );
    }

    requestPayout(body: PayoutRequestBody): Observable<{ message: string; payoutId: string }> {
        this._isLoading.next(true);
        this.isLoading.set(true);
        return this.apiClient.postWithResponse<{ payoutId: string }>(TEACHER_REVENUE_ENDPOINTS.PAYOUT_REQUEST, body).pipe(
            finalize(() => { this._isLoading.next(false); this.isLoading.set(false); }),
            tap(() => {
                this.getPayoutBalance().subscribe({ error: () => {} });
                this.getPayoutHistory().subscribe({ error: () => {} });
            }),
            map(r => ({ message: r.message || 'Yêu cầu rút tiền đã được gửi thành công!', payoutId: r.data?.payoutId ?? '' })),
            catchError(e => throwError(() => e))
        );
    }

    getPayoutHistory(params?: { page?: number; size?: number }): Observable<PayoutHistoryItem[]> {
        this._isLoading.next(true);
        this.isLoading.set(true);
        return this.apiClient.getWithResponse<any>(TEACHER_REVENUE_ENDPOINTS.PAYOUT_HISTORY, { params }).pipe(
            finalize(() => { this._isLoading.next(false); this.isLoading.set(false); }),
            map(r => {
                const data = r.data;
                const history: PayoutHistoryItem[] = Array.isArray(data) ? data : (data?.content ?? []);
                this._payoutHistory.set(history);
                return history;
            }),
            catchError(e => throwError(() => e))
        );
    }

    // ============================================
    // BANK ACCOUNT METHODS
    // ============================================

    getBankAccounts(): Observable<BankAccount[]> {
        return this.apiClient.getWithResponse<BankAccount[]>(TEACHER_REVENUE_ENDPOINTS.BANK_ACCOUNTS).pipe(
            map(r => { this._bankAccounts.set(r.data); return r.data; }),
            catchError(e => throwError(() => e))
        );
    }

    addBankAccount(bankCode: string, accountNumber: string, accountName: string): Observable<BankAccount> {
        return this.apiClient.postWithResponse<BankAccount>(TEACHER_REVENUE_ENDPOINTS.BANK_ACCOUNTS,
            { bankCode, accountNumber, accountName }).pipe(
            map(r => {
                this._bankAccounts.update(list => [...list, r.data]);
                return r.data;
            }),
            catchError(e => throwError(() => e))
        );
    }

    setDefaultBankAccount(id: string): Observable<BankAccount> {
        return this.apiClient.putWithResponse<BankAccount>(
            `${TEACHER_REVENUE_ENDPOINTS.BANK_ACCOUNTS}/${id}/set-default`, {}).pipe(
            map(r => {
                this._bankAccounts.update(list => list.map(a => ({ ...a, isDefault: a.id === id })));
                return r.data;
            }),
            catchError(e => throwError(() => e))
        );
    }

    deleteBankAccount(id: string): Observable<void> {
        return this.apiClient.deleteWithResponse<any>(
            `${TEACHER_REVENUE_ENDPOINTS.BANK_ACCOUNTS}/${id}`).pipe(
            map(() => {
                this._bankAccounts.update(list => list.filter(a => a.id !== id));
            }),
            catchError(e => throwError(() => e))
        );
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    async loadDashboardData(): Promise<void> {
        await Promise.all([
            firstValueFrom(this.getRevenueSummary()),
            firstValueFrom(this.getRevenueHistory()),
            firstValueFrom(this.getPayoutBalance()),
            firstValueFrom(this.getBankAccounts()),
        ]);
    }

    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    }

    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    getStatusClass(status: string): string {
        const map: Record<string, string> = {
            'COMPLETED': 'bg-green-100 text-green-800',
            'completed': 'bg-green-100 text-green-800',
            'PENDING':   'bg-yellow-100 text-yellow-800',
            'pending':   'bg-yellow-100 text-yellow-800',
            'APPROVED':  'bg-[#0056D2]/10 text-[#004BB5]',
            'processing':'bg-[#0056D2]/10 text-[#004BB5]',
            'REJECTED':  'bg-red-100 text-red-800',
            'rejected':  'bg-red-100 text-red-800',
            'refunded':  'bg-gray-100 text-gray-800',
        };
        return map[status] || 'bg-gray-100 text-gray-800';
    }

    getStatusLabel(status: string): string {
        const map: Record<string, string> = {
            'COMPLETED': 'Hoàn thành',
            'completed': 'Hoàn thành',
            'PENDING':   'Chờ xử lý',
            'pending':   'Chờ xử lý',
            'APPROVED':  'Đã duyệt',
            'processing':'Đang xử lý',
            'REJECTED':  'Bị từ chối',
            'rejected':  'Bị từ chối',
            'refunded':  'Hoàn tiền',
        };
        return map[status] || status;
    }

    getBankDisplayName(bankCode: string): string {
        const banks: Record<string, string> = {
            'VCB': 'Vietcombank', 'TCB': 'Techcombank', 'MBB': 'MB Bank',
            'VPB': 'VPBank', 'ACB': 'ACB', 'BID': 'BIDV', 'CTG': 'VietinBank',
            'STB': 'Sacombank', 'TPB': 'TPBank', 'MSB': 'MSB', 'OCB': 'OCB',
            'HDB': 'HDBank', 'VIB': 'VIB', 'SHB': 'SHB', 'EIB': 'Eximbank',
            'NAB': 'Nam A Bank', 'CAKE': 'CAKE', 'UBANK': 'Ubank',
        };
        return banks[bankCode] ?? bankCode;
    }
}
