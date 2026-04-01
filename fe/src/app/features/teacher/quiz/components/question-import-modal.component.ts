import { Component, input, output, signal, inject, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { QuestionApi, QuestionImportResult } from '../../../../api/endpoints/question.api';
import { firstValueFrom } from 'rxjs';
import { IconComponent } from '../../../../shared/components/icon/icon.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-question-import-modal',
  imports: [FormsModule, IconComponent],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="question-import-title">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-black/10 backdrop-blur-sm transition-opacity" (click)="close()"></div>
        <!-- Modal Container -->
        <div class="flex items-center justify-center min-h-screen p-4">
          <!-- Modal Content -->
          <div class="relative z-10 bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all w-full max-w-2xl">
            <!-- Header -->
            <div class="flex h-11 items-center justify-between border-b border-slate-200 px-4">
              <h3 id="question-import-title" class="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <svg class="w-4 h-4 text-[#0056D2]" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                </svg>
                Import câu hỏi từ file
              </h3>
              <button (click)="close()"
                      class="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                      aria-label="Đóng modal import">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <!-- Body -->
            <div class="p-6 space-y-5">
              <!-- Template Download — shown first so users see format before picking file -->
              <div class="bg-[#0056D2]/5 border border-[#0056D2]/20 rounded-lg p-4">
                <div class="flex items-start gap-3">
                  <svg class="w-5 h-5 text-[#0056D2] mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                  </svg>
                  <div class="flex-1 min-w-0">
                    <h4 class="font-medium text-[#004BB5] mb-1">Định dạng file Excel (.xlsx)</h4>
                    <p class="text-sm text-[#004BB5] mb-2">File cần có các cột theo thứ tự:</p>
                    <div class="bg-white rounded p-2 text-xs font-mono text-slate-600 overflow-x-auto whitespace-nowrap">
                      Câu hỏi | Đáp án A | Đáp án B | Đáp án C | Đáp án D | Đáp án đúng
                    </div>
                    <p class="text-xs text-[#0056D2] mt-2">* Đáp án đúng ghi: A, B, C hoặc D</p>
                  </div>
                </div>
              </div>
              <!-- Difficulty Selection -->
              <div>
                <label class="block text-sm font-medium text-slate-600 mb-2">Độ khó mặc định</label>
                <select [(ngModel)]="difficulty"
                  class="w-full border-2 border-slate-200 rounded-lg px-4 py-2.5 focus:border-[#0056D2] focus:outline-none">
                  <option value="EASY">Dễ</option>
                  <option value="MEDIUM">Trung bình</option>
                  <option value="HARD">Khó</option>
                </select>
                <p class="mt-1 text-sm text-slate-400">Tất cả câu hỏi import sẽ có độ khó này</p>
              </div>
              <!-- File Upload -->
              <div>
                <label class="block text-sm font-medium text-slate-600 mb-2">Chọn file Excel</label>
                <div class="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-[#0056D2] transition-colors"
                  [class.border-[#0056D2]]="selectedFile"
                  [class.bg-[#0056D2]/5]="selectedFile">
                  <input type="file" #fileInput (change)="onFileSelected($event)"
                    accept=".xlsx,.xls" class="hidden">
                    @if (!selectedFile) {
                      <div (click)="fileInput.click()" class="cursor-pointer">
                        <svg class="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                        </svg>
                        <p class="text-slate-500 mb-1">Click để chọn file hoặc kéo thả vào đây</p>
                        <p class="text-sm text-slate-300">Hỗ trợ: .xlsx, .xls</p>
                      </div>
                    }
                    @if (selectedFile) {
                      <div class="flex items-center justify-center gap-3">
                        <svg class="w-8 h-8 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M12.9,14.5L15.8,19H14L12,15.6L10,19H8.2L11.1,14.5L8.2,10H10L12,13.4L14,10H15.8L12.9,14.5Z"/>
                        </svg>
                        <div class="text-left">
                          <p class="font-medium text-slate-900">{{ selectedFile.name }}</p>
                          <p class="text-sm text-slate-400">{{ formatFileSize(selectedFile.size) }}</p>
                        </div>
                        <button (click)="clearFile(); $event.stopPropagation()"
                          class="ml-2 p-1 text-slate-300 hover:text-red-500">
                          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                          </svg>
                        </button>
                      </div>
                    }
                  </div>
                </div>
                    <!-- Import Result -->
                    @if (importResult()) {
                      <div class="rounded-lg p-4"
                        [class.bg-green-50]="importResult()!.successCount > 0 && importResult()!.failedCount === 0"
                        [class.border-green-200]="importResult()!.successCount > 0 && importResult()!.failedCount === 0"
                        [class.bg-yellow-50]="importResult()!.failedCount > 0"
                        [class.border-yellow-200]="importResult()!.failedCount > 0"
                        [class.border]="true">
                        <div class="flex items-start gap-3">
                          @if (importResult()!.failedCount === 0) {
                            <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                            </svg>
                          }
                          @if (importResult()!.failedCount > 0) {
                            <svg class="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                            </svg>
                          }
                          <div class="flex-1">
                            <h4 class="font-medium"
                              [class.text-green-900]="importResult()!.failedCount === 0"
                              [class.text-yellow-900]="importResult()!.failedCount > 0">
                              {{ importResult()!.message }}
                            </h4>
                            <div class="mt-2 flex gap-4 text-sm">
                              <span class="text-green-700"><app-icon name="circle-check" size="xs" class="text-green-600"/> {{ importResult()!.successCount }} thành công</span>
                              @if (importResult()!.failedCount > 0) {
                                <span class="text-red-700"><app-icon name="circle-x" size="xs" class="text-red-600"/> {{ importResult()!.failedCount }} thất bại</span>
                              }
                            </div>
                            @if (importResult()!.errors.length > 0) {
                              <div class="mt-2 text-sm text-red-700">
                                <p class="font-medium mb-1">Lỗi:</p>
                                <ul class="list-disc list-inside space-y-1 max-h-32 overflow-y-auto">
                                  @for (error of importResult()!.errors; track error) {
                                    <li>{{ error }}</li>
                                  }
                                </ul>
                              </div>
                            }
                          </div>
                        </div>
                      </div>
                    }
                    <!-- Error Message -->
                    @if (errorMessage()) {
                      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div class="flex items-center gap-2 text-red-700">
                          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                          </svg>
                          <span>{{ errorMessage() }}</span>
                        </div>
                      </div>
                    }
                  </div>
                  <!-- Footer -->
                  <div class="border-t border-slate-200 px-4 py-3 flex items-center justify-end gap-2">
                    <button (click)="close()" type="button"
                      class="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                      {{ importResult() ? 'Đóng' : 'Hủy' }}
                    </button>
                    @if (!importResult()) {
                      <button (click)="import()" type="button"
                        [disabled]="isImporting() || !selectedFile"
                        class="h-8 px-4 rounded-lg bg-[#0056D2] text-xs font-semibold text-white hover:bg-[#004BB5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5">
                        @if (isImporting()) {
                          <div class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                        }
                        <span>{{ isImporting() ? 'Đang import...' : 'Import' }}</span>
                      </button>
                    }
                  </div>
                </div>
              </div>
            </div>
          }
    `
})
export class QuestionImportModalComponent {
  private questionApi = inject(QuestionApi);

  // Signal inputs (Angular v20+)
  readonly packageId = input<string | null>(null);

  // Output functions (Angular v20+)
  readonly imported = output<QuestionImportResult>();
  readonly closed = output<void>();

  isOpen = signal(false);
  isImporting = signal(false);
  errorMessage = signal<string | null>(null);
  importResult = signal<QuestionImportResult | null>(null);

  difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM';
  selectedFile: File | null = null;

  open() {
    this.isOpen.set(true);
    this.reset();
  }

  close() {
    this.isOpen.set(false);
    this.closed.emit();
  }

  reset() {
    this.selectedFile = null;
    this.errorMessage.set(null);
    this.importResult.set(null);
    this.difficulty = 'MEDIUM';
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.errorMessage.set(null);
    }
  }

  clearFile() {
    this.selectedFile = null;
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  async import() {
    if (!this.selectedFile || !this.packageId()) {
      this.errorMessage.set('Vui lòng chọn file và gói câu hỏi');
      return;
    }

    this.isImporting.set(true);
    this.errorMessage.set(null);

    try {
      const result = await firstValueFrom(
        this.questionApi.importFromExcel(this.selectedFile, this.packageId()!, this.difficulty)
      );

      this.importResult.set(result);

      if (result.successCount > 0) {
        this.imported.emit(result);
      }
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Import thất bại. Vui lòng thử lại.');
    } finally {
      this.isImporting.set(false);
    }
  }
}
