import { Component, inject, signal, computed, input, output, resource, effect, ChangeDetectionStrategy } from '@angular/core';

import { firstValueFrom } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { ClassService } from '../../../../../../../state/class.service';
import { SideDrawerComponent } from '../../../../../../../shared/components/side-drawer/side-drawer.component';

interface EnrolledStudent {
    id: string;
    email: string;
    fullName: string;
    enrolledAt: string;
    status?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-add-student-drawer',
    imports: [ReactiveFormsModule, MatIconModule, MatButtonModule, MatTabsModule, SideDrawerComponent],
    template: `
    <app-side-drawer 
        [isOpen]="isOpen()" 
        [title]="'Quản lý Học viên'" 
        [subtitle]="'Xem danh sách và thêm học viên vào lớp'"
        [width]="'580px'"
        (onClose)="close()">
      
      <div class="space-y-6">
        <mat-tab-group (selectedIndexChange)="onTabChange($event)">
          <!-- Tab 1: Danh sách học viên hiện tại -->
          <mat-tab label="Danh sách học viên">
            <div class="pt-6 space-y-4">
                <!-- Header Stats -->
                <div class="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div class="flex items-center gap-2">
                        <mat-icon class="text-slate-500">groups</mat-icon>
                        <span class="text-sm font-bold text-slate-700">Tổng số học viên</span>
                    </div>
                    <span class="text-lg font-black text-blue-600">{{ enrolledStudents().length }}</span>
                </div>

                <!-- Loading State -->
                @if (isLoadingStudents()) {
                    <div class="flex flex-col items-center justify-center py-12 gap-3">
                        <div class="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <p class="text-sm text-gray-500">Đang tải danh sách...</p>
                    </div>
                }

                <!-- Empty State -->
                @if (!isLoadingStudents() && enrolledStudents().length === 0) {
                    <div class="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <mat-icon class="text-5xl text-gray-300 mb-3">person_off</mat-icon>
                        <p class="text-sm font-bold text-gray-600">Chưa có học viên nào</p>
                        <p class="text-xs text-gray-400 mt-1">Chuyển sang tab "Thêm học viên" để ghi danh</p>
                    </div>
                }

                <!-- Student List -->
                @if (!isLoadingStudents() && enrolledStudents().length > 0) {
                    <div class="max-h-[400px] overflow-y-auto space-y-2 pr-1">
                        @for (student of enrolledStudents(); track student.id; let i = $index) {
                            <div class="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl hover:border-blue-200 hover:shadow-sm transition-all group">
                                <!-- Avatar -->
                                <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                    {{ getInitials(student.fullName || student.email) }}
                                </div>
                                
                                <!-- Info -->
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-bold text-gray-800 truncate">{{ student.fullName || 'Chưa cập nhật' }}</p>
                                    <p class="text-xs text-gray-500 truncate">{{ student.email }}</p>
                                </div>

                                <!-- Enrolled Date -->
                                <div class="text-right hidden sm:block">
                                    <p class="text-[10px] text-gray-400 uppercase">Ghi danh</p>
                                    <p class="text-xs font-medium text-gray-600">{{ formatDate(student.enrolledAt) }}</p>
                                </div>

                                <!-- Remove Button -->
                                <button (click)="removeStudent(student)" 
                                        class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                        title="Xóa học viên">
                                    <mat-icon class="text-lg">person_remove</mat-icon>
                                </button>
                            </div>
                        }
                    </div>
                }
            </div>
          </mat-tab>

          <!-- Tab 2: Thêm học viên thủ công -->
          <mat-tab label="Thêm học viên">
            <div class="pt-6 space-y-6">
                <!-- Manual Email Input -->
                <div class="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-4">
                    <div class="flex items-center gap-2 mb-2">
                        <mat-icon class="text-blue-600">person_add</mat-icon>
                        <h4 class="text-sm font-black text-blue-800 uppercase tracking-wide">Nhập email thủ công</h4>
                    </div>
                    
                    <form [formGroup]="form" class="space-y-3">
                        <div class="relative group">
                            <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors">mail_outline</mat-icon>
                            <input type="email" formControlName="email" 
                                   class="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                   placeholder="student@example.com">
                        </div>
                        
                        @if (manualError()) {
                            <div class="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
                                <mat-icon class="text-red-500 text-sm">error_outline</mat-icon>
                                <span class="text-xs text-red-700 font-medium">{{ manualError() }}</span>
                            </div>
                        }

                        <button type="button" (click)="saveManual()" 
                                [disabled]="form.invalid || isLoading()"
                                class="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                            @if (isLoading() && activeTabIndex() === 1) {
                                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            }
                            <span>Thêm học viên</span>
                        </button>
                    </form>
                </div>

                <!-- Divider -->
                <div class="flex items-center gap-4">
                    <div class="flex-1 h-px bg-gray-200"></div>
                    <span class="text-xs font-bold text-gray-400 uppercase">Hoặc</span>
                    <div class="flex-1 h-px bg-gray-200"></div>
                </div>

                <!-- Excel Upload Section -->
                <div class="space-y-4">
                    <div class="flex items-center gap-2">
                        <mat-icon class="text-green-600">upload_file</mat-icon>
                        <h4 class="text-sm font-black text-green-800 uppercase tracking-wide">Tải lên file Excel</h4>
                    </div>

                    <!-- Instructions -->
                    <div class="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                        <p class="text-[11px] text-amber-700 leading-relaxed">
                            <strong>Cấu trúc file:</strong> Cột A chứa danh sách email học viên. Hệ thống sẽ tự động đối soát.
                        </p>
                    </div>

                    <!-- Dropzone -->
                    <div class="relative group h-36 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer flex flex-col items-center justify-center p-4 text-center"
                         [class.border-green-500]="isDragging() || selectedFile()"
                         [class.bg-green-50/50]="isDragging() || selectedFile()"
                         [class.border-gray-200]="!isDragging() && !selectedFile()"
                         (dragover)="onDragOver($event)"
                         (dragleave)="onDragLeave($event)"
                         (drop)="onDrop($event)"
                         (click)="fileInput.click()">
                       
                      <input #fileInput type="file" class="hidden" (change)="onFileSelected($event)" accept=".xlsx">
                      
                      @if (!validationResource.isLoading()) {
                          <div class="space-y-2">
                              <mat-icon class="text-3xl" [class.text-green-600]="selectedFile()" [class.text-gray-400]="!selectedFile()">
                                  {{ selectedFile() ? 'check_circle' : 'cloud_upload' }}
                              </mat-icon>
                              @if (!selectedFile()) {
                                  <p class="text-xs font-bold text-gray-600">Kéo & thả hoặc <span class="text-green-600">chọn file</span></p>
                              } @else {
                                  <p class="text-xs font-bold text-green-700">{{ selectedFile()?.name }}</p>
                                  <button (click)="$event.stopPropagation(); removeFile()" class="text-[10px] text-red-500 hover:underline font-bold">Gỡ bỏ</button>
                              }
                          </div>
                      } @else {
                          <div class="w-8 h-8 border-3 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                          <p class="text-xs font-bold text-green-600 mt-2">Đang đối soát...</p>
                      }
                    </div>

                    <!-- Validation Results -->
                    @if (importSummary()) {
                        <div class="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-bold text-gray-500 uppercase">Kết quả xem trước</span>
                                <div class="flex gap-3">
                                   <span class="text-xs font-bold text-green-600 flex items-center gap-1">
                                       <mat-icon class="text-sm">check_circle</mat-icon> {{ importSummary()?.successes?.length || 0 }}
                                   </span>
                                   <span class="text-xs font-bold text-red-600 flex items-center gap-1">
                                       <mat-icon class="text-sm">error</mat-icon> {{ importSummary()?.failures?.length || 0 }}
                                   </span>
                                </div>
                            </div>

                            @if (importSummary()?.failures?.length) {
                                <div class="max-h-32 overflow-y-auto space-y-1">
                                    @for (f of importSummary()?.failures; track f.email + f.rowNumber) {
                                        <div class="text-xs p-2 bg-red-50 rounded-lg flex items-center gap-2">
                                            <span class="font-bold text-gray-500">R{{ f.rowNumber }}</span>
                                            <span class="text-gray-700 truncate flex-1">{{ f.email }}</span>
                                            <span class="text-red-500">{{ f.reason }}</span>
                                        </div>
                                    }
                                </div>
                            }

                            <button (click)="saveExcel()" 
                                    [disabled]="!canCommitExcel() || isLoading()"
                                    class="w-full py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                                @if (isLoading() && activeTabIndex() === 1) {
                                    <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                }
                                <span>Ghi danh {{ importSummary()?.successes?.length || 0 }} học viên</span>
                            </button>
                        </div>
                    }
                </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </div>

      <div footer class="w-full flex justify-end gap-3 mt-4">
        <button mat-button (click)="close()" class="px-6 py-2.5 font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">Đóng</button>
      </div>
    </app-side-drawer>
    `,
    styles: [`
        :host { display: block; }
        ::ng-deep .mat-mdc-tab-group { --mdc-tab-indicator-active-indicator-color: #2563eb; }
        ::ng-deep .mat-mdc-tab .mdc-tab__text-label { font-weight: 800; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; color: #64748b; }
        ::ng-deep .mat-mdc-tab.mdc-tab--active .mdc-tab__text-label { color: #2563eb; }
    `]
})
export class AddStudentDrawerComponent {
    private fb = inject(FormBuilder);
    private classService = inject(ClassService);

