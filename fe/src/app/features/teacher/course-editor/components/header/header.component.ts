import { Component, inject, computed, signal, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Router, RouterModule } from '@angular/router';
import { CourseEditorStore } from '../../store/course-editor.store';
import { CourseAuthoringService } from '../../services/course-authoring.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { getAdminPortalBase } from '../../../../../core/utils/portal-route.util';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-course-editor-header',
    imports: [CommonModule, RouterModule],
    template: `
    <header class="h-12 flex items-center justify-between px-3 bg-white border-b border-slate-200">
        <!-- Left: Back + Title -->
        <div class="flex items-center gap-1 min-w-0">
            <button (click)="goBack()"
                    data-wiii-id="back-to-courses"
                    data-wiii-click-safe="true"
                    data-wiii-click-kind="navigation"
                    class="flex items-center justify-center w-8 h-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
                    title="Quay lại danh sách khóa học">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
            </button>

            <div class="w-px h-5 bg-slate-200 mx-1 flex-shrink-0"></div>

            <span class="text-sm font-semibold text-slate-800 truncate max-w-[200px] sm:max-w-[360px]"
                  [title]="store.courseInfo()?.title || ''">
                {{ store.courseInfo()?.title || 'Đang tải...' }}
            </span>
        </div>

        <!-- Right: Save status (contextual) + Publish dropdown -->
        <div class="flex items-center gap-2 flex-shrink-0">
             @if (!isAdminViewMode()) {
                 <!-- Save Status: Progressive Disclosure — only show when NOT saved -->
                 @switch (store.saveStatus()) {
                     @case ('saving') {
                         <div class="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-50 border border-blue-100">
                             <svg class="animate-spin h-3 w-3 text-[#0056D2]" fill="none" viewBox="0 0 24 24">
                                 <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                 <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                             </svg>
                             <span class="text-xs font-medium text-[#0056D2] hidden sm:inline">Đang lưu</span>
                         </div>
                     }
                     @case ('unsaved') {
                         <div class="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 border border-amber-200">
                             <div class="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                             <span class="text-xs font-medium text-amber-700 hidden sm:inline">Chưa lưu</span>
                         </div>
                     }
                     @case ('error') {
                         <div class="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-50 border border-red-200">
                             <svg class="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                             <span class="text-xs font-medium text-red-600 hidden sm:inline">Lỗi lưu</span>
                         </div>
                     }
                 }

                 <!-- Preview as Student -->
                 <a [href]="'/teacher/courses/' + courseId() + '/preview'" target="_blank"
                    data-wiii-id="preview-course"
                    data-wiii-click-safe="true"
                    data-wiii-click-kind="preview"
                    class="h-8 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5">
                     <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                         <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                         <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                     </svg>
                     <span class="hidden sm:inline">Xem trước</span>
                 </a>

                 <!-- Publish Dropdown (readiness + preview + publish) -->
                 <div class="relative">
                     <button type="button"
                             id="editor-publish-trigger"
                             data-wiii-id="open-publish-menu"
                             (click)="publishMenuOpen.set(!publishMenuOpen())"
                             [attr.aria-expanded]="publishMenuOpen()"
                             aria-haspopup="menu"
                             aria-controls="editor-publish-menu"
                             class="h-8 px-3.5 rounded-lg bg-[#0056D2] text-white text-xs font-semibold hover:bg-[#004BB5] transition-colors shadow-sm flex items-center gap-1.5">
                         Xuất bản
                         <svg class="w-3 h-3 transition-transform" [class.rotate-180]="publishMenuOpen()" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
                             <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                         </svg>
                     </button>

                     @if (publishMenuOpen()) {
                         <div class="fixed inset-0 z-40" aria-hidden="true" (click)="publishMenuOpen.set(false)"></div>

                         <div id="editor-publish-menu"
                              role="menu"
                              aria-labelledby="editor-publish-trigger"
                              class="absolute right-0 top-full mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                             <!-- Readiness Checklist -->
                             <div class="px-4 py-3 border-b border-slate-100">
                                 <div class="flex items-center justify-between mb-2">
                                     <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Tiến độ hoàn thiện</span>
                                     <span class="text-xs font-bold"
                                           [class]="readinessPercent() === 100 ? 'text-green-600' : 'text-slate-500'">
                                         {{ readinessChecklist().score }}/{{ readinessChecklist().total }}
                                     </span>
                                 </div>
                                 <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2.5">
                                     <div class="h-full rounded-full transition-all duration-300"
                                          [class]="readinessPercent() === 100 ? 'bg-green-500' : 'bg-[#0056D2]'"
                                          [style.width.%]="readinessPercent()"></div>
                                 </div>
                                 @for (item of readinessChecklist().items; track item.label) {
                                     <div class="flex items-center gap-2 py-0.5">
                                         @if (item.done) {
                                             <svg class="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                 <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                                             </svg>
                                         } @else {
                                             <div class="w-3.5 h-3.5 rounded-full border-2 flex-shrink-0"
                                                  [class]="item.critical ? 'border-red-300' : 'border-slate-200'"></div>
                                         }
                                         <span class="text-xs leading-tight" [class]="item.done ? 'text-slate-400 line-through' : 'text-slate-600'">
                                             {{ item.label }}
                                         </span>
                                         @if (item.critical && !item.done) {
                                             <span class="text-[10px] font-medium text-red-500 ml-auto">Bắt buộc</span>
                                         }
                                     </div>
                                 }
                             </div>
                             <!-- Actions -->
                             <div class="py-1">
                                 <button type="button"
                                         role="menuitem"
                                         data-wiii-id="preview-course-from-publish-menu"
                                         data-wiii-click-safe="true"
                                         data-wiii-click-kind="preview"
                                         (click)="preview(); publishMenuOpen.set(false)"
                                         class="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors">
                                     <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                                         <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                         <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                     </svg>
                                     Xem trước khóa học
                                 </button>
                                 <div class="mx-3 border-t border-slate-100" role="separator" aria-hidden="true"></div>
                                 <button type="button"
                                         role="menuitem"
                                         data-wiii-id="submit-course-for-approval"
                                         (click)="publish(); publishMenuOpen.set(false)"
                                         class="w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2.5 transition-colors"
                                         [class]="readinessChecklist().canPublish ? 'text-[#0056D2] hover:bg-[#0056D2]/5' : 'text-slate-300 cursor-not-allowed'"
                                         [disabled]="!readinessChecklist().canPublish"
                                         [attr.aria-disabled]="!readinessChecklist().canPublish">
                                     <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                                         <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                     </svg>
                                     Xuất bản khóa học
                                 </button>
                             </div>
                         </div>
                     }
                 </div>
             } @else {
                 <div class="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-medium text-amber-700">
                     <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                         <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                         <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                     </svg>
                     Chế độ xem
                 </div>
             }
        </div>
    </header>
  `
})
export class CourseEditorHeaderComponent {
    store = inject(CourseEditorStore);
    private router = inject(Router);
    private service = inject(CourseAuthoringService);
    private authService = inject(AuthService);
    private toast = inject(ToastService);
    private confirmDialog = inject(ConfirmDialogService);

