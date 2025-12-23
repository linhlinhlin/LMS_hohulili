import { Component, inject, signal, computed, input, output, resource } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom, of } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { ClassService } from '../../../../../../../state/class.service';
import { SideDrawerComponent } from '../../../../../../../shared/components/ui/side-drawer/side-drawer.component';

@Component({
    selector: 'app-add-student-drawer',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatButtonModule, MatTabsModule, SideDrawerComponent],
    template: `
    <app-side-drawer 
        [isOpen]="isOpen()" 
        [title]="'Ghi danh Học viên'" 
        [subtitle]="'Thêm học viên vào lớp học của bạn'"
        [width]="'520px'"
        (onClosed)="close()">
      
      <div class="space-y-6">
        <mat-tab-group (selectedIndexChange)="activeTabIndex.set($event)">
          <!-- Tab 1: Manual -->
          <mat-tab label="Ghi danh Thủ công">
            <form [formGroup]="form" class="space-y-4 pt-6">
                <div class="space-y-1">
                    <label class="text-sm font-bold text-gray-700">Email Học viên</label>
                    <div class="relative group">
                        <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors">mail_outline</mat-icon>
                        <input type="email" formControlName="email" 
                               class="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                               placeholder="student@example.com">
                    </div>
                </div>
                
                @if (manualError()) {
                    <div class="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 animate-in fade-in duration-300">
                        <mat-icon class="text-red-500">error_outline</mat-icon>
                        <span class="text-sm text-red-700 font-medium leading-relaxed">{{ manualError() }}</span>
                    </div>
                }
            </form>
          </mat-tab>

          <!-- Tab 2: Excel -->
          <mat-tab label="Tải lên Excel">
            <div class="pt-6 space-y-6">
                <!-- Instructions -->
                <div class="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
                    <h4 class="text-xs font-black text-blue-800 uppercase tracking-widest mb-2">Cấu trúc file yC</h4>
                    <p class="text-[11px] text-blue-700 leading-relaxed">
                        File .xlsx cần có cột <span class="bg-blue-100 px-1 rounded font-bold underline">Email</span> tại trang đầu tiên. 
                        Hệ thống sẽ tự động đối soát và kiểm tra sự tồn tại của học viên.
                    </p>
                </div>

                <!-- Dropzone -->
                <div class="relative group h-48 rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer flex flex-col items-center justify-center p-6 text-center"
                     [class.border-blue-500]="isDragging()"
                     [class.bg-blue-50/50]="isDragging()"
                     [class.border-gray-200]="!isDragging() && !selectedFile()"
                     [class.border-green-500]="selectedFile()"
                     [class.bg-green-50/30]="selectedFile()"
                     (dragover)="onDragOver($event)"
                     (dragleave)="onDragLeave($event)"
                     (drop)="onDrop($event)"
                     (click)="fileInput.click()">
                  
                  <input #fileInput type="file" class="hidden" (change)="onFileSelected($event)" accept=".xlsx">
                  
                  @if (!validationResource.isLoading()) {
                      <div class="space-y-3">
                          <div class="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 group-hover:bg-blue-50 transition-all duration-500">
                              <mat-icon class="text-3xl text-gray-400 group-hover:text-blue-600 transition-colors">
                                  {{ selectedFile() ? 'check_circle' : 'cloud_upload' }}
                              </mat-icon>
                          </div>
                          @if (!selectedFile()) {
                              <div class="space-y-1">
                                  <p class="text-sm font-bold text-gray-700">Kéo & thả file hoặc <span class="text-blue-600">chọn file</span></p>
                                  <p class="text-[10px] text-gray-400">Hỗ trợ Excel (.xlsx) lên đến 5MB</p>
                              </div>
                          } @else {
                              <div class="space-y-1">
                                  <p class="text-sm font-bold text-green-700">{{ selectedFile()?.name }}</p>
                                  <button (click)="$event.stopPropagation(); removeFile()" class="text-[10px] text-red-500 hover:underline font-bold">Gỡ bỏ file này</button>
                              </div>
                          }
                      </div>
                  } @else {
                      <div class="space-y-4">
                          <div class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto text-center"></div>
                          <p class="text-sm font-bold text-blue-600">Đang đối soát dữ liệu...</p>
                      </div>
                  }
                </div>

                <!-- Instant Validation Results -->
                @if (importSummary()) {
                    <div class="space-y-4 animate-in slide-in-from-top-4 duration-500">
                        <div class="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-2xl border border-gray-100">
                            <h5 class="text-xs font-black text-gray-500 uppercase tracking-widest">Kết quả xem trước</h5>
                            <div class="flex gap-4">
                               <span class="text-xs font-bold text-green-600 flex items-center gap-1">
                                   <mat-icon class="text-sm scale-75">check_circle</mat-icon> {{ importSummary()?.successes?.length }}
                               </span>
                               <span class="text-xs font-bold text-red-600 flex items-center gap-1">
                                   <mat-icon class="text-sm scale-75">error</mat-icon> {{ importSummary()?.failures?.length }}
                               </span>
                            </div>
                        </div>

                        <!-- Failures List -->
                        @if (importSummary()?.failures?.length) {
                            <div class="max-h-48 overflow-y-auto rounded-2xl border border-gray-100 divide-y divide-gray-50">
                                @for (f of importSummary()?.failures; track f.email + f.rowNumber) {
                                    <div class="p-3 flex items-start gap-3 hover:bg-red-50/30 transition-colors">
                                        <span class="text-[10px] font-black bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">R{{ f.rowNumber }}</span>
                                        <div class="flex-1 min-w-0">
                                            <p class="text-xs font-bold text-gray-700 truncate">{{ f.email }}</p>
                                            <p class="text-[10px] text-red-500 font-medium">{{ f.reason }}</p>
                                        </div>
                                    </div>
                                }
                            </div>
                        } @else if (importSummary()?.successes?.length) {
                             <div class="p-8 text-center bg-green-50/30 rounded-3xl border border-dashed border-green-200">
                                 <mat-icon class="text-4xl text-green-500 mb-2">fact_check</mat-icon>
                                 <p class="text-sm font-bold text-green-800">Dữ liệu sẵn sàng!</p>
                                 <p class="text-xs text-green-600">Tất cả {{ importSummary()?.successes?.length }} học viên đều hợp lệ.</p>
                             </div>
                        }
                    </div>
                }

                @if (validationResource.error()) {
                    <div class="p-4 bg-orange-50 border border-orange-100 rounded-xl flex items-start gap-3">
                        <mat-icon class="text-orange-500">warning</mat-icon>
                        <span class="text-sm text-orange-700 font-medium">Lỗi đối soát dữ liệu. Hãy kiểm tra lại file.</span>
                    </div>
                }
            </div>
          </mat-tab>
        </mat-tab-group>
      </div>

      <div footer class="w-full flex justify-end gap-3 mt-4">
        <button mat-button (click)="close()" class="px-6 py-2.5 font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">Hủy</button>
        
        @if (activeTabIndex() === 0) {
            <button mat-raised-button color="primary" 
                    [disabled]="form.invalid || isLoading()"
                    (click)="saveManual()"
                    class="px-8 py-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50">
                {{ isLoading() ? 'Đang xử lý...' : 'Xác nhận Thêm' }}
            </button>
        } @else {
            <button mat-raised-button color="primary" 
                    [disabled]="!selectedFile() || isLoading() || !canCommitExcel()"
                    (click)="saveExcel()"
                    class="px-8 py-2.5 bg-green-600 text-white rounded-xl shadow-lg shadow-green-200 hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50">
                {{ isLoading() ? 'Đang thực hiện...' : 'Bắt đầu Ghi danh' }}
            </button>
        }
      </div>
    </app-side-drawer>
    `,
    styles: [`
        :host { display: block; }
        ::ng-deep .mat-mdc-tab-group { --mdc-tab-indicator-active-indicator-color: #2563eb; }
        ::ng-deep .mat-mdc-tab .mdc-tab__text-label { font-weight: 800; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; color: #64748b; }
        ::ng-deep .mat-mdc-tab.mdc-tab--active .mdc-tab__text-label { color: #2563eb; }
    `]
})
export class AddStudentDrawerComponent {
    private fb = inject(FormBuilder);
    private classService = inject(ClassService);

