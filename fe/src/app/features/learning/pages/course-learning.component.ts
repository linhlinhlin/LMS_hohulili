import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { LearningService } from '../services/learning.service';
import { LessonContentComponent } from '../components/lesson-content/lesson-content.component';

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

    // Load specific lesson if provided
    if (lessonId) {
      this.learningService.loadLesson(lessonId);
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
  onMarkComplete(): void {
    this.learningService.markCurrentLessonComplete();
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
