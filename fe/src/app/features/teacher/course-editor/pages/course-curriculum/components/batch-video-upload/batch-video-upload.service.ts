import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription, firstValueFrom, forkJoin, of } from 'rxjs';
import { catchError, filter, take, tap } from 'rxjs/operators';
import { LessonApi } from '../../../../../../../api/client/lesson.api';
import { SectionApi } from '../../../../../../../api/client/section.api';
import { VideoAssetApi } from '../../../../../../../api/client/video-asset.api';
import { PresignedUploadService, UploadEvent } from '../../../../../../../core/services/presigned-upload.service';
import { ToastService } from '../../../../../../../core/services/toast.service';
import { CourseEditorStore } from '../../../../store/course-editor.store';
import { CurriculumSelectionService } from '../../../../services/curriculum-selection.service';
import {
  DistributableLesson,
  distributeByFilenamePrefix,
  distributeEvenly,
  extractFilenameTitle,
  smartSectionTitle,
} from './batch-distribution.util';
import {
  BatchAggregateProgress,
  BatchItemStatus,
  BatchMode,
  BatchTargetLesson,
  BatchUploadConfig,
  BatchVideoItem,
  DistributionStrategy,
} from './batch-video-upload.types';

const UPLOAD_CONCURRENCY = 3;
const POLL_INTERVAL_MS = 5_000;
/**
 * 720 × 5s = 60 min cap per item.
 * Tăng từ 120 (10 min) → 720 vì backend max 2 concurrent transcode + video lớn
 * (1+ GB) có thể chờ trong queue 15-20 phút trước khi tới lượt. False timeout
 * gây user confusion (BE actually still processing).
 * 60 min cover được mọi case practical (nếu BE thật sự stuck >60min, có vấn đề
 * thực sự cần investigate manual).
 */
const POLL_MAX_ATTEMPTS = 720;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 * 1024; // 5GB per file (matches single-section limit)

/**
 * Batch video upload orchestrator.
 *
 * Trách nhiệm:
 *  - Hold trạng thái N item (file → lesson assignment + upload status)
 *  - Distribute files vào lessons theo strategy (even / prefix / single)
 *  - Cho phép drag-drop reassign + reorder + remove + edit title trước khi upload
 *  - Chạy upload pipeline (max 3 parallel) + aggregated polling (1 timer cho N asset)
 *  - Retry per file, không block file khác
 *  - Sau khi tất cả section trong 1 lesson đã saved → reorderSectionsOptimistic
 *
 * Singleton (providedIn root) để state survive khi modal đóng (background mode).
 *
 * Reuse 100% existing: PresignedUploadService, VideoAssetApi, SectionApi,
 * LessonApi, CourseEditorStore. KHÔNG refactor adjacent code.
 */
@Injectable({ providedIn: 'root' })
export class BatchVideoUploadService {
  private readonly presignedUpload = inject(PresignedUploadService);
  private readonly videoAssetApi = inject(VideoAssetApi);
  private readonly sectionApi = inject(SectionApi);
  private readonly lessonApi = inject(LessonApi);
  private readonly store = inject(CourseEditorStore);
  private readonly selectionService = inject(CurriculumSelectionService);
  private readonly toast = inject(ToastService);

  readonly mode = signal<BatchMode>('IDLE');
  readonly items = signal<BatchVideoItem[]>([]);
  readonly availableLessons = signal<BatchTargetLesson[]>([]);
  readonly config = signal<BatchUploadConfig | null>(null);

  readonly aggregateProgress = computed<BatchAggregateProgress>(() => {
    const list = this.items();
    return {
      totalCount: list.length,
      pendingCount: list.filter((i) => i.status === 'PENDING').length,
      uploadingCount: list.filter(
        (i) => i.status === 'UPLOADING' || i.status === 'ASSET_CREATING' || i.status === 'SECTION_CREATING'
      ).length,
      processingCount: list.filter((i) => i.status === 'PROCESSING').length,
      readyCount: list.filter((i) => i.status === 'READY').length,
      failedCount: list.filter((i) => i.status === 'FAILED').length,
    };
  });

