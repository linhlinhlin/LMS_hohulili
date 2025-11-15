import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TeacherService } from '../infrastructure/services/teacher.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-7xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900">{{ getGreeting() }}, {{ getUserFirstName() }}</h1>
          <p class="text-gray-600 mt-1">Chào mừng trở lại với Teacher Portal</p>
        </div>

        <!-- KPI Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div class="bg-white rounded shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600">Tổng khóa học</p>
                <p class="text-3xl font-bold text-blue-600 mt-2">{{ totalCourses() }}</p>
              </div>
              <div class="w-12 h-12 bg-blue-50 rounded flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600">Tổng học viên</p>
                <p class="text-3xl font-bold text-blue-600 mt-2">{{ totalStudents() }}</p>
              </div>
              <div class="w-12 h-12 bg-blue-50 rounded flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600">Bài tập chờ chấm</p>
                <p class="text-3xl font-bold text-blue-600 mt-2">{{ pendingCount() }}</p>
              </div>
              <div class="w-12 h-12 bg-blue-50 rounded flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2H9zm0 0a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600">Đánh giá TB</p>
                <p class="text-3xl font-bold text-blue-600 mt-2">{{ avgRating() }}</p>
              </div>
              <div class="w-12 h-12 bg-blue-50 rounded flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Content -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Courses List -->
          <div class="lg:col-span-2">
            <div class="bg-white rounded shadow p-6">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-bold text-gray-900">Khóa học của tôi</h2>
                <a routerLink="/teacher/courses" class="text-sm text-blue-600 hover:text-blue-700">Xem tất cả</a>
              </div>

              <!-- Empty -->
              <div *ngIf="courses().length === 0" class="text-center py-8">
                <svg class="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
                <p class="text-gray-600 mb-3">Chưa có khóa học nào</p>
                <a routerLink="/teacher/course-creation" class="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Tạo khóa học mới
                </a>
              </div>

              <!-- Courses -->
              <div class="space-y-3">
                <div *ngFor="let course of courses()" 
                     class="border border-gray-200 rounded p-4 hover:border-blue-300 hover:shadow transition-all cursor-pointer"
                     (click)="goToCourse(course.id)">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <h3 class="font-semibold text-gray-900">{{ course.title }}</h3>
                      <p class="text-sm text-gray-600 mt-1 line-clamp-2">{{ course.description }}</p>
                      <div class="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>{{ course.enrolledStudents || 0 }} học viên</span>
                        <span *ngIf="course.rating" class="flex items-center">
                          <svg class="w-4 h-4 text-blue-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                          </svg>
                          {{ course.rating }}
                        </span>
                      </div>
                    </div>
                    <span *ngIf="course.status" 
                          [class]="getStatusClass(course.status)"
                          class="px-2 py-1 rounded text-xs font-medium">
                      {{ getStatusText(course.status) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="space-y-4">
            <div class="bg-white rounded shadow p-6">
              <h3 class="text-lg font-bold text-gray-900 mb-4">Thao tác nhanh</h3>
              <div class="space-y-3">
                <a routerLink="/teacher/course-creation"
                   class="flex items-center gap-3 p-3 rounded border border-gray-200 hover:bg-blue-50 hover:border-blue-400 transition-colors">
                  <div class="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                    <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                  </div>
                  <div>
                    <div class="text-sm font-medium text-gray-900">Tạo khóa học</div>
                    <div class="text-xs text-gray-500">Bắt đầu khóa học mới</div>
                  </div>
                </a>

                <a routerLink="/teacher/assignments"
                   class="flex items-center gap-3 p-3 rounded border border-gray-200 hover:bg-blue-50 hover:border-blue-400 transition-colors">
                  <div class="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                    <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2H9zm0 0a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                    </svg>
                  </div>
                  <div>
                    <div class="text-sm font-medium text-gray-900">Quản lý bài tập</div>
                    <div class="text-xs text-gray-500">Xem và chấm bài</div>
                  </div>
                </a>

                <a routerLink="/teacher/students"
                   class="flex items-center gap-3 p-3 rounded border border-gray-200 hover:bg-blue-50 hover:border-blue-400 transition-colors">
                  <div class="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                    <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                    </svg>
                  </div>
                  <div>
                    <div class="text-sm font-medium text-gray-900">Xem học viên</div>
                    <div class="text-xs text-gray-500">Theo dõi tiến độ</div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class TeacherDashboardComponent implements OnInit {
  protected teacher = inject(TeacherService);
  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    this.teacher.loadMyCourses().catch(err => {
      console.error('Failed to load courses:', err);
    });
  }

  // Computed properties
  courses = computed(() => this.teacher.courses().slice(0, 5));
  totalCourses = computed(() => this.teacher.totalCourses());
  totalStudents = computed(() => this.teacher.totalStudents());
  
  pendingCount = computed(() => 
    this.teacher.assignments().filter(a => 
      a.status === 'pending' || a.status === 'submitted'
    ).length
  );

  avgRating = computed(() => {
    const courses = this.teacher.courses();
    if (courses.length === 0) return '0.0';
    const sum = courses.reduce((acc, c) => acc + (c.rating || 0), 0);
    return (sum / courses.length).toFixed(1);
  });

  // Helper methods
  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  }

  getUserFirstName(): string {
    const user = this.authService.currentUser();
    const fullName = user?.fullName || user?.name || 'Giáo viên';
    // If it's the default "Giáo viên", return only "Giáo"
    if (fullName === 'Giáo viên') return 'Giáo viên';
    // Otherwise, get the last word (first name in Vietnamese naming convention)
    return fullName.split(' ').pop() || fullName;
  }

  getStatusClass(status: string): string {
    const statusMap: Record<string, string> = {
      'active': 'bg-green-100 text-green-800',
      'draft': 'bg-gray-100 text-gray-800',
      'archived': 'bg-red-100 text-red-800',
      'APPROVED': 'bg-green-100 text-green-800',
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'DRAFT': 'bg-gray-100 text-gray-800'
    };
    return statusMap[status] || 'bg-gray-100 text-gray-800';
  }

  getStatusText(status: string): string {
    const textMap: Record<string, string> = {
      'active': 'Đang hoạt động',
      'draft': 'Nháp',
      'archived': 'Đã lưu trữ',
      'APPROVED': 'Đã xuất bản',
      'PENDING': 'Chờ duyệt',
      'DRAFT': 'Nháp'
    };
    return textMap[status] || status;
  }

  goToCourse(courseId: string): void {
    this.router.navigate(['/teacher/courses', courseId, 'edit']);
  }
}
