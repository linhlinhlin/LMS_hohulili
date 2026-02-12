import { Component, inject, ChangeDetectionStrategy } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { ClassService } from '../../../../../../../state/class.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-add-student-dialog',
    imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatInputModule, MatTabsModule, MatIconModule],
    template: `
        <div class="p-1">
          <h2 mat-dialog-title class="!m-0 pb-2 border-b font-bold text-gray-800">Thêm Học viên vào Lớp</h2>
        
          <mat-dialog-content class="!pt-4 min-w-[500px]">
            <mat-tab-group (selectedIndexChange)="onTabActiveChange($event)">
              <!-- Tab 1: Manual -->
              <mat-tab label="Ghi danh Thủ công">
                <form [formGroup]="form" class="space-y-4 pt-6 pb-2">
                  <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Email Học viên</label>
                    <input type="email" formControlName="email"
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 border focus:border-[#0056D2] focus:ring-[#0056D2] text-sm"
                      placeholder="student@example.com">
                    </div>
                    @if (manualError) {
                      <div class="text-red-600 text-sm bg-red-50 p-3 rounded border border-red-100 flex items-start gap-2">
                        <mat-icon class="text-sm scale-75">error_outline</mat-icon>
                        <span>{{ manualError }}</span>
                      </div>
                    }
                  </form>
                </mat-tab>
        
                <!-- Tab 2: Excel -->
                <mat-tab label="Tải lên từ Excel">
                  <div class="pt-6 space-y-4 pb-2">
                    <!-- Instructions -->
                    <div class="bg-[#0056D2]/5 p-4 rounded-lg border border-[#0056D2]/10">
                      <h4 class="text-xs font-bold text-[#004BB5] flex items-center gap-1 mb-2">
                        <mat-icon class="text-xs scale-90">info</mat-icon> HƯỚNG DẪN CẤU TRÚC FILE
                      </h4>
                      <p class="text-[11px] text-[#004BB5] leading-relaxed mb-3">
                        File Excel (.xlsx) cần có tiêu đề cột là <span class="bg-[#0056D2]/10 px-1 rounded font-bold">Email</span> ở Sheet đầu tiên.
                      </p>
                      <div class="overflow-hidden rounded-md border border-[#0056D2]/20">
                        <table class="w-full text-xs bg-white text-center border-collapse">
                          <tr class="bg-gray-100 border-b">
                            <th class="p-1.5 border-r font-bold text-gray-700">Email (Bắt buộc)</th>
                            <th class="p-1.5 text-gray-400 font-normal italic">Họ tên, SĐT... (Bỏ qua)</th>
                          </tr>
                          <tr>
                            <td class="p-1.5 border-r text-gray-600">sinhvien1@gmail.com</td>
                            <td class="p-1.5 text-gray-400">-</td>
                          </tr>
                        </table>
                      </div>
                    </div>
        
                    <!-- Upload Zone -->
                    <div class="border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer group"
                      [class.border-[#0056D2]]="isDragging"
                      [class.bg-[#0056D2]/5]="isDragging"
                      [class.border-gray-300]="!isDragging && !selectedFile"
                      [class.border-green-500]="selectedFile"
                      [class.bg-green-50]="selectedFile"
                      (dragover)="onDragOver($event)"
                      (dragleave)="onDragLeave($event)"
                      (drop)="onDrop($event)"
                      (click)="fileInput.click()">
                      <input #fileInput type="file" class="hidden" (change)="onFileSelected($event)" accept=".xlsx">
        
                      <div class="flex flex-col items-center">
                        @if (!selectedFile) {
                          <mat-icon class="text-5xl text-gray-300 mb-3 h-auto w-auto group-hover:text-[#0056D2]">cloud_upload</mat-icon>
                        }
                        @if (selectedFile) {
                          <mat-icon class="text-5xl text-green-500 mb-3 h-auto w-auto">description</mat-icon>
                        }
        
                        @if (!selectedFile) {
                          <div class="text-sm font-medium text-gray-600">
                            Kéo thả file vào đây hoặc <span class="text-[#0056D2] hover:underline">duyệt thư mục</span>
                            <p class="text-[10px] text-gray-400 mt-1">Định dạng hỗ trợ: .xlsx (Tối đa 5MB)</p>
                          </div>
                        }
                        @if (selectedFile) {
                          <div class="text-sm text-green-700 font-bold flex items-center gap-2">
                            {{ selectedFile.name }}
                            <button class="text-red-500 hover:text-red-700" (click)="$event.stopPropagation(); removeFile()">
                              <mat-icon class="text-sm scale-90">cancel</mat-icon>
                            </button>
                          </div>
                        }
                      </div>
                    </div>
        
                    <!-- Excel Error -->
                    @if (excelError) {
                      <div class="text-red-600 text-sm bg-red-50 p-3 rounded border border-red-100 flex items-center gap-2">
                        <mat-icon class="text-sm scale-75">warning</mat-icon>
                        <span>{{ excelError }}</span>
                      </div>
                    }
        
                    <!-- Import Results -->
                    @if (importSummary) {
                      <div class="space-y-4 pt-2 border-t mt-4 animate-fadeIn">
                        <div class="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <div class="flex gap-4 text-xs font-bold">
                            <span class="text-green-600 flex items-center gap-1">
                              <mat-icon class="text-xs scale-75">check_circle</mat-icon> Thành công: {{ importSummary.successes.length }}
                            </span>
                            @if (importSummary.failures.length > 0) {
                              <span class="text-red-600 flex items-center gap-1">
                                <mat-icon class="text-xs scale-75">error</mat-icon> Lỗi: {{ importSummary.failures.length }}
                              </span>
                            }
                          </div>
                        </div>
                        @if (importSummary.failures.length > 0) {
                          <div class="border rounded-lg overflow-hidden divide-y divide-gray-100">
                            <div class="bg-gray-50 p-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Danh sách dòng lỗi</div>
                            <div class="max-h-32 overflow-y-auto">
                              @for (f of importSummary.failures; track f) {
                                <div class="p-2.5 flex items-center gap-3 text-xs hover:bg-gray-50 transition-colors">
                                  <span class="px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-[10px] font-mono shrink-0">Dòng {{ f.rowNumber }}</span>
                                  <span class="font-semibold text-gray-700 truncate w-32" [title]="f.email">{{ f.email }}</span>
                                  <span class="text-red-500">{{ f.reason }}</span>
                                </div>
                              }
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </div>
                </mat-tab>
              </mat-tab-group>
            </mat-dialog-content>
        
            <mat-dialog-actions align="end" class="gap-2 border-t !mt-4 !pt-4 !pb-2">
              <button mat-button (click)="close()" class="px-4 text-gray-600 font-medium">Đóng</button>
        
              <!-- Manual Save Button -->
              @if (activeTabIndex === 0) {
                <button
                  mat-raised-button color="primary" (click)="saveManual()" [disabled]="form.invalid || loading"
                  class="bg-[#0056D2] text-white px-8 py-2 rounded-lg shadow-lg hover:bg-[#004BB5] hover:shadow-xl transition-all disabled:opacity-50 disabled:shadow-none">
                  {{ loading ? 'Đang xử lý...' : 'Xác nhận Thêm' }}
                </button>
              }
        
              <!-- Excel Save Button -->
              @if (activeTabIndex === 1) {
                <button
                  mat-raised-button color="primary" (click)="saveExcel()" [disabled]="!selectedFile || loading || (importSummary && importSummary.failures.length === 0)"
                  class="bg-green-600 text-white px-8 py-2 rounded-lg shadow-lg hover:bg-green-700 hover:shadow-xl transition-all disabled:opacity-50 disabled:shadow-none">
                  {{ loading ? 'Đang tải lên...' : (importSummary ? 'Hoàn tất' : 'Bắt đầu Nhập') }}
                </button>
              }
            </mat-dialog-actions>
          </div>
        `,
    styles: [`
        ::ng-deep .mat-mdc-tab-body-wrapper { padding-bottom: 0 !important; }
        ::ng-deep .mat-mdc-dialog-container { padding: 0 !important; }
        .animate-fadeIn { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
    `]
})
export class AddStudentDialogComponent {
    private fb = inject(FormBuilder);
    private dialogRef = inject(MatDialogRef<AddStudentDialogComponent>);
    private classService = inject(ClassService);
    data = inject(MAT_DIALOG_DATA);

