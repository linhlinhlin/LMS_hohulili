import { Component, inject, signal, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SectionApi } from '../../../../../api/client/section.api';
import { RichTextEditorComponent } from '../../../../../shared/components/rich-text-editor/rich-text-editor.component';

@Component({
    selector: 'app-section-smart-editor',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RichTextEditorComponent],
    templateUrl: './section-smart-editor.component.html'
})
export class SectionSmartEditorComponent {
    private fb = inject(FormBuilder);
    private sectionApi = inject(SectionApi);

    @Input() lessonId!: string;
    @Output() close = new EventEmitter<void>();
    @Output() saved = new EventEmitter<void>();

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
            alert('Vui lòng chọn file!');
            return;
        }

        this.isSubmitting.set(true);
        const { title, content } = this.form.value;

        // Use FormData for File Upload, or JSON for others
        if (this.selectedType() === 'FILE') {
            const formData = new FormData();
            formData.append('lessonId', this.lessonId);
            formData.append('title', title!);
            formData.append('type', 'FILE');
            if (this.selectedFile) {
                formData.append('file', this.selectedFile);
            }

            this.sectionApi.createSection(formData).subscribe({
                next: () => {
                    this.isSubmitting.set(false);
                    this.saved.emit();
                    this.close.emit();
                },
                error: (err) => {
                    console.error(err);
                    this.isSubmitting.set(false);
                    alert('Có lỗi xảy ra khi lưu section.');
                }
            });
        } else {
            // Normal JSON request
            const payload = {
                lessonId: this.lessonId,
                title: title!,
                type: this.selectedType() as 'TEXT' | 'VIDEO' | 'QUIZ',
                content: this.selectedType() === 'TEXT' ? content! : undefined,
                videoUrl: this.selectedType() === 'VIDEO' ? content! : undefined
                // Quiz logic separate? Or handled here? Plan says QUIZ supported.
                // But API needs payload structure.
            };
            // Reuse createSection logic from SectionApi which handles payloads
            // But wait, createSection signature changed to accept FormData OR CreateSectionRequest.
            // And JSON payload needs to match CreateSectionRequest interface.
            // My interface (Step 4016) has `content` field.
            // `rep4.md` example used FormData for everything.
            // I will stick to FormData for FILE, and JSON for others to be clean, OR use FormData for ALL as per Expert suggestion.
            // Expert `rep4.md` code used `formData` for ALL types.
            // I should probably follow that to be safe.
            // "Angular tự động set Content-Type là multipart/form-data".

            const formData = new FormData();
            formData.append('lessonId', this.lessonId);
            formData.append('title', title!);
            formData.append('type', this.selectedType());

            if (this.selectedType() === 'TEXT') {
                formData.append('content', content!);
            } else if (this.selectedType() === 'VIDEO') {
                // Backend SectionController.java expects 'content' param for HTML or Video URL?
                // Step 4198: @RequestParam(value = "content", required = false) String content
                // Case VIDEO: section.setVideoUrl(contentOrUrl); 
                // So yes, 'content' param carries the URL.
                formData.append('content', content!);
            }

            this.sectionApi.createSection(formData).subscribe({
                next: () => {
                    this.isSubmitting.set(false);
                    this.saved.emit();
                    this.close.emit();
                },
                error: (err) => {
                    console.error(err);
                    this.isSubmitting.set(false);
                    alert('Có lỗi xảy ra khi lưu section.');
                }
            });
        }
    }
}
