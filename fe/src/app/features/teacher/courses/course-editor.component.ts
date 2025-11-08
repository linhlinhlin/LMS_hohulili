import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CourseApi } from '../../../api/client/course.api';
import { CourseDetail, CreateSectionRequest } from '../../../api/types/course.types';
import { SectionApi } from '../../../api/client/section.api';
// Lessons are managed on a dedicated page now

@Component({
  selector: 'app-course-editor',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  encapsulation: ViewEncapsulation.None,
  template: `
  <div class="max-w-5xl mx-auto p-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Chỉnh sửa khóa học</h1>

      <div class="bg-white shadow p-6" *ngIf="course() as c; else loadingTpl">
        <form [formGroup]="form" (ngSubmit)="onSave()" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Mã khóa học</label>
            <input formControlName="code" type="text" class="w-full border px-3 py-2" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tên khóa học</label>
            <input formControlName="title" type="text" class="w-full border px-3 py-2" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
            <textarea formControlName="description" rows="8" class="w-full border px-3 py-2 min-h-[180px]"></textarea>
          </div>

          <div class="flex items-center gap-3">
            <button type="submit" [disabled]="form.invalid || saving()" class="px-4 py-2 bg-blue-600 text-white disabled:opacity-50">
              {{ saving() ? 'Đang lưu...' : 'Lưu thay đổi' }}
            </button>
            <button type="button" (click)="onPublish()" [disabled]="publishing()" class="px-4 py-2 bg-green-600 text-white disabled:opacity-50">
              {{ publishing() ? 'Đang xuất bản...' : 'Xuất bản' }}
            </button>
            <span class="text-green-700">{{ success() }}</span>
            <span class="text-red-600">{{ error() }}</span>
          </div>
        </form>
      </div>

      <!-- Course Content Management -->
      <h2 class="text-xl font-semibold text-gray-900 mb-6 mt-8" *ngIf="course() as c">Nội dung khóa học</h2>

      <!-- Empty state: no sections yet -->
      <div *ngIf="sections().length === 0" class="p-6 text-gray-500 text-center bg-gray-50 mb-6">
        <svg class="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
        </svg>
        Chưa có chương nào. Tạo chương đầu tiên để thêm bài học.
      </div>

      <!-- Action Bar -->
      <div class="flex items-center justify-between mb-4" *ngIf="course() as c">
        <div class="flex items-center gap-3">
          <input class="shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Tiêu đề chương (VD: Chương 1)" [(ngModel)]="newSectionTitle" name="newSectionTitle" />
          <button type="button" class="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-2" (click)="createSection()">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Tạo chương
          </button>
        </div>
      </div>
      
      <div *ngIf="sectionError" class="mb-4 p-3 bg-red-50 text-red-600 text-sm">
        {{ sectionError }}
      </div>

      <!-- Sections Table -->
      <div class="shadow-sm" *ngIf="sections().length > 0">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-4 text-left text-sm md:text-base font-medium text-gray-600 uppercase tracking-wider">STT</th>
                <th class="px-6 py-4 text-left text-sm md:text-base font-medium text-gray-600 uppercase tracking-wider">Tên chương</th>
                <th class="px-6 py-4 text-left text-sm md:text-base font-medium text-gray-600 uppercase tracking-wider">Mô tả</th>
                <th class="px-6 py-4 text-left text-sm md:text-base font-medium text-gray-600 uppercase tracking-wider">Bài học</th>
                <th class="px-6 py-4 text-right text-sm md:text-base font-medium text-gray-600 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let sec of sections(); let i = index" class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {{ i + 1 }}
                </td>
                <td class="px-6 py-4">
                  <input class="w-full border-0 bg-transparent focus:outline-none text-gray-900" 
                         [ngModel]="sectionTitles[sec.id]" 
                         (ngModelChange)="sectionTitles[sec.id] = $event"
                         (blur)="renameSection(sec.id)"
                         placeholder="Nhập tên chương"/>
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">
                  {{ sec.description || 'Chưa có mô tả' }}
                </td>
                <td class="px-6 py-4 text-sm text-blue-600">
                  {{ sec.lessonCount || 0 }} bài học
                </td>
                <td class="px-6 py-4 text-right text-sm">
                  <a class="text-green-600 hover:text-green-700 mr-4" 
                     [routerLink]="['/teacher/courses', course()!.id, 'sections', sec.id]">
                    Quản lý bài học
                  </a>
                  <button class="text-red-600 hover:text-red-700" 
                          (click)="deleteSection(sec.id)">
                    Xóa chương
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      <!-- Assign student to this course (teacher/admin) -->
      <div class="bg-white shadow p-6 mt-6" *ngIf="course() as c">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Gán học viên vào khóa học</h2>
        <div class="flex gap-3 items-end">
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-700 mb-1">Email học viên</label>
            <input [(ngModel)]="assign.email" name="assignEmail" type="email" class="w-full border px-3 py-2" placeholder="hocvien@example.com" required />
          </div>
          <button type="button" class="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50" (click)="assignStudent()" [disabled]="assigning() || !assign.email?.trim()">
            {{ assigning() ? 'Đang gán...' : 'Gán học viên' }}
          </button>
        </div>
        <div class="mt-3 flex items-center gap-3">
          <span class="text-green-700" *ngIf="assignSuccess()">{{ assignSuccess() }}</span>
          <span class="text-red-600" *ngIf="assignError()">{{ assignError() }}</span>
        </div>
        <p class="text-xs text-gray-500 mt-2">Nhập email của học viên đã có tài khoản trong hệ thống</p>
      </div>

      <!-- Bulk enrollment via Excel -->
      <div class="bg-white shadow p-6 mt-6" *ngIf="course() as c">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Gán nhiều học viên bằng file Excel</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Chọn file Excel (.xlsx hoặc .xls)</label>
            <input type="file" #fileInput (change)="onExcelFileSelected($event)" accept=".xlsx,.xls" class="w-full border px-3 py-2 file:mr-3 file:py-1 file:px-3 file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          </div>
          <div class="flex gap-3">
            <button type="button" (click)="bulkEnrollStudents()" [disabled]="bulkEnrolling() || !selectedFile()" class="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
              {{ bulkEnrolling() ? 'Đang xử lý...' : 'Gán học viên từ Excel' }}
            </button>
            <button type="button" (click)="clearExcelFile()" [disabled]="!selectedFile()" class="px-4 py-2 bg-gray-500 text-white hover:bg-gray-600 disabled:opacity-50">
              Xóa file
            </button>
          </div>
          
          <!-- File info -->
          <div *ngIf="selectedFile()" class="p-3 bg-blue-50 border">
            <p class="text-sm text-blue-800">
              <strong>File đã chọn:</strong> {{ selectedFile()?.name }} ({{ (selectedFile()!.size / 1024).toFixed(1) }} KB)
            </p>
          </div>
          
          <!-- Bulk enrollment results -->
          <div *ngIf="bulkResult()" class="p-4 border">
            <h3 class="font-semibold text-gray-900 mb-2">Kết quả gán học viên:</h3>
            <div class="grid grid-cols-3 gap-4 mb-3">
              <div class="text-center p-2 bg-blue-50 border">
                <div class="text-2xl font-bold text-blue-600">{{ bulkResult()?.totalProcessed || 0 }}</div>
                <div class="text-xs text-blue-800">Tổng xử lý</div>
              </div>
              <div class="text-center p-2 bg-green-50 border">
                <div class="text-2xl font-bold text-green-600">{{ bulkResult()?.successCount || 0 }}</div>
                <div class="text-xs text-green-800">Thành công</div>
              </div>
              <div class="text-center p-2 bg-red-50 border">
                <div class="text-2xl font-bold text-red-600">{{ bulkResult()?.errorCount || 0 }}</div>
                <div class="text-xs text-red-800">Lỗi</div>
              </div>
            </div>
            
            <!-- Success list -->
            <div *ngIf="bulkResult()?.successfulEnrollments?.length" class="mb-3">
              <h4 class="text-sm font-medium text-green-800 mb-1">Emails đã gán thành công:</h4>
              <div class="max-h-32 overflow-y-auto bg-green-50 p-2 border text-xs">
                <div *ngFor="let email of bulkResult()?.successfulEnrollments" class="text-green-700">✓ {{ email }}</div>
              </div>
            </div>
            
            <!-- Error list -->
            <div *ngIf="bulkResult()?.errors?.length" class="mb-3">
              <h4 class="text-sm font-medium text-red-800 mb-1">Emails lỗi:</h4>
              <div class="max-h-32 overflow-y-auto bg-red-50 p-2 border text-xs">
                <div *ngFor="let error of bulkResult()?.errors" class="text-red-700 mb-1">
                  ✗ {{ error.email }}: {{ error.errorMessage }}
                </div>
              </div>
            </div>
          </div>
          
          <div class="mt-3 flex items-center gap-3">
            <span class="text-green-700" *ngIf="bulkSuccess()">{{ bulkSuccess() }}</span>
            <span class="text-red-600" *ngIf="bulkError()">{{ bulkError() }}</span>
          </div>
          
          <div class="text-xs text-gray-500 space-y-1">
            <p>• File Excel cần chứa danh sách email học viên (có thể ở cột đầu tiên hoặc bất kỳ cột nào)</p>
            <p>• Hệ thống sẽ tự động tìm và trích xuất các email hợp lệ</p>
            <p>• Chỉ những email đã có tài khoản học viên trong hệ thống mới được gán thành công</p>
          </div>
        </div>
      </div>

      <ng-template #loadingTpl>
        <div class="bg-white border shadow p-6">
          <ng-container *ngIf="!error(); else errorTpl">
            <div class="text-gray-600">Đang tải khóa học...</div>
          </ng-container>
          <ng-template #errorTpl>
            <div class="text-red-600 mb-3">{{ error() }}</div>
            <a class="inline-flex items-center gap-2 px-4 py-2 border hover:bg-gray-50 transition-colors" routerLink="/teacher/courses">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
              </svg>
              Quay lại danh sách khóa học
            </a>
          </ng-template>
        </div>
      </ng-template>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseEditorComponent {
  private route = inject(ActivatedRoute);
  private api = inject(CourseApi);
  private fb = inject(FormBuilder);
  private sectionApi = inject(SectionApi);

  course = signal<CourseDetail | null>(null);
  saving = signal(false);
  publishing = signal(false);
  success = signal('');
  error = signal('');

  // Content state
  sections = signal<any[]>([]);
  sectionTitles: Record<string, string> = {};
  newSectionTitle = '';
  sectionError = '';
  // Inline lesson editing removed

  // Assign student state
  assigning = signal(false);
  assignSuccess = signal('');
  assignError = signal('');
  assign: { email?: string } = {};

  // Bulk enrollment state
  bulkEnrolling = signal(false);
  bulkSuccess = signal('');
  bulkError = signal('');
  selectedFile = signal<File | null>(null);
  bulkResult = signal<any>(null);

  form = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(64)]],
    title: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['']
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.getCourseById(id).subscribe({
      next: (res) => {
        const c = res?.data as CourseDetail;
        this.course.set(c);
        if (c) {
          this.form.patchValue({ code: c.code, title: c.title, description: c.description });
          // Load sections using flat endpoint
          this.sectionApi.listSectionsFlat(id).subscribe({
            next: (sres) => {
              const data = sres?.data || [];
              this.sections.set(data);
              data.forEach((sec: any) => {
                this.sectionTitles[sec.id] = sec.title;
              });
            },
            error: (err) => {
              this.error.set(err?.message || 'Không tải được danh sách chương');
            }
          });
        }
      },
      error: (err) => {
        const msg = err?.message || err?.original?.error?.message || 'Không tải được khóa học';
        this.error.set(msg);
      }
    });
  }

  onSave() {
    if (this.form.invalid || !this.course()) return;
    this.saving.set(true);
    this.success.set('');
    this.error.set('');
    const id = this.course()!.id;
    const raw = this.form.getRawValue();
    const payload = {
      code: raw.code || undefined,
      title: raw.title || undefined,
      description: raw.description || undefined
    };
    this.api.updateCourse(id, payload).subscribe({
      next: () => {
        this.success.set('Đã lưu thay đổi');
      },
      error: (err) => {
        this.error.set(err?.message || 'Lưu thất bại');
      },
      complete: () => this.saving.set(false)
    });
  }

  onPublish() {
    if (!this.course()) return;
    this.publishing.set(true);
    this.success.set('');
    this.error.set('');
    const id = this.course()!.id;
    this.api.publishCourse(id).subscribe({
      next: () => {
        this.success.set('Đã xuất bản khóa học');
      },
      error: (err) => {
        this.error.set(err?.message || 'Xuất bản thất bại');
      },
      complete: () => this.publishing.set(false)
    });
  }

  // --- Content actions ---
  createSection() {
    this.sectionError = '';
    const c = this.course();
    if (!c) return;
    const title = (this.newSectionTitle || '').trim();
    if (!title) { this.sectionError = 'Nhập tiêu đề section'; return; }
    const payload: CreateSectionRequest = { title };
    this.sectionApi.createSection(c.id, payload).subscribe({
      next: (res) => {
        const sec = res?.data as any;
        if (sec) {
          this.sections.update(list => [...list, sec]);
          this.sectionTitles[sec.id] = sec.title;
          this.newSectionTitle = '';
        }
      },
      error: (err) => this.sectionError = err?.message || 'Tạo section thất bại'
    });
  }

  deleteSection(sectionId: string) {
    this.sectionApi.deleteSection(sectionId).subscribe({
      next: () => {
        this.sections.update(list => list.filter(s => s.id !== sectionId));
        delete this.sectionTitles[sectionId];
      }
    });
  }

  renameSection(sectionId: string) {
    const title = (this.sectionTitles[sectionId] || '').trim();
    if (!title) { this.sectionError = 'Tiêu đề section không được để trống'; return; }
    const payload = { title } as any;
    this.sectionApi.updateSection(sectionId, payload).subscribe({
      next: (res) => {
        const updated = res as any; // ApiClient put currently returns ApiResponse<SectionDetail> type, but usage here is simple
        this.sections.update(list => list.map(s => s.id === sectionId ? { ...s, title } : s));
      },
      error: (err) => this.sectionError = err?.message || 'Đổi tên section thất bại'
    });
  }

  // Inline lessons are managed on a dedicated page; no lesson handlers here

  assignStudent() {
    const c = this.course();
    if (!c) return;
    this.assignError.set('');
    this.assignSuccess.set('');
    this.assigning.set(true);
    
    if (!this.assign.email?.trim()) {
      this.assignError.set('Vui lòng nhập email sinh viên');
      this.assigning.set(false);
      return;
    }
    
    const payload = { email: this.assign.email.trim() };
    this.api.enrollStudentAsTeacher(c.id, payload).subscribe({
      next: () => {
        this.assignSuccess.set('Đã gán học viên vào khóa học');
        this.assign = {}; // Clear form
        this.assigning.set(false);
      },
      error: (err) => {
        this.assignError.set(err?.message || 'Gán học viên thất bại');
        this.assigning.set(false);
      }
    });
  }

  onExcelFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        this.bulkError.set('Vui lòng chọn file Excel (.xlsx hoặc .xls)');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.bulkError.set('File quá lớn. Vui lòng chọn file nhỏ hơn 5MB');
        return;
      }
      
      this.selectedFile.set(file);
      this.bulkError.set('');
      this.bulkResult.set(null);
    }
  }

  clearExcelFile() {
    this.selectedFile.set(null);
    this.bulkResult.set(null);
    this.bulkError.set('');
    this.bulkSuccess.set('');
  }

  bulkEnrollStudents() {
    const c = this.course();
    const file = this.selectedFile();
    if (!c || !file) return;

    this.bulkError.set('');
    this.bulkSuccess.set('');
    this.bulkResult.set(null);
    this.bulkEnrolling.set(true);

    this.api.bulkEnrollStudents(c.id, file).subscribe({
      next: (res) => {
        this.bulkResult.set(res?.data);
        this.bulkSuccess.set(res?.message || 'Hoàn thành xử lý file Excel');
        this.bulkEnrolling.set(false);
      },
      error: (err) => {
        this.bulkError.set(err?.message || 'Lỗi xử lý file Excel');
        this.bulkEnrolling.set(false);
      }
    });
  }
}