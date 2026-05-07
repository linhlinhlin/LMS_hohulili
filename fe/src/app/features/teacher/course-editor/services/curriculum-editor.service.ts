import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom, filter, lastValueFrom, Subscription } from 'rxjs';
import {
  ChapterDraftDTO,
  LessonDraftDTO,
  SectionDraftDTO,
} from './course-authoring.service';
import { CurriculumSelectionService } from './curriculum-selection.service';
import { CourseEditorStore } from '../store/course-editor.store';
import { SectionApi } from '../../../../api/client/section.api';
import { VideoAssetApi, type VideoAssetResponse } from '../../../../api/client/video-asset.api';
import { PresignedUploadService, type UploadEvent } from '../../../../core/services/presigned-upload.service';
import { PdfViewerService } from '../../../../shared/services/pdf-viewer.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import type { OfflineVideoProfileDescriptor } from '../../../../core/models/video-quality';
import type { ApiResponse } from '../../../../api/types/common.types';
import type {
  InteractiveVideoChoice,
  InteractiveVideoInteraction,
  InteractiveVideoInteractionType,
} from '../../../../api/types/interactive-video.types';
import { stripCurriculumPrefix } from '../utils/curriculum-labels';
import {
  buildInteractiveVideoSpec,
  choiceTypeNeedsChoices,
  createInteractiveVideoChoice,
  createInteractiveVideoInteraction,
  getInteractiveVideoAuthoringIssues,
  normalizeInteractiveVideoSpec,
  removeInteractiveVideoInteractionAndRetargetBranches,
} from '../utils/interactive-video-authoring';
import {
  probeVideoFile,
  estimateProcessingSeconds,
  type VideoProbeResult,
} from '../../../../core/utils/video-probe.util';
import { classifyUploadError, classifyTranscodeError, type UploadErrorInfo } from '../utils/video-upload-errors';

export type EditorMode = 'empty' | 'chapter' | 'lesson';
export type SectionSurfaceMode = 'closed' | 'create' | 'edit';
export type SectionEditorType = 'TEXT' | 'VIDEO' | 'QUIZ' | 'FILE';
export type SectionQuizAssessmentType = 'PRACTICE' | 'ASSESSMENT' | 'EXAM';

/**
 * Shared state layer for the curriculum editor workspace.
 *
 * Replaces the 25+ input/output prop-drilling between
 * course-curriculum (orchestrator) and section-editor (inline panel).
 * All editor sub-components inject this service to read/write
 * the active editing context without direct parent-child coupling.
 *
 * Scoped to the course-editor route by `courseEditorRoutes.providers`.
 * The root provider remains only as a compatibility fallback for tests/legacy callers.
 * Selection hierarchy delegates to CurriculumSelectionService.
 */
