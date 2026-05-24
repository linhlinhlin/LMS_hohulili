import { Component, input, output, model, signal, computed, ChangeDetectionStrategy, inject, effect, ElementRef, viewChild, AfterViewInit } from '@angular/core';
import katex from 'katex';
// KaTeX CSS loaded globally via angular.json styles[]; do NOT import here.

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { LessonDetail, SectionContent } from '../../models/learning.models';
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
import { PdfViewerService } from '../../../../shared/services/pdf-viewer.service';
import { ApiClient } from '../../../../api/client/api-client';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { SideDrawerComponent } from '../../../../shared/components/side-drawer/side-drawer.component';
import { CompetencyBadgeComponent } from '../competency-badge/competency-badge.component';
import { PdfSlideViewerComponent } from '../../../../shared/components/pdf-slide-viewer/pdf-slide-viewer.component';
import {
  isOnlineOnlyVideoSource,
  isYoutubeVideoUrl,
} from '../../../../core/utils/video-offline-policy';

interface DocumentPreviewResponse {
  status: 'PROCESSING' | 'READY' | 'FAILED' | string;
  previewPdfUrl?: string;
  message?: string;
}

/**
 * Lesson Content Component
 *
 * SOTA single-column layout (Coursera/edX/Khan Academy hybrid):
 * - Lesson media (video / file preview / quiz CTA / assignment) renders inline
 *   without tab navigation — content is always visible.
 * - Personal notes are accessible via a floating button → side drawer, so a
 *   student can write while watching without losing the content view.
 * - Lesson-level attachments are NOT a separate surface; teachers attach files
 *   as `section.type === 'FILE'` which the unified file card already shows.
 */
