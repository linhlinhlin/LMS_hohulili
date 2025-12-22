import { Component, inject, signal, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CourseApi, EnrolledStudent } from '../../../../../api/client/course.api';
import { CourseEditorStore } from '../../store/course-editor.store';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-course-assignment',
    standalone: true,
    imports: [CommonModule, FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush, // Performance: Only check when inputs/signals change
    template: `
    <div class="bg-white shadow-sm max-w-10xl mx-auto pb-10 min-h-screen">
      
      <!-- Header -->
      <div class="bg-white shadow-sm border border-gray-200 h-full flex pb-4 justify-between items-end px-8 py-4 sticky top-0 z-10">
        <div>
            <h1 class="text-2xl font-bold text-gray-900">Học viên & Lớp học</h1>
            <p class="text-gray-500 mt-1">Quản lý danh sách học viên và lớp học được gán vào khóa học.</p>
        </div>
        <div class="flex gap-3">
             <button (click)="openAddStudentModal()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors shadow-sm">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                <span>Thêm học viên</span>
            </button>
        </div>
      </div>

      <div class="p-8 space-y-8">
        
        <!-- Students Section -->
        <section class="animate-fade-in">
            <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span class="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                </span>
                Danh sách học viên ({{ enrolledStudents().length }})
            </h2>

            @if (enrolledStudents().length === 0) {
                <div class="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-12 text-center">
                    <div class="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                    </div>
                    <h3 class="text-lg font-medium text-gray-900 mb-1">Chưa có học viên</h3>
                    <p class="text-gray-500 mb-6">Chưa có học viên nào được gán vào khóa học này.</p>
                    <button (click)="openAddStudentModal()" class="px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors font-medium">
                        Thêm học viên ngay
                    </button>
                </div>
            } @else {
                <div class="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-sm text-gray-500">
                            <thead class="bg-gray-50 text-xs uppercase text-gray-700 font-semibold">
                                <tr>
                                    <th class="px-6 py-4">Họ và tên</th>
                                    <th class="px-6 py-4">Email</th>
                                    <th class="px-6 py-4">Ngày tham gia</th>
                                    <th class="px-6 py-4">Tiến độ</th>
                                    <th class="px-6 py-4 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200">
                                @for (student of enrolledStudents(); track student.id) {
                                    <tr class="hover:bg-gray-50 transition-colors">
                                        <td class="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                                            <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs uppercase">
                                                {{ student.fullName.charAt(0) }}
                                            </div>
                                            {{ student.fullName }}
                                        </td>
                                        <td class="px-6 py-4">{{ student.email }}</td>
                                        <td class="px-6 py-4">{{ student.enrolledAt | date:'dd/MM/yyyy' }}</td>
                                        <td class="px-6 py-4">
                                            <div class="flex items-center gap-2">
                                                <div class="w-full bg-gray-200 rounded-full h-1.5 max-w-[100px]">
                                                    <div class="bg-green-500 h-1.5 rounded-full" [style.width.%]="student.progressPercentage || 0"></div>
                                                </div>
                                                <span class="text-xs text-gray-500">{{ student.progressPercentage || 0 }}%</span>
                                            </div>
                                        </td>
                                        <td class="px-6 py-4 text-right">
                                            <button class="text-red-600 hover:text-red-800 font-medium text-xs hover:underline">Xóa</button>
                                        </td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
            }
        </section>

        <!-- Classes Section (Placeholder for future) -->
        <section class="opacity-75">
            <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span class="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                </span>
                Danh sách lớp học (Sắp ra mắt)
            </h2>
             <div class="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center">
                <p class="text-gray-500">Chưa có lớp học nào được gán vào khóa học này.</p>
            </div>
        </section>

      </div>
    </div>

    <!-- Add Student Modal -->
    @if (showAddModal()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm" (click)="closeModal()">
            <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden transform transition-all" (click)="$event.stopPropagation()">
                
                <!-- Modal Header -->
                <div class="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 class="text-lg font-bold text-gray-900">Thêm học viên</h3>
                    <button (click)="closeModal()" class="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <!-- Tabs -->
                <div class="flex border-b border-gray-100">
                    <button (click)="activeTab.set('SINGLE')" 
                            class="flex-1 py-3 text-sm font-medium transition-colors relative"
                            [class.text-blue-600]="activeTab() === 'SINGLE'"
                            [class.text-gray-500]="activeTab() !== 'SINGLE'">
                        Thêm thủ công
                        @if (activeTab() === 'SINGLE') { <div class="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div> }
                    </button>
                    <button (click)="activeTab.set('BULK')" 
                            class="flex-1 py-3 text-sm font-medium transition-colors relative"
                            [class.text-blue-600]="activeTab() === 'BULK'"
                            [class.text-gray-500]="activeTab() !== 'BULK'">
                        Upload Excel
                        @if (activeTab() === 'BULK') { <div class="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div> }
                    </button>
                </div>

                <div class="p-6">
                    @if (activeTab() === 'SINGLE') {
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Email học viên <span class="text-red-500">*</span></label>
                                <input type="email" [(ngModel)]="singleEmail" 
                                       class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                       placeholder="example@student.com"
                                       (keyup.enter)="addSingleStudent()">
                                <p class="text-xs text-gray-500 mt-1">Học viên phải có tài khoản trong hệ thống.</p>
                            </div>
                        </div>
                    } @else {
                        <div class="space-y-4 text-center">
                            <div class="border-2 border-dashed border-gray-300 rounded-xl p-8 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative"
                                 (click)="fileInput.click()"
                                 (dragover)="$event.preventDefault()"
                                 (drop)="onFileDropped($event)">
                                <input #fileInput type="file" (change)="onFileSelected($event)" class="hidden" accept=".xlsx, .xls">
                                
                                <div class="flex flex-col items-center gap-2">
                                    <div class="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                    </div>
                                    @if(selectedFile) {
                                        <p class="font-medium text-gray-900">{{ selectedFile.name }}</p>
                                        <p class="text-sm text-gray-500">{{ (selectedFile.size / 1024).toFixed(1) }} KB</p>
                                    } @else {
                                        <p class="font-medium text-gray-900">Click để upload file Excel</p>
                                        <p class="text-xs text-gray-500">hoặc kéo thả file vào đây</p>
                                    }
                                </div>
                            </div>
                            <div class="text-left text-xs text-gray-500">
                                <p>Định dạng hỗ trợ: .xlsx, .xls.</p>
                                <p>Cấu trúc file: Cột A chứa danh sách Email.</p>
                            </div>
                        </div>
                    }
                    
                    <!-- Error/Success Messages -->
                    @if (modalMessage()) {
                        <div class="mt-4 p-3 rounded-lg text-sm flex items-start gap-2"
                             [class.bg-green-50]="modalMessageType() === 'SUCCESS'"
                             [class.text-green-700]="modalMessageType() === 'SUCCESS'"
                             [class.bg-red-50]="modalMessageType() === 'ERROR'"
                             [class.text-red-700]="modalMessageType() === 'ERROR'">
                            @if (modalMessageType() === 'SUCCESS') {
                                <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                            } @else {
                                <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            }
                            <span>{{ modalMessage() }}</span>
                        </div>
                    }
                </div>

                <div class="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                    <button (click)="closeModal()" class="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium">
                        Hủy
                    </button>
                    <button (click)="activeTab() === 'SINGLE' ? addSingleStudent() : addBulkStudents()"
                            [disabled]="isSubmitting() || (activeTab() === 'SINGLE' && !singleEmail) || (activeTab() === 'BULK' && !selectedFile)"
                            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm disabled:opacity-50 flex items-center gap-2">
                        @if (isSubmitting()) {
                            <svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        }
                        {{ activeTab() === 'SINGLE' ? 'Thêm học viên' : 'Upload danh sách' }}
                    </button>
                </div>
            </div>
        </div>
    }
  `
})
export class CourseAssignmentComponent {
    courseApi = inject(CourseApi);
    store = inject(CourseEditorStore); // Get courseId from store


