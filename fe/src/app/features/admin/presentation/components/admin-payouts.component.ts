import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiClient } from '../../../../api/client/api-client';
import { AuthService, UserRole } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';

interface PayoutListItem {
    id: string;
    teacherId: string;
    teacherName: string;
    teacherEmail: string;
    amount: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
    teacherNote?: string;
    adminNote?: string;
    requestedAt: string;
    processedAt?: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
}

@Component({
    selector: 'app-admin-payouts',
    imports: [FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="min-h-screen bg-slate-50 p-6">
      <div class="mx-auto max-w-7xl">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">Quản lý rút tiền</h1>
          <p class="mt-1 text-gray-600">Duyệt và xử lý các yêu cầu rút tiền của giảng viên theo đúng phạm vi quản trị.</p>
        </div>

        <div class="mb-6 rounded-xl border border-gray-200 bg-white">
          <div class="flex border-b border-gray-200">
            @for (tab of statusTabs; track tab.value) {
              <button
                (click)="changeStatus(tab.value)"
                [class]="'px-5 py-3.5 text-sm font-medium transition-colors ' + (
                  activeStatus() === tab.value
                    ? 'text-[#0056D2] border-b-2 border-[#0056D2] -mb-px'
                    : 'text-gray-600 hover:text-gray-900'
                )">
                {{ tab.label }}
                @if (tab.value === 'PENDING' && pendingCount() > 0) {
                  <span class="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-xs text-white">{{ pendingCount() }}</span>
                }
              </button>
            }
          </div>
        </div>

        @if (activeStatus() === 'APPROVED' && payouts().length > 0) {
          <div class="mb-4 flex items-start gap-3 rounded-xl border border-[#0056D2]/20 bg-[#0056D2]/5 p-4">
            <svg class="mt-0.5 h-5 w-5 flex-shrink-0 text-[#0056D2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div>
              <p class="text-sm font-medium text-[#004BB5]">Hướng dẫn xử lý</p>
              <p class="mt-0.5 text-sm text-[#004BB5]/80">
                Chuyển khoản thủ công tới tài khoản ngân hàng của giảng viên, sau đó bấm <strong>"Xác nhận đã CK"</strong> để hoàn tất.
              </p>
            </div>
          </div>
        }

        <div class="overflow-hidden rounded-xl border border-gray-200 bg-white">
          @if (isLoading()) {
            <div class="p-12 text-center">
              <div class="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#0056D2]"></div>
              <p class="mt-4 text-sm text-gray-600">Đang tải...</p>
            </div>
          } @else if (payouts().length === 0) {
            <div class="p-12 text-center">
              <svg class="mx-auto mb-4 h-14 w-14 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              <p class="text-sm text-gray-500">Không có yêu cầu nào trong trạng thái này</p>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Mã YC</th>
                    <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Giảng viên</th>
                    <th class="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Số tiền</th>
                    <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Tài khoản nhận</th>
                    <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Ghi chú GV</th>
                    <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Ngày yêu cầu</th>
                    <th class="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Trạng thái</th>
                    <th class="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Thao tác</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  @for (payout of payouts(); track payout.id) {
                    <tr class="hover:bg-gray-50">
                      <td class="px-4 py-3">
                        <span class="text-xs font-mono text-gray-700">{{ payout.id.slice(0, 8).toUpperCase() }}</span>
                      </td>
                      <td class="px-4 py-3">
                        <p class="text-sm font-medium text-gray-900">{{ payout.teacherName }}</p>
                        <p class="text-xs text-gray-500">{{ payout.teacherEmail }}</p>
                      </td>
                      <td class="px-4 py-3 text-right">
                        <span class="font-semibold text-gray-900">{{ formatCurrency(payout.amount) }}</span>
                      </td>
                      <td class="px-4 py-3">
                        <div class="flex items-center gap-1.5">
                          <div>
                            <p class="text-xs font-semibold text-gray-900">{{ getBankName(payout.bankCode) }}</p>
                            <div class="mt-0.5 flex items-center gap-1">
                              <span class="text-xs font-mono text-gray-700">{{ payout.accountNumber }}</span>
                              @if (isSystemAdmin()) {
                                <button
                                  (click)="copy(payout.accountNumber)"
                                  title="Sao chép số tài khoản"
                                  class="text-[#0056D2] transition-colors hover:text-[#004BB5]">
                                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2"/>
                                  </svg>
                                </button>
                              }
                            </div>
                            <p class="text-xs text-gray-500">{{ payout.accountName }}</p>
                          </div>
                        </div>
                      </td>
                      <td class="max-w-[160px] truncate px-4 py-3 text-sm text-gray-600" [title]="payout.teacherNote || ''">
                        {{ payout.teacherNote || '—' }}
                      </td>
                      <td class="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{{ formatDate(payout.requestedAt) }}</td>
                      <td class="px-4 py-3 text-center">
                        <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                              [class]="getStatusClass(payout.status)">
                          {{ getStatusLabel(payout.status) }}
                        </span>
                        @if (payout.status === 'CANCELLED') {
                          <div class="mx-auto mt-1 max-w-[190px] text-xs text-slate-500">
                            Giảng viên đã chủ động hủy yêu cầu. Số dư đã được hoàn lại.
                          </div>
                        }
                        @if (payout.adminNote) {
                          <div class="mx-auto mt-1 max-w-[190px] truncate text-xs"
                               [class.text-slate-500]="payout.status === 'CANCELLED'"
                               [class.text-gray-500]="payout.status !== 'CANCELLED'"
                               [title]="payout.adminNote">
                            {{ payout.adminNote }}
                          </div>
                        }
                      </td>
                      <td class="px-4 py-3 text-center">
                        <div class="flex items-center justify-center gap-2">
                          @if (payout.status === 'PENDING') {
                            <button
                              (click)="openApprove(payout)"
                              class="rounded-lg bg-green-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-green-700">
                              Duyệt
                            </button>
                            <button
                              (click)="openReject(payout)"
                              class="rounded-lg bg-red-500 px-3 py-1.5 text-xs text-white transition-colors hover:bg-red-600">
                              Từ chối
                            </button>
                          }
                          @if (payout.status === 'APPROVED' && isSystemAdmin()) {
                            <button
                              (click)="complete(payout)"
                              class="rounded-lg bg-[#0056D2] px-3 py-1.5 text-xs text-white transition-colors hover:bg-[#004BB5]">
                              Xác nhận đã CK
                            </button>
                          }
                          @if (payout.status === 'APPROVED' && !isSystemAdmin()) {
                            <span class="text-xs italic text-gray-400">Chờ admin hoàn tất</span>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="flex items-center justify-between border-t border-gray-200 px-4 py-3">
              <p class="text-sm text-gray-600">Trang {{ currentPage() + 1 }}</p>
              <div class="flex gap-2">
                <button
                  (click)="prevPage()"
                  [disabled]="currentPage() === 0"
                  class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm transition-colors hover:bg-gray-50 disabled:opacity-40">
                  ← Trước
                </button>
                <button
                  (click)="nextPage()"
                  [disabled]="!hasMore()"
                  class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm transition-colors hover:bg-gray-50 disabled:opacity-40">
                  Tiếp →
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>

    @if (copyFeedback() && isSystemAdmin()) {
      <div class="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">
        Đã sao chép số tài khoản
      </div>
    }

    @if (approveTarget()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
          <h3 class="mb-2 text-lg font-semibold text-gray-900">Duyệt yêu cầu rút tiền</h3>

          <div class="mb-4 space-y-1.5 rounded-xl bg-gray-50 p-3 text-sm">
            <p class="font-medium text-gray-900">{{ approveTarget()!.teacherName }}</p>
            <p class="text-gray-600">{{ getBankName(approveTarget()!.bankCode) }} · <span class="font-mono">{{ approveTarget()!.accountNumber }}</span></p>
            <p class="text-gray-600">{{ approveTarget()!.accountName }}</p>
            <p class="mt-1 text-lg font-bold text-green-600">{{ formatCurrency(approveTarget()!.amount) }}</p>
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Ghi chú (tùy chọn)</label>
            <textarea
              [(ngModel)]="actionNote"
              rows="2"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0056D2] focus:ring-2 focus:ring-[#0056D2]"
              placeholder="Ghi chú cho giảng viên..."></textarea>
          </div>
          <div class="mt-5 flex gap-3">
            <button
              (click)="approveTarget.set(null)"
              class="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700 transition-colors hover:bg-gray-50">
              Hủy
            </button>
            <button
              (click)="submitApprove()"
              class="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-white transition-colors hover:bg-green-700">
              Xác nhận duyệt
            </button>
          </div>
        </div>
      </div>
    }

    @if (rejectTarget()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
          <h3 class="mb-2 text-lg font-semibold text-gray-900">Từ chối yêu cầu rút tiền</h3>
          <p class="mb-4 text-sm text-gray-500">{{ rejectTarget()!.teacherName }} · {{ formatCurrency(rejectTarget()!.amount) }}</p>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Lý do từ chối <span class="text-red-500">*</span></label>
            <textarea
              [(ngModel)]="actionNote"
              rows="3"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500"
              placeholder="Lý do từ chối..."></textarea>
          </div>
          <div class="mt-5 flex gap-3">
            <button
              (click)="rejectTarget.set(null)"
              class="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700 transition-colors hover:bg-gray-50">
              Hủy
            </button>
            <button
              (click)="submitReject()"
              [disabled]="!actionNote.trim()"
              class="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400">
              Xác nhận từ chối
            </button>
          </div>
        </div>
      </div>
    }

    @if (completeTarget()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
          <h3 class="mb-2 text-lg font-semibold text-gray-900">Xác nhận đã chuyển khoản</h3>
          <p class="mb-4 text-sm text-gray-600">Xác nhận bạn đã chuyển khoản thành công cho:</p>
          <div class="space-y-1.5 rounded-xl border border-green-200 bg-green-50 p-3 text-sm">
            <p class="font-semibold text-gray-900">{{ completeTarget()!.teacherName }}</p>
            <p class="text-gray-700">{{ getBankName(completeTarget()!.bankCode) }} · <span class="font-mono font-semibold">{{ completeTarget()!.accountNumber }}</span></p>
            <p class="text-gray-600">{{ completeTarget()!.accountName }}</p>
            <p class="mt-2 text-2xl font-bold text-green-700">{{ formatCurrency(completeTarget()!.amount) }}</p>
          </div>
          <div class="mt-5 flex gap-3">
            <button
              (click)="completeTarget.set(null)"
              class="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700 transition-colors hover:bg-gray-50">
              Hủy
            </button>
            <button
              (click)="submitComplete()"
              class="flex-1 rounded-lg bg-[#0056D2] px-4 py-2.5 text-white transition-colors hover:bg-[#004BB5]">
              Xác nhận đã CK
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
    private authService = inject(AuthService);

    payouts = signal<PayoutListItem[]>([]);
    isLoading = signal(false);
    activeStatus = signal<string>('PENDING');
    currentPage = signal(0);
    hasMore = signal(false);
    pendingCount = signal(0);
    copyFeedback = signal(false);

    approveTarget = signal<PayoutListItem | null>(null);
    rejectTarget = signal<PayoutListItem | null>(null);
    completeTarget = signal<PayoutListItem | null>(null);
    actionNote = '';

    isSystemAdmin = computed(() => this.authService.currentUser()?.role === UserRole.ADMIN);

    readonly statusTabs = [
        { value: 'PENDING', label: 'Chờ duyệt' },
        { value: 'APPROVED', label: 'Đã duyệt' },
        { value: 'COMPLETED', label: 'Hoàn thành' },
        { value: 'REJECTED', label: 'Đã từ chối' },
        { value: 'CANCELLED', label: 'Đã hủy' },
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
            next: (response) => {
                const page = response.data;
                this.payouts.set(page?.content ?? []);
                this.hasMore.set(Boolean(page && !page.last));
                this.isLoading.set(false);
            },
            error: () => {
                this.isLoading.set(false);
                this.toast.error('Không thể tải danh sách yêu cầu rút tiền');
            }
        });
    }

    private loadPendingCount(): void {
        this.api.getWithResponse<any>('/api/v3/admin/revenue/payouts?status=PENDING&page=0&size=1')
            .subscribe({
                next: (response) => this.pendingCount.set(response.data?.totalElements ?? 0),
                error: () => {}
            });
    }

    prevPage(): void {
        if (this.currentPage() > 0) {
            this.currentPage.update(page => page - 1);
            this.loadPayouts();
        }
    }

    nextPage(): void {
        if (this.hasMore()) {
            this.currentPage.update(page => page + 1);
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

    complete(payout: PayoutListItem): void {
        this.completeTarget.set(payout);
    }

    submitApprove(): void {
        const target = this.approveTarget();
        if (!target) {
            return;
        }
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
            error: (error) => this.toast.error('Lỗi: ' + (error?.error?.message || 'Không thể duyệt'))
        });
    }

    submitReject(): void {
        const target = this.rejectTarget();
        if (!target || !this.actionNote.trim()) {
            return;
        }
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
            error: (error) => this.toast.error('Lỗi: ' + (error?.error?.message || 'Không thể từ chối'))
        });
    }

    submitComplete(): void {
        const target = this.completeTarget();
        if (!target) {
            return;
        }
        this.api.postWithResponse<any>(`/api/v3/admin/revenue/payouts/${target.id}/complete`, {}).subscribe({
            next: () => {
                this.completeTarget.set(null);
                this.toast.success('Đã xác nhận chuyển khoản thành công');
                this.loadPayouts();
            },
            error: (error) => this.toast.error('Lỗi: ' + (error?.error?.message || 'Không thể cập nhật'))
        });
    }

    copy(text: string): void {
        if (!this.isSystemAdmin()) {
            return;
        }
        navigator.clipboard.writeText(text).then(() => {
            this.copyFeedback.set(true);
            setTimeout(() => this.copyFeedback.set(false), 2000);
        });
    }

    getBankName(bankCode: string): string {
        const banks: Record<string, string> = {
            VCB: 'Vietcombank',
            TCB: 'Techcombank',
            MBB: 'MB Bank',
            VPB: 'VPBank',
            ACB: 'ACB',
            BID: 'BIDV',
            CTG: 'VietinBank',
            STB: 'Sacombank',
            TPB: 'TPBank',
            MSB: 'MSB',
            OCB: 'OCB',
            HDB: 'HDBank',
            VIB: 'VIB',
            SHB: 'SHB',
            EIB: 'Eximbank',
            NAB: 'Nam A Bank',
            CAKE: 'CAKE',
            UBANK: 'Ubank',
        };
        return banks[bankCode] ?? bankCode;
    }

    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    }

    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getStatusClass(status: string): string {
        const map: Record<string, string> = {
            COMPLETED: 'bg-green-100 text-green-800',
            PENDING: 'bg-yellow-100 text-yellow-800',
            APPROVED: 'bg-[#0056D2]/10 text-[#004BB5]',
            REJECTED: 'bg-red-100 text-red-800',
            CANCELLED: 'bg-slate-100 text-slate-700',
        };
        return map[status] || 'bg-gray-100 text-gray-800';
    }

    getStatusLabel(status: string): string {
        const map: Record<string, string> = {
            COMPLETED: 'Hoàn thành',
            PENDING: 'Chờ duyệt',
            APPROVED: 'Đã duyệt',
            REJECTED: 'Từ chối',
            CANCELLED: 'GV đã hủy',
        };
        return map[status] || status;
    }
}
