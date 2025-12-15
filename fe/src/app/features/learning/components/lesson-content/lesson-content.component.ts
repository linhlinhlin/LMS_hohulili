import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lesson-content.component.html',
  styleUrls: ['./lesson-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LessonContentComponent {
  public sanitizer = inject(DomSanitizer);
  private router = inject(Router);

  // Expose enum to template
  LessonType = LessonType;

  @Input({ required: true }) lesson!: LessonDetail;
  @Input() isCompleted = false;
  @Input() hasQuiz = false;

  // Section navigation - controlled from parent (sidebar)
  @Input() sectionIndex = 0;
  @Output() sectionIndexChange = new EventEmitter<number>();

  @Output() markComplete = new EventEmitter<void>();
  @Output() videoStateChange = new EventEmitter<any>();
  @Output() videoEnded = new EventEmitter<void>();
  @Output() goToQuiz = new EventEmitter<void>();

  // Computed current section index (use input if provided)
  get currentSectionIndex(): number {
    return this.sectionIndex;
  }

  set currentSectionIndex(value: number) {
    this.sectionIndex = value;
    this.sectionIndexChange.emit(value);
  }

  // Check if video is YouTube
  isYouTubeVideo(): boolean {
    // Check section video first, then lesson video
    const url = this.currentSection?.videoUrl || this.lesson?.videoUrl;
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
  }

  // Get safe YouTube embed URL
  getYouTubeEmbedUrl(): SafeResourceUrl {
    // Get video URL from section or lesson
    const url = this.currentSection?.videoUrl || this.lesson?.videoUrl;
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

  // Get safe HTML content
  getSafeHtmlContent(): any {
    return this.sanitizer.bypassSecurityTrustHtml(this.lesson?.content || '');
  }

  // Get sanitized HTML for any content (used by template)
  getSanitizedHtml(content: string | undefined): any {
    // Debug: Check if content has images
    if (content && content.includes('<img')) {
      console.log('[LessonContent] Rendering HTML with image:', content.substring(0, 100) + '...');
    } else if (content) {
      console.log('[LessonContent] Rendering HTML (no image found in first check):', content.substring(0, 50) + '...');
    }
    return this.sanitizer.bypassSecurityTrustHtml(content || '');
  }

  // Video player events
  onVideoPlay(): void {
    console.log('Video playing');
  }

  onVideoPause(): void {
    console.log('Video paused');
  }

  onVideoEnd(): void {
    console.log('Video ended');
    this.videoEnded.emit();
  }

  onVideoError(error: any): void {
    console.error('Video error:', error);
  }

  onVideoTimeUpdate(event: Event): void {
    // Track video progress if needed
    const video = event.target as HTMLVideoElement;
    console.log('Video time:', video.currentTime);
  }

  // Mark lesson as complete
  onMarkComplete(): void {
    this.markComplete.emit();
  }

  // Go to quiz
  onGoToQuiz(): void {
    console.log('🎯 Quiz button clicked!');
    // Get current URL to use as return URL
    const currentUrl = this.router.url;
    this.router.navigate(['/student/quiz/take', this.lesson.id], {
      queryParams: {
        title: this.lesson.title,
        returnUrl: currentUrl
      }
    });
  }

  // Get lesson type label in Vietnamese
  getLessonTypeLabel(): string {
    const labels: Record<string, string> = {
      'LECTURE': 'Bài giảng',
      'READING': 'Đọc',
      'QUIZ': 'Kiểm tra',
      'ASSIGNMENT': 'Bài tập',
      'LAB': 'Thực hành'
    };
    return labels[this.lesson.lessonType as string] || 'Bài học';
  }

  // Format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Section navigation
  get currentSection() {
    if (!this.lesson?.sections || this.lesson.sections.length === 0) {
      return null;
    }
    return this.lesson.sections[this.currentSectionIndex] || null;
  }

  get hasSections(): boolean {
    return !!this.lesson?.sections && this.lesson.sections.length > 0;
  }

  get canGoPreviousSection(): boolean {
    return this.currentSectionIndex > 0;
  }

  get canGoNextSection(): boolean {
    return this.hasSections && this.currentSectionIndex < this.lesson.sections!.length - 1;
  }

  previousSection(): void {
    if (this.canGoPreviousSection) {
      this.currentSectionIndex--;
    }
  }

  nextSection(): void {
    if (this.canGoNextSection) {
      this.currentSectionIndex++;
    }
  }

  selectSection(index: number): void {
    if (this.lesson?.sections && index >= 0 && index < this.lesson.sections.length) {
      this.currentSectionIndex = index;
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
