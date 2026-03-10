import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CourseCategoryDTO, CourseTagDTO } from '../../../../../api/types/course.types';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { RichTextEditorComponent } from '../../../../../shared/components/rich-text-editor/rich-text-editor.component';
import { CourseAuthoringService, CourseDraftDTO, DeliveryMode } from '../../services/course-authoring.service';
import { CourseEditorStore } from '../../store/course-editor.store';

type ValidationSummaryItem = {
  fieldId: string;
  label: string;
  message: string;
};

@Component({
  selector: 'app-course-info',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RichTextEditorComponent],
  templateUrl: './course-info.component.html',
  styleUrl: './course-info.component.scss'
})
export class CourseInfoComponent implements OnInit, OnDestroy {
  private readonly store = inject(CourseEditorStore);
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(CourseAuthoringService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
  private readonly document = inject(DOCUMENT);

  readonly categoryTree = signal<CourseCategoryDTO[]>([]);
  readonly selectedRootId = signal('');
  readonly subcategories = signal<CourseCategoryDTO[]>([]);
  readonly availableTags = signal<CourseTagDTO[]>([]);
  readonly selectedTags = signal<CourseTagDTO[]>([]);
  readonly thumbnailUrl = signal<string | null>(null);
  readonly thumbnailPreview = signal<string | null>(null);
  readonly isSaving = signal(false);
  readonly currentDeliveryMode = signal<DeliveryMode>('SELF_PACED');
  readonly isModeLocked = signal(false);
  readonly isDragOver = signal(false);
  readonly isUploading = signal(false);
  readonly uploadProgress = signal(0);
  readonly showValidationSummary = signal(false);

  private uploadSub: Subscription | null = null;
  private formChangesSub: Subscription | null = null;
  private formStatusSub: Subscription | null = null;
  private pendingTagNames: string[] = [];
  private readonly currencyFormatter = new Intl.NumberFormat('vi-VN');

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
    credits: [null as number | string | null]
  });

  private readonly formValue = signal(this.form.getRawValue());
  private readonly formStatus = signal(this.form.status);

  readonly isPaid = computed(() => this.formValue().priceType === 'PAID');
  readonly visibilityLabel = computed(() =>
    this.formValue().visibility === 'PRIVATE' ? 'Riêng tư' : 'Công khai'
  );
  readonly deliveryModeLabel = computed(() =>
    this.currentDeliveryMode() === 'INSTRUCTOR_LED' ? 'Lớp học' : 'Khóa học'
  );
  readonly deliveryModeDescription = computed(() =>
    this.currentDeliveryMode() === 'INSTRUCTOR_LED'
      ? 'Có lớp, giảng viên và phân phối bài tập/kiểm tra theo lớp.'
      : 'Học theo nhịp độ cá nhân, nội dung dùng chung toàn khóa học.'
  );
  readonly introVideoPreviewUrl = computed(() =>
    this.parseHttpUrl(this.formValue().introVideoUrl)
  );
  readonly introVideoHost = computed(() => {
    const url = this.introVideoPreviewUrl();
    if (!url) {
      return '';
    }

    try {
      return new URL(url).host.replace(/^www\./, '');
    } catch {
      return '';
    }
  });
  readonly pricePreviewText = computed(() => {
    if (!this.isPaid()) {
      return 'Khóa học đang để miễn phí.';
    }

    const price = this.coerceOptionalNumber(this.formValue().price);
    const salePrice = this.coerceOptionalNumber(this.formValue().salePrice);

    if (!price || price <= 0) {
      return 'Chưa có giá gốc hợp lệ.';
    }

    if (salePrice && salePrice > 0) {
      return `Hiển thị ${this.formatCurrency(salePrice)} thay vì ${this.formatCurrency(price)}.`;
    }

    return `Hiển thị ${this.formatCurrency(price)}.`;
  });
  readonly shouldShowErrorSummary = computed(() => {
    this.formStatus();
    return this.showValidationSummary() && this.validationSummary().length > 0;
  });
  readonly validationSummary = computed<ValidationSummaryItem[]>(() => {
    this.formStatus();
    this.formValue();

    const items: ValidationSummaryItem[] = [];

    if (this.form.controls.title.invalid) {
      items.push({
        fieldId: 'course-title',
        label: 'Tên khóa học',
        message: 'Nhập tên khóa học.'
      });
    }

    if (this.form.controls.categoryId.invalid) {
      items.push({
        fieldId: this.categoryValidationFieldId(),
        label: 'Danh mục',
        message: this.categoryValidationMessage()
      });
    }

    const introVideoError = this.introVideoError();
    if (introVideoError) {
      items.push({
        fieldId: 'course-intro-video',
        label: 'Video giới thiệu',
        message: introVideoError
      });
    }

    const priceError = this.priceError();
    if (priceError) {
      items.push({
        fieldId: 'course-price',
        label: 'Giá gốc',
        message: priceError
      });
    }

    const salePriceError = this.salePriceError();
    if (salePriceError) {
      items.push({
        fieldId: 'course-sale-price',
        label: 'Giá khuyến mãi',
        message: salePriceError
      });
    }

    return items;
  });

  constructor() {
    this.formChangesSub = this.form.valueChanges.subscribe(() => {
      this.syncFormSignals();
      if (this.form.dirty) {
        this.store.markUnsaved();
      }
    });

    this.formStatusSub = this.form.statusChanges.subscribe(() => {
      this.formStatus.set(this.form.status);
    });

    effect(() => {
      const tree = this.store.courseTree();
      if (tree && !this.form.dirty) {
        untracked(() => this.applyTreeToForm(tree));
      }
    });
  }

  ngOnInit() {
    this.service.getCourseCategoryTree().subscribe({
      next: (tree) => {
        this.categoryTree.set(tree);
        const currentCategoryId = this.form.controls.categoryId.value;
        if (currentCategoryId) {
          this.hydrateCategoryFromStore(currentCategoryId);
        }
      },
      error: () => this.toast.error('Không tải được danh mục')
    });

    this.service.getCourseTags().subscribe({
      next: (tags) => {
        this.availableTags.set(tags);
        if (this.pendingTagNames.length) {
          this.selectedTags.set(
            this.pendingTagNames
              .map((name) => tags.find((tag) => tag.name === name))
              .filter((tag): tag is CourseTagDTO => !!tag)
          );
          this.pendingTagNames = [];
        }
      },
      error: () => {
        // Tags are optional. Keep the rest of the editor usable.
      }
    });
  }

  ngOnDestroy() {
    this.uploadSub?.unsubscribe();
    this.formChangesSub?.unsubscribe();
    this.formStatusSub?.unsubscribe();
  }

  controlInvalid(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return !!control && control.invalid && (control.touched || this.showValidationSummary());
  }

  controlErrorMessage(name: keyof typeof this.form.controls): string {
    const control = this.form.controls[name];
    if (!control || !this.controlInvalid(name)) {
      return '';
    }

    if (name === 'categoryId' && control.errors?.['required']) {
      return this.categoryValidationMessage();
    }

    if (control.errors?.['required']) {
      switch (name) {
        case 'title':
          return 'Tên khóa học là bắt buộc.';
        default:
          return 'Trường này là bắt buộc.';
      }
    }

    return '';
  }

  priceError(): string {
    if (!this.isPaid()) {
      return '';
    }

    const price = this.coerceOptionalNumber(this.form.controls.price.value);
    if (!price || price <= 0) {
      return 'Nhập giá gốc lớn hơn 0.';
    }

    return '';
  }

  salePriceError(): string {
    if (!this.isPaid()) {
      return '';
    }

    const price = this.coerceOptionalNumber(this.form.controls.price.value) ?? 0;
    const salePrice = this.coerceOptionalNumber(this.form.controls.salePrice.value);

    if (salePrice != null && salePrice > 0 && salePrice >= price) {
      return 'Giá khuyến mãi phải nhỏ hơn giá gốc.';
    }

    return '';
  }

  introVideoError(): string {
    const value = this.form.controls.introVideoUrl.value?.trim();
    if (!value) {
      return '';
    }

    return this.parseHttpUrl(value)
      ? ''
      : 'Nhập liên kết hợp lệ bắt đầu bằng http:// hoặc https://.';
  }

  addTagById(tagId: string) {
    const tag = this.availableTags().find((item) => item.id === tagId);
    if (!tag || this.selectedTags().some((item) => item.id === tagId)) {
      return;
    }

    this.selectedTags.update((prev) => [...prev, tag]);
    this.markUnsavedState();
  }

  removeTagById(tagId: string) {
    this.selectedTags.update((prev) => prev.filter((tag) => tag.id !== tagId));
    this.markUnsavedState();
  }

  isTagSelected(tagId: string): boolean {
    return this.selectedTags().some((tag) => tag.id === tagId);
  }

  onRootCategoryChange(rootId: string) {
    this.selectedRootId.set(rootId);
    const root = this.categoryTree().find((item) => item.id === rootId);
    const children = root?.children || [];
    this.subcategories.set(children);

    if (!children.length && rootId) {
      this.form.patchValue({ categoryId: rootId });
    } else {
      this.form.patchValue({ categoryId: '' });
    }

    this.markUnsavedState();
  }

  setDeliveryMode(mode: DeliveryMode) {
    if (this.isModeLocked()) {
      return;
    }

    this.currentDeliveryMode.set(mode);
    this.markUnsavedState();
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.handleThumbnailUpload(file);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    input.value = '';
    this.handleThumbnailUpload(file);
  }

  cancelUpload() {
    this.uploadSub?.unsubscribe();
    this.uploadSub = null;
    this.isUploading.set(false);
    this.uploadProgress.set(0);
    this.thumbnailPreview.set(null);
  }

  discardChanges() {
    this.cancelUpload();

    const tree = this.store.courseTree();
    if (!tree) {
      return;
    }

    this.applyTreeToForm(tree);
  }

  focusField(fieldId: string) {
    queueMicrotask(() => {
      const element = this.document.getElementById(fieldId) as HTMLElement | null;
      if (!element) {
        return;
      }

      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.focus();
    });
  }

  categoryValidationFieldId(): string {
    return this.selectedRootId() ? 'course-category' : 'course-root-category';
  }

  categoryValidationMessage(): string {
    if (!this.selectedRootId()) {
      return 'Chọn lĩnh vực cho khóa học.';
    }

    if (this.subcategories().length) {
      return 'Chọn chuyên ngành cho khóa học.';
    }

    return 'Chọn danh mục phù hợp cho khóa học.';
  }

  save() {
    this.showValidationSummary.set(true);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('Vui lòng kiểm tra lại các trường bắt buộc.');
      const firstError = this.validationSummary()[0];
      if (firstError) {
        this.focusField(firstError.fieldId);
      }
      return;
    }

    const introVideoError = this.introVideoError();
    if (introVideoError) {
      this.toast.warning(introVideoError);
      this.focusField('course-intro-video');
      return;
    }

    const priceError = this.priceError();
    if (priceError) {
      this.toast.warning(priceError);
      this.focusField('course-price');
      return;
    }

    const salePriceError = this.salePriceError();
    if (salePriceError) {
      this.toast.warning(salePriceError);
      this.focusField('course-sale-price');
      return;
    }

    const courseId = this.store.courseTree()?.id;
    if (!courseId) {
      this.toast.warning('Không tìm thấy khóa học');
      this.store.markError();
      return;
    }

    this.isSaving.set(true);
    this.store.markSaving();

    const value = this.form.getRawValue();
    const payload = {
      title: value.title || '',
      description: value.description || '',
      thumbnailUrl: this.thumbnailUrl(),
      categoryId: value.categoryId || null,
      tags: this.selectedTags().map((tag) => tag.name),
      introVideoUrl: this.normalizeOptionalText(value.introVideoUrl),
      courseInformation: this.normalizeOptionalText(value.courseInformation),
      welcomeMessage: this.normalizeOptionalText(value.welcomeMessage),
      benefits: this.normalizeOptionalText(value.benefits),
      price: this.isPaid() ? this.normalizeOptionalNumber(value.price) : null,
      salePrice: this.isPaid() ? this.normalizeOptionalNumber(value.salePrice) : null,
      priceType: value.priceType || 'FREE',
      visibility: value.visibility || 'PUBLIC',
      credits: this.normalizeOptionalNumber(value.credits),
      deliveryMode: this.currentDeliveryMode()
    };

    this.service.updateCourseInfo(courseId, payload).subscribe({
      next: () => {
        const tagIds = this.selectedTags().map((tag) => tag.id);
        this.service.setCourseTags(courseId, tagIds).subscribe({
          next: () => {
            this.handleSaveSuccess('Đã lưu thông tin khóa học');
          },
          error: () => {
            this.handleSaveSuccess('Đã lưu thông tin, nhưng cập nhật thẻ thất bại', 'warning');
          }
        });
      },
      error: (err: any) => {
        this.toast.error('Lưu thất bại: ' + (err?.error?.message || err?.message || 'Lỗi không xác định'));
        this.isSaving.set(false);
        this.store.markError();
      }
    });
  }

  async canDeactivate(): Promise<boolean> {
    if (!this.hasUnsavedChanges()) {
      return true;
    }

    const shouldLeave = await this.confirmDialog.confirm({
      title: 'Rời màn chỉnh sửa',
      message: 'Bạn có thay đổi chưa lưu ở phần thông tin khóa học. Nếu rời màn này, các chỉnh sửa sẽ bị mất.',
      variant: 'warning',
      confirmText: 'Rời màn này',
      cancelText: 'Ở lại'
    });
    if (shouldLeave) {
      this.store.markSaved();
    }

    return shouldLeave;
  }

  private hydrateCategoryFromStore(categoryId: string) {
    for (const root of this.categoryTree()) {
      const subcategory = root.children?.find((item) => item.id === categoryId);
      if (subcategory) {
        this.selectedRootId.set(root.id);
        this.subcategories.set(root.children || []);
        return;
      }

      if (root.id === categoryId) {
        this.selectedRootId.set(root.id);
        this.subcategories.set(root.children || []);
        return;
      }
    }
  }

  private applyTreeToForm(tree: CourseDraftDTO) {
    this.hydrateTagsFromNames(tree.tags || []);

    this.form.patchValue(
      {
        title: tree.title,
        description: tree.description,
        categoryId: tree.categoryId || '',
        tags: this.selectedTags().map((tag) => tag.name).join(','),
        introVideoUrl: tree.introVideoUrl || '',
        courseInformation: tree.courseInformation || '',
        welcomeMessage: tree.welcomeMessage || '',
        benefits: tree.benefits || '',
        price: tree.price ?? null,
        salePrice: tree.salePrice ?? null,
        priceType: tree.priceType || 'FREE',
        visibility: tree.visibility || 'PUBLIC',
        credits: tree.credits ?? null
      },
      { emitEvent: false }
    );

    this.thumbnailUrl.set(tree.thumbnailUrl || null);
    this.thumbnailPreview.set(null);
    this.currentDeliveryMode.set((tree.deliveryMode as DeliveryMode) || 'SELF_PACED');
    this.isModeLocked.set(!!tree.hasEnrollments);
    this.selectedRootId.set('');
    this.subcategories.set([]);
    this.syncFormSignals();

    if (tree.categoryId && this.categoryTree().length) {
      this.hydrateCategoryFromStore(tree.categoryId);
    }

    this.showValidationSummary.set(false);
    this.form.markAsPristine();
    this.store.markSaved();
  }

  private hydrateTagsFromNames(names: string[]) {
    const available = this.availableTags();
    if (available.length) {
      this.selectedTags.set(
        names
          .map((name) => available.find((tag) => tag.name === name))
          .filter((tag): tag is CourseTagDTO => !!tag)
      );
      return;
    }

    this.pendingTagNames = names;
  }

  private handleThumbnailUpload(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      this.toast.error('Ảnh quá lớn. Kích thước tối đa: 5MB');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.toast.error('Định dạng không hỗ trợ. Chỉ chấp nhận: JPG, PNG, WebP');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => this.thumbnailPreview.set(reader.result as string);
    reader.readAsDataURL(file);

    this.isUploading.set(true);
    this.uploadProgress.set(0);
    this.uploadSub = this.service.uploadFileWithProgress(file, 'course-thumbnails').subscribe({
      next: (event) => {
        if (event.type === 'progress') {
          this.uploadProgress.set(event.progress);
          return;
        }

        this.thumbnailUrl.set(event.fileUrl);
        this.markUnsavedState();
        this.isUploading.set(false);
        this.uploadProgress.set(0);
        this.toast.success('Ảnh đã được tải lên thành công');
      },
      error: (err: any) => {
        this.toast.error('Tải ảnh thất bại: ' + (err?.error?.message || err?.message || 'Lỗi không xác định'));
        this.isUploading.set(false);
        this.uploadProgress.set(0);
        this.thumbnailPreview.set(null);
      }
    });
  }

  private handleSaveSuccess(message: string, tone: 'success' | 'warning' = 'success') {
    if (tone === 'warning') {
      this.toast.warning(message);
    } else {
      this.toast.success(message);
    }

    this.isSaving.set(false);
    this.showValidationSummary.set(false);
    this.store.markSaved();
    this.form.markAsPristine();

    const courseId = this.store.courseTree()?.id;
    if (courseId) {
      this.store.loadCourse(courseId, true);
    }
  }

  private markUnsavedState() {
    this.form.markAsDirty();
    this.syncFormSignals();
    this.store.markUnsaved();
  }

  private hasUnsavedChanges(): boolean {
    return this.form.dirty || this.isUploading();
  }

  private normalizeOptionalText(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private normalizeOptionalNumber(value: unknown): number | null {
    return this.coerceOptionalNumber(value);
  }

  private coerceOptionalNumber(value: unknown): number | null {
    if (value == null || value === '') {
      return null;
    }

    const numeric = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  private parseHttpUrl(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    if (!normalized) {
      return null;
    }

    try {
      const url = new URL(normalized);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return null;
      }
      return url.toString();
    } catch {
      return null;
    }
  }

  formatCurrency(value: unknown): string {
    const numeric = this.coerceOptionalNumber(value);
    if (numeric == null) {
      return '';
    }

    return `${this.currencyFormatter.format(numeric)} đ`;
  }

  private syncFormSignals() {
    this.formValue.set(this.form.getRawValue());
    this.formStatus.set(this.form.status);
  }
}
