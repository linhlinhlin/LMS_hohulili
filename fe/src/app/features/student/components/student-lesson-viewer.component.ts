import { Component, signal, computed, inject, OnInit, OnDestroy, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
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
 * Cho phĂ©p student xem vĂ  tiáº¿n bá»™ qua cĂ¡c lessons Ä‘Æ°á»£c táº¡o bá»Ÿi teachers
 * - Clean UI for lesson content consumption
 * - Progress tracking and completion
 * - Support multiple lesson types: LECTURE, ASSIGNMENT, QUIZ
 * - Navigation between lessons
 */
@Component({
  selector: 'app-student-lesson-viewer',
  imports: [CommonModule, RouterModule, LoadingComponent],
  standalone: true,
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
    // cĂ¡c inject cÅ©
  ) {
    console.log(
      '%c[StudentLessonViewerComponent] CONSTRUCTOR',
      'color: white; background: purple; padding: 2px 4px;'
    );
  }
  ngOnInit() {
    console.log(
      '%c[StudentLessonViewerComponent] CONSTRUCTOR',
      'color: white; background: purple; padding: 2px 4px;'
    );



    // Get route parameters
    const courseId = this.route.snapshot.paramMap.get('courseId');
    const lessonId = this.route.snapshot.paramMap.get('lessonId');

    if (courseId && lessonId) {
      this.loadLesson(lessonId, courseId);
    } else {
      this._error.set('KhĂ´ng tĂ¬m tháº¥y thĂ´ng tin bĂ i há»c');
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
        throw new Error('Dá»¯ liá»‡u bĂ i há»c khĂ´ng há»£p lá»‡');
      }

      // Load lesson attachments
      let attachments: LessonAttachment[] = [];
      try {
        const attachmentResponse = await firstValueFrom(this.lessonAttachmentApi.getAttachments(lessonId));
        attachments = attachmentResponse || [];
        console.log('[SUCCESS] StudentLessonViewer: Attachments loaded', attachments.length);
      } catch (attachmentError) {
        console.warn('[WARNING] StudentLessonViewer: Could not load attachments', attachmentError);
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

      console.log('[SUCCESS] StudentLessonViewer: Lesson loaded successfully', this._currentLesson());

      // Load secure PDF URLs for sections [SOTA 2025]
      const data = lessonData as any;
      if (data && data.sections) {
        console.log('[StudentLessonViewer] Checking sections for PDFs:', data.sections.length);
        data.sections.forEach((sec: any) => {
          if (this.isPdfFile(sec)) {
            console.log('[StudentLessonViewer] Section is identified as PDF, requesting secure stream:', sec.id, sec.fileUrl);
            this.pdfService.getSafePdfUrl(sec.fileUrl).subscribe((safeUrl: SafeResourceUrl | null) => {
              console.log('[StudentLessonViewer] Received safeUrl for section:', sec.id, safeUrl ? 'SUCCESS' : 'NULL');
              this.safePdfUrls[sec.id] = safeUrl;
            });
          } else {
            console.log('[StudentLessonViewer] Section is NOT a PDF:', sec.id, sec.type);
          }
        });
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'KhĂ´ng thá»ƒ táº£i bĂ i há»c';
      console.error('[ERROR] StudentLessonViewer: Error loading lesson:', error);
      this._error.set(errorMessage);
      this.errorService.handleApiError(error, 'lesson-viewer');
    } finally {
      this._isLoading.set(false);
    }
  }

  // UI Helper Methods
  getLessonTypeLabel(type: string): string {
    switch (type) {
      case 'LECTURE': return 'BĂ i giáº£ng';
      case 'ASSIGNMENT': return 'BĂ i táº­p';
      case 'QUIZ': return 'Kiá»ƒm tra';
      default: return 'BĂ i há»c';
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
    if (minutes < 60) return `${minutes} phĂºt`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours} giá»`;
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
      'pdf': 'TĂ i liá»‡u PDF',
      'doc': 'TĂ i liá»‡u Word',
      'docx': 'TĂ i liá»‡u Word',
      'ppt': 'Báº£n trĂ¬nh bĂ y',
      'pptx': 'Báº£n trĂ¬nh bĂ y',
      'xlsx': 'Báº£ng tĂ­nh Excel',
      'mp4': 'Video MP4',
      'mp3': 'Ă‚m thanh MP3'
    };
    return types[type.toLowerCase()] || 'TĂ i liá»‡u';
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
    // Sá»­ dá»¥ng Google Docs viewer cho PDF
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
    console.log('[DEBUG] markAsCompleted: ENTERED METHOD');

    const lesson = this._currentLesson();
    if (!lesson) {
      console.log('[DEBUG] markAsCompleted: No lesson found in current state');
      return;
    }

    console.log('[DEBUG] markAsCompleted: Starting for lesson:', lesson.id);

    // đŸ” DEBUG: Check token before API call
    const token = localStorage.getItem('lms_access_token');
    console.log('[DEBUG] markAsCompleted: Token check:', {
      tokenExists: !!token,
      tokenLength: token?.length,
      tokenPrefix: token?.substring(0, 20) + '...'
    });

    // đŸ” DEBUG: Decode JWT to check payload
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('[DEBUG] markAsCompleted: JWT Payload:', {
          sub: payload.sub,
          roles: payload.roles || payload.authorities,
          exp: new Date(payload.exp * 1000).toISOString(),
          isExpired: payload.exp * 1000 < Date.now()
        });
      } catch (decodeError) {
        console.error('[ERROR] markAsCompleted: Cannot decode JWT:', decodeError);
      }
    }

    try {
      console.log('[DEBUG] markAsCompleted: BEFORE API CALL - about to call lessonApi.markLessonComplete');

      // Gá»i API backend Ä‘á»ƒ lÆ°u progress
      const apiResult = await firstValueFrom(this.lessonApi.markLessonComplete(lesson.id));

      console.log('[DEBUG] markAsCompleted: API call successful, response:', apiResult);

      // Cáº­p nháº­t local state sau khi API thĂ nh cĂ´ng
      const updatedLesson = { ...lesson, isCompleted: true };
      this._currentLesson.set(updatedLesson);

      console.log('[SUCCESS] markAsCompleted: Lesson marked as completed in database:', lesson.id);
    } catch (error: any) {
      console.error('[ERROR] markAsCompleted: Failed to mark lesson as completed:', error);
      console.error('[ERROR] markAsCompleted: Error details:', {
        status: error?.status,
        statusText: error?.statusText,
        message: error?.message,
        url: error?.url,
        error: error?.error
      });

      // đŸ” DEBUG: Check if it's a 403 error
      if (error?.status === 403) {
        console.error('[ERROR] markAsCompleted: 403 Forbidden - Check token and roles');
        console.error('[ERROR] markAsCompleted: Current localStorage keys:', Object.keys(localStorage));
        console.error('[ERROR] markAsCompleted: All localStorage values:', Object.keys(localStorage).map(key => ({
          key,
          value: localStorage.getItem(key)?.substring(0, 50) + '...'
        })));
      }

      // CĂ³ thá»ƒ hiá»ƒn thá»‹ toast error cho user
      this._error.set('KhĂ´ng thá»ƒ cáº­p nháº­t tráº¡ng thĂ¡i hoĂ n thĂ nh. Vui lĂ²ng thá»­ láº¡i.');
    }
  }

  onVideoLoad(): void {
    console.log('Video loaded successfully');
  }

  onVideoError(): void {
    console.error('Video failed to load');
  }

  onCompleteButtonClick(): void {
    console.log('BUTTON CLICKED DIRECTLY - calling markAsCompleted');
    this.markAsCompleted();
  }

  ngOnDestroy() {
    this.pdfService.cleanup();
  }
}

