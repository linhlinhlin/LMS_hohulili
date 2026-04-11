import { Component, inject, computed, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Router, RouterModule } from '@angular/router';
import { CourseEditorStore } from '../../store/course-editor.store';
import { CourseAuthoringService } from '../../services/course-authoring.service';
import { CurriculumSelectionService } from '../../services/curriculum-selection.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-course-editor-header',
    imports: [CommonModule, RouterModule],
    template: `
    <header class="h-12 flex items-center justify-between px-3 bg-white border-b border-slate-200">
        <!-- Left: Back + Sidebar toggle + Course title -->
        <div class="flex items-center gap-1 min-w-0">
            <button (click)="goBack()"
                    class="flex items-center justify-center w-8 h-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
                    title="Quay lại danh sách khóa học">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
            </button>

            @if (activeTab() === 'curriculum' || activeTab() === 'classes') {
              <button (click)="toggleSidebar.emit()"
                      class="flex items-center justify-center w-8 h-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
                      [title]="sidebarCollapsed() ? 'Hiện sidebar' : 'Ẩn sidebar'">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    @if (sidebarCollapsed()) {
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3 12h18M3 6h18M3 18h18" />
                    } @else {
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 3h12M9 9h12M9 15h12M9 21h12M3 3v18" />
                    }
                  </svg>
              </button>
            }

            <div class="w-px h-5 bg-slate-200 mx-1 flex-shrink-0"></div>

            <!-- Course title -->
            <span class="text-sm font-semibold text-slate-800 truncate max-w-[160px] sm:max-w-[280px]"
                  [title]="store.courseInfo()?.title || ''">
                {{ store.courseInfo()?.title || 'Đang tải...' }}
            </span>
        </div>

        <!-- Right: Status + Actions -->
        <div class="flex items-center gap-2 flex-shrink-0">
             @if (!isAdminViewMode()) {
                 <!-- Save Status -->
                 @switch (store.saveStatus()) {
                     @case ('saving') {
                         <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-100">
                             <svg class="animate-spin h-3.5 w-3.5 text-[#0056D2]" fill="none" viewBox="0 0 24 24">
                                 <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                 <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                             </svg>
                             <span class="text-xs font-medium text-[#0056D2] hidden sm:inline">Đang lưu</span>
                         </div>
                     }
                     @case ('unsaved') {
                         <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200">
                             <div class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                             <span class="text-xs font-medium text-amber-700 hidden sm:inline">Chưa lưu</span>
                         </div>
                     }
                     @case ('error') {
                         <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 border border-red-200">
                             <svg class="w-3.5 h-3.5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                             <span class="text-xs font-medium text-red-600 hidden sm:inline">Lỗi lưu</span>
                         </div>
                     }
                     @default {
                         <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-slate-400">
                             <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                 <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                             </svg>
                             <span class="text-xs font-medium hidden sm:inline">Đã lưu</span>
                         </div>
                     }
                 }

                 <!-- Readiness Progress -->
                 <div class="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium cursor-help"
                      [class]="readinessPercent() === 100 ? 'text-green-600 bg-green-50' : 'text-slate-500 bg-slate-50'"
                      [title]="readinessTooltip()">
                     @if (readinessPercent() === 100) {
                         <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
                         <span class="hidden sm:inline">Sẵn sàng</span>
                     } @else {
                         <span>{{ readinessChecklist().score }}/{{ readinessChecklist().total }}</span>
                     }
                 </div>

                 <div class="w-px h-5 bg-slate-200"></div>

                 <button (click)="preview()"
                   class="h-8 px-3 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors">
                     Xem trước
                 </button>

                 <button (click)="publish()"
                   class="h-8 px-4 rounded-lg bg-[#0056D2] text-white text-xs font-semibold hover:bg-[#004BB5] transition-colors shadow-sm">
                    Xuất bản
                 </button>
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
    /** Sidebar collapsed state from parent */
    sidebarCollapsed = input(false);
    /** Current active tab from layout */
    activeTab = input<string>('info');
    toggleSidebar = output();

    store = inject(CourseEditorStore);
    private selectionService = inject(CurriculumSelectionService);
    private router = inject(Router);
    private service = inject(CourseAuthoringService);
    private authService = inject(AuthService);
    private toast = inject(ToastService);
    private confirmDialog = inject(ConfirmDialogService);

    tabLabel = computed(() => {
        switch (this.activeTab()) {
            case 'info': return 'Thông tin chung';
            case 'curriculum': return 'Nội dung';
            case 'settings': return 'Cài đặt khóa học';
            case 'classes': return 'Quản lý lớp học';
            default: return '';
        }
    });

    breadcrumbChapter = this.selectionService.selectedChapter;
    breadcrumbLesson = this.selectionService.selectedLesson;

    clearBreadcrumb() {
        this.selectionService.clearSelection();
    }

    selectChapter() {
        const ch = this.breadcrumbChapter();
        if (ch) {
            this.selectionService.selectChapter(ch);
        }
    }

    isAdminViewMode = computed(() => {
        const role = this.authService.userRole();
        return role === 'admin' || role === 'org_admin';
    });

    isInstructorLed = computed(() => this.store.courseTree()?.deliveryMode === 'INSTRUCTOR_LED');
    readinessChecklist = this.store.readinessChecklist;
    readinessPercent = this.store.readinessPercent;
    hasUnsavedChanges = computed(() => this.store.saveStatus() === 'unsaved');

    readinessTooltip = computed(() => {
        const cl = this.readinessChecklist();
        const missing = cl.items.filter(i => !i.done).map(i => i.label);
        return missing.length > 0
            ? 'Thiếu: ' + missing.join(', ')
            : 'Khóa học đã sẵn sàng xuất bản!';
    });

    /**
     * Role-based navigation: Admin -> /admin/courses, Teacher -> /teacher/courses
     */
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
            this.router.navigate(['/admin/courses']);
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

        // Readiness gate: block publish if critical items missing
        const checklist = this.readinessChecklist();
        if (!checklist.canPublish) {
            const missing = checklist.items.filter(i => i.critical && !i.done).map(i => i.label);
            this.toast.warning('Chưa đủ điều kiện xuất bản. Thiếu: ' + missing.join(', '));
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
