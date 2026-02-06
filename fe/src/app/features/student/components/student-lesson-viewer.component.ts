import { Component, signal, computed, inject, OnInit, OnDestroy, input, ChangeDetectionStrategy } from '@angular/core';

import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LessonApi } from '../../../api/client/lesson.api';
import { LessonAttachmentApi, LessonAttachment as ApiLessonAttachment } from '../../../api/client/lesson-attachment.api';
import { ErrorHandlingService } from '../../../shared/services/error-handling.service';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { firstValueFrom } from 'rxjs';
import { PdfViewerService } from '../../../shared/services/pdf-viewer.service';

import { SectionSummary } from '../../../api/types/course.types';

// Types for Lesson Content
interface LessonDetailForStudent {
  id: string;
  courseId: string;
  title: string;
  description: string;
  type: 'LECTURE' | 'ASSIGNMENT' | 'QUIZ';
  content: string;
  duration: number;
  isCompleted: boolean;
  order: number;
  resources?: LessonResource[];
  attachments?: LessonAttachment[];
  sections?: SectionSummary[];
  videoUrl?: string;
  createdDate: string;
  lastModified: string;
}

interface LessonResource {
  id: string;
  title: string;
  type: string;
  url: string;
  size: string;
}

// Use the imported LessonAttachment type
type LessonAttachment = ApiLessonAttachment;

/**
 * Student Lesson Viewer Component
 *
 * Cho phép student xem và tiến bộ qua các lessons được tạo bởi teachers
 * - Clean UI for lesson content consumption
 * - Progress tracking and completion
 * - Support multiple lesson types: LECTURE, ASSIGNMENT, QUIZ
 * - Navigation between lessons
 */
