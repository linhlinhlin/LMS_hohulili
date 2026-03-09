import { Component, inject, signal, effect, untracked, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
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
  imports: [FormsModule, CourseInstructorsComponent],
  template: `
<div class="max-w-screen-2xl mx-auto px-3 sm:px-4 py-3">

  <!-- Two-Column Layout matching Info page (WordPress/Shopify pattern) -->
  <div class="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">

    <!-- ============ MAIN COLUMN ============ -->
    <div class="space-y-5 min-w-0">

      <!-- SECTION 1: QUYỀN TRUY CẬP -->
      <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <h2 class="text-sm font-semibold text-slate-900">Hiển thị & Đăng ký</h2>
          <p class="text-xs text-slate-500 mt-0.5">Quản lý quyền truy cập và đăng ký khóa học</p>
        </div>
        <div class="p-5 space-y-5">
          <div class="grid grid-cols-2 gap-3">
            <!-- Public Card -->
            <div class="border rounded-lg p-4 cursor-pointer transition-all group"
              [class]="visibility() === 'public'
                ? 'border-[#0056D2] bg-[#0056D2]/5'
                : 'border-slate-200 hover:border-slate-300'"
              (click)="visibility.set('public')">
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-sm font-semibold text-slate-900">Công khai</span>
                <input type="radio" name="vis" [checked]="visibility() === 'public'" class="text-[#0056D2] pointer-events-none">
              </div>
              <p class="text-xs text-slate-500">Bất kỳ ai cũng có thể tìm thấy và xem nội dung giới thiệu.</p>
            </div>

            <!-- Private Card -->
            <div class="border rounded-lg p-4 cursor-pointer transition-all group"
              [class]="visibility() === 'private'
                ? 'border-[#0056D2] bg-[#0056D2]/5'
                : 'border-slate-200 hover:border-slate-300'"
              (click)="visibility.set('private')">
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-sm font-semibold text-slate-900">Riêng tư</span>
                <input type="radio" name="vis" [checked]="visibility() === 'private'" class="text-[#0056D2] pointer-events-none">
              </div>
              <p class="text-xs text-slate-500">Chỉ học viên được mời hoặc cấp quyền mới truy cập được.</p>
            </div>
          </div>

          <!-- Toggle Options -->
          <div class="relative">
            <span class="absolute -top-2.5 right-3 z-10 text-[10px] font-semibold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Sắp ra mắt</span>
          <div class="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-4 opacity-50 pointer-events-none select-none">
            <label class="flex items-center justify-between cursor-pointer">
              <div>
                <span class="block text-sm font-medium text-slate-900">Cho phép tự đăng ký</span>
                <span class="text-xs text-slate-500">Học viên nhấn "Tham gia" là vào học ngay.</span>
              </div>
              <input type="checkbox" [ngModel]="allowSelfEnrollment()" (ngModelChange)="allowSelfEnrollment.set($event)"
                class="w-4 h-4 text-[#0056D2] rounded border-slate-300 focus:ring-[#0056D2]">
            </label>

            <div class="flex items-center justify-between border-t border-slate-200 pt-4">
              <div>
                <span class="block text-sm font-medium text-slate-900">Giới hạn sĩ số</span>
                <span class="text-xs text-slate-500">Để trống nếu không giới hạn.</span>
              </div>
              <div class="relative w-28">
                <input type="number" [ngModel]="maxStudents()" (ngModelChange)="maxStudents.set($event)" min="1"
                  class="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm focus:ring-[#0056D2] focus:border-[#0056D2] pr-8" placeholder="--">
                <span class="absolute right-3 top-2 text-xs text-slate-400 font-medium pointer-events-none">HV</span>
              </div>
            </div>
          </div>
          </div>
        </div>
      </section>

      <!-- SECTION 2: LỘ TRÌNH HỌC -->
      <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative">
        <div class="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h2 class="text-sm font-semibold text-slate-900">Lộ trình & Điều kiện mở bài</h2>
            <p class="text-xs text-slate-500 mt-0.5">Thiết lập cách học viên truy cập nội dung</p>
          </div>
          <span class="text-[10px] font-semibold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Sắp ra mắt</span>
        </div>
        <div class="p-5 space-y-5 opacity-50 pointer-events-none select-none">
          <!-- Progression Mode -->
          <div class="space-y-3">
            <label class="block text-sm font-medium text-slate-700">Điều kiện học học phần</label>
            <div class="space-y-2">
              <label class="flex items-start gap-3 cursor-pointer group p-3 rounded-lg border border-transparent hover:bg-slate-50 transition-colors"
                [class.bg-[#0056D2]/5]="progressionMode() === 'free'"
                [class.border-[#0056D2]/20]="progressionMode() === 'free'">
                <input type="radio" name="progression" value="free"
                  [ngModel]="progressionMode()" (ngModelChange)="progressionMode.set($event)"
                  class="mt-0.5 w-4 h-4 text-[#0056D2] focus:ring-[#0056D2]">
                <div>
                  <span class="text-sm font-medium text-slate-900">Luôn mở (Học tự do)</span>
                  <p class="text-xs text-slate-500">Học viên có thể học bất kỳ bài nào.</p>
                </div>
              </label>
              <label class="flex items-start gap-3 cursor-pointer group p-3 rounded-lg border border-transparent hover:bg-slate-50 transition-colors"
                [class.bg-[#0056D2]/5]="progressionMode() === 'linear'"
                [class.border-[#0056D2]/20]="progressionMode() === 'linear'">
                <input type="radio" name="progression" value="linear"
                  [ngModel]="progressionMode()" (ngModelChange)="progressionMode.set($event)"
                  class="mt-0.5 w-4 h-4 text-[#0056D2] focus:ring-[#0056D2]">
                <div>
                  <span class="text-sm font-medium text-slate-900">Tuần tự</span>
                  <p class="text-xs text-slate-500">Phải hoàn thành bài trước mới được mở bài sau.</p>
                </div>
              </label>
            </div>
          </div>

          <!-- Drip Content -->
          <div class="space-y-3">
            <label class="block text-sm font-medium text-slate-700">Lịch trình mở bài học</label>
            <div class="space-y-2">
              <label class="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-transparent hover:bg-slate-50 transition-colors"
                [class.bg-[#0056D2]/5]="dripType() === 'instant'"
                [class.border-[#0056D2]/20]="dripType() === 'instant'">
                <input type="radio" name="drip" value="instant"
                  [ngModel]="dripType()" (ngModelChange)="dripType.set($event)"
                  class="w-4 h-4 text-[#0056D2] focus:ring-[#0056D2]">
                <span class="text-sm font-medium text-slate-900">Mở tất cả ngay khi đăng ký</span>
              </label>

              <label class="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-transparent hover:bg-slate-50 transition-colors"
                [class.bg-[#0056D2]/5]="dripType() === 'date'"
                [class.border-[#0056D2]/20]="dripType() === 'date'">
                <input type="radio" name="drip" value="date"
                  [ngModel]="dripType()" (ngModelChange)="dripType.set($event)"
                  class="mt-2 w-4 h-4 text-[#0056D2] focus:ring-[#0056D2]">
                <div class="flex-1">
                  <span class="text-sm font-medium text-slate-900 block mb-2">Mở theo lịch trình</span>
                  <div class="flex items-center flex-wrap gap-2 text-sm text-slate-600 transition-opacity" [class.opacity-50]="dripType() !== 'date'">
                    <span>Tự động mở</span>
                    <input type="number" [ngModel]="dateBatchSize()" (ngModelChange)="dateBatchSize.set($event)" [disabled]="dripType() !== 'date'" min="0"
                      class="w-14 px-2 py-1 text-center border border-slate-300 rounded text-sm focus:ring-[#0056D2] focus:border-[#0056D2] font-semibold text-slate-900 disabled:bg-slate-100">
                    <span>bài, mỗi</span>
                    <input type="number" [ngModel]="dateIntervalDays()" (ngModelChange)="dateIntervalDays.set($event)" [disabled]="dripType() !== 'date'" min="0"
                      class="w-14 px-2 py-1 text-center border border-slate-300 rounded text-sm focus:ring-[#0056D2] focus:border-[#0056D2] font-semibold text-slate-900 disabled:bg-slate-100">
                    <span>ngày.</span>
                  </div>
                </div>
              </label>

              <label class="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-transparent hover:bg-slate-50 transition-colors"
                [class.bg-[#0056D2]/5]="dripType() === 'complete'"
                [class.border-[#0056D2]/20]="dripType() === 'complete'">
                <input type="radio" name="drip" value="complete"
                  [ngModel]="dripType()" (ngModelChange)="dripType.set($event)"
                  class="mt-2 w-4 h-4 text-[#0056D2] focus:ring-[#0056D2]">
                <div class="flex-1">
                  <span class="text-sm font-medium text-slate-900 block mb-2">Mở dựa trên tiến độ</span>
                  <div class="flex items-center flex-wrap gap-2 text-sm text-slate-600 transition-opacity" [class.opacity-50]="dripType() !== 'complete'">
                    <span>Sau khi hoàn thành, chờ</span>
                    <input type="number" [ngModel]="completeIntervalDays()" (ngModelChange)="completeIntervalDays.set($event)" [disabled]="dripType() !== 'complete'" min="0"
                      class="w-14 px-2 py-1 text-center border border-slate-300 rounded text-sm focus:ring-[#0056D2] focus:border-[#0056D2] font-semibold text-slate-900 disabled:bg-slate-100">
                    <span>ngày, mở</span>
                    <input type="number" [ngModel]="completeBatchSize()" (ngModelChange)="completeBatchSize.set($event)" [disabled]="dripType() !== 'complete'" min="0"
                      class="w-14 px-2 py-1 text-center border border-slate-300 rounded text-sm focus:ring-[#0056D2] focus:border-[#0056D2] font-semibold text-slate-900 disabled:bg-slate-100">
                    <span>bài tiếp theo.</span>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>
      </section>

      <!-- Save Button (bottom of main column) -->
      <div class="flex justify-end pb-4">
        <button (click)="saveSettings()" [disabled]="isLoading()"
          class="h-10 px-6 rounded-lg bg-[#0056D2] text-white font-medium text-sm hover:bg-[#004BB5] transition-colors disabled:opacity-50 flex items-center gap-2">
          @if (isLoading()) {
            <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          }
          <span>Lưu thay đổi</span>
        </button>
      </div>
    </div>

    <!-- ============ SIDEBAR COLUMN (sticky) ============ -->
    <div class="space-y-5 lg:sticky lg:top-5">

      <!-- SECTION 3: CHỨNG CHỈ -->
      <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-slate-900">Chứng chỉ</h2>
          <span class="text-[10px] font-semibold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Sắp ra mắt</span>
        </div>
        <div class="p-4 opacity-50 pointer-events-none select-none">
          <label class="flex items-center justify-between cursor-pointer">
            <div>
              <span class="block text-sm font-medium text-slate-900">Chứng chỉ hoàn thành</span>
              <span class="text-xs text-slate-500 mt-0.5">Tự động cấp PDF khi đạt 100%.</span>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" [ngModel]="autoCertificate()" (ngModelChange)="autoCertificate.set($event)" class="sr-only peer">
              <div class="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0056D2]"></div>
            </label>
          </label>
        </div>
      </section>

      <!-- SECTION 4: GIẢNG VIÊN -->
      <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <h2 class="text-sm font-semibold text-slate-900">Giảng viên</h2>
        </div>
        <div class="p-4">
          <app-course-instructors [courseId]="store.courseTree()?.id || ''"></app-course-instructors>
        </div>
      </section>

      <!-- DANGER ZONE -->
      <section class="bg-red-50 rounded-xl border border-red-200 overflow-hidden">
        <div class="px-5 py-3.5 border-b border-red-100">
          <h2 class="text-sm font-semibold text-red-700">Vùng nguy hiểm</h2>
        </div>
        <div class="p-4">
          <p class="text-xs text-red-600/70 mb-3">Hành động này không thể hoàn tác.</p>
          <button (click)="deleteCourse()" class="w-full h-9 bg-white border border-red-300 text-red-600 font-medium text-sm rounded-lg hover:bg-red-100 transition-colors">
            Xóa khóa học
          </button>
        </div>
      </section>

    </div>
  </div>

</div>
`
})
export class CourseSettingsComponent {
  store = inject(CourseEditorStore);
  private service = inject(CourseAuthoringService);
  private courseApi = inject(CourseApi);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);
  private router = inject(Router);

  isLoading = signal(false);

  // --- SIGNALS STATE ---
  visibility = signal<'public' | 'private'>('public');
  allowSelfEnrollment = signal(true);
  maxStudents = signal<number | null>(null);
  autoCertificate = signal(false);
  progressionMode = signal<'free' | 'linear'>('free');
  dripType = signal<'instant' | 'date' | 'complete'>('instant');

  dateBatchSize = signal(1);
  dateIntervalDays = signal(1);

  completeBatchSize = signal(1);
  completeIntervalDays = signal(0);

  constructor() {
    effect(() => {
      const tree = this.store.courseTree();
      if (tree) {
        untracked(() => {
          // Map visibility from BE (uppercase) to local (lowercase)
          const vis = tree.visibility?.toLowerCase() as 'public' | 'private';
          this.visibility.set(vis || 'public');

          // Settings from BE (if available)
          if (tree.settings) {
            this.allowSelfEnrollment.set(tree.settings.allowSelfEnrollment ?? true);
            this.maxStudents.set(tree.settings.maxStudents || null);
            this.autoCertificate.set(tree.settings.autoCertificate ?? false);
            this.progressionMode.set(tree.settings.progressionMode || 'free');
            this.dripType.set(tree.settings.dripType || 'instant');
            this.completeBatchSize.set(tree.settings.completeBatchSize || 1);
            this.dateBatchSize.set(tree.settings.dateBatchSize || 1);
            this.dateIntervalDays.set(tree.settings.dateIntervalDays || 1);
            this.completeIntervalDays.set(tree.settings.completeIntervalDays || 0);
          }
        });
      }
    });
  }

  saveSettings() {
    const courseId = this.store.courseTree()?.id;
    if (!courseId) {
      this.toast.warning('Không tìm thấy khóa học');
      return;
    }

    this.isLoading.set(true);

    // Note: allowSelfEnrollment, maxStudents, progressionMode, dripType, autoCertificate
    // are UI-ready but not yet supported by the backend UpdateCourseCommand.
    // Only visibility is persisted to the backend for now.
    const payload = {
      visibility: this.visibility().toUpperCase()
    };

    this.service.updateCourseInfo(courseId, payload).subscribe({
      next: () => {
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
    if (!courseId) return;

    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa khóa học',
      message: 'Bạn có chắc chắn muốn xóa khóa học này?\nHành động này không thể hoàn tác!',
      variant: 'danger',
      confirmText: 'Xóa vĩnh viễn',
      cancelText: 'Hủy'
    });
    if (!confirmed) return;

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