@Component({
  selector: 'app-lesson-content',
  imports: [AdaptiveVideoPlayerComponent, YouTubePlayerComponent, CommonModule, FormsModule, IconComponent, SideDrawerComponent, CompetencyBadgeComponent, PdfSlideViewerComponent],
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
  private pdfViewer = inject(PdfViewerService);
  private apiClient = inject(ApiClient);
  private readingTrackerInitTimer: ReturnType<typeof setTimeout> | null = null;
  private emittedReadCompletionKeys = new Set<string>();

  // --- Notes state ---
  readonly lessonNotes = signal<NoteResponse[]>([]);
  readonly isLoadingNotes = signal(false);
  readonly editingNoteId = signal<string | null>(null);
  readonly editingNoteTitle = signal('');
  readonly editingNoteContent = signal('');
  readonly newNoteContent = signal('');
  readonly isSavingNote = signal(false);

  /** Load notes when the side drawer opens (Coursera/edX pattern — notes are
   *  a secondary surface, fetched on demand). */
  private loadNotesEffect = effect(() => {
    const lesson = this.lesson();
    const open = this.notesDrawerOpen();
    if (open && lesson?.courseId) {
      this.loadNotes();
    }
  });

  /** Side drawer state for the notes panel — floating button toggles it. */
  readonly notesDrawerOpen = signal(false);

  openNotesDrawer(): void { this.notesDrawerOpen.set(true); }
  closeNotesDrawer(): void { this.notesDrawerOpen.set(false); }

  /**
   * Race-guard token: each loadNotes() bumps it; only the most recent in-flight
   * call is allowed to write to the signal. Without this, switching lessons
   * while an earlier fetch is still pending could clobber the new lesson's
   * notes with the stale lesson's filtered results.
   */
  private notesLoadToken = 0;

  private loadNotes(): void {
    const lesson = this.lesson();
    if (!lesson?.courseId) return;
    const token = ++this.notesLoadToken;
    this.isLoadingNotes.set(true);
    this.noteApi.listNotes(lesson.courseId).subscribe({
      next: (res: any) => {
        if (token !== this.notesLoadToken) return; // stale response — ignore
        const allNotes: NoteResponse[] = res?.data || res || [];
        const filtered = allNotes.filter(n => n.lessonId === lesson.id);
        this.lessonNotes.set(filtered);
        this.isLoadingNotes.set(false);
      },
      error: () => {
        if (token !== this.notesLoadToken) return;
        this.isLoadingNotes.set(false);
      }
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
  readonly completedSections = input<Set<string>>(new Set<string>());
  readonly isOfflinePackageStale = input(false);
  readonly staleReason = input<'UPDATE_AVAILABLE' | 'CLASS_ADOPTED_NEW_PUBLICATION' | 'LEGACY_PACKAGE' | 'UNKNOWN' | null>(null);

  /** Numbered lesson label: "Bài 1.1" */
  readonly lessonNumber = computed(() =>
    `Bài ${this.chapterIndex() + 1}.${this.lessonIndex() + 1}`
  );

  // Two-way binding with model (Angular v20+)
  readonly sectionIndex = model(0);

  /** Numbered section label that matches the sidebar section numbering, e.g. "Bài 1.5". */
  readonly currentSectionNumber = computed(() =>
    `Bài ${this.lessonIndex() + 1}.${this.sectionIndex() + 1}`
  );

  // Output functions (Angular v20+)
  readonly markComplete = output<void>();
  readonly videoEnded = output<void>();
  readonly goToQuiz = output<void>();

  // (Removed `activeTab` model — content always renders, notes moved to side
  // drawer per Coursera/edX SOTA. No tab navigation = no need to track an
  // active surface.)

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

  readonly simulationSupport = computed(() => this.resolveSimulationSupport());

  readonly safeSimulationFrameUrl = computed(() => {
    const section = this.currentSection();
    const entryUrl = section?.type === 'SIMULATION' ? section.simulationData?.entryUrl : null;
    if (!entryUrl || !this.simulationSupport().canRun) {
      return null;
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl(entryUrl);
  });

  readonly hasLessonLevelVideo = computed(() => !!(this.lesson()?.videoUrl || this.lesson()?.streamVideoUid));

  readonly hasVideoSections = computed(() => {
    const lesson = this.lesson();
    return !!lesson?.sections?.some(section =>
      section.type === 'VIDEO' && !!(section.videoUrl || section.streamVideoUid || section.videoAssetId),
    );
  });

  readonly shouldShowLessonLevelVideo = computed(() => this.hasLessonLevelVideo() && !this.hasVideoSections());

  /** Whether current view is a video section (used to show/hide tab bar) */
  readonly isVideoSection = computed(() => {
    const section = this.currentSection();
    if (section) return section.type === 'VIDEO' && !!(section.videoUrl || section.streamVideoUid || section.videoAssetId);
    return this.shouldShowLessonLevelVideo();
  });

  /** Safe PDF URL for iframe embedding */
  readonly safePdfUrl = signal<SafeResourceUrl | null>(null);
  readonly currentPdfSourceUrl = signal<string | null>(null);
  readonly useMobilePdfSlideViewer = this.pdfViewer.useCanvasViewer;
  readonly onDemandPreviewStatus = signal<'PROCESSING' | 'READY' | 'FAILED' | null>(null);
  readonly onDemandPreviewMessage = signal<string | null>(null);

  private pdfPreviewEffect = effect((onCleanup) => {
    const section = this.currentSection();

    this.safePdfUrl.set(null);
    this.currentPdfSourceUrl.set(null);
    this.onDemandPreviewStatus.set(null);
    this.onDemandPreviewMessage.set(null);
    this.pdfViewer.cleanup();

    if (section?.type !== 'FILE') return;

    // Prefer previewPdfUrl (Gotenberg-converted) over original fileUrl
    const previewPdfUrl = (!section.previewStatus || section.previewStatus === 'READY')
      ? section.previewPdfUrl || null
      : null;
    const fileUrl = section.fileUrl || null;
    const urlToPreview = previewPdfUrl ?? (fileUrl && this.isPdfFileUrl(fileUrl) ? fileUrl : null);

    if (!urlToPreview) {
      if (fileUrl && section.id && this.isConvertibleDocumentFile(this.fileExtension(fileUrl))) {
        this.startOnDemandDocumentPreview(section.id, onCleanup);
      }
      return;
    }

    this.currentPdfSourceUrl.set(urlToPreview);
    if (this.useMobilePdfSlideViewer()) {
      return;
    }

    const sub = this.pdfViewer.getSafePdfUrl(urlToPreview).subscribe({
      next: url => {
        this.safePdfUrl.set(url);
      },
      error: () => this.safePdfUrl.set(null)
    });

    onCleanup(() => {
      sub.unsubscribe();
      this.pdfViewer.cleanup();
    });
  });

  private startOnDemandDocumentPreview(
    sectionId: string,
    onCleanup: (cleanupFn: () => void) => void
  ): void {
    let stopped = false;
    let requestSub: Subscription | null = null;
    let pdfSub: Subscription | null = null;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      stopped = true;
      requestSub?.unsubscribe();
      pdfSub?.unsubscribe();
      if (pollTimer) {
        clearTimeout(pollTimer);
      }
      this.pdfViewer.cleanup();
    };
    onCleanup(cleanup);

    const poll = () => {
      if (stopped) return;
      this.onDemandPreviewStatus.set('PROCESSING');
      this.onDemandPreviewMessage.set(null);

      requestSub?.unsubscribe();
      requestSub = this.apiClient
        .postWithResponse<DocumentPreviewResponse>('/api/v3/document-previews', {
          lessonId: this.lesson().id,
          sectionId
        })
        .subscribe({
          next: response => {
            if (stopped) return;

            const data = response.data;
            const status = this.normalizeDocumentPreviewStatus(data?.status);
            this.onDemandPreviewStatus.set(status);
            this.onDemandPreviewMessage.set(data?.message || null);

            if (status === 'READY' && data?.previewPdfUrl) {
              this.currentPdfSourceUrl.set(data.previewPdfUrl);
              if (this.useMobilePdfSlideViewer()) {
                return;
              }

              pdfSub?.unsubscribe();
              pdfSub = this.pdfViewer.getSafePdfUrl(data.previewPdfUrl).subscribe({
                next: url => {
                  this.safePdfUrl.set(url);
                },
                error: () => this.onDemandPreviewStatus.set('FAILED')
              });
              return;
            }

            if (status === 'PROCESSING') {
              pollTimer = setTimeout(poll, 7000);
            }
          },
          error: error => {
            if (!stopped) {
              this.onDemandPreviewStatus.set('FAILED');
              this.onDemandPreviewMessage.set(error instanceof Error
                ? error.message
                : 'Không thể kết nối máy chủ tạo bản xem trước.');
            }
          }
        });
    };

    poll();
  }

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
    const previewUrl = this.currentPdfSourceUrl();
    if (previewUrl) {
      window.open(previewUrl, '_blank');
      return;
    }

    const section = this.currentSection();
    if (section?.fileUrl) {
      window.open(section.fileUrl, '_blank');
    }
  }

  openSimulationInNewTab(): void {
    const section = this.currentSection();
    const entryUrl = section?.type === 'SIMULATION' ? section.simulationData?.entryUrl : null;
    if (!entryUrl) return;
    window.open(entryUrl, '_blank', 'noopener,noreferrer');
  }

  simulationPackageSizeLabel(): string {
    const section = this.currentSection();
    const bytes = section?.type === 'SIMULATION'
      ? section.simulationOfflineBytes ?? section.simulationData?.simulationOfflineBytes ?? section.simulationData?.estimatedSizeBytes ?? 0
      : 0;
    return this.formatBytes(bytes);
  }

  simulationOfflineLabel(): string {
    const section = this.currentSection();
    if (section?.type !== 'SIMULATION') {
      return '';
    }
    if (section.simulationOfflineReady || section.simulationData?.simulationOfflineReady) {
      return `Đã sẵn sàng trong PWA offline (${this.simulationPackageSizeLabel()}).`;
    }
    if (section.simulationData?.allowOffline === false) {
      return 'Gói mô phỏng này chỉ chạy online; PWA vẫn lưu ghi chú, video và quiz nếu có.';
    }
    if (!section.simulationData?.manifestUrl) {
      return 'Chưa có manifest offline nên PWA sẽ không tải gói mô phỏng này.';
    }
    return `Có thể tải offline qua nút Tải xuống khóa học. Ước tính ${this.simulationPackageSizeLabel()}, nên dùng Wi-Fi và desktop/laptop.`;
  }

  simulationHasVrLab(): boolean {
    const targets = this.currentSection()?.simulationData?.supportedTargets ?? [];
    return targets.includes('QUEST_NATIVE') || targets.includes('VR_LAB');
  }

  private resolveSimulationSupport(): { canRun: boolean; message: string } {
    const section = this.currentSection();
    if (section?.type !== 'SIMULATION') {
      return { canRun: false, message: '' };
    }

    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return { canRun: false, message: 'Mô phỏng chỉ chạy trong trình duyệt có hỗ trợ WebGPU/WebGL.' };
    }

    if (this.isMobileOrTablet()) {
      return {
        canRun: false,
        message: 'Thiết bị này vẫn học được bài giảng, video và quiz, nhưng mô phỏng 3D hiện chỉ hỗ trợ desktop/laptop.',
      };
    }

    if (typeof WebAssembly === 'undefined') {
      return { canRun: false, message: 'Trình duyệt này chưa bật WebAssembly. Hãy cập nhật Chrome, Edge hoặc Firefox mới.' };
    }

    if (!this.hasWebGpuSupport()) {
      return {
        canRun: false,
        message: 'Bản mô phỏng hiện tại là Unity WebGPU. Hãy dùng Chrome hoặc Edge mới và bật tăng tốc phần cứng.',
      };
    }

    if (!this.canCreateWebGL2Context()) {
      return { canRun: false, message: 'Không tạo được WebGL 2 để kiểm tra GPU. Hãy bật tăng tốc phần cứng hoặc dùng trình duyệt desktop khác.' };
    }

    if (!section.simulationData?.entryUrl) {
      return { canRun: false, message: 'Gói mô phỏng chưa có đường dẫn chạy Unity.' };
    }

    return { canRun: true, message: 'Thiết bị này đạt yêu cầu để chạy mô phỏng Unity WebGPU.' };
  }

  private isMobileOrTablet(): boolean {
    const ua = navigator.userAgent || '';
    const touchMac = navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua);
    return /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua) || touchMac;
  }

  private canCreateWebGL2Context(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!canvas.getContext('webgl2');
    } catch {
      return false;
    }
  }

  private hasWebGpuSupport(): boolean {
    return typeof navigator !== 'undefined'
      && 'gpu' in navigator
      && !!(navigator as Navigator & { gpu?: unknown }).gpu;
  }

  private formatBytes(bytes: number | null | undefined): string {
    const safeBytes = Math.max(0, Number(bytes ?? 0) || 0);
    if (safeBytes === 0) return 'chưa có ước tính';
    if (safeBytes < 1024 * 1024) return `${Math.round(safeBytes / 1024)} KB`;
    if (safeBytes < 1024 * 1024 * 1024) return `${(safeBytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(safeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  /** Display name for the file: prefer the section title (teacher-named), fall back to the URL filename. */
  fileDisplayName(section: { title?: string | null; fileUrl?: string | null }): string {
    const fromUrl = this.extractFileNameFromUrl(section?.fileUrl ?? null);
    const title = (section?.title ?? '').trim();
    return title || fromUrl || 'Tài liệu';
  }

  /** Lowercase extension (e.g. "pdf", "docx") without the dot, or empty string. */
  fileExtension(fileUrl: string | null | undefined): string {
    if (!fileUrl) return '';
    const cleaned = fileUrl.split(/[?#]/)[0];
    const lastSegment = cleaned.split('/').pop() ?? '';
    const dotIdx = lastSegment.lastIndexOf('.');
    if (dotIdx <= 0 || dotIdx === lastSegment.length - 1) return '';
    return lastSegment.slice(dotIdx + 1).toLowerCase();
  }

  /** Returns Vietnamese label + Tailwind classes per file family. */
  fileTypeMeta(ext: string): { label: string; bgClass: string; textClass: string } {
    switch (ext) {
      case 'pdf':
        return { label: 'PDF', bgClass: 'bg-red-50', textClass: 'text-red-600' };
      case 'doc':
      case 'docx':
        return { label: 'Word', bgClass: 'bg-blue-50', textClass: 'text-blue-600' };
      case 'xls':
      case 'xlsx':
      case 'csv':
        return { label: 'Excel', bgClass: 'bg-emerald-50', textClass: 'text-emerald-600' };
      case 'ppt':
      case 'pptx':
        return { label: 'PowerPoint', bgClass: 'bg-orange-50', textClass: 'text-orange-600' };
      case 'zip':
      case 'rar':
      case '7z':
        return { label: 'Tệp nén', bgClass: 'bg-amber-50', textClass: 'text-amber-700' };
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'webp':
        return { label: 'Hình ảnh', bgClass: 'bg-purple-50', textClass: 'text-purple-600' };
      default:
        // Unknown extension — keep the chip neutral to avoid surfacing technical jargon
        // ("JSON" / "XML" / "EPUB") to non-technical teachers. The .{ext} subtitle still
        // shows the raw extension for anyone who needs to know.
        return { label: 'Tệp', bgClass: 'bg-slate-100', textClass: 'text-slate-600' };
    }
  }

  /** True for image families we can render inline via native <img>. */
  isImageFile(ext: string): boolean {
    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
  }

  /** True only when there is no in-browser preview path (DOCX, XLSX, ZIP, ...). */
  isNonPreviewableFile(ext: string): boolean {
    if (!ext) return true;
    if (ext === 'pdf') return false;
    if (this.isImageFile(ext)) return false;
    return true;
  }

  isConvertibleDocumentFile(ext: string): boolean {
    return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'rtf', 'txt', 'csv'].includes(ext);
  }

  documentPreviewStatus(section: { previewStatus?: string | null }): string | null {
    const status = this.onDemandPreviewStatus() || section.previewStatus || null;
    return status ? status.toUpperCase() : null;
  }

  documentPreviewFailureMessage(): string {
    const message = (this.onDemandPreviewMessage() || '').toLowerCase();
    if (message.includes('unavailable') || message.includes('not configured')) {
      return 'Máy chủ tạo bản xem trước PowerPoint hiện chưa sẵn sàng. Bạn vẫn có thể tải xuống tệp gốc.';
    }
    if (message.includes('too large')) {
      return 'Tệp này quá lớn để tạo bản xem trước trên web. Bạn vẫn có thể tải xuống tệp gốc.';
    }
    if (message.includes('queue') || message.includes('too many')) {
      return 'Máy chủ đang xử lý nhiều tài liệu. Vui lòng thử lại sau ít phút hoặc tải xuống tệp gốc.';
    }
    return 'Không thể tạo bản xem trước cho tài liệu này. Bạn vẫn có thể tải xuống tệp gốc.';
  }

  private normalizeDocumentPreviewStatus(status: string | undefined | null): 'PROCESSING' | 'READY' | 'FAILED' {
    return status === 'PROCESSING' || status === 'READY' || status === 'FAILED'
      ? status
      : 'FAILED';
  }

  private extractFileNameFromUrl(url: string | null): string {
    if (!url) return '';
    try {
      const cleaned = url.split(/[?#]/)[0];
      const lastSegment = cleaned.split('/').pop() ?? '';
      return decodeURIComponent(lastSegment);
    } catch {
      return '';
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
  readonly isQuizStaleBlocked = computed(() => {
    const metadata = this.quizPresentation();
    return this.isOfflinePackageStale() && !!metadata && !metadata.allowOffline;
  });
  readonly isQuizActionBlocked = computed(() => this.isQuizOfflineBlocked() || this.isQuizStaleBlocked());
  readonly quizBlockedMessage = computed(() => {
    if (this.isQuizOfflineBlocked()) {
      return 'Quiz này chỉ hỗ trợ trực tuyến. Hãy kết nối mạng để tiếp tục.';
    }

    if (!this.isQuizStaleBlocked()) {
      return null;
    }

    switch (this.staleReason()) {
      case 'CLASS_ADOPTED_NEW_PUBLICATION':
        return 'Lớp học này đã chuyển sang phiên bản mới. Hãy cập nhật gói ngoại tuyến trước khi mở bài kiểm tra hoặc bài thi.';
      case 'LEGACY_PACKAGE':
        return 'Gói ngoại tuyến này dùng dữ liệu cũ trước publication version. Hãy tải lại gói trước khi mở bài kiểm tra hoặc bài thi.';
      default:
        return 'Khóa học đã có bản cập nhật mới. Hãy cập nhật gói ngoại tuyến trước khi mở bài kiểm tra hoặc bài thi.';
    }
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

  resolveSectionOfflineVideoUrl(section: NonNullable<LessonDetail['sections']>[number]): string | null {
    if (section.videoOfflineUri) {
      return section.videoOfflineUri;
    }

    const lesson = this.lesson();
    if (!lesson?.videoOfflineUri) {
      return null;
    }

    const isSectionEligibleForLessonFallback =
      section.type === 'VIDEO'
      && section.videoType !== 'YOUTUBE'
      && !section.streamVideoUid;

    return isSectionEligibleForLessonFallback ? lesson.videoOfflineUri : null;
  }

  // Get sanitized HTML for any content (used by template)
  getSanitizedHtml(content: string | undefined | null): any {
    if (!content || content === 'undefined' || content === 'null') return '';
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }

  /**
   * Tiptap Mathematics extension serializes math as empty containers:
   *   `<span data-type="inline-math" data-latex="E=mc^2"></span>`
   *   `<div data-type="block-math" data-latex="\int_a^b ..."></div>`
   *
   * The editor renders these via NodeView (KaTeX) inside the editor instance,
   * but when the same HTML is shown to students via `[innerHTML]`, no NodeView
   * runs — the spans/divs stay empty. This effect queries the host after each
   * content change and renders KaTeX manually.
   *
   * Idempotent via `data-katex-rendered` flag so unrelated signal changes
   * don't trigger redundant re-renders. Flag wipes when Angular replaces
   * innerHTML for new content.
   */
  private hostEl = inject(ElementRef);
  private mathRenderEffect = effect(() => {
    // Tracks: section content + lesson content fallback. The old tab tracker
    // was needed because tab switches re-mounted the prose div; with the new
    // single-column layout, there's no tab to track.
    void this.currentSection()?.content;
    void this.lesson()?.content;
    queueMicrotask(() => this.renderMathInHost());
  });

  private renderMathInHost(): void {
    const root: HTMLElement | undefined = this.hostEl?.nativeElement;
    if (!root) return;
    const nodes = root.querySelectorAll<HTMLElement>(
      '[data-type="inline-math"]:not([data-katex-rendered]), [data-type="block-math"]:not([data-katex-rendered])',
    );
    nodes.forEach((el) => {
      const latex = el.getAttribute('data-latex') || '';
      const displayMode = el.getAttribute('data-type') === 'block-math';
      try {
        katex.render(latex, el, {
          displayMode,
          throwOnError: false,
          strict: 'ignore',
        });
      } catch {
        el.textContent = `[Lỗi công thức: ${latex}]`;
      }
      el.setAttribute('data-katex-rendered', '1');
    });
  }

  /** Reading progress percent (0-100) for current TEXT section */
  readonly readingProgress = computed(() => this.readingTracker.getProgress());

  /** Track section changes to start/stop heartbeat + reading tracker */
  private sectionChangeEffect = effect(() => {
    const section = this.currentSection();
    const lesson = this.lesson();

    if (this.readingTrackerInitTimer) {
      clearTimeout(this.readingTrackerInitTimer);
      this.readingTrackerInitTimer = null;
    }

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
      this.readingTrackerInitTimer = setTimeout(() => {
        this.readingTrackerInitTimer = null;
        this.initReadingTracker();
      }, 100);
    } else {
      this.readingTracker.stopTracking();
    }
  });

  ngAfterViewInit(): void {
    // Reading tracker initializes via effect when the section changes.
  }

  private initReadingTracker(): void {
    const el = this.textContentRef()?.nativeElement;
    const section = this.currentSection();
    const lesson = this.lesson();
    if (!el || !section || !lesson) return;

    const completionKey = this.buildReadCompletionKey(lesson.id, section.id);

    this.readingTracker.startTracking(el, lesson.id, section.id, () => {
      if (this.emittedReadCompletionKeys.has(completionKey)) {
        return;
      }

      this.emittedReadCompletionKeys.add(completionKey);
      // Auto-mark section complete when 80% scrolled
      this.sectionReadComplete.emit(section.id);
    });
  }

  // Output for reading/file completion
  readonly sectionReadComplete = output<string>();

  /** Mark a FILE section as completed (explicit student acknowledgment) */
  markFileComplete(): void {
    const section = this.currentSection();
    if (section && section.type === 'FILE') {
      this.sectionReadComplete.emit(section.id);
    }
  }

  /** Check if current section is already completed */
  isCurrentSectionCompleted(): boolean {
    const section = this.currentSection();
    return !!section && this.completedSections().has(section.id);
  }

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
      video.duration || 0,
      section.completionThreshold
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
    return isYoutubeVideoUrl(url);
  }

  isSectionOnlineOnlyVideoBlocked(section: SectionContent): boolean {
    return !this.network.online()
      && isOnlineOnlyVideoSource({
        videoUrl: section.videoUrl || this.lesson().videoUrl,
        videoType: section.videoType,
        videoSourceKind: section.videoSourceKind,
      });
  }

  isLessonOnlineOnlyVideoBlocked(): boolean {
    return !this.network.online()
      && isOnlineOnlyVideoSource({
        videoUrl: this.lesson().videoUrl,
      });
  }

  // Mark lesson as complete
  onMarkComplete(): void {
    this.markComplete.emit();
  }

  private buildReadCompletionKey(lessonId: string, sectionId: string): string {
    return `${lessonId}:${sectionId}`;
  }

  async onGoToQuiz(): Promise<void> {
    const ls = this.lesson();
    const currentUrl = this.router.url;
    const section = this.currentSection();
    const quizMetadata = this.quizPresentation();
    if (this.isQuizActionBlocked()) {
      this.toast.warning(this.quizBlockedMessage() ?? 'Không thể mở bài kiểm tra lúc này.');
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

      if (!this.network.online() && quizMetadata?.allowOffline === true) {
        await this.router.navigate(['/student/quiz/take', ls.id], {
          queryParams: {
            lessonId: ls.id,
            courseId: ls.courseId,
            title: ls.title,
            quizType: quizMetadata?.quizType,
            allowOffline: true,
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
      'SIMULATION': 'Mô phỏng',
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

  private isPdfFileUrl(fileUrl: string): boolean {
    const normalized = fileUrl.toLowerCase();
    return normalized.endsWith('.pdf') || normalized.includes('.pdf?') || normalized.startsWith('/offline-file/');
  }
}
