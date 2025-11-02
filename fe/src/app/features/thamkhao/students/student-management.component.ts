import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TeacherService, TeacherStudent } from '../services/teacher.service';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

@Component({
  selector: 'app-student-management',
  imports: [CommonModule, RouterModule, FormsModule, LoadingComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- Loading State -->
    <app-loading 
      [show]="teacherService.isLoading()" 
      text="Đang tải học viên..."
      subtext="Vui lòng chờ trong giây lát"
      variant="overlay"
      color="purple">
    </app-loading>

    <div class="bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 min-h-screen">
      <div class="max-w-7xl mx-auto px-6 py-8">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 mb-2">👥 Quản lý học viên</h1>
              <p class="text-gray-600">Theo dõi và quản lý học viên trong các khóa học</p>
            </div>
            <button (click)="exportStudents()"
                    class="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105">
              <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"></path>
              </svg>
              Xuất danh sách
            </button>
          </div>
        </div>

        <!-- Stats Overview -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-purple-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Tổng học viên</p>
                <p class="text-3xl font-bold text-gray-900">{{ totalStudents() }}</p>
                <p class="text-sm text-purple-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                  </svg>
                  +{{ newStudentsThisWeek() }} tuần này
                </p>
              </div>
              <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 8v1h1.5a.5.5 0 01.5.5v9a.5.5 0 01-.5.5h-13a.5.5 0 01-.5-.5v-9a.5.5 0 01.5-.5H8v-1a5 5 0 00-5 5v1h9.93z"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-green-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Học viên tích cực</p>
                <p class="text-3xl font-bold text-gray-900">{{ activeStudents() }}</p>
                <p class="text-sm text-green-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                  </svg>
                  {{ activeStudentRate() }}% tổng số
                </p>
              </div>
              <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-blue-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Điểm TB</p>
                <p class="text-3xl font-bold text-gray-900">{{ averageGrade() }}</p>
                <p class="text-sm text-blue-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                  </svg>
                  Xuất sắc
                </p>
              </div>
              <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-orange-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Tỷ lệ hoàn thành</p>
                <p class="text-3xl font-bold text-gray-900">{{ completionRate() }}%</p>
                <p class="text-sm text-orange-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                  </svg>
                  Tốt
                </p>
              </div>
              <div class="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Filter and Search -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div class="flex flex-col md:flex-row gap-4">
            <div class="flex-1">
              <input type="text" 
                     [(ngModel)]="searchQuery"
                     placeholder="Tìm kiếm học viên..."
                     class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
            </div>
            <div class="flex gap-4">
              <select [(ngModel)]="courseFilter" 
                      class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                <option value="">Tất cả khóa học</option>
                @for (course of availableCourses(); track course.id) {
                  <option [value]="course.id">{{ course.title }}</option>
                }
              </select>
              <select [(ngModel)]="statusFilter" 
                      class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                <option value="">Tất cả trạng thái</option>
                <option value="active">Tích cực</option>
                <option value="inactive">Không tích cực</option>
                <option value="completed">Hoàn thành</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Students Table -->
        <div class="bg-white rounded-xl shadow-lg overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900">Danh sách học viên</h3>
          </div>
          
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Học viên</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Khóa học</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tiến độ</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Điểm TB</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động cuối</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                @for (student of filteredStudents(); track student.id) {
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <img [src]="student.avatar" [alt]="student.name" class="w-10 h-10 rounded-full">
                        <div class="ml-4">
                          <div class="text-sm font-medium text-gray-900">{{ student.name }}</div>
                          <div class="text-sm text-gray-500">{{ student.email }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm text-gray-900">{{ student.totalCourses }} khóa học</div>
                      <div class="text-sm text-gray-500">{{ student.completedCourses }} hoàn thành</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <div class="w-20 bg-gray-200 rounded-full h-2 mr-2">
                          <div class="bg-green-600 h-2 rounded-full" [style.width.%]="student.progress"></div>
                        </div>
                        <span class="text-sm text-gray-900">{{ student.progress }}%</span>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <span class="text-sm text-gray-900">{{ student.averageGrade }}/10</span>
                        @if (student.averageGrade >= 8) {
                          <span class="ml-2 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Xuất sắc</span>
                        } @else if (student.averageGrade >= 6) {
                          <span class="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Tốt</span>
                        } @else {
                          <span class="ml-2 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Cần cải thiện</span>
                        }
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {{ formatLastActive(student.lastActive) }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div class="flex space-x-2">
                        <button (click)="viewStudentDetail(student.id)"
                                class="text-purple-600 hover:text-purple-900">
                          Xem chi tiết
                        </button>
                        <button (click)="sendMessage(student.id)"
                                class="text-blue-600 hover:text-blue-900">
                          Nhắn tin
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Empty State -->
        @if (filteredStudents().length === 0) {
          <div class="text-center py-12">
            <svg class="w-24 h-24 text-gray-300 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 8v1h1.5a.5.5 0 01.5.5v9a.5.5 0 01-.5.5h-13a.5.5 0 01-.5-.5v-9a.5.5 0 01.5-.5H8v-1a5 5 0 00-5 5v1h9.93z"></path>
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Không có học viên nào</h3>
            <p class="text-gray-500 mb-6">Chưa có học viên nào đăng ký khóa học của bạn</p>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentManagementComponent implements OnInit {
  protected teacherService = inject(TeacherService);
  private router = inject(Router);

  // Filter states
  searchQuery = signal('');
  courseFilter = signal('');
  statusFilter = signal('');

  // Computed properties
  totalStudents = computed(() => this.teacherService.students().length);
  availableCourses = computed(() => this.teacherService.activeCourses());
  
  activeStudents = computed(() => 
    this.teacherService.students().filter(student => {
      const daysSinceLastActive = Math.floor((Date.now() - student.lastActive.getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceLastActive <= 7;
    }).length
  );
  
  newStudentsThisWeek = computed(() => {
    // Mock data for new students this week
    return Math.floor(Math.random() * 5) + 2;
  });
  
  activeStudentRate = computed(() => {
    const total = this.totalStudents();
    const active = this.activeStudents();
    return total > 0 ? Math.round((active / total) * 100) : 0;
  });
  
  averageGrade = computed(() => {
    const students = this.teacherService.students();
    if (students.length === 0) return 0;
    const total = students.reduce((sum, student) => sum + student.averageGrade, 0);
    return (total / students.length).toFixed(1);
  });
  
  completionRate = computed(() => {
    const students = this.teacherService.students();
    if (students.length === 0) return 0;
    const total = students.reduce((sum, student) => sum + student.progress, 0);
    return Math.round(total / students.length);
  });

  filteredStudents = computed(() => {
    let students = this.teacherService.students();
    
    // Filter by search query
    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      students = students.filter(student => 
        student.name.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query)
      );
    }
    
    // Filter by course
    if (this.courseFilter()) {
      students = students.filter(student => 
        student.courses.includes(this.courseFilter())
      );
    }
    
    // Filter by status
    if (this.statusFilter()) {
      students = students.filter(student => {
        const daysSinceLastActive = Math.floor((Date.now() - student.lastActive.getTime()) / (1000 * 60 * 60 * 24));
        switch (this.statusFilter()) {
          case 'active':
            return daysSinceLastActive <= 7;
          case 'inactive':
            return daysSinceLastActive > 7;
          case 'completed':
            return student.progress === 100;
          default:
            return true;
        }
      });
    }
    
    return students;
  });

  ngOnInit(): void {
    this.loadStudents();
  }

  async loadStudents(): Promise<void> {
    await this.teacherService.getStudents();
  }

  exportStudents(): void {
    const students = this.filteredStudents();
    
    // Create CSV content
    const headers = ['Tên', 'Email', 'Vai trò', 'Khoa', 'Mã sinh viên', 'Trạng thái', 'Ngày tạo'];
    const csvContent = [
      headers.join(','),
      ...students.map(student => [
        `"${student.name}"`,
        `"${student.email}"`,
        `"${(student as any).role || ''}"`,
        `"${(student as any).department || ''}"`,
        `"${(student as any).studentId || ''}"`,
        `"${(student as any).isActive ? 'Hoạt động' : 'Không hoạt động'}"`,
        `"${new Date((student as any).createdAt || new Date()).toLocaleDateString('vi-VN')}"`
      ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `students_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  viewStudentDetail(studentId: string): void {
    this.router.navigate(['/teacher/students', studentId]);
  }

  sendMessage(studentId: string): void {
    this.router.navigate(['/teacher/communication', 'message', studentId]);
  }

  formatLastActive(date: Date): string {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Vừa xong';
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} ngày trước`;
  }
}