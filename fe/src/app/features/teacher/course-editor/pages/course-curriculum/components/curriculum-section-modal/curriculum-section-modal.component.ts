import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { LucideAngularModule } from 'lucide-angular';
import { SectionApi } from '../../../../../../../api/client/section.api';

type SectionEditorType = 'TEXT' | 'VIDEO' | 'QUIZ' | 'FILE';
type VideoInputMode = 'url' | 'upload';
type CfUploadStatus = 'idle' | 'staged' | 'uploading' | 'done' | 'error';

@Component({
  selector: 'app-curriculum-section-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, CKEditorModule, LucideAngularModule],
  templateUrl: './curriculum-section-modal.component.html'
})
export class CurriculumSectionModalComponent {
  private sanitizer = inject(DomSanitizer);
  private sectionApi = inject(SectionApi);
  readonly sectionQuizTypes = ['ASSESSMENT', 'EXAM'] as const;

  private dialogShell = viewChild<ElementRef<HTMLElement>>('dialogShell');

  editingSectionId = input<string | null>(null);
  sectionType = input<SectionEditorType>('TEXT');
  sectionTitle = input('');
  sectionIsRequired = input(false);
  sectionVideoUrl = input('');
  sectionStreamVideoUid = input<string | null>(null);
  selectedVideoFile = input<File | null>(null);
  /** Lesson ID — required for CF Stream upload. Provided by parent curriculum component. */
  lessonId = input<string | null>(null);
  sectionContent = input('');
  selectedFile = input<File | null>(null);
  sectionFileUrl = input<string | null>(null);
  safePdfUrl = input<SafeResourceUrl | null>(null);
  isDataLoaded = input(false);
  editorHeight = input(380);
  wordCount = input(0);
  sectionQuizType = input<'ASSESSMENT' | 'EXAM'>('ASSESSMENT');
  sectionQuizTimeLimit = input(30);
  sectionQuizPassingScore = input(60);
  sectionQuizMaxAttempts = input(1);
  sectionQuizShuffleQuestions = input(true);
  sectionQuizShuffleOptions = input(true);
  sectionQuizShowResults = input(true);
  sectionQuizSelectedQuestions = input<any[]>([]);
  isSaving = input(false);
  editor = input<any>(null);
  editorConfig = input<any>(null);

  closeRequested = output<void>();
  saveRequested = output<void>();
  sectionTitleChange = output<string>();
  sectionRequiredChange = output<boolean>();
  sectionVideoUrlChange = output<string>();
  sectionStreamVideoUidChange = output<string | null>();
  videoFileSelected = output<File | null>();
  clearSelectedVideoFile = output<void>();
  sectionContentChange = output<string>();
  sectionQuizTypeChange = output<'ASSESSMENT' | 'EXAM'>();
  sectionQuizTimeLimitChange = output<string | number>();
  sectionQuizPassingScoreChange = output<string | number>();
  sectionQuizMaxAttemptsChange = output<string | number>();
  sectionQuizShuffleQuestionsChange = output<boolean>();
  sectionQuizShuffleOptionsChange = output<boolean>();
  sectionQuizShowResultsChange = output<boolean>();
  fileSelected = output<Event>();
  clearSelectedFile = output<void>();
  resizeStarted = output<MouseEvent>();
  editorReady = output<any>();
  editorChange = output<any>();
  openSectionQuizBank = output<void>();
  openSectionQuizRandom = output<void>();
  removeSectionQuizQuestion = output<string>();

  // ─── CF Stream Upload State ─────────────────────────────────────────
  readonly videoInputMode = signal<VideoInputMode>('url');
  readonly cfUploadStatus = signal<CfUploadStatus>('idle');
  readonly cfUploadPercent = signal(0);
  readonly cfStreamVideoUid = signal<string | null>(null);
  readonly stagedVideoFileName = signal<string | null>(null);

  constructor() {
    afterNextRender(() => {
      this.dialogShell()?.nativeElement.focus();
    });

    effect(() => {
      const streamUid = this.sectionStreamVideoUid();
      const stagedFile = this.selectedVideoFile();
      const currentStatus = this.cfUploadStatus();
      if (currentStatus === 'uploading' || currentStatus === 'error') {
        return;
      }

      if (stagedFile) {
        this.stagedVideoFileName.set(stagedFile.name);
        this.cfUploadStatus.set('staged');
        this.cfUploadPercent.set(0);
        this.cfStreamVideoUid.set(null);
        this.videoInputMode.set('upload');
        return;
      }

      this.stagedVideoFileName.set(null);
      if (streamUid) {
        this.cfStreamVideoUid.set(streamUid);
        this.cfUploadStatus.set('done');
        this.videoInputMode.set('upload');
        return;
      }

      this.cfStreamVideoUid.set(null);
      this.cfUploadPercent.set(0);
      this.cfUploadStatus.set('idle');
    });
  }

  onEscape(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.closeRequested.emit();
  }

  onBackdropClick(): void {
    this.closeRequested.emit();
  }

  onSectionTitleInput(value: string): void {
    this.sectionTitleChange.emit(value);
  }

