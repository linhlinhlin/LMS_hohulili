import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { StudentApi, StudentSummary } from '../../../api/client/student.api';
import { CourseApi } from '../../../api/client/course.api';
import { CourseSummary } from '../../../api/types/course.types';

@Component({
  selector: 'app-student-management',
  imports: [RouterModule, FormsModule, CommonModule, NgOptimizedImage],
  template: `
    <div class="min-h-screen bg-slate-50 p-6 space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          @if (selectedCourse()) {
            <button (click)="backToCourses()" class="flex items-center text-[#0056D2] hover:text-[#004BB5] mb-2">
              <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
              Quay lại danh sách khóa học
            </button>
          }
          <h1 class="text-2xl font-bold text-gray-900">
            {{ selectedCourse() ? 'Học viên khóa học' : 'Quản lý học viên' }}
          </h1>
          <p class="text-gray-600 mt-1">
            {{ selectedCourse() ? selectedCourse()!.title : 'Theo dõi tiến độ và thành tích của học viên theo từng khóa học' }}
          </p>
        </div>
      </div>

      @if (!selectedCourse()) {
        <!-- VIEW 1: Teacher's Courses List (horizontal like dashboard) -->
        @if (loading()) {
          <div class="flex flex-col gap-3">
            @for (i of [1, 2, 3]; track i) {
              <div class="bg-white rounded-lg border border-gray-200 p-3 flex gap-4 animate-pulse">
                <div class="w-40 h-24 bg-gray-200 rounded-md"></div>
                <div class="flex-1 space-y-2">
                  <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div class="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            }
          </div>
        }

        @if (error() && !loading()) {
          <div class="bg-white rounded-xl shadow p-8 text-center">
            <p class="text-red-600">{{ error() }}</p>
            <button (click)="onReload()" class="mt-4 px-4 py-2 bg-[#0056D2] text-white rounded-lg">Thử lại</button>
          </div>
        }

        @if (!loading() && !error() && courses().length === 0) {
          <div class="bg-white rounded-xl shadow p-8 text-center">
            <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
            </svg>
            <p class="text-gray-500 text-lg">Bạn chưa có khóa học nào</p>
            <p class="text-gray-400 text-sm mt-2">Tạo khóa học để quản lý học viên</p>
          </div>
        }

        @if (!loading() && !error() && courses().length > 0) {
          <!-- Course List (horizontal like teacher dashboard) -->
          <div class="flex flex-col gap-3">
            @for (course of courses(); track course.id) {
              <div class="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer" 
                   (click)="viewCourseStudents(course)">
                <div class="flex gap-4 p-2 items-center">
                  <!-- Thumbnail -->
                  <div class="w-40 h-24 flex-shrink-0 rounded-md overflow-hidden bg-gray-100 shadow">
                    @if (course.thumbnailUrl) {
                      <img [ngSrc]="course.thumbnailUrl" 
                           width="160" height="90"
                           [alt]="course.title" 
                           class="w-full h-full object-cover"
                           (error)="onThumbError($event)">
                    } @else {
                      <div class="w-full h-full flex items-center justify-center bg-blue-50 text-blue-300">
                        <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/>
                        </svg>
                      </div>
                    }
                  </div>

                  <!-- Course Info -->
                  <div class="flex-1 min-w-0">
                    <h3 class="text-[15px] font-semibold text-gray-900 mb-1 truncate hover:text-[#0056D2] transition-colors">
                      {{ course.title }}
                    </h3>
                    <div class="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                      @if (course.code) {
                        <span class="font-mono">{{ course.code }}</span>
                        <span class="text-gray-300">·</span>
                      }
                      <span>{{ course.enrolledCount || 0 }} học viên</span>
                      @if (course.lessonCount) {
                        <span class="text-gray-300">·</span>
                        <span>{{ course.lessonCount }} bài học</span>
                      }
                    </div>
                    <div class="flex items-center gap-2 mt-1">
                      <span class="text-xs font-medium px-2 py-0.5 rounded-full"
                            [class.bg-green-100]="course.status === 'PUBLISHED' || course.status === 'APPROVED'"
                            [class.text-green-700]="course.status === 'PUBLISHED' || course.status === 'APPROVED'"
                            [class.bg-yellow-100]="course.status === 'PENDING'"
                            [class.text-yellow-700]="course.status === 'PENDING'"
                            [class.bg-gray-100]="course.status === 'DRAFT'"
                            [class.text-gray-600]="course.status === 'DRAFT'">
                        {{ getStatusLabel(course.status) }}
                      </span>
                    </div>
                  </div>

                  <!-- Action -->
                  <div class="flex-shrink-0 flex flex-col items-end gap-2 min-w-[90px]">
                    <span class="text-xs text-gray-400">{{ formatDate(course.updatedAt || course.createdAt) }}</span>
                    <button class="px-3 py-1.5 border border-gray-300 rounded text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors"
                            (click)="viewCourseStudents(course); $event.stopPropagation()">
                      Xem học viên
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      } @else {
        <!-- VIEW 2: Students in selected course -->
        <div class="bg-white rounded-xl shadow">
          <!-- Filters -->
          <div class="p-4 flex flex-wrap gap-3 items-center">
            <input class="border rounded-lg px-3 py-2 w-64" placeholder="Tìm theo tên/email" [(ngModel)]="keyword" />
            <select class="border rounded-lg px-3 py-2" [(ngModel)]="status" (ngModelChange)="onStatusChange()">
              <option value="">Tất cả trạng thái</option>
              <option value="active">Đang học</option>
              <option value="inactive">Không hoạt động</option>
              <option value="suspended">Tạm khóa</option>
            </select>
            <button class="px-4 py-2 border rounded-lg text-sm" (click)="applyFilters()">Lọc</button>
          </div>
      
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tên</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tiến độ</th>
                  <th class="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Điểm</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                  <th class="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
      
                @if (loading()) {
                  <tr>
                    <td colspan="6" class="px-6 py-12 text-center text-gray-600">
                      <div class="flex items-center justify-center gap-2">
                        <svg class="animate-spin h-5 w-5 text-[#0056D2]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Đang tải danh sách học viên...</span>
                      </div>
                    </td>
                  </tr>
                }
      
                @if (!loading() && error()) {
                  <tr>
                    <td colspan="6" class="px-6 py-12 text-center text-red-600">
                      {{ error() }}
                      <button (click)="onReload()" class="ml-2 text-[#0056D2] underline text-sm">Tải lại</button>
                    </td>
                  </tr>
                }
      
                @if (!loading() && !error() && paged().length === 0) {
                  <tr>
                    <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                      Không tìm thấy học viên nào.
                    </td>
                  </tr>
                }
      
                @for (s of paged(); track trackById($index, s)) {
                  <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{{ s.name }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{{ s.email }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div class="flex items-center">
                        <div class="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div class="bg-[#0056D2] h-2 rounded-full" [style.width.%]="s.progress"></div>
                        </div>
                        <span>{{ s.progress }}%</span>
                      </div>
                    </td>
                    <td class="px-6 py-5 whitespace-nowrap text-sm text-gray-600 text-center">
                      <span [class.text-green-600]="s.averageGrade >= 8"
                        [class.text-yellow-600]="s.averageGrade >= 6 && s.averageGrade < 8"
                        [class.text-red-600]="s.averageGrade < 6">
                        {{ s.averageGrade.toFixed(1) }}
                      </span>
                    </td>
                    <td class="px-6 py-5 whitespace-nowrap text-base md:text-lg">
                      <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                        [class.bg-green-100]="s.status === 'active'"
                        [class.text-green-800]="s.status === 'active'"
                        [class.bg-gray-100]="s.status === 'inactive'"
                        [class.text-gray-800]="s.status === 'inactive'"
                        [class.bg-red-100]="s.status === 'suspended'"
                        [class.text-red-800]="s.status === 'suspended'">
                        {{ s.status === 'active' ? 'Đang học' : s.status === 'inactive' ? 'Không hoạt động' : 'Tạm khóa' }}
                      </span>
                    </td>
                    <td class="px-6 py-5 whitespace-nowrap text-right text-base md:text-lg">
                      <a [routerLink]="['/teacher/students', s.id]"
                        class="px-3 py-1.5 bg-[#0056D2]/5 text-[#0056D2] hover:text-[#004BB5] rounded-md transition-colors text-xs font-medium inline-flex items-center gap-1 mr-2">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Chi tiết
                        </a>
                      <button (click)="sendMessage(s.id)"
                        class="px-3 py-1.5 bg-[#0056D2]/5 text-[#0056D2] hover:bg-[#0056D2]/10 rounded-md transition-colors text-xs font-medium inline-flex items-center gap-1">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M7 8h10M7 12h6m2 8l-4-4H7a3 3 0 01-3-3V7a3 3 0 013-3h10a3 3 0 013 3v6a3 3 0 01-3 3h-3l-4 4" />
                        </svg>
                        Nhắn tin
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
  
        <!-- Pagination -->
        @if (total() > 0) {
          <div class="bg-white rounded-lg shadow p-4 flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-600">Hiển thị</span>
              <select class="border rounded px-2 py-1" [ngModel]="pageSize()" (ngModelChange)="onPageSizeChange($event)">
                <option [ngValue]="5">5</option>
                <option [ngValue]="10">10</option>
                <option [ngValue]="20">20</option>
              </select>
              <span class="text-sm text-gray-600">mỗi trang</span>
            </div>
            <div class="flex items-center gap-2">
              <button class="px-3 py-1 border rounded disabled:opacity-50" [disabled]="pageIndex() <= 1" (click)="prevPage()">Trước</button>
              <span class="text-sm text-gray-700">Trang {{ pageIndex() }} / {{ totalPages() }}</span>
              <button class="px-3 py-1 border rounded disabled:opacity-50" [disabled]="pageIndex() >= totalPages()" (click)="nextPage()">Sau</button>
            </div>
            <div class="text-sm text-gray-600">Tổng: {{ total() }}</div>
          </div>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentManagementComponent {
  private studentApi = inject(StudentApi);
  private courseApi = inject(CourseApi);
  private router = inject(Router);

  keyword = '';
  status: '' | 'active' | 'inactive' | 'suspended' = '';
  
  students = signal<StudentSummary[]>([]);
  courses = signal<CourseSummary[]>([]);
  error = signal('');
  loading = signal(false);
  
  // Currently selected course
  selectedCourse = signal<CourseSummary | null>(null);
  
  pageIndex = signal(1);
  pageSize = signal(10);
  totalElements = signal(0);
  
  paged = computed(() => this.students());
  total = computed(() => this.totalElements());
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));

  constructor() {
    this.loadData();
  }

  private loadData() {
    this.error.set('');
    this.loading.set(true);
    
    this.courseApi.myCourses().subscribe({
      next: (response) => {
        if (response.data) {
          this.courses.set(response.data);
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Không thể tải danh sách khóa học');
        this.loading.set(false);
      }
    });
  }

  getStatusLabel(status?: string): string {
    const statusMap: Record<string, string> = {
      'PUBLISHED': 'Đã xuất bản',
      'APPROVED': 'Đã duyệt',
      'PENDING': 'Chờ duyệt',
      'DRAFT': 'Bản nháp',
      'REJECTED': 'Từ chối',
      'ARCHIVED': 'Lưu trữ'
    };
    return statusMap[status || ''] || status || 'Không xác định';
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  onThumbError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = '/icons/icon-192x192.png';
  }

  viewCourseStudents(course: CourseSummary) {
    this.selectedCourse.set(course);
    this.pageIndex.set(1);
    this.loadStudents();
  }

  backToCourses() {
    this.selectedCourse.set(null);
    this.students.set([]);
    this.totalElements.set(0);
    this.keyword = '';
    this.status = '';
  }

  private loadStudents() {
    if (!this.selectedCourse()) return;
    
    this.loading.set(true);
    this.error.set('');
    
    const params: any = {
      page: this.pageIndex() - 1,
      size: this.pageSize(),
      courseId: this.selectedCourse()!.id
    };
    
    if (this.status) {
      params.status = this.status;
    }
    
    if (this.keyword && this.keyword.trim()) {
      params.search = this.keyword.trim();
    }

    this.studentApi.getTeacherStudents(params).subscribe({
      next: (response) => {
        if (response.data) {
          const mappedStudents = response.data.map((s: any) => ({
            id: s.id,
            name: s.fullName,
            email: s.email,
            enrolledAt: s.enrolledAt,
            lastAccessed: s.lastAccessed,
            progress: s.progressPercentage || 0,
            averageGrade: s.averageGrade || 0,
            status: s.status || 'active',
            completedCourses: s.completedCourses || 0,
            totalCourses: s.totalCourses || 0
          }));
          this.students.set(mappedStudents);
          
          if (response.pagination) {
            this.totalElements.set(response.pagination.totalItems || 0);
          }
        } else {
          this.students.set([]);
          this.totalElements.set(0);
        }
        
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Không thể tải danh sách học viên. Vui lòng thử lại.');
        this.students.set([]);
        this.totalElements.set(0);
        this.loading.set(false);
      }
    });
  }

  applyFilters() {
    this.pageIndex.set(1);
    this.loadStudents();
  }

  onStatusChange() {
    this.pageIndex.set(1);
    this.loadStudents();
  }

  goToPage(n: number) { 
    this.pageIndex.set(Math.min(Math.max(1, n), this.totalPages()));
    this.loadStudents();
  }
  
  nextPage() { 
    this.goToPage(this.pageIndex() + 1); 
  }
  
  prevPage() { 
    this.goToPage(this.pageIndex() - 1); 
  }
  
  onPageSizeChange(v?: any) { 
    if (v !== undefined) this.pageSize.set(Number(v)); 
    this.goToPage(1); 
  }

  trackById(_index: number, student: any): string {
    return student.id;
  }

  sendMessage(studentId: string) {
    this.router.navigate(['/teacher/students', studentId], { queryParams: { tab: 'messages' } });
  }

  onReload() {
    if (this.selectedCourse()) {
      this.loadStudents();
    } else {
      this.loadData();
    }
  }
}
