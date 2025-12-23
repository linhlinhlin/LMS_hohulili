import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { LearningService } from '../services/learning.service';
import { LessonContentComponent } from '../components/lesson-content/lesson-content.component';
import { firstValueFrom, catchError, of } from 'rxjs';
import { LessonApi } from '../../../api/client/lesson.api';
import { QuizApi } from '../../../api/endpoints/quiz.api';
import { VideoProgressApi } from '../../../api/client/video-progress.api';

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
  private quizApi = inject(QuizApi);
  private videoProgressApi = inject(VideoProgressApi);

  // Local UI state
  sidebarCollapsed = signal(false);
  searchQuery = signal('');
  isMobileView = signal(false);
  showMobileSidebar = signal(false);

  // Video progress tracking for 75% rule
  canCompleteCurrentLesson = signal<boolean>(true); // Default true for non-video lessons
  videoProgressMessage = signal<string>('');

  // Section completion tracking
  completedSections = signal<Set<string>>(new Set<string>());

  // Section collapse state - track which sections are expanded
  expandedSections = signal<Set<string>>(new Set<string>());

  // Lesson collapse state - track which lessons are expanded (to show sections)
  expandedLessons = signal<Set<string>>(new Set<string>());

  // Current section index for sidebar sync
  currentSectionIndex = 0;

  // Quiz availability - track which lessons have quizzes
  lessonsWithQuiz = signal<Set<string>>(new Set<string>());

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

    // Check for quizzes for all lessons
    this.checkAllLessonsForQuizzes();
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
  // Navigation
  previousLesson(): void {
    const currentLesson = this.currentLesson();
    if (currentLesson?.sections && currentLesson.sections.length > 0) {
      if (this.currentSectionIndex > 0) {
        this.currentSectionIndex--;
        return;
      }
    }
    this.learningService.goToPreviousLesson();
    // Reset section index for new lesson (handled in onLessonSelect/loadLesson but good to be explicit if needed)
    this.currentSectionIndex = 0;
    this.updateUrlForCurrentLesson();
  }

  async nextLesson(): Promise<void> {
    const currentLesson = this.currentLesson();
    
    // Check if we're navigating within sections of current lesson
    if (currentLesson?.sections && currentLesson.sections.length > 0) {
      if (this.currentSectionIndex < currentLesson.sections.length - 1) {
        // 🔒 CHECK 75% RULE before going to next section
        const currentSection = currentLesson.sections[this.currentSectionIndex];
        
        if (currentSection.type === 'VIDEO' && currentSection.videoUrl) {
          console.log('[CourseLearning] Checking 75% rule for VIDEO section:', currentSection.id);
          
          try {
            const progressCheck = await firstValueFrom(
              this.videoProgressApi.canProceedToNext(currentSection.id)
            );

            if (progressCheck.success && progressCheck.data) {
              if (!progressCheck.data.canProceed) {
                // Chưa đủ 75%
                const currentProgress = progressCheck.data.currentProgress || 0;
                const remaining = 75 - currentProgress;
                alert(
                  `🔒 Bạn cần xem thêm ${remaining.toFixed(0)}% video để chuyển sang phần tiếp theo.\n` +
                  `Tiến độ hiện tại: ${currentProgress.toFixed(0)}%`
                );
                return; // Block navigation
              }
              console.log('[CourseLearning] Video progress sufficient, proceeding to next section');
            }
          } catch (error) {
            console.error('[CourseLearning] Failed to check video progress:', error);
            alert('Không thể kiểm tra tiến độ video. Vui lòng thử lại.');
            return; // Block navigation on error
          }
        }
        
        // All checks passed, proceed to next section
        this.currentSectionIndex++;
        return;
      }
    }
    
    // No more sections, go to next lesson
    this.learningService.goToNextLesson();
    this.currentSectionIndex = 0;
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
    // Lấy lesson và section hiện tại
    const lesson = this.currentLesson();
    if (!lesson) {
      console.log('[CourseLearning] onMarkComplete: no current lesson');
      return;
    }

    // Nếu lesson có sections, đánh dấu hoàn thành section hiện tại
    if (lesson.sections && lesson.sections.length > 0) {
      const currentSection = lesson.sections[this.currentSectionIndex];
      if (!currentSection) {
        console.error('[CourseLearning] No current section found');
        return;
      }

      console.log('[CourseLearning] Marking section as complete:', currentSection.id);

      // 🔒 CHECK 75% RULE for VIDEO sections
      if (currentSection.type === 'VIDEO' && currentSection.videoUrl) {
        console.log('[CourseLearning] Section is VIDEO, checking 75% rule...');
        
        try {
          const progressCheck = await firstValueFrom(
            this.videoProgressApi.canProceedToNext(currentSection.id)
          );

          if (progressCheck.success && progressCheck.data) {
            if (!progressCheck.data.canProceed) {
              // Chưa đủ 75%
              const currentProgress = progressCheck.data.currentProgress || 0;
              const remaining = 75 - currentProgress;
              alert(
                `🔒 Bạn cần xem thêm ${remaining.toFixed(0)}% video để hoàn thành phần này.\n` +
                `Tiến độ hiện tại: ${currentProgress.toFixed(0)}%`
              );
              return;
            }
            console.log('[CourseLearning] Video progress sufficient (>=75%), marking as complete...');
          }
        } catch (error) {
          console.error('[CourseLearning] Failed to check video progress:', error);
          alert('Không thể kiểm tra tiến độ video. Vui lòng thử lại.');
          return;
        }
      }

      // Mark section as completed
      this.markSectionAsCompleted(currentSection.id);
      
      // Show success message
      alert(`✅ Đã hoàn thành phần: ${currentSection.title}`);
      
      // Auto advance to next section if available
      if (this.currentSectionIndex < lesson.sections.length - 1) {
        this.currentSectionIndex++;
      }
      
      return;
    }

    // No sections - mark lesson as complete (original logic)
    console.log('[CourseLearning] No sections, marking lesson as complete');

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

    // 🔒 CHECK 75% RULE for VIDEO lessons
    if (this.hasVideoContent(lesson)) {
      console.log('[CourseLearning] Lesson has video, checking 75% rule...');
      
      // Get section ID from lesson's first video section
      const videoSection = this.getFirstVideoSection(lesson);
      if (!videoSection) {
        console.warn('[CourseLearning] Video lesson but no video section found');
        alert('Không tìm thấy video trong bài học này.');
        return;
      }

      try {
        const progressCheck = await firstValueFrom(
          this.videoProgressApi.canProceedToNext(videoSection.id)
        );

        console.log('[CourseLearning] Video progress check:', progressCheck);

        if (progressCheck.success && progressCheck.data) {
          if (!progressCheck.data.canProceed) {
            // Chưa đủ 75%
            const currentProgress = progressCheck.data.currentProgress || 0;
            const remaining = 75 - currentProgress;
            alert(
              `🔒 Bạn cần xem thêm ${remaining.toFixed(0)}% video để hoàn thành bài học.\n` +
              `Tiến độ hiện tại: ${currentProgress.toFixed(0)}%`
            );
            return;
          }
          // Đã đủ 75%, cho phép tiếp tục
          console.log('[CourseLearning] Video progress sufficient (>=75%), proceeding...');
        }
      } catch (error) {
        console.error('[CourseLearning] Failed to check video progress:', error);
        alert('Không thể kiểm tra tiến độ video. Vui lòng thử lại.');
        return;
      }
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

  // Helper: Check if lesson has video content
  private hasVideoContent(lesson: any): boolean {
    // Check if lesson has videoUrl (fallback)
    if (lesson.videoUrl) {
      return true;
    }
    // Check if lesson has sections with VIDEO type
    if (lesson.sections && lesson.sections.length > 0) {
      return lesson.sections.some((s: any) => s.type === 'VIDEO' && s.videoUrl);
    }
    return false;
  }

  // Helper: Get first video section from lesson
  private getFirstVideoSection(lesson: any): any {
    if (lesson.sections && lesson.sections.length > 0) {
      return lesson.sections.find((s: any) => s.type === 'VIDEO' && s.videoUrl);
    }
    return null;
  }

  // Section completion helpers
  isSectionCompleted(sectionId: string): boolean {
    return this.completedSections().has(sectionId);
  }

  private markSectionAsCompleted(sectionId: string): void {
    this.completedSections.update(completed => {
      const newSet = new Set(completed);
      newSet.add(sectionId);
      // Save to localStorage
      localStorage.setItem('completed_sections', JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  }

  private loadCompletedSections(): void {
    try {
      const saved = localStorage.getItem('completed_sections');
      if (saved) {
        const sections = JSON.parse(saved);
        this.completedSections.set(new Set(sections));
      }
    } catch (error) {
      console.error('[CourseLearning] Failed to load completed sections:', error);
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
        newExpanded.clear(); // Collapse others
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
        newExpanded.clear(); // Maintain accordion behavior
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

  // Section type label for sidebar
  getSectionTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'VIDEO': 'Video',
      'TEXT': 'Văn bản',
      'QUIZ': 'Trắc nghiệm',
      'FILE': 'Tài liệu',
      'ASSIGNMENT': 'Bài tập'
    };
    return labels[type] || type;
  }

  // Lesson expansion for Level 3 sections
  isLessonExpanded(lessonId: string): boolean {
    return this.expandedLessons().has(lessonId);
  }

  toggleLesson(lesson: any): void {
    // Always select the lesson first
    this.onLessonSelect(lesson.id);

    // Toggle expansion if lesson has sections
    this.expandedLessons.update(expanded => {
      const newExpanded = new Set(expanded);
      if (newExpanded.has(lesson.id)) {
        newExpanded.delete(lesson.id);
      } else {
        // Collapse other lessons, expand this one
        newExpanded.clear();
        newExpanded.add(lesson.id);
      }
      return newExpanded;
    });
  }

  selectSectionInSidebar(sectionIndex: number, event: Event): void {
    event.stopPropagation();
    this.currentSectionIndex = sectionIndex;
  }

  // Handle section index change from lesson-content component
  onSectionIndexChange(index: number): void {
    this.currentSectionIndex = index;
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

  // Quiz functionality
  checkAllLessonsForQuizzes(): void {
    const allLessons = this.learningService.allLessons();
    allLessons.forEach(lesson => {
      // Only check for quiz if lesson type is QUIZ
      if (lesson.lessonType === 'QUIZ') {
        this.checkLessonQuiz(lesson.id);
      }
    });
  }

  checkLessonQuiz(lessonId: string): void {
    this.quizApi.getQuizByLessonId(lessonId)
      .pipe(
        catchError(() => of(null))
      )
      .subscribe(response => {
        if (response && response.id) {
          this.lessonsWithQuiz.update(lessons => {
            const newSet = new Set(lessons);
            newSet.add(lessonId);
            return newSet;
          });
        }
      });
  }

  hasQuiz(lessonId: string): boolean {
    return this.lessonsWithQuiz().has(lessonId);
  }

  goToQuiz(lessonId: string, event: Event): void {
    event.stopPropagation(); // Prevent lesson selection
    this.router.navigate(['/student/quiz/take', lessonId]);
  }
}
