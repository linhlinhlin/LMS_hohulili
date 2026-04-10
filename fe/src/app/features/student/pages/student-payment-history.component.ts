import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PaymentService } from '../../payment/payment.service';
import { PaymentResponse } from '../../../api/client/payment.api';
import { IconComponent } from '../../../shared/components/icon/icon.component';

type FilterKey = 'ALL' | 'COMPLETED' | 'PENDING' | 'FAILED';

interface FilterTab {
  key: FilterKey;
  label: string;
  count: number;
}

@Component({
  selector: 'app-student-payment-history',
  imports: [CommonModule, RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './student-payment-history.component.html',
  styleUrl: './student-payment-history.component.scss',
})
export class StudentPaymentHistoryComponent implements OnInit {
  private paymentService = inject(PaymentService);

  // Data
  payments = signal<PaymentResponse[]>([]);
  isLoading = signal(true);
  loadError = signal<string | null>(null);

  // Filter
  activeFilter = signal<FilterKey>('ALL');

  // Computed: summary metrics
  totalCount = computed(() => this.payments().length);
  completedCount = computed(() => this.payments().filter(p => p.status === 'COMPLETED').length);
  totalSpent = computed(() =>
    this.payments()
      .filter(p => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + (p.amount || 0), 0)
  );

  // Computed: filter tabs with counts
  filterTabs = computed<FilterTab[]>(() => {
    const all = this.payments();
    return [
      { key: 'ALL' as FilterKey, label: 'Tất cả', count: all.length },
      { key: 'COMPLETED' as FilterKey, label: 'Thành công', count: all.filter(p => p.status === 'COMPLETED').length },
      { key: 'PENDING' as FilterKey, label: 'Chờ xử lý', count: all.filter(p => p.status === 'PENDING').length },
      { key: 'FAILED' as FilterKey, label: 'Thất bại', count: all.filter(p => p.status === 'FAILED' || p.status === 'EXPIRED').length },
    ];
  });

  // Computed: filtered list
  filteredPayments = computed(() => {
    const filter = this.activeFilter();
    const all = this.payments();
    if (filter === 'ALL') return all;
    if (filter === 'FAILED') return all.filter(p => p.status === 'FAILED' || p.status === 'EXPIRED');
    return all.filter(p => p.status === filter);
  });

  filteredCount = computed(() => this.filteredPayments().length);

  async ngOnInit(): Promise<void> {
    await this.loadPayments();
  }

  async loadPayments(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set(null);
    try {
      const history = await this.paymentService.getPaymentHistory();
      this.payments.set(history);
    } catch (error: any) {
      this.loadError.set(error?.message || 'Không thể tải lịch sử thanh toán.');
    } finally {
      this.isLoading.set(false);
    }
  }

  setFilter(key: FilterKey): void {
    this.activeFilter.set(key);
  }

  printPage(): void {
    window.print();
  }

  // === Format helpers ===

  formatAmount(amount: number): string {
    if (!amount) return '0₫';
    return amount.toLocaleString('vi-VN') + '₫';
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
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  }

  getStatusClass(payment: PaymentResponse): string {
    if (payment.status === 'COMPLETED' && payment.accessActivationState === 'MANUAL_ACTIVATION_REQUIRED') {
      return 'badge-warning';
    }
    if (payment.status === 'COMPLETED' && payment.accessActivationState === 'ACCESS_PENDING') {
      return 'badge-info';
    }
    const map: Record<string, string> = {
      'COMPLETED': 'badge-success',
      'PENDING': 'badge-warning',
      'FAILED': 'badge-error',
      'EXPIRED': 'badge-neutral',
      'REFUNDED': 'badge-info',
    };
    return map[payment.status] || 'badge-neutral';
  }

  getStatusLabel(payment: PaymentResponse): string {
    if (payment.status === 'COMPLETED' && payment.accessActivationState === 'MANUAL_ACTIVATION_REQUIRED') {
      return 'Chờ kích hoạt';
    }
    if (payment.status === 'COMPLETED' && payment.accessActivationState === 'ACCESS_PENDING') {
      return 'Đang kích hoạt';
    }
    const map: Record<string, string> = {
      'COMPLETED': 'Thành công',
      'PENDING': 'Đang xử lý',
      'FAILED': 'Thất bại',
      'EXPIRED': 'Hết hạn',
      'REFUNDED': 'Hoàn tiền',
    };
    return map[payment.status] || payment.status;
  }

  getMethodLabel(method: string | null | undefined): string {
    if (!method) return '—';
    const map: Record<string, string> = {
      'VNPAY': 'VNPay',
      'SEPAY': 'SePay',
      'SIMULATED': 'Demo',
      'BANK_TRANSFER': 'Chuyển khoản',
      'MOMO': 'MoMo',
      'ZALOPAY': 'ZaloPay',
    };
    return map[method] || method;
  }
}
