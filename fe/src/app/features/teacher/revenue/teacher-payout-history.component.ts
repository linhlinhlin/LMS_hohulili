import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TeacherRevenueService, PayoutHistoryItem } from '../infrastructure/services/teacher-revenue.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-teacher-payout-history',
    imports: [RouterModule, FormsModule],
    template: `
    <div class="min-h-screen bg-slate-50 p-6">
      <div class="max-w-6xl mx-auto">
        <!-- Header -->
        <div class="mb-6">
          <a routerLink="/teacher/revenue" class="text-sm text-[#0056D2] hover:text-[#004BB5] flex items-center gap-1 mb-4">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Quay lại Doanh thu
          </a>
          <h1 class="text-2xl font-bold text-gray-900">Lịch sử rút tiền</h1>
          <p class="text-gray-600 mt-1">Theo dõi các yêu cầu rút tiền của bạn</p>
        </div>

        <!-- Filter -->
        <div class="bg-white rounded-lg shadow p-4 mb-6">
          <div class="flex items-center gap-4">
            <label class="text-sm font-medium text-gray-700">Trạng thái:</label>
            <select [(ngModel)]="statusFilter"
                    (change)="onFilterChange()"
                    class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2]">
              <option value="">Tất cả</option>
              <option value="PENDING">Chờ duyệt</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="COMPLETED">Hoàn thành</option>
              <option value="REJECTED">Bị từ chối</option>
            </select>
          </div>
        </div>

        <!-- Payout History Table -->
        <div class="bg-white rounded-lg shadow overflow-hidden">
          @if (isLoading()) {
            <div class="p-12 text-center">
              <div class="w-10 h-10 border-4 border-gray-200 border-t-[#0056D2] rounded-full animate-spin mx-auto"></div>
              <p class="mt-4 text-sm text-gray-600">Đang tải dữ liệu...</p>
            </div>
          } @else if (filteredPayouts().length > 0) {
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Mã yêu cầu</th>
                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Số tiền</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Ngân hàng</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Số tài khoản</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Ngày yêu cầu</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Ngày xử lý</th>
                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Trạng thái</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-100">
                  @for (payout of filteredPayouts(); track payout.id) {
                    <tr class="hover:bg-gray-50">
                      <td class="px-6 py-4">
                        <span class="text-sm font-mono text-gray-900">{{ payout.id.slice(0, 8).toUpperCase() }}</span>
                      </td>
                      <td class="px-6 py-4 text-right">
                        <span class="text-sm font-semibold text-gray-900">{{ formatCurrency(payout.amount) }}</span>
                      </td>
                      <td class="px-6 py-4 text-sm text-gray-600">{{ getBankDisplayName(payout.bankCode) }}</td>
                      <td class="px-6 py-4 text-sm font-mono text-gray-600">{{ payout.accountNumberMasked || '—' }}</td>
                      <td class="px-6 py-4 text-sm text-gray-600">{{ formatDate(payout.requestedAt) }}</td>
                      <td class="px-6 py-4 text-sm text-gray-600">
                        {{ payout.processedAt ? formatDate(payout.processedAt) : '—' }}
                      </td>
                      <td class="px-6 py-4 text-center">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                              [class]="getStatusClass(payout.status)">
                          {{ getStatusLabel(payout.status) }}
                        </span>
                        @if (payout.adminNote) {
                          <div class="text-xs text-red-600 mt-1 max-w-[150px] truncate mx-auto" [title]="payout.adminNote">
                            {{ payout.adminNote }}
                          </div>
                        }
                        @if (payout.status === 'PENDING') {
                          <button (click)="cancelPayout(payout.id)"
                                  class="mt-1.5 text-xs text-red-500 hover:text-red-700 underline transition-colors">
                            Hủy yêu cầu
                          </button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <div class="p-12 text-center">
              <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
              <h3 class="text-base font-medium text-gray-900 mb-2">Chưa có yêu cầu rút tiền</h3>
              <p class="text-sm text-gray-600 mb-4">Khi bạn yêu cầu rút tiền, lịch sử sẽ hiển thị ở đây</p>
              <a routerLink="/teacher/revenue"
                 class="inline-flex items-center px-4 py-2 bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5] transition-colors">
                Quay lại Doanh thu
              </a>
            </div>
          }
        </div>

        <!-- Summary Stats -->
        @if (payoutHistory().length > 0) {
          <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-white rounded-lg shadow p-4">
              <p class="text-sm text-gray-600">Tổng đã rút</p>
              <p class="text-xl font-bold text-green-600 mt-1">{{ formatCurrency(totalWithdrawn()) }}</p>
            </div>
            <div class="bg-white rounded-lg shadow p-4">
              <p class="text-sm text-gray-600">Đang xử lý</p>
              <p class="text-xl font-bold text-yellow-600 mt-1">{{ formatCurrency(pendingAmount()) }}</p>
            </div>
            <div class="bg-white rounded-lg shadow p-4">
              <p class="text-sm text-gray-600">Số lần rút</p>
              <p class="text-xl font-bold text-[#0056D2] mt-1">{{ completedCount() }} lần</p>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class TeacherPayoutHistoryComponent implements OnInit {
    private revenueService = inject(TeacherRevenueService);
    private toast = inject(ToastService);

    payoutHistory = this.revenueService.payoutHistory;
    isLoading = this.revenueService.isLoading;

    statusFilter = '';
    filteredPayouts = signal<PayoutHistoryItem[]>([]);

    ngOnInit(): void {
        this.loadData();
    }

    private loadData(): void {
        this.revenueService.getPayoutHistory().subscribe({
            next: () => this.applyFilter(),
            error: () => this.toast.error('Không thể tải lịch sử rút tiền. Vui lòng thử lại.')
        });
    }

    onFilterChange(): void { this.applyFilter(); }

    private applyFilter(): void {
        const all = this.payoutHistory();
        this.filteredPayouts.set(
            !this.statusFilter ? all : all.filter(p => p.status === this.statusFilter)
        );
    }

    totalWithdrawn(): number {
        return this.payoutHistory().filter(p => p.status === 'COMPLETED').reduce((s, p) => s + p.amount, 0);
    }

    pendingAmount(): number {
        return this.payoutHistory().filter(p => p.status === 'PENDING' || p.status === 'APPROVED').reduce((s, p) => s + p.amount, 0);
    }

    completedCount(): number {
        return this.payoutHistory().filter(p => p.status === 'COMPLETED').length;
    }

    cancelPayout(id: string): void {
        this.revenueService.cancelPayout(id).subscribe({
            next: () => {
                this.toast.success('Đã hủy yêu cầu rút tiền');
                this.loadData();
            },
            error: (e) => this.toast.error('Lỗi: ' + (e?.error?.message || 'Không thể hủy yêu cầu'))
        });
    }

    getBankDisplayName(bankCode: string): string { return this.revenueService.getBankDisplayName(bankCode); }
    formatCurrency(amount: number): string       { return this.revenueService.formatCurrency(amount); }
    formatDate(dateString: string): string       { return this.revenueService.formatDate(dateString); }
    getStatusClass(status: string): string       { return this.revenueService.getStatusClass(status); }
    getStatusLabel(status: string): string       { return this.revenueService.getStatusLabel(status); }
}