    form = this.fb.group({
        email: ['', [Validators.required, Validators.email]]
    });

    activeTabIndex = 0;
    loading = false;
    manualError = '';

    // Excel upload related
    selectedFile: File | null = null;
    isDragging = false;
    excelError = '';
    importSummary: any = null;

    onTabActiveChange(index: number) {
        this.activeTabIndex = index;
        // Don't reset everything to allow users to switch back and check instructions
    }

    saveManual() {
        if (this.form.invalid) return;
        this.loading = true;
        this.manualError = '';
        const email = this.form.value.email!;

        this.classService.enrollStudent(this.data.classId, email).subscribe({
            next: () => {
                this.loading = false;
                this.dialogRef.close(true);
            },
            error: (err) => {
                this.loading = false;
                this.manualError = err.error?.message || 'Không tìm thấy hoặc không thể thêm học viên này.';
            }
        });
    }

    // Excel Logic
    onDragOver(event: DragEvent) {
        event.preventDefault();
        this.isDragging = true;
    }

    onDragLeave(event: DragEvent) {
        event.preventDefault();
        this.isDragging = false;
    }

    onDrop(event: DragEvent) {
        event.preventDefault();
        this.isDragging = false;
        const file = event.dataTransfer?.files[0];
        this.validateAndSetFile(file);
    }

    onFileSelected(event: any) {
        const file = event.target.files[0];
        this.validateAndSetFile(file);
    }

    private validateAndSetFile(file: File | undefined) {
        if (!file) return;
        if (!file.name.endsWith('.xlsx')) {
            this.excelError = 'Định dạng file không hỗ trợ. Vui lòng sử dụng .xlsx';
            this.selectedFile = null;
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            this.excelError = 'File quá lớn (> 5MB). Vui lòng chia nhỏ file.';
            this.selectedFile = null;
            return;
        }
        this.selectedFile = file;
        this.excelError = '';
        this.importSummary = null;
    }

    removeFile() {
        this.selectedFile = null;
        this.importSummary = null;
        this.excelError = '';
    }

    saveExcel() {
        if (!this.selectedFile) return;
        this.loading = true;
        this.excelError = '';
        this.importSummary = null;

        this.classService.importStudentsExcel(this.data.classId, this.selectedFile).subscribe({
            next: (summary) => {
                this.loading = false;
                this.importSummary = summary;
            },
            error: (err) => {
                this.loading = false;
                this.excelError = err.error?.message || 'Lỗi hệ thống khi xử lý file. Vui lòng thử lại.';
            }
        });
    }

    close() {
        // If we had some success, close with true to refresh list
        if (this.importSummary && this.importSummary.successes.length > 0) {
            this.dialogRef.close(true);
        } else {
            this.dialogRef.close(false);
        }
    }
}
