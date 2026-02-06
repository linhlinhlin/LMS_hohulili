import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';

import { RouterModule } from '@angular/router';
import { CourseInstructorService, InvitationItem } from '../course-editor/services/course-instructor.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-my-invitations',
  imports: [RouterModule],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">Lời mời tham gia khóa học</h1>
          <p class="text-gray-600 mt-1">Xem và quản lý các lời mời làm đồng giảng viên</p>
        </div>

        <!-- Content -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200">
          @if (isLoading()) {
            <div class="p-12 text-center">
              <div class="inline-block w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
              <p class="mt-4 text-sm text-gray-600">Đang tải...</p>
            </div>
          } @else if (invitations().length > 0) {
            <div class="divide-y divide-gray-200">
              @for (invitation of invitations(); track invitation.id) {
                <div class="p-6 hover:bg-gray-50 transition-colors">
                  <div class="flex items-start gap-4">
                    <!-- Course Thumbnail -->
                    <div class="w-20 h-14 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      @if (invitation.courseThumbnail) {
                        <img [src]="invitation.courseThumbnail" [alt]="invitation.courseName" 
                             class="w-full h-full object-cover">
                      } @else {
                        <div class="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                          </svg>
                        </div>
                      }
                    </div>
                    
                    <!-- Info -->
                    <div class="flex-1 min-w-0">
                      <h3 class="text-lg font-semibold text-gray-900 truncate">{{ invitation.courseName }}</h3>
                      <p class="text-sm text-gray-600 mt-1">
                        Được mời bởi <span class="font-medium">{{ invitation.invitedByName }}</span>
                      </p>
                      <p class="text-xs text-gray-500 mt-1">
                        {{ instructorService.formatDate(invitation.invitedAt) }}
                      </p>
                      
                      <!-- Permissions Preview -->
                      <div class="flex flex-wrap gap-2 mt-2">
                        @if (invitation.permissions.canEditContent) {
                          <span class="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded">Chỉnh sửa nội dung</span>
                        }
                        @if (invitation.permissions.canManageStudents) {
                          <span class="px-2 py-0.5 text-xs bg-green-50 text-green-700 rounded">Quản lý học viên</span>
                        }
                        @if (invitation.permissions.canViewAnalytics) {
                          <span class="px-2 py-0.5 text-xs bg-purple-50 text-purple-700 rounded">Xem thống kê</span>
                        }
                      </div>
                    </div>
                    
                    <!-- Actions -->
                    <div class="flex items-center gap-2 flex-shrink-0">
                      <button (click)="declineInvitation(invitation)"
                              class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                        Từ chối
                      </button>
                      <button (click)="acceptInvitation(invitation)"
                              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                        Chấp nhận
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>
          } @else {
            <!-- Empty State -->
            <div class="p-12 text-center">
              <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
              </svg>
              <h3 class="text-lg font-medium text-gray-900 mb-2">Không có lời mời</h3>
              <p class="text-sm text-gray-600 mb-4">Khi được mời làm đồng giảng viên, lời mời sẽ hiển thị ở đây</p>
              <a routerLink="/teacher/dashboard" 
                 class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Về Dashboard
              </a>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class MyInvitationsComponent implements OnInit {
  protected instructorService = inject(CourseInstructorService);

  // Signals from service
  invitations = this.instructorService.myInvitations;
  isLoading = this.instructorService.isLoading;

  ngOnInit(): void {
    this.loadInvitations();
  }

  private loadInvitations(): void {
    this.instructorService.getMyInvitations().subscribe();
  }

  acceptInvitation(invitation: InvitationItem): void {
    this.instructorService.acceptInvitation(invitation.id).subscribe({
      next: (response) => {
        alert(response.message);
      },
      error: (error) => {
        alert('Lỗi: ' + (error.message || 'Không thể chấp nhận lời mời'));
      }
    });
  }

  declineInvitation(invitation: InvitationItem): void {
    if (confirm('Bạn có chắc muốn từ chối lời mời này?')) {
      this.instructorService.declineInvitation(invitation.id).subscribe({
        next: (response) => {
          alert(response.message);
        },
        error: (error) => {
          alert('Lỗi: ' + (error.message || 'Không thể từ chối lời mời'));
        }
      });
    }
  }
}