    // Signal Inputs (Standard SOTA 2025)
    isOpen = input(false);
    classId = input('');

    // Signal Outputs
    isOpenChange = output<boolean>();
    onSaved = output<void>();

    form = this.fb.group({
        email: ['', [Validators.required, Validators.email]]
    });

    activeTabIndex = signal(0);
    isLoading = signal(false);
    manualError = signal('');

    selectedFile = signal<File | null>(null);
    isDragging = signal(false);
    actionError = signal('');

    // Modern Resource API for Instant Validation (SOTA 2025)
    validationResource = resource<any, any>({
        request: () => ({ file: this.selectedFile(), classId: this.classId() }),
        loader: (r: any) => {
            if (!r.request.file || !r.request.classId) return Promise.resolve(null);
            return firstValueFrom(this.classService.importStudentsExcel(r.request.classId, r.request.file, true));
        }
    } as any);

    importSummary = computed<any>(() => this.validationResource.value());

    canCommitExcel = computed(() => {
        const summary = this.importSummary();
        return summary && summary.successes && summary.successes.length > 0;
    });

    close() {
        this.isOpenChange.emit(false);
        this.reset();
    }

    private reset() {
        this.form.reset();
        this.manualError.set('');
        this.selectedFile.set(null);
        this.isLoading.set(false);
    }

    saveManual() {
        if (this.form.invalid) return;
        this.isLoading.set(true);
        this.manualError.set('');

        const email = this.form.value.email!;
        this.classService.enrollStudent(this.classId(), email).subscribe({
            next: () => {
                this.isLoading.set(false);
                this.onSaved.emit();
                this.close();
            },
            error: (err) => {
                this.isLoading.set(false);
                this.manualError.set(err.error?.message || 'Không thể thêm học viên này.');
            }
        });
    }

    // Excel Handlers
    onDragOver(event: DragEvent) {
        event.preventDefault();
        this.isDragging.set(true);
    }

    onDragLeave(event: DragEvent) {
        event.preventDefault();
        this.isDragging.set(false);
    }

    onDrop(event: DragEvent) {
        event.preventDefault();
        this.isDragging.set(false);
        const file = event.dataTransfer?.files[0];
        this.handleFileUpload(file);
    }

    onFileSelected(event: any) {
        this.handleFileUpload(event.target.files[0]);
    }

    private handleFileUpload(file: File | undefined) {
        if (!file) return;
        if (!file.name.endsWith('.xlsx')) {
            // We could handle this in the resource too, but for UI feedback:
            this.selectedFile.set(null);
            return;
        }

        this.selectedFile.set(file);
    }

    removeFile() {
        this.selectedFile.set(null);
    }

    saveExcel() {
        const file = this.selectedFile();
        const cid = this.classId();
        if (!file || !cid) return;

        this.isLoading.set(true);
        // Real import: Call with preview=false (default)
        this.classService.importStudentsExcel(cid, file, false).subscribe({
            next: () => {
                this.isLoading.set(false);
                this.onSaved.emit();
                this.close();
            },
            error: (err) => {
                this.isLoading.set(false);
                this.actionError.set(err.error?.message || 'Có lỗi xảy ra khi ghi danh.');
            }
        });
    }
}
