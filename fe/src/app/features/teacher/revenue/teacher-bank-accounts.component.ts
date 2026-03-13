import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TeacherRevenueService, BankAccount } from '../infrastructure/services/teacher-revenue.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-teacher-bank-accounts',
    imports: [RouterModule, FormsModule],
    template: `
    <div class="min-h-screen bg-slate-50 p-6">
      <div class="max-w-3xl mx-auto">
        <!-- Header -->
        <div class="mb-6">
          <a routerLink="/teacher/revenue" class="text-sm text-[#0056D2] hover:text-[#004BB5] flex items-center gap-1 mb-4">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Quay lại Doanh thu
          </a>
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Tài khoản ngân hàng</h1>
              <p class="text-gray-600 mt-1">Quản lý tài khoản nhận tiền rút</p>
            </div>
            <button (click)="openAddModal()"
                    class="px-4 py-2 bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5] transition-colors flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              Thêm tài khoản
            </button>
          </div>
        </div>

        <!-- Bank Account List -->
        @if (isLoading()) {
          <div class="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div class="w-10 h-10 border-4 border-gray-200 border-t-[#0056D2] rounded-full animate-spin mx-auto"></div>
            <p class="mt-4 text-sm text-gray-600">Đang tải...</p>
          </div>
        } @else if (bankAccounts().length === 0) {
          <div class="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
            </svg>
            <h3 class="text-base font-medium text-gray-900 mb-2">Chưa có tài khoản ngân hàng</h3>
            <p class="text-sm text-gray-600 mb-4">Thêm tài khoản để có thể yêu cầu rút tiền</p>
            <button (click)="openAddModal()"
                    class="inline-flex items-center gap-2 px-4 py-2 bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5] transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              Thêm tài khoản
            </button>
          </div>
        } @else {
          <div class="space-y-3">
            @for (account of bankAccounts(); track account.id) {
              <div class="bg-white rounded-xl border p-4 flex items-center justify-between"
                   [class]="account.isDefault ? 'border-[#0056D2] shadow-sm' : 'border-gray-200'">
                <div class="flex items-center gap-4">
                  <!-- Bank icon -->
                  <div class="w-12 h-12 bg-[#0056D2]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span class="text-xs font-bold text-[#0056D2]">{{ account.bankCode }}</span>
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-semibold text-gray-900">{{ getBankDisplayName(account.bankCode) }}</span>
                      @if (account.isDefault) {
                        <span class="px-2 py-0.5 bg-[#0056D2]/10 text-[#004BB5] text-xs rounded-full font-medium">Mặc định</span>
                      }
                      @if (!account.verified) {
                        <span class="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">Chưa xác minh</span>
                      }
                    </div>
                    <p class="text-sm text-gray-600 font-mono mt-0.5">{{ account.accountNumberMasked }}</p>
                    <p class="text-xs text-gray-500">{{ account.accountName }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  @if (!account.isDefault) {
                    <button (click)="setDefault(account.id)"
                            class="px-3 py-1.5 text-xs border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                      Đặt mặc định
                    </button>
                  }
                  <button (click)="confirmDelete(account)"
                          class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xóa tài khoản">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </div>
            }
          </div>
        }

        <!-- Info note -->
        <div class="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <div class="flex gap-3">
            <svg class="w-5 h-5 text-[#0056D2] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p class="text-sm text-[#004BB5]">
              Tài khoản <strong>mặc định</strong> sẽ được dùng khi yêu cầu rút tiền.
              Bạn có thể thêm tối đa 5 tài khoản ngân hàng.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Bank Account Modal -->
    @if (showAddModal()) {
      <div class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
           (click)="closeAddModal()">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-semibold text-gray-900 mb-5">Thêm tài khoản ngân hàng</h3>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Ngân hàng <span class="text-red-500">*</span></label>
              <select [(ngModel)]="newBankCode"
                      class="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2]">
                <option value="">-- Chọn ngân hàng --</option>
                @for (bank of bankOptions; track bank.code) {
                  <option [value]="bank.code">{{ bank.name }} ({{ bank.code }})</option>
                }
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Số tài khoản <span class="text-red-500">*</span></label>
              <input type="text" [(ngModel)]="newAccountNumber"
                     class="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2]"
                     placeholder="VD: 1234567890">
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Tên chủ tài khoản <span class="text-red-500">*</span></label>
              <input type="text" [(ngModel)]="newAccountName"
                     class="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2]"
                     placeholder="VD: NGUYEN VAN A">
            </div>
          </div>

          <div class="mt-6 flex gap-3">
            <button (click)="closeAddModal()"
                    class="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              Hủy
            </button>
            <button (click)="submitAddAccount()"
                    [disabled]="!isAddFormValid() || isSaving()"
                    class="flex-1 px-4 py-2.5 bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
              @if (isSaving()) {
                <span class="flex items-center justify-center gap-2">
                  <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Đang lưu...
                </span>
              } @else {
                Thêm tài khoản
              }
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Delete Confirm Modal -->
    @if (deleteTarget()) {
      <div class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Xóa tài khoản?</h3>
          <p class="text-sm text-gray-600 mb-6">
            Bạn có chắc muốn xóa tài khoản <strong>{{ deleteTarget()!.bankCode }} {{ deleteTarget()!.accountNumberMasked }}</strong>?
            Thao tác này không thể hoàn tác.
          </p>
          <div class="flex gap-3">
            <button (click)="deleteTarget.set(null)"
                    class="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              Hủy
            </button>
            <button (click)="executeDelete()"
                    class="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              Xóa
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class TeacherBankAccountsComponent implements OnInit {
    private revenueService = inject(TeacherRevenueService);
    private toast = inject(ToastService);

    bankAccounts = this.revenueService.bankAccounts;
    isLoading = signal(false);
    isSaving = signal(false);

    // Add modal state
    showAddModal = signal(false);
    newBankCode = '';
    newAccountNumber = '';
    newAccountName = '';

    // Delete confirm
    deleteTarget = signal<BankAccount | null>(null);

    readonly bankOptions = [
        { code: 'VCB', name: 'Vietcombank' },
        { code: 'TCB', name: 'Techcombank' },
        { code: 'MBB', name: 'MB Bank' },
        { code: 'VPB', name: 'VPBank' },
        { code: 'ACB', name: 'ACB' },
        { code: 'BID', name: 'BIDV' },
        { code: 'CTG', name: 'VietinBank' },
        { code: 'STB', name: 'Sacombank' },
        { code: 'TPB', name: 'TPBank' },
        { code: 'MSB', name: 'MSB' },
        { code: 'OCB', name: 'OCB' },
        { code: 'HDB', name: 'HDBank' },
        { code: 'VIB', name: 'VIB' },
        { code: 'SHB', name: 'SHB' },
        { code: 'EIB', name: 'Eximbank' },
        { code: 'NAB', name: 'Nam A Bank' },
        { code: 'CAKE', name: 'CAKE' },
        { code: 'UBANK', name: 'Ubank' },
    ];

    ngOnInit(): void {
        this.isLoading.set(true);
        this.revenueService.getBankAccounts().subscribe({
            next: () => this.isLoading.set(false),
            error: () => { this.isLoading.set(false); this.toast.error('Không thể tải danh sách tài khoản.'); }
        });
    }

    openAddModal(): void {
        this.newBankCode = '';
        this.newAccountNumber = '';
        this.newAccountName = '';
        this.showAddModal.set(true);
    }

    closeAddModal(): void {
        this.showAddModal.set(false);
    }

    isAddFormValid(): boolean {
        return this.newBankCode.trim().length > 0 &&
               this.newAccountNumber.trim().length >= 6 &&
               this.newAccountName.trim().length > 0;
    }

    submitAddAccount(): void {
        if (!this.isAddFormValid()) return;
        this.isSaving.set(true);
        this.revenueService.addBankAccount(
            this.newBankCode.trim(),
            this.newAccountNumber.trim(),
            this.newAccountName.trim().toUpperCase()
        ).subscribe({
            next: () => {
                this.isSaving.set(false);
                this.closeAddModal();
                this.toast.success('Đã thêm tài khoản ngân hàng thành công!');
            },
            error: (e) => {
                this.isSaving.set(false);
                this.toast.error('Lỗi: ' + (e?.error?.message || 'Không thể thêm tài khoản'));
            }
        });
    }

    setDefault(id: string): void {
        this.revenueService.setDefaultBankAccount(id).subscribe({
            next: () => this.toast.success('Đã đặt tài khoản mặc định!'),
            error: () => this.toast.error('Không thể cập nhật tài khoản mặc định')
        });
    }

    confirmDelete(account: BankAccount): void {
        this.deleteTarget.set(account);
    }

    executeDelete(): void {
        const target = this.deleteTarget();
        if (!target) return;
        this.revenueService.deleteBankAccount(target.id).subscribe({
            next: () => {
                this.deleteTarget.set(null);
                this.toast.success('Đã xóa tài khoản ngân hàng');
            },
            error: (e) => {
                this.deleteTarget.set(null);
                this.toast.error('Lỗi: ' + (e?.error?.message || 'Không thể xóa tài khoản'));
            }
        });
    }

    getBankDisplayName(bankCode: string): string {
        return this.revenueService.getBankDisplayName(bankCode);
    }
}
