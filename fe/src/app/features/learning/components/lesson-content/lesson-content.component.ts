import { Component, input, output, model, computed, ChangeDetectionStrategy, inject } from '@angular/core';

import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { LessonDetail } from '../../models/learning.models';
import { LessonType } from '../../models/lesson-types.enum';

/**
 * Lesson Content Component
 * 
 * Displays the main content of a lesson including:
 * - Video player (if video URL exists)
 * - HTML content
 * - Attachments list
 */
@Component({
  selector: 'app-lesson-content',
  imports: [],
  templateUrl: './lesson-content.component.html',
  styleUrls: ['./lesson-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LessonContentComponent {
  public sanitizer = inject(DomSanitizer);
  private router = inject(Router);

  // Expose enum to template
  LessonType = LessonType;

  // Signal inputs (Angular v20+)
  readonly lesson = input.required<LessonDetail>();
  readonly isCompleted = input(false);
  readonly hasQuiz = input(false);

  // Two-way binding with model (Angular v20+)
  readonly sectionIndex = model(0);

  // Output functions (Angular v20+)
  readonly markComplete = output<void>();
  readonly videoStateChange = output<any>();
  readonly videoEnded = output<void>();
  readonly goToQuiz = output<void>();

  // Computed signals for derived state
  readonly hasSections = computed(() => {
    const ls = this.lesson();
    return !!ls?.sections && ls.sections.length > 0;
  });

  readonly currentSection = computed(() => {
    const ls = this.lesson();
    if (!ls?.sections || ls.sections.length === 0) {
      return null;
    }
    return ls.sections[this.sectionIndex()] || null;
  });

  readonly canGoPreviousSection = computed(() => this.sectionIndex() > 0);

  readonly canGoNextSection = computed(() => {
    const ls = this.lesson();
    return this.hasSections() && this.sectionIndex() < ls.sections!.length - 1;
  });

  isYouTubeVideo(): boolean {
    const currentSec = this.currentSection();
    const url = currentSec?.videoUrl || this.lesson()?.videoUrl;
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
  }

  getYouTubeEmbedUrl(): SafeResourceUrl {
    const currentSec = this.currentSection();
    const url = currentSec?.videoUrl || this.lesson()?.videoUrl;
    if (!url) return '';

    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu.be\/)([^"&?\/\s]{11})/;
    const match = url.match(youtubeRegex);
    const videoId = match && match[1] ? match[1] : '';

    if (videoId) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`
      );
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  getSafeHtmlContent(): any {
    return this.sanitizer.bypassSecurityTrustHtml(this.lesson()?.content || '');
  }

  // Get sanitized HTML for any content (used by template)
  getSanitizedHtml(content: string | undefined): any {
    return this.sanitizer.bypassSecurityTrustHtml(content || '');
  }

  // Video player events
  onVideoPlay(): void {
  }

  onVideoPause(): void {
  }

  onVideoEnd(): void {
    this.videoEnded.emit();
  }

  onVideoError(error: any): void {
  }

  onVideoTimeUpdate(event: Event): void {
    // Track video progress if needed
  }

  // Mark lesson as complete
  onMarkComplete(): void {
    this.markComplete.emit();
  }

  onGoToQuiz(): void {
    const ls = this.lesson();
    const currentUrl = this.router.url;
    this.router.navigate(['/student/quiz/take', ls.id], {
      queryParams: {
        title: ls.title,
        returnUrl: currentUrl
      }
    });
  }

  getLessonTypeLabel(): string {
    const labels: Record<string, string> = {
      'LECTURE': 'Bài giảng',
      'READING': 'Đọc',
      'QUIZ': 'Kiểm tra',
      'ASSIGNMENT': 'Bài tập',
      'LAB': 'Thực hành'
    };
    return labels[this.lesson().lessonType as string] || 'Bài học';
  }

  // Format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  previousSection(): void {
    if (this.canGoPreviousSection()) {
      this.sectionIndex.update(v => v - 1);
    }
  }

  nextSection(): void {
    if (this.canGoNextSection()) {
      this.sectionIndex.update(v => v + 1);
    }
  }

  selectSection(index: number): void {
    const ls = this.lesson();
    if (ls?.sections && index >= 0 && index < ls.sections.length) {
      this.sectionIndex.set(index);
    }
  }

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
}
