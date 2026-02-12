import { Component, inject, signal, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SectionApi } from '../../../../../api/client/section.api';
import { RichTextEditorComponent } from '../../../../../shared/components/rich-text-editor/rich-text-editor.component';
import { ToastService } from '../../../../../core/services/toast.service';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-section-smart-editor',
    imports: [CommonModule, ReactiveFormsModule, RichTextEditorComponent, IconComponent],
    templateUrl: './section-smart-editor.component.html'
})
export class SectionSmartEditorComponent {
    private readonly fb = inject(FormBuilder);
    private readonly sectionApi = inject(SectionApi);
    private readonly router = inject(Router);
    private readonly toast = inject(ToastService);

    // Signal inputs (Angular v20+)
    readonly lessonId = input.required<string>();
    readonly courseId = input.required<string>();

    // Output functions (Angular v20+)
    readonly close = output<void>();
    readonly saved = output<void>();

    // State quản lý loại section đang chọn
    selectedType = signal<'TEXT' | 'VIDEO' | 'FILE' | 'QUIZ'>('TEXT');

    // State lưu file tạm thời
    selectedFile: File | null = null;
    isSubmitting = signal(false);

    form = this.fb.group({
        title: ['', Validators.required],
        content: [''], // Dùng cho HTML hoặc Video URL
    });

    // Chuyển tab loại nội dung
    setType(type: 'TEXT' | 'VIDEO' | 'FILE' | 'QUIZ') {
        this.selectedType.set(type);
        this.selectedFile = null; // Reset file nếu chuyển tab
        this.form.patchValue({ content: '' }); // Reset nội dung
    }

    onCreateQuiz() {
        const lessonIdValue = this.lessonId();
        if (!lessonIdValue) {
            this.toast.warning('Không tìm thấy lesson ID');
            return;
        }

        // Create a placeholder Section first
        const formData = new FormData();
        formData.append('lessonId', lessonIdValue);
        formData.append('title', this.form.value.title || 'Bài trắc nghiệm mới');
        formData.append('type', 'QUIZ');

        this.isSubmitting.set(true);
        const courseIdValue = this.courseId();
        if (!courseIdValue) {
            this.toast.warning('Không tìm thấy course ID');
            this.isSubmitting.set(false);
            return;
        }

        this.sectionApi.createSection(courseIdValue, formData).subscribe({
            next: (section: any) => {
                this.isSubmitting.set(false);
                // Navigate to the Quiz Builder with the new Section ID
                this.router.navigate(['/teacher/quiz/create/section', section.id]);
                this.close.emit();
            },
            error: () => {
                this.isSubmitting.set(false);
                this.toast.error('Có lỗi xảy ra khi tạo Section Quiz.');
            }
        });
    }

    // Bắt sự kiện chọn file
    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files?.length) {
            this.selectedFile = input.files[0];
        }
    }

    submit() {
        if (this.form.invalid) return;
        if (this.selectedType() === 'FILE' && !this.selectedFile) {
            this.toast.warning('Vui lòng chọn file!');
            return;
        }

        this.isSubmitting.set(true);
        const { title, content } = this.form.value;
        const lessonIdValue = this.lessonId();
        const courseIdValue = this.courseId();

        // Use FormData for File Upload, or JSON for others
        if (this.selectedType() === 'FILE') {
            const formData = new FormData();
            formData.append('lessonId', lessonIdValue);
            formData.append('title', title!);
            formData.append('type', 'FILE');
            if (this.selectedFile) {
                formData.append('file', this.selectedFile);
            }

            if (!courseIdValue) {
                this.toast.warning('Không tìm thấy course ID');
                this.isSubmitting.set(false);
                return;
            }

            this.sectionApi.createSection(courseIdValue, formData).subscribe({
                next: () => {
                    this.isSubmitting.set(false);
                    this.saved.emit();
                    this.close.emit();
                },
                error: () => {
                    this.isSubmitting.set(false);
                    this.toast.error('Có lỗi xảy ra khi lưu section.');
                }
            });
        } else {
            // Normal JSON request - Use FormData for ALL types
            const formData = new FormData();
            formData.append('lessonId', lessonIdValue);
            formData.append('title', title!);
            formData.append('type', this.selectedType());

            if (this.selectedType() === 'TEXT') {
                formData.append('content', content!);
            } else if (this.selectedType() === 'VIDEO') {
                formData.append('content', content!);
            }

            if (!courseIdValue) {
                this.toast.warning('Không tìm thấy course ID');
                this.isSubmitting.set(false);
                return;
            }

            this.sectionApi.createSection(courseIdValue, formData).subscribe({
                next: () => {
                    this.isSubmitting.set(false);
                    this.saved.emit();
                    this.close.emit();
                },
                error: () => {
                    this.isSubmitting.set(false);
                    this.toast.error('Có lỗi xảy ra khi lưu section.');
                }
            });
        }
    }
}
