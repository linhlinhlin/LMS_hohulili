import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CourseInfoFormService } from '../course-info-form.service';

@Component({
  selector: 'app-course-info-pricing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  styleUrl: '../_editor-shared.scss',
  template: `
    <section class="editor-card">
      <div class="editor-card__header">
        <div>
          <h2 class="editor-card__title">Học phí</h2>
          <p class="editor-card__subtitle">Thiết lập học phí cho khóa học.</p>
        </div>
      </div>
      <div class="editor-card__body editor-stack">
        <div class="editor-field">
          <label class="editor-label" for="course-price-type">Loại giá</label>
          <select id="course-price-type" [formControl]="svc.form.controls.priceType" class="editor-select">
            <option value="FREE">Miễn phí</option>
            <option value="PAID">Trả phí</option>
          </select>
        </div>

        <div class="editor-callout editor-callout--neutral">{{ svc.pricePreviewText() }}</div>

        @if (svc.isPaid()) {
          <div class="editor-field">
            <label class="editor-label" for="course-price">Giá gốc <span class="text-red-500">*</span></label>
            <div class="editor-input-group">
              <span class="editor-input-prefix">₫</span>
              <input id="course-price" type="number" [formControl]="svc.form.controls.price" min="1000"
                class="editor-input editor-input--prefixed"
                [class.editor-input--error]="!!svc.priceError()"
                [attr.aria-invalid]="!!svc.priceError()"
                [attr.aria-describedby]="svc.priceError() ? 'course-price-error' : 'course-price-hint'"
                placeholder="500000" />
            </div>
            @if (svc.priceError()) {
              <p id="course-price-error" class="editor-field-error">{{ svc.priceError() }}</p>
            } @else {
              <p id="course-price-hint" class="editor-hint">Nhập giá niêm yết trước khi áp dụng khuyến mãi.</p>
            }
          </div>
          <div class="editor-field">
            <label class="editor-label" for="course-sale-price">Giá khuyến mãi</label>
            <div class="editor-input-group">
              <span class="editor-input-prefix">₫</span>
              <input id="course-sale-price" type="number" [formControl]="svc.form.controls.salePrice" min="0"
                class="editor-input editor-input--prefixed"
                [class.editor-input--error]="!!svc.salePriceError()"
                [attr.aria-invalid]="!!svc.salePriceError()"
                [attr.aria-describedby]="svc.salePriceError() ? 'course-sale-price-error' : null"
                placeholder="400000" />
            </div>
            @if (svc.salePriceError()) {
              <p id="course-sale-price-error" class="editor-field-error">{{ svc.salePriceError() }}</p>
            }
          </div>
        }

      </div>
    </section>
  `,
})
export class CourseInfoPricingComponent {
  readonly svc = inject(CourseInfoFormService);
}
