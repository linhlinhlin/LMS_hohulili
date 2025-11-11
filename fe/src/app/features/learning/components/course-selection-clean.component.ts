import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ErrorHandlingService } from '../../../shared/services/error-handling.service';
import { StudentEnrollmentService } from '../../student/services/enrollment.service';
import { CourseSummary } from '../../../api/types/course.types';

/**
 * Course Selection Component for Students - CLEAN VERSION
 * 
 * Cho phép student browse và enroll vào các khóa học available
 * - Simple UI với search và filter
 * - Real-time enrollment tracking với StudentEnrollmentService
 * - Chỉ sử dụng CourseSummary properties: id, code, title, description, status, teacherName, enrolledCount, createdAt
 */
@Component({
  selector: 'app-course-selection',
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  template: `
   
    
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div class="max-w-7xl mx-auto px-6 py-8">
        <!-- Header -->
        <div class="text-center mb-12">
          <h1 class="text-4xl font-bold text-gray-900 mb-4">Chọn khóa học</h1>
          <p class="text-lg text-gray-600 max-w-2xl mx-auto">
            Khám phá các khóa học chất lượng cao về hàng hải và phát triển kỹ năng chuyên nghiệp của bạn
          </p>
        </div>

        <!-- Search & Filter Bar -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
          <form [formGroup]="filterForm" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Search Input -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Tìm kiếm khóa học</label>
              <div class="relative">
                <input 
                  type="text" 
                  formControlName="search"
                  placeholder="Nhập tên khóa học, giảng viên..."
                  class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <svg class="absolute left-3 top-3.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
            </div>

            <!-- Teacher Filter -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Giảng viên</label>
              <select 
                formControlName="teacher"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">Tất cả giảng viên</option>
                <!-- Will be populated dynamically -->
              </select>
            </div>
          </form>

          <div class="flex items-center justify-between mt-4 pt-4 border-t">
            <div class="text-sm text-gray-600">
              Tìm thấy {{ filteredCourses().length }} khóa học
            </div>
            <button 
              (click)="clearFilters()"
              class="text-sm text-blue-600 hover:text-blue-800 font-medium">
              Xóa bộ lọc
            </button>
          </div>
        </div>

        <!-- Enrolled Courses Summary -->
        @if (enrollmentService.enrolledCourses().length > 0) {
          <div class="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
            <h3 class="text-lg font-semibold text-green-900 mb-2">Khóa học đã đăng ký</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="text-center">
                <div class="text-2xl font-bold text-green-700">{{ enrollmentService.enrolledCourses().length }}</div>
                <div class="text-sm text-green-600">Tổng số khóa học</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-green-700">{{ enrollmentService.inProgressCourses().length }}</div>
                <div class="text-sm text-green-600">Đang học</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-green-700">{{ enrollmentService.completedCourses().length }}</div>
                <div class="text-sm text-green-600">Hoàn thành</div>
              </div>
            </div>
          </div>
        }

        <!-- Course Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (course of filteredCourses(); track course.id) {
            <div class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <!-- Course Thumbnail -->
              <div class="relative h-48 bg-gradient-to-r from-blue-500 to-indigo-600">
                <div class="w-full h-full flex items-center justify-center text-white">
                  <svg class="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"></path>
                  </svg>
                </div>
                <!-- Enrollment Status Badge -->
                @if (isEnrolled(course.id)) {
                  <div class="absolute top-4 right-4">
                    <span class="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      Đã đăng ký
                    </span>
                  </div>
                }
              </div>

              <!-- Course Content -->
              <div class="p-6">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                    {{ course.code }}
                  </span>
                  <span class="text-xs font-medium px-2 py-1 rounded-full"
                        [class]="course.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'">
                    {{ course.status }}
                  </span>
                </div>

                <h3 class="text-lg font-bold text-gray-900 mb-2">{{ course.title }}</h3>
                <p class="text-gray-600 text-sm mb-4">{{ course.description }}</p>

                <!-- Course Meta -->
                <div class="space-y-2 mb-4">
                  <div class="flex items-center text-sm text-gray-500">
                    <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path>
                    </svg>
                    {{ course.teacherName }}
                  </div>

                  <div class="flex items-center text-sm text-gray-500">
                    <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                    </svg>
                    {{ course.enrolledCount }} học viên đã đăng ký
                  </div>

                  <div class="flex items-center text-sm text-gray-500">
                    <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                      <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                    </svg>
                    Tạo: {{ formatDate(course.createdAt) }}
                  </div>
                </div>

                <!-- Action Buttons -->
                <div class="flex items-center justify-between">
                  <button 
                    (click)="viewCourseDetails(course.id)"
                    class="text-blue-600 hover:text-blue-800 font-medium text-sm">
                    Xem chi tiết
                  </button>
                  @if (isEnrolled(course.id)) {
                    <button 
                      (click)="continueLearning(course.id)"
                      class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                      Tiếp tục học
                    </button>
                  } @else {
                    <button 
                      (click)="enrollInCourse(course)"
                      [disabled]="enrollingCourseId() === course.id"
                      class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                      Đăng ký ngay
                    </button>
                  }
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Empty State -->
        @if (filteredCourses().length === 0 && !enrollmentService.isLoading()) {
          <div class="text-center py-16">
            <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0118 12a8 8 0 00-8-8 8 8 0 00-8 8c0 2.027.761 3.881 2 5.291"></path>
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Không tìm thấy khóa học nào</h3>
            <p class="text-gray-600 mb-4">Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
            <button 
              (click)="clearFilters()"
              class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Xóa bộ lọc
            </button>
          </div>
        }

        <!-- Load More Button -->
        @if (enrollmentService.hasNextPage()) {
          <div class="text-center mt-8">
            <button 
              (click)="loadMoreCourses()"
              [disabled]="enrollmentService.isLoading()"
              class="bg-white text-blue-600 border border-blue-600 px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed">
              Xem thêm khóa học
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .line-clamp-2 {
      overflow: hidden;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }
    
    .line-clamp-3 {
      overflow: hidden;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseSelectionComponent implements OnInit {
  protected enrollmentService = inject(StudentEnrollmentService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private errorService = inject(ErrorHandlingService);

  // State
  enrollingCourseId = signal<string | null>(null);
  
  // Form
  filterForm: FormGroup = this.fb.group({
    search: [''],
    teacher: ['']
  });

  // Computed
  filteredCourses = computed(() => {
    const courses = this.enrollmentService.availableCourses();
    const filters = this.filterForm.value;
    
    return courses.filter(course => {
      const searchMatch = !filters.search || 
        course.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        course.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
        course.teacherName?.toLowerCase().includes(filters.search.toLowerCase());
        
      const teacherMatch = !filters.teacher || course.teacherName === filters.teacher;
      
      return searchMatch && teacherMatch;
    });
  });

  ngOnInit(): void {
    this.initializeComponent();
    this.setupFormSubscription();
  }

  private async initializeComponent(): Promise<void> {
    try {
      console.log('🔄 CourseSelection: Initializing component...');
      
      // Load available courses and enrolled courses
      await Promise.all([
        this.enrollmentService.loadAvailableCourses(1, 20),
        this.enrollmentService.loadEnrolledCourses(1, 50) // Load more enrolled courses for checking
      ]);
      
      console.log('✅ CourseSelection: Component initialized successfully');
      console.log('📊 Course stats:', {
        available: this.enrollmentService.availableCourses().length,
        enrolled: this.enrollmentService.enrolledCourses().length
      });
      
    } catch (error) {
      console.error('❌ CourseSelection: Error initializing component:', error);
      this.errorService.handleApiError(error, 'course-selection');
    }
  }

  private setupFormSubscription(): void {
    // Debounced form changes for better performance
    this.filterForm.valueChanges.subscribe(() => {
      // Filter is handled by computed signal
    });
  }

  async enrollInCourse(course: CourseSummary): Promise<void> {
    if (this.enrollingCourseId()) return; // Prevent multiple enrollments
    
    this.enrollingCourseId.set(course.id);
    
    try {
      console.log('🔄 CourseSelection: Enrolling in course...', course.title);
      
      const success = await this.enrollmentService.enrollInCourse(course.id);
      
      if (success) {
        console.log('✅ CourseSelection: Successfully enrolled in course:', course.title);
        this.errorService.showSuccess(`Đã đăng ký thành công khóa học "${course.title}"!`, 'enrollment');
      }
      
    } catch (error) {
      console.error('❌ CourseSelection: Error enrolling in course:', error);
      this.errorService.handleApiError(error, 'enrollment');
    } finally {
      this.enrollingCourseId.set(null);
    }
  }

  isEnrolled(courseId: string): boolean {
    return this.enrollmentService.isEnrolledInCourse(courseId);
  }

  viewCourseDetails(courseId: string): void {
    // Navigate to course detail page (to be implemented)
    console.log('🔄 CourseSelection: Viewing course details:', courseId);
    // this.router.navigate(['/courses', courseId]);
  }

  continueLearning(courseId: string): void {
    console.log('🔄 CourseSelection: Continue learning course:', courseId);
    this.router.navigate(['/student/learn/course', courseId]).catch(error => {
      this.errorService.handleNavigationError(error, `/student/learn/course/${courseId}`);
    });
  }

  clearFilters(): void {
    this.filterForm.reset();
  }

  async loadMoreCourses(): Promise<void> {
    const nextPage = this.enrollmentService.currentPage() + 1;
    await this.enrollmentService.loadAvailableCourses(nextPage, 20);
  }

  formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('vi-VN');
    } catch {
      return dateStr;
    }
  }
}