  readonly isAllDone = computed(() => {
    const list = this.items();
    if (list.length === 0) return false;
    return list.every((i) => i.status === 'READY' || i.status === 'FAILED');
  });

  private inFlightCount = 0;
  private pollTimerHandle: ReturnType<typeof setTimeout> | null = null;
  private pollAttemptsByAsset = new Map<string, number>();
  private lessonsAwaitingReorder = new Set<string>();
  /**
   * Active upload subscriptions per item (cho cancel mid-upload).
   * Set khi upload bắt đầu, xoá khi upload xong (bất kỳ lý do gì).
   */
  private activeUploadSubs = new Map<string, Subscription>();

  /**
   * Khởi tạo batch từ files đã pick.
   * Distribute mặc định theo strategy chỉ định (default: PREFIX nếu detect được, else EVEN).
   */
  setupBatch(files: File[], lessons: BatchTargetLesson[], config: BatchUploadConfig): void {
    const validFiles = this.validateFiles(files);
    if (validFiles.length === 0) {
      this.toast.error('Không có file video hợp lệ');
      return;
    }

    this.availableLessons.set(lessons);
    this.config.set(config);

    const distributable: DistributableLesson[] = lessons.map((l) => ({
      id: l.id,
      orderIndex: l.orderIndex,
    }));

    const items: BatchVideoItem[] = [];
    const distribution = this.runDistribution(validFiles, distributable, config.strategy);

    for (const [lessonId, lessonFiles] of distribution.entries()) {
      const existingCount = lessons.find((l) => l.id === lessonId)?.existingSectionCount ?? 0;
      // 1-based position trong lesson, kể cả existing sections.
      // Vd: lesson có 4 mục, video mới đầu → "Video 5"
      let positionInLesson = existingCount + 1;
      for (const file of lessonFiles) {
        items.push({
          id: this.generateLocalId(),
          file,
          lessonId,
          sectionTitle: smartSectionTitle(file.name, positionInLesson++),
          status: 'PENDING',
          uploadProgress: 0,
        });
      }
    }

    this.items.set(items);
    this.mode.set('PREVIEW');
  }

  /** Re-run distribution algorithm với strategy mới (không touch upload status). */
  redistribute(strategy: DistributionStrategy): void {
    const currentItems = this.items();
    if (currentItems.some((i) => i.status !== 'PENDING')) {
      this.toast.warning('Không thể đổi cách phân bổ khi đã bắt đầu upload');
      return;
    }

    const cfg = this.config();
    if (!cfg) return;

    const distributable: DistributableLesson[] = this.availableLessons().map((l) => ({
      id: l.id,
      orderIndex: l.orderIndex,
    }));

    this.config.set({ ...cfg, strategy });
    const files = currentItems.map((i) => i.file);
    const distribution = this.runDistribution(files, distributable, strategy);

    const newItems: BatchVideoItem[] = [];
    const titleByFile = new Map(currentItems.map((i) => [i.file, i.sectionTitle]));

    for (const [lessonId, lessonFiles] of distribution.entries()) {
      const existingCount = this.availableLessons().find((l) => l.id === lessonId)?.existingSectionCount ?? 0;
      let positionInLesson = existingCount + 1;
      for (const file of lessonFiles) {
        newItems.push({
          id: this.generateLocalId(),
          file,
          lessonId,
          // Preserve user-edited titles. Else apply smart naming.
          sectionTitle: titleByFile.get(file) ?? smartSectionTitle(file.name, positionInLesson++),
          status: 'PENDING',
          uploadProgress: 0,
        });
      }
    }

    this.items.set(newItems);
  }

