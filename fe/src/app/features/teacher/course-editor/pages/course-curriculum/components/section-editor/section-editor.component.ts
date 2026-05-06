import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  output,
  signal,
  computed,
  effect,
  ElementRef,
  viewChild,
  afterNextRender,
  HostListener,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LucideAngularModule } from 'lucide-angular';
import { CurriculumEditorService, SectionQuizAssessmentType } from '../../../../services/curriculum-editor.service';
import { TiptapEditorComponent } from '../../../../../../../shared/components/tiptap-editor/tiptap-editor.component';
import { createTiptapUploadFn, createTiptapVideoUploadFn } from '../../../../../../../shared/components/tiptap-editor/tiptap-upload';
import { PresignedUploadService } from '../../../../../../../core/services/presigned-upload.service';
import { ToastService } from '../../../../../../../core/services/toast.service';
import { LESSON_TEMPLATES, type LessonTemplate } from '../../../../../../../shared/components/tiptap-editor/lesson-templates';
import { environment } from '../../../../../../../../environments/environment';
import { formatOfflineVideoProfileLabel, type OfflineVideoProfileDescriptor } from '../../../../../../../core/models/video-quality';
import { QuizVideoPlayerComponent } from '../../../../../../../shared/blocks/video-block/quiz-video-player.component';
import { BlockRendererComponent } from '../../../../../../../shared/blocks/block-renderer/block-renderer.component';
import { formatDuration, formatResolution } from '../../../../../../../core/utils/video-probe.util';
import { buildInteractiveVideoSpec } from '../../../../utils/interactive-video-authoring';
import { YouTubePlayerComponent } from '../../../../../../learning/components/youtube-player/youtube-player.component';
import { InteractiveVideoAuthoringPanelComponent } from './interactive-video-authoring-panel.component';

type CfUploadStatus = 'idle' | 'staged' | 'uploading' | 'done' | 'error';

/**
 * Section Editor — inline panel replacing the old 25-input modal.
 *
 * Reads/writes all form state from CurriculumEditorService.
 * Renders as a slide-down panel inside the lesson editor,
 * not a fixed overlay modal.
 *
 * Supports 4 section types: TEXT, VIDEO, FILE, QUIZ.
 * Each type renders its own content area.
 */
