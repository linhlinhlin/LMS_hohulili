import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  viewChild,
  signal,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { CourseAuthoringService, type CourseDraftDTO } from '../../services/course-authoring.service';
import { CourseEditorStore } from '../../store/course-editor.store';
import { CourseInfoFormService } from './course-info-form.service';
import { CourseInfoBasicComponent } from './sections/course-info-basic.component';
import { CourseInfoDescriptionComponent } from './sections/course-info-description.component';
import { CourseInfoMediaComponent } from './sections/course-info-media.component';
import { CourseInfoPricingComponent } from './sections/course-info-pricing.component';
import { CourseInfoVisibilityComponent } from './sections/course-info-visibility.component';

@Component({
  selector: 'app-course-info',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CourseInfoFormService],
  imports: [
    ReactiveFormsModule,
    CourseInfoBasicComponent,
    CourseInfoDescriptionComponent,
    CourseInfoMediaComponent,
    CourseInfoPricingComponent,
    CourseInfoVisibilityComponent,
  ],
  templateUrl: './course-info.component.html',
  styleUrl: './course-info.component.scss',
})
export class CourseInfoComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly store = inject(CourseEditorStore);
  readonly svc = inject(CourseInfoFormService);
  private readonly service = inject(CourseAuthoringService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
  private readonly el = inject(ElementRef);

  readonly mediaSection = viewChild(CourseInfoMediaComponent);
  readonly activeSection = signal<string>('basic');

  readonly sectionNav = [
    { key: 'basic', label: 'Cơ bản' },
    { key: 'media', label: 'Ảnh & video' },
    { key: 'description', label: 'Mô tả' },
    { key: 'visibility', label: 'Hiển thị' },
    { key: 'pricing', label: 'Học phí' },
  ];

  private formChangesSub: Subscription | null = null;
  private formStatusSub: Subscription | null = null;
  private scrollCleanup: (() => void) | null = null;

  constructor() {
    this.formChangesSub = this.svc.form.valueChanges.subscribe(() => {
      this.svc.syncFormSignals();
      if (this.svc.form.dirty) this.store.markUnsaved();
    });
    this.formStatusSub = this.svc.form.statusChanges.subscribe(() => {
      this.svc.formStatus.set(this.svc.form.status);
    });

    effect(() => {
      const tree = this.store.courseTree();
      if (tree && !this.svc.form.dirty) {
        untracked(() => this.applyTreeToForm(tree));
      }
    });
  }

  ngOnInit() {
    this.service.getCourseCategoryTree().subscribe({
      next: (tree) => {
        this.svc.categoryTree.set(tree);
        const catId = this.svc.form.controls.categoryId.value;
        if (catId) this.svc.hydrateCategoryFromStore(catId);
      },
      error: () => this.toast.error('Không tải được danh mục'),
    });

    this.service.getCourseTags().subscribe({
      next: (tags) => {
        this.svc.availableTags.set(tags);
        if (this.svc.pendingTagNames.length) {
          this.svc.selectedTags.set(
            this.svc.pendingTagNames
              .map((name) => tags.find((t) => t.name === name))
              .filter((t): t is NonNullable<typeof t> => !!t),
          );
          this.svc.pendingTagNames = [];
        }
      },
      error: () => {},
    });
  }

  ngAfterViewInit() {
    this.setupScrollSpy();
  }

  ngOnDestroy() {
    this.formChangesSub?.unsubscribe();
    this.formStatusSub?.unsubscribe();
    this.scrollCleanup?.();
  }

  scrollToSection(key: string) {
    const el = document.getElementById('section-' + key);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private setupScrollSpy() {
    const scrollRoot = this.el.nativeElement.closest('.overflow-y-auto') as HTMLElement | null;
    if (!scrollRoot) return;

    const updateActive = () => {
      const rootRect = scrollRoot.getBoundingClientRect();
      // Threshold line: 20% from top of scroll area — section becomes active
      // when user starts reading it, not when it barely touches the top edge
      const threshold = rootRect.top + rootRect.height * 0.2;
      let activeKey = this.sectionNav[0].key;

      for (const item of this.sectionNav) {
        const el = document.getElementById('section-' + item.key);
        if (!el) continue;
        // Last section whose top has scrolled past the threshold line = current section
        if (el.getBoundingClientRect().top <= threshold) {
          activeKey = item.key;
        }
      }

      this.activeSection.set(activeKey);
    };

    scrollRoot.addEventListener('scroll', updateActive, { passive: true });
    this.scrollCleanup = () => scrollRoot.removeEventListener('scroll', updateActive);
    updateActive();
  }

  discardChanges() {
    this.mediaSection()?.cancelUpload();
    const tree = this.store.courseTree();
    if (tree) this.applyTreeToForm(tree);
  }

  async save() {
    this.svc.showValidationSummary.set(true);

    if (this.svc.form.invalid) {
      this.svc.form.markAllAsTouched();
      this.toast.warning('Vui lòng kiểm tra lại các trường bắt buộc.');
      const first = this.svc.validationSummary()[0];
      if (first) this.svc.focusField(first.fieldId);
      return;
    }

    if (this.svc.introVideoError()) {
      this.toast.warning(this.svc.introVideoError());
      this.svc.focusField('course-intro-video');
      return;
    }
    if (this.svc.priceError()) {
      this.toast.warning(this.svc.priceError());
      this.svc.focusField('course-price');
      return;
    }
    if (this.svc.salePriceError()) {
      this.toast.warning(this.svc.salePriceError());
      this.svc.focusField('course-sale-price');
      return;
    }

    const courseId = this.store.courseTree()?.id;
    if (!courseId) { this.toast.warning('Không tìm thấy khóa học'); this.store.markError(); return; }

    this.svc.isSaving.set(true);
    this.store.markSaving();

    let introVideoAssetId: string | null;
    try {
      introVideoAssetId = (await this.mediaSection()?.ensureIntroVideoUploaded()) ?? null;
    } catch (error) {
      this.svc.isSaving.set(false);
      this.store.markError();
      this.toast.error(error instanceof Error ? error.message : 'Tải video giới thiệu thất bại.');
      return;
    }

    const value = this.svc.form.getRawValue();
    const payload = {
      title: value.title || '',
      description: value.description || '',
      thumbnailUrl: this.svc.thumbnailUrl(),
      categoryId: value.categoryId || null,
      tags: this.svc.selectedTags().map((t) => t.name),
      introVideoUrl: introVideoAssetId ? null : this.svc.normalizeOptionalText(value.introVideoUrl),
      introVideoAssetId,
      courseInformation: this.svc.normalizeOptionalText(value.courseInformation),
      welcomeMessage: this.svc.normalizeOptionalText(value.welcomeMessage),
      benefits: this.svc.normalizeOptionalText(value.benefits),
      price: this.svc.isPaid() ? this.svc.coerceOptionalNumber(value.price) : null,
      salePrice: this.svc.isPaid() ? this.svc.coerceOptionalNumber(value.salePrice) : null,
      priceType: value.priceType || 'FREE',
      visibility: value.visibility || 'PUBLIC',
      credits: this.svc.coerceOptionalNumber(value.credits),
      deliveryMode: this.svc.currentDeliveryMode(),
    };

    this.service.updateCourseInfo(courseId, payload).subscribe({
      next: () => {
        const tagIds = this.svc.selectedTags().map((t) => t.id);
        this.service.setCourseTags(courseId, tagIds).subscribe({
          next: () => this.handleSaveSuccess('Đã lưu thông tin khóa học'),
          error: () => this.handleSaveSuccess('Đã lưu thông tin, nhưng cập nhật thẻ thất bại', 'warning'),
        });
      },
      error: (err: any) => {
        this.toast.error('Lưu thất bại: ' + (err?.error?.message || err?.message || 'Lỗi không xác định'));
        this.svc.isSaving.set(false);
        this.store.markError();
      },
    });
  }

  async canDeactivate(): Promise<boolean> {
    if (!this.hasUnsavedChanges()) return true;
    const shouldLeave = await this.confirmDialog.confirm({
      title: 'Rời màn chỉnh sửa',
      message: 'Bạn có thay đổi chưa lưu ở phần thông tin khóa học. Nếu rời màn này, các chỉnh sửa sẽ bị mất.',
      variant: 'warning',
      confirmText: 'Rời màn này',
      cancelText: 'Ở lại',
    });
    if (shouldLeave) this.store.markSaved();
    return shouldLeave;
  }

  private applyTreeToForm(tree: CourseDraftDTO) {
    this.svc.hydrateTagsFromNames(tree.tags || []);
    this.svc.form.patchValue({
      title: tree.title,
      description: tree.description,
      categoryId: tree.categoryId || '',
      tags: this.svc.selectedTags().map((t) => t.name).join(','),
      introVideoUrl: tree.introVideoPlaybackUrl || tree.introVideoUrl || '',
      courseInformation: tree.courseInformation || '',
      welcomeMessage: tree.welcomeMessage || '',
      benefits: tree.benefits || '',
      price: tree.price ?? null,
      salePrice: tree.salePrice ?? null,
      priceType: tree.priceType || 'FREE',
      visibility: tree.visibility || 'PUBLIC',
      credits: tree.credits ?? null,
    }, { emitEvent: false });

    this.svc.thumbnailUrl.set(tree.thumbnailUrl || null);
    this.svc.introVideoAssetId.set(tree.introVideoAssetId || null);
    this.svc.introVideoProcessingStatus.set(tree.introVideoProcessingStatus || null);
    this.svc.introVideoSourceKind.set(tree.introVideoSourceKind || null);
    this.svc.introVideoPlaybackUrl.set(tree.introVideoPlaybackUrl || tree.introVideoUrl || null);
    this.svc.introVideoStreamVideoUid.set(tree.introVideoStreamVideoUid || null);
    this.svc.introVideoErrorMessage.set(null);
    this.svc.currentDeliveryMode.set((tree.deliveryMode as 'SELF_PACED' | 'INSTRUCTOR_LED') || 'SELF_PACED');
    this.svc.isModeLocked.set(!!tree.hasEnrollments);
    this.svc.selectedRootId.set('');
    this.svc.subcategories.set([]);
    this.svc.syncFormSignals();

    if (tree.categoryId && this.svc.categoryTree().length) {
      this.svc.hydrateCategoryFromStore(tree.categoryId);
    }

    this.svc.showValidationSummary.set(false);
    this.svc.form.markAsPristine();
    this.store.markSaved();

    this.mediaSection()?.applyTreeMedia(tree);
  }

  private handleSaveSuccess(message: string, tone: 'success' | 'warning' = 'success') {
    if (tone === 'warning') this.toast.warning(message); else this.toast.success(message);
    this.svc.isSaving.set(false);
    this.svc.showValidationSummary.set(false);
    this.store.markSaved();
    this.svc.form.markAsPristine();
    const courseId = this.store.courseTree()?.id;
    if (courseId) this.store.loadCourse(courseId, true);
  }

  private hasUnsavedChanges(): boolean {
    return this.svc.form.dirty || (this.mediaSection()?.hasUnsavedMedia() ?? false);
  }
}