  onSectionRequiredInput(value: boolean): void {
    this.sectionRequiredChange.emit(value);
  }

  onSectionVideoUrlInput(value: string): void {
    this.sectionVideoUrlChange.emit(value);
  }

  /**
   * Upload section video for existing sections.
   * New sections stage the file and let the parent upload after the section shell is created.
   */
  onCfVideoFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    const sectionId = this.editingSectionId();
    if (!file) return;

    if (!sectionId) {
      this.videoInputMode.set('upload');
      this.videoFileSelected.emit(file);
      return;
    }

    this.cfUploadStatus.set('uploading');
    this.cfUploadPercent.set(0);
    this.stagedVideoFileName.set(file.name);

    this.sectionApi.uploadStreamVideo(sectionId, file).subscribe({
      next: (body: any) => {
        const streamVideoUid = body?.streamVideoUid ?? null;
        const playUrl = body?.playbackUrl ?? '';
        this.cfUploadPercent.set(100);
        this.cfStreamVideoUid.set(streamVideoUid);
        this.sectionStreamVideoUidChange.emit(streamVideoUid);
        if (playUrl) {
          this.sectionVideoUrlChange.emit(playUrl);
        }
        this.cfUploadStatus.set('done');
      },
      error: () => this.cfUploadStatus.set('error'),
    });
  }

  resetCfUpload(): void {
    this.cfUploadStatus.set('idle');
    this.cfUploadPercent.set(0);
    this.cfStreamVideoUid.set(null);
    this.stagedVideoFileName.set(null);
    if (!this.editingSectionId()) {
      this.clearSelectedVideoFile.emit();
      this.sectionStreamVideoUidChange.emit(null);
      this.sectionVideoUrlChange.emit('');
    }
  }

  onSectionContentInput(value: string): void {
    this.sectionContentChange.emit(value);
  }

  onSectionQuizTypeInput(value: 'ASSESSMENT' | 'EXAM'): void {
    this.sectionQuizTypeChange.emit(value);
  }

  onSectionQuizTimeLimitInput(value: string | number): void {
    this.sectionQuizTimeLimitChange.emit(value);
  }

  onSectionQuizPassingScoreInput(value: string | number): void {
    this.sectionQuizPassingScoreChange.emit(value);
  }

  onSectionQuizMaxAttemptsInput(value: string | number): void {
    this.sectionQuizMaxAttemptsChange.emit(value);
  }

  onSectionQuizShuffleQuestionsInput(value: boolean): void {
    this.sectionQuizShuffleQuestionsChange.emit(value);
  }

  onSectionQuizShuffleOptionsInput(value: boolean): void {
    this.sectionQuizShuffleOptionsChange.emit(value);
  }

  onSectionQuizShowResultsInput(value: boolean): void {
    this.sectionQuizShowResultsChange.emit(value);
  }

  onFileInput(event: Event): void {
    this.fileSelected.emit(event);
  }

  onClearSelectedFile(): void {
    this.clearSelectedFile.emit();
  }

  onResizeStart(event: MouseEvent): void {
    this.resizeStarted.emit(event);
  }

  onEditorReadyEvent(event: any): void {
    this.editorReady.emit(event);
  }

  onEditorChangeEvent(event: any): void {
    this.editorChange.emit(event);
  }

  requestSave(): void {
    this.saveRequested.emit();
  }

  requestOpenSectionQuizBank(): void {
    this.openSectionQuizBank.emit();
  }

  requestOpenSectionQuizRandom(): void {
    this.openSectionQuizRandom.emit();
  }

  requestRemoveSectionQuizQuestion(questionId: string): void {
    this.removeSectionQuizQuestion.emit(questionId);
  }

  getDialogTitle(): string {
    return this.editingSectionId() ? 'Chỉnh sửa mục' : 'Thêm mục mới';
  }

  getSubmitLabel(): string {
    return this.editingSectionId() ? 'Cập nhật' : 'Tạo mới';
  }

  getSectionQuizTypeLabel(type: 'ASSESSMENT' | 'EXAM'): string {
    return type === 'EXAM' ? 'Bài thi' : 'Bài kiểm tra';
  }

  getDifficultyLabel(difficulty: string | null | undefined): string {
    switch (difficulty) {
      case 'EASY':
        return 'Dễ';
      case 'MEDIUM':
        return 'Trung bình';
      case 'HARD':
        return 'Khó';
      default:
        return 'Chưa rõ';
    }
  }

  getSafeUrl(url: string): SafeResourceUrl {
    const videoId = this.extractYouTubeId(url);
    if (videoId) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${videoId}`);
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  getFileNameFromUrl(url: string): string {
    if (!url) {
      return 'Tệp đính kèm';
    }

    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const fileName = pathname.substring(pathname.lastIndexOf('/') + 1);
      return decodeURIComponent(fileName) || 'Tệp đính kèm';
    } catch {
      const lastSlash = url.lastIndexOf('/');
      return lastSlash >= 0 ? url.substring(lastSlash + 1) : url;
    }
  }

  private extractYouTubeId(url: string): string | null {
    if (!url) {
      return null;
    }

    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }
}
