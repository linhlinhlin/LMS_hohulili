import { Component, inject, OnInit, OnChanges, SimpleChanges, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CourseInstructorService, CourseInstructor, InstructorPermissions, DEFAULT_PERMISSIONS } from '../../services/course-instructor.service';

@Component({
  selector: 'app-course-instructors',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">Giảng viên</h3>
          <p class="text-sm text-gray-600 mt-1">Quản lý đồng giảng viên của khóa học</p>
        </div>
        <button (click)="openInviteModal()"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          Mời giảng viên
        </button>
      </div>

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="py-8 text-center">
          <div class="inline-block w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p class="mt-2 text-sm text-gray-600">Đang tải...</p>
        </div>
      } @else if (instructors().length > 0) {
        <!-- Instructors List -->
        <div class="space-y-3">
          @for (instructor of instructors(); track instructor.userId) {
            <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div class="flex items-center gap-3">
                <!-- Avatar -->
                <div class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium"
                     [class]="instructor.role === 'OWNER' ? 'bg-blue-500' : 'bg-purple-500'">
                  {{ getInitials(instructor.userName) }}
                </div>
                <!-- Info -->
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-gray-900">{{ instructor.userName }}</span>
                    <span class="px-2 py-0.5 text-xs font-medium rounded-full"
                          [class]="instructorService.getRoleBadgeClass(instructor.role)">
                      {{ instructorService.getRoleLabel(instructor.role) }}
                    </span>
                    @if (instructor.status === 'PENDING' || instructor.status === 'INVITED') {
                      <span class="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                        Chờ xác nhận
                      </span>
                    }
                  </div>
                  <span class="text-sm text-gray-600">{{ instructor.userEmail }}</span>
                </div>
              </div>
              
              <!-- Actions -->
              @if (instructor.role !== 'OWNER') {
                <div class="flex items-center gap-2">
                  <button (click)="openPermissionsModal(instructor)"
                          class="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Chỉnh sửa quyền">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                  </button>
                  <button (click)="confirmRemove(instructor)"
                          class="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Xóa giảng viên">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  </button>
                </div>
              }
            </div>
          }
        </div>
      } @else {
        <!-- Empty State -->
        <div class="py-8 text-center">
          <svg class="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
          <p class="text-gray-600 mb-2">Chưa có đồng giảng viên</p>
          <p class="text-sm text-gray-500">Mời giảng viên khác cùng quản lý khóa học</p>
        </div>
      }
    </div>

    <!-- Invite Modal -->
    @if (showInviteModal()) {
      <div class="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50" (click)="closeInviteModal()">
        <div class="flex items-center justify-center min-h-screen p-4">
          <div class="bg-white rounded-xl shadow-xl max-w-md w-full p-6" (click)="$event.stopPropagation()">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Mời giảng viên</h3>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Email giảng viên</label>
                <input type="email" 
                       [(ngModel)]="inviteEmail"
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                       placeholder="teacher@example.com">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Quyền hạn</label>
                <div class="space-y-2">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" [(ngModel)]="invitePermissions.canEditContent"
                           class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500">
                    <span class="text-sm text-gray-700">Chỉnh sửa nội dung khóa học</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" [(ngModel)]="invitePermissions.canManageStudents"
                           class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500">
                    <span class="text-sm text-gray-700">Quản lý học viên</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" [(ngModel)]="invitePermissions.canViewAnalytics"
                           class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500">
                    <span class="text-sm text-gray-700">Xem thống kê</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" [(ngModel)]="invitePermissions.canManageSettings"
                           class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500">
                    <span class="text-sm text-gray-700">Quản lý cài đặt</span>
                  </label>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Lời nhắn (tùy chọn)</label>
                <textarea [(ngModel)]="inviteMessage"
                          rows="2"
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Nhập lời nhắn..."></textarea>
              </div>
            </div>

            <div class="mt-6 flex gap-3">
              <button (click)="closeInviteModal()"
                      class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                Hủy
              </button>
              <button (click)="sendInvitation()"
                      [disabled]="!isInviteFormValid()"
                      class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
                Gửi lời mời
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Permissions Modal -->
    @if (showPermissionsModal()) {
      <div class="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50" (click)="closePermissionsModal()">
        <div class="flex items-center justify-center min-h-screen p-4">
          <div class="bg-white rounded-xl shadow-xl max-w-md w-full p-6" (click)="$event.stopPropagation()">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Chỉnh sửa quyền</h3>
            <p class="text-sm text-gray-600 mb-4">{{ selectedInstructor()?.userName }}</p>
            
            <div class="space-y-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" [(ngModel)]="editPermissions.canEditContent"
                       class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500">
                <span class="text-sm text-gray-700">Chỉnh sửa nội dung khóa học</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" [(ngModel)]="editPermissions.canManageStudents"
                       class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500">
                <span class="text-sm text-gray-700">Quản lý học viên</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" [(ngModel)]="editPermissions.canViewAnalytics"
                       class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500">
                <span class="text-sm text-gray-700">Xem thống kê</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" [(ngModel)]="editPermissions.canManageSettings"
                       class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500">
                <span class="text-sm text-gray-700">Quản lý cài đặt</span>
              </label>
            </div>

            <div class="mt-6 flex gap-3">
              <button (click)="closePermissionsModal()"
                      class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                Hủy
              </button>
              <button (click)="savePermissions()"
                      class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Lưu
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class CourseInstructorsComponent implements OnChanges {
  @Input() courseId!: string;

  protected instructorService = inject(CourseInstructorService);

  // Signals from service
  instructors = this.instructorService.instructors;
  isLoading = this.instructorService.isLoading;

  // Modal states
  showInviteModal = signal(false);
  showPermissionsModal = signal(false);
  selectedInstructor = signal<CourseInstructor | null>(null);

  // Invite form
  inviteEmail = '';
  inviteMessage = '';
  invitePermissions: InstructorPermissions = { ...DEFAULT_PERMISSIONS };

  // Edit permissions form
  editPermissions: InstructorPermissions = { ...DEFAULT_PERMISSIONS };

  // SOTA Fix: Use ngOnChanges to detect when @Input courseId becomes available
  private loadedCourseId: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    // Only load if courseId has changed and has a value
    if (changes['courseId'] && this.courseId && this.courseId !== this.loadedCourseId) {
      console.log('[CourseInstructors] 📋 Loading instructors for course:', this.courseId);
      this.loadedCourseId = this.courseId;
      this.loadInstructors();
    }
  }

  private loadInstructors(): void {
    this.instructorService.getInstructors(this.courseId).subscribe();
  }

  getInitials(name: string | undefined): string {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  // Invite Modal
  openInviteModal(): void {
    this.inviteEmail = '';
    this.inviteMessage = '';
    this.invitePermissions = { ...DEFAULT_PERMISSIONS };
    this.showInviteModal.set(true);
  }

  closeInviteModal(): void {
    this.showInviteModal.set(false);
  }

  isInviteFormValid(): boolean {
    return this.inviteEmail.trim().length > 0 && this.inviteEmail.includes('@');
  }

  sendInvitation(): void {
    if (!this.isInviteFormValid()) return;

    this.instructorService.inviteInstructor(this.courseId, {
      email: this.inviteEmail,
      permissions: this.invitePermissions,
      message: this.inviteMessage || undefined
    }).subscribe({
      next: (response) => {
        alert(response.message);
        this.closeInviteModal();
      },
      error: (error) => {
        alert('Lỗi: ' + (error.message || 'Không thể gửi lời mời'));
      }
    });
  }

  // Permissions Modal
  openPermissionsModal(instructor: CourseInstructor): void {
    this.selectedInstructor.set(instructor);
    // Map backend fields to frontend permissions format
    this.editPermissions = {
      canEditContent: instructor.canManage ?? false,
      canManageStudents: instructor.canGradeAssignments ?? false,
      canViewAnalytics: instructor.canViewPerformance ?? false,
      canManageSettings: false
    };
    this.showPermissionsModal.set(true);
  }

  closePermissionsModal(): void {
    this.showPermissionsModal.set(false);
    this.selectedInstructor.set(null);
  }

  savePermissions(): void {
    const instructor = this.selectedInstructor();
    if (!instructor) return;

    this.instructorService.updatePermissions(this.courseId, instructor.userId, this.editPermissions).subscribe({
      next: (response) => {
        alert(response.message);
        this.closePermissionsModal();
      },
      error: (error) => {
        alert('Lỗi: ' + (error.message || 'Không thể cập nhật quyền'));
      }
    });
  }

  // Remove Instructor
  confirmRemove(instructor: CourseInstructor): void {
    if (confirm(`Bạn có chắc muốn xóa "${instructor.userName}" khỏi khóa học?`)) {
      this.instructorService.removeInstructor(this.courseId, instructor.userId).subscribe({
        next: (response) => alert(response.message),
        error: (error) => alert('Lỗi: ' + (error.message || 'Không thể xóa giảng viên'))
      });
    }
  }
}
