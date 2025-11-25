import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { LearningService } from '../services/learning.service';
import { LessonContentComponent } from '../components/lesson-content/lesson-content.component';
import { firstValueFrom } from 'rxjs';
import { LessonApi } from '../../../api/client/lesson.api';

/**
 * Course Learning Component
 * 
 * Main container for the learning interface.
 * Manages layout, sidebar state, and coordinates child components.
 */
@Component({
  selector: 'app-course-learning',
  standalone: true,
  imports: [CommonModule, RouterModule, LessonContentComponent],
  templateUrl: './course-learning.component.html',
  styleUrls: ['./course-learning.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseLearningComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  protected learningService = inject(LearningService);
  private lessonApi = inject(LessonApi);

  // Local UI state
  sidebarCollapsed = signal(false);
  searchQuery = signal('');
  isMobileView = signal(false);
  showMobileSidebar = signal(false);
  
  // Section collapse state - track which sections are expanded
  expandedSections = signal<Set<string>>(new Set<string>());

  // Computed from service
  course = this.learningService.course;
  sections = this.learningService.sections;
  currentLesson = this.learningService.currentLesson;
  isLoadingCourse = this.learningService.isLoadingCourse;
  isLoadingLesson = this.learningService.isLoadingLesson;
  courseError = this.learningService.courseError;
  lessonError = this.learningService.lessonError;
  canGoPrevious = this.learningService.canGoPrevious;
  canGoNext = this.learningService.canGoNext;
  progressPercentage = this.learningService.progressPercentage;

  // Filtered sections based on search
  filteredSections = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.sections();

    return this.sections()
      .map(section => ({
        ...section,
        lessons: section.lessons.filter(lesson =>
          lesson.title.toLowerCase().includes(query) ||
          lesson.description.toLowerCase().includes(query)
        )
      }))
      .filter(section => section.lessons.length > 0);
  });

  ngOnInit(): void {
    this.checkMobileView();
    this.loadCourseFromRoute();
    
    // Expand first section by default
    const firstSection = this.sections()[0];
    if (firstSection) {
      this.expandedSections.update(expanded => {
        const newExpanded = new Set(expanded);
        newExpanded.add(firstSection.id);
        return newExpanded;
      });
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkMobileView();
  }

  private checkMobileView(): void {
    this.isMobileView.set(window.innerWidth < 768);
    if (!this.isMobileView()) {
      this.showMobileSidebar.set(false);
    }
  }

  loadCourseFromRoute(): void {
    const courseId = this.route.snapshot.paramMap.get('courseId') || this.route.snapshot.paramMap.get('id');
    const lessonId = this.route.snapshot.paramMap.get('lessonId');

    if (!courseId) {
      console.error('No course ID in route');
      return;
    }

    // Load course
    this.learningService.loadCourse(courseId);

    // Load specific lesson if provided, or auto-select next uncompleted lesson
    if (lessonId) {
      this.learningService.loadLesson(lessonId);
    } else {
      // Auto-select next uncompleted lesson after course loads
      this.selectNextUncompletedLesson();
    }
  }

  private selectNextUncompletedLesson(): void {
    const sections = this.learningService.sections();
    const allLessons = sections.flatMap(s => s.lessons);

    // Find first uncompleted lesson
    const nextLesson = allLessons.find(l => !l.isCompleted) ?? allLessons[0];

    if (nextLesson) {
      console.log('[CourseLearning] Auto-selecting next uncompleted lesson:', nextLesson.id);
      this.learningService.loadLesson(nextLesson.id);

      // Update URL
      const courseId = this.course()?.id;
      if (courseId) {
        this.router.navigate(
          ['/student/learn/course', courseId, 'lesson', nextLesson.id],
          { replaceUrl: true }
        );
      }
    }
  }

  // Sidebar actions
  toggleSidebar(): void {
    if (this.isMobileView()) {
      this.showMobileSidebar.update(show => !show);
    } else {
      this.sidebarCollapsed.update(collapsed => !collapsed);
    }
  }

  closeMobileSidebar(): void {
    if (this.isMobileView()) {
      this.showMobileSidebar.set(false);
    }
  }

  // Search
  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  // Lesson selection
  onLessonSelect(lessonId: string): void {
    const lesson = this.learningService.allLessons().find(l => l.id === lessonId);
    if (lesson) {
      this.learningService.selectLesson(lesson);
      this.closeMobileSidebar();
      
      // Update URL
      const courseId = this.course()?.id;
      if (courseId) {
        this.router.navigate(
          ['/student/learn/course', courseId, 'lesson', lessonId],
          { replaceUrl: true }
        );
      }
    }
  }

  // Navigation
  previousLesson(): void {
    this.learningService.goToPreviousLesson();
    this.updateUrlForCurrentLesson();
  }

  nextLesson(): void {
    this.learningService.goToNextLesson();
    this.updateUrlForCurrentLesson();
  }

  private updateUrlForCurrentLesson(): void {
    const courseId = this.course()?.id;
    const lessonId = this.currentLesson()?.id;
    if (courseId && lessonId) {
      this.router.navigate(
        ['/student/learn/course', courseId, 'lesson', lessonId],
        { replaceUrl: true }
      );
    }
  }

  // Progress
  async onMarkComplete(): Promise<void> {
  // Lấy lesson hiện tại từ signal currentLesson()
  const lesson = this.currentLesson();
  if (!lesson) {
    console.log('[CourseLearning] onMarkComplete: no current lesson');
    return;
  }

  // Nếu đã completed rồi thì không gọi API nữa
  try {
    const alreadyCompleted = this.learningService
      .isLessonCompleted(lesson.id)();
    if (alreadyCompleted) {
      console.log('[CourseLearning] onMarkComplete: lesson already completed');
      return;
    }
  } catch {
    // Nếu lỡ isLessonCompleted lỗi / chưa có thì bỏ qua check này
  }

  console.log('[CourseLearning] onMarkComplete: START, lessonId =', lesson.id);

  // 🔍 DEBUG: Check token
  const token = localStorage.getItem('lms_access_token');
  console.log('[CourseLearning] Token check:', {
    tokenExists: !!token,
    tokenLength: token?.length,
    tokenPrefix: token?.substring(0, 20) + '...'
  });

  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('[CourseLearning] JWT Payload:', {
        sub: payload.sub,
        roles: payload.roles || payload.authorities,
        exp: new Date(payload.exp * 1000).toISOString(),
        isExpired: payload.exp * 1000 < Date.now()
      });
    } catch (e) {
      console.error('[CourseLearning] Cannot decode JWT:', e);
    }
  }

  try {
    console.log('[CourseLearning] BEFORE API CALL');

    const apiResult = await firstValueFrom(
      this.lessonApi.markLessonComplete(lesson.id)
    );

    console.log('[CourseLearning] API call successful, response:', apiResult);

    // ✅ Cập nhật state phía FE qua service chung
    this.learningService.markCurrentLessonComplete();

    // (tuỳ bạn) có thể expand section hiện tại để user thấy rõ
    this.expandCurrentLessonSection();

    console.log('[CourseLearning] Lesson marked as completed in UI:', lesson.id);
  } catch (error: any) {
    console.error('[CourseLearning] Failed to mark lesson as completed:', error);
    console.error('[CourseLearning] Error details:', {
      status: error?.status,
      statusText: error?.statusText,
      message: error?.message,
      url: error?.url,
      error: error?.error
    });

    if (error?.status === 403) {
      console.error('[CourseLearning] 403 Forbidden - Check token and roles');
    }

    // Ở CourseLearningComponent không có _error, nên bạn có thể:
    // - dùng 1 signal error riêng
    // - hoặc tạm thời chỉ alert:
    alert('Không thể cập nhật trạng thái hoàn thành. Vui lòng thử lại.');
  }
}

  // Video events
  onVideoStateChange(state: any): void {
    console.log('Video state changed:', state);
  }

  onVideoEnded(): void {
    console.log('Video ended');
    this.learningService.markCurrentLessonComplete();
    
    // Auto-advance to next lesson if available
    if (this.canGoNext()) {
      setTimeout(() => {
        this.nextLesson();
      }, 1000);
    }
  }

  // Section accordion
  toggleSection(sectionId: string): void {
    this.expandedSections.update(expanded => {
      const newExpanded = new Set(expanded);
      if (newExpanded.has(sectionId)) {
        newExpanded.delete(sectionId);
      } else {
        newExpanded.add(sectionId);
      }
      return newExpanded;
    });
  }

  isSectionExpanded(sectionId: string): boolean {
    return this.expandedSections().has(sectionId);
  }

  // Expand section containing current lesson
  expandCurrentLessonSection(): void {
    const current = this.currentLesson();
    if (current) {
      this.expandedSections.update(expanded => {
        const newExpanded = new Set(expanded);
        newExpanded.add(current.sectionId);
        return newExpanded;
      });
    }
  }

  // Lesson type label
  getLessonTypeLabel(lessonType: any): string {
    const labels: Record<string, string> = {
      'LECTURE': 'Bài giảng',
      'READING': 'Đọc',
      'QUIZ': 'Kiểm tra',
      'ASSIGNMENT': 'Bài tập',
      'LAB': 'Thực hành'
    };
    return labels[lessonType] || 'Bài học';
  }

  // Navigation
  goBack(): void {
    const courseId = this.course()?.id;
    if (courseId) {
      this.router.navigate(['/student/course', courseId]);
    } else {
      this.router.navigate(['/student/my-courses']);
    }
  }

  // Keyboard shortcuts
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    // Ignore if user is typing in an input
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (event.key) {
      case 'ArrowLeft':
        if (this.canGoPrevious()) {
          event.preventDefault();
          this.previousLesson();
        }
        break;
      case 'ArrowRight':
        if (this.canGoNext()) {
          event.preventDefault();
          this.nextLesson();
        }
        break;
      case 'Escape':
        if (this.showMobileSidebar()) {
          event.preventDefault();
          this.closeMobileSidebar();
        }
        break;
    }
  }
}