  /** Drag-drop reassign: chuyển item sang lesson khác hoặc reorder trong cùng lesson. */
  moveItem(itemId: string, targetLessonId: string, targetIndex: number): void {
    const list = [...this.items()];
    const fromIdx = list.findIndex((i) => i.id === itemId);
    if (fromIdx < 0) return;

    const item = list[fromIdx];
    if (item.status !== 'PENDING') {
      this.toast.warning('Không thể di chuyển video đã bắt đầu upload');
      return;
    }

    list.splice(fromIdx, 1);

    const itemsInTarget = list.filter((i) => i.lessonId === targetLessonId);
    const insertAt =
      targetIndex >= itemsInTarget.length
        ? this.findEndOfLesson(list, targetLessonId)
        : list.indexOf(itemsInTarget[targetIndex]);

    list.splice(insertAt, 0, { ...item, lessonId: targetLessonId });
    this.items.set(list);
  }

  removeItem(itemId: string): void {
    const list = this.items();
    const item = list.find((i) => i.id === itemId);
    if (!item) return;
    if (item.status !== 'PENDING' && item.status !== 'FAILED') {
      this.toast.warning('Không thể xoá video đang xử lý');
      return;
    }
    this.items.set(list.filter((i) => i.id !== itemId));
  }

  updateTitle(itemId: string, newTitle: string): void {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    this.items.update((list) =>
      list.map((i) => (i.id === itemId ? { ...i, sectionTitle: trimmed } : i))
    );
  }

  /** Tạo lesson mới on-the-fly trong chapter chỉ định, append cuối list lessons. */
  async createNewLesson(chapterId: string, title: string): Promise<BatchTargetLesson | null> {
    try {
      const res = await firstValueFrom(
        this.lessonApi.createLesson(chapterId, { title: title.trim() || 'Bài mới', type: 'LECTURE' as any } as any)
      );
      const created: any = res?.data ?? res;
      if (!created?.id) return null;

      const newLesson: BatchTargetLesson = {
        id: created.id,
        chapterId,
        title: created.title || title,
        orderIndex: created.orderIndex ?? this.availableLessons().length + 1,
        existingSectionCount: 0,
      };

      this.availableLessons.update((list) => [...list, newLesson]);
      return newLesson;
    } catch (err: any) {
      this.toast.error('Không tạo được bài mới: ' + (err?.message ?? 'lỗi không xác định'));
      return null;
    }
  }

  /**
   * Bắt đầu upload pipeline. State chuyển PREVIEW → UPLOADING.
   * Pump queue lên đến UPLOAD_CONCURRENCY pipelines.
   */
  startUpload(): void {
    if (this.mode() !== 'PREVIEW') return;
    if (this.items().length === 0) {
      this.toast.warning('Không có video nào để upload');
      return;
    }
    this.mode.set('UPLOADING');
    this.pumpQueue();
  }

  /**
   * Retry 1 file đã FAILED. Idempotent: không reset attachmentId/videoAssetId/sectionId
   * để runItemPipeline skip steps đã hoàn thành (tránh duplicate sections trong DB).
   *
   * Trường hợp đặc biệt: nếu item đã có videoAssetId VÀ sectionId → fail xảy ra ở
   * polling stage (backend transcode failed). Gọi BE retry endpoint để re-trigger
   * ingest job, không tạo asset/section mới.
   */
  retryItem(itemId: string): void {
    const item = this.items().find((i) => i.id === itemId);
    if (!item || item.status !== 'FAILED') return;

    // Case 1: Failed AFTER section creation (transcoding failed) → trigger BE retry
    if (item.videoAssetId && item.sectionId) {
      void this.retryBackendTranscode(itemId, item.videoAssetId);
      return;
    }

    // Case 2: Failed BEFORE section creation → reset to PENDING, pipeline picks up
    // from where it stopped (idempotent — checks attachmentId/videoAssetId before
    // each step).
    this.items.update((list) =>
      list.map((i) =>
        i.id === itemId
          ? { ...i, status: 'PENDING' as BatchItemStatus, errorMessage: undefined, uploadProgress: 0 }
          : i
      )
    );
    this.pumpQueue();
  }

