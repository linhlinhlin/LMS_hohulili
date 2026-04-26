import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiClient } from '../../../../api/client/api-client';
import { AuthService, UserRole } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { KpiCardComponent } from '../../../../shared/components/admin/kpi-card/kpi-card.component';
import { DateRangeToggleComponent } from '../../../../shared/components/admin/date-range-toggle/date-range-toggle.component';

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
    imports: [FormsModule, KpiCardComponent, DateRangeToggleComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrl: './admin-payouts.component.scss',
    template: `
    <div class="payouts-page">
      <div class="page-inner">
        <div class="page-header">
          <div class="page-header-text">
            <h1 class="page-title">Quản lý rút tiền</h1>
            <p class="page-desc">Duyệt và xử lý các yêu cầu rút tiền của giảng viên theo đúng phạm vi quản trị.</p>
          </div>
          <!-- F-P2: shared date-range toggle — placeholder until the BE
               windowed payouts endpoint ships. We hold the value in
               component state so the segmented selector reflects user
               intent; once the BE lands, swap the no-op handler with the
               re-fetch path. -->
          <app-date-range-toggle
            [value]="windowDays()"
            ariaLabel="Khoảng thời gian thống kê"
            (change)="onWindowDaysChange($event)" />
        </div>

        <!-- F-P1: KPI strip — 4 count cards per status. Counts only for now;
             aggregate amounts cần BE endpoint riêng (defer to BE issue). -->
        <div class="kpi-strip">
          <app-kpi-card
            [value]="pendingCount()"
            label="Chờ duyệt"
            [variant]="pendingCount() > 0 ? 'warning' : 'default'"
            sub="Cần xử lý" />
          <app-kpi-card
            [value]="approvedCount()"
            label="Đã duyệt"
            sub="Chờ chuyển khoản" />
          <app-kpi-card
            [value]="completedCount()"
            label="Hoàn thành"
            variant="success"
            sub="Đã chuyển khoản" />
          <app-kpi-card
            [value]="rejectedCount()"
            label="Đã từ chối"
            sub="Tổng yêu cầu bị từ chối" />
        </div>

        <div class="tab-bar">
          <div class="tab-strip">
            @for (tab of statusTabs; track tab.value) {
              <button
                (click)="changeStatus(tab.value)"
                class="tab-btn"
                [class.active]="activeStatus() === tab.value">
                {{ tab.label }}
                @if (tab.value === 'PENDING' && pendingCount() > 0) {
                  <span class="pending-badge">{{ pendingCount() }}</span>
                }
              </button>
            }
          </div>
        </div>

        @if (activeStatus() === 'APPROVED' && payouts().length > 0) {
          <div class="info-banner">
            <svg class="info-banner-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div>
              <p class="info-banner-title">Hướng dẫn xử lý</p>
              <p class="info-banner-text">
                Chuyển khoản thủ công tới tài khoản ngân hàng của giảng viên, sau đó bấm <strong>"Xác nhận đã CK"</strong> để hoàn tất.
              </p>
            </div>
          </div>
        }

        <div class="table-card">
          @if (isLoading()) {
            <div class="state-box">
              <div class="spinner"></div>
              <p class="state-text">Đang tải...</p>
            </div>
          } @else if (payouts().length === 0) {
            <div class="state-box state-box-empty">
              <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              <p class="empty-title">{{ emptyTitle() }}</p>
              <p class="empty-desc">{{ emptyDesc() }}</p>
            </div>
          } @else {
            <div class="table-scroll">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Mã YC</th>
                    <th>Giảng viên</th>
                    <th class="col-right">Số tiền</th>
                    <th>Tài khoản nhận</th>
                    <th>Ghi chú GV</th>
                    <th>Ngày yêu cầu</th>
                    <th class="col-center">Trạng thái</th>
                    <th class="col-center col-actions">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  @for (payout of payouts(); track payout.id) {
                    <tr>
                      <td>
                        <span class="code-id">{{ payout.id.slice(0, 8).toUpperCase() }}</span>
                      </td>
                      <td>
                        <p class="cell-name">{{ payout.teacherName }}</p>
                        <p class="cell-email">{{ payout.teacherEmail }}</p>
                      </td>
                      <td class="col-right">
                        <span class="cell-amount">{{ formatCurrency(payout.amount) }}</span>
                      </td>
                      <td>
                        <div class="bank-info">
                          <div>
                            <p class="bank-name">{{ getBankName(payout.bankCode) }}</p>
                            <div class="bank-account-row">
                              <span class="bank-account-num">{{ payout.accountNumber }}</span>
                              @if (isSystemAdmin()) {
                                <button
                                  (click)="copy(payout.accountNumber)"
                                  title="Sao chép số tài khoản"
                                  class="btn-copy">
                                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2"/>
                                  </svg>
                                </button>
                              }
                            </div>
                            <p class="bank-holder">{{ payout.accountName }}</p>
                          </div>
                        </div>
                      </td>
                      <td class="cell-note" [title]="payout.teacherNote || ''">
                        {{ payout.teacherNote || '\u2014' }}
                      </td>
                      <td class="cell-date">{{ formatDate(payout.requestedAt) }}</td>
                      <td class="col-center">
                        <span class="badge" [class]="getStatusClass(payout.status)">
                          {{ getStatusLabel(payout.status) }}
                        </span>
                        @if (payout.status === 'CANCELLED') {
                          <span class="status-sub">
                            Giảng viên đã chủ động hủy yêu cầu. Số dư đã được hoàn lại.
                          </span>
                        }
                        @if (payout.adminNote) {
                          <span class="status-sub truncated" [title]="payout.adminNote">
                            {{ payout.adminNote }}
                          </span>
                        }
                      </td>
                      <td class="col-center">
                        <div class="action-cell">
                          @if (payout.status === 'PENDING') {
                            <button (click)="openApprove(payout)" class="btn-action btn-approve-action">
                              Duyệt
                            </button>
                            <button (click)="openReject(payout)" class="btn-action btn-reject-action">
                              Từ chối
                            </button>
                          }
                          @if (payout.status === 'APPROVED' && isSystemAdmin()) {
                            <button (click)="complete(payout)" class="btn-action btn-complete-action">
                              Xác nhận đã CK
                            </button>
                          }
                          @if (payout.status === 'APPROVED' && !isSystemAdmin()) {
                            <span class="action-wait">Chờ admin hoàn tất</span>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="pagination">
              <p class="pagination-info">Trang {{ currentPage() + 1 }}</p>
              <div class="pagination-btns">
                <button
                  (click)="prevPage()"
                  [disabled]="currentPage() === 0"
                  class="btn-page">
                  \u2190 Trước
                </button>
                <button
                  (click)="nextPage()"
                  [disabled]="!hasMore()"
                  class="btn-page">
                  Tiếp \u2192
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>

    @if (copyFeedback() && isSystemAdmin()) {
      <div class="copy-toast">
        Đã sao chép số tài khoản
      </div>
    }

    @if (approveTarget()) {
      <div class="modal-overlay">
        <div class="modal-box">
          <h3 class="modal-title">Duyệt yêu cầu rút tiền</h3>

          <div class="modal-detail-box">
            <p class="detail-name">{{ approveTarget()!.teacherName }}</p>
            <p class="detail-bank">{{ getBankName(approveTarget()!.bankCode) }} · <span class="detail-bank-mono">{{ approveTarget()!.accountNumber }}</span></p>
            <p class="detail-holder">{{ approveTarget()!.accountName }}</p>
            <p class="detail-amount amount-approve">{{ formatCurrency(approveTarget()!.amount) }}</p>
          </div>

          <div>
            <label class="modal-label">Ghi chú (tùy chọn)</label>
            <textarea
              [(ngModel)]="actionNote"
              rows="2"
              class="modal-textarea"
              placeholder="Ghi chú cho giảng viên..."></textarea>
          </div>
          <div class="modal-actions">
            <button (click)="approveTarget.set(null)" class="btn-modal btn-cancel">
              Hủy
            </button>
            <button (click)="submitApprove()" class="btn-modal btn-confirm-approve">
              Xác nhận duyệt
            </button>
          </div>
        </div>
      </div>
    }

    @if (rejectTarget()) {
      <div class="modal-overlay">
        <div class="modal-box">
          <h3 class="modal-title">Từ chối yêu cầu rút tiền</h3>
          <p class="modal-subtitle">{{ rejectTarget()!.teacherName }} · {{ formatCurrency(rejectTarget()!.amount) }}</p>
          <div>
            <label class="modal-label">Lý do từ chối <span class="required-mark">*</span></label>
            <textarea
              [(ngModel)]="actionNote"
              rows="3"
              class="modal-textarea textarea-danger"
              placeholder="Lý do từ chối..."></textarea>
          </div>
          <div class="modal-actions">
            <button (click)="rejectTarget.set(null)" class="btn-modal btn-cancel">
              Hủy
            </button>
            <button
              (click)="submitReject()"
              [disabled]="!actionNote.trim()"
              class="btn-modal btn-confirm-reject">
              Xác nhận từ chối
            </button>
          </div>
        </div>
      </div>
    }

    @if (completeTarget()) {
      <div class="modal-overlay">
        <div class="modal-box">
          <h3 class="modal-title">Xác nhận đã chuyển khoản</h3>
          <p class="modal-subtitle">Xác nhận bạn đã chuyển khoản thành công cho:</p>
          <div class="modal-detail-box detail-success">
            <p class="detail-name">{{ completeTarget()!.teacherName }}</p>
            <p class="detail-bank">{{ getBankName(completeTarget()!.bankCode) }} · <span class="detail-bank-mono">{{ completeTarget()!.accountNumber }}</span></p>
            <p class="detail-holder">{{ completeTarget()!.accountName }}</p>
            <p class="detail-amount amount-complete">{{ formatCurrency(completeTarget()!.amount) }}</p>
          </div>
          <div class="modal-actions">
            <button (click)="completeTarget.set(null)" class="btn-modal btn-cancel">
              Hủy
            </button>
            <button (click)="submitComplete()" class="btn-modal btn-confirm-complete">
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
    // F-P2: window selector. UI-only for now — BE issue tracks an aggregate
    // "payouts in the last N days" endpoint. Currently the strip counts use
    // status-paged size=1 totalElements which is window-independent.
    windowDays = signal<number>(30);
    // F-P1: per-status totals — counts only for now (amount sum cần BE
    // aggregate endpoint, defer).
    approvedCount = signal(0);
    completedCount = signal(0);
    rejectedCount = signal(0);
    copyFeedback = signal(false);

    // F-P3: Carbon empty-states — Inform + Inspire + Activate. Activate
    // CTA chỉ thêm khi user thực sự có thể act (e.g., teacher list link).
    // Hiện tại mỗi tab map sang 1 message rõ; không CTA vì không có action
    // ý nghĩa cho admin trên empty payout queue.
    emptyTitle = computed(() => {
      switch (this.activeStatus()) {
        case 'PENDING':   return 'Hàng đợi đã sạch';
        case 'APPROVED':  return 'Chưa có yêu cầu nào được duyệt';
        case 'COMPLETED': return 'Chưa có giao dịch hoàn thành';
        case 'REJECTED':  return 'Chưa có yêu cầu nào bị từ chối';
        case 'CANCELLED': return 'Chưa có yêu cầu nào bị hủy';
        default:          return 'Không có yêu cầu nào trong trạng thái này';
      }
    });

    emptyDesc = computed(() => {
      switch (this.activeStatus()) {
        case 'PENDING':   return 'Khi giảng viên gửi yêu cầu rút tiền, yêu cầu sẽ hiện ở đây để bạn duyệt.';
        case 'APPROVED':  return 'Khi bạn duyệt một yêu cầu, yêu cầu sẽ chuyển sang đây để chờ chuyển khoản.';
        case 'COMPLETED': return 'Khi bạn xác nhận đã chuyển khoản, giao dịch sẽ chuyển sang đây.';
        case 'REJECTED':  return 'Yêu cầu bị từ chối sẽ hiển thị tại đây cùng lý do để giảng viên xem lại.';
        case 'CANCELLED': return 'Yêu cầu giảng viên tự hủy sẽ hiển thị tại đây.';
        default:          return '';
      }
    });

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
        this.loadStatusCounts();
    }

    changeStatus(status: string): void {
        this.activeStatus.set(status);
        this.currentPage.set(0);
        this.loadPayouts();
    }

    onWindowDaysChange(days: number): void {
        // Placeholder — BE doesn't accept a window param on
        // /api/v3/admin/revenue/payouts yet. Once that lands, pipe `days`
        // into loadPayouts() + loadStatusCounts() as a query param.
        this.windowDays.set(days);
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

    // F-P1: count payouts in each status. We piggy-back on the existing
    // paged endpoint by asking for `size=1` and reading `totalElements`
    // — no aggregate endpoint needed yet. If the count signals end up
    // hot-path enough to matter, swap to a single GET /payouts/counts.
    private loadStatusCounts(): void {
        const setters: Record<string, (n: number) => void> = {
            PENDING:   n => this.pendingCount.set(n),
            APPROVED:  n => this.approvedCount.set(n),
            COMPLETED: n => this.completedCount.set(n),
            REJECTED:  n => this.rejectedCount.set(n),
        };
        for (const status of Object.keys(setters)) {
            this.api.getWithResponse<any>(
                `/api/v3/admin/revenue/payouts?status=${status}&page=0&size=1`
            ).subscribe({
                next: (response) => setters[status](response.data?.totalElements ?? 0),
                error: () => {}
            });
        }
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
                this.loadStatusCounts();
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
                this.loadStatusCounts();
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
