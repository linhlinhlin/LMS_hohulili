import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CourseEditorStore } from '../../store/course-editor.store';
import { CourseAuthoringService } from '../../services/course-authoring.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
    selector: 'app-course-editor-header',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
    <header class="h-16 flex items-center justify-between border-b border-[#dbe0e6] px-6 bg-white shadow-sm">
        <div class="flex items-center gap-4">
            <!-- Back Button -->
            <button (click)="goBack()" 
                    class="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                </svg>
                <span class="text-sm font-medium">Quay lại</span>
            </button>
            
            <!-- Course Title -->
            <div class="flex items-center gap-3 ml-4 pl-4 border-l border-gray-200">
                <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                    </svg>
                </div>
                <div>
                    <h1 class="text-base font-semibold text-gray-900 truncate max-w-md">
                        {{ store.courseInfo()?.title || 'Đang tải...' }}
                    </h1>
                    <p class="text-xs text-gray-500">Chỉnh sửa khóa học</p>
                </div>
            </div>
        </div>

        <div class="flex items-center gap-3">
             <!-- Save Status -->
             @if (store.isSaving()) {
                <div class="text-xs text-blue-600 font-medium flex items-center gap-1 mr-4">
                    <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Đang lưu...</span>
                </div>
             } @else {
                <div class="text-xs text-green-600 font-medium flex items-center gap-1 mr-4">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                    </svg>
                    <span>Đã lưu</span>
                </div>
             }

             <button class="h-9 px-4 rounded-lg bg-white border border-gray-300 font-medium text-gray-700 text-sm hover:bg-gray-50 transition-colors">
                 Xem trước
             </button>

             <button class="h-9 px-4 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                (click)="publish()">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Xuất bản
             </button>
        </div>
    </header>
  `
})
export class CourseEditorHeaderComponent {
    store = inject(CourseEditorStore);
    private router = inject(Router);
    private service = inject(CourseAuthoringService);
    private toast = inject(MatSnackBar);

    goBack() {
        this.router.navigate(['/teacher/courses']);
    }

    publish() {
        const id = this.store.courseTree()?.id;
        if (!id) return;

        if (confirm('Bạn có chắc chắn muốn xuất bản khóa học này?\n\nKhóa học sẽ được gửi để phê duyệt.')) {
            this.service.publishCourse(id).subscribe({
                next: () => {
                    this.toast.open('Đã gửi khóa học để phê duyệt!', 'Đóng', { duration: 3000 });
                    this.router.navigate(['/teacher/courses']);
                },
                error: (err: any) => this.toast.open('Xuất bản thất bại: ' + (err?.message || 'Lỗi không xác định'), 'Đóng', { duration: 3000 })
            });
        }
    }
}
