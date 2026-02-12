import { Component, inject, output, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { UserManagementState } from '../../state/user-management.state';

@Component({
  selector: 'app-bulk-import-modal',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (state.isBulkImportModalOpen()) {
      <div class="fixed inset-0 z-50 overflow-y-auto bg-gray-600 bg-opacity-50">
        <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div class="sm:flex sm:items-start">
                <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-[#0056D2]/10 sm:mx-0 sm:h-10 sm:w-10">
                  <svg class="h-6 w-6 text-[#0056D2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Import người dùng từ Excel</h3>

                  <!-- Template Info -->
                  <div class="bg-[#0056D2]/5 border border-[#0056D2]/20 rounded-lg p-4 mb-4">
                    <div class="flex">
                      <svg class="w-5 h-5 text-[#0056D2] mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                      </svg>
                      <div class="text-sm text-[#004BB5]">
                        <p class="font-medium mb-2">Định dạng file Excel yêu cầu:</p>
                        <ul class="list-disc list-inside space-y-1 text-xs mb-3">
                          <li>Cột A: Username (bắt buộc) - Tên đăng nhập</li>
                          <li>Cột B: Email (bắt buộc) - Địa chỉ email</li>
                          <li>Cột C: Full Name (bắt buộc) - Họ tên đầy đủ</li>
                          <li>Cột D: Password (tùy chọn) - Mật khẩu</li>
                          <li>Cột E: Department (tùy chọn) - Phòng ban/Khoa</li>
                        </ul>
                        <div class="bg-[#0056D2]/10 border border-[#0056D2]/30 rounded p-2 mb-2">
                          <p class="text-xs font-medium">Mật khẩu mặc định: <span class="font-bold">Password123!</span></p>
                          <p class="text-xs mt-1">Nếu file Excel không có cột Password, tất cả tài khoản sẽ dùng mật khẩu này.</p>
                        </div>
                        <button (click)="downloadTemplate.emit()"
                                class="text-[#0056D2] hover:text-[#004BB5] underline text-xs font-medium">
                          Tải template mẫu
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Role Selection -->
                  <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Chọn vai trò cho tất cả người dùng được import
                    </label>
                    <select [ngModel]="state.defaultImportRole()"
                            (ngModelChange)="state.defaultImportRole.set($event)"
                            name="importRole"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0056D2] focus:border-[#0056D2]">
                      @for (roleOpt of state.ROLE_OPTIONS; track roleOpt.value) {
                        <option [value]="roleOpt.value">{{ roleOpt.label }}</option>
                      }
                    </select>
                    <p class="text-xs text-gray-500 mt-1">Tất cả người dùng trong file Excel sẽ được gán vai trò này</p>
                  </div>

                  <!-- File Upload -->
                  <div class="space-y-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Chọn file Excel (.xlsx hoặc .xls)</label>
                      <div class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-[#0056D2] transition-colors">
                        @if (state.selectedFile()) {
                          <div class="text-center">
                            <svg class="mx-auto h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <div class="mt-4">
                              <p class="text-sm font-medium text-gray-900">{{ state.selectedFile()?.name }}</p>
                              <p class="text-xs text-gray-500">{{ state.formatFileSize(state.selectedFile()?.size || 0) }}</p>
                            </div>
                            <button (click)="state.removeFile()"
                                    class="mt-2 text-red-600 hover:text-red-800 text-sm underline">
                              Chọn file khác
                            </button>
                          </div>
                        } @else {
                          <div class="text-center">
                            <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                            </svg>
                            <div class="mt-4">
                              <label for="file-upload" class="cursor-pointer">
                                <span class="mt-2 block text-sm font-medium text-gray-900">Kéo thả file vào đây hoặc</span>
                                <span class="mt-1 block text-sm text-[#0056D2] hover:text-[#004BB5]">chọn file từ máy tính</span>
                              </label>
                              <input id="file-upload" name="file-upload" type="file" class="sr-only" accept=".xlsx,.xls" (change)="state.onFileSelected($event)">
                            </div>
                          </div>
                        }
                      </div>
                    </div>

                    <!-- Progress Bar -->
                    @if (state.bulkImportProgress().isImporting) {
                      <div class="space-y-2">
                        <div class="flex justify-between text-sm">
                          <span class="text-gray-600">{{ state.bulkImportProgress().currentStep }}</span>
                          <span class="text-gray-600">{{ state.bulkImportProgress().progress }}%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                          <div class="bg-[#0056D2] h-2 rounded-full transition-all duration-300"
                               [style.width.%]="state.bulkImportProgress().progress"></div>
                        </div>
                      </div>
                    }

                    <!-- Import Results -->
                    @if (state.bulkImportProgress().result) {
                      <div class="bg-gray-50 rounded-lg p-4">
                        <h4 class="font-medium text-gray-900 mb-2">Kết quả import:</h4>
                        <div class="grid grid-cols-3 gap-4 text-sm">
                          <div class="text-center">
                            <div class="text-2xl font-bold text-[#0056D2]">{{ state.bulkImportProgress().result?.totalRows }}</div>
                            <div class="text-gray-600">Tổng dòng</div>
                          </div>
                          <div class="text-center">
                            <div class="text-2xl font-bold text-green-600">{{ state.bulkImportProgress().result?.successfulImports }}</div>
                            <div class="text-gray-600">Thành công</div>
                          </div>
                          <div class="text-center">
                            <div class="text-2xl font-bold text-red-600">{{ state.bulkImportProgress().result?.failedImports }}</div>
                            <div class="text-gray-600">Thất bại</div>
                          </div>
                        </div>

                        @if (state.bulkImportProgress().result!.errors.length > 0) {
                          <div class="mt-4">
                            <h5 class="font-medium text-red-700 mb-2">Lỗi chi tiết:</h5>
                            <div class="bg-red-50 border border-red-200 rounded p-3 max-h-32 overflow-y-auto">
                              <ul class="text-xs text-red-700 space-y-1">
                                @for (error of state.bulkImportProgress().result!.errors; track $index) {
                                  <li>{{ error }}</li>
                                }
                              </ul>
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </div>
                </div>
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              @if (!state.bulkImportProgress().result) {
                <button (click)="startImport.emit()"
                        [disabled]="!state.selectedFile() || state.bulkImportProgress().isImporting"
                        class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#0056D2] text-base font-medium text-white hover:bg-[#004BB5] focus:outline-none sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  @if (state.bulkImportProgress().isImporting) {
                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang import...
                  } @else {
                    Bắt đầu Import
                  }
                </button>
              }
              <button (click)="state.closeBulkImportModal()"
                      type="button"
                      class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm">
                {{ state.bulkImportProgress().result ? 'Đóng' : 'Hủy' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class BulkImportModalComponent {
  readonly state = inject(UserManagementState);

  startImport = output<void>();
  downloadTemplate = output<void>();
}
