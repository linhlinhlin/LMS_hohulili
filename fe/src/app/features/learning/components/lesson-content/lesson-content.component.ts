import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LessonDetail } from '../../models/learning.models';

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
  private sanitizer = inject(DomSanitizer);

  @Input({ required: true }) lesson!: LessonDetail;
  @Input() isCompleted = false;

  @Output() markComplete = new EventEmitter<void>();
  @Output() videoStateChange = new EventEmitter<any>();
  @Output() videoEnded = new EventEmitter<void>();

  // Check if video is YouTube
  isYouTubeVideo(): boolean {
    const url = this.lesson?.videoUrl;
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
  }

  // Get safe YouTube embed URL
  getYouTubeEmbedUrl(): SafeResourceUrl {
    const url = this.lesson?.videoUrl;
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

  // Get lesson type label in Vietnamese
  getLessonTypeLabel(): string {
    const labels: Record<string, string> = {
      'LECTURE': 'Bài giảng',
      'READING': 'Đọc',
      'QUIZ': 'Kiểm tra',
      'ASSIGNMENT': 'Bài tập',
      'LAB': 'Thực hành'
    };
    return labels[this.lesson?.lessonType] || 'Bài học';
  }

  // Format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
