import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { CourseEditorStore } from '../../store/course-editor.store';
import { CourseAuthoringService } from '../../services/course-authoring.service';
import { CourseInstructorsComponent } from './course-instructors.component';
import { CourseApi } from '../../../../../api/client/course.api';
import { ToastService } from '../../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-course-settings',
  imports: [CourseInstructorsComponent],
  templateUrl: './course-settings.component.html'
})
export class CourseSettingsComponent {
  readonly store = inject(CourseEditorStore);
  private readonly service = inject(CourseAuthoringService);
  private readonly courseApi = inject(CourseApi);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly router = inject(Router);

  readonly isLoading = signal(false);
  readonly visibility = signal<'public' | 'private'>('public');
  readonly allowOfflineDownload = signal(true);
  private readonly initialVisibility = signal<'public' | 'private'>('public');
  private readonly initialAllowOfflineDownload = signal(true);
  private hydratedVisibilityKey: string | null = null;

  readonly hasPersistableChanges = computed(() =>
    this.visibility() !== this.initialVisibility() ||
    this.allowOfflineDownload() !== this.initialAllowOfflineDownload()
  );

  constructor() {
    effect(() => {
      const tree = this.store.courseTree();
      if (!tree) {
        return;
      }

      const visibility = tree.visibility?.toLowerCase() === 'private' ? 'private' : 'public';
      const offlineDownload = (tree as any).allowOfflineDownload !== false;
      const hydrationKey = `${tree.id}:${visibility}:${offlineDownload}`;
      if (this.hydratedVisibilityKey === hydrationKey) {
        return;
      }

      untracked(() => {
        this.initialVisibility.set(visibility);
        this.visibility.set(visibility);
        this.initialAllowOfflineDownload.set(offlineDownload);
        this.allowOfflineDownload.set(offlineDownload);
        this.hydratedVisibilityKey = hydrationKey;
        this.store.markSaved();
      });
    });

    effect(() => {
      const loading = this.isLoading();
      const hasChanges = this.hasPersistableChanges();

      untracked(() => {
        if (loading) {
          this.store.markSaving();
          return;
        }

        if (hasChanges) {
          this.store.markUnsaved();
          return;
        }

        this.store.markSaved();
      });
    });
  }

  setVisibility(value: 'public' | 'private') {
    if (this.visibility() === value) {
      return;
    }

    this.visibility.set(value);
  }

  async canDeactivate(): Promise<boolean> {
    if (!this.hasPersistableChanges() && !this.isLoading()) {
      return true;
    }

    const shouldLeave = await this.confirmDialog.confirm({
      title: 'Rời phần cài đặt',
      message: 'Bạn có thay đổi chưa lưu ở phần cài đặt khóa học. Nếu rời màn này, các chỉnh sửa sẽ bị mất.',
      variant: 'warning',
      confirmText: 'Rời màn này',
      cancelText: 'Ở lại'
    });
    if (shouldLeave) {
      this.store.markSaved();
    }

    return shouldLeave;
  }

  saveSettings() {
    const courseId = this.store.courseTree()?.id;
    if (!courseId) {
      this.toast.warning('Không tìm thấy khóa học');
      return;
    }

    if (!this.hasPersistableChanges()) {
      return;
    }

    this.isLoading.set(true);

    const payload: any = {
      visibility: this.visibility().toUpperCase(),
      allowOfflineDownload: this.allowOfflineDownload()
    };

    this.service.updateCourseInfo(courseId, payload).subscribe({
      next: () => {
        this.initialVisibility.set(this.visibility());
        this.initialAllowOfflineDownload.set(this.allowOfflineDownload());
        this.hydratedVisibilityKey = `${courseId}:${this.visibility()}:${this.allowOfflineDownload()}`;
        this.toast.success('Đã lưu cài đặt khóa học');
        this.isLoading.set(false);
        this.store.loadCourse(courseId, true);
      },
      error: (err: any) => {
        this.toast.error('Lưu thất bại: ' + (err?.error?.message || 'Lỗi không xác định'));
        this.isLoading.set(false);
      }
    });
  }

  async deleteCourse() {
    const courseId = this.store.courseTree()?.id;
    if (!courseId) {
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa khóa học',
      message: 'Bạn có chắc chắn muốn xóa khóa học này?\nHành động này không thể hoàn tác!',
      variant: 'danger',
      confirmText: 'Xóa vĩnh viễn',
      cancelText: 'Hủy'
    });
    if (!confirmed) {
      return;
    }

    this.isLoading.set(true);
    this.courseApi.deleteCourse(courseId).subscribe({
      next: () => {
        this.toast.success('Đã xóa khóa học');
        this.router.navigate(['/teacher/courses']);
      },
      error: (err: any) => {
        this.toast.error('Xóa thất bại: ' + (err?.error?.message || 'Lỗi không xác định'));
        this.isLoading.set(false);
      }
    });
  }
}