    // Signal Inputs
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
    isLoadingStudents = signal(false);
    enrolledStudents = signal<EnrolledStudent[]>([]);

    selectedFile = signal<File | null>(null);
    isDragging = signal(false);
    actionError = signal('');

    // Resource API for Excel Validation
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

    constructor() {
        // Load students when drawer opens
        effect(() => {
            if (this.isOpen() && this.classId()) {
                this.loadEnrolledStudents();
            }
        });
    }

    onTabChange(index: number) {
        this.activeTabIndex.set(index);
        if (index === 0) {
            this.loadEnrolledStudents();
        }
    }

    async loadEnrolledStudents() {
        const cid = this.classId();
        if (!cid) return;

        this.isLoadingStudents.set(true);
        try {
            const students = await firstValueFrom(this.classService.getClassStudents(cid));
            this.enrolledStudents.set(students || []);
        } catch {
            this.enrolledStudents.set([]);
        } finally {
            this.isLoadingStudents.set(false);
        }
    }

    getInitials(name: string): string {
        if (!name) return '?';
        const parts = name.split(' ').filter(p => p);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    formatDate(dateStr: string): string {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch {
            return dateStr;
        }
    }

    async removeStudent(student: EnrolledStudent) {
        if (!confirm(`Bạn chắc chắn muốn xóa học viên "${student.fullName || student.email}" khỏi lớp?`)) return;
        
        this.isLoading.set(true);
        try {
            await firstValueFrom(this.classService.removeStudentFromClass(this.classId(), student.id));
            this.loadEnrolledStudents();
            this.onSaved.emit();
        } catch (err: any) {
            alert(err.error?.message || 'Không thể xóa học viên này.');
        } finally {
            this.isLoading.set(false);
        }
    }

    close() {
        this.isOpenChange.emit(false);
        this.reset();
    }

    private reset() {
        this.form.reset();
        this.manualError.set('');
        this.selectedFile.set(null);
        this.isLoading.set(false);
        this.activeTabIndex.set(0);
    }

    saveManual() {
        if (this.form.invalid) return;
        this.isLoading.set(true);
        this.manualError.set('');

        const email = this.form.value.email!;
        this.classService.enrollStudent(this.classId(), email).subscribe({
            next: () => {
                this.isLoading.set(false);
                this.form.reset();
                this.manualError.set('');
                this.onSaved.emit();
                this.loadEnrolledStudents();
                // Show success briefly then switch to list tab
                this.activeTabIndex.set(0);
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
        this.classService.importStudentsExcel(cid, file, false).subscribe({
            next: () => {
                this.isLoading.set(false);
                this.selectedFile.set(null);
                this.onSaved.emit();
                this.loadEnrolledStudents();
                this.activeTabIndex.set(0);
            },
            error: (err) => {
                this.isLoading.set(false);
                this.actionError.set(err.error?.message || 'Có lỗi xảy ra khi ghi danh.');
            }
        });
    }
}
