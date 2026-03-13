import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiClient } from '../../../../api/client/api-client';
import { ToastService } from '../../../../core/services/toast.service';

interface PayoutListItem {
    id: string;
    teacherId: string;
    amount: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
    teacherNote?: string;
    adminNote?: string;
    requestedAt: string;
    processedAt?: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-admin-payouts',
    imports: [FormsModule],
    template: `
    <div class="min-h-screen bg-slate-50 p-6">
      <div class="max-w-7xl mx-auto">
        <!-- Header -->
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">Quản lý rút tiền</h1>
          <p class="text-gray-600 mt-1">Duyệt và xử lý các yêu cầu rút tiền của giảng viên</p>
        </div>

        <!-- Status Tabs -->
        <div class="bg-white rounded-xl border border-gray-200 mb-6">
          <div class="flex border-b border-gray-200">
            @for (tab of statusTabs; track tab.value) {
              <button (click)="changeStatus(tab.value)"
                      [class]="'px-5 py-3.5 text-sm font-medium transition-colors ' +
                        (activeStatus() === tab.value
                          ? 'text-[#0056D2] border-b-2 border-[#0056D2] -mb-px'
                          : 'text-gray-600 hover:text-gray-900')">
                {{ tab.label }}
                @if (tab.value === 'PENDING' && pendingCount() > 0) {
                  <span class="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">{{ pendingCount() }}</span>
                }
              </button>
            }
          </div>
        </div>

        <!-- Payouts Table -->
        <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
          @if (isLoading()) {
            <div class="p-12 text-center">
              <div class="w-10 h-10 border-4 border-gray-200 border-t-[#0056D2] rounded-full animate-spin mx-auto"></div>
              <p class="mt-4 text-sm text-gray-600">Đang tải...</p>
            </div>
          } @else if (payouts().length === 0) {
            <div class="p-12 text-center">
              <svg class="w-14 h-14 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              <p class="text-sm text-gray-500">Không có yêu cầu nào trong trạng thái này</p>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã yêu cầu</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teacher ID</th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Số tiền</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ghi chú GV</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày yêu cầu</th>
                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  @for (payout of payouts(); track payout.id) {
                    <tr class="hover:bg-gray-50">
                      <td class="px-4 py-3">
                        <span class="text-xs font-mono text-gray-700">{{ payout.id.slice(0, 8).toUpperCase() }}</span>
                      </td>
                      <td class="px-4 py-3">
                        <span class="text-xs font-mono text-gray-500">{{ payout.teacherId.slice(0, 8) }}...</span>
                      </td>
                      <td class="px-4 py-3 text-right">
                        <span class="font-semibold text-gray-900">{{ formatCurrency(payout.amount) }}</span>
                      </td>
                      <td class="px-4 py-3 text-sm text-gray-600 max-w-[180px] truncate" [title]="payout.teacherNote || ''">
                        {{ payout.teacherNote || '—' }}
                      </td>
                      <td class="px-4 py-3 text-sm text-gray-600">{{ formatDate(payout.requestedAt) }}</td>
                      <td class="px-4 py-3 text-center">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                              [class]="getStatusClass(payout.status)">
                          {{ getStatusLabel(payout.status) }}
                        </span>
                        @if (payout.adminNote) {
                          <div class="text-xs text-gray-500 mt-1 max-w-[150px] truncate mx-auto" [title]="payout.adminNote">
                            {{ payout.adminNote }}
                          </div>
                        }
                      </td>
                      <td class="px-4 py-3 text-center">
                        <div class="flex items-center justify-center gap-2">
                          @if (payout.status === 'PENDING') {
                            <button (click)="openApprove(payout)"
                                    class="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors">
                              Duyệt
                            </button>
                            <button (click)="openReject(payout)"
                                    class="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors">
                              Từ chối
                            </button>
                          }
                          @if (payout.status === 'APPROVED') {
                            <button (click)="complete(payout.id)"
                                    class="px-3 py-1.5 bg-[#0056D2] text-white text-xs rounded-lg hover:bg-[#004BB5] transition-colors">
                              Xác nhận đã CK
                            </button>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            <div class="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <p class="text-sm text-gray-600">Trang {{ currentPage() + 1 }}</p>
              <div class="flex gap-2">
                <button (click)="prevPage()" [disabled]="currentPage() === 0"
                        class="px-3 py-1.5 border border-gray-300 text-sm rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">
                  ← Trước
                </button>
                <button (click)="nextPage()" [disabled]="!hasMore()"
                        class="px-3 py-1.5 border border-gray-300 text-sm rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">
                  Tiếp →
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>

    <!-- Approve Modal -->
    @if (approveTarget()) {
      <div class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Duyệt yêu cầu rút tiền</h3>
          <p class="text-sm text-gray-600 mb-4">
            Duyệt yêu cầu rút <strong>{{ formatCurrency(approveTarget()!.amount) }}</strong>?
          </p>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Ghi chú (tuỳ chọn)</label>
            <textarea [(ngModel)]="actionNote" rows="2"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2] text-sm"
                      placeholder="Ghi chú cho giảng viên..."></textarea>
          </div>
          <div class="mt-5 flex gap-3">
            <button (click)="approveTarget.set(null)"
                    class="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              Hủy
            </button>
            <button (click)="submitApprove()"
                    class="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              Xác nhận duyệt
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Reject Modal -->
    @if (rejectTarget()) {
      <div class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Từ chối yêu cầu rút tiền</h3>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Lý do từ chối <span class="text-red-500">*</span></label>
            <textarea [(ngModel)]="actionNote" rows="3"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                      placeholder="Lý do từ chối..."></textarea>
          </div>
          <div class="mt-5 flex gap-3">
            <button (click)="rejectTarget.set(null)"
                    class="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              Hủy
            </button>
            <button (click)="submitReject()" [disabled]="!actionNote.trim()"
                    class="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
              Xác nhận từ chối
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class AdminPayoutsComponent implements OnInit {
    private api = inject(ApiClient);
    private toast = inject(ToastService);

    payouts = signal<PayoutListItem[]>([]);
    isLoading = signal(false);
    activeStatus = signal<string>('PENDING');
    currentPage = signal(0);
    hasMore = signal(false);
    pendingCount = signal(0);

    // Action modals
    approveTarget = signal<PayoutListItem | null>(null);
    rejectTarget  = signal<PayoutListItem | null>(null);
    actionNote    = '';

    readonly statusTabs = [
        { value: 'PENDING',   label: 'Chờ duyệt' },
        { value: 'APPROVED',  label: 'Đã duyệt' },
        { value: 'COMPLETED', label: 'Hoàn thành' },
        { value: 'REJECTED',  label: 'Đã từ chối' },
    ];

    ngOnInit(): void {
        this.loadPayouts();
        this.loadPendingCount();
    }

    changeStatus(status: string): void {
        this.activeStatus.set(status);
        this.currentPage.set(0);
        this.loadPayouts();
    }

    private loadPayouts(): void {
        this.isLoading.set(true);
        this.api.getWithResponse<any>(
            `/api/v3/admin/revenue/payouts?status=${this.activeStatus()}&page=${this.currentPage()}&size=20`
        ).subscribe({
            next: (r) => {
                const page = r.data;
                this.payouts.set(page?.content ?? []);
                this.hasMore.set(page && !page.last);
                this.isLoading.set(false);
            },
            error: () => { this.isLoading.set(false); this.toast.error('Không thể tải danh sách yêu cầu rút tiền'); }
        });
    }

    private loadPendingCount(): void {
        this.api.getWithResponse<any>('/api/v3/admin/revenue/payouts?status=PENDING&page=0&size=1')
            .subscribe({ next: (r) => this.pendingCount.set(r.data?.totalElements ?? 0), error: () => {} });
    }

    prevPage(): void {
        if (this.currentPage() > 0) {
            this.currentPage.update(p => p - 1);
            this.loadPayouts();
        }
    }

    nextPage(): void {
        if (this.hasMore()) {
            this.currentPage.update(p => p + 1);
            this.loadPayouts();
        }
    }

    openApprove(payout: PayoutListItem): void {
        this.actionNote = '';
        this.approveTarget.set(payout);
    }

    openReject(payout: PayoutListItem): void {
        this.actionNote = '';
        this.rejectTarget.set(payout);
    }

    submitApprove(): void {
        const target = this.approveTarget();
        if (!target) return;
        this.api.postWithResponse<any>(
            `/api/v3/admin/revenue/payouts/${target.id}/approve`,
            { adminNote: this.actionNote || null }
        ).subscribe({
            next: () => {
                this.approveTarget.set(null);
                this.toast.success('Đã duyệt yêu cầu rút tiền');
                this.loadPayouts();
                this.loadPendingCount();
            },
            error: (e) => this.toast.error('Lỗi: ' + (e?.error?.message || 'Không thể duyệt'))
        });
    }

    submitReject(): void {
        const target = this.rejectTarget();
        if (!target || !this.actionNote.trim()) return;
        this.api.postWithResponse<any>(
            `/api/v3/admin/revenue/payouts/${target.id}/reject`,
            { adminNote: this.actionNote }
        ).subscribe({
            next: () => {
                this.rejectTarget.set(null);
                this.toast.success('Đã từ chối yêu cầu rút tiền');
                this.loadPayouts();
                this.loadPendingCount();
            },
            error: (e) => this.toast.error('Lỗi: ' + (e?.error?.message || 'Không thể từ chối'))
        });
    }

    complete(id: string): void {
        this.api.postWithResponse<any>(`/api/v3/admin/revenue/payouts/${id}/complete`, {}).subscribe({
            next: () => {
                this.toast.success('Đã xác nhận chuyển khoản thành công');
                this.loadPayouts();
            },
            error: (e) => this.toast.error('Lỗi: ' + (e?.error?.message || 'Không thể cập nhật'))
        });
    }

    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    }

    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    }

    getStatusClass(status: string): string {
        const map: Record<string, string> = {
            'COMPLETED': 'bg-green-100 text-green-800',
            'PENDING':   'bg-yellow-100 text-yellow-800',
            'APPROVED':  'bg-[#0056D2]/10 text-[#004BB5]',
            'REJECTED':  'bg-red-100 text-red-800',
        };
        return map[status] || 'bg-gray-100 text-gray-800';
    }

    getStatusLabel(status: string): string {
        const map: Record<string, string> = {
            'COMPLETED': 'Hoàn thành',
            'PENDING':   'Chờ duyệt',
            'APPROVED':  'Đã duyệt',
            'REJECTED':  'Từ chối',
        };
        return map[status] || status;
    }
}