@Component({
  selector: 'app-section-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    LucideAngularModule,
    TiptapEditorComponent,
    QuizVideoPlayerComponent,
    BlockRendererComponent,
    YouTubePlayerComponent,
    InteractiveVideoAuthoringPanelComponent,
  ],
  styleUrls: ['./section-editor-prose.scss'],
  template: `
    <!-- ═══ Expanded TEXT mode: full-screen Tiptap only (course-info pattern) ═══ -->
    @if (isExpanded()) {
      <section class="editor-card editor-card--expanded">
        <div class="editor-card__header">
          <div style="display: flex; align-items: center; gap: 0.75rem">
            <h2 class="editor-card__title" style="margin: 0">Nội dung</h2>
            <div class="preview-toggle">
              <button type="button" [class.preview-toggle--active]="!isPreviewMode()"
                      (click)="isPreviewMode.set(false)">Chỉnh sửa</button>
              <button type="button" [class.preview-toggle--active]="isPreviewMode()"
                      (click)="isPreviewMode.set(true)">Xem trước</button>
            </div>
          </div>
          <button type="button" class="editor-link-button" style="white-space: nowrap"
                  (click)="toggleExpand()">Thu nhỏ</button>
        </div>
        <div class="editor-card__body editor-stack">
          @if (!isPreviewMode()) {
            <app-tiptap-editor
              #tiptapEditor
              [ngModel]="svc.sectionContent()"
              (ngModelChange)="svc.sectionContent.set($event); svc.markDirty()"
              placeholder="Nhập nội dung bài học chi tiết tại đây..."
              [height]="800"
              [uploadFn]="editorUploadFn"
                  [videoUploadFn]="editorVideoUploadFn">
            </app-tiptap-editor>
          } @else {
            <div class="preview-pane preview-pane--expanded prose" [innerHTML]="svc.sectionContent()"></div>
          }
        </div>
      </section>
    }

    <!-- ═══ Normal mode: inline section editor card ═══ -->
    @if (!isExpanded()) {
      <section class="editor-card animate-slide-down" #editorPanel>

        <!-- Header -->
        <div class="editor-card__header">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center"
                 [class]="getTypeIconBgClass()">
              <lucide-icon [name]="getTypeIconName()" [size]="16" [class]="getTypeIconColorClass()"></lucide-icon>
            </div>
            <div class="min-w-0">
              <h3 class="editor-card__title" style="font-size: 0.875rem">{{ getDialogTitle() }}</h3>
              <p class="editor-card__subtitle">{{ getTypeDescription() }}</p>
            </div>
          </div>
          <button type="button" (click)="onClose()"
            class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Đóng">
            <lucide-icon name="x" [size]="18"></lucide-icon>
          </button>
        </div>

        <!-- Body -->
        <div class="editor-card__body editor-stack">

          <!-- Title -->
          <div class="editor-field">
            <label for="section-title" class="editor-label">
              Tiêu đề mục <span class="editor-field-error">*</span>
            </label>
            <input id="section-title" type="text"
              [ngModel]="svc.sectionTitle()"
              (ngModelChange)="onTitleChange($event)"
              class="editor-input"
              placeholder="Nhập tiêu đề..." />
          </div>

          <!-- Required checkbox -->
          <div class="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
            <input type="checkbox" id="reqSec"
              [ngModel]="svc.sectionIsRequired()"
              (ngModelChange)="svc.sectionIsRequired.set($event); svc.markDirty()"
              class="mt-0.5 h-4 w-4 rounded text-[#0056D2] focus:ring-[#0056D2]" />
            <label for="reqSec" class="cursor-pointer select-none editor-label" style="font-weight: 500">
              Bắt buộc hoàn thành
              <span class="editor-hint" style="display: block; margin-top: 0.25rem">Học viên phải hoàn thành mục này trước khi tiếp tục.</span>
            </label>
          </div>

          <!-- ═══ Completion Threshold (VIDEO only, khi Bắt buộc) ═══ -->
          @if (svc.sectionEditorType() === 'VIDEO' && svc.sectionIsRequired()) {
            <div class="rounded-lg border border-[#0056D2]/15 bg-[#0056D2]/[0.02] px-4 py-3 space-y-2.5">
              <div class="flex items-center justify-between">
                <label for="completionThreshold" class="text-xs font-semibold text-slate-700">Ngưỡng hoàn thành video</label>
                <span class="text-sm font-bold text-[#0056D2] tabular-nums">{{ svc.sectionCompletionThreshold() }}%</span>
              </div>
              <input id="completionThreshold" type="range" min="10" max="100" step="5"
                [ngModel]="svc.sectionCompletionThreshold()"
                (ngModelChange)="svc.sectionCompletionThreshold.set(+$event); svc.markDirty()"
                class="w-full accent-[#0056D2]"
                [attr.aria-label]="'Ngưỡng hoàn thành: ' + svc.sectionCompletionThreshold() + '%'"
                aria-valuemin="10" aria-valuemax="100" />
              <div class="flex justify-between text-[10px] text-slate-400 px-0.5">
                <span>10%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
              <p class="text-xs text-slate-500 leading-relaxed">Học viên cần xem ít nhất <strong class="text-slate-700">{{ svc.sectionCompletionThreshold() }}%</strong> thời lượng video để được tính là hoàn thành mục này.</p>
            </div>
          }

          <!-- ═══ TEXT ═══ -->
          @if (svc.sectionEditorType() === 'TEXT') {

            <!-- Template picker — only when content is empty and not yet dismissed -->
            @if (showTemplatePicker() && isContentEmpty()) {
              <div class="tpl-picker">
                <div class="tpl-picker__header">
                  <p class="tpl-picker__title">Chọn mẫu bài giảng</p>
                  <p class="tpl-picker__subtitle">Bắt đầu nhanh với cấu trúc có sẵn, hoặc chọn "Trang trống" để tự do sáng tạo</p>
                </div>
                <div class="tpl-picker__grid">
                  @for (tpl of lessonTemplates; track tpl.id) {
                    <button type="button" class="tpl-card" (click)="applyTemplate(tpl)">
                      <span class="tpl-card__icon" [innerHTML]="tpl.icon"></span>
                      <span class="tpl-card__title">{{ tpl.title }}</span>
                      <span class="tpl-card__desc">{{ tpl.description }}</span>
                    </button>
                  }
                </div>
              </div>
            }

            <!-- Editor — shown when template dismissed or content exists -->
            @if (!showTemplatePicker() || !isContentEmpty()) {
            <div class="editor-field">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem">
                <label class="editor-label" style="margin-bottom: 0">Nội dung</label>
                <button type="button" class="editor-link-button" style="white-space: nowrap"
                        (click)="toggleExpand()">Mở rộng</button>
              </div>
              <app-tiptap-editor
                #tiptapEditor
                [ngModel]="svc.sectionContent()"
                (ngModelChange)="svc.sectionContent.set($event); svc.markDirty()"
                placeholder="Gõ / để xem danh sách lệnh nhanh..."
                [height]="280"
                [uploadFn]="editorUploadFn"
                [videoUploadFn]="editorVideoUploadFn">
              </app-tiptap-editor>
            </div>
            }
          }

        <!-- ═══ VIDEO ═══ -->
        @if (svc.sectionEditorType() === 'VIDEO') {
          <div class="space-y-4">

            <!-- Tab bar: Tải lên | YouTube -->
            <div class="video-source-tabs">
              <button type="button" class="video-source-tab"
                [class.video-source-tab--active]="videoSourceTab() === 'upload'"
                (click)="switchVideoTab('upload')">
                <lucide-icon name="upload-cloud" [size]="14"></lucide-icon>
                Tải lên
              </button>
              <button type="button" class="video-source-tab"
                [class.video-source-tab--active]="videoSourceTab() === 'youtube'"
                (click)="switchVideoTab('youtube')">
                <lucide-icon name="youtube" [size]="14"></lucide-icon>
                YouTube
              </button>
            </div>

            <!-- ── UPLOAD TAB ── -->
            @if (videoSourceTab() === 'upload') {

              <!-- IDLE: drag-drop upload zone -->
              @if (cfUploadStatus() === 'idle') {
                <div class="video-dropzone"
                     [class.video-dropzone--dragover]="isDragOver()"
                     (dragover)="onDragOver($event)"
                     (dragleave)="onDragLeave($event)"
                     (drop)="onDrop($event)"
                     role="button"
                     tabindex="0"
                     aria-label="Vùng tải lên video — kéo thả file hoặc nhấn để chọn">
                  <input type="file" accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,video/x-matroska"
                         (change)="onVideoFileSelected($event)"
                         class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                         aria-hidden="true" />
                  <div class="pointer-events-none text-center">
                    <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#0056D2]/10">
                      <lucide-icon name="upload-cloud" [size]="24" class="text-[#0056D2]"></lucide-icon>
                    </div>
                    <p class="text-sm font-semibold text-gray-800">
                      {{ isDragOver() ? 'Thả video vào đây' : 'Kéo thả hoặc nhấn để chọn video' }}
                    </p>
                    <p class="mt-1 text-xs text-gray-500">MP4, MOV, WebM, AVI, MKV — tối đa 5 GB · Khuyến nghị H.264 + AAC</p>
                  </div>
                </div>

                <p class="mt-3 text-center text-xs text-gray-500">
                  Có nhiều video?
                  <button type="button"
                          (click)="batchVideoUpload.emit()"
                          class="ml-1 font-medium text-[#0056D2] hover:underline pointer-events-auto">
                    Tải lên hàng loạt cùng lúc →
                  </button>
                </p>
              }

              <!-- UPLOADING + PROCESSING: SOTA layout with poster + metadata + timeline -->
              @if (cfUploadStatus() === 'uploading') {
                <div class="video-progress-card"
                     role="status"
                     aria-live="polite"
                     [attr.aria-busy]="true">
                  <div class="video-progress-card__main">
                    <!-- Poster thumbnail (client-probed) -->
                    <div class="video-progress-card__poster">
                      @if (svc.sectionVideoLocalPoster(); as posterUrl) {
                        <img [src]="posterUrl" alt="" class="video-progress-card__poster-img" />
                      } @else {
                        <div class="video-progress-card__poster-fallback">
                          <lucide-icon name="film" [size]="28"></lucide-icon>
                        </div>
                      }
                      @if (!svc.sectionVideoIsUploading()) {
                        <div class="video-progress-card__poster-overlay" aria-hidden="true">
                          <div class="video-processing-spinner video-processing-spinner--lg"></div>
                        </div>
                      }
                    </div>

                    <!-- Meta column -->
                    <div class="video-progress-card__meta">
                      <div class="video-progress-card__title-row">
                        <p class="video-progress-card__filename" [title]="svc.sectionVideoFileName() ?? ''">
                          {{ svc.sectionVideoFileName() || 'video.mp4' }}
                        </p>
                        @if (svc.sectionVideoIsUploading()) {
                          <button type="button" (click)="cancelUpload()"
                            class="video-progress-card__cancel"
                            aria-label="Hủy tải lên">
                            <lucide-icon name="x" [size]="14"></lucide-icon>
                          </button>
                        }
                      </div>

                      <div class="video-progress-card__badges">
                        @if (svc.sectionVideoFileSize()) {
                          <span class="video-badge">{{ formatFileSize(svc.sectionVideoFileSize()) }}</span>
                        }
                        @if (durationLabel(); as d) {
                          <span class="video-badge"><lucide-icon name="clock" [size]="11" class="mr-1 inline-block"></lucide-icon>{{ d }}</span>
                        }
                        @if (resolutionLabel(); as r) {
                          <span class="video-badge">{{ r }}</span>
                        }
                      </div>

                      <!-- Upload phase: precise % bar -->
                      @if (svc.sectionVideoIsUploading()) {
                        <div class="video-progress-line">
                          <p class="video-progress-line__label">
                            <lucide-icon name="upload-cloud" [size]="13" class="mr-1.5 inline-block text-[#0056D2]"></lucide-icon>
                            Đang tải lên
                            <span class="video-progress-line__pct">{{ svc.sectionVideoUploadProgress() }}%</span>
                          </p>
                          <div class="video-progress-bar"
                               role="progressbar"
                               [attr.aria-valuenow]="svc.sectionVideoUploadProgress()"
                               aria-valuemin="0" aria-valuemax="100"
                               [attr.aria-label]="'Tiến trình tải lên: ' + svc.sectionVideoUploadProgress() + '%'">
                            <div class="video-progress-bar__fill"
                                 [style.width.%]="svc.sectionVideoUploadProgress()"></div>
                          </div>
                          <div class="video-progress-line__stats">
                            <span>
                              @if (svc.sectionVideoFileSize()) {
                                {{ formatFileSize(Math.round(svc.sectionVideoFileSize() * svc.sectionVideoUploadProgress() / 100)) }} / {{ formatFileSize(svc.sectionVideoFileSize()) }}
                              }
                            </span>
                            <span class="flex items-center gap-2">
                              @if (svc.sectionVideoUploadSpeed(); as sp) { <span>{{ sp }}</span> }
                              @if (svc.sectionVideoUploadEta(); as eta) { <span>còn {{ eta }}</span> }
                            </span>
                          </div>
                        </div>
                      } @else {
                        <!-- Processing phase: indeterminate bar + ETA -->
                        <div class="video-progress-line">
                          <p class="video-progress-line__label">
                            <lucide-icon name="sparkles" [size]="13" class="mr-1.5 inline-block text-[#0056D2]"></lucide-icon>
                            Đang tối ưu video cho phát trực tuyến
                            @if (processingElapsedPctHint(); as pct) {
                              <span class="video-progress-line__pct">{{ pct }}%</span>
                            }
                          </p>
                          <div class="video-progress-bar">
                            @if (processingElapsedPctHint(); as pct) {
                              <div class="video-progress-bar__fill"
                                   [style.width.%]="pct"></div>
                            } @else {
                              <div class="video-progress-bar__fill video-progress-bar__fill--indeterminate"></div>
                            }
                          </div>
                          <div class="video-progress-line__stats">
                            <span>{{ processingElapsedLabel() || 'Đang khởi động…' }}</span>
                            @if (processingEtaLabel(); as eta) {
                              <span>còn khoảng {{ eta }}</span>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  </div>

                  <!-- Phase timeline -->
                  <ol class="video-phase-timeline" aria-label="Các giai đoạn xử lý">
                    <li class="video-phase"
                        [class.video-phase--done]="phaseState('upload') === 'done'"
                        [class.video-phase--active]="phaseState('upload') === 'active'">
                      <span class="video-phase__dot">
                        @if (phaseState('upload') === 'done') {
                          <lucide-icon name="check" [size]="11"></lucide-icon>
                        } @else if (phaseState('upload') === 'active') {
                          <span class="video-phase__spinner"></span>
                        }
                      </span>
                      <span class="video-phase__label">Tải lên</span>
                    </li>
                    <li class="video-phase"
                        [class.video-phase--done]="phaseState('decode') === 'done'"
                        [class.video-phase--active]="phaseState('decode') === 'active'">
                      <span class="video-phase__dot">
                        @if (phaseState('decode') === 'done') {
                          <lucide-icon name="check" [size]="11"></lucide-icon>
                        } @else if (phaseState('decode') === 'active') {
                          <span class="video-phase__spinner"></span>
                        }
                      </span>
                      <span class="video-phase__label">Giải mã</span>
                    </li>
                    <li class="video-phase"
                        [class.video-phase--done]="phaseState('encode') === 'done'"
                        [class.video-phase--active]="phaseState('encode') === 'active'">
                      <span class="video-phase__dot">
                        @if (phaseState('encode') === 'done') {
                          <lucide-icon name="check" [size]="11"></lucide-icon>
                        } @else if (phaseState('encode') === 'active') {
                          <span class="video-phase__spinner"></span>
                        }
                      </span>
                      <span class="video-phase__label">Đóng gói 3 chất lượng</span>
                    </li>
                    <li class="video-phase"
                        [class.video-phase--done]="phaseState('ready') === 'done'">
                      <span class="video-phase__dot">
                        @if (phaseState('ready') === 'done') {
                          <lucide-icon name="check" [size]="11"></lucide-icon>
                        }
                      </span>
                      <span class="video-phase__label">Sẵn sàng phát</span>
                    </li>
                  </ol>

                  <p class="video-progress-card__hint">
                    <lucide-icon name="info" [size]="12" class="mr-1 inline-block opacity-70"></lucide-icon>
                    Bạn có thể đóng cửa sổ và quay lại sau — hệ thống sẽ thông báo khi video sẵn sàng.
                  </p>
                </div>
              }

              <!-- ERROR: categorized card with retry action -->
              @if (cfUploadStatus() === 'error') {
                <div class="video-status-card video-status-card--error" role="alert">
                  <div class="video-status-card__icon bg-red-100">
                    <lucide-icon [name]="errorIcon()" [size]="20" class="text-red-600"></lucide-icon>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold text-red-800">{{ errorTitle() }}</p>
                    <p class="mt-0.5 text-xs text-red-600">{{ errorHint() }}</p>
                    @if (showFormatHelp()) {
                      <p class="mt-1 text-[11px] text-red-400">Khuyến nghị: MP4 (H.264 video + AAC audio), &lt; 5 GB, &le; 4K</p>
                    }
                  </div>
                  <div class="flex shrink-0 gap-2">
                    @if (svc.sectionVideoAssetId()) {
                      <button type="button" (click)="retryVideoProcessing()"
                        class="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">
                        Thử lại
                      </button>
                    }
                    <button type="button" (click)="resetVideoUpload()"
                      class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                      Chọn video khác
                    </button>
                  </div>
                </div>
              }

              <!-- DONE: video attached with preview + actions -->
              @if (cfUploadStatus() === 'done') {
                <div class="space-y-3">
                  <!-- Video preview (compact, max 280px height for editor) -->
                  @if (svc.sectionVideoAssetId()) {
                    <div class="overflow-hidden rounded-xl border border-slate-200 bg-black" style="max-height: 280px; aspect-ratio: 16/9;">
                      <app-quiz-video-player
                        [videoAssetId]="svc.sectionVideoAssetId()"
                        [rawVideoUrl]="svc.sectionVideoUrl()"
                        [interactiveVideoSpec]="interactiveVideoPreviewSpec()">
                      </app-quiz-video-player>
                    </div>
                  } @else if (svc.sectionVideoUrl()) {
                    <div class="overflow-hidden rounded-xl border border-slate-200 bg-black" style="max-height: 280px; aspect-ratio: 16/9;">
                      <app-quiz-video-player
                        [rawVideoUrl]="svc.sectionVideoUrl()"
                        [interactiveVideoSpec]="interactiveVideoPreviewSpec()">
                      </app-quiz-video-player>
                    </div>
                  }

                  <div class="video-status-card video-status-card--done">
                    <div class="video-status-card__icon bg-emerald-100">
                      <lucide-icon name="check-circle" [size]="20" class="text-emerald-600"></lucide-icon>
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-semibold text-emerald-800">{{ getVideoProcessingCopy() }}</p>
                      <div class="mt-1 flex flex-wrap items-center gap-1.5">
                        @if (durationLabel(); as d) {
                          <span class="video-done-badge"><lucide-icon name="clock" [size]="10" class="mr-1 inline-block"></lucide-icon>{{ d }}</span>
                        }
                        @if (resolutionLabel(); as r) {
                          <span class="video-done-badge">{{ r }}</span>
                        }
                        @if (svc.sectionVideoFileSize()) {
                          <span class="video-done-badge">{{ formatFileSize(svc.sectionVideoFileSize()) }}</span>
                        }
                        @for (profile of svc.sectionVideoAvailableOfflineProfiles(); track $index) {
                          <span class="video-done-badge video-done-badge--quality">{{ formatProfile(profile) }}</span>
                        }
                      </div>
                    </div>
                    <button type="button" (click)="replaceVideo()"
                      class="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                      Thay video
                    </button>
                  </div>
                </div>
              }
            }

            <!-- ── YOUTUBE TAB ── -->
            @if (videoSourceTab() === 'youtube') {
              <div class="space-y-3">
                <!-- Info: tracking + offline note -->
                <div class="flex items-start gap-2.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5">
                  <lucide-icon name="info" [size]="16" class="mt-0.5 shrink-0 text-sky-600"></lucide-icon>
                  <div class="text-xs text-sky-800 leading-relaxed">
                    <p class="font-semibold">Tiến trình xem được theo dõi bình thường</p>
                    <p class="mt-0.5 text-sky-700">Video được đánh dấu hoàn thành khi học viên xem ≥ {{ svc.sectionCompletionThreshold() }}% thời lượng. Lưu ý: video YouTube <strong>không hỗ trợ xem ngoại tuyến</strong>.</p>
                  </div>
                </div>

                <div class="editor-field">
                  <label class="editor-label">URL video YouTube</label>
                  <div class="relative">
                    <input type="url"
                      [ngModel]="svc.sectionVideoUrl()"
                      (ngModelChange)="onYouTubeUrlChange($event)"
                      class="editor-input pl-10"
                      placeholder="https://www.youtube.com/watch?v=..." />
                    <lucide-icon name="youtube" [size]="16"
                      class="absolute left-3 top-1/2 -translate-y-1/2 text-red-500"></lucide-icon>
                  </div>
                  @if (svc.sectionVideoUrl() && !youtubeVideoId()) {
                    <p class="mt-1 text-xs text-amber-600">URL không hợp lệ. Hãy dán link YouTube đầy đủ.</p>
                  }
                </div>

                <!-- YouTube preview embed -->
                @if (youtubeVideoId(); as videoId) {
                  <div class="overflow-hidden rounded-xl border border-slate-200">
                    <app-youtube-player
                      [videoUrl]="svc.sectionVideoUrl()!"
                      [lessonId]="lessonId()"
                      [sectionId]="svc.editingSectionId() || 'preview'"
                      [trackingEnabled]="false"
                      [interactiveVideoSpec]="interactiveVideoPreviewSpec()"
                      (durationLoaded)="onYouTubeDurationLoaded($event)" />
                  </div>
                }

                @if (!svc.sectionVideoUrl()) {
                  <div class="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
                    <lucide-icon name="youtube" [size]="32" class="mx-auto text-slate-300"></lucide-icon>
                    <p class="mt-2 text-sm font-medium text-slate-500">Dán link YouTube để nhúng video</p>
                    <p class="mt-1 text-xs text-slate-400">Hỗ trợ: youtube.com/watch, youtu.be, youtube.com/embed</p>
                  </div>
                }
              </div>
            }

            <app-interactive-video-authoring-panel
              [sourceKind]="isYoutubeVideoSource() ? 'youtube' : 'upload'"
              (switchToUpload)="switchVideoTab('upload')" />

          </div>
        }

        <!-- ═══ FILE ═══ -->
        @if (svc.sectionEditorType() === 'FILE') {
          <div class="space-y-4">

            <!-- Existing file: show current attachment with download + replace -->
            @if (svc.sectionFileUrl() && !svc.selectedFile() && !fileReplaceMode()) {
              <div class="video-status-card video-status-card--done">
                <div class="video-status-card__icon" [class]="getFileIconBgClass(getFileExtension(svc.sectionFileUrl()!))">
                  <lucide-icon [name]="getFileIconName(getFileExtension(svc.sectionFileUrl()!))" [size]="20"
                    [class]="getFileIconColorClass(getFileExtension(svc.sectionFileUrl()!))"></lucide-icon>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold text-emerald-800">Tài liệu đã đính kèm</p>
                  <p class="mt-0.5 truncate text-xs text-slate-600">{{ getFileName(svc.sectionFileUrl()!) }}</p>
                  <span class="mt-1 inline-block rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                    {{ getFileExtension(svc.sectionFileUrl()!) }}
                  </span>
                </div>
                <div class="flex shrink-0 gap-2">
                  <a [href]="svc.sectionFileUrl()" target="_blank"
                     class="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1">
                    <lucide-icon name="download" [size]="12"></lucide-icon> Tải xuống
                  </a>
                  <button type="button" (click)="triggerFileReplace()"
                    class="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                    Thay tệp
                  </button>
                </div>
              </div>
            }

            <!-- Upload zone: drag-drop (shown when no existing file, or replacing) -->
            @if (!svc.sectionFileUrl() || svc.selectedFile() || fileReplaceMode()) {

              <!-- Staged file card -->
              @if (svc.selectedFile(); as file) {
                <div class="video-status-card video-status-card--staged">
                  <div class="video-status-card__icon" [class]="getFileIconBgClass(getExtFromName(file.name))">
                    <lucide-icon [name]="getFileIconName(getExtFromName(file.name))" [size]="20"
                      [class]="getFileIconColorClass(getExtFromName(file.name))"></lucide-icon>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold text-sky-900">Tệp đã chọn</p>
                    <p class="mt-0.5 truncate text-xs text-slate-600">{{ file.name }}</p>
                    <div class="mt-1 flex items-center gap-2">
                      <span class="text-xs text-slate-400">{{ formatFileSize(file.size) }}</span>
                      <span class="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                        [class]="getFileTypeBadgeClass(getExtFromName(file.name))">
                        {{ getExtFromName(file.name) }}
                      </span>
                    </div>
                    <p class="mt-1 text-xs text-sky-700">Sẽ tải lên khi bạn nhấn "{{ svc.editingSectionId() ? 'Cập nhật' : 'Tạo mới' }}".</p>
                  </div>
                  <button type="button" (click)="clearFileSelection()"
                    class="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                    Bỏ chọn
                  </button>
                </div>

                <!-- PDF preview for newly selected file -->
                @if (stagedPdfUrl(); as pdfUrl) {
                  <div>
                    <label class="text-xs font-semibold text-slate-600 mb-2 block">Xem trước</label>
                    <div class="h-[380px] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                      <iframe [src]="pdfUrl" class="h-full w-full" frameborder="0"></iframe>
                    </div>
                  </div>
                }
              } @else {
                <!-- Empty dropzone -->
                <div class="video-dropzone"
                     [class.video-dropzone--dragover]="isDragOver()"
                     (dragover)="onDragOver($event)"
                     (dragleave)="onDragLeave($event)"
                     (drop)="onFileDrop($event)">
                  <input type="file"
                         accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf"
                         (change)="onFileSelected($event)"
                         class="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                  <div class="pointer-events-none text-center">
                    <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#0056D2]/10">
                      <lucide-icon name="file-up" [size]="24" class="text-[#0056D2]"></lucide-icon>
                    </div>
                    <p class="text-sm font-semibold text-gray-800">
                      {{ isDragOver() ? 'Thả tệp vào đây' : 'Kéo thả hoặc nhấn để chọn tài liệu' }}
                    </p>
                    <p class="mt-1 text-xs text-gray-500">PDF, Word, Excel, PowerPoint — tối đa 50 MB</p>
                  </div>
                </div>
              }
            }

            <!-- Preview status + PDF preview (when not replacing) -->
            @if (!svc.selectedFile() && !fileReplaceMode()) {

              <!-- Conversion in progress -->
              @if (svc.sectionPreviewStatus() === 'PROCESSING') {
                <div class="flex items-center gap-2.5 rounded-lg border border-[#0056D2]/20 bg-[#0056D2]/5 px-3 py-2.5">
                  <svg class="h-4 w-4 animate-spin text-[#0056D2] shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p class="text-xs text-[#0056D2] font-medium">Đang tạo bản xem trước... Bạn có thể đóng và quay lại sau.</p>
                </div>
              }

              <!-- Conversion failed -->
              @if (svc.sectionPreviewStatus() === 'FAILED') {
                <div class="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                  <lucide-icon name="alert-triangle" [size]="16" class="mt-0.5 shrink-0 text-amber-600"></lucide-icon>
                  <p class="text-xs text-amber-800">Không thể tạo bản xem trước. Học viên vẫn có thể tải xuống tài liệu gốc.</p>
                </div>
              }

              <!--
                PDF preview UX (Notion / Linear / Canvas pattern):
                - safePdfUrl set (BE đã chuẩn hoá snapshot) → embed iframe an toàn.
                - Chưa có snapshot → KHÔNG auto-embed (PDF gốc có thể crash Chrome
                  PDF viewer). Hiện file card với CTA "Mở trong tab mới" — Chrome
                  handle native, ổn định. Optional opt-in inline preview qua object tag.
              -->
              @if (svc.sectionFileUrl() && getFileExtension(svc.sectionFileUrl()!) === 'pdf' && !svc.safePdfUrl() && svc.sectionPreviewStatus() !== 'PROCESSING' && svc.sectionPreviewStatus() !== 'FAILED') {
                <div class="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                  <div class="flex items-start gap-2.5">
                    <lucide-icon name="info" [size]="16" class="mt-0.5 shrink-0 text-[#0056D2]"></lucide-icon>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-semibold text-slate-800">Xem trước nội tuyến không khả dụng</p>
                      <p class="mt-1 text-xs leading-relaxed text-slate-600">
                        Hệ thống tránh nhúng PDF gốc trong khung soạn để loại bỏ lỗi crash Chrome PDF viewer.
                        Học viên vẫn xem được tài liệu bình thường trong trang học (bản xem trước đã chuẩn hoá khi sẵn sàng).
                      </p>
                    </div>
                  </div>
                  <div class="flex flex-wrap items-center gap-2 pl-[26px]">
                    <a [href]="svc.sectionFileUrl()" target="_blank" rel="noopener"
                       class="inline-flex items-center gap-1.5 rounded-lg bg-[#0056D2] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#004BB5] transition-colors">
                      <lucide-icon name="external-link" [size]="12"></lucide-icon>
                      Mở trong tab mới
                    </a>
                    <button type="button" (click)="togglePdfInlinePreview()"
                            class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                      <lucide-icon [name]="showPdfInlinePreview() ? 'eye-off' : 'eye'" [size]="12"></lucide-icon>
                      {{ showPdfInlinePreview() ? 'Ẩn xem trước' : 'Xem trước trong khung' }}
                    </button>
                  </div>
                  <div class="flex items-start gap-1.5 border-t border-slate-100 pt-2 pl-[26px] text-[11px] text-slate-400">
                    <lucide-icon name="shield-check" [size]="12" class="mt-0.5 shrink-0 text-emerald-500"></lucide-icon>
                    <span>Tài liệu được lưu trữ an toàn trên hạ tầng đám mây của khóa học. Liên kết có giới hạn thời gian.</span>
                  </div>
                </div>
              }

              <!-- Inline preview (opt-in) — dùng &lt;object&gt; thay iframe vì stable hơn cho Chrome PDF viewer -->
              @if (svc.sectionFileUrl() && !svc.safePdfUrl() && showPdfInlinePreview()) {
                <div>
                  <label class="text-xs font-semibold text-slate-600 mb-2 block">Xem trước (PDF gốc)</label>
                  <div class="h-[380px] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    <object [data]="svc.sectionFileUrl()!" type="application/pdf" class="h-full w-full">
                      <p class="p-4 text-xs text-slate-500">
                        Trình duyệt không hiển thị được tài liệu này. Hãy
                        <a [href]="svc.sectionFileUrl()" target="_blank" rel="noopener" class="text-[#0056D2] underline">mở trong tab mới</a>.
                      </p>
                    </object>
                  </div>
                </div>
              }

              <!-- PDF preview iframe (snapshot từ BE — đã chuẩn hoá an toàn) -->
              @if (svc.safePdfUrl()) {
                <div>
                  <label class="text-xs font-semibold text-slate-600 mb-2 block">Xem trước (bản đã chuẩn hoá)</label>
                  <div class="h-[380px] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    <iframe [src]="svc.safePdfUrl()" class="h-full w-full" frameborder="0"></iframe>
                  </div>
                  <p class="mt-1.5 inline-flex items-center gap-1 text-[11px] text-slate-400">
                    <lucide-icon name="shield-check" [size]="11" class="text-emerald-500"></lucide-icon>
                    Bản xem trước được tạo từ máy chủ — an toàn cho mọi trình duyệt.
                  </p>
                </div>
              }
            }

          </div>
        }

        <!-- ═══ QUIZ ═══ -->
        @if (svc.sectionEditorType() === 'QUIZ') {
          <div class="space-y-4">

            <!-- Quiz type cards -->
            <div class="grid gap-2 sm:grid-cols-3">
              @for (type of quizTypes; track type) {
                <button type="button"
                  (click)="onQuizTypeChange(type)"
                  class="quiz-type-card"
                  [class.quiz-type-card--active]="svc.sectionQuizType() === type">
                  <lucide-icon [name]="getQuizTypeIcon(type)" [size]="18"></lucide-icon>
                  <span class="quiz-type-card__title">{{ getQuizTypeLabel(type) }}</span>
                  <span class="quiz-type-card__desc">{{ getQuizTypeDescription(type) }}</span>
                </button>
              }
            </div>

            <!-- Quiz type info callout -->
            <div [class]="getQuizTypeCalloutClass()">
              <lucide-icon name="info" [size]="15" class="mt-0.5 shrink-0 opacity-70"></lucide-icon>
              <p class="text-xs leading-relaxed">{{ getQuizTypeCalloutText() }}</p>
            </div>

            <!-- Certificate flag (EXAM only) -->
            @if (svc.sectionQuizType() === 'EXAM') {
              <div class="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
                <input type="checkbox" id="certQuiz"
                  [ngModel]="svc.sectionQuizCountsTowardCertificate()"
                  (ngModelChange)="svc.sectionQuizCountsTowardCertificate.set($event); svc.markDirty()"
                  class="mt-0.5 h-4 w-4 rounded text-amber-600 focus:ring-amber-500" />
                <label for="certQuiz" class="cursor-pointer select-none">
                  <span class="text-sm font-semibold text-amber-900">Tính vào chứng chỉ</span>
                  <span class="block mt-0.5 text-xs text-amber-700">Kết quả bài thi này sẽ được tính vào điều kiện cấp chứng chỉ khóa học.</span>
                </label>
              </div>
            }

            <!-- Settings grid -->
            <div class="rounded-xl border border-slate-200 bg-white">
              <div class="border-b border-slate-100 px-4 py-2.5">
                <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Thiết lập làm bài</h4>
              </div>
              <div class="grid gap-4 p-4 sm:grid-cols-3">
                <div>
                  <label class="mb-1.5 block text-xs font-medium text-slate-600">Thời gian (phút)</label>
                  <input type="number" min="1"
                    [ngModel]="svc.sectionQuizTimeLimit()"
                    (ngModelChange)="svc.sectionQuizTimeLimit.set(+$event); svc.markDirty()"
                    class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0056D2] focus:ring-[#0056D2]" />
                </div>
                <div>
                  <label class="mb-1.5 block text-xs font-medium text-slate-600">Điểm đạt (%)</label>
                  <input type="number" min="0" max="100"
                    [ngModel]="svc.sectionQuizPassingScore()"
                    (ngModelChange)="svc.sectionQuizPassingScore.set(+$event); svc.markDirty()"
                    class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0056D2] focus:ring-[#0056D2]" />
                </div>
                <div>
                  <label class="mb-1.5 block text-xs font-medium text-slate-600">Số lần làm bài</label>
                  <input type="number" min="1"
                    [ngModel]="svc.sectionQuizMaxAttempts()"
                    (ngModelChange)="svc.sectionQuizMaxAttempts.set(+$event); svc.markDirty()"
                    class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0056D2] focus:ring-[#0056D2]" />
                </div>
              </div>

              <!-- Behavioral toggles -->
              <div class="border-t border-slate-100 px-4 py-3">
                <div class="flex flex-wrap gap-x-6 gap-y-2">
                  <label class="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox"
                      [ngModel]="svc.sectionQuizShuffleQuestions()"
                      (ngModelChange)="svc.sectionQuizShuffleQuestions.set($event); svc.markDirty()"
                      class="h-4 w-4 rounded text-[#0056D2] focus:ring-[#0056D2]" />
                    Trộn câu hỏi
                  </label>
                  <label class="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox"
                      [ngModel]="svc.sectionQuizShuffleOptions()"
                      (ngModelChange)="svc.sectionQuizShuffleOptions.set($event); svc.markDirty()"
                      class="h-4 w-4 rounded text-[#0056D2] focus:ring-[#0056D2]" />
                    Trộn đáp án
                  </label>
                  <label class="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox"
                      [ngModel]="svc.sectionQuizShowResults()"
                      (ngModelChange)="svc.sectionQuizShowResults.set($event); svc.markDirty()"
                      class="h-4 w-4 rounded text-[#0056D2] focus:ring-[#0056D2]" />
                    Hiện kết quả ngay
                  </label>
                  <label class="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox"
                      [ngModel]="svc.sectionQuizShowCorrectAnswers()"
                      (ngModelChange)="svc.sectionQuizShowCorrectAnswers.set($event); svc.markDirty()"
                      class="h-4 w-4 rounded text-[#0056D2] focus:ring-[#0056D2]" />
                    Hiện đáp án đúng
                  </label>
                </div>
              </div>
            </div>

            <!-- Questions list -->
            <div class="rounded-xl border border-slate-200 bg-white">
              <div class="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <h4 class="text-sm font-semibold text-slate-800">
                  Câu hỏi
                  @if (svc.sectionQuizSelectedQuestions().length) {
                    <span class="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0056D2] px-1.5 text-[10px] font-bold text-white">
                      {{ svc.sectionQuizSelectedQuestions().length }}
                    </span>
                  }
                </h4>
                <div class="flex items-center gap-2">
                  <button type="button" (click)="svc.showSectionQuizBankModal.set(true)"
                    class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-[#0056D2] hover:bg-[#0056D2]/5">
                    <lucide-icon name="library" [size]="12" class="mr-1 inline-block -mt-0.5"></lucide-icon>
                    Ngân hàng
                  </button>
                  <button type="button" (click)="svc.showSectionQuizRandomModal.set(true)"
                    class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-[#0056D2] hover:bg-[#0056D2]/5">
                    <lucide-icon name="shuffle" [size]="12" class="mr-1 inline-block -mt-0.5"></lucide-icon>
                    Ngẫu nhiên
                  </button>
                </div>
              </div>

              <div class="max-h-72 overflow-y-auto">
                @if (svc.sectionQuizSelectedQuestions().length === 0) {
                  <div class="px-4 py-8 text-center">
                    <lucide-icon name="help-circle" [size]="32" class="mx-auto text-slate-300"></lucide-icon>
                    <p class="mt-2 text-sm font-medium text-slate-500">Chưa có câu hỏi nào</p>
                    <p class="mt-1 text-xs text-slate-400">Chọn từ ngân hàng câu hỏi hoặc thêm ngẫu nhiên</p>
                  </div>
                } @else {
                  <div class="divide-y divide-slate-100">
                    @for (q of svc.sectionQuizSelectedQuestions(); track q.id; let idx = $index) {
                      <div class="quiz-question-row">
                        <!-- Collapsed row — click to expand preview -->
                        <div class="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50/60 transition-colors"
                             (click)="toggleQuestionPreview(q.id)">
                          <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0056D2]/10 text-xs font-semibold text-[#0056D2] tabular-nums">
                            {{ idx + 1 }}
                          </span>
                          <div class="min-w-0 flex-1">
                            <p class="text-sm font-medium text-slate-900 line-clamp-1">{{ q.content }}</p>
                            <div class="flex items-center gap-1.5 mt-1">
                              @if (q.questionType) {
                                <span class="rounded-full bg-[#0056D2]/5 px-2 py-0.5 text-[10px] font-semibold text-[#0056D2]">
                                  {{ getQuestionTypeLabel(q.questionType) }}
                                </span>
                              }
                              @if (q.difficulty) {
                                <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                                  [class]="getDifficultyClass(q.difficulty)">
                                  {{ getDifficultyLabel(q.difficulty) }}
                                </span>
                              }
                            </div>
                          </div>
                          <svg class="w-4 h-4 text-slate-400 transition-transform shrink-0"
                               [class.rotate-180]="expandedQuestionIds().has(q.id)"
                               fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/>
                          </svg>
                          <button type="button" (click)="$event.stopPropagation(); removeQuestion(q.id)"
                            class="quiz-question-remove w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 transition-all shrink-0"
                            aria-label="Xóa">
                            <lucide-icon name="x" [size]="14"></lucide-icon>
                          </button>
                        </div>

                        <!-- Expanded preview -->
                        @if (expandedQuestionIds().has(q.id)) {
                          <div class="px-4 pb-4 pt-1 ml-10 mr-4 border-l-2 border-[#0056D2]/20">
                            <div class="text-sm text-slate-800 leading-relaxed">
                              @if ($any(q).contentBlocks?.length > 0) {
                                <app-block-renderer [blocks]="$any(q).contentBlocks"></app-block-renderer>
                              } @else {
                                <p class="whitespace-pre-line">{{ q.content }}</p>
                              }
                            </div>
                            @if (q.options?.length > 0) {
                              <div class="mt-3 space-y-1.5">
                                @for (option of q.options; track option.optionKey) {
                                  <div class="flex items-start gap-2 rounded-lg px-3 py-2 text-sm"
                                       [class.bg-emerald-50]="option.optionKey === q.correctOption"
                                       [class.text-emerald-800]="option.optionKey === q.correctOption"
                                       [class.bg-slate-50]="option.optionKey !== q.correctOption"
                                       [class.text-slate-700]="option.optionKey !== q.correctOption">
                                    <span class="font-semibold shrink-0 w-5">{{ option.optionKey }}.</span>
                                    <span class="flex-1">
                                      @if ($any(option).contentBlocks?.length > 0) {
                                        <app-block-renderer [blocks]="$any(option).contentBlocks"></app-block-renderer>
                                      } @else {
                                        {{ option.content }}
                                      }
                                    </span>
                                    @if (option.optionKey === q.correctOption) {
                                      <svg class="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/>
                                      </svg>
                                    }
                                  </div>
                                }
                              </div>
                            }
                            @if (q.questionType === 'ESSAY') {
                              <div class="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500 italic">
                                Câu tự luận — giảng viên chấm thủ công
                              </div>
                            }
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            </div>

          </div>
        }
      </div>

      <!-- Footer — sticky bottom -->
      <div class="section-editor-footer">
        <button type="button" (click)="onClose()" class="editor-secondary-button">
          Hủy
        </button>
        <button type="button" (click)="onSave()"
          [disabled]="svc.isSaving() || svc.sectionVideoIsUploading() || !svc.sectionTitle().trim()"
          class="editor-primary-button">
          @if (svc.isSaving()) {
            <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          }
          {{ svc.editingSectionId() ? 'Cập nhật' : 'Tạo mới' }}
        </button>
      </div>
    </section>
    }
  `,
  styles: [`
    @import '../../../course-info/editor-shared';
    :host { display: block; }

    .animate-slide-down {
      animation: slideDown 0.2s ease-out;
    }
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .editor-card--expanded {
      position: fixed;
      inset: 0;
      z-index: 50;
      border-radius: 0;
      border: none;
      display: flex;
      flex-direction: column;
      box-shadow: none;
    }
    .editor-card--expanded .editor-card__header {
      border-radius: 0;
      flex-shrink: 0;
    }
    .editor-card--expanded .editor-card__body {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }
    .editor-card--expanded .editor-card__body app-tiptap-editor {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }
    .editor-card--expanded .editor-card__body app-tiptap-editor ::ng-deep .tt-content {
      flex: 1;
      min-height: 0 !important;
      overflow-y: auto;
    }

    /* ── Preview toggle (Chỉnh sửa | Xem trước) ── */
    .preview-toggle {
      display: inline-flex;
      border: 1px solid rgb(226 232 240);
      border-radius: 0.375rem;
      overflow: hidden;
    }
    .preview-toggle button {
      font-size: 0.75rem;
      font-weight: 500;
      padding: 0.25rem 0.625rem;
      border: none;
      background: transparent;
      color: rgb(100 116 139);
      cursor: pointer;
      transition: background 120ms ease, color 120ms ease;
    }
    .preview-toggle button:hover { background: rgb(248 250 252); }
    .preview-toggle--active {
      background: rgb(0 86 210) !important;
      color: #fff !important;
    }

    /* ── Template Picker ── */
    .tpl-picker {
      border: 1px solid rgb(226 232 240);
      border-radius: 0.625rem;
      overflow: hidden;
    }
    .tpl-picker__header {
      padding: 1rem 1.25rem;
      background: rgb(248 250 252);
      border-bottom: 1px solid rgb(226 232 240);
    }
    .tpl-picker__title {
      font-size: 0.875rem;
      font-weight: 700;
      color: rgb(15 23 42);
    }
    .tpl-picker__subtitle {
      margin-top: 0.25rem;
      font-size: 0.75rem;
      color: rgb(100 116 139);
    }
    .tpl-picker__grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0;
    }
    .tpl-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.375rem;
      padding: 1rem 1.25rem;
      border: none;
      border-right: 1px solid rgb(241 245 249);
      border-bottom: 1px solid rgb(241 245 249);
      background: #fff;
      text-align: left;
      cursor: pointer;
      transition: background 150ms;
    }
    .tpl-card:hover { background: rgb(248 250 252); }
    .tpl-card:nth-child(2n) { border-right: none; }
    .tpl-card:nth-last-child(-n+2) { border-bottom: none; }
    .tpl-card__icon {
      width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center;
      color: rgb(100 116 139);
    }
    .tpl-card__icon :host ::ng-deep svg { width: 24px; height: 24px; }
    .tpl-card__title {
      font-size: 0.8125rem;
      font-weight: 600;
      color: rgb(15 23 42);
    }
    .tpl-card__desc {
      font-size: 0.6875rem;
      color: rgb(100 116 139);
      line-height: 1.4;
    }

    /* ── Section Editor Footer (sticky) ── */
    .section-editor-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 0.75rem 1.25rem;
      border-top: 1px solid rgb(226 232 240);
      background: rgb(248 250 252);
      border-radius: 0 0 0.625rem 0.625rem;
      position: sticky;
      bottom: 0;
      z-index: 5;
    }

    /* ── Preview pane (student view) ── */
    .preview-pane {
      min-height: 340px;
      padding: 1.25rem;
      border: 1px solid rgb(226 232 240);
      border-radius: 0.5rem;
      background: #fff;
      overflow-y: auto;
    }
    .preview-pane--expanded {
      flex: 1;
      min-height: 0;
      border: none;
      border-radius: 0;
    }

    /* ── Video Source Tabs ── */
    .video-source-tabs {
      display: flex;
      gap: 0;
      border: 1px solid rgb(226 232 240);
      border-radius: 0.5rem;
      overflow: hidden;
      background: rgb(248 250 252);
    }
    .video-source-tab {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      padding: 0.5rem 0.75rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: rgb(100 116 139);
      background: transparent;
      border: none;
      cursor: pointer;
      transition: background 150ms, color 150ms;
    }
    .video-source-tab:hover { background: rgb(241 245 249); }
    .video-source-tab--active {
      background: #fff !important;
      color: rgb(0 86 210) !important;
      box-shadow: 0 1px 2px rgb(0 0 0 / 0.06);
    }

    /* ── Video Dropzone ── */
    .video-dropzone {
      position: relative;
      display: flex;
      cursor: pointer;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border-radius: 0.75rem;
      border: 2px dashed rgba(0, 86, 210, 0.35);
      background: rgba(0, 86, 210, 0.03);
      padding: 2rem 1.5rem;
      transition: border-color 200ms, background 200ms;
    }
    .video-dropzone:hover {
      border-color: rgba(0, 86, 210, 0.6);
      background: rgba(0, 86, 210, 0.07);
    }
    .video-dropzone--dragover {
      border-color: rgb(0, 86, 210) !important;
      background: rgba(0, 86, 210, 0.12) !important;
      border-style: solid !important;
    }

    /* ── Video Status Cards ── */
    .video-status-card {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      border-radius: 0.75rem;
      padding: 1rem;
    }
    .video-status-card--staged {
      border: 1px solid rgb(186 230 253);
      background: rgb(240 249 255);
    }
    .video-status-card--uploading {
      border: 1px solid rgba(0, 86, 210, 0.2);
      background: rgba(0, 86, 210, 0.04);
      padding: 1rem 1.25rem;
    }
    .video-status-card--error {
      border: 1px solid rgb(254 202 202);
      background: rgb(254 242 242);
    }
    .video-status-card--done {
      border: 1px solid rgb(167 243 208);
      background: rgb(236 253 245);
    }
    .video-status-card__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 0.5rem;
      flex-shrink: 0;
    }

    /* ── Video Processing Spinner ── */
    .video-processing-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(0, 86, 210, 0.2);
      border-top-color: rgb(0, 86, 210);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      flex-shrink: 0;
    }
    .video-processing-spinner--lg {
      width: 28px;
      height: 28px;
      border-width: 3px;
      border-color: rgba(255, 255, 255, 0.3);
      border-top-color: #fff;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .video-processing-bar {
      animation: processing-pulse 2s ease-in-out infinite;
    }
    @keyframes processing-pulse {
      0%   { width: 30%; opacity: 0.6; }
      50%  { width: 80%; opacity: 1; }
      100% { width: 30%; opacity: 0.6; }
    }

    /* ── Video Progress Card (SOTA layout) ── */
    .video-progress-card {
      border: 1px solid rgba(0, 86, 210, 0.18);
      background: linear-gradient(180deg, rgba(0, 86, 210, 0.04) 0%, #fff 100%);
      border-radius: 0.875rem;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
    }
    .video-progress-card__main {
      display: flex;
      gap: 0.875rem;
      align-items: stretch;
    }
    .video-progress-card__poster {
      position: relative;
      flex-shrink: 0;
      width: 120px;
      aspect-ratio: 16 / 9;
      border-radius: 0.5rem;
      overflow: hidden;
      background: rgb(15 23 42);
    }
    .video-progress-card__poster-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .video-progress-card__poster-fallback {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgb(148 163 184);
      background: linear-gradient(135deg, rgb(15 23 42) 0%, rgb(30 41 59) 100%);
    }
    .video-progress-card__poster-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .video-progress-card__meta {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .video-progress-card__title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .video-progress-card__filename {
      font-size: 0.875rem;
      font-weight: 600;
      color: rgb(15 23 42);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }
    .video-progress-card__cancel {
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 9999px;
      border: none;
      background: transparent;
      color: rgb(148 163 184);
      cursor: pointer;
      transition: background 150ms, color 150ms;
    }
    .video-progress-card__cancel:hover {
      background: rgb(254 242 242);
      color: rgb(239 68 68);
    }
    .video-progress-card__badges {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }
    .video-badge {
      font-size: 0.6875rem;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      background: rgb(241 245 249);
      color: rgb(71 85 105);
      font-weight: 500;
      font-variant-numeric: tabular-nums;
      display: inline-flex;
      align-items: center;
    }

    .video-progress-line {
      margin-top: 0.125rem;
    }
    .video-progress-line__label {
      font-size: 0.75rem;
      font-weight: 600;
      color: rgb(0, 86, 210);
      display: flex;
      align-items: center;
    }
    .video-progress-line__pct {
      margin-left: auto;
      font-variant-numeric: tabular-nums;
    }
    .video-progress-bar {
      margin-top: 0.375rem;
      height: 6px;
      width: 100%;
      overflow: hidden;
      border-radius: 9999px;
      background: rgba(0, 86, 210, 0.1);
    }
    .video-progress-bar__fill {
      height: 100%;
      border-radius: 9999px;
      background: rgb(0, 86, 210);
      transition: width 300ms ease-out;
    }
    .video-progress-bar__fill--indeterminate {
      width: 40% !important;
      animation: indeterminate-slide 1.8s ease-in-out infinite;
      background: linear-gradient(90deg, rgba(0, 86, 210, 0.4), rgb(0, 86, 210), rgba(0, 86, 210, 0.4));
    }
    @keyframes indeterminate-slide {
      0%   { transform: translateX(-100%); }
      50%  { transform: translateX(60%); }
      100% { transform: translateX(260%); }
    }
    .video-progress-line__stats {
      margin-top: 0.375rem;
      display: flex;
      justify-content: space-between;
      font-size: 0.6875rem;
      color: rgb(100 116 139);
      font-variant-numeric: tabular-nums;
    }

    /* ── Phase Timeline (steps) ── */
    .video-phase-timeline {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0;
      position: relative;
      padding-top: 0.25rem;
    }
    .video-phase {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.375rem;
      position: relative;
      color: rgb(148 163 184);
    }
    .video-phase:not(:last-child)::after {
      content: '';
      position: absolute;
      top: 11px;
      left: calc(50% + 12px);
      right: calc(-50% + 12px);
      height: 2px;
      background: rgb(226 232 240);
    }
    .video-phase--done:not(:last-child)::after,
    .video-phase--active:not(:last-child)::after {
      background: rgba(0, 86, 210, 0.3);
    }
    .video-phase--done:not(:last-child)::after {
      background: rgb(0, 86, 210);
    }
    .video-phase__dot {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #fff;
      border: 2px solid rgb(226 232 240);
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgb(148 163 184);
      position: relative;
      z-index: 1;
      transition: border-color 200ms, background 200ms, color 200ms;
    }
    .video-phase--active .video-phase__dot {
      border-color: rgb(0, 86, 210);
      background: #fff;
      color: rgb(0, 86, 210);
      box-shadow: 0 0 0 4px rgba(0, 86, 210, 0.12);
    }
    .video-phase--done .video-phase__dot {
      background: rgb(0, 86, 210);
      border-color: rgb(0, 86, 210);
      color: #fff;
    }
    .video-phase__spinner {
      width: 10px;
      height: 10px;
      border: 2px solid rgba(0, 86, 210, 0.3);
      border-top-color: rgb(0, 86, 210);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .video-phase__label {
      font-size: 0.6875rem;
      font-weight: 500;
      text-align: center;
      line-height: 1.3;
    }
    .video-phase--active .video-phase__label,
    .video-phase--done .video-phase__label {
      color: rgb(15 23 42);
    }

    .video-progress-card__hint {
      font-size: 0.6875rem;
      color: rgb(100 116 139);
      display: flex;
      align-items: center;
      margin: 0;
    }

    /* ── Done badges ── */
    .video-done-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.625rem;
      font-weight: 600;
      background: rgb(220 252 231);
      color: rgb(6 95 70);
      font-variant-numeric: tabular-nums;
    }
    .video-done-badge--quality {
      background: rgba(0, 86, 210, 0.08);
      color: rgb(0, 86, 210);
    }

    /* ── Quiz Type Cards ── */
    .quiz-type-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      padding: 0.75rem 0.5rem;
      border: 2px solid rgb(226 232 240);
      border-radius: 0.75rem;
      background: #fff;
      cursor: pointer;
      text-align: center;
      transition: border-color 150ms, background 150ms, box-shadow 150ms;
    }
    .quiz-type-card:hover {
      border-color: rgba(0, 86, 210, 0.3);
      background: rgba(0, 86, 210, 0.02);
    }
    .quiz-type-card--active {
      border-color: rgb(0, 86, 210) !important;
      background: rgba(0, 86, 210, 0.05) !important;
      box-shadow: 0 0 0 3px rgba(0, 86, 210, 0.1);
    }
    .quiz-type-card--active lucide-icon {
      color: rgb(0, 86, 210);
    }
    .quiz-type-card__title {
      font-size: 0.8125rem;
      font-weight: 700;
      color: rgb(15 23 42);
    }
    .quiz-type-card__desc {
      font-size: 0.6875rem;
      color: rgb(100 116 139);
      line-height: 1.35;
    }

    /* ── Quiz Question Row (accordion) ── */
    .quiz-question-row:hover .quiz-question-remove { opacity: 1; }

    /* prose styles loaded via styleUrls: section-editor-prose.scss */
  `],
})
export class SectionEditorComponent {
  readonly svc = inject(CurriculumEditorService);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  readonly lessonId = input.required<string>();
  readonly courseId = input.required<string>();

