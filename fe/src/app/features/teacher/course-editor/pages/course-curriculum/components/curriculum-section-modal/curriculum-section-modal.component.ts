import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { LucideAngularModule } from 'lucide-angular';
import { formatOfflineVideoProfileLabel, type OfflineVideoProfileDescriptor } from '../../../../../../../core/models/video-quality';

type SectionEditorType = 'TEXT' | 'VIDEO' | 'QUIZ' | 'FILE';
type VideoInputMode = 'upload';
type CfUploadStatus = 'idle' | 'staged' | 'uploading' | 'done' | 'error';
type SectionQuizAssessmentType = 'PRACTICE' | 'ASSESSMENT' | 'EXAM';

@Component({
  selector: 'app-curriculum-section-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, CKEditorModule, LucideAngularModule],
  templateUrl: './curriculum-section-modal.component.html'
})
export class CurriculumSectionModalComponent {
  private sanitizer = inject(DomSanitizer);
  readonly sectionQuizTypes: SectionQuizAssessmentType[] = ['PRACTICE', 'ASSESSMENT', 'EXAM'];

  private dialogShell = viewChild<ElementRef<HTMLElement>>('dialogShell');

  editingSectionId = input<string | null>(null);
  sectionType = input<SectionEditorType>('TEXT');
  sectionTitle = input('');
  sectionIsRequired = input(false);
  sectionVideoAssetId = input<string | null>(null);
  sectionVideoProcessingStatus = input<string | null>(null);
  sectionVideoAvailableOfflineProfiles = input<OfflineVideoProfileDescriptor[]>([]);
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
  sectionQuizType = input<SectionQuizAssessmentType>('PRACTICE');
  sectionQuizCountsTowardCertificate = input(false);
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
  sectionVideoAssetIdChange = output<string | null>();
  sectionVideoProcessingStatusChange = output<string | null>();
  sectionVideoUrlChange = output<string>();
  sectionStreamVideoUidChange = output<string | null>();
  retryVideoAssetRequested = output<void>();
  videoFileSelected = output<File | null>();
  clearSelectedVideoFile = output<void>();
  sectionContentChange = output<string>();
  sectionQuizTypeChange = output<SectionQuizAssessmentType>();
  sectionQuizCountsTowardCertificateChange = output<boolean>();
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
  readonly videoInputMode = signal<VideoInputMode>('upload');
  readonly cfUploadStatus = signal<CfUploadStatus>('idle');
  readonly cfUploadPercent = signal(0);
  readonly cfStreamVideoUid = signal<string | null>(null);
  readonly stagedVideoFileName = signal<string | null>(null);

  constructor() {
    afterNextRender(() => {
      this.dialogShell()?.nativeElement.focus();
    });

    effect(() => {
      const assetId = this.sectionVideoAssetId();
      const processingStatus = this.sectionVideoProcessingStatus();
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

      if (assetId) {
        this.cfStreamVideoUid.set(streamUid);
        this.cfUploadPercent.set(processingStatus === 'READY' ? 100 : 0);
        this.cfUploadStatus.set('done');
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

  hasLegacyVideoSource(): boolean {
    return !!this.sectionVideoUrl() && !this.sectionStreamVideoUid() && !this.selectedVideoFile();
  }

  isLegacyYouTubeVideo(): boolean {
    return this.isYouTubeUrl(this.sectionVideoUrl());
  }

  getLegacyVideoPolicyCopy(): string {
    if (this.isLegacyYouTubeVideo()) {
      return 'Mục này đang dùng YouTube hoặc nguồn ngoài cũ. Learner chỉ xem trực tuyến được và không thể tải offline theo chuẩn production mới.';
    }

    return 'Mục này đang dùng URL video cũ. Để phát trực tuyến và tải ngoại tuyến đúng kiến trúc mới, hãy thay bằng video tải lên nội bộ.';
  }

  /**
   * Stage section video upload. Parent flow now uploads to storage, creates a video asset,
   * and binds videoAssetId into the section payload so both create/update use one path.
   */
  onCfVideoFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.videoInputMode.set('upload');
    this.videoFileSelected.emit(file);
  }

  resetCfUpload(): void {
    this.cfUploadStatus.set('idle');
    this.cfUploadPercent.set(0);
    this.cfStreamVideoUid.set(null);
    this.stagedVideoFileName.set(null);
    this.clearSelectedVideoFile.emit();
    this.sectionVideoAssetIdChange.emit(null);
    this.sectionVideoProcessingStatusChange.emit(null);
    this.sectionStreamVideoUidChange.emit(null);
    this.sectionVideoUrlChange.emit('');
  }

  requestRetryVideoAsset(): void {
    this.retryVideoAssetRequested.emit();
  }

  getVideoProcessingCopy(): string {
    switch ((this.sectionVideoProcessingStatus() || '').toUpperCase()) {
      case 'READY':
        return 'Video đã sẵn sàng phát trực tuyến và có metadata offline.';
      case 'FAILED':
        return 'Video đã được gắn vào mục nhưng pipeline xử lý lỗi. Hãy tải lại hoặc thử lại asset.';
      case 'PROCESSING':
        return 'Video đã được gắn vào mục và đang xử lý playback/rendition.';
      default:
        return 'Video đã được gắn vào mục và đang chờ pipeline xử lý.';
    }
  }

  getOfflineProfileLabel(profile: OfflineVideoProfileDescriptor): string {
    return formatOfflineVideoProfileLabel(profile);
  }

  canRetryVideoAsset(): boolean {
    return !!this.sectionVideoAssetId() && (this.sectionVideoProcessingStatus() || '').toUpperCase() === 'FAILED';
  }

  onSectionContentInput(value: string): void {
    this.sectionContentChange.emit(value);
  }

  onSectionQuizTypeInput(value: SectionQuizAssessmentType): void {
    this.sectionQuizTypeChange.emit(value);
  }

  onSectionQuizCountsTowardCertificateInput(value: boolean): void {
    this.sectionQuizCountsTowardCertificateChange.emit(value);
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

  getSectionQuizTypeLabel(type: SectionQuizAssessmentType): string {
    switch (type) {
      case 'PRACTICE':
        return 'Luyện tập';
      case 'EXAM':
        return 'Bài thi';
      default:
        return 'Bài kiểm tra';
    }
  }

  getSectionQuizTypeHint(type: SectionQuizAssessmentType): string {
    switch (type) {
      case 'PRACTICE':
        return 'Cho phép ôn tập, có thể mở ngoại tuyến ở learner.';
      case 'EXAM':
        return 'Dùng cho đánh giá nghiêm túc hoặc điều kiện chứng chỉ.';
      default:
        return 'Dùng cho kiểm tra online trong lesson.';
    }
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

  private isYouTubeUrl(url: string | null | undefined): boolean {
    if (!url) {
      return false;
    }

    return url.includes('youtube.com') || url.includes('youtu.be');
  }
}