    // Signals
    enrolledStudents = signal<EnrolledStudent[]>([]);

    // Modal State
    showAddModal = signal(false);
    activeTab = signal<'SINGLE' | 'BULK'>('SINGLE');
    isSubmitting = signal(false);
    modalMessage = signal<string | null>(null);
    modalMessageType = signal<'SUCCESS' | 'ERROR'>('SUCCESS');

    // Form Data
    singleEmail = '';
    selectedFile: File | null = null;

    constructor() {
        // Auto-load students when course is ready (using cache for speed)
        effect(() => {
            const course = this.store.courseTree();
            if (course?.id) {
                this.loadStudents();
            }
        });
    }

    loadStudents() {
        const course = this.store.courseTree();
        if (!course?.id) return;

        this.courseApi.getEnrolledStudents(course.id).subscribe({
            next: (res) => {
                this.enrolledStudents.set(res.data);
            },
            error: (err) => {
                console.error(err);
            }
        });
    }

    openAddStudentModal() {
        this.resetForm();
        this.loadStudents(); // Load fresh data when user opens modal
        this.showAddModal.set(true);
    }

    closeModal() {
        this.showAddModal.set(false);
    }

    resetForm() {
        this.singleEmail = '';
        this.selectedFile = null;
        this.modalMessage.set(null);
        this.activeTab.set('SINGLE');
    }

    // --- Single Student ---
    addSingleStudent() {
        if (!this.singleEmail) return;
        const courseId = this.store.courseTree()?.id;
        if (!courseId) return;

        this.isSubmitting.set(true);
        this.modalMessage.set(null);

        this.courseApi.enrollStudentAsTeacher(courseId, { email: this.singleEmail }).subscribe({
            next: () => {
                this.modalMessageType.set('SUCCESS');
                this.modalMessage.set('Đã thêm học viên thành công!');
                this.isSubmitting.set(false);
                this.singleEmail = ''; // Clear input
                this.loadStudents(); // Refresh list

                // Close modal after short delay? No, let user add more or close manually
            },
            error: (err) => {
                this.modalMessageType.set('ERROR');
                this.modalMessage.set(err.message || 'Có lỗi xảy ra khi thêm học viên');
                this.isSubmitting.set(false);
            }
        });
    }

    // --- Bulk Student ---
    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            this.selectedFile = file;
            this.modalMessage.set(null);
        }
    }

    onFileDropped(event: DragEvent) {
        event.preventDefault();
        if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
            this.selectedFile = event.dataTransfer.files[0];
            this.modalMessage.set(null);
        }
    }

    addBulkStudents() {
        if (!this.selectedFile) return;
        const courseId = this.store.courseTree()?.id;
        if (!courseId) return;

        this.isSubmitting.set(true);
        this.modalMessage.set(null);

        this.courseApi.bulkEnrollStudents(courseId, this.selectedFile).subscribe({
            next: (res) => {
                this.modalMessageType.set('SUCCESS');
                const successCount = res.data?.successCount || 0;
                const errorCount = res.data?.errorCount || 0;
                this.modalMessage.set(`Upload thành công! Đã thêm ${successCount} học viên. (Lỗi: ${errorCount})`);
                this.isSubmitting.set(false);
                this.selectedFile = null;
                this.loadStudents();
            },
            error: (err) => {
                this.modalMessageType.set('ERROR');
                this.modalMessage.set(err.message || 'Lỗi xử lý file Excel');
                this.isSubmitting.set(false);
            }
        });
    }
}

