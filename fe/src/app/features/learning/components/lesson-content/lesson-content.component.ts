import { Component, input, output, model, signal, computed, ChangeDetectionStrategy, inject, effect, ElementRef, viewChild, AfterViewInit } from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LessonDetail } from '../../models/learning.models';
import { LessonType } from '../../models/lesson-types.enum';
import { WatchedSegmentsTracker } from '../../services/watched-segments-tracker.service';
import { HeartbeatTracker } from '../../services/heartbeat-tracker.service';
import { ReadingProgressTracker } from '../../services/reading-progress-tracker.service';
import { VideoProgressApi } from '../../../../api/client/video-progress.api';
import { YouTubePlayerComponent } from '../youtube-player/youtube-player.component';
import { AdaptiveVideoPlayerComponent } from '../adaptive-video-player/adaptive-video-player.component';
import { NoteApi, NoteResponse, CreateNoteRequest, UpdateNoteRequest } from '../../../../api/endpoints/note.api';
import { QuizApi } from '../../../../api/endpoints/quiz.api';
import { ToastService } from '../../../../core/services/toast.service';
import { NetworkStatusService } from '../../../../core/services/network-status.service';

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
  imports: [AdaptiveVideoPlayerComponent, YouTubePlayerComponent, CommonModule, FormsModule],
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
  private noteApi = inject(NoteApi);
  private quizApi = inject(QuizApi);
  private toast = inject(ToastService);
  private network = inject(NetworkStatusService);

  // --- Notes state ---
  readonly lessonNotes = signal<NoteResponse[]>([]);
  readonly isLoadingNotes = signal(false);
  readonly editingNoteId = signal<string | null>(null);
  readonly editingNoteTitle = signal('');
  readonly editingNoteContent = signal('');
  readonly newNoteContent = signal('');
  readonly isSavingNote = signal(false);

  /** Load notes when switching to notes tab */
  private loadNotesEffect = effect(() => {
    const lesson = this.lesson();
    const tab = this.activeTab();
    if (tab === 'notes' && lesson?.courseId) {
      this.loadNotes();
    }
  });

  private loadNotes(): void {
    const lesson = this.lesson();
    if (!lesson?.courseId) return;
    this.isLoadingNotes.set(true);
    this.noteApi.listNotes(lesson.courseId).subscribe({
      next: (res: any) => {
        const allNotes: NoteResponse[] = res?.data || res || [];
        // Filter notes for this specific lesson
        const filtered = allNotes.filter(n => n.lessonId === lesson.id);
        this.lessonNotes.set(filtered);
        this.isLoadingNotes.set(false);
      },
      error: () => this.isLoadingNotes.set(false)
    });
  }

  createNote(): void {
    const lesson = this.lesson();
    const content = this.newNoteContent().trim();
    if (!content || !lesson?.courseId) return;

    this.isSavingNote.set(true);
    const req: CreateNoteRequest = {
      courseId: lesson.courseId,
      lessonId: lesson.id,
      title: lesson.title,
      content
    };
    this.noteApi.createNote(req).subscribe({
      next: () => {
        this.newNoteContent.set('');
        this.isSavingNote.set(false);
        this.loadNotes();
      },
      error: () => this.isSavingNote.set(false)
    });
  }

  startEditNote(note: NoteResponse): void {
    this.editingNoteId.set(note.id);
    this.editingNoteTitle.set(note.title);
    this.editingNoteContent.set(note.content);
  }

  cancelEditNote(): void {
    this.editingNoteId.set(null);
  }

  saveEditNote(): void {
    const noteId = this.editingNoteId();
    if (!noteId) return;

    this.isSavingNote.set(true);
    const req: UpdateNoteRequest = {
      title: this.editingNoteTitle(),
      content: this.editingNoteContent()
    };
    this.noteApi.updateNote(noteId, req).subscribe({
      next: () => {
        this.editingNoteId.set(null);
        this.isSavingNote.set(false);
        this.loadNotes();
      },
      error: () => this.isSavingNote.set(false)
    });
  }

  deleteNote(noteId: string): void {
    this.noteApi.deleteNote(noteId).subscribe({
      next: () => this.loadNotes(),
      error: () => {}
    });
  }

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
  readonly chapterIndex = input(0);
  readonly lessonIndex = input(0);

  /** Numbered lesson label: "Bài 1.1" */
  readonly lessonNumber = computed(() =>
    `Bài ${this.chapterIndex() + 1}.${this.lessonIndex() + 1}`
  );

  // Two-way binding with model (Angular v20+)
  readonly sectionIndex = model(0);

  // Output functions (Angular v20+)
  readonly markComplete = output<void>();
  readonly videoEnded = output<void>();
  readonly goToQuiz = output<void>();

  // Active tab for content view
  readonly activeTab = model<'overview' | 'notes' | 'materials'>('overview');

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

  /** Whether current view is a video section (used to show/hide tab bar) */
  readonly isVideoSection = computed(() => {
    const section = this.currentSection();
    if (section) return section.type === 'VIDEO' && !!(section.videoUrl || section.streamVideoUid);
    return !this.hasSections() && !!(this.lesson()?.videoUrl || this.lesson()?.streamVideoUid);
  });

  /** Safe PDF URL for iframe embedding */
  readonly safePdfUrl = computed(() => {
    const section = this.currentSection();
    if (section?.type === 'FILE' && section.fileUrl) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(section.fileUrl);
    }
    return null;
  });

  private pdfContainer = viewChild<ElementRef>('pdfContainer');

  togglePdfFullscreen(): void {
    const el = this.pdfContainer()?.nativeElement;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen?.();
    }
  }

  openPdfInNewTab(): void {
    const section = this.currentSection();
    if (section?.fileUrl) {
      window.open(section.fileUrl, '_blank');
    }
  }

  readonly canGoPreviousSection = computed(() => this.sectionIndex() > 0);

  readonly canGoNextSection = computed(() => {
    const ls = this.lesson();
    return this.hasSections() && this.sectionIndex() < ls.sections!.length - 1;
  });
  readonly quizPresentation = computed(() => {
    const section = this.currentSection();
    if (section?.type === 'QUIZ') {
      const quizType = this.normalizeQuizType(section.quizData?.quizType);
      const allowOffline = section.quizData?.allowOffline === true;
      return {
        quizType,
        allowOffline,
        label: this.getQuizTypeLabel(quizType),
        supportLabel: allowOffline ? 'Hỗ trợ ngoại tuyến' : 'Online-only',
        hint: allowOffline
          ? 'Quiz luyện tập này có thể tải về để làm khi mất mạng.'
          : (quizType === 'EXAM'
            ? 'Bài thi này chỉ hỗ trợ trực tuyến để bảo toàn tính nghiêm túc.'
            : 'Bài kiểm tra này chỉ hỗ trợ trực tuyến.')
      };
    }

    if ((this.hasQuiz() || this.lesson().lessonType === LessonType.QUIZ) && !this.hasSections()) {
      const quizType = this.normalizeQuizType(this.lesson().quizType);
      const allowOffline = this.lesson().quizAllowOffline === true;
      return {
        quizType,
        allowOffline,
        label: this.getQuizTypeLabel(quizType),
        supportLabel: allowOffline ? 'Hỗ trợ ngoại tuyến' : 'Online-only',
        hint: allowOffline
          ? 'Quiz luyện tập này có thể tải về để làm khi mất mạng.'
          : (quizType === 'EXAM'
            ? 'Bài thi này chỉ hỗ trợ trực tuyến để bảo toàn tính nghiêm túc.'
            : 'Bài kiểm tra này chỉ hỗ trợ trực tuyến.')
      };
    }

    return null;
  });
  readonly isQuizOfflineBlocked = computed(() => {
    const metadata = this.quizPresentation();
    return !!metadata && !this.network.online() && !metadata.allowOffline;
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
    const content = this.lesson()?.content;
    if (!content || content === 'undefined' || content === 'null') return '';
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }

  // Get sanitized HTML for any content (used by template)
  getSanitizedHtml(content: string | undefined | null): any {
    if (!content || content === 'undefined' || content === 'null') return '';
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }

  /** Reading progress percent (0-100) for current TEXT section */
  readonly readingProgress = computed(() => this.readingTracker.getProgress());

  /** Track section changes to start/stop heartbeat + reading tracker */
  private sectionChangeEffect = effect(() => {
    const section = this.currentSection();
    const lesson = this.lesson();
    if (!section || !lesson) return;

    if (section.type === 'VIDEO') {
      this.readingTracker.stopTracking();
      this.heartbeat.stop();
      return;
    }

    // Start heartbeat for non-video content types.
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
  onVideoEnd(): void {
    this.tracker.stopTracking();
    this.heartbeat.stop();
    this.videoEnded.emit();
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

  async onGoToQuiz(): Promise<void> {
    const ls = this.lesson();
    const currentUrl = this.router.url;
    const section = this.currentSection();
    const quizMetadata = this.quizPresentation();
    if (this.isQuizOfflineBlocked()) {
      this.toast.warning('Quiz này chỉ hỗ trợ trực tuyến. Hãy kết nối mạng để tiếp tục.');
      return;
    }
    try {
      if (section?.type === 'QUIZ' && section.id) {
        await this.router.navigate(['/student/quiz/take', section.id], {
          queryParams: {
            mode: 'section',
            lessonId: ls.id,
            courseId: ls.courseId,
            sectionId: section.id,
            title: section.title || ls.title,
            quizType: quizMetadata?.quizType,
            allowOffline: quizMetadata?.allowOffline === true,
            returnUrl: currentUrl
          }
        });
        return;
      }

      const quizId = await firstValueFrom(this.quizApi.resolveQuizIdByLessonId(ls.id));
      await this.router.navigate(['/student/quiz/take', quizId], {
        queryParams: {
          lessonId: ls.id,
          courseId: ls.courseId,
          title: ls.title,
          quizType: quizMetadata?.quizType,
          allowOffline: quizMetadata?.allowOffline === true,
          returnUrl: currentUrl
        }
      });
    } catch {
      this.toast.error('Không thể mở bài kiểm tra của bài học này');
    }
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

  getQuizTypeLabel(type: string): string {
    switch (this.normalizeQuizType(type)) {
      case 'PRACTICE':
        return 'Quiz luyện tập';
      case 'EXAM':
        return 'Bài thi';
      default:
        return 'Bài kiểm tra';
    }
  }

  private normalizeQuizType(type: string | undefined | null): 'PRACTICE' | 'ASSESSMENT' | 'EXAM' {
    const normalized = (type || '').toUpperCase();
    if (normalized === 'PRACTICE' || normalized === 'EXAM') {
      return normalized;
    }
    return 'ASSESSMENT';
  }
}
