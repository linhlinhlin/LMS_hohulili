import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StudentApi, StudentSummary } from '../../../api/client/student.api';
import { CourseApi } from '../../../api/client/course.api';
import { CourseSummary } from '../../../api/types/course.types';

@Component({
  selector: 'app-student-management',
  imports: [CommonModule, RouterModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="p-6 space-y-6">
      <h1 class="text-2xl font-bold text-gray-900">Học viên</h1>

      <div class="bg-white rounded-xl shadow">
        <div class="p-4 flex flex-wrap gap-3 items-center">
          <input class="border rounded-lg px-3 py-2 w-64" placeholder="Tìm theo tên/email" [(ngModel)]="keyword" />
          <select class="border rounded-lg px-3 py-2" [(ngModel)]="selectedCourse">
            <option value="">Tất cả khóa học</option>
            <option *ngFor="let course of courses()" [value]="course.id">{{ course.title }}</option>
          </select>
          <select class="border rounded-lg px-3 py-2" [(ngModel)]="status">
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
                <th class="px-6 py-4 text-left text-sm md:text-base font-semibold text-gray-600 uppercase tracking-wider">Tên</th>
                <th class="px-6 py-4 text-left text-sm md:text-base font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                <th class="px-6 py-4 text-left text-sm md:text-base font-semibold text-gray-600 uppercase tracking-wider">Tiến độ</th>
                <th class="px-6 py-4 text-left text-sm md:text-base font-semibold text-gray-600 uppercase tracking-wider">Điểm</th>
                <th class="px-6 py-4 text-left text-sm md:text-base font-semibold text-gray-600 uppercase tracking-wider">Trạng thái</th>
                <th class="px-6 py-4"></th>
              </tr>
            </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
              
              <tr *ngIf="error()">
                <td colspan="6" class="px-6 py-12 text-center text-red-600">
                  {{ error() }}
                              <button (click)="onReload()" class="ml-2 text-blue-600 underline text-sm">Tải lại</button>
                </td>
              </tr>

              <tr *ngIf="!error() && paged().length === 0">
                <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                  Không tìm thấy học viên nào.
                </td>
              </tr>

              <tr *ngFor="let s of paged(); trackBy: trackById">
                <td class="px-6 py-5 whitespace-nowrap text-base md:text-lg font-medium text-gray-900">{{ s.name }}</td>
                <td class="px-6 py-5 whitespace-nowrap text-base md:text-lg text-gray-600">{{ s.email }}</td>
                <td class="px-6 py-5 whitespace-nowrap text-base md:text-lg text-gray-600">
                  <div class="flex items-center">
                    <div class="w-16 bg-gray-200 rounded-full h-2 mr-2">
                      <div class="bg-blue-600 h-2 rounded-full" [style.width.%]="s.progress"></div>
                    </div>
                    <span>{{ s.progress }}%</span>
                  </div>
                </td>
                <td class="px-6 py-5 whitespace-nowrap text-base md:text-lg text-gray-600">
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
                  <a [routerLink]="['/teacher/students', s.id]" class="text-indigo-600 hover:text-indigo-900 mr-4">Chi tiết</a>
                  <button (click)="sendMessage(s.id)" class="text-blue-600 hover:text-blue-900">Nhắn tin</button>
                </td>
              </tr>
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

  keyword = '';
  status: '' | 'active' | 'inactive' | 'suspended' = '';
  selectedCourse = '';
  
  students = signal<StudentSummary[]>([]);
  courses = signal<CourseSummary[]>([]);
  error = signal('');
  
  pageIndex = signal(1);
  pageSize = signal(10);
  
  filtered = computed(() => {
    const kw = this.keyword.trim().toLowerCase();
    return this.students().filter(s => 
      (!this.status || s.status === this.status) &&
      (!kw || s.name.toLowerCase().includes(kw) || s.email.toLowerCase().includes(kw))
    );
  });
  
  paged = computed(() => {
    const start = (this.pageIndex() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  total = computed(() => this.filtered().length);
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
      error: (error) => {
        console.error('Error loading courses:', error);
        this.error.set('Không thể tải danh sách khóa học');
      }
    });
  }

  private loadStudents() {
    const params = {
      page: 1,
      limit: 1000, // Get all for client-side filtering
      courseId: this.selectedCourse || undefined,
      status: this.status || undefined,
      search: this.keyword || undefined
    };

    this.studentApi.getTeacherStudents(params).subscribe({
      next: (response) => {
        if (response.data) {
          this.students.set(response.data);
        } else {
          // Mock data for development
          this.students.set([
            {
              id: '1',
              name: 'Nguyễn Văn An',
              email: 'nguyenvanan@email.com',
              enrolledAt: '2025-09-01T00:00:00Z',
              lastAccessed: '2025-10-13T10:30:00Z',
              progress: 75,
              averageGrade: 8.5,
              status: 'active',
              completedCourses: 2,
              totalCourses: 3
            },
            {
              id: '2',
              name: 'Trần Thị Bình',
              email: 'tranthibinh@email.com',
              enrolledAt: '2025-08-15T00:00:00Z',
              lastAccessed: '2025-10-12T14:20:00Z',
              progress: 90,
              averageGrade: 9.2,
              status: 'active',
              completedCourses: 3,
              totalCourses: 4
            },
            {
              id: '3',
              name: 'Lê Văn Cường',
              email: 'levancuong@email.com',
              enrolledAt: '2025-09-10T00:00:00Z',
              lastAccessed: '2025-10-01T16:45:00Z',
              progress: 45,
              averageGrade: 6.8,
              status: 'inactive',
              completedCourses: 1,
              totalCourses: 2
            }
          ]);
        }
      },
      error: (error) => {
        console.error('Error loading students:', error);
        this.error.set('Không thể tải danh sách học viên');
      }
    });
  }

  applyFilters() {
    this.pageIndex.set(1);
    // Note: filtering is handled by computed() in real-time
  }

  goToPage(n: number) { 
    this.pageIndex.set(Math.min(Math.max(1, n), this.totalPages())); 
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
    // TODO: Open message modal or navigate to messaging interface
    console.log('Send message to student:', studentId);
  }

  onReload() {
    this.loadData();
  }
}