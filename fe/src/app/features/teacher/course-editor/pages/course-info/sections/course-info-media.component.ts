import { ChangeDetectionStrategy, Component, inject, signal, OnDestroy } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Subscription, firstValueFrom } from 'rxjs';
import { VideoAssetApi, type VideoAssetResponse } from '../../../../../../api/client/video-asset.api';
import { PresignedUploadService } from '../../../../../../core/services/presigned-upload.service';
import { ToastService } from '../../../../../../core/services/toast.service';
import { CourseAuthoringService } from '../../../services/course-authoring.service';
import { CourseInfoFormService } from '../course-info-form.service';
import {
  isOfflineVideoProfileId,
  formatOfflineVideoProfileLabel,
  type OfflineVideoProfileDescriptor,
} from '../../../../../../core/models/video-quality';

@Component({
  selector: 'app-course-info-media',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  styleUrl: '../_editor-shared.scss',
  template: `
    <section class="editor-card">
      <div class="editor-card__header">
        <div>
          <h2 class="editor-card__title">Ảnh bìa & video</h2>
          <p class="editor-card__subtitle">Ảnh và video xuất hiện trên trang giới thiệu khóa học cho học viên.</p>
        </div>
      </div>
      <div class="editor-card__body editor-stack">
        <!-- Thumbnail -->
        <div class="editor-field">
          <label class="editor-label">Ảnh bìa</label>
          @if (isUploading()) {
            <div class="upload-card upload-card--loading">
              <svg class="h-6 w-6 animate-spin text-[#0056D2]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <div class="upload-progress"><div class="upload-progress__bar" [style.width.%]="uploadProgress()"></div></div>
              <p class="editor-hint">{{ uploadProgress() }}%</p>
              <button type="button" class="editor-link-button" (click)="cancelUpload()">Hủy tải lên</button>
            </div>
          } @else {
            <div class="upload-card" [class.upload-card--dragover]="isDragOver()"
              (dragover)="onDragOver($event)" (dragleave)="onDragLeave($event)" (drop)="onDrop($event)">
              @if (thumbnailPreview() || svc.thumbnailUrl()) {
                <img [src]="thumbnailPreview() || svc.thumbnailUrl()" class="upload-card__preview" alt="Ảnh bìa khóa học" />
                <div class="upload-card__overlay">Thay đổi ảnh bìa</div>
              } @else {
                <div class="upload-card__placeholder">
                  <svg class="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Kéo thả hoặc click để tải ảnh</span>
                  <span style="font-size: 0.6875rem; color: rgb(148 163 184);">JPG, PNG, WebP — tối đa 5MB</span>
                </div>
              }
              <input type="file" accept="image/*" class="upload-card__input" (change)="onFileSelected($event)" />
            </div>
          }
          <p class="editor-hint">Nên dùng ảnh ngang tỉ lệ 16:9.</p>
        </div>

        <!-- Intro Video -->
        <div class="editor-field">
          <label class="editor-label" for="course-intro-video">Video giới thiệu</label>
          <input id="course-intro-video" [formControl]="svc.form.controls.introVideoUrl" class="sr-only" />
          <input type="file" accept="video/*" class="sr-only" #introVideoInput (change)="onIntroVideoSelected($event)" />
          <div class="editor-callout editor-callout--info">Tải video giới thiệu để hiển thị trên trang khóa học.</div>
          <div class="flex flex-wrap items-center gap-3">
            <button type="button" class="editor-link-button" (click)="introVideoInput.click()">
              {{ svc.hasIntroVideoAsset() ? 'Chọn video mới' : 'Tải video giới thiệu' }}
            </button>
            @if (selectedIntroVideoFile()) {
              <span class="editor-hint">{{ selectedIntroVideoFile()?.name }}</span>
              <button type="button" class="editor-link-button" (click)="clearIntroVideoSelection()">Bỏ chọn</button>
            }
          </div>
          @if (introVideoUploadState() === 'uploading') {
            <p class="editor-hint">Đang tải video... {{ introVideoUploadProgress() }}%</p>
          } @else if (introVideoStatusCopy()) {
            <p class="editor-hint">{{ introVideoStatusCopy() }}</p>
          }
          @if (svc.introVideoError()) {
            <p id="course-intro-video-error" class="editor-field-error">{{ svc.introVideoError() }}</p>
          }

          @if (svc.introVideoPreviewUrl()) {
            <div class="editor-link-preview">
              <div>
                <p class="editor-link-preview__label">Liên kết video</p>
                <p class="editor-link-preview__value">{{ svc.introVideoHost() }}</p>
              </div>
              <a class="editor-link-button" [href]="svc.introVideoPreviewUrl()" rel="noopener noreferrer" target="_blank">Mở liên kết</a>
            </div>
          }

          @if (svc.hasIntroVideoAsset()) {
            <div class="editor-link-preview">
              <div>
                <p class="editor-link-preview__label">Video đã tải lên</p>
                <p class="editor-link-preview__value">{{ svc.introVideoProcessingStatus() || 'PENDING' }}</p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                @if (svc.introVideoPreviewUrl()) {
                  <a class="editor-link-button" [href]="svc.introVideoPreviewUrl()" rel="noopener noreferrer" target="_blank">Xem trước</a>
                }
                @if (svc.introVideoProcessingStatus() === 'FAILED') {
                  <button type="button" class="editor-link-button" (click)="retryIntroVideoAsset()">Thử xử lý lại</button>
                }
              </div>
            </div>
            @if (introVideoAvailableOfflineProfiles().length) {
              <div class="editor-hint">
                Chất lượng có sẵn:
                @for (profile of introVideoAvailableOfflineProfiles(); track profile.id) {
                  <span>{{ getProfileLabel(profile) }}@if (!$last) {, }</span>
                }
              </div>
            }
          }

          @if (svc.hasLegacyIntroVideoLink()) {
            <div class="editor-link-preview">
              <div>
                <p class="editor-link-preview__label">Liên kết cũ</p>
                <p class="editor-link-preview__value">{{ svc.introVideoHost() }}</p>
              </div>
              <button type="button" class="editor-link-button" (click)="svc.removeLegacyIntroVideoLink()">Xóa</button>
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class CourseInfoMediaComponent implements OnDestroy {
  readonly svc = inject(CourseInfoFormService);
  private readonly service = inject(CourseAuthoringService);
  private readonly presignedUpload = inject(PresignedUploadService);
  private readonly videoAssetApi = inject(VideoAssetApi);
  private readonly toast = inject(ToastService);

  // Local upload state
  readonly thumbnailPreview = signal<string | null>(null);
  readonly isDragOver = signal(false);
  readonly isUploading = signal(false);
  readonly uploadProgress = signal(0);
  readonly selectedIntroVideoFile = signal<File | null>(null);
  readonly introVideoUploadState = signal<'idle' | 'staged' | 'uploading' | 'done' | 'error'>('idle');
  readonly introVideoUploadProgress = signal(0);
  readonly introVideoAvailableOfflineProfiles = signal<VideoAssetResponse['availableOfflineProfiles']>([]);

  private uploadSub: Subscription | null = null;
  private introVideoPollTimer: ReturnType<typeof setTimeout> | null = null;

  readonly introVideoStatusCopy = () => {
    switch ((this.svc.introVideoProcessingStatus() || '').toUpperCase()) {
      case 'READY': return 'Video giới thiệu đã sẵn sàng.';
      case 'FAILED': return this.svc.introVideoErrorMessage() || 'Xử lý video thất bại. Bạn có thể chọn lại tệp.';
      case 'PROCESSING': return 'Video đang được xử lý...';
      case 'PENDING': return 'Video đã vào hàng đợi xử lý.';
      default: return this.selectedIntroVideoFile() ? 'Tệp video đã chọn, sẽ được tải khi bạn lưu.' : '';
    }
  };

  ngOnDestroy() {
    this.uploadSub?.unsubscribe();
    if (this.introVideoPollTimer) { clearTimeout(this.introVideoPollTimer); this.introVideoPollTimer = null; }
  }

  // ── Thumbnail ──

  onDragOver(e: DragEvent) { e.preventDefault(); e.stopPropagation(); this.isDragOver.set(true); }
  onDragLeave(e: DragEvent) { e.preventDefault(); e.stopPropagation(); this.isDragOver.set(false); }

  onDrop(e: DragEvent) {
    e.preventDefault(); e.stopPropagation(); this.isDragOver.set(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) this.handleThumbnailUpload(file);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';
    this.handleThumbnailUpload(file);
  }

  cancelUpload() {
    this.uploadSub?.unsubscribe(); this.uploadSub = null;
    this.isUploading.set(false); this.uploadProgress.set(0); this.thumbnailPreview.set(null);
  }

  private handleThumbnailUpload(file: File) {
    if (file.size > 5 * 1024 * 1024) { this.toast.error('Ảnh quá lớn. Kích thước tối đa: 5MB'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { this.toast.error('Chỉ chấp nhận: JPG, PNG, WebP'); return; }

    const reader = new FileReader();
    reader.onload = () => this.thumbnailPreview.set(reader.result as string);
    reader.readAsDataURL(file);

    this.isUploading.set(true); this.uploadProgress.set(0);
    this.uploadSub = this.service.uploadFileWithProgress(file, 'course-thumbnails').subscribe({
      next: (event) => {
        if (event.type === 'progress') { this.uploadProgress.set(event.progress); return; }
        this.svc.thumbnailUrl.set(event.fileUrl);
        this.svc.markUnsaved();
        this.isUploading.set(false); this.uploadProgress.set(0);
        this.toast.success('Ảnh đã được tải lên thành công');
      },
      error: (err: any) => {
        this.toast.error('Tải ảnh thất bại: ' + (err?.error?.message || err?.message || 'Lỗi'));
        this.isUploading.set(false); this.uploadProgress.set(0); this.thumbnailPreview.set(null);
      },
    });
  }

  // ── Intro Video ──

  onIntroVideoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';
    if (!file.type.startsWith('video/')) { this.toast.error('Tệp được chọn không phải video hợp lệ.'); return; }

    this.selectedIntroVideoFile.set(file);
    this.introVideoUploadState.set('staged');
    this.introVideoUploadProgress.set(0);
    this.svc.introVideoErrorMessage.set(null);
    this.svc.introVideoAssetId.set(null);
    this.svc.introVideoProcessingStatus.set(null);
    this.svc.introVideoSourceKind.set(null);
    this.svc.introVideoPlaybackUrl.set(null);
    this.svc.introVideoStreamVideoUid.set(null);
    this.introVideoAvailableOfflineProfiles.set([]);
    this.svc.form.patchValue({ introVideoUrl: '' }, { emitEvent: false });
    this.svc.markUnsaved();
  }

  clearIntroVideoSelection() {
    this.selectedIntroVideoFile.set(null);
    this.introVideoUploadState.set(this.svc.introVideoAssetId() ? 'done' : 'idle');
    this.introVideoUploadProgress.set(0);
    this.svc.introVideoErrorMessage.set(null);
    this.svc.markUnsaved();
  }

  async retryIntroVideoAsset() {
    const assetId = this.svc.introVideoAssetId();
    if (!assetId) return;
    this.svc.introVideoErrorMessage.set(null);
    this.introVideoUploadState.set('done');
    try {
      const response = await firstValueFrom(this.videoAssetApi.retry(assetId));
      this.applyAssetResponse(response.data);
      this.scheduleIntroVideoPoll(response.data.id);
      this.toast.success('Đã đưa video vào hàng đợi xử lý lại');
    } catch (error: any) {
      const message = error?.error?.message || error?.message || 'Không thể xử lý lại video.';
      this.svc.introVideoErrorMessage.set(message);
      this.toast.error(message);
    }
  }

  /** Called by parent save() to upload staged video before saving. */
  async ensureIntroVideoUploaded(): Promise<string | null> {
    if (this.svc.introVideoAssetId()) return this.svc.introVideoAssetId();
    const file = this.selectedIntroVideoFile();
    if (!file) return null;

    this.introVideoUploadState.set('uploading'); this.introVideoUploadProgress.set(0);
    this.svc.introVideoErrorMessage.set(null);

    const uploadEvent = await firstValueFrom(this.presignedUpload.upload(file, 'videos'));
    if (uploadEvent.type !== 'complete') throw new Error('Không nhận được kết quả upload video.');
    this.introVideoUploadProgress.set(100);

    const assetResponse = await firstValueFrom(this.videoAssetApi.createFromUpload(uploadEvent.id, file.name));
    this.applyAssetResponse(assetResponse.data);
    this.selectedIntroVideoFile.set(null);
    this.introVideoUploadState.set('done');
    this.scheduleIntroVideoPoll(assetResponse.data.id);
    return assetResponse.data.id;
  }

  /** Called by parent after applyTreeToForm to set media-local state. */
  applyTreeMedia(tree: any) {
    this.thumbnailPreview.set(null);
    this.selectedIntroVideoFile.set(null);
    this.introVideoUploadState.set(tree.introVideoAssetId ? 'done' : 'idle');
    this.introVideoUploadProgress.set(0);
    this.introVideoAvailableOfflineProfiles.set(
      this.normalizeProfiles(tree.introVideoAvailableOfflineProfiles),
    );
    if (tree.introVideoAssetId && tree.introVideoProcessingStatus !== 'READY' && tree.introVideoProcessingStatus !== 'FAILED') {
      this.scheduleIntroVideoPoll(tree.introVideoAssetId);
    }
  }

  hasUnsavedMedia(): boolean {
    return this.isUploading() || this.introVideoUploadState() === 'staged' || this.introVideoUploadState() === 'uploading';
  }

  getProfileLabel(profile: Pick<OfflineVideoProfileDescriptor, 'id' | 'actualResolution'>): string {
    return formatOfflineVideoProfileLabel(profile);
  }

  // ── Private ──

  private applyAssetResponse(asset: VideoAssetResponse | null | undefined) {
    if (!asset) return;
    this.svc.introVideoAssetId.set(asset.id);
    this.svc.introVideoProcessingStatus.set(asset.status);
    this.svc.introVideoSourceKind.set(asset.videoSourceKind);
    this.svc.introVideoPlaybackUrl.set(asset.playbackUrl ?? null);
    this.svc.introVideoStreamVideoUid.set(asset.streamVideoUid ?? null);
    this.introVideoAvailableOfflineProfiles.set(this.normalizeProfiles(asset.availableOfflineProfiles));
    this.svc.introVideoErrorMessage.set(asset.errorMessage ?? null);
    if (!this.selectedIntroVideoFile()) {
      this.introVideoUploadState.set(asset.status === 'FAILED' ? 'error' : 'done');
    }
  }

  private scheduleIntroVideoPoll(assetId: string | null, delayMs = 5000) {
    if (this.introVideoPollTimer) { clearTimeout(this.introVideoPollTimer); this.introVideoPollTimer = null; }
    if (!assetId) return;
    const status = (this.svc.introVideoProcessingStatus() || '').toUpperCase();
    if (status === 'READY' || status === 'FAILED') return;
    this.introVideoPollTimer = setTimeout(async () => {
      try {
        const response = await firstValueFrom(this.videoAssetApi.getById(assetId));
        this.applyAssetResponse(response.data);
        this.scheduleIntroVideoPoll(assetId);
      } catch { this.scheduleIntroVideoPoll(assetId, 10000); }
    }, delayMs);
  }

  private normalizeProfiles(profiles: any[] | null | undefined): VideoAssetResponse['availableOfflineProfiles'] {
    return (profiles ?? [])
      .filter((p: any): p is VideoAssetResponse['availableOfflineProfiles'][number] => isOfflineVideoProfileId(p.id))
      .map((p) => ({ ...p, id: p.id }));
  }
}