  /**
   * Cancel UPLOADING in-flight: abort XHR via subscription unsubscribe.
   * PresignedUploadService cancel-on-unsubscribe per their internal XHR handling.
   * Item chuyển sang FAILED với lý do "Đã huỷ".
   */
  cancelItem(itemId: string): void {
    const item = this.items().find((i) => i.id === itemId);
    if (!item) return;
    if (item.status !== 'UPLOADING' && item.status !== 'ASSET_CREATING') return;

    const sub = this.activeUploadSubs.get(itemId);
    if (sub) {
      sub.unsubscribe();
      this.activeUploadSubs.delete(itemId);
    }
    this.markItemFailed(itemId, 'Đã huỷ');
  }

  private async retryBackendTranscode(itemId: string, assetId: string): Promise<void> {
    this.updateItem(itemId, { status: 'PROCESSING', errorMessage: undefined });
    this.pollAttemptsByAsset.delete(assetId);
    try {
      await firstValueFrom(this.videoAssetApi.retry(assetId));
      this.ensurePollingLoop();
    } catch (err: any) {
      this.markItemFailed(itemId, this.formatError(err));
    }
  }

  /** Reset state. Cancel mọi in-flight uploads để không leak subscription. */
  reset(): void {
    if (this.pollTimerHandle) {
      clearTimeout(this.pollTimerHandle);
      this.pollTimerHandle = null;
    }
    for (const sub of this.activeUploadSubs.values()) {
      sub.unsubscribe();
    }
    this.activeUploadSubs.clear();
    this.pollAttemptsByAsset.clear();
    this.lessonsAwaitingReorder.clear();
    this.inFlightCount = 0;
    this.items.set([]);
    this.availableLessons.set([]);
    this.config.set(null);
    this.mode.set('IDLE');
  }

  // ──── Private ────────────────────────────────────────────────────────────

