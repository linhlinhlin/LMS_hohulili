import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom, filter } from 'rxjs';
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
 * Scoped to the course-editor route via `providedIn: 'root'`.
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

  // ── Section surface state ────────────────────────────────────────────
  readonly sectionSurfaceMode = signal<SectionSurfaceMode>('closed');
  readonly sectionEditorType = signal<SectionEditorType>('TEXT');
  readonly editingSectionId = signal<string | null>(null);
  readonly isSectionSurfaceOpen = computed(() => this.sectionSurfaceMode() !== 'closed');

  // ── Section form state ───────────────────────────────────────────────
  readonly sectionTitle = signal('');
  readonly sectionContent = signal('');
  readonly sectionIsRequired = signal(false);

  // Video
  readonly sectionVideoAssetId = signal<string | null>(null);
  readonly sectionVideoProcessingStatus = signal<string | null>(null);
  readonly sectionVideoAvailableOfflineProfiles = signal<OfflineVideoProfileDescriptor[]>([]);
  readonly sectionVideoUrl = signal('');
  readonly sectionVideoType = signal<'YOUTUBE' | 'CLOUDFLARE' | null>(null);
  readonly sectionStreamVideoUid = signal<string | null>(null);
  readonly selectedSectionVideoFile = signal<File | null>(null);

  // File
  readonly selectedFile = signal<File | null>(null);
  readonly sectionFileUrl = signal<string | null>(null);
  readonly safePdfUrl = signal<SafeResourceUrl | null>(null);

  // Quiz
  readonly sectionQuizType = signal<SectionQuizAssessmentType>('PRACTICE');
  readonly sectionQuizCountsTowardCertificate = signal(false);
  readonly sectionQuizTimeLimit = signal(30);
  readonly sectionQuizPassingScore = signal(60);
  readonly sectionQuizMaxAttempts = signal(1);
  readonly sectionQuizShuffleQuestions = signal(true);
  readonly sectionQuizShuffleOptions = signal(true);
  readonly sectionQuizShowResults = signal(true);
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

    this.isSaving.set(true);

    try {
      // Upload video if staged
      if (type === 'VIDEO' && this.selectedSectionVideoFile()) {
        const asset = await this.uploadVideoAsset(this.selectedSectionVideoFile()!);
        this.sectionVideoAssetId.set(asset.id);
        this.sectionVideoProcessingStatus.set(asset.status ?? 'PROCESSING');
        this.scheduleSectionVideoPoll(asset.id);
      }

      const payload = this.buildSectionPayload(type);
      const formData = new FormData();
      formData.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }));

      if (type === 'FILE' && this.selectedFile()) {
        formData.append('file', this.selectedFile()!);
      }

      const isNew = !this.editingSectionId();

      if (isNew) {
        const res: any = await firstValueFrom(this.sectionApi.createSection(lessonId, formData));
        const created = res.data || res;
        this.editingSectionId.set(created?.id ?? null);
      } else {
        await firstValueFrom(this.sectionApi.updateSection(lessonId, this.editingSectionId()!, formData));
      }

      this.selectedSectionVideoFile.set(null);
      this.selectedFile.set(null);
      this.store.loadCourse(courseId, true);
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
      this.store.loadCourse(courseId, true);
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

  private async uploadVideoAsset(file: File): Promise<VideoAssetResponse> {
    const uploadResult = await firstValueFrom(
      this.presignedUpload.upload(file, 'videos').pipe(
        filter((event: UploadEvent): event is Extract<UploadEvent, { type: 'complete' }> => event.type === 'complete'),
      ),
    );
    const res: ApiResponse<VideoAssetResponse> = await firstValueFrom(
      this.videoAssetApi.createFromUpload(uploadResult.id, file.name),
    );
    return res.data;
  }

  scheduleSectionVideoPoll(assetId: string, delayMs = 5000): void {
    this.clearSectionVideoPoll();

    this.sectionVideoPollTimer = setTimeout(async () => {
      try {
        const res: ApiResponse<VideoAssetResponse> = await firstValueFrom(this.videoAssetApi.getById(assetId));
        const asset = res.data;
        this.sectionVideoProcessingStatus.set(asset.status ?? null);

        if (asset.status === 'READY') {
          this.sectionVideoAvailableOfflineProfiles.set(asset.availableOfflineProfiles ?? []);
          return; // Done polling
        }
        if (asset.status === 'FAILED') {
          this.toast.error('Xử lý video thất bại. Bạn có thể thử lại.');
          return;
        }
        // Continue polling
        this.scheduleSectionVideoPoll(assetId, 5000);
      } catch {
        // Retry with backoff
        this.scheduleSectionVideoPoll(assetId, 10000);
      }
    }, delayMs);
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
      this.scheduleSectionVideoPoll(assetId);
    } catch {
      this.toast.error('Thử lại xử lý video thất bại');
    }
  }

  // ── Internal ─────────────────────────────────────────────────────────

  private buildSectionPayload(type: SectionEditorType): Record<string, any> {
    const payload: Record<string, any> = {
      title: this.sectionTitle().trim(),
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
        questionIds: this.sectionQuizSelectedQuestions().map((q: any) => q.id),
      };
    }
    // FILE type: file attached via FormData, no extra payload fields needed

    return payload;
  }

  hydrateSectionForm(section: SectionDraftDTO): void {
    this.sectionTitle.set(section.title || '');
    this.sectionContent.set(section.content || '');
    this.sectionIsRequired.set(section.isRequired ?? false);

    // Video
    this.sectionVideoAssetId.set(section.videoAssetId ?? null);
    this.sectionVideoProcessingStatus.set(section.videoProcessingStatus ?? null);
    this.sectionVideoAvailableOfflineProfiles.set(section.availableOfflineProfiles ?? []);
    this.sectionVideoUrl.set(section.videoUrl || '');
    this.sectionVideoType.set(section.videoType ?? null);
    this.sectionStreamVideoUid.set(section.streamVideoUid ?? null);
    this.selectedSectionVideoFile.set(null);

    // File
    this.sectionFileUrl.set(section.fileUrl ?? null);
    this.selectedFile.set(null);
    if (section.type === 'FILE' && section.fileUrl) {
      this.safePdfUrl.set(this.pdfService.getSafePdfUrl(section.fileUrl));
    } else {
      this.safePdfUrl.set(null);
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
      this.sectionQuizSelectedQuestions.set(qd.questions ?? []);
    } else {
      this.resetQuizFields();
    }

    // Video polling for in-progress assets
    if (section.videoAssetId && section.videoProcessingStatus === 'PROCESSING') {
      this.scheduleSectionVideoPoll(section.videoAssetId);
    }

    this.isDirty.set(false);
  }

  resetSectionForm(): void {
    this.sectionTitle.set('');
    this.sectionContent.set('');
    this.sectionIsRequired.set(false);

    this.sectionVideoAssetId.set(null);
    this.sectionVideoProcessingStatus.set(null);
    this.sectionVideoAvailableOfflineProfiles.set([]);
    this.sectionVideoUrl.set('');
    this.sectionVideoType.set(null);
    this.sectionStreamVideoUid.set(null);
    this.selectedSectionVideoFile.set(null);

    this.selectedFile.set(null);
    this.sectionFileUrl.set(null);
    this.safePdfUrl.set(null);

    this.resetQuizFields();
    this.clearSectionVideoPoll();
    this.isDirty.set(false);
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
    this.sectionQuizSelectedQuestions.set([]);
    this.showSectionQuizBankModal.set(false);
    this.showSectionQuizRandomModal.set(false);
    this.sectionQuizRandomCount.set(5);
  }
}
