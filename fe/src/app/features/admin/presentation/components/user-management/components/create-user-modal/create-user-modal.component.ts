import { Component, inject, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { UserManagementState } from '../../state/user-management.state';

@Component({
  selector: 'app-create-user-modal',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (state.showCreateModal()) {
      <div class="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-40" (click)="state.closeCreateUserModal()">
        <div class="flex items-center justify-center min-h-screen p-4">
          <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full" (click)="$event.stopPropagation()">
            <!-- Modal Header -->
            <div class="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 class="text-xl font-semibold text-gray-900">Thêm người dùng mới</h3>
              <button (click)="state.closeCreateUserModal()"
                      class="text-gray-400 hover:text-gray-600 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <!-- Modal Body -->
            <form (ngSubmit)="state.createUser()" class="p-6 space-y-5">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Tên người dùng <span class="text-red-500">*</span>
                </label>
                <input type="text"
                       [ngModel]="state.newUserName()"
                       (ngModelChange)="state.newUserName.set($event)"
                       name="name"
                       required
                       placeholder="Nhập tên đầy đủ"
                       class="w-full px-3 py-2.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#0056D2] focus:border-transparent transition-all">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Email <span class="text-red-500">*</span>
                </label>
                <input type="email"
                       [ngModel]="state.newUserEmail()"
                       (ngModelChange)="state.newUserEmail.set($event)"
                       name="email"
                       required
                       placeholder="example@domain.com"
                       class="w-full px-3 py-2.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#0056D2] focus:border-transparent transition-all">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Vai trò <span class="text-red-500">*</span>
                </label>
                <select [ngModel]="state.newUserRole()"
                        (ngModelChange)="state.newUserRole.set($event)"
                        name="role"
                        required
                        class="w-full px-3 py-2.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#0056D2] focus:border-transparent transition-all bg-white">
                  <option value="">Chọn vai trò</option>
                  @for (roleOpt of state.ROLE_OPTIONS; track roleOpt.value) {
                    <option [value]="roleOpt.value">{{ roleOpt.label }}</option>
                  }
                </select>
              </div>

              <!-- Info Note -->
              <div class="bg-[#0056D2]/5 border border-[#0056D2]/20 rounded p-3">
                <div class="flex">
                  <svg class="w-5 h-5 text-[#0056D2] mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                  </svg>
                  <p class="text-xs text-[#004BB5]">
                    Mật khẩu mặc định là <span class="font-semibold">Password123!</span>. Người dùng nên đổi mật khẩu sau lần đăng nhập đầu tiên.
                  </p>
                </div>
              </div>
            </form>

            <!-- Modal Footer -->
            <div class="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
              <button (click)="state.closeCreateUserModal()"
                      type="button"
                      class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                Hủy
              </button>
              <button (click)="state.createUser()"
                      type="button"
                      [disabled]="!state.newUserName() || !state.newUserEmail() || !state.newUserRole()"
                      class="px-4 py-2 text-sm font-medium text-white bg-[#0056D2] rounded hover:bg-[#004BB5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                Tạo người dùng
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class CreateUserModalComponent {
  readonly state = inject(UserManagementState);
}
