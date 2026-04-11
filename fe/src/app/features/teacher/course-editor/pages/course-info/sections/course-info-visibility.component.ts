import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CourseInfoFormService } from '../course-info-form.service';

@Component({
  selector: 'app-course-info-visibility',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  styleUrl: '../_editor-shared.scss',
  template: `
    <section class="editor-card">
      <div class="editor-card__header">
        <div>
          <h2 class="editor-card__title">Hiển thị & thẻ chủ đề</h2>
          <p class="editor-card__subtitle">Cách khóa học hiển thị trong danh mục và kết quả tìm kiếm.</p>
        </div>
      </div>
      <div class="editor-card__body editor-stack">
        <!-- Visibility -->
        <fieldset class="editor-fieldset">
          <legend class="editor-legend">Trạng thái hiển thị</legend>
          <div class="choice-grid choice-grid--compact">
            <label class="choice-card choice-card--compact"
              [class.choice-card--selected]="svc.form.controls.visibility.value === 'PUBLIC'">
              <input class="sr-only" type="radio" [formControl]="svc.form.controls.visibility" value="PUBLIC" />
              <div class="choice-card__content">
                <div class="choice-card__title">Công khai</div>
                <p class="choice-card__text">Mọi người đều có thể tìm thấy khóa học.</p>
              </div>
            </label>
            <label class="choice-card choice-card--compact"
              [class.choice-card--selected]="svc.form.controls.visibility.value === 'PRIVATE'">
              <input class="sr-only" type="radio" [formControl]="svc.form.controls.visibility" value="PRIVATE" />
              <div class="choice-card__content">
                <div class="choice-card__title">Riêng tư</div>
                <p class="choice-card__text">Chỉ bạn và người được mời mới thấy khóa học.</p>
              </div>
            </label>
          </div>
        </fieldset>

        <!-- Tags -->
        <div class="editor-field">
          <div class="editor-field__heading">
            <label class="editor-label">Thẻ chủ đề</label>
            <span class="editor-meta">{{ svc.selectedTags().length }}/5</span>
          </div>
          <div class="editor-tag-list">
            @for (tag of svc.selectedTags(); track tag.id) {
              <button type="button" class="editor-tag editor-tag--selected" (click)="svc.removeTagById(tag.id)">
                {{ tag.name }} <span aria-hidden="true">×</span>
              </button>
            }
            @if (!svc.selectedTags().length) {
              <span class="editor-empty-state">Chưa có thẻ nào được chọn.</span>
            }
          </div>
          @if (svc.availableTags().length && svc.selectedTags().length < 5) {
            <div class="editor-tag-list editor-tag-list--available">
              @for (tag of svc.availableTags(); track tag.id) {
                @if (!svc.isTagSelected(tag.id)) {
                  <button type="button" class="editor-tag" (click)="svc.addTagById(tag.id)">+ {{ tag.name }}</button>
                }
              }
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class CourseInfoVisibilityComponent {
  readonly svc = inject(CourseInfoFormService);
}
