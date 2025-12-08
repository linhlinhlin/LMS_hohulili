import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CourseEditorStore } from '../../store/course-editor.store';
import { CourseAuthoringService } from '../../services/course-authoring.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
    selector: 'app-course-info',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    template: `
    <div class="max-w-10xl mx-auto">
      <!-- Page Header -->
      <div class="bg-white shadow-sm border border-gray-200 px-6 py-3">
        <h1 class="text-2xl font-bold text-gray-900">Thông tin khóa học</h1>
        <p class="text-gray-500 mt-1">Cập nhật thông tin cơ bản của khóa học</p>
      </div>
      
      <form [formGroup]="form" class="bg-white shadow-sm border border-gray-200 px-6 py-3 space-y-2">
        <!-- Title -->
        <div class="space-y-2">
            <label class="block text-sm font-semibold text-gray-700">Tên khóa học <span class="text-red-500">*</span></label>
            <input formControlName="title" 
                   class="w-full h-11 px-4 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400"
                   placeholder="VD: Kỹ thuật hàng hải nâng cao" />
        </div>

        <!-- Description -->
        <div class="space-y-2">
            <label class="block text-sm font-semibold text-gray-700">Mô tả khóa học</label>
            <textarea formControlName="description" 
                      class="w-full min-h-[140px] p-4 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400 resize-y"
                      placeholder="Mô tả chi tiết về nội dung và mục tiêu của khóa học..."></textarea>
        </div>

        <!-- Thumbnail -->
        <div class="space-y-2">
            <label class="block text-sm font-semibold text-gray-700">Ảnh bìa khóa học</label>
            
            <div class="flex gap-6 items-stretch">
                <!-- Current Image -->
                <div class="w-56 h-32 rounded-lg bg-cover bg-center border border-gray-200 bg-gray-100 flex-shrink-0 overflow-hidden"
                     [style.background-image]="thumbnailUrl() ? 'url(' + thumbnailUrl() + ')' : null">
                     @if (!thumbnailUrl()) {
                        <div class="w-full h-full flex items-center justify-center text-gray-400">
                            <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                        </div>
                     }
                </div>

                <!-- Upload Box -->
                <div class="flex-grow border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center p-6 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer group relative">
                    <input type="file" class="absolute inset-0 opacity-0 cursor-pointer" (change)="onFileSelected($event)" accept="image/*">
                    
                    <svg class="w-10 h-10 text-gray-400 group-hover:text-blue-500 mb-2 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                    </svg>
                    <p class="text-gray-700 font-medium">
                        Kéo thả hoặc <span class="text-blue-600">chọn file</span>
                    </p>
                    <p class="text-xs text-gray-500 mt-1">Kích thước đề xuất: 1200x800px. JPG, PNG hoặc GIF.</p>
                </div>
            </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
             <button type="button" class="px-5 py-2.5 rounded-lg border border-gray-300 font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Hủy
             </button>
             <button type="button" (click)="save()" 
                [disabled]="form.invalid || isSaving()"
                class="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                @if (isSaving()) {
                    <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                }
                <span>Lưu thay đổi</span>
             </button>
        </div>
      </form>
    </div>
  `
})
export class CourseInfoComponent {
    private store = inject(CourseEditorStore);
    private fb = inject(FormBuilder);
    private service = inject(CourseAuthoringService);
    private toast = inject(MatSnackBar);

    form = this.fb.group({
        title: ['', Validators.required],
        description: [''],
        thumbnailUrl: ['']
    });

    thumbnailUrl = signal<string | null>(null);
    isSaving = signal(false);

    constructor() {
        // Sync Store -> Form (One way init)
        effect(() => {
            const info = this.store.courseInfo();
            if (info && !this.form.dirty) {
                this.form.patchValue({
                    title: info.title,
                    description: info.description,
                    thumbnailUrl: info.thumbnail
                });
                this.thumbnailUrl.set(info.thumbnail || null);
            }
        }, { allowSignalWrites: true });
    }

    onFileSelected(event: Event) {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
            this.isSaving.set(true);
            this.service.uploadFile(file).subscribe({
                next: (res) => {
                    this.thumbnailUrl.set(res.fileUrl);
                    this.form.patchValue({ thumbnailUrl: res.fileUrl });
                    this.form.markAsDirty();
                    this.isSaving.set(false);
                },
                error: () => {
                    this.toast.open('Upload failed', 'Close', { duration: 3000 });
                    this.isSaving.set(false);
                }
            });
        }
    }

    save() {
        if (this.form.invalid) return;

        this.isSaving.set(true);
        const courseId = this.store.courseTree()?.id;
        if (!courseId) {
            this.toast.open('Không tìm thấy khóa học', 'Đóng', { duration: 3000 });
            this.isSaving.set(false);
            return;
        }

        const payload = {
            title: this.form.value.title || undefined,
            description: this.form.value.description || undefined,
            thumbnailUrl: this.thumbnailUrl()
        };

        this.service.updateCourseInfo(courseId, payload).subscribe({
            next: () => {
                this.toast.open('Đã lưu thông tin khóa học', 'Đóng', { duration: 3000 });
                this.isSaving.set(false);
                // Reload course data
                this.store.loadCourse(courseId);
            },
            error: (err: any) => {
                this.toast.open('Lưu thất bại: ' + (err?.message || 'Lỗi không xác định'), 'Đóng', { duration: 3000 });
                this.isSaving.set(false);
            }
        });
    }
}
