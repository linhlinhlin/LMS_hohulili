import { Component, signal, computed, inject, effect, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CourseService } from '../../state/course.service';
import { AuthService } from '../../core/services/auth.service';
import { ExtendedCourse, EnrolledCourse } from '../../shared/types/course.types';
import { ErrorHandlingService } from '../../shared/services/error-handling.service';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { CourseApi } from '../../api/client/course.api';
import { CourseSummary } from '../../api/types/course.types';

interface CourseFilter {
  status: string[];
  category: string[];
  level: string[];
  sortBy: 'title' | 'progress' | 'enrolledAt' | 'lastAccessed';
  sortOrder: 'asc' | 'desc';
}

@Component({
  selector: 'app-my-courses',
  imports: [CommonModule, RouterModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  templateUrl: './my-courses.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyCoursesComponent {
  protected courseService = inject(CourseService);
  protected authService = inject(AuthService);
  private router = inject(Router);
  private errorService = inject(ErrorHandlingService);
  private courseApi = inject(CourseApi);

  // Loading state
  isLoading = signal<boolean>(true);

  // Live enrolled courses data
  enrolledCourses = signal<EnrolledCourse[]>([]);

  filters: CourseFilter = {
    status: [],
    category: [],
    level: [],
    sortBy: 'lastAccessed',
    sortOrder: 'desc'
  };

  // Computed values
  inProgressCourses = computed(() =>
    this.enrolledCourses().filter(course => course.status === 'in-progress')
  );

  completedCourses = computed(() =>
    this.enrolledCourses().filter(course => course.status === 'completed')
  );

  certificatesCount = computed(() =>
    this.enrolledCourses().filter(course => course.certificate).length
  );

  filteredCourses = computed(() => {
    let courses = [...this.enrolledCourses()];

    // Apply status filter
    if (this.filters.status.length > 0 && this.filters.status[0]) {
      courses = courses.filter(course => course.status === this.filters.status[0]);
    }

    // Apply category filter
    if (this.filters.category.length > 0 && this.filters.category[0]) {
      courses = courses.filter(course => course.category === this.filters.category[0]);
    }

    // Apply sorting
    courses.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (this.filters.sortBy) {
        case 'title':
          aValue = a.title;
          bValue = b.title;
          break;
        case 'progress':
          aValue = a.progress;
          bValue = b.progress;
          break;
        case 'enrolledAt':
          aValue = a.enrolledAt;
          bValue = b.enrolledAt;
          break;
        case 'lastAccessed':
        default:
          aValue = a.lastAccessed;
          bValue = b.lastAccessed;
          break;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return this.filters.sortOrder === 'desc'
          ? bValue.localeCompare(aValue)
          : aValue.localeCompare(bValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return this.filters.sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
      }

      if (aValue instanceof Date && bValue instanceof Date) {
        return this.filters.sortOrder === 'desc'
          ? bValue.getTime() - aValue.getTime()
          : aValue.getTime() - bValue.getTime();
      }

      return 0;
    });

    return courses;
  });

  constructor() {
    // Initialize component data when created
    effect(() => {
      if (!this.isLoading()) {
        this.loadEnrolledCourses();
      }
    });
    // Trigger initial load
    this.loadEnrolledCourses();
  }

  private async loadEnrolledCourses(): Promise<void> {
    try {
      this.isLoading.set(true);
      // Always use page: 1 for backend API (Spring expects page >= 1)
      this.courseApi.enrolledCourses({ page: 1, limit: 10 }).subscribe({
        next: (res) => {
          const items = (res.data || []) as CourseSummary[];
          const mapped: EnrolledCourse[] = items.map((c) => this.mapCourseSummaryToEnrolled(c));
          this.enrolledCourses.set(mapped);
          // KhĂ´ng hiá»ƒn thá»‹ thĂ´ng bĂ¡o táº£i thĂ nh cĂ´ng Ä‘á»ƒ trĂ¡nh popup vĂ  log lá»—i
        },
        error: (err) => {
          this.errorService.handleApiError(err, 'courses');
        },
        complete: () => this.isLoading.set(false)
      });
    } catch (error) {
      this.errorService.handleApiError(error, 'courses');
      this.isLoading.set(false);
    }
  }

  private mapCourseSummaryToEnrolled(c: CourseSummary): EnrolledCourse {
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      shortDescription: c.description,
      instructor: typeof c.teacherName === 'string' ? c.teacherName : '',
      thumbnail: '/assets/images/course-placeholder.jpg',
      progress: 0,
      totalLessons: 0,
      completedLessons: 0,
      duration: 'â€”',
      lastAccessed: new Date(c.createdAt),
      status: c.status === 'APPROVED' ? 'enrolled' : 'not-started',
      category: undefined,
      rating: undefined
    };
  }

  formatStudyTime(minutes: number | undefined): string {
    const mins = minutes || 0;
    if (mins < 60) {
      return `${mins} phĂºt`;
    }
    const hours = Math.floor(mins / 60);
    const remainingMinutes = mins % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  applyFilters(): void {
    // Filters are applied automatically through computed signal
    console.log('Applying filters...');
  }

  clearFilters(): void {
    this.filters = {
      status: [],
      category: [],
      level: [],
      sortBy: 'lastAccessed',
      sortOrder: 'desc'
    };
  }

  continueLearning(courseId: string): void {
    console.log('đŸ”§ My Courses - Continue learning course:', courseId);
    this.router.navigate(['/student/learn/course', courseId]).catch(error => {
      this.errorService.handleNavigationError(error, `/student/learn/course/${courseId}`);
    });
  }

  viewCourseDetail(courseId: string): void {
    console.log('đŸ”§ My Courses - View course detail:', courseId);
    this.router.navigate(['/courses', courseId]).catch(error => {
      this.errorService.handleNavigationError(error, `/courses/${courseId}`);
    });
  }

  viewCertificate(courseId: string): void {
    console.log('đŸ”§ My Courses - View certificate:', courseId);
    // Open certificate in new tab
    window.open(`/certificates/${courseId}`, '_blank');
  }

  goToBrowseCourses(): void {
    console.log('đŸ”§ My Courses - Go to browse courses');
    this.router.navigate(['/courses']).catch(error => {
      this.errorService.handleNavigationError(error, '/courses');
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'enrolled':
        return 'text-blue-800 bg-blue-100';
      case 'in-progress':
        return 'text-green-800 bg-green-100';
      case 'completed':
        return 'text-purple-800 bg-purple-100';
      case 'paused':
        return 'text-orange-800 bg-orange-100';
      default:
        return 'text-gray-800 bg-gray-100';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'enrolled':
        return 'ÄĂ£ Ä‘Äƒng kĂ½';
      case 'in-progress':
        return 'Äang há»c';
      case 'completed':
        return 'HoĂ n thĂ nh';
      case 'paused':
        return 'Táº¡m dá»«ng';
      default:
        return 'KhĂ´ng xĂ¡c Ä‘á»‹nh';
    }
  }

  formatDate(date: string | Date): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('vi-VN');
  }

  // Enhanced features
  toggleFavorite(courseId: string): void {
    const courses = this.enrolledCourses();
    const updatedCourses = courses.map(course =>
      course.id === courseId
        ? { ...course, isFavorite: !course.isFavorite }
        : course
    );
    this.enrolledCourses.set(updatedCourses);
    const course = updatedCourses.find(c => c.id === courseId);
    if (course) {
      this.errorService.showSuccess(
        course.isFavorite ? 'ÄĂ£ thĂªm vĂ o yĂªu thĂ­ch' : 'ÄĂ£ xĂ³a khá»i yĂªu thĂ­ch',
        'favorite'
      );
    }
  }

  pauseCourse(courseId: string): void {
    const courses = this.enrolledCourses();
    const updatedCourses = courses.map(course =>
      course.id === courseId
        ? { ...course, status: 'paused' as const }
        : course
    );
    this.enrolledCourses.set(updatedCourses);
    this.errorService.showSuccess('KhĂ³a há»c Ä‘Ă£ Ä‘Æ°á»£c táº¡m dá»«ng', 'course');
  }

  resumeCourse(courseId: string): void {
    const courses = this.enrolledCourses();
    const updatedCourses = courses.map(course =>
      course.id === courseId
        ? { ...course, status: 'in-progress' as const }
        : course
    );
    this.enrolledCourses.set(updatedCourses);
    this.errorService.showSuccess('KhĂ³a há»c Ä‘Ă£ Ä‘Æ°á»£c tiáº¿p tá»¥c', 'course');
  }

  downloadCertificate(courseId: string): void {
    const course = this.enrolledCourses().find(c => c.id === courseId);
    if (course?.certificateInfo && course.certificateInfo.certificateUrl) {
      // Simulate certificate download
      const link = document.createElement('a');
      link.href = course.certificateInfo.certificateUrl;
      link.download = `certificate-${course.title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      this.errorService.showSuccess('Chá»©ng chá»‰ Ä‘ang Ä‘Æ°á»£c táº£i xuá»‘ng', 'certificate');
    } else {
      this.errorService.addError({
        message: 'KhĂ´ng tĂ¬m tháº¥y chá»©ng chá»‰ hoáº·c link táº£i.',
        type: 'error',
        context: 'certificate'
      });
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

  getUpcomingDeadlines(): EnrolledCourse[] {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    return this.enrolledCourses().filter(course =>
      course.upcomingDeadlines?.some(deadline =>
        deadline >= today && deadline <= nextWeek
      ) || false
    );
  }

  getStudyStreak(): number {
    return Math.max(...this.enrolledCourses().map(course => course.studyStreak || 0));
  }

  getTotalStudyTime(): number {
    return this.enrolledCourses().reduce((total, course) => total + (course.studyTime || 0), 0);
  }

  getTotalNotes(): number {
    return this.enrolledCourses().reduce((total, course) => total + (course.notesCount || 0), 0);
  }

  getAverageScore(): number {
    const courses = this.enrolledCourses().filter(course => (course.averageScore || 0) > 0);
    if (courses.length === 0) return 0;
    return courses.reduce((sum, course) => sum + (course.averageScore || 0), 0) / courses.length;
  }
}

