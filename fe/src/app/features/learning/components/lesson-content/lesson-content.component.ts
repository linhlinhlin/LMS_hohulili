import { Component, input, output, model, computed, ChangeDetectionStrategy, inject, effect, ElementRef, viewChild, AfterViewInit } from '@angular/core';

import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { LessonDetail } from '../../models/learning.models';
import { LessonType } from '../../models/lesson-types.enum';
import { WatchedSegmentsTracker } from '../../services/watched-segments-tracker.service';
import { HeartbeatTracker } from '../../services/heartbeat-tracker.service';
import { ReadingProgressTracker } from '../../services/reading-progress-tracker.service';
import { VideoProgressApi } from '../../../../api/client/video-progress.api';
import { YouTubePlayerComponent } from '../youtube-player/youtube-player.component';

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
  imports: [YouTubePlayerComponent, CommonModule],
  templateUrl: './lesson-content.component.html',
  styleUrls: ['./lesson-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LessonContentComponent implements AfterViewInit {
  public sanitizer = inject(DomSanitizer);
  private router = inject(Router);
  private tracker = inject(WatchedSegmentsTracker);
  private heartbeat = inject(HeartbeatTracker);
  private readingTracker = inject(ReadingProgressTracker);
  private videoProgressApi = inject(VideoProgressApi);

  /** Reference to text content container for scroll tracking */
  readonly textContentRef = viewChild<ElementRef>('textContent');

  /** Server-confirmed progress for current video section */
  videoProgress = this.tracker.serverProgress;
  videoCompleted = this.tracker.serverCompleted;

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

  /** Reading progress percent (0-100) for current TEXT section */
  readonly readingProgress = computed(() => this.readingTracker.getProgress());

  /** Track section changes to start/stop heartbeat + reading tracker */
  private sectionChangeEffect = effect(() => {
    const section = this.currentSection();
    const lesson = this.lesson();
    if (!section || !lesson) return;

    // Start heartbeat for this section's content type
    this.heartbeat.start(lesson.id, section.id, section.type || 'TEXT');

    // Start reading tracker for TEXT sections (after view renders)
    if (section.type === 'TEXT') {
      setTimeout(() => this.initReadingTracker(), 100);
    } else {
      this.readingTracker.stopTracking();
    }
  });

  ngAfterViewInit(): void {
    // Reading tracker initializes via effect when section changes
  }

  private initReadingTracker(): void {
    const el = this.textContentRef()?.nativeElement;
    const section = this.currentSection();
    const lesson = this.lesson();
    if (!el || !section || !lesson) return;

    this.readingTracker.startTracking(el, lesson.id, section.id, () => {
      // Auto-mark section complete when 80% scrolled
      this.sectionReadComplete.emit(section.id);
    });
  }

  // Output for reading completion
  readonly sectionReadComplete = output<string>();

  // Video player events
  onVideoPlay(): void {
  }

  onVideoPause(): void {
  }

  onVideoEnd(): void {
    this.tracker.stopTracking();
    this.heartbeat.stop();
    this.videoEnded.emit();
  }

  onVideoError(error: any): void {
  }

  onVideoTimeUpdate(event: Event): void {
    const video = event.target as HTMLVideoElement;
    if (!video || !this.currentSection()) return;
    this.tracker.recordSecond(video.currentTime);
  }

  onVideoLoadedMetadata(event: Event): void {
    const video = event.target as HTMLVideoElement;
    if (!video || !this.currentSection()) return;
    const section = this.currentSection()!;
    this.tracker.startTracking(
      this.lesson().id,
      section.id,
      video.duration || 0
    );

    // Resume from last position
    this.videoProgressApi.getResumePosition(section.id).subscribe({
      next: (res: any) => {
        if (res?.success && res.data?.position > 0) {
          video.currentTime = res.data.position;
        }
      },
      error: () => {} // Ignore — fresh start is fine
    });
  }

  isYouTubeUrl(url: string | undefined): boolean {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
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
      this.stopAllTracking();
      this.sectionIndex.update(v => v - 1);
    }
  }

  nextSection(): void {
    if (this.canGoNextSection()) {
      this.stopAllTracking();
      this.sectionIndex.update(v => v + 1);
    }
  }

  selectSection(index: number): void {
    const ls = this.lesson();
    if (ls?.sections && index >= 0 && index < ls.sections.length) {
      this.stopAllTracking();
      this.sectionIndex.set(index);
    }
  }

  private stopAllTracking(): void {
    this.tracker.stopTracking();
    this.heartbeat.stop();
    this.readingTracker.stopTracking();
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
