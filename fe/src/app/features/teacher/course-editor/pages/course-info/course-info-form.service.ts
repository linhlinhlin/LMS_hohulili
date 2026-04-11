import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { CourseCategoryDTO, CourseTagDTO } from '../../../../../api/types/course.types';
import { ToastService } from '../../../../../core/services/toast.service';
import { CourseEditorStore } from '../../store/course-editor.store';

type DeliveryMode = 'SELF_PACED' | 'INSTRUCTOR_LED';

export type ValidationSummaryItem = {
  fieldId: string;
  label: string;
  message: string;
};

/**
 * Shared state for the course-info page.
 * Provided at the CourseInfoComponent level — NOT root.
 * Children inject this to access form controls and shared signals.
 */
@Injectable()
export class CourseInfoFormService {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(CourseEditorStore);
  private readonly toast = inject(ToastService);
  private readonly document = inject(DOCUMENT);

  // ── Form ──

  readonly form = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    categoryId: ['', Validators.required],
    tags: [''],
    introVideoUrl: [''],
    courseInformation: [''],
    welcomeMessage: [''],
    benefits: [''],
    price: [null as number | string | null],
    salePrice: [null as number | string | null],
    priceType: ['FREE'],
    visibility: ['PUBLIC'],
    credits: [null as number | string | null],
  });

  // ── Shared signals ──

  readonly categoryTree = signal<CourseCategoryDTO[]>([]);
  readonly selectedRootId = signal('');
  readonly subcategories = signal<CourseCategoryDTO[]>([]);

  readonly availableTags = signal<CourseTagDTO[]>([]);
  readonly selectedTags = signal<CourseTagDTO[]>([]);
  pendingTagNames: string[] = [];

  readonly currentDeliveryMode = signal<DeliveryMode>('SELF_PACED');
  readonly isModeLocked = signal(false);

  readonly thumbnailUrl = signal<string | null>(null);

  readonly isSaving = signal(false);
  readonly showValidationSummary = signal(false);

  // Intro video — IDs/status needed by save(). Upload state lives in MediaComponent.
  readonly introVideoAssetId = signal<string | null>(null);
  readonly introVideoProcessingStatus = signal<string | null>(null);
  readonly introVideoSourceKind = signal<'ADAPTIVE_R2' | 'STREAM' | 'EXTERNAL' | 'LEGACY_DIRECT' | null>(null);
  readonly introVideoPlaybackUrl = signal<string | null>(null);
  readonly introVideoStreamVideoUid = signal<string | null>(null);
  readonly introVideoErrorMessage = signal<string | null>(null);

  // ── Reactive form → signals bridge ──

  readonly formValue = signal(this.form.getRawValue());
  readonly formStatus = signal(this.form.status);

  private readonly currencyFormatter = new Intl.NumberFormat('vi-VN');

  // ── Computed ──

  readonly isPaid = computed(() => this.formValue().priceType === 'PAID');

  readonly visibilityLabel = computed(() =>
    this.formValue().visibility === 'PRIVATE' ? 'Riêng tư' : 'Công khai',
  );

  readonly deliveryModeLabel = computed(() =>
    this.currentDeliveryMode() === 'INSTRUCTOR_LED' ? 'Lớp học' : 'Khóa học',
  );

  readonly deliveryModeDescription = computed(() =>
    this.currentDeliveryMode() === 'INSTRUCTOR_LED'
      ? 'Có lớp, giảng viên và phân phối bài tập/kiểm tra theo lớp.'
      : 'Học theo nhịp độ cá nhân, nội dung dùng chung toàn khóa học.',
  );

  readonly pricePreviewText = computed(() => {
    if (!this.isPaid()) return 'Khóa học đang để miễn phí.';
    const price = this.coerceOptionalNumber(this.formValue().price);
    const salePrice = this.coerceOptionalNumber(this.formValue().salePrice);
    if (!price || price <= 0) return 'Chưa có giá gốc hợp lệ.';
    if (salePrice && salePrice > 0) return `Hiển thị ${this.formatCurrency(salePrice)} thay vì ${this.formatCurrency(price)}.`;
    return `Hiển thị ${this.formatCurrency(price)}.`;
  });

  readonly introVideoPreviewUrl = computed(() =>
    this.parseHttpUrl(this.introVideoPlaybackUrl() || this.formValue().introVideoUrl),
  );

  readonly introVideoHost = computed(() => {
    const url = this.introVideoPreviewUrl();
    if (!url) return '';
    try { return new URL(url).host.replace(/^www\./, ''); } catch { return ''; }
  });

  readonly hasIntroVideoAsset = computed(() => !!this.introVideoAssetId());

  readonly hasLegacyIntroVideoLink = computed(() =>
    !this.hasIntroVideoAsset() && !!this.parseHttpUrl(this.formValue().introVideoUrl),
  );

  // ── Validation ──

  readonly shouldShowErrorSummary = computed(() => {
    this.formStatus();
    return this.showValidationSummary() && this.validationSummary().length > 0;
  });

  readonly validationSummary = computed<ValidationSummaryItem[]>(() => {
    this.formStatus();
    this.formValue();
    const items: ValidationSummaryItem[] = [];

    if (this.form.controls.title.invalid) {
      items.push({ fieldId: 'course-title', label: 'Tên khóa học', message: 'Nhập tên khóa học.' });
    }
    if (this.form.controls.categoryId.invalid) {
      items.push({ fieldId: this.categoryValidationFieldId(), label: 'Danh mục', message: this.categoryValidationMessage() });
    }
    const introErr = this.introVideoError();
    if (introErr) {
      items.push({ fieldId: 'course-intro-video', label: 'Video giới thiệu', message: introErr });
    }
    const priceErr = this.priceError();
    if (priceErr) {
      items.push({ fieldId: 'course-price', label: 'Giá gốc', message: priceErr });
    }
    const saleErr = this.salePriceError();
    if (saleErr) {
      items.push({ fieldId: 'course-sale-price', label: 'Giá khuyến mãi', message: saleErr });
    }
    return items;
  });

  controlInvalid(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return !!control && control.invalid && (control.touched || this.showValidationSummary());
  }

  controlErrorMessage(name: keyof typeof this.form.controls): string {
    const control = this.form.controls[name];
    if (!control || !this.controlInvalid(name)) return '';
    if (name === 'categoryId' && control.errors?.['required']) return this.categoryValidationMessage();
    if (control.errors?.['required']) {
      return name === 'title' ? 'Tên khóa học là bắt buộc.' : 'Trường này là bắt buộc.';
    }
    return '';
  }

  priceError(): string {
    if (!this.isPaid()) return '';
    const price = this.coerceOptionalNumber(this.form.controls.price.value);
    return (!price || price <= 0) ? 'Nhập giá gốc lớn hơn 0.' : '';
  }

  salePriceError(): string {
    if (!this.isPaid()) return '';
    const price = this.coerceOptionalNumber(this.form.controls.price.value) ?? 0;
    const salePrice = this.coerceOptionalNumber(this.form.controls.salePrice.value);
    return (salePrice != null && salePrice > 0 && salePrice >= price) ? 'Giá khuyến mãi phải nhỏ hơn giá gốc.' : '';
  }

  introVideoError(): string {
    const value = this.form.controls.introVideoUrl.value?.trim();
    if (!value) return '';
    return this.parseHttpUrl(value) ? '' : 'Nhập liên kết hợp lệ bắt đầu bằng http:// hoặc https://.';
  }

  categoryValidationFieldId(): string {
    return this.selectedRootId() ? 'course-category' : 'course-root-category';
  }

  categoryValidationMessage(): string {
    if (!this.selectedRootId()) return 'Chọn lĩnh vực cho khóa học.';
    if (this.subcategories().length) return 'Chọn chuyên ngành cho khóa học.';
    return 'Chọn danh mục phù hợp cho khóa học.';
  }

  // ── Actions ──

  onRootCategoryChange(rootId: string) {
    this.selectedRootId.set(rootId);
    const root = this.categoryTree().find((item) => item.id === rootId);
    const children = root?.children || [];
    this.subcategories.set(children);
    this.form.patchValue({ categoryId: !children.length && rootId ? rootId : '' });
    this.markUnsaved();
  }

  setDeliveryMode(mode: DeliveryMode) {
    if (this.isModeLocked()) return;
    this.currentDeliveryMode.set(mode);
    this.markUnsaved();
  }

  addTagById(tagId: string) {
    const tag = this.availableTags().find((item) => item.id === tagId);
    if (!tag || this.selectedTags().some((item) => item.id === tagId)) return;
    this.selectedTags.update((prev) => [...prev, tag]);
    this.markUnsaved();
  }

  removeTagById(tagId: string) {
    this.selectedTags.update((prev) => prev.filter((tag) => tag.id !== tagId));
    this.markUnsaved();
  }

  isTagSelected(tagId: string): boolean {
    return this.selectedTags().some((tag) => tag.id === tagId);
  }

  removeLegacyIntroVideoLink() {
    this.form.patchValue({ introVideoUrl: '' });
    this.markUnsaved();
  }

  focusField(fieldId: string) {
    queueMicrotask(() => {
      const el = this.document.getElementById(fieldId) as HTMLElement | null;
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus();
    });
  }

  markUnsaved() {
    this.form.markAsDirty();
    this.syncFormSignals();
    this.store.markUnsaved();
  }

  /** Completion status per section — green dot = has content */
  readonly sectionFilled = computed<Record<string, boolean>>(() => {
    const v = this.formValue();
    return {
      basic: !!v.title?.trim() && !!v.categoryId,
      media: !!this.thumbnailUrl(),
      description: !!v.courseInformation?.trim() || !!v.benefits?.trim(),
      visibility: true,
      pricing: true,
    };
  });

  syncFormSignals() {
    this.formValue.set(this.form.getRawValue());
    this.formStatus.set(this.form.status);
  }

  // ── Hydration ──

  hydrateCategoryFromStore(categoryId: string) {
    for (const root of this.categoryTree()) {
      const sub = root.children?.find((item) => item.id === categoryId);
      if (sub) { this.selectedRootId.set(root.id); this.subcategories.set(root.children || []); return; }
      if (root.id === categoryId) { this.selectedRootId.set(root.id); this.subcategories.set(root.children || []); return; }
    }
  }

  hydrateTagsFromNames(names: string[]) {
    const available = this.availableTags();
    if (available.length) {
      this.selectedTags.set(names.map((n) => available.find((t) => t.name === n)).filter((t): t is CourseTagDTO => !!t));
      return;
    }
    this.pendingTagNames = names;
  }

  // ── Helpers ──

  coerceOptionalNumber(value: unknown): number | null {
    if (value == null || value === '') return null;
    const numeric = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  normalizeOptionalText(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  formatCurrency(value: unknown): string {
    const numeric = this.coerceOptionalNumber(value);
    if (numeric == null) return '';
    return `${this.currencyFormatter.format(numeric)} đ`;
  }

  parseHttpUrl(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    if (!normalized) return null;
    try {
      const url = new URL(normalized, this.document.location?.origin ?? window.location.origin);
      return (url.protocol === 'http:' || url.protocol === 'https:') ? url.toString() : null;
    } catch { return null; }
  }
}