@Component({
  selector: 'app-student-lesson-viewer',
  imports: [RouterModule, LoadingComponent],
  templateUrl: './student-lesson-viewer.component.html',
  styles: [`
    .prose {
      max-width: none;
    }

    .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
      color: #1f2937;
      font-weight: 700;
      line-height: 1.25;
      margin-bottom: 0.5em;
    }

    .prose p {
      margin-bottom: 1em;
      line-height: 1.7;
    }

    .prose ul, .prose ol {
      margin-bottom: 1em;
      padding-left: 1.5em;
    }

    .prose li {
      margin-bottom: 0.5em;
    }

    .prose pre {
      background-color: #1f2937;
      color: #f9fafb;
      padding: 1em;
      border-radius: 0.5em;
      overflow-x: auto;
      margin: 1em 0;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentLessonViewerComponent implements OnInit, OnDestroy {
  // Dependencies
  private lessonApi = inject(LessonApi);
  private lessonAttachmentApi = inject(LessonAttachmentApi);
  private errorService = inject(ErrorHandlingService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private sanitizer = inject(DomSanitizer);
  private pdfService = inject(PdfViewerService);

  // Attachment viewer state
  expandedAttachment: number | null = null;
  safePdfUrls: Record<string, SafeResourceUrl | null> = {};

  // Reactive state
  private _currentLesson = signal<LessonDetailForStudent | null>(null);
  private _isLoading = signal(false);
  private _error = signal<string | null>(null);

  // Public signals
  currentLesson = this._currentLesson.asReadonly();
  isLoading = this._isLoading.asReadonly();
  error = this._error.asReadonly();

  // Computed properties
  currentLessonIndex = computed(() => {
    // Mock: In real app, this would be calculated from course structure
    return 0;
  });

  hasNextLesson = computed(() => {
    // Mock: In real app, check if there's a next lesson in the course
    return true;
  });

  hasPreviousLesson = computed(() => {
    const currentIndex = this.currentLessonIndex();
    return currentIndex > 0;
  });

  constructor(
    // các inject cũ
  ) {
  }
  ngOnInit() {



    // Get route parameters
    const courseId = this.route.snapshot.paramMap.get('courseId');
    const lessonId = this.route.snapshot.paramMap.get('lessonId');

    if (courseId && lessonId) {
      this.loadLesson(lessonId, courseId);
    } else {
      this._error.set('Không tìm thấy thông tin bài học');
    }
  }

  // Load lesson content
  private async loadLesson(lessonId: string, courseId: string): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const lesson = await firstValueFrom(this.lessonApi.getLessonById(lessonId));
      const lessonData = lesson.data;
      if (!lessonData) {
        throw new Error('Dữ liệu bài học không hợp lệ');
      }

      // Load lesson attachments
      let attachments: LessonAttachment[] = [];
      try {
        const attachmentResponse = await firstValueFrom(this.lessonAttachmentApi.getAttachments(lessonId));
        attachments = attachmentResponse || [];
      } catch (attachmentError) {
        attachments = [];
      }

      this._currentLesson.set({
        id: lessonData.id,
        courseId: lessonData.courseId,
        title: lessonData.title,
        description: lessonData.description,
        type: lessonData.lessonType,
        content: lessonData.content,
        duration: lessonData.durationMinutes,
        isCompleted: false,
        order: lessonData.orderIndex,
        resources: [], // Placeholder for resources
        attachments: attachments,
        sections: lessonData.sections || [],
        videoUrl: lessonData.videoUrl,
        createdDate: lessonData.createdAt,
        lastModified: lessonData.updatedAt || lessonData.createdAt
      });

      // Load secure PDF URLs for sections [SOTA 2025]
      const data = lessonData as any;
      if (data && data.sections) {
        data.sections.forEach((sec: any) => {
          if (this.isPdfFile(sec)) {
            this.pdfService.getSafePdfUrl(sec.fileUrl).subscribe((safeUrl: SafeResourceUrl | null) => {
              this.safePdfUrls[sec.id] = safeUrl;
            });
          }
        });
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Không thể tải bài học';
      this._error.set(errorMessage);
      this.errorService.handleApiError(error, 'lesson-viewer');
    } finally {
      this._isLoading.set(false);
    }
  }

  // UI Helper Methods
  getLessonTypeLabel(type: string): string {
    switch (type) {
      case 'LECTURE': return 'Bài giảng';
      case 'ASSIGNMENT': return 'Bài tập';
      case 'QUIZ': return 'Kiểm tra';
      default: return 'Bài học';
    }
  }

  getLessonTypeClass(type?: string): string {
    switch (type) {
      case 'LECTURE': return 'bg-blue-100 text-blue-800';
      case 'ASSIGNMENT': return 'bg-green-100 text-green-800';
      case 'QUIZ': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} phút`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours} giờ`;
  }

  getSafeVideoUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  getSafeContent(content: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }

  getYouTubeEmbedUrl(url: string): string {
    if (!url) return '';

    // Handle YouTube URLs
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(youtubeRegex);

    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }

    // Return original URL if not YouTube
    return url;
  }

  getFileTypeLabel(type: string): string {
    const types: Record<string, string> = {
      'pdf': 'Tài liệu PDF',
      'doc': 'Tài liệu Word',
      'docx': 'Tài liệu Word',
      'ppt': 'Bản trình bày',
      'pptx': 'Bản trình bày',
      'xlsx': 'Bảng tính Excel',
      'mp4': 'Video MP4',
      'mp3': 'Âm thanh MP3'
    };
    return types[type.toLowerCase()] || 'Tài liệu';
  }

  // File type checking methods [SOTA 2025 Refined Logic]
  isPdfFile(section: any): boolean {
    if (!section) return false;

    // Priority 1: Check defined type (SOTA)
    if (section.type === 'PDF' || section.type === 'DOCUMENT') return true;

    // Priority 2: Check contentType metadata from Backend (if available)
    if (section.attachment?.contentType === 'application/pdf') return true;

    // Priority 3: Fallback for legacy URLs or stream naming convention
    const url = section.fileUrl || '';
    return url.toLowerCase().endsWith('.pdf') || url.includes('/stream');
  }

  isOfficeFile(fileName: string): boolean {
    const lower = fileName?.toLowerCase() || '';
    return lower.endsWith('.doc') || lower.endsWith('.docx') ||
      lower.endsWith('.xls') || lower.endsWith('.xlsx') ||
      lower.endsWith('.ppt') || lower.endsWith('.pptx');
  }

  isImageFile(fileName: string): boolean {
    const lower = fileName?.toLowerCase() || '';
    return lower.endsWith('.jpg') || lower.endsWith('.jpeg') ||
      lower.endsWith('.png') || lower.endsWith('.gif') ||
      lower.endsWith('.bmp') || lower.endsWith('.webp');
  }

  // File utility methods
  getFileExtension(fileName: string): string {
    if (!fileName || !fileName.includes('.')) return '';
    return fileName.substring(fileName.lastIndexOf('.') + 1).toUpperCase();
  }

  getFileTypeClass(fileName: string): string {
    const ext = this.getFileExtension(fileName).toLowerCase();
    const typeMap: { [key: string]: string } = {
      'pdf': 'bg-red-100 text-red-800',
      'doc': 'bg-blue-100 text-blue-800',
      'docx': 'bg-blue-100 text-blue-800',
      'ppt': 'bg-orange-100 text-orange-800',
      'pptx': 'bg-orange-100 text-orange-800',
      'xls': 'bg-green-100 text-green-800',
      'xlsx': 'bg-green-100 text-green-800',
      'mp4': 'bg-purple-100 text-purple-800',
      'mp3': 'bg-pink-100 text-pink-800',
      'jpg': 'bg-yellow-100 text-yellow-800',
      'png': 'bg-yellow-100 text-yellow-800'
    };
    return typeMap[ext] || 'bg-gray-100 text-gray-800';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // PDF and file viewer methods
  toggleAttachmentViewer(index: number): void {
    this.expandedAttachment = this.expandedAttachment === index ? null : index;
  }


  getGoogleDocsPdfUrl(fileUrl: string): SafeResourceUrl {
    const encodedUrl = encodeURIComponent(fileUrl);
    const viewerUrl = `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(viewerUrl);
  }

  getDirectPdfUrl(fileUrl: string): SafeResourceUrl {
    // Direct PDF URL - no sanitization needed for object/embed tags
    return fileUrl as any;
  }

  // Actions
  goBack(): void {
    this.router.navigate(['/student/courses']);
  }

  retryLoading(): void {
    const courseId = this.route.snapshot.paramMap.get('courseId');
    const lessonId = this.route.snapshot.paramMap.get('lessonId');

    if (courseId && lessonId) {
      this.loadLesson(lessonId, courseId);
    }
  }

  async markAsCompleted(): Promise<void> {
    const lesson = this._currentLesson();
    if (!lesson) return;

    try {
      // Gọi API backend để lưu progress
      const apiResult = await firstValueFrom(this.lessonApi.markLessonComplete(lesson.id));

      // Cập nhật local state sau khi API thành công
      const updatedLesson = { ...lesson, isCompleted: true };
      this._currentLesson.set(updatedLesson);

    } catch (error: any) {
      this._error.set('Không thể cập nhật trạng thái hoàn thành. Vui lòng thử lại.');
    }
  }

  onVideoLoad(): void {
  }

  onVideoError(): void {
  }

  onCompleteButtonClick(): void {
    this.markAsCompleted();
  }

  ngOnDestroy() {
    this.pdfService.cleanup();
  }
}
