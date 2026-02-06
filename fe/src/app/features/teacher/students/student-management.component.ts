import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, signal, computed } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { StudentApi, StudentSummary } from '../../../api/client/student.api';
import { CourseApi } from '../../../api/client/course.api';
import { CourseSummary } from '../../../api/types/course.types';

@Component({
  selector: 'app-student-management',
  imports: [RouterModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="p-6 space-y-6">
      <h1 class="text-2xl font-bold text-gray-900">Học viên</h1>
    
      <div class="bg-white rounded-xl shadow">
        <div class="p-4 flex flex-wrap gap-3 items-center">
          <input class="border rounded-lg px-3 py-2 w-64" placeholder="Tìm theo tên/email" [(ngModel)]="keyword" />
          <select class="border rounded-lg px-3 py-2" [(ngModel)]="selectedCourse" (ngModelChange)="onCourseChange()">
            <option value="">Tất cả khóa học</option>
            @for (course of courses(); track course) {
              <option [value]="course.id">{{ course.title }}</option>
            }
          </select>
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
                      <svg class="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                    <button (click)="onReload()" class="ml-2 text-blue-600 underline text-sm">Tải lại</button>
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
                        <div class="bg-blue-600 h-2 rounded-full" [style.width.%]="s.progress"></div>
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
                      class="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:text-indigo-900 rounded-md transition-colors text-xs font-medium inline-flex items-center gap-1">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Chi tiết
                        </a>
                        <button (click)="sendMessage(s.id)"
                          class="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md transition-colors text-xs font-medium inline-flex items-center gap-1">
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M7 8h10M7 12h6m2 8l-4-4H7a3 3 0 01-3-3V7a3 3 0 013-3h10a3 3 0 013 3v6a3 3 0 01-3 3h-3l-4 4" />
                            </svg>
                            Nhắn tin
                          </button>
                          <!-- <a [routerLink]="['/teacher/students', s.id]" class="text-indigo-600 hover:text-indigo-900 mr-4">Chi tiết</a>
                          <button (click)="sendMessage(s.id)" class="text-blue-600 hover:text-blue-900">Nhắn tin</button>-->
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
    
            <!-- Pagination Controls -->
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
  selectedCourse = '';
  
  students = signal<StudentSummary[]>([]);
  courses = signal<CourseSummary[]>([]);
  error = signal('');
  loading = signal(false); // Loading state
  
  pageIndex = signal(1);
  pageSize = signal(10);
  totalElements = signal(0); // Total from server
  
  // No more client-side filtering! Server handles everything
  paged = computed(() => this.students()); // Students are already paginated from server

  total = computed(() => this.totalElements());
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));

  constructor() {
    this.loadData();
  }

  private loadData() {
    this.error.set('');
    
    // Load courses first, then students
    this.courseApi.myCourses().subscribe({
      next: (response) => {
        if (response.data) {
          this.courses.set(response.data);
          this.loadStudents();
        }
      },
      error: () => {
        this.error.set('Không thể tải danh sách khóa học');
      }
    });
  }

  private loadStudents() {
    this.loading.set(true);
    this.error.set('');
    
    // Build params object with REAL pagination
    const params: any = {
      page: this.pageIndex() - 1, // Backend uses 0-indexed pages
      size: this.pageSize() // Real page size, not 1000!
    };
    
    // Only add optional params if they have values
    if (this.selectedCourse) {
      params.courseId = this.selectedCourse;
    }
    
    if (this.status) {
      params.status = this.status;
    }
    
    if (this.keyword && this.keyword.trim()) {
      params.search = this.keyword.trim();
    }

    this.studentApi.getTeacherStudents(params).subscribe({
      next: (response) => {
        if (response.data) {
          // Map backend response to frontend format
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
          
          // Update pagination info from server response
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
    this.loadStudents(); // Reload with new filters from server
  }

  onCourseChange() {
    this.pageIndex.set(1);
    this.loadStudents(); // Auto reload when course changes
  }

  onStatusChange() {
    this.pageIndex.set(1);
    this.loadStudents(); // Auto reload when status changes
  }

  goToPage(n: number) { 
    this.pageIndex.set(Math.min(Math.max(1, n), this.totalPages()));
    this.loadStudents(); // Reload from server with new page
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
    // Navigate to student detail page with messages tab
    this.router.navigate(['/teacher/students', studentId], { queryParams: { tab: 'messages' } });
  }

  onReload() {
    this.loadData();
  }
}
