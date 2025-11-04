import { Component, OnInit, signal, inject, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QuizStateService } from '../state/quiz-state.service';
import { AuthService } from '../../../core/services/auth.service';
import { Quiz, QuizFilter } from '../../../shared/types/quiz.types';
import { Course, CourseLevel, CourseCategory, ExtendedCourse } from '../../../shared/types/course.types';
import { ErrorHandlingService } from '../../../shared/services/error-handling.service';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

@Component({
  selector: 'app-quiz-list',
  imports: [CommonModule, RouterModule, FormsModule, LoadingComponent],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  template: `
    <!-- Loading State -->
    <app-loading 
      [show]="isLoading()" 
      text="Đang tải danh sách quiz..."
      subtext="Vui lòng chờ trong giây lát"
      variant="overlay"
      color="blue">
    </app-loading>
    <div class="bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Quiz & Kiểm tra</h1>
          <p class="text-gray-600">Tham gia các bài kiểm tra để đánh giá kiến thức của bạn</p>
        </div>

        <!-- Filters -->
        <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Bộ lọc</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Khóa học</label>
              <select 
                [(ngModel)]="selectedCourseId" 
                (change)="onCourseFilterChange()"
                class="w-full px-3 py-2 border border-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tất cả khóa học</option>
                @for (course of courses(); track course.id) {
                  <option [value]="course.id">{{ course.title }}</option>
                }
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Trạng thái</label>
              <select 
                [(ngModel)]="selectedStatus" 
                (change)="onStatusFilterChange()"
                class="w-full px-3 py-2 border border-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tất cả</option>
                <option value="active">Đang mở</option>
                <option value="completed">Đã hoàn thành</option>
                <option value="available">Có thể làm</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Thời gian</label>
              <select 
                [(ngModel)]="selectedTimeLimit" 
                (change)="onTimeFilterChange()"
                class="w-full px-3 py-2 border border-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tất cả</option>
                <option value="short">Ngắn (< 30 phút)</option>
                <option value="medium">Trung bình (30-60 phút)</option>
                <option value="long">Dài (> 60 phút)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        @if (isLoading()) {
          <div class="flex justify-center items-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        }

        <!-- Quiz Grid -->
        @if (!isLoading() && filteredQuizzes().length > 0) {
          <div class="quiz-grid">
            @for (quiz of filteredQuizzes(); track quiz.id) {
              <div class="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                <div class="p-6">
                  <!-- Quiz Header -->
                  <div class="flex items-start justify-between mb-4">
                    <div class="flex-1">
                      <h3 class="text-lg font-semibold text-gray-900 mb-2">{{ quiz.title }}</h3>
                      <p class="text-sm text-gray-600 mb-2">{{ quiz.description }}</p>
                      <div class="flex items-center text-sm text-gray-500">
                        <span class="mr-4">{{ quiz.questions.length }} câu hỏi</span>
                        <span class="mr-4">{{ quiz.timeLimit }} phút</span>
                        <span>{{ quiz.totalPoints }} điểm</span>
                      </div>
                    </div>
                    <div class="flex-shrink-0 ml-4">
                      @if (quiz.isActive) {
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Đang mở
                        </span>
                      } @else {
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Đã đóng
                        </span>
                      }
                    </div>
                  </div>

                  <!-- Quiz Info -->
                  <div class="space-y-2 mb-4">
                    <div class="flex items-center text-sm text-gray-600">
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <span>Thời gian: {{ quiz.timeLimit }} phút</span>
                    </div>
                    <div class="flex items-center text-sm text-gray-600">
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <span>Điểm đậu: {{ quiz.passingScore }}%</span>
                    </div>
                    <div class="flex items-center text-sm text-gray-600">
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
                      </svg>
                      <span>Số lần làm: {{ quiz.maxAttempts }}</span>
                    </div>
                    @if (quiz.dueDate) {
                      <div class="flex items-center text-sm text-gray-600">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        <span>Hạn nộp: {{ formatDate(quiz.dueDate) }}</span>
                      </div>
                    }
                  </div>

                  <!-- Action Buttons -->
                  <div class="flex space-x-3">
                    <button
                      (click)="startQuiz(quiz.id)"
                      [disabled]="!quiz.isActive"
                      class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      @if (quiz.isActive) {
                        Bắt đầu làm
                      } @else {
                        Đã đóng
                      }
                    </button>
                    <button 
                      (click)="previewQuiz(quiz.id)"
                      class="px-4 py-2 border border-gray-800 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200"
                    >
                      Xem trước
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- Empty State -->
        @if (!isLoading() && filteredQuizzes().length === 0) {
          <div class="text-center py-12">
            <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Không có quiz nào</h3>
            <p class="text-gray-600">Không tìm thấy quiz nào phù hợp với bộ lọc của bạn.</p>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizListComponent implements OnInit {
  protected quizService = inject(QuizStateService);
  protected authService = inject(AuthService);
  private router = inject(Router);
  private errorService = inject(ErrorHandlingService);

  // Signals
  quizzes = signal<Quiz[]>([]);
  courses = signal<Course[]>([]);
  filteredQuizzes = signal<Quiz[]>([]);
  isLoading = signal(false);

  // Filter properties
  selectedCourseId = '';
  selectedStatus = '';
  selectedTimeLimit = '';

  ngOnInit(): void {
    this.loadData();
    console.log('🔧 Quiz List - Component initialized');
    console.log('🔧 Quiz List - Quizzes count:', this.quizzes().length);
    console.log('🔧 Quiz List - Courses count:', this.courses().length);
  }

  private async loadData(): Promise<void> {
    try {
      this.isLoading.set(true);
      
      // Simulate loading delay
      await this.simulateDataLoading();
      
      // Mock data for courses
      const mockCourses: ExtendedCourse[] = [
        {
          isEnrolled: false, // Default for quiz courses
          id: '1',
          title: 'Kỹ thuật Tàu biển Cơ bản',
          description: 'Khóa học cung cấp kiến thức cơ bản về kỹ thuật tàu biển',
          thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300&h=200&fit=crop',
          instructor: { 
            id: '1', 
            name: 'ThS. Nguyễn Văn Hải', 
            title: 'Giảng viên Kỹ thuật Tàu biển',
            avatar: 'https://via.placeholder.com/150',
            credentials: ['Thạc sĩ Kỹ thuật Hàng hải'],
            experience: 10,
            rating: 4.8,
            studentsCount: 156
          },
          category: 'engineering',
          duration: '40h',
          level: 'beginner',
          shortDescription: 'Khóa học cơ bản về kỹ thuật tàu biển',
          students: 156,
          reviews: 25,
          tags: ['Kỹ thuật', 'Tàu biển'],
          skills: ['Kỹ thuật tàu'],
          prerequisites: ['Toán học cơ bản'],
          certificate: {
            type: 'Professional',
            description: 'Chứng chỉ Kỹ thuật Tàu biển'
          },
          curriculum: {
            modules: 6,
            lessons: 12,
            duration: '40 giờ'
          },
          price: 1500000,
          rating: 4.8,
          studentsCount: 156,
          lessonsCount: 12,
          isPublished: true
        },
        {
          id: '2',
          isEnrolled: false,
          title: 'An toàn Hàng hải',
          description: 'Các quy định và thực hành an toàn trong ngành hàng hải',
          thumbnail: 'https://images.unsplash.com/photo-1506905925346-14b1e3d71e51?w=300&h=200&fit=crop',
          instructor: { 
            id: '2', 
            name: 'TS. Trần Thị Lan', 
            title: 'Giảng viên An toàn Hàng hải',
            avatar: 'https://via.placeholder.com/150',
            credentials: ['Tiến sĩ An toàn Hàng hải'],
            experience: 15,
            rating: 4.6,
            studentsCount: 134
          },
          category: 'safety',
          duration: '30h',
          level: 'intermediate',
          shortDescription: 'Các quy định và thực hành an toàn trong ngành hàng hải',
          students: 134,
          reviews: 18,
          tags: ['An toàn', 'Hàng hải'],
          skills: ['An toàn hàng hải'],
          prerequisites: ['STCW cơ bản'],
          certificate: {
            type: 'STCW',
            description: 'Chứng chỉ STCW'
          },
          curriculum: {
            modules: 4,
            lessons: 8,
            duration: '30 giờ'
          },
          price: 1200000,
          rating: 4.6,
          studentsCount: 134,
          lessonsCount: 8,
          isPublished: true
        }
      ];
      this.courses.set(mockCourses);

      // Mock data for quizzes
      const mockQuizzes: Quiz[] = [
        {
          id: '1',
          title: 'Quiz Kỹ thuật Tàu biển - Chương 1',
          description: 'Kiểm tra kiến thức về cấu trúc tàu biển cơ bản',
          courseId: '1',
          instructorId: '1',
          questions: [],
          timeLimit: 30,
          totalPoints: 100,
          passingScore: 70,
          maxAttempts: 3,
          isActive: true,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          title: 'Quiz An toàn Hàng hải - Tổng hợp',
          description: 'Kiểm tra tổng hợp kiến thức an toàn hàng hải',
          courseId: '2',
          instructorId: '2',
          questions: [],
          timeLimit: 45,
          totalPoints: 100,
          passingScore: 80,
          maxAttempts: 2,
          isActive: true,
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      this.quizzes.set(mockQuizzes);
      this.applyFilters();
      
      console.log('🔧 Quiz List - Data loaded successfully');
      this.errorService.showSuccess('Danh sách quiz đã được tải thành công!', 'quiz');
      
    } catch (error) {
      this.errorService.handleApiError(error, 'quiz');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async simulateDataLoading(): Promise<void> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  onCourseFilterChange(): void {
    this.applyFilters();
  }

  onStatusFilterChange(): void {
    this.applyFilters();
  }

  onTimeFilterChange(): void {
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = [...this.quizzes()];

    // Filter by course
    if (this.selectedCourseId) {
      filtered = filtered.filter(quiz => quiz.courseId === this.selectedCourseId);
    }

    // Filter by status
    if (this.selectedStatus) {
      switch (this.selectedStatus) {
        case 'active':
          filtered = filtered.filter(quiz => quiz.isActive);
          break;
        case 'completed':
          // This would need to check user's attempts
          break;
        case 'available':
          filtered = filtered.filter(quiz => quiz.isActive);
          break;
      }
    }

    // Filter by time limit
    if (this.selectedTimeLimit) {
      switch (this.selectedTimeLimit) {
        case 'short':
          filtered = filtered.filter(quiz => quiz.timeLimit < 30);
          break;
        case 'medium':
          filtered = filtered.filter(quiz => quiz.timeLimit >= 30 && quiz.timeLimit <= 60);
          break;
        case 'long':
          filtered = filtered.filter(quiz => quiz.timeLimit > 60);
          break;
      }
    }

    this.filteredQuizzes.set(filtered);
  }

  startQuiz(quizId: string): void {
    console.log('🔧 Quiz List - Start quiz:', quizId);
    this.router.navigate(['/student/quiz/take', quizId]).catch(error => {
      this.errorService.handleNavigationError(error, `/student/quiz/take/${quizId}`);
    });
  }

  previewQuiz(quizId: string): void {
    console.log('🔧 Quiz List - Preview quiz:', quizId);
    this.errorService.showSuccess('Tính năng xem trước quiz sẽ được phát triển trong phiên bản tiếp theo', 'quiz');
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}