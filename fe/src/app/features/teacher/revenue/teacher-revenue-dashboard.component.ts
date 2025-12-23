import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TeacherRevenueService, RevenueSummary, RevenueHistoryItem, PayoutBalance } from '../infrastructure/services/teacher-revenue.service';

@Component({
    selector: 'app-teacher-revenue-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule],
    template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-7xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900">Doanh thu</h1>
          <p class="text-gray-600 mt-1">Theo dõi doanh thu và quản lý rút tiền</p>
        </div>

        <!-- KPI Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <!-- Total Revenue -->
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600">Tổng doanh thu</p>
                <p class="text-2xl font-bold text-green-600 mt-2">{{ formatCurrency(revenueSummary()?.totalRevenue || 0) }}</p>
              </div>
              <div class="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </div>
          </div>

          <!-- This Month -->
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600">Tháng này</p>
                <p class="text-2xl font-bold text-blue-600 mt-2">{{ formatCurrency(revenueSummary()?.thisMonthRevenue || 0) }}</p>
                @if (revenueSummary()?.growthPercentage) {
                  <p class="text-xs mt-1" [class]="revenueSummary()!.growthPercentage >= 0 ? 'text-green-600' : 'text-red-600'">
                    {{ revenueSummary()!.growthPercentage >= 0 ? '+' : '' }}{{ revenueSummary()!.growthPercentage }}% so với tháng trước
                  </p>
                }
              </div>
              <div class="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                </svg>
              </div>
            </div>
          </div>

          <!-- Available Balance -->
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600">Có thể rút</p>
                <p class="text-2xl font-bold text-purple-600 mt-2">{{ formatCurrency(payoutBalance()?.availableBalance || 0) }}</p>
                @if (payoutBalance()?.pendingBalance && payoutBalance()!.pendingBalance > 0) {
                  <p class="text-xs text-yellow-600 mt-1">
                    {{ formatCurrency(payoutBalance()!.pendingBalance) }} đang chờ
                  </p>
                }
              </div>
              <div class="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                </svg>
              </div>
            </div>
          </div>

          <!-- Courses Sold -->
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600">Khóa học đã bán</p>
                <p class="text-2xl font-bold text-orange-600 mt-2">{{ revenueSummary()?.totalCoursesSold || 0 }}</p>
              </div>
              <div class="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions Bar -->
        <div class="bg-white rounded-lg shadow p-4 mb-6 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <a routerLink="/teacher/revenue/payouts" 
               class="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
              Lịch sử rút tiền
            </a>
          </div>
          <button (click)="openPayoutModal()"
                  [disabled]="!canRequestPayout()"
                  class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
            Yêu cầu rút tiền
          </button>
        </div>

        <!-- Revenue History Table -->
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <div class="p-4 border-b border-gray-200">
            <h2 class="text-lg font-semibold text-gray-900">Lịch sử doanh thu</h2>
          </div>
          
          @if (isLoading()) {
            <div class="p-12 text-center">
              <div class="inline-block">
                <div class="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
              <p class="mt-4 text-sm text-gray-600">Đang tải dữ liệu...</p>
            </div>
          } @else if (revenueHistory().length > 0) {
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Khóa học</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Học viên</th>
                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Doanh thu</th>
                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Phí nền tảng</th>
                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Thực nhận</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Ngày</th>
                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Trạng thái</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-100">
                  @for (item of revenueHistory(); track item.id) {
                    <tr class="hover:bg-gray-50">
                      <td class="px-6 py-4">
                        <div class="text-sm font-medium text-gray-900">{{ item.courseName }}</div>
                      </td>
                      <td class="px-6 py-4 text-sm text-gray-600">{{ item.studentName }}</td>
                      <td class="px-6 py-4 text-sm text-gray-900 text-right">{{ formatCurrency(item.amount) }}</td>
                      <td class="px-6 py-4 text-sm text-red-600 text-right">-{{ formatCurrency(item.platformFee) }}</td>
                      <td class="px-6 py-4 text-sm font-medium text-green-600 text-right">{{ formatCurrency(item.netAmount) }}</td>
                      <td class="px-6 py-4 text-sm text-gray-600">{{ formatDate(item.transactionDate) }}</td>
                      <td class="px-6 py-4 text-center">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                              [class]="getStatusClass(item.status)">
                          {{ getStatusLabel(item.status) }}
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <div class="p-12 text-center">
              <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
              <h3 class="text-base font-medium text-gray-900 mb-2">Chưa có doanh thu</h3>
              <p class="text-sm text-gray-600">Khi có học viên mua khóa học, doanh thu sẽ hiển thị ở đây</p>
            </div>
          }
        </div>
      </div>
    </div>

    <!-- Payout Request Modal -->
    @if (showPayoutModal()) {
      <div class="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50" (click)="closePayoutModal()">
        <div class="flex items-center justify-center min-h-screen p-4">
          <div class="bg-white rounded-xl shadow-xl max-w-md w-full p-6" (click)="$event.stopPropagation()">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Yêu cầu rút tiền</h3>
            
            <div class="mb-4 p-3 bg-blue-50 rounded-lg">
              <p class="text-sm text-blue-800">
                Số dư có thể rút: <strong>{{ formatCurrency(payoutBalance()?.availableBalance || 0) }}</strong>
              </p>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Số tiền rút</label>
                <input type="number" 
                       [(ngModel)]="payoutAmount"
                       [max]="payoutBalance()?.availableBalance || 0"
                       [min]="payoutBalance()?.minWithdrawAmount || 50000"
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                       placeholder="Nhập số tiền...">
                <p class="text-xs text-gray-500 mt-1">Tối thiểu: {{ formatCurrency(payoutBalance()?.minWithdrawAmount || 50000) }}</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Tên ngân hàng</label>
                <input type="text" 
                       [(ngModel)]="payoutBankName"
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                       placeholder="VD: Vietcombank, Techcombank...">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Số tài khoản</label>
                <input type="text" 
                       [(ngModel)]="payoutBankAccount"
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                       placeholder="Nhập số tài khoản...">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Ghi chú (tùy chọn)</label>
                <textarea [(ngModel)]="payoutNote"
                          rows="2"
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Ghi chú thêm..."></textarea>
              </div>
            </div>

            <div class="mt-6 flex gap-3">
              <button (click)="closePayoutModal()"
                      class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                Hủy
              </button>
              <button (click)="submitPayoutRequest()"
                      [disabled]="!isPayoutFormValid()"
                      class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
                Gửi yêu cầu
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class TeacherRevenueDashboardComponent implements OnInit {
    private revenueService = inject(TeacherRevenueService);

    // Signals from service
    revenueSummary = this.revenueService.revenueSummary;
    revenueHistory = this.revenueService.revenueHistory;
    payoutBalance = this.revenueService.payoutBalance;
    isLoading = this.revenueService.isLoading;

    // Modal state
    showPayoutModal = signal(false);
    payoutAmount = 0;
    payoutBankName = '';
    payoutBankAccount = '';
    payoutNote = '';

    ngOnInit(): void {
        console.log('[REVENUE DASHBOARD] Initializing...');
        this.loadData();
    }

    private loadData(): void {
        this.revenueService.loadDashboardData()
            .then(() => console.log('[REVENUE DASHBOARD] Data loaded'))
            .catch(err => console.error('[REVENUE DASHBOARD] Error loading data:', err));
    }

    canRequestPayout(): boolean {
        const balance = this.payoutBalance();
        if (!balance) return false;
        return balance.availableBalance >= (balance.minWithdrawAmount || 50000);
    }

    openPayoutModal(): void {
        this.payoutAmount = this.payoutBalance()?.availableBalance || 0;
        this.showPayoutModal.set(true);
    }

    closePayoutModal(): void {
        this.showPayoutModal.set(false);
        this.payoutAmount = 0;
        this.payoutBankName = '';
        this.payoutBankAccount = '';
        this.payoutNote = '';
    }

    isPayoutFormValid(): boolean {
        const balance = this.payoutBalance();
        if (!balance) return false;

        return (
            this.payoutAmount >= (balance.minWithdrawAmount || 50000) &&
            this.payoutAmount <= balance.availableBalance &&
            this.payoutBankName.trim().length > 0 &&
            this.payoutBankAccount.trim().length >= 6
        );
    }

    submitPayoutRequest(): void {
        if (!this.isPayoutFormValid()) return;

        this.revenueService.requestPayout({
            amount: this.payoutAmount,
            bankName: this.payoutBankName,
            bankAccount: this.payoutBankAccount,
            note: this.payoutNote || undefined
        }).subscribe({
            next: (response) => {
                alert(response.message);
                this.closePayoutModal();
                this.loadData(); // Refresh data
            },
            error: (error) => {
                alert('Lỗi: ' + (error.message || 'Không thể gửi yêu cầu rút tiền'));
            }
        });
    }

    // Helper methods
    formatCurrency(amount: number): string {
        return this.revenueService.formatCurrency(amount);
    }

    formatDate(dateString: string): string {
        return this.revenueService.formatDate(dateString);
    }

    getStatusClass(status: string): string {
        return this.revenueService.getStatusClass(status);
    }

    getStatusLabel(status: string): string {
        return this.revenueService.getStatusLabel(status);
    }
}