    courseId = computed(() => this.store.courseTree()?.id || '');

    publishMenuOpen = signal(false);

    isAdminViewMode = computed(() => {
        const role = this.authService.userRole();
        return role === 'admin' || role === 'org_admin';
    });

    readinessChecklist = this.store.readinessChecklist;
    readinessPercent = this.store.readinessPercent;
    hasUnsavedChanges = computed(() => this.store.saveStatus() === 'unsaved');

    @HostListener('document:keydown.escape')
    onEscape() {
        if (this.publishMenuOpen()) {
            this.publishMenuOpen.set(false);
        }
    }

    async goBack() {
        if (this.hasUnsavedChanges()) {
            const shouldLeave = await this.confirmDialog.confirm({
                title: 'Rời màn chỉnh sửa',
                message: 'Bạn có thay đổi chưa lưu trong trình biên tập. Nếu quay lại bây giờ, các chỉnh sửa sẽ bị mất.',
                variant: 'warning',
                confirmText: 'Quay lại',
                cancelText: 'Ở lại'
            });
            if (!shouldLeave) {
                return;
            }
            this.store.markSaved();
        }

        if (this.isAdminViewMode()) {
            this.router.navigateByUrl(`${getAdminPortalBase(this.authService.userRole())}/courses`);
        } else {
            this.router.navigate(['/teacher/courses']);
        }
    }

    preview() {
        if (this.hasUnsavedChanges()) {
            this.toast.warning('Hãy lưu thay đổi trước khi xem trước.');
            return;
        }

        const courseId = this.store.courseTree()?.id;
        if (courseId) {
            const win = window.open('/student/courses/' + courseId, '_blank');
            if (!win) {
                this.toast.warning('Trình duyệt đã chặn cửa sổ mới. Vui lòng cho phép popup.');
            }
        }
    }

    async publish() {
        const id = this.store.courseTree()?.id;
        if (!id) return;

        if (this.hasUnsavedChanges()) {
            this.toast.warning('Hãy lưu thay đổi trước khi xuất bản.');
            return;
        }

        const checklist = this.readinessChecklist();
        if (!checklist.canPublish) {
            const missing = checklist.items.filter(i => i.critical && !i.done).map(i => i.label);
            const offendingQuizLessons = checklist.emptyQuizLessons ?? [];
            const detail = offendingQuizLessons.length > 0
                ? ` Bài kiểm tra trống ở các bài học: ${offendingQuizLessons.slice(0, 3).join(', ')}${offendingQuizLessons.length > 3 ? '...' : ''}.`
                : '';
            this.toast.warning('Chưa đủ điều kiện xuất bản. Thiếu: ' + missing.join(', ') + '.' + detail);
            return;
        }

        const confirmed = await this.confirmDialog.confirm({
            title: 'Xuất bản khóa học',
            message: 'Bạn có chắc chắn muốn xuất bản khóa học này?\n\nKhóa học sẽ được gửi để phê duyệt.',
            variant: 'info',
            confirmText: 'Xuất bản',
            cancelText: 'Hủy'
        });
        if (!confirmed) return;

        this.service.publishCourse(id).subscribe({
            next: () => {
                this.toast.success('Đã gửi khóa học để phê duyệt!');
                this.router.navigate(['/teacher/courses']);
            },
            error: (err: any) => this.toast.error('Xuất bản thất bại: ' + (err?.message || 'Lỗi không xác định'))
        });
    }
}
