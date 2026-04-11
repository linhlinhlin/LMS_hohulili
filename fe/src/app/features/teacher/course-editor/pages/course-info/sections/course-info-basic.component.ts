import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CourseInfoFormService } from '../course-info-form.service';

@Component({
  selector: 'app-course-info-basic',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  styleUrl: '../_editor-shared.scss',
  template: `
    <section class="editor-card">
      <div class="editor-card__header">
        <div>
          <h2 class="editor-card__title">Thông tin cơ bản</h2>
          <p class="editor-card__subtitle">Tên, danh mục và hình thức giảng dạy của khóa học.</p>
        </div>
      </div>
      <div class="editor-card__body editor-stack">
        <!-- Title -->
        <div class="editor-field">
          <label class="editor-label" for="course-title">Tên khóa học <span class="text-red-500">*</span></label>
          <input id="course-title" [formControl]="svc.form.controls.title" class="editor-input"
            [class.editor-input--error]="svc.controlInvalid('title')"
            [attr.aria-invalid]="svc.controlInvalid('title')"
            [attr.aria-describedby]="svc.controlInvalid('title') ? 'course-title-error' : null"
            placeholder="Nhập tên khóa học" />
          @if (svc.controlInvalid('title')) {
            <p id="course-title-error" class="editor-field-error">{{ svc.controlErrorMessage('title') }}</p>
          }
        </div>

        <!-- Description -->
        <div class="editor-field">
          <label class="editor-label" for="course-description">Giới thiệu ngắn</label>
          <textarea id="course-description" [formControl]="svc.form.controls.description" class="editor-textarea"
            placeholder="1-2 câu tóm tắt nội dung và giá trị khóa học..."></textarea>
          <p class="editor-hint">Hiển thị trên card khóa học, kết quả tìm kiếm và danh mục. Nên ngắn gọn, 1-2 câu.</p>
        </div>

        <!-- Category (2-level) -->
        <div class="editor-field">
          <label class="editor-label" for="course-root-category">Danh mục <span class="text-red-500">*</span></label>
          <div class="editor-field-grid editor-field-grid--two">
            <div class="editor-field">
              <label class="editor-label editor-label--subtle" for="course-root-category">Lĩnh vực</label>
              <select id="course-root-category" class="editor-select"
                [class.editor-input--error]="svc.controlInvalid('categoryId') && !svc.selectedRootId()"
                [attr.aria-invalid]="svc.controlInvalid('categoryId') && !svc.selectedRootId()"
                [attr.aria-describedby]="svc.controlInvalid('categoryId') ? 'course-category-error' : null"
                (change)="svc.onRootCategoryChange($any($event.target).value)">
                <option value="" [selected]="!svc.selectedRootId()">-- Chọn lĩnh vực --</option>
                @for (root of svc.categoryTree(); track root.id) {
                  <option [value]="root.id" [selected]="svc.selectedRootId() === root.id">{{ root.name }}</option>
                }
              </select>
            </div>
            <div class="editor-field">
              <label class="editor-label editor-label--subtle" for="course-category">Chuyên ngành</label>
              <select id="course-category" [formControl]="svc.form.controls.categoryId" class="editor-select"
                [class.editor-input--error]="svc.controlInvalid('categoryId') && !!svc.selectedRootId()"
                [attr.aria-invalid]="svc.controlInvalid('categoryId')"
                [attr.aria-describedby]="svc.controlInvalid('categoryId') ? 'course-category-error' : null">
                <option value="">{{ svc.subcategories().length ? '-- Chọn chuyên ngành --' : '-- Chọn lĩnh vực trước --' }}</option>
                @for (sub of svc.subcategories(); track sub.id) {
                  <option [value]="sub.id">{{ sub.name }}</option>
                }
              </select>
            </div>
          </div>
          @if (svc.controlInvalid('categoryId')) {
            <p id="course-category-error" class="editor-field-error">{{ svc.controlErrorMessage('categoryId') }}</p>
          } @else if (!svc.selectedRootId()) {
            <p class="editor-hint">Chọn lĩnh vực trước để xem danh sách chuyên ngành.</p>
          }
        </div>

        <!-- Delivery Mode -->
        <fieldset class="editor-fieldset" [attr.aria-describedby]="svc.isModeLocked() ? 'delivery-mode-lock-hint' : 'delivery-mode-hint'">
          <legend class="editor-legend">Hình thức giảng dạy</legend>
          <p id="delivery-mode-hint" class="editor-hint">Chọn hình thức phù hợp với cách bạn muốn tổ chức giảng dạy.</p>
          <div class="choice-grid">
            <label class="choice-card"
              [class.choice-card--selected]="svc.currentDeliveryMode() === 'SELF_PACED'"
              [class.choice-card--disabled]="svc.isModeLocked()">
              <input class="sr-only" type="radio" name="delivery-mode"
                [checked]="svc.currentDeliveryMode() === 'SELF_PACED'"
                [disabled]="svc.isModeLocked()"
                (change)="svc.setDeliveryMode('SELF_PACED')" />
              <div class="choice-card__icon choice-card__icon--primary" aria-hidden="true">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div class="choice-card__content">
                <div class="choice-card__title">Khóa học</div>
                <p class="choice-card__text">Học viên tự học theo tiến độ cá nhân, không phân lớp.</p>
              </div>
            </label>
            <label class="choice-card"
              [class.choice-card--selected]="svc.currentDeliveryMode() === 'INSTRUCTOR_LED'"
              [class.choice-card--disabled]="svc.isModeLocked()">
              <input class="sr-only" type="radio" name="delivery-mode"
                [checked]="svc.currentDeliveryMode() === 'INSTRUCTOR_LED'"
                [disabled]="svc.isModeLocked()"
                (change)="svc.setDeliveryMode('INSTRUCTOR_LED')" />
              <div class="choice-card__icon choice-card__icon--success" aria-hidden="true">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div class="choice-card__content">
                <div class="choice-card__title">Lớp học</div>
                <p class="choice-card__text">Có lớp, giảng viên phân phối bài tập và quản lý bảng điểm.</p>
              </div>
            </label>
          </div>
          @if (svc.isModeLocked()) {
            <p id="delivery-mode-lock-hint" class="editor-callout editor-callout--warning">
              Không thể thay đổi khi đã có học viên đăng ký.
            </p>
          }
        </fieldset>
      </div>
    </section>
  `,
})
export class CourseInfoBasicComponent {
  readonly svc = inject(CourseInfoFormService);
}