  readonly closed = output<void>();
  readonly saved = output<void>();
  readonly batchVideoUpload = output<void>();

  readonly editorPanel = viewChild<ElementRef>('editorPanel');
  readonly tiptapEditor = viewChild<TiptapEditorComponent>('tiptapEditor');
  readonly isExpanded = signal(false);
  readonly isPreviewMode = signal(false);
  readonly videoSourceTab = signal<'upload' | 'youtube'>('upload');
  readonly isDragOver = signal(false);
  readonly expandedQuestionIds = signal<Set<string>>(new Set());
  private readonly sanitizer = inject(DomSanitizer);

  private readonly presignedUpload = inject(PresignedUploadService, { optional: true });
  readonly editorUploadFn = createTiptapUploadFn(this.http, environment.apiUrl, this.presignedUpload ?? undefined);
  readonly editorVideoUploadFn = this.presignedUpload ? createTiptapVideoUploadFn(this.presignedUpload) : null;
  readonly quizTypes: SectionQuizAssessmentType[] = ['PRACTICE', 'ASSESSMENT', 'EXAM'];
  readonly lessonTemplates = LESSON_TEMPLATES;
  readonly showTemplatePicker = signal(true);
  readonly isYoutubeVideoSource = computed(() =>
    this.videoSourceTab() === 'youtube' || this.svc.sectionVideoType() === 'YOUTUBE',
  );
  readonly interactiveVideoPreviewSpec = computed(() => buildInteractiveVideoSpec(
    this.svc.sectionInteractiveVideoEnabled(),
    this.svc.sectionInteractiveVideoTimeline(),
  ));
  readonly isContentEmpty = computed(() => {
    const content = this.svc.sectionContent();
    if (!content) return true;
    // Treat structural-only content as non-empty (callout shells, images,
    // videos, tables, code blocks). The naive strip-tags check would return
    // empty for `<div data-callout-type="info"><p></p></div>` and re-show
    // the template picker over user's content. Match the same media tags
    // that tiptap-editor.hasNonTextContent() recognizes.
    const hasStructural = /<(img|video|iframe|table|hr|pre|details|summary)\b/i.test(content)
      || /\bdata-(callout-type|youtube-video)\b/i.test(content);
    if (hasStructural) return false;
    const stripped = content.replace(/<[^>]*>/g, '').trim();
    return stripped.length === 0;
  });

