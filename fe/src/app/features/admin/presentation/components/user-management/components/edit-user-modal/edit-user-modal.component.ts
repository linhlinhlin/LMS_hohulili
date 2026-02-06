import { Component, inject, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { UserManagementState } from '../../state/user-management.state';

@Component({
  selector: 'app-edit-user-modal',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (state.isEditModalOpen()) {
      <div class="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-40" (click)="state.closeEditModal()">
        <div class="flex items-center justify-center min-h-screen p-4">
          <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full" (click)="$event.stopPropagation()">
            <!-- Modal Header -->
            <div class="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 class="text-xl font-semibold text-gray-900">Chỉnh sửa người dùng</h3>
              <button (click)="state.closeEditModal()"
                      class="text-gray-400 hover:text-gray-600 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <!-- Modal Body -->
            <div class="p-6 space-y-5">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Tên</label>
                <input type="text"
                       [ngModel]="state.editingUserName()"
                       (ngModelChange)="state.editingUserName.set($event)"
                       class="w-full px-3 py-2.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input type="email"
                       [ngModel]="state.editingUserEmail()"
                       (ngModelChange)="state.editingUserEmail.set($event)"
                       class="w-full px-3 py-2.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Vai trò</label>
                <select [ngModel]="state.editingUserRole()"
                        (ngModelChange)="state.editingUserRole.set($event)"
                        class="w-full px-3 py-2.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white">
                  @for (roleOpt of state.ROLE_OPTIONS; track roleOpt.value) {
                    <option [value]="roleOpt.value">{{ roleOpt.label }}</option>
                  }
                </select>
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
              <button (click)="state.closeEditModal()"
                      type="button"
                      class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                Hủy
              </button>
              <button (click)="state.saveUserEdit()"
                      type="button"
                      class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors">
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class EditUserModalComponent {
  readonly state = inject(UserManagementState);
}
