import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TiptapEditorComponent } from '../../../../../../shared/components/tiptap-editor/tiptap-editor.component';
import { createTiptapUploadFn, createTiptapVideoUploadFn } from '../../../../../../shared/components/tiptap-editor/tiptap-upload';
import { PresignedUploadService } from '../../../../../../core/services/presigned-upload.service';
import { environment } from '../../../../../../../environments/environment';
import { CourseInfoFormService } from '../course-info-form.service';

@Component({
  selector: 'app-course-info-description',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TiptapEditorComponent],
  styleUrl: '../_editor-shared.scss',
  styles: `
    .editor-card--expanded {
      position: fixed;
      inset: 0;
      z-index: 50;
      border-radius: 0;
      border: none;
      display: flex;
      flex-direction: column;
      box-shadow: none;
    }
    .editor-card--expanded .editor-card__header {
      border-radius: 0;
      flex-shrink: 0;
    }
    .editor-card--expanded .editor-card__body {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .editor-card--expanded .editor-card__body app-tiptap-editor {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
  `,
  template: `
    <!-- Mô tả khóa học (rich text, expandable) -->
    <section class="editor-card" [class.editor-card--expanded]="isExpanded()">
      <div class="editor-card__header">
        <div>
          <h2 class="editor-card__title">Mô tả khóa học</h2>
          <p class="editor-card__subtitle">Nội dung đầy đủ hiển thị trên trang chi tiết khóa học.</p>
        </div>
        <button type="button"
                class="editor-link-button"
                style="white-space: nowrap"
                (click)="toggleExpand()">
          {{ isExpanded() ? 'Thu nhỏ' : 'Mở rộng' }}
        </button>
      </div>
      <div class="editor-card__body editor-stack">
        <app-tiptap-editor
          [formControl]="svc.form.controls.courseInformation"
          placeholder="Nhập mô tả chi tiết khóa học..."
          [height]="isExpanded() ? 800 : 360"
          [uploadFn]="editorUploadFn"
          [videoUploadFn]="videoUploadFn">
        </app-tiptap-editor>

        @if (!isExpanded()) {
          <div class="editor-field" style="margin-top: 0.5rem">
            <label class="editor-label" for="course-benefits">Bạn sẽ học được gì</label>
            <textarea
              id="course-benefits"
              [formControl]="svc.form.controls.benefits"
              class="editor-textarea editor-textarea--large"
              placeholder="Liệt kê kiến thức, kỹ năng hoặc kết quả học tập chính..."></textarea>
            <p class="editor-hint">Hiển thị trên trang khóa học. Dùng gạch đầu dòng ngắn để học viên quét nhanh.</p>
          </div>
        }
      </div>
    </section>
  `,
})
export class CourseInfoDescriptionComponent {
  readonly svc = inject(CourseInfoFormService);
  private readonly http = inject(HttpClient);
  private readonly presignedUpload = inject(PresignedUploadService);
  readonly editorUploadFn = createTiptapUploadFn(this.http, environment.apiUrl, this.presignedUpload);
  readonly videoUploadFn = createTiptapVideoUploadFn(this.presignedUpload);
  readonly isExpanded = signal(false);

  toggleExpand() {
    this.isExpanded.update((v) => !v);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.isExpanded()) this.isExpanded.set(false);
  }
}
