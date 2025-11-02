import { Component, signal, inject, computed, ChangeDetectionStrategy, ViewEncapsulation, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ResponsiveService } from '../../shared/services/responsive.service';
import { ErrorHandlingService } from '../../shared/services/error-handling.service';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { EnrolledCourse } from '../../shared/types/course.types';

@Component({
  selector: 'app-learning-new',
  imports: [CommonModule, RouterModule, LoadingComponent],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  template: `
    <!-- Loading State -->
    <app-loading 
      [show]="isLoading()" 
      text="Đang tải giao diện học tập..."
      subtext="Vui lòng chờ trong giây lát"
      variant="overlay"
      color="blue">
    </app-loading>
    <div class="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-4xl font-bold text-gray-900 mb-2">Học tập</h1>
              <p class="text-lg text-gray-600">Chào mừng bạn đến với hệ thống học tập trực tuyến LMS Maritime</p>
            </div>
            <div class="flex space-x-4">
              <button 
                (click)="goToCourseSelection()"
                class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Chọn khóa học
              </button>
              <button 
                (click)="goToQuizList()"
                class="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium">
                Làm Quiz
              </button>
            </div>
          </div>
        </div>

        <!-- Stats Overview -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="bg-white rounded-xl shadow-lg p-6">
            <div class="flex items-center">
              <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                  <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                </svg>
              </div>
              <div>
                <p class="text-sm text-gray-600">Khóa học đang theo</p>
                <p class="text-2xl font-bold text-gray-900">{{ enrolledCourses().length }}</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6">
            <div class="flex items-center">
              <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
              </div>
              <div>
                <p class="text-sm text-gray-600">Bài học hoàn thành</p>
                <p class="text-2xl font-bold text-gray-900">{{ totalCompletedLessons() }}</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6">
            <div class="flex items-center">
              <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mr-4">
                <svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                </svg>
              </div>
              <div>
                <p class="text-sm text-gray-600">Thời gian học</p>
                <p class="text-2xl font-bold text-gray-900">{{ totalStudyTime() }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Thao tác nhanh</h2>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button 
              routerLink="/student/quiz"
              class="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-left">
              <div class="flex items-center space-x-3">
                <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
                </svg>
                <div>
                  <h3 class="font-medium text-gray-900">Quiz & Kiểm tra</h3>
                  <p class="text-sm text-gray-600">Làm bài kiểm tra</p>
                </div>
              </div>
            </button>

            <button 
              routerLink="/courses"
              class="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-left">
              <div class="flex items-center space-x-3">
                <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                  <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                </svg>
                <div>
                  <h3 class="font-medium text-gray-900">Khóa học</h3>
                  <p class="text-sm text-gray-600">Xem tất cả khóa học</p>
                </div>
              </div>
            </button>

            <button 
              routerLink="/student/analytics"
              class="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-left">
              <div class="flex items-center space-x-3">
                <svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path>
                </svg>
                <div>
                  <h3 class="font-medium text-gray-900">Báo cáo</h3>
                  <p class="text-sm text-gray-600">Xem tiến độ học tập</p>
                </div>
              </div>
            </button>

            <button 
              routerLink="/student/forum"
              class="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors text-left">
              <div class="flex items-center space-x-3">
                <svg class="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                </svg>
                <div>
                  <h3 class="font-medium text-gray-900">Hỗ trợ</h3>
                  <p class="text-sm text-gray-600">Trợ giúp và FAQ</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        <!-- Enrolled Courses -->
        <div class="mb-8">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-900">Khóa học của tôi</h2>
            <button 
              routerLink="/courses"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Xem tất cả
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (course of enrolledCourses(); track course.id) {
              <div class="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                <div class="p-6">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">{{ course.title }}</h3>
                    <span class="px-2 py-1 text-xs font-medium rounded-full" [class]="getStatusClass(course.status)">
                      {{ getStatusText(course.status) }}
                    </span>
                  </div>
                  
                  <p class="text-gray-600 text-sm mb-4">{{ course.description }}</p>
                  
                  <div class="space-y-3">
                    <div class="flex items-center text-sm text-gray-500">
                      <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path>
                      </svg>
                      {{ course.instructor }}
                    </div>
                    
                    <div class="flex items-center text-sm text-gray-500">
                      <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                      </svg>
                      {{ course.duration }}
                    </div>
                    
                    <div class="flex items-center text-sm text-gray-500">
                      <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                        <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                      </svg>
                      {{ course.completedLessons }}/{{ course.totalLessons }} bài học
                    </div>
                  </div>
                  
                  <!-- Progress Bar -->
                  <div class="mt-4">
                    <div class="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Tiến độ</span>
                      <span>{{ course.progress }}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                      <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" [style.width.%]="course.progress"></div>
                    </div>
                  </div>
                  
                  <!-- Action Button -->
                  <div class="mt-4">
                    <button 
                      (click)="continueCourse(course.id)"
                      class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      @if (course.status === 'completed') {
                        Xem lại
                      } @else if (course.status === 'in-progress') {
                        Tiếp tục học
                      } @else {
                        Bắt đầu học
                      }
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LearningNewComponent implements OnInit {
  protected responsive = inject(ResponsiveService);
  private router = inject(Router);
  private errorService = inject(ErrorHandlingService);

  // Loading state
  isLoading = signal<boolean>(true);

  // Mock data for enrolled courses
  enrolledCourses = signal<EnrolledCourse[]>([
    {
      id: 'course-1',
      title: 'Kỹ thuật Tàu biển Cơ bản',
      description: 'Khóa học cung cấp kiến thức cơ bản về kỹ thuật tàu biển, bao gồm cấu trúc tàu, hệ thống động lực, và quy trình vận hành.',
      instructor: 'ThS. Nguyễn Văn Hải',
      thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop',
      progress: 75,
      totalLessons: 12,
      completedLessons: 9,
      duration: '3 giờ',
      lastAccessed: '2 giờ trước',
      status: 'in-progress',
      currentLesson: 'Bài 9: Hệ thống động lực tàu',
      nextLesson: 'Bài 10: Bảo trì và sửa chữa',
      studyTime: 180, // 3 hours
      averageScore: 8.5,
      notesCount: 23,
      bookmarksCount: 8,
      isFavorite: true,
      lastLessonCompleted: 'Bài 8: Cấu trúc tàu container',
      upcomingDeadlines: [new Date('2024-09-25'), new Date('2024-10-02')],
      certificateAvailable: false
    },
    {
      id: 'course-2',
      title: 'An toàn Hàng hải',
      description: 'Các quy định và thực hành an toàn trong ngành hàng hải, bao gồm quy trình an toàn, thiết bị cứu sinh, và xử lý tình huống khẩn cấp.',
      instructor: 'TS. Trần Thị Lan',
      thumbnail: 'https://images.unsplash.com/photo-1506905925346-14b1e3d71e51?w=400&h=300&fit=crop',
      progress: 100,
      totalLessons: 8,
      completedLessons: 8,
      duration: '2 giờ',
      lastAccessed: '1 ngày trước',
      status: 'completed',
      currentLesson: undefined,
      nextLesson: undefined,
      studyTime: 120, // 2 hours
      averageScore: 9.2,
      notesCount: 45,
      bookmarksCount: 12,
      isFavorite: true,
      lastLessonCompleted: 'Bài 8: Xử lý tình huống khẩn cấp',
      upcomingDeadlines: [],
      certificateAvailable: true
    },
    {
      id: 'course-3',
      title: 'Quản lý Cảng biển',
      description: 'Kiến thức về quản lý và vận hành cảng biển, bao gồm quy trình logistics, quản lý container, và an toàn cảng.',
      instructor: 'ThS. Lê Văn Minh',
      thumbnail: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=400&h=300&fit=crop',
      progress: 0,
      totalLessons: 10,
      completedLessons: 0,
      duration: '4 giờ',
      lastAccessed: 'Chưa bắt đầu',
      status: 'not-started',
      currentLesson: 'Bài 1: Giới thiệu về quản lý cảng',
      nextLesson: 'Bài 2: Cơ sở hạ tầng cảng',
      studyTime: 0,
      averageScore: 0,
      notesCount: 0,
      bookmarksCount: 0,
      isFavorite: false,
      lastLessonCompleted: undefined,
      upcomingDeadlines: [new Date('2024-09-28'), new Date('2024-10-05')],
      certificateAvailable: false
    }
  ]);

  totalCompletedLessons = computed(() => 
    this.enrolledCourses().reduce((sum, course) => sum + course.completedLessons, 0)
  );

  totalStudyTime = computed(() => {
    const totalMinutes = this.enrolledCourses().reduce((sum, course) => sum + (course.studyTime || 0), 0);
    return this.formatStudyTime(totalMinutes);
  });

  ngOnInit(): void {
    this.loadLearningData();
  }

  private async loadLearningData(): Promise<void> {
    try {
      this.isLoading.set(true);
      
      // Simulate loading data
      await this.simulateDataLoading();
      
      console.log('🔧 Learning Interface - Component initialized successfully');
      console.log('🔧 Learning Interface - Enrolled courses count:', this.enrolledCourses().length);
      
      this.errorService.showSuccess('Giao diện học tập đã được tải thành công!', 'learning');
      
    } catch (error) {
      this.errorService.handleApiError(error, 'learning');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async simulateDataLoading(): Promise<void> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'not-started':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'in-progress':
        return 'Đang học';
      case 'completed':
        return 'Hoàn thành';
      case 'not-started':
        return 'Chưa bắt đầu';
      default:
        return 'Không xác định';
    }
  }

  goToCourseSelection(): void {
    console.log('🔧 Learning Interface - Go to course selection');
    this.router.navigate(['/courses']).catch(error => {
      this.errorService.handleNavigationError(error, '/courses');
    });
  }

  goToQuizList(): void {
    console.log('🔧 Learning Interface - Go to quiz list');
    this.router.navigate(['/student/quiz']).catch(error => {
      this.errorService.handleNavigationError(error, '/student/quiz');
    });
  }

  continueCourse(courseId: string): void {
    console.log('🔧 Learning Interface - Continue course:', courseId);
    this.router.navigate(['/student/learn/course', courseId]).catch(error => {
      this.errorService.handleNavigationError(error, `/student/learn/course/${courseId}`);
    });
  }

  viewCourseDetail(courseId: string): void {
    console.log('🔧 Learning Interface - View course detail:', courseId);
    this.router.navigate(['/courses', courseId]).catch(error => {
      this.errorService.handleNavigationError(error, `/courses/${courseId}`);
    });
  }

  // Enhanced features
  formatStudyTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} phút`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  toggleFavorite(courseId: string): void {
    const courses = this.enrolledCourses();
    const updatedCourses = courses.map(course => 
      course.id === courseId 
        ? { ...course, isFavorite: !course.isFavorite }
        : course
    );
    this.enrolledCourses.set(updatedCourses);
    
    const course = courses.find(c => c.id === courseId);
    if (course) {
      this.errorService.showSuccess(
        course.isFavorite ? 'Đã thêm vào yêu thích' : 'Đã xóa khỏi yêu thích',
        'favorite'
      );
    }
  }

  viewNotes(courseId: string): void {
    this.router.navigate(['/student/notes', courseId]).catch(error => {
      this.errorService.handleNavigationError(error, `/student/notes/${courseId}`);
    });
  }

  viewBookmarks(courseId: string): void {
    this.router.navigate(['/student/bookmarks', courseId]).catch(error => {
      this.errorService.handleNavigationError(error, `/student/bookmarks/${courseId}`);
    });
  }

  downloadCertificate(courseId: string): void {
    const course = this.enrolledCourses().find(c => c.id === courseId);
    if (course?.certificateAvailable) {
      // Simulate certificate download
      const link = document.createElement('a');
      link.href = `/certificates/${courseId}.pdf`;
      link.download = `certificate-${course.title}.pdf`;
      link.click();
      this.errorService.showSuccess('Chứng chỉ đang được tải xuống', 'certificate');
    } else {
      this.errorService.showWarning('Chứng chỉ chưa có sẵn cho khóa học này', 'certificate');
    }
  }

  getUpcomingDeadlines(): EnrolledCourse[] {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    return this.enrolledCourses().filter(course =>
      course.upcomingDeadlines?.some(deadline =>
        deadline >= today && deadline <= nextWeek
      ) || false
    );
  }

  getTotalStudyTime(): number {
    return this.enrolledCourses().reduce((total, course) => total + (course.studyTime || 0), 0);
  }

  getAverageScore(): number {
    const courses = this.enrolledCourses().filter(course => (course.averageScore || 0) > 0);
    if (courses.length === 0) return 0;
    return courses.reduce((sum, course) => sum + (course.averageScore || 0), 0) / courses.length;
  }
}