  private validateFiles(files: File[]): File[] {
    const valid: File[] = [];
    const tooLarge: string[] = [];
    const wrongType: string[] = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        tooLarge.push(file.name);
        continue;
      }
      if (file.type && !file.type.startsWith('video/')) {
        wrongType.push(file.name);
        continue;
      }
      valid.push(file);
    }

    if (tooLarge.length > 0) {
      this.toast.warning(`Bỏ qua ${tooLarge.length} file quá 5GB`);
    }
    if (wrongType.length > 0) {
      this.toast.warning(`Bỏ qua ${wrongType.length} file không phải video`);
    }
    return valid;
  }

  private runDistribution(
    files: File[],
    lessons: DistributableLesson[],
    strategy: DistributionStrategy
  ): Map<string, File[]> {
    if (lessons.length === 0) {
      return new Map();
    }

    if (strategy === 'SINGLE_LESSON') {
      return new Map([[lessons[0].id, files]]);
    }

    if (strategy === 'PREFIX') {
      const prefixResult = distributeByFilenamePrefix(files, lessons);
      if (prefixResult) return prefixResult;
      // Fallback to even when prefix detection fails
      return distributeEvenly(files, lessons);
    }

    return distributeEvenly(files, lessons);
  }

  private findEndOfLesson(list: BatchVideoItem[], lessonId: string): number {
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].lessonId === lessonId) return i + 1;
    }
    return list.length;
  }

  private generateLocalId(): string {
    return crypto.randomUUID();
  }

  private pumpQueue(): void {
    while (this.inFlightCount < UPLOAD_CONCURRENCY) {
      const next = this.items().find((i) => i.status === 'PENDING');
      if (!next) break;
      this.inFlightCount++;
      this.updateItemStatus(next.id, 'UPLOADING');
      void this.runItemPipeline(next.id);
    }
    this.ensurePollingLoop();
    this.maybeCompleteBatch();
  }

  /**
   * Idempotent pipeline: 4 steps, mỗi step skip nếu output đã tồn tại trong item state.
   * Tránh duplicate sections nếu retry xảy ra giữa pipeline (vd: fail ở step 3 →
   * không re-upload + re-register asset).
   *
   * Step state machine:
   *   !attachmentId → UPLOADING (upload to R2)
   *   !videoAssetId → ASSET_CREATING (register backend)
   *   !sectionId    → SECTION_CREATING (POST lesson section)
   *   else          → PROCESSING (poll until READY) hoặc READY (nếu BE đã READY)
   */
  private async runItemPipeline(itemId: string): Promise<void> {
    try {
      const initial = this.items().find((i) => i.id === itemId);
      if (!initial) return;

      // ─── Step 1: Upload to R2 (skip nếu đã có attachmentId) ───
      let attachmentId = initial.attachmentId;
      if (!attachmentId) {
        const uploadResult = await this.runUploadStep(itemId, initial.file);
        attachmentId = uploadResult.id;
        this.updateItem(itemId, { attachmentId });
      }

      // ─── Step 2: Register video asset (skip nếu đã có videoAssetId) ───
      this.updateItemStatus(itemId, 'ASSET_CREATING');
      let videoAssetId = this.items().find((i) => i.id === itemId)?.videoAssetId;
      let asset: any = null;

      if (!videoAssetId) {
        const assetRes: any = await firstValueFrom(
          this.videoAssetApi.createFromUpload(attachmentId, initial.file.name)
        );
        asset = assetRes?.data ?? assetRes;
        if (!asset?.id) throw new Error('Backend không trả videoAssetId');
        videoAssetId = asset.id;
        this.updateItem(itemId, { videoAssetId });
      } else {
        // Asset đã tồn tại — fetch hiện tại để biết status (READY/PROCESSING/FAILED)
        const assetRes: any = await firstValueFrom(this.videoAssetApi.getById(videoAssetId));
        asset = assetRes?.data ?? assetRes;
      }

      // ─── Step 3: Create section (skip nếu đã có sectionId) ───
      this.updateItemStatus(itemId, 'SECTION_CREATING');
      const current = this.items().find((i) => i.id === itemId);
      let sectionId = current?.sectionId;

      if (!sectionId) {
        const currentTitle = current?.sectionTitle ?? extractFilenameTitle(initial.file.name);
        const sectionPayload = {
          title: currentTitle,
          type: 'VIDEO',
          isRequired: false,
          videoAssetId,
          videoType: 'ADAPTIVE_R2',
        };
        const formData = new FormData();
        formData.append(
          'data',
          new Blob([JSON.stringify(sectionPayload)], { type: 'application/json; charset=utf-8' })
        );

        const sectionRes: any = await firstValueFrom(this.sectionApi.createSection(initial.lessonId, formData));
        const created = sectionRes?.data ?? sectionRes;
        if (!created?.id) throw new Error('Backend không trả sectionId');

        sectionId = created.id;
        this.updateItem(itemId, { sectionId });
        this.lessonsAwaitingReorder.add(initial.lessonId);

        this.store.addSectionLocal(initial.lessonId, {
          id: created.id,
          title: created.title || currentTitle,
          type: 'VIDEO',
          videoAssetId,
          videoProcessingStatus: asset?.status,
          videoType: 'ADAPTIVE_R2',
          orderIndex: created.orderIndex ?? 0,
          isRequired: false,
          availableOfflineProfiles: [],
        } as any);
      }

      // ─── Step 4: PROCESSING (polling) hoặc READY ───
      if (asset?.status === 'READY') {
        this.updateItemStatus(itemId, 'READY');
      } else {
        // Set processingStartedAt + ETA estimate cho UI per-item progress
        const processingPosition = this.computeProcessingQueuePosition(itemId);
        const etaSec = this.estimateProcessingEtaSec(initial.file.size, processingPosition);
        this.updateItem(itemId, {
          status: 'PROCESSING',
          processingStartedAt: Date.now(),
          processingEtaSec: etaSec,
        });
      }
      // Force sync selection ref ngay cả khi component effect bị editorDirty guard skip
      this.forceSyncSelectionForLesson(initial.lessonId);
    } catch (err: any) {
      this.markItemFailed(itemId, this.formatError(err));
    } finally {
      this.activeUploadSubs.delete(itemId);
      this.inFlightCount = Math.max(0, this.inFlightCount - 1);
      this.pumpQueue();
    }
  }

  /**
   * Wrap upload Observable thành Promise + lưu Subscription để cancel.
   * Không dùng firstValueFrom trực tiếp vì cần access subscription handle.
   */
  private runUploadStep(itemId: string, file: File): Promise<{ id: string; url: string; key: string }> {
    return new Promise((resolve, reject) => {
      const sub = this.presignedUpload.upload(file, 'videos').subscribe({
        next: (event: UploadEvent) => {
          if (event.type === 'progress') {
            this.updateItemProgress(itemId, event.progress);
          } else if (event.type === 'complete') {
            resolve({ id: event.id, url: event.url, key: event.key });
          }
        },
        error: (err) => reject(err),
      });
      this.activeUploadSubs.set(itemId, sub);
    });
  }

  private ensurePollingLoop(): void {
    if (this.pollTimerHandle) return;
    const hasProcessing = this.items().some((i) => i.status === 'PROCESSING');
    if (!hasProcessing) return;

    this.pollTimerHandle = setTimeout(() => {
      this.pollTimerHandle = null;
      void this.pollProcessingItems();
    }, POLL_INTERVAL_MS);
  }

  private async pollProcessingItems(): Promise<void> {
    const processing = this.items().filter(
      (i) => i.status === 'PROCESSING' && !!i.videoAssetId
    );
    if (processing.length === 0) {
      this.maybeCompleteBatch();
      return;
    }

    const requests = processing.map((item) =>
      this.videoAssetApi.getById(item.videoAssetId!).pipe(
        catchError(() => of(null))
      )
    );

    try {
      const responses = await firstValueFrom(forkJoin(requests));
      responses.forEach((res: any, idx: number) => {
        const item = processing[idx];
        if (!res) return;
        const asset = res?.data ?? res;
        const attempts = (this.pollAttemptsByAsset.get(item.videoAssetId!) ?? 0) + 1;
        this.pollAttemptsByAsset.set(item.videoAssetId!, attempts);

        if (asset?.status === 'READY') {
          this.updateItemStatus(item.id, 'READY');
          // Propagate status update vào store cho main content auto-refresh
          // (lecture-sections-panel hiển thị videoProcessingStatus per row)
          if (item.sectionId) {
            this.store.updateSectionLocal(item.lessonId, item.sectionId, {
              videoProcessingStatus: 'READY',
            } as any);
            this.forceSyncSelectionForLesson(item.lessonId);
          }
        } else if (asset?.status === 'FAILED') {
          this.markItemFailed(item.id, asset.errorMessage || 'Backend xử lý thất bại');
          if (item.sectionId) {
            this.store.updateSectionLocal(item.lessonId, item.sectionId, {
              videoProcessingStatus: 'FAILED',
            } as any);
            this.forceSyncSelectionForLesson(item.lessonId);
          }
        } else if (attempts >= POLL_MAX_ATTEMPTS) {
          this.markItemFailed(
            item.id,
            'Quá thời gian chờ xử lý (60 phút). Backend có thể đang quá tải.'
          );
        }
      });
    } catch {
      // Network error trên polling — không sao, lần sau sẽ retry
    }

    // Schedule next poll if there's still PROCESSING items
    if (this.items().some((i) => i.status === 'PROCESSING')) {
      this.pollTimerHandle = setTimeout(() => {
        this.pollTimerHandle = null;
        void this.pollProcessingItems();
      }, POLL_INTERVAL_MS);
    } else {
      this.maybeCompleteBatch();
    }
  }

  private maybeCompleteBatch(): void {
    if (!this.isAllDone()) return;
    if (this.mode() === 'COMPLETE') return;
    this.mode.set('COMPLETE');

    // Reorder sections per lesson to match user's intended order
    for (const lessonId of this.lessonsAwaitingReorder) {
      this.reorderLessonSections(lessonId);
    }

    const { readyCount, failedCount, totalCount } = this.aggregateProgress();
    if (failedCount === 0) {
      this.toast.success(`Đã hoàn thành ${readyCount}/${totalCount} video`);
    } else if (readyCount === 0) {
      this.toast.error(`Tất cả ${totalCount} video đều thất bại — kiểm tra lại`);
    } else {
      this.toast.warning(
        `${readyCount}/${totalCount} video sẵn sàng, ${failedCount} thất bại — bấm "Thử lại" để retry`
      );
    }
  }

  private reorderLessonSections(lessonId: string): void {
    const itemsInLesson = this.items().filter(
      (i) => i.lessonId === lessonId && !!i.sectionId
    );
    if (itemsInLesson.length === 0) return;

    // Build the target order from current store (existing sections first, then our new ones in batch order)
    const tree = this.store.courseTree();
    if (!tree) return;
    const lesson = tree.chapters.flatMap((c) => c.lessons).find((l) => l.id === lessonId);
    if (!lesson) return;

    const newSectionIds = itemsInLesson.map((i) => i.sectionId!);
    const existingIds = (lesson.sections || [])
      .map((s) => s.id)
      .filter((id) => !newSectionIds.includes(id));
    const finalOrder = [...existingIds, ...newSectionIds];
    this.store.reorderSectionsOptimistic(lessonId, finalOrder);
  }

  private updateItem(itemId: string, patch: Partial<BatchVideoItem>): void {
    this.items.update((list) =>
      list.map((i) => (i.id === itemId ? { ...i, ...patch } : i))
    );
  }

  private updateItemStatus(itemId: string, status: BatchItemStatus): void {
    this.updateItem(itemId, { status });
  }

  private updateItemProgress(itemId: string, progress: number): void {
    this.updateItem(itemId, { uploadProgress: Math.round(progress) });
  }

  private markItemFailed(itemId: string, errorMessage: string): void {
    this.updateItem(itemId, { status: 'FAILED', errorMessage });
  }

  /**
   * ETA xử lý ước lượng (giây) dựa trên file size:
   *   bitrate giả định 5 Mbps → file_size_bits / 5e6 = duration giây
   *   processing time = duration / 6.2 (measured 6.2x realtime trên prod)
   *   plus queue offset: backend max 2 concurrent → mỗi vị trí queue thêm ~60s
   * Min 30s, max 60min (clamp với POLL_MAX_ATTEMPTS).
   */
  private estimateProcessingEtaSec(fileSizeBytes: number, queuePosition: number): number {
    const ASSUMED_BITRATE_BPS = 5_000_000;
    const REALTIME_FACTOR = 6.2;
    const QUEUE_OFFSET_PER_POSITION_SEC = 60;
    const durationSec = (fileSizeBytes * 8) / ASSUMED_BITRATE_BPS;
    const processSec = durationSec / REALTIME_FACTOR;
    const queueSec = Math.max(0, queuePosition - 1) * QUEUE_OFFSET_PER_POSITION_SEC;
    const total = Math.round(processSec + queueSec);
    return Math.max(30, Math.min(total, 60 * 60));
  }

  /** Vị trí trong PROCESSING queue (1-based) tính từ items hiện đang PROCESSING. */
  private computeProcessingQueuePosition(itemId: string): number {
    const list = this.items();
    let pos = 1;
    for (const item of list) {
      if (item.id === itemId) return pos;
      if (item.status === 'PROCESSING') pos++;
    }
    return pos;
  }

  /**
   * Force sync selectedLesson reference với courseTree mới nhất.
   * Cần thiết vì component effect (course-curriculum:540) skip sync khi
   * editorDirty=true → batch upload không update visible content cho user.
   */
  private forceSyncSelectionForLesson(lessonId: string): void {
    if (this.selectionService.selectedLessonId() !== lessonId) return;
    const tree = this.store.courseTree();
    if (!tree) return;
    for (const chapter of tree.chapters) {
      const found = chapter.lessons.find((l) => l.id === lessonId);
      if (found) {
        this.selectionService.syncLessonReference(chapter, found);
        return;
      }
    }
  }

  private formatError(err: any): string {
    if (typeof err === 'string') return err;
    if (err?.error?.message) return String(err.error.message);
    if (err?.message) return String(err.message);
    return 'Lỗi không xác định';
  }
}