@Injectable({ providedIn: 'root' })
export class CurriculumEditorService {
  private readonly selection = inject(CurriculumSelectionService);
  private readonly store = inject(CourseEditorStore);
  private readonly sectionApi = inject(SectionApi);
  private readonly videoAssetApi = inject(VideoAssetApi);
  private readonly presignedUpload = inject(PresignedUploadService);
  private readonly pdfService = inject(PdfViewerService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly sanitizer = inject(DomSanitizer);

  // ── Editor mode ──────────────────────────────────────────────────────
  readonly editorMode = computed<EditorMode>(() => {
    if (this.selection.selectedLessonId()) return 'lesson';
    if (this.selection.selectedChapterId()) return 'chapter';
    return 'empty';
  });

  // ── Cross-component bridge ───────────────────────────────────────────
  /** Set by navigation surfaces to request the main curriculum workspace opens lesson creation */
  readonly pendingLessonCreateForChapter = signal<ChapterDraftDTO | null>(null);

  // ── Section surface state ────────────────────────────────────────────
  readonly sectionSurfaceMode = signal<SectionSurfaceMode>('closed');
  readonly sectionEditorType = signal<SectionEditorType>('TEXT');
  readonly editingSectionId = signal<string | null>(null);
  readonly isSectionSurfaceOpen = computed(() => this.sectionSurfaceMode() !== 'closed');

  // ── Section form state ───────────────────────────────────────────────
  readonly sectionTitle = signal('');
  readonly sectionContent = signal('');
  readonly sectionIsRequired = signal(false);
  readonly sectionCompletionThreshold = signal(50);

  // Video
  readonly sectionVideoAssetId = signal<string | null>(null);
  readonly sectionVideoProcessingStatus = signal<string | null>(null);
  readonly sectionVideoAvailableOfflineProfiles = signal<OfflineVideoProfileDescriptor[]>([]);
  readonly sectionVideoUrl = signal('');
  readonly sectionVideoType = signal<'YOUTUBE' | 'CLOUDFLARE' | null>(null);
  readonly sectionStreamVideoUid = signal<string | null>(null);
  readonly selectedSectionVideoFile = signal<File | null>(null);
  readonly sectionVideoUploadProgress = signal(0);
  readonly sectionVideoIsUploading = signal(false);
  readonly sectionVideoUploadSpeed = signal<string | null>(null);
  readonly sectionVideoUploadEta = signal<string | null>(null);
  readonly sectionVideoFileName = signal<string | null>(null);
  readonly sectionVideoFileSize = signal<number>(0);
  readonly sectionVideoErrorDetail = signal<string | null>(null);
  readonly sectionVideoError = signal<UploadErrorInfo | null>(null);

  // Interactive video authoring
  readonly sectionInteractiveVideoEnabled = signal(false);
  readonly sectionInteractiveVideoTimeline = signal<InteractiveVideoInteraction[]>([]);
  readonly sectionInteractiveVideoInteractionCount = computed(
    () => this.sectionInteractiveVideoTimeline().length,
  );

  // Local probe metadata (client-side, before/during upload)
  readonly sectionVideoDurationSec = signal<number | null>(null);
  readonly sectionVideoWidth = signal<number | null>(null);
  readonly sectionVideoHeight = signal<number | null>(null);
  readonly sectionVideoLocalPoster = signal<string | null>(null);
  readonly sectionVideoProcessingEtaSec = signal<number | null>(null);
  readonly sectionVideoProcessingStartedAt = signal<number | null>(null);

  // File
  readonly selectedFile = signal<File | null>(null);
  readonly sectionFileUrl = signal<string | null>(null);
  readonly safePdfUrl = signal<SafeResourceUrl | null>(null);
  readonly sectionPreviewStatus = signal<string | null>(null);

  // Quiz
  readonly sectionQuizType = signal<SectionQuizAssessmentType>('PRACTICE');
  readonly sectionQuizCountsTowardCertificate = signal(false);
  readonly sectionQuizTimeLimit = signal(30);
  readonly sectionQuizPassingScore = signal(60);
  readonly sectionQuizMaxAttempts = signal(1);
  readonly sectionQuizShuffleQuestions = signal(true);
  readonly sectionQuizShuffleOptions = signal(true);
  readonly sectionQuizShowResults = signal(true);
  readonly sectionQuizShowCorrectAnswers = signal(true);
  readonly sectionQuizSelectedQuestions = signal<any[]>([]);

  // Quiz modals
  readonly showSectionQuizBankModal = signal(false);
  readonly showSectionQuizRandomModal = signal(false);
  readonly sectionQuizRandomCount = signal(5);

  // ── Transient state ──────────────────────────────────────────────────
  readonly isSaving = signal(false);
  readonly isDirty = signal(false);
  private sectionVideoPollTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Section surface actions ──────────────────────────────────────────

  openSectionCreate(type: SectionEditorType): void {
    this.resetSectionForm();
    this.sectionEditorType.set(type);
    this.editingSectionId.set(null);
    this.sectionSurfaceMode.set('create');
  }

  openSectionEdit(section: SectionDraftDTO): void {
    this.hydrateSectionForm(section);
    this.sectionEditorType.set(section.type as SectionEditorType);
    this.editingSectionId.set(section.id);
    this.sectionSurfaceMode.set('edit');
  }

  closeSectionSurface(): void {
    this.showSectionQuizBankModal.set(false);
    this.showSectionQuizRandomModal.set(false);
    this.sectionSurfaceMode.set('closed');
    this.editingSectionId.set(null);
    this.clearSectionVideoPoll();
  }

  async closeSectionSurfaceWithConfirm(): Promise<boolean> {
    if (this.isDirty()) {
      const shouldLeave = await this.confirmDialog.confirm({
        title: 'Bỏ thay đổi chưa lưu?',
        message: 'Nội dung bạn đang chỉnh sửa chưa được lưu. Bạn có chắc muốn đóng?',
        variant: 'warning',
        confirmText: 'Bỏ thay đổi',
        cancelText: 'Tiếp tục chỉnh sửa',
      });
      if (!shouldLeave) return false;
    }
    this.closeSectionSurface();
    return true;
  }

  markDirty(): void {
    this.isDirty.set(true);
    this.store.markUnsaved();
  }

  setInteractiveVideoEnabled(enabled: boolean): void {
    this.sectionInteractiveVideoEnabled.set(enabled);
    this.markDirty();
  }

  addInteractiveVideoInteraction(type: InteractiveVideoInteractionType): void {
    const next = createInteractiveVideoInteraction(this.sectionInteractiveVideoTimeline(), type, {
      durationSeconds: this.sectionVideoDurationSec(),
    });
    this.sectionInteractiveVideoTimeline.update(timeline => [...timeline, next]);
    this.sectionInteractiveVideoEnabled.set(true);
    this.markDirty();
  }

  updateInteractiveVideoInteraction(
    interactionId: string,
    patch: Partial<InteractiveVideoInteraction>,
  ): void {
    this.sectionInteractiveVideoTimeline.update(timeline => timeline.map(interaction => {
      if (interaction.id !== interactionId) {
        return interaction;
      }
      return {
        ...interaction,
        ...patch,
        atSeconds: patch.atSeconds == null
          ? interaction.atSeconds
          : this.toNonNegativeInteger(patch.atSeconds),
        endSeconds: patch.endSeconds === undefined
          ? interaction.endSeconds
          : patch.endSeconds === null
            ? null
            : this.toNonNegativeInteger(patch.endSeconds),
      };
    }));
    this.markDirty();
  }

  updateInteractiveVideoInteractionType(
    interactionId: string,
    type: InteractiveVideoInteractionType,
  ): void {
    this.sectionInteractiveVideoTimeline.update(timeline => timeline.map(interaction => {
      if (interaction.id !== interactionId) {
        return interaction;
      }
      return {
        ...interaction,
        type,
        choices: choiceTypeNeedsChoices(type)
          ? (interaction.choices?.length ? interaction.choices : [
              createInteractiveVideoChoice(0),
              createInteractiveVideoChoice(1),
            ])
          : [],
        hotspots: [],
      };
    }));
    this.markDirty();
  }

  removeInteractiveVideoInteraction(interactionId: string): void {
    this.sectionInteractiveVideoTimeline.update(
      timeline => removeInteractiveVideoInteractionAndRetargetBranches(timeline, interactionId),
    );
    this.markDirty();
  }

  addInteractiveVideoChoice(interactionId: string): void {
    this.sectionInteractiveVideoTimeline.update(timeline => timeline.map(interaction => {
      if (interaction.id !== interactionId) {
        return interaction;
      }
      const choices = interaction.choices ?? [];
      return {
        ...interaction,
        choices: [...choices, createInteractiveVideoChoice(choices.length)],
      };
    }));
    this.markDirty();
  }

  updateInteractiveVideoChoice(
    interactionId: string,
    choiceId: string,
    patch: Partial<InteractiveVideoChoice>,
  ): void {
    this.sectionInteractiveVideoTimeline.update(timeline => timeline.map(interaction => {
      if (interaction.id !== interactionId) {
        return interaction;
      }
      const choices = (interaction.choices ?? []).map(choice => {
        if (choice.id !== choiceId) {
          return patch.isCorrect === true && interaction.type === 'single_choice'
            ? { ...choice, isCorrect: false }
            : choice;
        }
        return {
          ...choice,
          ...patch,
          targetTimeSeconds: patch.targetTimeSeconds === undefined
            ? choice.targetTimeSeconds
            : patch.targetTimeSeconds === null
              ? null
              : this.toNonNegativeInteger(patch.targetTimeSeconds),
        };
      });
      return { ...interaction, choices };
    }));
    this.markDirty();
  }

  removeInteractiveVideoChoice(interactionId: string, choiceId: string): void {
    this.sectionInteractiveVideoTimeline.update(timeline => timeline.map(interaction => {
      if (interaction.id !== interactionId) {
        return interaction;
      }
      return {
        ...interaction,
        choices: (interaction.choices ?? []).filter(choice => choice.id !== choiceId),
      };
    }));
    this.markDirty();
  }

  // ── Section CRUD ─────────────────────────────────────────────────────

  async saveSection(lessonId: string, courseId: string): Promise<boolean> {
    const title = this.sectionTitle().trim();
    if (!title) {
      this.toast.error('Vui lòng nhập tiêu đề mục');
      return false;
    }

    const type = this.sectionEditorType();

    if (type === 'VIDEO' && !this.sectionVideoAssetId() && !this.sectionVideoUrl() && !this.selectedSectionVideoFile()) {
      this.toast.error('Mục video cần một video. Hãy tải lên hoặc nhập URL.');
      return false;
    }

    if (type === 'VIDEO' && !this.validateInteractiveVideoAuthoring()) {
      return false;
    }

    if (type === 'QUIZ' && this.sectionQuizSelectedQuestions().length === 0) {
      this.toast.error('Bài trắc nghiệm cần ít nhất 1 câu hỏi. Hãy chọn từ ngân hàng hoặc thêm ngẫu nhiên.');
      return false;
    }

    this.isSaving.set(true);

    try {
      // Video upload now happens on file select (upload-on-select pattern)
      // By save time, sectionVideoAssetId is already set

      const payload = this.buildSectionPayload(type);
      const formData = new FormData();
      // NOTE: charset=utf-8 explicit để tránh BE multipart parse Vietnamese
      // diacritics như Latin1 (HTTP RFC 7231 default). Belt + suspenders với
      // BE fix trong parseSectionPayload(byte[]). See #277.
      formData.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json; charset=utf-8' }));

      if (type === 'FILE' && this.selectedFile()) {
        formData.append('file', this.selectedFile()!);
      }

      const isNew = !this.editingSectionId();

      if (isNew) {
        const res: any = await firstValueFrom(this.sectionApi.createSection(lessonId, formData));
        const created = res.data || res;
        this.editingSectionId.set(created?.id ?? null);
        if (created?.id) {
          this.store.addSectionLocal(lessonId, {
            id: created.id,
            title: created.title || payload['title'] || '',
            type: created.type || type,
            content: created.content || payload['content'],
            videoAssetId: created.videoAssetId || payload['videoAssetId'],
            videoProcessingStatus: created.videoProcessingStatus,
            videoUrl: created.videoUrl || payload['videoUrl'],
            videoType: created.videoType || payload['videoType'],
            streamVideoUid: created.streamVideoUid || payload['streamVideoUid'],
            interactiveVideoSpec: created.interactiveVideoSpec ?? payload['interactiveVideoSpec'],
            fileUrl: created.fileUrl,
            orderIndex: created.orderIndex ?? 0,
            isRequired: created.isRequired ?? payload['isRequired'] ?? false,
            completionThreshold: created.completionThreshold ?? payload['completionThreshold'],
            availableOfflineProfiles: created.availableOfflineProfiles ?? [],
            quizData: created.quizData ?? payload['quizData'],
          });
        }
      } else {
        const res: any = await firstValueFrom(this.sectionApi.updateSection(lessonId, this.editingSectionId()!, formData));
        // BE trả ApiResponse<ContentBlock> = { data: { id, type, data: {...flat fields...} } }.
        // Trước đây updateSectionLocal dùng FE payload — local sẽ drift nếu BE merge
        // thay đổi fields (e.g., partial-update merge giữ lại stale fields). Giờ dùng
        // BE response làm source of truth, fallback FE payload khi BE không trả field.
        const block = res?.data ?? res;
        const beData = (block?.data && typeof block.data === 'object') ? block.data : {};
        this.store.updateSectionLocal(lessonId, this.editingSectionId()!, {
          title: (beData['title'] as string) ?? payload['title'] ?? '',
          type: (block?.type ? String(block.type).toUpperCase() : type),
          content: (beData['content'] as string) ?? payload['content'],
          videoAssetId: (beData['videoAssetId'] as string) ?? payload['videoAssetId'],
          videoUrl: (beData['videoUrl'] as string) ?? payload['videoUrl'],
          videoType: (beData['videoType'] as string) ?? payload['videoType'],
          streamVideoUid: (beData['streamVideoUid'] as string) ?? payload['streamVideoUid'],
          interactiveVideoSpec: beData['interactiveVideoSpec'] ?? payload['interactiveVideoSpec'],
          isRequired: (beData['isRequired'] as boolean) ?? payload['isRequired'] ?? false,
          completionThreshold: (beData['completionThreshold'] as number) ?? payload['completionThreshold'],
          quizData: beData['quizData'] ?? payload['quizData'],
        } as any);
      }

      this.selectedSectionVideoFile.set(null);
      this.selectedFile.set(null);
      this.store.invalidateCache(courseId);
      this.closeSectionSurface();
      this.isDirty.set(false);
      this.store.markSaved();
      return true;
    } catch (err: any) {
      this.toast.error('Lưu nội dung thất bại: ' + (err?.error?.message || err?.message || ''));
      return false;
    } finally {
      this.isSaving.set(false);
    }
  }

  async deleteSection(lessonId: string, sectionId: string, courseId: string): Promise<boolean> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa mục nội dung?',
      message: 'Hành động này không thể hoàn tác. Mọi nội dung trong mục sẽ bị xóa vĩnh viễn.',
      variant: 'danger',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
    });
    if (!confirmed) return false;

    try {
      await firstValueFrom(this.sectionApi.deleteSection(lessonId, sectionId));
      this.store.removeSectionLocal(lessonId, sectionId);
      if (this.editingSectionId() === sectionId) {
        this.closeSectionSurface();
      }
      this.store.markSaved();
      return true;
    } catch (err: any) {
      this.toast.error('Xóa thất bại: ' + (err?.error?.message || ''));
      return false;
    }
  }

  // ── Video pipeline ───────────────────────────────────────────────────

  private static readonly MAX_VIDEO_SIZE_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB
  private activeUploadSub: Subscription | null = null;
  private uploadStartTime = 0;
  private lastProgressBytes = 0;
  private lastProgressTime = 0;

  private async uploadVideoAsset(file: File): Promise<VideoAssetResponse> {
    this.sectionVideoIsUploading.set(true);
    this.sectionVideoUploadProgress.set(0);
    this.sectionVideoUploadSpeed.set(null);
    this.sectionVideoUploadEta.set(null);
    this.uploadStartTime = Date.now();
    this.lastProgressBytes = 0;
    this.lastProgressTime = Date.now();

    try {
      const uploadResult = await new Promise<Extract<UploadEvent, { type: 'complete' }>>((resolve, reject) => {
        this.activeUploadSub = this.presignedUpload.upload(file, 'videos').subscribe({
          next: (event: UploadEvent) => {
            if (event.type === 'progress') {
              this.sectionVideoUploadProgress.set(event.progress);
              this.updateUploadMetrics(event.progress, file.size);
            } else if (event.type === 'complete') {
              this.sectionVideoUploadProgress.set(100);
              this.sectionVideoUploadSpeed.set(null);
              this.sectionVideoUploadEta.set(null);
              resolve(event);
            }
          },
          error: reject,
        });
      });

      const res: ApiResponse<VideoAssetResponse> = await firstValueFrom(
        this.videoAssetApi.createFromUpload(uploadResult.id, file.name),
      );
      return res.data;
    } finally {
      this.sectionVideoIsUploading.set(false);
      this.activeUploadSub = null;
    }
  }

  private updateUploadMetrics(progress: number, totalBytes: number): void {
    const now = Date.now();
    const uploadedBytes = Math.round(totalBytes * progress / 100);
    const timeSinceLastSec = (now - this.lastProgressTime) / 1000;

    if (timeSinceLastSec >= 0.5) {
      const bytesDelta = uploadedBytes - this.lastProgressBytes;
      const speedBps = bytesDelta / timeSinceLastSec;
      this.lastProgressBytes = uploadedBytes;
      this.lastProgressTime = now;

      if (speedBps > 0) {
        this.sectionVideoUploadSpeed.set(this.formatSpeed(speedBps));
        const remainingBytes = totalBytes - uploadedBytes;
        const etaSec = Math.ceil(remainingBytes / speedBps);
        this.sectionVideoUploadEta.set(this.formatEta(etaSec));
      }
    }
  }

  private formatSpeed(bytesPerSecond: number): string {
    const mbps = bytesPerSecond / (1024 * 1024);
    if (mbps >= 1) return `${mbps.toFixed(1)} MB/s`;
    const kbps = bytesPerSecond / 1024;
    return `${kbps.toFixed(0)} KB/s`;
  }

  private formatEta(seconds: number): string {
    if (seconds < 60) return `~${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m < 60) return `~${m}m ${s}s`;
    const h = Math.floor(m / 60);
    return `~${h}h ${m % 60}m`;
  }

  cancelVideoUpload(): void {
    if (this.activeUploadSub) {
      this.activeUploadSub.unsubscribe();
      this.activeUploadSub = null;
    }
    this.sectionVideoIsUploading.set(false);
    this.sectionVideoUploadProgress.set(0);
    this.sectionVideoUploadSpeed.set(null);
    this.sectionVideoUploadEta.set(null);
    this.selectedSectionVideoFile.set(null);
    this.sectionVideoFileName.set(null);
    this.sectionVideoFileSize.set(0);
    this.sectionVideoDurationSec.set(null);
    this.sectionVideoWidth.set(null);
    this.sectionVideoHeight.set(null);
    this.sectionVideoLocalPoster.set(null);
    this.sectionVideoError.set(null);
    this.sectionVideoErrorDetail.set(null);
    this.toast.info('Đã hủy tải lên video.');
  }

  async startVideoUpload(file: File): Promise<void> {
    if (file.size > CurriculumEditorService.MAX_VIDEO_SIZE_BYTES) {
      const sizeGB = (file.size / (1024 * 1024 * 1024)).toFixed(1);
      this.toast.error(`File quá lớn (${sizeGB} GB). Giới hạn tối đa: 5 GB.`);
      return;
    }

    this.selectedSectionVideoFile.set(file);
    this.sectionVideoFileName.set(file.name);
    this.sectionVideoFileSize.set(file.size);
    this.sectionVideoErrorDetail.set(null);
    this.sectionVideoError.set(null);
    this.sectionVideoDurationSec.set(null);
    this.sectionVideoWidth.set(null);
    this.sectionVideoHeight.set(null);
    this.sectionVideoLocalPoster.set(null);
    this.sectionVideoProcessingEtaSec.set(null);
    this.sectionVideoProcessingStartedAt.set(null);
    this.markDirty();

    // Kick off client-side probe in parallel with the upload.
    // Probe is best-effort; failures don't block the pipeline.
    this.probeLocalVideo(file);

    try {
      const asset = await this.uploadVideoAsset(file);
      this.sectionVideoAssetId.set(asset.id);
      const initialStatus = asset.status ?? 'PROCESSING';
      this.sectionVideoProcessingStatus.set(initialStatus);
      this.sectionVideoProcessingStartedAt.set(Date.now());
      this.sectionVideoProcessingEtaSec.set(
        estimateProcessingSeconds(this.sectionVideoDurationSec()),
      );
      this.scheduleSectionVideoPoll(asset.id);
      this.selectedSectionVideoFile.set(null);
    } catch (err: any) {
      this.sectionVideoIsUploading.set(false);
      this.sectionVideoUploadProgress.set(0);
      this.sectionVideoUploadSpeed.set(null);
      this.sectionVideoUploadEta.set(null);
      this.selectedSectionVideoFile.set(null);
      const info = classifyUploadError(err);
      this.sectionVideoError.set(info);
      this.sectionVideoErrorDetail.set(info.hint);
      if (info.category !== 'canceled') {
        this.toast.error(info.title);
      }
    }
  }

  private async probeLocalVideo(file: File): Promise<void> {
    try {
      const result: VideoProbeResult = await probeVideoFile(file);
      this.sectionVideoDurationSec.set(result.durationSeconds);
      this.sectionVideoWidth.set(result.width);
      this.sectionVideoHeight.set(result.height);
      this.sectionVideoLocalPoster.set(result.posterDataUrl);
      // Refresh ETA once we know the duration (if processing already started).
      if (this.sectionVideoProcessingStatus() === 'PROCESSING' || this.sectionVideoProcessingStatus() === 'PENDING') {
        this.sectionVideoProcessingEtaSec.set(estimateProcessingSeconds(result.durationSeconds));
      }
    } catch {
      // Probe failed — leave all metadata null; UI will fall back to filename.
    }
  }

  private videoPollAttempt = 0;
  private static readonly MAX_VIDEO_POLL_ATTEMPTS = 60;

  scheduleSectionVideoPoll(assetId: string, delayMs?: number): void {
    this.clearSectionVideoPoll();

    if (this.videoPollAttempt >= CurriculumEditorService.MAX_VIDEO_POLL_ATTEMPTS) {
      this.videoPollAttempt = 0;
      this.sectionVideoProcessingStatus.set('TIMEOUT');
      this.toast.error('Kiểm tra trạng thái video quá lâu. Hãy tải lại trang hoặc thử lại.');
      return;
    }

    const baseDelay = 3000;
    const maxDelay = 30000;
    const jitter = Math.random() * 1000;
    const computedDelay = delayMs ?? Math.min(baseDelay * Math.pow(1.5, this.videoPollAttempt), maxDelay) + jitter;

    this.sectionVideoPollTimer = setTimeout(async () => {
      this.videoPollAttempt++;
      try {
        const res: ApiResponse<VideoAssetResponse> = await firstValueFrom(this.videoAssetApi.getById(assetId));
        const asset = res.data;
        const previousStatus = this.sectionVideoProcessingStatus();
        this.sectionVideoProcessingStatus.set(asset.status ?? null);

        if (asset.status === 'READY') {
          this.videoPollAttempt = 0;
          this.sectionVideoAvailableOfflineProfiles.set(asset.availableOfflineProfiles ?? []);
          // Fallback to server metadata if client probe failed.
          if (this.sectionVideoDurationSec() == null && asset.durationSeconds) {
            this.sectionVideoDurationSec.set(asset.durationSeconds);
          }
          if (this.sectionVideoWidth() == null && asset.width) this.sectionVideoWidth.set(asset.width);
          if (this.sectionVideoHeight() == null && asset.height) this.sectionVideoHeight.set(asset.height);
          try {
            const playRes = await firstValueFrom(this.videoAssetApi.getPlayUrl(assetId));
            this.sectionVideoUrl.set(playRes.data?.playUrl ?? asset.playbackUrl ?? '');
          } catch {
            this.sectionVideoUrl.set(asset.playbackUrl ?? '');
          }
          this.notifyVideoCompletion(previousStatus, 'READY');
          return;
        }
        if (asset.status === 'FAILED') {
          this.videoPollAttempt = 0;
          const info = classifyTranscodeError(asset.errorMessage);
          this.sectionVideoError.set(info);
          this.sectionVideoErrorDetail.set(asset.errorMessage ?? info.hint);
          this.notifyVideoCompletion(previousStatus, 'FAILED');
          return;
        }
        this.scheduleSectionVideoPoll(assetId);
      } catch {
        this.scheduleSectionVideoPoll(assetId);
      }
    }, computedDelay);
  }

  private notifyVideoCompletion(previousStatus: string | null, nextStatus: 'READY' | 'FAILED'): void {
    // Only toast on an actual PROCESSING→terminal transition — not when we rehydrate
    // an already-ready section from server and the first poll already reports READY.
    const wasInFlight = previousStatus === 'PROCESSING' || previousStatus === 'PENDING' || previousStatus == null;
    if (!wasInFlight) return;

    const fileName = this.sectionVideoFileName();
    if (nextStatus === 'READY') {
      const msg = fileName
        ? `Video "${fileName}" đã sẵn sàng phát.`
        : 'Video đã sẵn sàng phát.';
      this.toast.success(msg);
    } else {
      this.toast.error('Xử lý video thất bại. Bạn có thể thử lại.');
    }
  }

  private clearSectionVideoPoll(): void {
    if (this.sectionVideoPollTimer) {
      clearTimeout(this.sectionVideoPollTimer);
      this.sectionVideoPollTimer = null;
    }
  }

  async retrySectionVideoAsset(): Promise<void> {
    const assetId = this.sectionVideoAssetId();
    if (!assetId) return;

    try {
      await firstValueFrom(this.videoAssetApi.retry(assetId) as any);
      this.sectionVideoProcessingStatus.set('PROCESSING');
      this.sectionVideoErrorDetail.set(null);
      this.sectionVideoError.set(null);
      this.sectionVideoProcessingStartedAt.set(Date.now());
      this.sectionVideoProcessingEtaSec.set(
        estimateProcessingSeconds(this.sectionVideoDurationSec()),
      );
      this.scheduleSectionVideoPoll(assetId);
    } catch {
      this.toast.error('Thử lại xử lý video thất bại');
    }
  }

  // ── Internal ─────────────────────────────────────────────────────────

  private validateInteractiveVideoAuthoring(): boolean {
    const blockingIssue = getInteractiveVideoAuthoringIssues(
      this.sectionInteractiveVideoEnabled(),
      this.sectionInteractiveVideoTimeline(),
      { durationSeconds: this.sectionVideoDurationSec() },
    ).find(issue => issue.severity === 'error');

    if (blockingIssue) {
      this.toast.error(blockingIssue.message);
      return false;
    }

    return true;
  }

  private toNonNegativeInteger(value: unknown): number {
    const next = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(next) ? Math.max(0, Math.round(next)) : 0;
  }

  private buildSectionPayload(type: SectionEditorType): Record<string, any> {
    const payload: Record<string, any> = {
      title: stripCurriculumPrefix(this.sectionTitle().trim(), 'section'),
      type,
      isRequired: this.sectionIsRequired(),
    };

    if (type === 'TEXT') {
      payload['content'] = this.sectionContent();
    } else if (type === 'VIDEO') {
      payload['videoAssetId'] = this.sectionVideoAssetId();
      payload['videoUrl'] = this.sectionVideoUrl();
      payload['videoType'] = this.sectionVideoType();
      payload['streamVideoUid'] = this.sectionStreamVideoUid();
      payload['completionThreshold'] = this.sectionCompletionThreshold();
      payload['interactiveVideoSpec'] = buildInteractiveVideoSpec(
        this.sectionInteractiveVideoEnabled(),
        this.sectionInteractiveVideoTimeline(),
      );
    } else if (type === 'QUIZ') {
      payload['quizData'] = {
        quizType: this.sectionQuizType(),
        countsTowardCertificate: this.sectionQuizCountsTowardCertificate(),
        timeLimitMinutes: this.sectionQuizTimeLimit(),
        passingScore: this.sectionQuizPassingScore(),
        maxAttempts: this.sectionQuizMaxAttempts(),
        shuffleQuestions: this.sectionQuizShuffleQuestions(),
        shuffleOptions: this.sectionQuizShuffleOptions(),
        showResultsImmediately: this.sectionQuizShowResults(),
        showCorrectAnswers: this.sectionQuizShowCorrectAnswers(),
        questionIds: this.sectionQuizSelectedQuestions().map((q: any) => q.id),
      };
    }
    // FILE type: file attached via FormData, no extra payload fields needed

    return payload;
  }

  hydrateSectionForm(section: SectionDraftDTO): void {
    this.sectionTitle.set(this.stripSectionPrefix(section.title || ''));
    this.sectionContent.set(section.content || '');
    this.sectionIsRequired.set(section.isRequired ?? false);
    this.sectionCompletionThreshold.set(section.completionThreshold ?? 50);

    // Video
    this.sectionVideoAssetId.set(section.videoAssetId ?? null);
    this.sectionVideoProcessingStatus.set(section.videoProcessingStatus ?? null);
    this.sectionVideoAvailableOfflineProfiles.set(section.availableOfflineProfiles ?? []);
    this.sectionVideoUrl.set(section.videoUrl || '');
    this.sectionVideoType.set(section.videoType ?? null);
    this.sectionStreamVideoUid.set(section.streamVideoUid ?? null);
    const interactiveSpec = normalizeInteractiveVideoSpec(section.interactiveVideoSpec);
    this.sectionInteractiveVideoEnabled.set(
      interactiveSpec?.enabled === true || (interactiveSpec?.timeline.length ?? 0) > 0,
    );
    this.sectionInteractiveVideoTimeline.set(interactiveSpec?.timeline ?? []);
    this.selectedSectionVideoFile.set(null);
    // Reset local-only signals when hydrating from server data.
    this.sectionVideoLocalPoster.set(null);
    this.sectionVideoFileName.set(null);
    this.sectionVideoFileSize.set(0);
    this.sectionVideoProcessingEtaSec.set(null);
    this.sectionVideoProcessingStartedAt.set(
      section.videoProcessingStatus === 'PROCESSING' || section.videoProcessingStatus === 'PENDING'
        ? Date.now()
        : null,
    );
    this.sectionVideoError.set(null);
    this.sectionVideoErrorDetail.set(null);
    // Server-side metadata is fetched lazily from videoAssetApi.getById during poll.
    this.sectionVideoDurationSec.set(null);
    this.sectionVideoWidth.set(null);
    this.sectionVideoHeight.set(null);

    if (section.videoAssetId) {
      const status = section.videoProcessingStatus;
      if (status === 'PENDING' || status === 'PROCESSING' || (status == null && !section.videoUrl)) {
        this.scheduleSectionVideoPoll(section.videoAssetId);
      } else if (status === 'READY' && !section.videoUrl) {
        this.videoAssetApi.getPlayUrl(section.videoAssetId).subscribe({
          next: (res: any) => this.sectionVideoUrl.set(res.data?.playUrl ?? ''),
          error: () => {},
        });
      }
      // Best-effort: fetch asset metadata so the preview card can show duration + resolution.
      if (status === 'READY') {
        this.videoAssetApi.getById(section.videoAssetId).subscribe({
          next: (res: any) => {
            const a = res?.data;
            if (!a) return;
            if (a.durationSeconds) this.sectionVideoDurationSec.set(a.durationSeconds);
            if (a.width) this.sectionVideoWidth.set(a.width);
            if (a.height) this.sectionVideoHeight.set(a.height);
            if (a.originalFileName) this.sectionVideoFileName.set(a.originalFileName);
            if (a.sourceFileSize) this.sectionVideoFileSize.set(a.sourceFileSize);
          },
          error: () => {},
        });
      }
    }

    // File
    this.sectionFileUrl.set(section.fileUrl ?? null);
    this.selectedFile.set(null);
    if (section.type === 'FILE') {
      this.sectionPreviewStatus.set(section.previewStatus ?? null);
      const previewUrl = section.previewPdfUrl ?? null;
      const canEmbedPreview = !!previewUrl && (!section.previewStatus || section.previewStatus === 'READY');
      if (canEmbedPreview) {
        this.safePdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(previewUrl));
      } else {
        this.safePdfUrl.set(null);
      }
    } else {
      this.safePdfUrl.set(null);
      this.sectionPreviewStatus.set(null);
    }

    // Quiz
    if (section.type === 'QUIZ' && section.quizData) {
      const qd = section.quizData as any;
      this.sectionQuizType.set((qd.quizType as SectionQuizAssessmentType) || 'PRACTICE');
      this.sectionQuizCountsTowardCertificate.set(qd.countsTowardCertificate ?? false);
      this.sectionQuizTimeLimit.set(qd.timeLimitMinutes ?? 30);
      this.sectionQuizPassingScore.set(qd.passingScore ?? 60);
      this.sectionQuizMaxAttempts.set(qd.maxAttempts ?? 1);
      this.sectionQuizShuffleQuestions.set(qd.shuffleQuestions ?? true);
      this.sectionQuizShuffleOptions.set(qd.shuffleOptions ?? true);
      this.sectionQuizShowResults.set(qd.showResultsImmediately ?? true);
      this.sectionQuizShowCorrectAnswers.set(qd.showCorrectAnswers ?? true);
      this.sectionQuizSelectedQuestions.set(qd.questions ?? []);
    } else {
      this.resetQuizFields();
    }

    // Video polling for in-progress assets.
    // 'PENDING' = asset created, ingest worker hasn't started yet.
    // 'PROCESSING' = worker picked it up.
    // null = backend couldn't resolve the asset view (rare, treat same as in-progress).
    if (section.videoAssetId && (
      section.videoProcessingStatus === 'PROCESSING' ||
      section.videoProcessingStatus === 'PENDING' ||
      (section.videoProcessingStatus == null && !section.videoUrl)
    )) {
      this.scheduleSectionVideoPoll(section.videoAssetId);
    }

    this.isDirty.set(false);
  }

  resetSectionForm(): void {
    this.sectionTitle.set('');
    this.sectionContent.set('');
    this.sectionIsRequired.set(false);
    this.sectionCompletionThreshold.set(50);

    this.sectionVideoAssetId.set(null);
    this.sectionVideoProcessingStatus.set(null);
    this.sectionVideoAvailableOfflineProfiles.set([]);
    this.sectionVideoUrl.set('');
    this.sectionVideoType.set(null);
    this.sectionStreamVideoUid.set(null);
    this.sectionInteractiveVideoEnabled.set(false);
    this.sectionInteractiveVideoTimeline.set([]);
    this.selectedSectionVideoFile.set(null);
    this.sectionVideoUploadProgress.set(0);
    this.sectionVideoIsUploading.set(false);
    this.sectionVideoFileName.set(null);
    this.sectionVideoFileSize.set(0);
    this.sectionVideoDurationSec.set(null);
    this.sectionVideoWidth.set(null);
    this.sectionVideoHeight.set(null);
    this.sectionVideoLocalPoster.set(null);
    this.sectionVideoProcessingEtaSec.set(null);
    this.sectionVideoProcessingStartedAt.set(null);
    this.sectionVideoError.set(null);
    this.sectionVideoErrorDetail.set(null);

    this.selectedFile.set(null);
    this.sectionFileUrl.set(null);
    this.safePdfUrl.set(null);
    this.sectionPreviewStatus.set(null);

    this.resetQuizFields();
    this.clearSectionVideoPoll();
    this.isDirty.set(false);
  }

  private stripSectionPrefix(title: string): string {
    return stripCurriculumPrefix(title, 'section');
  }

  private resetQuizFields(): void {
    this.sectionQuizType.set('PRACTICE');
    this.sectionQuizCountsTowardCertificate.set(false);
    this.sectionQuizTimeLimit.set(30);
    this.sectionQuizPassingScore.set(60);
    this.sectionQuizMaxAttempts.set(1);
    this.sectionQuizShuffleQuestions.set(true);
    this.sectionQuizShuffleOptions.set(true);
    this.sectionQuizShowResults.set(true);
    this.sectionQuizShowCorrectAnswers.set(true);
    this.sectionQuizSelectedQuestions.set([]);
    this.showSectionQuizBankModal.set(false);
    this.showSectionQuizRandomModal.set(false);
    this.sectionQuizRandomCount.set(5);
  }
}