  private readonly originalDocTitle = typeof document !== 'undefined' ? document.title : '';

  constructor() {
    // Auto-scroll section editor into view after slide-down animation
    afterNextRender(() => {
      setTimeout(() => {
        this.editorPanel()?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 220);
    });
    // Set initial video tab based on existing section data
    effect(() => {
      if (this.svc.sectionVideoType() === 'YOUTUBE') {
        this.videoSourceTab.set('youtube');
      }
    });
    // Reset file replace mode when section changes
    effect(() => {
      this.svc.editingSectionId(); // track dependency
      this.fileReplaceMode.set(false);
    });

    // Drive the 1Hz tick timer while we're in the uploading/processing state so
    // the ETA + elapsed labels refresh without a global setInterval.
    effect(() => {
      const isActive = this.cfUploadStatus() === 'uploading';
      if (isActive && !this.processingTickTimer) {
        this.processingTickTimer = setInterval(() => this.processingTick.update(v => v + 1), 1000);
      } else if (!isActive && this.processingTickTimer) {
        clearInterval(this.processingTickTimer);
        this.processingTickTimer = null;
      }
    });

    // Reflect upload / processing state in the browser tab title so the teacher
    // can leave the tab and come back when the video is ready.
    if (typeof document !== 'undefined') {
      effect(() => {
        const uploading = this.svc.sectionVideoIsUploading();
        const status = this.svc.sectionVideoProcessingStatus();
        const pct = this.svc.sectionVideoUploadProgress();
        if (uploading) {
          document.title = `(${pct}%) Đang tải video · ${this.originalDocTitle}`;
        } else if (status === 'PROCESSING' || status === 'PENDING') {
          document.title = `⚙ Đang xử lý video · ${this.originalDocTitle}`;
        } else if (document.title !== this.originalDocTitle) {
          document.title = this.originalDocTitle;
        }
      });
    }
  }

  ngOnDestroy(): void {
    if (this.processingTickTimer) {
      clearInterval(this.processingTickTimer);
      this.processingTickTimer = null;
    }
    if (typeof document !== 'undefined' && document.title !== this.originalDocTitle) {
      document.title = this.originalDocTitle;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.svc.sectionVideoIsUploading()) {
      this.cancelUpload();
    }
  }

  toggleExpand(): void {
    this.isExpanded.update(v => !v);
  }

  readonly cfUploadStatus = computed<CfUploadStatus>(() => {
    if (this.svc.sectionVideoError()) return 'error';
    if (this.svc.sectionVideoIsUploading()) return 'uploading';
    // No 'staged' state — upload starts immediately on file select (Coursera pattern)
    if (this.svc.sectionVideoAssetId()) {
      const status = this.svc.sectionVideoProcessingStatus();
      if (status === 'PROCESSING' || status === 'PENDING') return 'uploading';
      if (status === 'FAILED') return 'error';
      // Null status + no playable URL → asset exists but backend couldn't confirm READY yet; poll will resolve
      if (status == null && !this.svc.sectionVideoUrl()) return 'uploading';
      return 'done';
    }
    return 'idle';
  });

  // ── Video metadata display ──────────────────────────────────────────
  readonly durationLabel = computed(() => formatDuration(this.svc.sectionVideoDurationSec()));
  readonly resolutionLabel = computed(() =>
    formatResolution(this.svc.sectionVideoWidth(), this.svc.sectionVideoHeight()),
  );

  // ── Processing ETA + elapsed calculation ────────────────────────────
  readonly processingTick = signal(0);
  private processingTickTimer: ReturnType<typeof setInterval> | null = null;

  readonly processingElapsedSec = computed(() => {
    this.processingTick();
    const startedAt = this.svc.sectionVideoProcessingStartedAt();
    if (!startedAt) return 0;
    return Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  });

  readonly processingElapsedLabel = computed(() => {
    const s = this.processingElapsedSec();
    if (!s) return '';
    if (s < 60) return `Đã xử lý ${s}s`;
    const m = Math.floor(s / 60);
    return `Đã xử lý ${m} phút ${s % 60}s`;
  });

  readonly processingEtaLabel = computed(() => {
    const eta = this.svc.sectionVideoProcessingEtaSec();
    const elapsed = this.processingElapsedSec();
    if (!eta) return null;
    const remaining = Math.max(10, eta - elapsed);
    if (remaining < 60) return `${remaining}s`;
    const m = Math.ceil(remaining / 60);
    return `${m} phút`;
  });

  /** Approximate % for the indeterminate processing bar, derived from elapsed/ETA. */
  readonly processingElapsedPctHint = computed(() => {
    const eta = this.svc.sectionVideoProcessingEtaSec();
    const elapsed = this.processingElapsedSec();
    if (!eta || eta <= 0) return null;
    const pct = Math.min(92, Math.round((elapsed / eta) * 100));
    return pct;
  });

  /**
   * Phase state machine derived from upload progress + backend asset status.
   * Phases: upload → decode → encode → ready.
   * Since the backend only reports PENDING/PROCESSING/READY, we approximate decode
   * vs encode using elapsed time: first 30% of ETA is "decode", rest is "encode".
   */
  phaseState(phase: 'upload' | 'decode' | 'encode' | 'ready'): 'done' | 'active' | 'pending' {
    const uploading = this.svc.sectionVideoIsUploading();
    const uploadPct = this.svc.sectionVideoUploadProgress();
    const status = this.svc.sectionVideoProcessingStatus();

    if (phase === 'upload') {
      if (uploading && uploadPct < 100) return 'active';
      return 'done';
    }
    if (phase === 'decode') {
      if (uploading) return 'pending';
      if (status === 'READY') return 'done';
      if (status === 'PENDING' || status == null) return 'active';
      // PROCESSING: split by elapsed ratio
      const eta = this.svc.sectionVideoProcessingEtaSec();
      const elapsed = this.processingElapsedSec();
      if (eta && elapsed / eta > 0.3) return 'done';
      return 'active';
    }
    if (phase === 'encode') {
      if (uploading) return 'pending';
      if (status === 'READY') return 'done';
      if (status === 'FAILED') return 'pending';
      if (status === 'PENDING' || status == null) return 'pending';
      const eta = this.svc.sectionVideoProcessingEtaSec();
      const elapsed = this.processingElapsedSec();
      if (eta && elapsed / eta > 0.3) return 'active';
      return 'pending';
    }
    if (phase === 'ready') {
      return status === 'READY' ? 'done' : 'pending';
    }
    return 'pending';
  }

  // ── Error display helpers ───────────────────────────────────────────
  errorTitle(): string {
    return this.svc.sectionVideoError()?.title ?? 'Xử lý video thất bại';
  }
  errorHint(): string {
    return this.svc.sectionVideoError()?.hint ?? this.svc.sectionVideoErrorDetail() ?? 'Vui lòng thử lại hoặc chọn video khác.';
  }
  errorIcon(): string {
    const cat = this.svc.sectionVideoError()?.category;
    switch (cat) {
      case 'network': return 'wifi-off';
      case 'size': return 'hard-drive';
      case 'format': return 'file-warning';
      case 'auth': return 'lock';
      case 'server': return 'server-crash';
      default: return 'alert-triangle';
    }
  }
  showFormatHelp(): boolean {
    const cat = this.svc.sectionVideoError()?.category;
    return cat === 'format' || cat === 'transcode' || cat == null;
  }

  /**
   * Apply lesson template — append at cursor (Notion/Google Docs UX) thay vì
   * replace toàn bộ. Trước đây silent-replace gây silent data loss (section
   * dc5675f0 bị wipe nhiều lần). Closes #280.
   *
   * Branch:
   *  - Editor empty → set content (initial scaffolding usage)
   *  - Editor has content → insertContent at cursor (append, preserve existing)
   */
  applyTemplate(tpl: LessonTemplate): void {
    this.showTemplatePicker.set(false);
    if (!tpl.content) return;

    const editorRef = this.tiptapEditor();
    const editor = editorRef?.editor;

    if (editor && !editor.isEmpty) {
      // Append at cursor — match Notion/Tiptap default UX, no destructive replace.
      editor.commands.insertContent(tpl.content);
    } else {
      // Empty editor: full set is fine (initial scaffolding).
      this.svc.sectionContent.set(tpl.content);
    }
    this.svc.markDirty();
  }

  onTitleChange(value: string): void {
    this.svc.sectionTitle.set(value);
    this.svc.markDirty();
  }

  async onSave(): Promise<void> {
    // SOTA pattern (Tiptap docs 2026, Notion/Coda): treat editor instance as
    // source of truth. Read fresh HTML directly here instead of relying on
    // [ngModel] propagation, which can lag by a microtask after slash-command
    // template insertions, emoji composition, or programmatic insertContent.
    //
    // FORWARD-ONLY flush (regression guard 2026-04-27): only update signal
    // when editor reports NON-EMPTY content. If editor reports empty but
    // signal has content, that's a race/init bug — keep signal value.
    // Wiping good signal with empty editor caused production data loss
    // (section dc5675f0: content "" trong DB despite user having rich HTML).
    // Trade-off: intentional "clear all content" won't propagate to save —
    // user must delete the section instead. Safer than silent data loss.
    const editor = this.tiptapEditor();
    const editorType = this.svc.sectionEditorType();

    if (editor && editorType === 'TEXT') {
      const freshHtml = editor.getCurrentHTML();
      const currentSignal = this.svc.sectionContent();
      if (freshHtml && freshHtml !== currentSignal) {
        // Forward path: editor has fresh content not yet synced to signal
        this.svc.sectionContent.set(freshHtml);
      } else if (!freshHtml && currentSignal && currentSignal.length > 7) {
        // Race condition guard: editor reports empty but signal has substantial
        // content (>7 chars rules out '<p></p>' default empty doc). Trust the
        // signal — wiping it would cause silent data loss as happened to
        // section dc5675f0 in production (2026-04-27 ~15:40 UTC).
        console.warn('[section-editor] Editor empty but signal has content',
          { signalLen: currentSignal.length, sectionId: this.svc.editingSectionId() });
      }
    }
    const success = await this.svc.saveSection(this.lessonId(), this.courseId());
    if (success) this.saved.emit();
  }

  async onClose(): Promise<void> {
    const closed = await this.svc.closeSectionSurfaceWithConfirm();
    if (closed) this.closed.emit();
  }

  readonly Math = Math;

  onVideoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.svc.startVideoUpload(file);
    }
    input.value = '';
  }

  cancelUpload(): void {
    this.svc.cancelVideoUpload();
  }

  resetVideoUpload(): void {
    this.svc.selectedSectionVideoFile.set(null);
    this.svc.sectionVideoAssetId.set(null);
    this.svc.sectionVideoProcessingStatus.set(null);
    this.svc.sectionVideoErrorDetail.set(null);
    this.svc.sectionVideoFileName.set(null);
    this.svc.sectionVideoFileSize.set(0);
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.svc.selectedFile.set(file);
      this.svc.markDirty();
    }
  }

  toggleQuestionPreview(questionId: string): void {
    this.expandedQuestionIds.update(set => {
      const next = new Set(set);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  }

  removeQuestion(questionId: string): void {
    const current = this.svc.sectionQuizSelectedQuestions();
    this.svc.sectionQuizSelectedQuestions.set(current.filter((q: any) => q.id !== questionId));
    this.svc.markDirty();
  }

  getDialogTitle(): string {
    const isNew = !this.svc.editingSectionId();
    const type = this.svc.sectionEditorType();
    const labels: Record<string, string> = {
      TEXT: 'Bài giảng',
      VIDEO: 'Video',
      FILE: 'Tài liệu',
      QUIZ: 'Trắc nghiệm',
    };
    return `${isNew ? 'Thêm' : 'Chỉnh sửa'} ${labels[type] || type}`;
  }

  getTypeDescription(): string {
    const type = this.svc.sectionEditorType();
    switch (type) {
      case 'TEXT': return 'Nội dung văn bản với hình ảnh và bảng biểu';
      case 'VIDEO': return 'Tải lên video bài giảng';
      case 'FILE': return 'Đính kèm tài liệu PDF, Word, Excel';
      case 'QUIZ': return 'Trắc nghiệm kiểm tra kiến thức';
      default: return '';
    }
  }

  getTypeIconName(): string {
    const type = this.svc.sectionEditorType();
    switch (type) {
      case 'TEXT': return 'pilcrow';
      case 'VIDEO': return 'play-circle';
      case 'FILE': return 'file-text';
      case 'QUIZ': return 'help-circle';
      default: return 'file';
    }
  }

  getTypeIconBgClass(): string {
    const type = this.svc.sectionEditorType();
    switch (type) {
      case 'TEXT': return 'bg-slate-100';
      case 'VIDEO': return 'bg-[#0056D2]/10';
      case 'FILE': return 'bg-amber-100';
      case 'QUIZ': return 'bg-violet-100';
      default: return 'bg-gray-100';
    }
  }

  getTypeIconColorClass(): string {
    const type = this.svc.sectionEditorType();
    switch (type) {
      case 'TEXT': return 'text-slate-500';
      case 'VIDEO': return 'text-[#0056D2]';
      case 'FILE': return 'text-amber-600';
      case 'QUIZ': return 'text-violet-600';
      default: return 'text-gray-500';
    }
  }

  getVideoProcessingCopy(): string {
    const status = this.svc.sectionVideoProcessingStatus();
    if (status === 'READY') return 'Video đã sẵn sàng phát.';
    if (status === 'PROCESSING' || status === 'PENDING') return 'Đang xử lý video...';
    if (status === 'FAILED') return 'Xử lý video thất bại.';
    return 'Video đã được gắn.';
  }

  formatProfile(profile: OfflineVideoProfileDescriptor): string {
    return formatOfflineVideoProfileLabel(profile);
  }

  getQuizTypeLabel(type: SectionQuizAssessmentType): string {
    switch (type) {
      case 'PRACTICE': return 'Luyện tập';
      case 'ASSESSMENT': return 'Kiểm tra';
      case 'EXAM': return 'Thi';
    }
  }

  getQuizTypeDescription(type: SectionQuizAssessmentType): string {
    switch (type) {
      case 'PRACTICE': return 'Ôn tập, làm lại nhiều lần';
      case 'ASSESSMENT': return 'Kiểm tra online, ghi điểm';
      case 'EXAM': return 'Đánh giá chính thức, chứng chỉ';
    }
  }

  getQuizTypeIcon(type: SectionQuizAssessmentType): string {
    switch (type) {
      case 'PRACTICE': return 'pencil-line';
      case 'ASSESSMENT': return 'clipboard-check';
      case 'EXAM': return 'award';
    }
  }

  onQuizTypeChange(type: SectionQuizAssessmentType): void {
    this.svc.sectionQuizType.set(type);
    // Only EXAM can count toward certificate
    if (type !== 'EXAM') {
      this.svc.sectionQuizCountsTowardCertificate.set(false);
    }
    this.svc.markDirty();
  }

  getQuizTypeCalloutText(): string {
    switch (this.svc.sectionQuizType()) {
      case 'PRACTICE':
        return 'Luyện tập không tính điểm. Học viên có thể làm không giới hạn số lần và xem đáp án ngay. Hỗ trợ làm bài ngoại tuyến.';
      case 'ASSESSMENT':
        return 'Bài kiểm tra có tính điểm. Giới hạn số lần làm bài, kết quả được ghi nhận vào sổ điểm. Chỉ hỗ trợ trực tuyến.';
      case 'EXAM':
        return 'Bài thi chính thức. Kết quả có thể được tính vào điều kiện cấp chứng chỉ. Chỉ hỗ trợ trực tuyến.';
    }
  }

  getQuizTypeCalloutClass(): string {
    const base = 'flex items-start gap-2.5 rounded-lg px-3 py-2.5';
    switch (this.svc.sectionQuizType()) {
      case 'PRACTICE':
        return base + ' border border-emerald-200 bg-emerald-50 text-emerald-800';
      case 'ASSESSMENT':
        return base + ' border border-sky-200 bg-sky-50 text-sky-800';
      case 'EXAM':
        return base + ' border border-amber-200 bg-amber-50 text-amber-800';
    }
  }

  getQuestionTypeLabel(type: string): string {
    switch (type?.toUpperCase()) {
      case 'SINGLE_CHOICE': return 'Một đáp án';
      case 'MULTIPLE_CHOICE': return 'Nhiều đáp án';
      case 'TRUE_FALSE': return 'Đúng/Sai';
      case 'FILL_IN_BLANK': return 'Điền khuyết';
      case 'SHORT_ANSWER': return 'Trả lời ngắn';
      case 'ESSAY': return 'Tự luận';
      default: return type || '';
    }
  }

  getDifficultyLabel(d: string): string {
    switch (d?.toUpperCase()) {
      case 'EASY': return 'Dễ';
      case 'MEDIUM': return 'TB';
      case 'HARD': return 'Khó';
      default: return d || '';
    }
  }

  getDifficultyClass(d: string): string {
    switch (d?.toUpperCase()) {
      case 'EASY': return 'bg-green-100 text-green-700';
      case 'MEDIUM': return 'bg-amber-100 text-amber-700';
      case 'HARD': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  }

  // ── Video: drag-drop ─────────────────────────────────────────────────

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('video/')) {
      this.svc.startVideoUpload(file);
    }
  }

  // ── Video: tab switching ─────────────────────────────────────────────

  switchVideoTab(tab: 'upload' | 'youtube'): void {
    if (tab === this.videoSourceTab()) return;
    // Only update videoType — do NOT clear existing asset/URL
    // User switching tabs to explore is not the same as replacing video
    this.svc.sectionVideoType.set(tab === 'youtube' ? 'YOUTUBE' : null);
    this.videoSourceTab.set(tab);
    if (tab === 'youtube') {
      this.svc.sectionVideoDurationSec.set(null);
    }
    if (tab === 'youtube' && this.svc.sectionInteractiveVideoEnabled()) {
      this.toast.info('Video tương tác trên YouTube hoạt động khi học viên online; chế độ ngoại tuyến vẫn cần video tải lên.');
    }
  }

  // ── Video: replace flow ──────────────────────────────────────────────

  replaceVideo(): void {
    this.resetVideoUpload();
    this.svc.markDirty();
  }

  // ── Video: retry processing ──────────────────────────────────────────

  retryVideoProcessing(): void {
    const assetId = this.svc.sectionVideoAssetId();
    if (!assetId) return;
    this.svc.sectionVideoProcessingStatus.set('PROCESSING');
    this.svc.scheduleSectionVideoPoll(assetId);
  }

  // ── Video: file size formatting ──────────────────────────────────────

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  // ── YouTube helpers ──────────────────────────────────────────────────

  private static readonly YOUTUBE_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

  readonly youtubeVideoId = computed(() => {
    const url = this.svc.sectionVideoUrl();
    if (!url) return null;
    const match = url.match(SectionEditorComponent.YOUTUBE_REGEX);
    return match?.[1] ?? null;
  });

  onYouTubeUrlChange(url: string): void {
    this.svc.sectionVideoUrl.set(url);
    this.svc.sectionVideoType.set('YOUTUBE');
    this.svc.sectionVideoDurationSec.set(null);
    this.svc.markDirty();
  }

  onYouTubeDurationLoaded(durationSeconds: number): void {
    if (Number.isFinite(durationSeconds) && durationSeconds > 0) {
      this.svc.sectionVideoDurationSec.set(Math.round(durationSeconds));
    }
  }

  // ── File section helpers ─────────────────────────────────────────────

  readonly fileReplaceMode = signal(false);
  // Opt-in inline preview cho PDF gốc (khi chưa có snapshot từ BE). Default
  // false để tránh crash Chrome PDF viewer; user click button để bật khi cần.
  readonly showPdfInlinePreview = signal(false);
  private stagedPdfObjectUrl: string | null = null;

  togglePdfInlinePreview(): void {
    this.showPdfInlinePreview.update(v => !v);
  }

  readonly stagedPdfUrl = computed<SafeResourceUrl | null>(() => {
    const file = this.svc.selectedFile();
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) return null;
    // Revoke previous URL
    if (this.stagedPdfObjectUrl) {
      URL.revokeObjectURL(this.stagedPdfObjectUrl);
    }
    this.stagedPdfObjectUrl = URL.createObjectURL(file);
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.stagedPdfObjectUrl);
  });

  triggerFileReplace(): void {
    this.fileReplaceMode.set(true);
    this.svc.markDirty();
  }

  clearFileSelection(): void {
    this.svc.selectedFile.set(null);
    this.fileReplaceMode.set(false);
    if (this.stagedPdfObjectUrl) {
      URL.revokeObjectURL(this.stagedPdfObjectUrl);
      this.stagedPdfObjectUrl = null;
    }
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.svc.selectedFile.set(file);
      this.svc.markDirty();
    }
  }

  getFileExtension(urlOrName: string): string {
    const name = urlOrName.split('/').pop()?.split('?')[0] ?? '';
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    return ext || 'file';
  }

  getExtFromName(name: string): string {
    return name.split('.').pop()?.toLowerCase() ?? 'file';
  }

  getFileName(url: string): string {
    const decoded = decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? '');
    return decoded || 'Tài liệu';
  }

  getFileIconName(ext: string): string {
    switch (ext) {
      case 'pdf': return 'file-text';
      case 'doc': case 'docx': return 'file-type';
      case 'xls': case 'xlsx': case 'csv': return 'sheet';
      case 'ppt': case 'pptx': return 'presentation';
      default: return 'file';
    }
  }

  getFileIconBgClass(ext: string): string {
    switch (ext) {
      case 'pdf': return 'bg-red-100';
      case 'doc': case 'docx': return 'bg-blue-100';
      case 'xls': case 'xlsx': case 'csv': return 'bg-green-100';
      case 'ppt': case 'pptx': return 'bg-orange-100';
      default: return 'bg-slate-100';
    }
  }

  getFileIconColorClass(ext: string): string {
    switch (ext) {
      case 'pdf': return 'text-red-600';
      case 'doc': case 'docx': return 'text-blue-600';
      case 'xls': case 'xlsx': case 'csv': return 'text-green-600';
      case 'ppt': case 'pptx': return 'text-orange-600';
      default: return 'text-slate-500';
    }
  }

  getFileTypeBadgeClass(ext: string): string {
    switch (ext) {
      case 'pdf': return 'bg-red-100 text-red-700';
      case 'doc': case 'docx': return 'bg-blue-100 text-blue-700';
      case 'xls': case 'xlsx': case 'csv': return 'bg-green-100 text-green-700';
      case 'ppt': case 'pptx': return 'bg-orange-100 text-orange-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  }
}
