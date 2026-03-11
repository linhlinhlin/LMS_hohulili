import { Component, inject, signal, input, effect, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CourseInstructorService, CourseInstructor, InstructorPermissions, DEFAULT_PERMISSIONS } from '../../services/course-instructor.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-course-instructors',
  imports: [FormsModule, LucideAngularModule],
  template: `
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <!-- Header Area -->
      <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
        <div>
          <h3 class="text-lg font-black text-slate-900 tracking-tight">Giảng viên</h3>
          <p class="text-xs text-slate-500 font-medium mt-0.5">Quản lý đồng giảng viên của khóa học</p>
        </div>
        <button (click)="openInviteModal()"
                class="h-9 px-4 bg-[#0056D2] text-white rounded-xl font-bold text-xs hover:bg-[#004BB5] transition-all flex items-center gap-2 shadow-sm shadow-blue-100">
          <lucide-icon name="user-plus" [size]="16"></lucide-icon>
          Mời giảng viên
        </button>
      </div>

      <div class="p-6">


      @if (isLoading()) {
        <div class="py-12 flex flex-col items-center justify-center">
          <div class="w-10 h-10 border-4 border-slate-100 border-t-[#0056D2] rounded-full animate-spin"></div>
          <p class="mt-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Đang tải dữ liệu...</p>
        </div>
      } @else if (instructors().length > 0) {
        <div class="grid grid-cols-1 gap-3">
          @for (instructor of instructors(); track instructor.userId) {
            <div class="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50/50 hover:border-blue-200 hover:shadow-sm transition-all group">
              <div class="flex items-center gap-4">
                <!-- Avatar -->
                <div class="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-sm font-black shadow-sm"
                     [class]="instructor.role === 'OWNER' ? 'bg-[#0056D2]' : 'bg-purple-500'">
                  {{ getInitials(instructor.userName) }}
                </div>
                <!-- Info -->
                <div>
                  <div class="flex items-center gap-2 mb-0.5">
                    <span class="font-bold text-slate-900">{{ instructor.userName }}</span>
                    <span class="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-lg border shadow-sm"
                          [class]="instructorService.getRoleBadgeClass(instructor.role)">
                      {{ instructorService.getRoleLabel(instructor.role) }}
                    </span>
                    @if (instructor.status === 'PENDING' || instructor.status === 'INVITED') {
                      <span class="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-lg bg-orange-50 text-orange-600 border border-orange-100 shadow-sm">
                        Chờ xác nhận
                      </span>
                    }
                  </div>
                  <span class="text-xs text-slate-500 font-medium">{{ instructor.userEmail }}</span>
                </div>
              </div>
              
              <!-- Actions -->
              @if (instructor.role !== 'OWNER') {
                <div class="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                  <button (click)="openPermissionsModal(instructor)"
                          class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-[#0056D2] hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-lg transition-all"
                          title="Chỉnh sửa quyền">
                    <lucide-icon name="settings" [size]="16"></lucide-icon>
                  </button>
                  <button (click)="confirmRemove(instructor)"
                          class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition-all"
                          title="Xóa giảng viên">
                    <lucide-icon name="trash-2" [size]="16"></lucide-icon>
                  </button>
                </div>
              }
            </div>
          }
        </div>
      } @else {
        <!-- Empty State -->
        <div class="py-16 text-center">
          <div class="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300 shadow-inner">
            <lucide-icon name="users" [size]="40"></lucide-icon>
          </div>
          <h4 class="text-lg font-black text-slate-900 mb-1">Chưa có đồng giảng viên</h4>
          <p class="text-sm text-slate-500 mb-8 max-w-xs mx-auto font-medium">Mời giảng viên khác cùng quản lý và phát triển nội dung khóa học này.</p>
          <button (click)="openInviteModal()"
                  class="inline-flex items-center gap-2 h-10 px-6 bg-[#0056D2] text-white rounded-xl font-bold text-sm hover:bg-[#004BB5] transition-all shadow-md shadow-blue-100 uppercase tracking-widest">
            <lucide-icon name="user-plus" [size]="18"></lucide-icon>
            Mời giảng viên
          </button>
        </div>
      }
    </div>

    <!-- Invite Modal -->
    @if (showInviteModal()) {
      <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" (click)="closeInviteModal()">
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200" (click)="$event.stopPropagation()">
          <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 class="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <lucide-icon name="user-plus" [size]="16" class="text-[#0056D2]"></lucide-icon>
              Mời giảng viên
            </h3>
            <button (click)="closeInviteModal()" class="text-slate-400 hover:text-slate-600 transition-colors">
              <lucide-icon name="x" [size]="18"></lucide-icon>
            </button>
          </div>
          
          <div class="p-6 space-y-5">
            <div>
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email giảng viên</label>
              <input type="email" 
                     [(ngModel)]="inviteEmail"
                     class="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-4 focus:ring-[#0056D2]/5 focus:border-[#0056D2] outline-none transition-all placeholder:text-slate-400 shadow-inner"
                     placeholder="teacher@example.com">
            </div>

            <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Quyền hạn</label>
              <div class="space-y-2.5">
                <label class="flex items-center gap-3 cursor-pointer group">
                  <div class="relative flex items-center">
                    <input type="checkbox" [(ngModel)]="invitePermissions.canEditContent"
                           class="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-300 checked:bg-[#0056D2] checked:border-transparent transition-all">
                    <lucide-icon name="check" [size]="14" class="absolute left-0.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity"></lucide-icon>
                  </div>
                  <span class="text-sm text-slate-700 font-medium group-hover:text-slate-900 transition-colors">Chỉnh sửa nội dung khóa học</span>
                </label>
                <label class="flex items-center gap-3 cursor-pointer group">
                  <div class="relative flex items-center">
                    <input type="checkbox" [(ngModel)]="invitePermissions.canManageStudents"
                           class="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-300 checked:bg-[#0056D2] checked:border-transparent transition-all">
                    <lucide-icon name="check" [size]="14" class="absolute left-0.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity"></lucide-icon>
                  </div>
                  <span class="text-sm text-slate-700 font-medium group-hover:text-slate-900 transition-colors">Quản lý học viên</span>
                </label>
                <!-- Other permissions follow... -->
              </div>
            </div>

            <div>
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Lời nhắn (tùy chọn)</label>
              <textarea [(ngModel)]="inviteMessage"
                        rows="2"
                        class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-4 focus:ring-[#0056D2]/5 focus:border-[#0056D2] outline-none transition-all resize-none shadow-inner"
                        placeholder="Nhập lời nhắn mời cộng tác..."></textarea>
            </div>
          </div>

          <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
            <button (click)="closeInviteModal()"
                    class="flex-1 h-11 px-6 rounded-xl border border-slate-200 text-slate-600 font-black text-xs hover:bg-slate-100 transition-all uppercase tracking-widest">
              Hủy
            </button>
            <button (click)="sendInvitation()"
                    [disabled]="!isInviteFormValid()"
                    class="flex-1 h-11 px-6 bg-[#0056D2] text-white rounded-xl font-black text-xs hover:bg-[#004BB5] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-100 uppercase tracking-widest">
              Gửi lời mời
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Permissions Modal -->
    @if (showPermissionsModal()) {
      <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" (click)="closePermissionsModal()">
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200" (click)="$event.stopPropagation()">
          <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 class="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <lucide-icon name="settings" [size]="16" class="text-[#0056D2]"></lucide-icon>
              Chỉnh sửa quyền
            </h3>
            <button (click)="closePermissionsModal()" class="text-slate-400 hover:text-slate-600 transition-colors">
              <lucide-icon name="x" [size]="18"></lucide-icon>
            </button>
          </div>
          
          <div class="p-6 space-y-5">
            <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 mb-2">
              <div class="w-10 h-10 rounded-xl bg-[#0056D2] flex items-center justify-center text-white text-xs font-black">
                {{ getInitials(selectedInstructor()?.userName) }}
              </div>
              <div>
                <p class="text-sm font-black text-slate-900">{{ selectedInstructor()?.userName }}</p>
                <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{{ instructorService.getRoleLabel(selectedInstructor()?.role || '') }}</p>
              </div>
            </div>

            <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Quyền hạn truy cập</label>
              <div class="space-y-2.5">
                <label class="flex items-center gap-3 cursor-pointer group">
                  <div class="relative flex items-center">
                    <input type="checkbox" [(ngModel)]="editPermissions.canEditContent"
                           class="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-300 checked:bg-[#0056D2] checked:border-transparent transition-all">
                    <lucide-icon name="check" [size]="14" class="absolute left-0.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity"></lucide-icon>
                  </div>
                  <span class="text-sm text-slate-700 font-medium group-hover:text-slate-900 transition-colors">Chỉnh sửa nội dung khóa học</span>
                </label>
                <label class="flex items-center gap-3 cursor-pointer group">
                  <div class="relative flex items-center">
                    <input type="checkbox" [(ngModel)]="editPermissions.canManageStudents"
                           class="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-300 checked:bg-[#0056D2] checked:border-transparent transition-all">
                    <lucide-icon name="check" [size]="14" class="absolute left-0.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity"></lucide-icon>
                  </div>
                  <span class="text-sm text-slate-700 font-medium group-hover:text-slate-900 transition-colors">Quản lý học viên</span>
                </label>
                <label class="flex items-center gap-3 cursor-pointer group">
                  <div class="relative flex items-center">
                    <input type="checkbox" [(ngModel)]="editPermissions.canViewAnalytics"
                           class="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-300 checked:bg-[#0056D2] checked:border-transparent transition-all">
                    <lucide-icon name="check" [size]="14" class="absolute left-0.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity"></lucide-icon>
                  </div>
                  <span class="text-sm text-slate-700 font-medium group-hover:text-slate-900 transition-colors">Xem thống kê</span>
                </label>
                <label class="flex items-center gap-3 cursor-pointer group">
                  <div class="relative flex items-center">
                    <input type="checkbox" [(ngModel)]="editPermissions.canManageSettings"
                           class="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-300 checked:bg-[#0056D2] checked:border-transparent transition-all">
                    <lucide-icon name="check" [size]="14" class="absolute left-0.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity"></lucide-icon>
                  </div>
                  <span class="text-sm text-slate-700 font-medium group-hover:text-slate-900 transition-colors">Quản lý cài đặt</span>
                </label>
              </div>
            </div>
          </div>

          <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
            <button (click)="closePermissionsModal()"
                    class="flex-1 h-11 px-6 rounded-xl border border-slate-200 text-slate-600 font-black text-xs hover:bg-slate-100 transition-all uppercase tracking-widest">
              Hủy
            </button>
            <button (click)="savePermissions()"
                    class="flex-1 h-11 px-6 bg-[#0056D2] text-white rounded-xl font-black text-xs hover:bg-[#004BB5] transition-all shadow-md shadow-blue-100 uppercase tracking-widest">
              Lưu thay đổi
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class CourseInstructorsComponent {
  courseId = input.required<string>();

  protected instructorService = inject(CourseInstructorService);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);

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

  // Track loaded courseId to prevent duplicate loads
  private loadedCourseId: string | null = null;

  constructor() {
    // SOTA: Use effect() to react to courseId changes
    effect(() => {
      const id = this.courseId();
      if (id && id !== this.loadedCourseId) {
        this.loadedCourseId = id;
        this.loadInstructors(id);
      }
    });
  }

  private loadInstructors(courseId: string): void {
    this.instructorService.getInstructors(courseId).subscribe({
      error: () => {} // error handled by service's isLoading/error signals
    });
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

    this.instructorService.inviteInstructor(this.courseId(), {
      email: this.inviteEmail,
      permissions: this.invitePermissions,
      message: this.inviteMessage || undefined
    }).subscribe({
      next: (response: { message: string }) => {
        this.toast.success(response.message);
        this.closeInviteModal();
      },
      error: (error: any) => {
        this.toast.error('Lỗi: ' + (error.message || 'Không thể gửi lời mời'));
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

    this.instructorService.updatePermissions(this.courseId(), instructor.userId, this.editPermissions).subscribe({
      next: (response: { message: string }) => {
        this.toast.success(response.message);
        this.closePermissionsModal();
      },
      error: (error: any) => {
        this.toast.error('Lỗi: ' + (error.message || 'Không thể cập nhật quyền'));
      }
    });
  }

  // Remove Instructor
  async confirmRemove(instructor: CourseInstructor): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa giảng viên',
      message: `Bạn có chắc muốn xóa "${instructor.userName}" khỏi khóa học?`,
      variant: 'danger',
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    });
    if (!confirmed) return;

    this.instructorService.removeInstructor(this.courseId(), instructor.userId).subscribe({
      next: (response: { message: string }) => this.toast.success(response.message),
      error: (error: any) => this.toast.error('Lỗi: ' + (error.message || 'Không thể xóa giảng viên'))
    });
  }
}
