import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PaymentService } from '../../payment/payment.service';
import { PaymentResponse, PaymentStatus } from '../../../api/client/payment.api';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-student-payment-history',
  imports: [CommonModule, RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-gray-900">Lịch sử thanh toán</h1>
        <p class="text-gray-500 mt-1">Quản lý và theo dõi các giao dịch của bạn</p>
      </div>

      <!-- Loading -->
      @if (isLoading()) {
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <div class="animate-spin w-10 h-10 border-4 border-[#0056D2] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p class="text-gray-500">Đang tải lịch sử thanh toán...</p>
        </div>
      }

      <!-- Empty State -->
      @if (!isLoading() && payments().length === 0) {
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <app-icon name="briefcase" size="lg" class="text-gray-400"/>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Chưa có giao dịch nào</h3>
          <p class="text-gray-500 mb-6">Bạn chưa thực hiện thanh toán khóa học nào.</p>
          <a routerLink="/courses" class="inline-flex items-center px-4 py-2 bg-[#0056D2] text-white rounded-lg font-medium hover:bg-[#004BB5] transition-colors">
            <app-icon name="search" size="sm" class="mr-2"/> Khám phá khóa học
          </a>
        </div>
      }

      <!-- Payment List -->
      @if (!isLoading() && payments().length > 0) {
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p class="text-sm text-gray-500">Tổng giao dịch</p>
            <p class="text-2xl font-bold text-gray-900 mt-1">{{ payments().length }}</p>
          </div>
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p class="text-sm text-gray-500">Thành công</p>
            <p class="text-2xl font-bold text-emerald-600 mt-1">{{ completedCount() }}</p>
          </div>
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p class="text-sm text-gray-500">Tổng chi tiêu</p>
            <p class="text-2xl font-bold text-[#0056D2] mt-1">{{ totalSpent() | number:'1.0-0' }}₫</p>
          </div>
        </div>

        <!-- Table -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-200">
                  <th class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Khóa học</th>
                  <th class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Số tiền</th>
                  <th class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Trạng thái</th>
                  <th class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Phương thức</th>
                  <th class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Ngày</th>
                  <th class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Mã GD</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                @for (payment of payments(); track payment.id) {
                  <tr class="hover:bg-gray-50 transition-colors">
                    <td class="px-6 py-4">
                      @if (payment.courseTitle) {
                        <a [routerLink]="['/courses', payment.courseId]" class="text-sm font-medium text-[#0056D2] hover:underline">
                          {{ payment.courseTitle }}
                        </a>
                      } @else {
                        <span class="text-sm text-gray-500">Khóa học</span>
                      }
                    </td>
                    <td class="px-6 py-4">
                      <span class="text-sm font-semibold text-gray-900">{{ payment.amount | number:'1.0-0' }}₫</span>
                    </td>
                    <td class="px-6 py-4">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                            [ngClass]="getStatusClass(payment.status)">
                        {{ getStatusLabel(payment.status) }}
                      </span>
                    </td>
                    <td class="px-6 py-4">
                      <span class="text-sm text-gray-600">{{ getMethodLabel(payment.paymentMethod) }}</span>
                    </td>
                    <td class="px-6 py-4">
                      <span class="text-sm text-gray-500">{{ formatDate(payment.paidAt || payment.createdAt) }}</span>
                    </td>
                    <td class="px-6 py-4">
                      <span class="text-xs font-mono text-gray-400">{{ payment.transactionId || '—' }}</span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `
})
export class StudentPaymentHistoryComponent implements OnInit {
  private paymentService = inject(PaymentService);

  payments = signal<PaymentResponse[]>([]);
  isLoading = signal(true);

  completedCount = signal(0);
  totalSpent = signal(0);

  async ngOnInit(): Promise<void> {
    this.isLoading.set(true);
    try {
      const history = await this.paymentService.getPaymentHistory();
      this.payments.set(history);
      this.completedCount.set(history.filter(p => p.status === 'COMPLETED').length);
      this.totalSpent.set(
        history
          .filter(p => p.status === 'COMPLETED')
          .reduce((sum, p) => sum + (p.amount || 0), 0)
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  getStatusClass(status: PaymentStatus | string): string {
    const map: Record<string, string> = {
      'COMPLETED': 'bg-emerald-100 text-emerald-800',
      'PENDING': 'bg-amber-100 text-amber-800',
      'FAILED': 'bg-red-100 text-red-800',
      'EXPIRED': 'bg-gray-100 text-gray-800',
      'REFUNDED': 'bg-blue-100 text-blue-800'
    };
    return map[status] || 'bg-gray-100 text-gray-600';
  }

  getStatusLabel(status: PaymentStatus | string): string {
    const map: Record<string, string> = {
      'COMPLETED': 'Thành công',
      'PENDING': 'Đang xử lý',
      'FAILED': 'Thất bại',
      'EXPIRED': 'Hết hạn',
      'REFUNDED': 'Hoàn tiền'
    };
    return map[status] || status;
  }

  getMethodLabel(method: string | null | undefined): string {
    if (!method) return '—';
    const map: Record<string, string> = {
      'VNPAY': 'VNPay',
      'SIMULATED': 'Demo',
      'BANK_TRANSFER': 'Chuyển khoản',
      'MOMO': 'MoMo',
      'ZALOPAY': 'ZaloPay'
    };
    return map[method] || method;
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  }
}
