import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { OrganizationService } from '../../infrastructure/services/organization.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Organization } from '../../../../shared/types/user.types';

@Component({
  selector: 'app-organization-list',
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-6 max-w-6xl mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Quản lý tổ chức</h1>
          <p class="text-sm text-gray-500 mt-1">Quản lý các tổ chức, thành viên và lời mời</p>
        </div>
        <button (click)="showCreateForm.set(!showCreateForm())"
                class="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0056D2] text-white rounded-xl font-medium hover:bg-[#004BB5] transition-colors text-sm shadow-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Tạo tổ chức
        </button>
      </div>

      <!-- Create Form (inline card) -->
      @if (showCreateForm()) {
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6 animate-fade-in">
          <div class="flex items-center justify-between mb-5">
            <h3 class="text-lg font-semibold text-gray-900">Tạo tổ chức mới</h3>
            <button (click)="showCreateForm.set(false)" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="create-name" class="block text-sm font-medium text-gray-700 mb-1.5">Tên tổ chức <span class="text-red-500">*</span></label>
              <input #orgName id="create-name" type="text" placeholder="VD: Đại học Hàng hải Việt Nam"
                     class="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] transition-colors">
            </div>
            <div>
              <label for="create-code" class="block text-sm font-medium text-gray-700 mb-1.5">Mã tổ chức <span class="text-red-500">*</span></label>
              <input #orgCode id="create-code" type="text" placeholder="VD: VMU" maxlength="50"
                     class="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm uppercase tracking-wider focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] transition-colors">
              <p class="text-xs text-gray-400 mt-1">2-50 ký tự, dùng để định danh tổ chức</p>
            </div>
            <div class="md:col-span-2">
              <label for="create-desc" class="block text-sm font-medium text-gray-700 mb-1.5">Mô tả</label>
              <textarea #orgDesc id="create-desc" rows="2" placeholder="Mô tả ngắn về tổ chức (không bắt buộc)"
                        class="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] transition-colors"></textarea>
            </div>
            <div>
              <label for="create-expiry" class="block text-sm font-medium text-gray-700 mb-1.5">Thời hạn token (ngày)</label>
              <input #orgExpiry id="create-expiry" type="number" value="30" min="7" max="730"
                     class="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] transition-colors">
              <p class="text-xs text-gray-400 mt-1">7 - 730 ngày. Thời gian token đăng nhập hợp lệ</p>
            </div>
          </div>
          <div class="flex items-center gap-3 mt-5 pt-4 border-t border-gray-100">
            <button (click)="createOrg(orgName.value, orgCode.value, orgDesc.value, +orgExpiry.value)"
                    [disabled]="isCreating()"
                    class="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0056D2] text-white rounded-xl text-sm font-medium hover:bg-[#004BB5] disabled:opacity-50 transition-colors shadow-sm">
              @if (isCreating()) {
                <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang tạo...
              } @else {
                Tạo tổ chức
              }
            </button>
            <button (click)="showCreateForm.set(false)"
                    class="px-5 py-2.5 text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-50 text-sm transition-colors">
              Hủy
            </button>
          </div>
        </div>
      }

      <!-- Loading -->
      @if (isLoading()) {
        <div class="text-center py-16">
          <div class="inline-block animate-spin rounded-full h-10 w-10 border-4 border-[#0056D2] border-t-transparent"></div>
          <p class="mt-4 text-gray-500 text-sm">Đang tải danh sách tổ chức...</p>
        </div>
      } @else {
        <!-- Org List -->
        <div class="grid gap-4">
          @for (org of organizations(); track org.id) {
            <a [routerLink]="['/admin/organizations', org.id]"
               class="group block bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-[#0056D2]/30 hover:shadow-md transition-all">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
                       [class]="org.enabled ? 'bg-gradient-to-br from-[#0056D2] to-[#004BB5]' : 'bg-gray-400'">
                    {{ org.code.substring(0, 2) }}
                  </div>
                  <div class="min-w-0">
                    <h3 class="text-base font-semibold text-gray-900 group-hover:text-[#0056D2] transition-colors truncate">{{ org.name }}</h3>
                    <div class="flex items-center gap-3 mt-0.5 text-sm text-gray-500">
                      <span class="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{{ org.code }}</span>
                      <span class="text-gray-300">&middot;</span>
                      <span>Token: {{ org.tokenExpiryDays }} ngày</span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-3 shrink-0 ml-4">
                  @if (org.enabled) {
                    <span class="px-2.5 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-full border border-green-200">Hoạt động</span>
                  } @else {
                    <span class="px-2.5 py-1 text-xs font-medium bg-gray-50 text-gray-500 rounded-full border border-gray-200">Vô hiệu</span>
                  }
                  <svg class="w-5 h-5 text-gray-300 group-hover:text-[#0056D2] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </div>
              </div>
              @if (org.description) {
                <p class="mt-2.5 text-sm text-gray-500 line-clamp-1 pl-16">{{ org.description }}</p>
              }
            </a>
          } @empty {
            <!-- Empty State -->
            <div class="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
              <div class="w-16 h-16 bg-[#0056D2]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-[#0056D2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900 mb-1">Chưa có tổ chức nào</h3>
              <p class="text-sm text-gray-500 mb-5">Tạo tổ chức đầu tiên để bắt đầu quản lý thành viên</p>
              <button (click)="showCreateForm.set(true)"
                      class="inline-flex items-center gap-2 px-4 py-2 bg-[#0056D2] text-white rounded-xl text-sm font-medium hover:bg-[#004BB5] transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                Tạo tổ chức đầu tiên
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in { animation: fade-in 0.2s ease-out; }
  `]
})
export class OrganizationListComponent implements OnInit {
  private orgService = inject(OrganizationService);
  private toast = inject(ToastService);

  organizations = signal<Organization[]>([]);
  isLoading = signal(true);
  showCreateForm = signal(false);
  isCreating = signal(false);

  ngOnInit(): void {
    this.loadOrganizations();
  }

  loadOrganizations(): void {
    this.isLoading.set(true);
    this.orgService.listOrganizations().subscribe({
      next: (orgs) => {
        this.organizations.set(orgs);
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('Không thể tải danh sách tổ chức');
        this.isLoading.set(false);
      }
    });
  }

  createOrg(name: string, code: string, description: string, tokenExpiryDays: number): void {
    if (!name.trim() || !code.trim()) {
      this.toast.warning('Tên và mã tổ chức là bắt buộc');
      return;
    }
    this.isCreating.set(true);

    this.orgService.createOrganization({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim() || undefined,
      tokenExpiryDays: tokenExpiryDays || 30
    }).subscribe({
      next: (org) => {
        this.showCreateForm.set(false);
        this.isCreating.set(false);
        this.toast.success('Tạo tổ chức thành công', `Đã tạo "${org.name}" (${org.code})`);
        this.loadOrganizations();
      },
      error: (err) => {
        this.isCreating.set(false);
        this.toast.error(err.error?.message || 'Tạo tổ chức thất bại');
      }
    });
  }
}
