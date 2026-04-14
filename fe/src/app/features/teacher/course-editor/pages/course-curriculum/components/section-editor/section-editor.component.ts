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
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LucideAngularModule } from 'lucide-angular';
import { CurriculumEditorService, SectionQuizAssessmentType } from '../../../../services/curriculum-editor.service';
import { TiptapEditorComponent } from '../../../../../../../shared/components/tiptap-editor/tiptap-editor.component';
import { createTiptapUploadFn, createTiptapVideoUploadFn } from '../../../../../../../shared/components/tiptap-editor/tiptap-upload';
import { PresignedUploadService } from '../../../../../../../core/services/presigned-upload.service';
import { LESSON_TEMPLATES, type LessonTemplate } from '../../../../../../../shared/components/tiptap-editor/lesson-templates';
import { environment } from '../../../../../../../../environments/environment';
import { formatOfflineVideoProfileLabel, type OfflineVideoProfileDescriptor } from '../../../../../../../core/models/video-quality';

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
  imports: [FormsModule, LucideAngularModule, TiptapEditorComponent],
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
                [ngModel]="svc.sectionContent()"
                (ngModelChange)="svc.sectionContent.set($event); svc.markDirty()"
                placeholder="Gõ / để xem danh sách lệnh nhanh..."
                [height]="280"
                [maxHeight]="420"
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
                     (drop)="onDrop($event)">
                  <input type="file" accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,video/x-matroska"
                         (change)="onVideoFileSelected($event)"
                         class="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                  <div class="pointer-events-none text-center">
                    <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#0056D2]/10">
                      <lucide-icon name="upload-cloud" [size]="24" class="text-[#0056D2]"></lucide-icon>
                    </div>
                    <p class="text-sm font-semibold text-gray-800">
                      {{ isDragOver() ? 'Thả video vào đây' : 'Kéo thả hoặc nhấn để chọn video' }}
                    </p>
                    <p class="mt-1 text-xs text-gray-500">MP4, MOV, WebM, AVI, MKV — tối đa 5 GB</p>
                  </div>
                </div>
              }

              <!-- STAGED: file selected, waiting for save -->
              @if (cfUploadStatus() === 'staged') {
                <div class="video-status-card video-status-card--staged">
                  <div class="video-status-card__icon bg-sky-100">
                    <lucide-icon name="film" [size]="20" class="text-sky-600"></lucide-icon>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold text-sky-900">Đã chọn video</p>
                    @if (svc.selectedSectionVideoFile(); as file) {
                      <p class="mt-0.5 truncate text-xs text-slate-600">{{ file.name }}</p>
                      <p class="text-xs text-slate-400">{{ formatFileSize(file.size) }}</p>
                    }
                    <p class="mt-1 text-xs text-sky-700">Sẽ tải lên khi bạn nhấn "Tạo mới" hoặc "Cập nhật".</p>
                  </div>
                  <button type="button" (click)="resetVideoUpload()"
                    class="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                    Bỏ chọn
                  </button>
                </div>
              }

              <!-- UPLOADING: progress bar -->
              @if (cfUploadStatus() === 'uploading') {
                <div class="video-status-card video-status-card--uploading">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between mb-2">
                      <p class="text-sm font-semibold text-[#0056D2]">
                        @if (svc.sectionVideoProcessingStatus() === 'PROCESSING') {
                          Đang xử lý video...
                        } @else {
                          Đang tải lên...
                        }
                      </p>
                      <span class="text-xs font-semibold text-[#0056D2] tabular-nums">{{ svc.sectionVideoUploadProgress() }}%</span>
                    </div>
                    <div class="h-2 w-full overflow-hidden rounded-full bg-[#0056D2]/10">
                      <div class="h-full rounded-full bg-[#0056D2] transition-[width] duration-300 ease-out"
                           [style.width.%]="svc.sectionVideoUploadProgress()"></div>
                    </div>
                    @if (svc.sectionVideoProcessingStatus() === 'PROCESSING') {
                      <p class="mt-2 text-xs text-slate-500">Video đang được tối ưu để phát trực tuyến. Bạn có thể đóng và quay lại sau.</p>
                    }
                  </div>
                </div>
              }

              <!-- ERROR: upload/processing failed -->
              @if (cfUploadStatus() === 'error') {
                <div class="video-status-card video-status-card--error">
                  <div class="video-status-card__icon bg-red-100">
                    <lucide-icon name="alert-triangle" [size]="20" class="text-red-600"></lucide-icon>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold text-red-800">Xử lý video thất bại</p>
                    <p class="mt-0.5 text-xs text-red-600">Vui lòng thử lại hoặc chọn video khác.</p>
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
                  <!-- Video preview -->
                  @if (svc.sectionVideoUrl()) {
                    <div class="overflow-hidden rounded-xl border border-slate-200 bg-black">
                      <video [src]="svc.sectionVideoUrl()" controls preload="metadata"
                             controlsList="nodownload"
                             class="aspect-video w-full"></video>
                    </div>
                  }

                  <div class="video-status-card video-status-card--done">
                    <div class="video-status-card__icon bg-emerald-100">
                      <lucide-icon name="check-circle" [size]="20" class="text-emerald-600"></lucide-icon>
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-semibold text-emerald-800">{{ getVideoProcessingCopy() }}</p>
                      @if (svc.sectionVideoAvailableOfflineProfiles().length) {
                        <p class="mt-1 text-xs text-emerald-700">
                          Chất lượng:
                          @for (profile of svc.sectionVideoAvailableOfflineProfiles(); track $index) {
                            <span class="inline-block rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 mr-1">{{ formatProfile(profile) }}</span>
                          }
                        </p>
                      }
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
                    <p class="mt-0.5 text-sky-700">Hoàn thành tự động khi học viên xem ≥ 90%. Tuy nhiên video YouTube <strong>không hỗ trợ xem ngoại tuyến</strong>.</p>
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
                    <iframe [src]="getYouTubeEmbedUrl(videoId)"
                            class="aspect-video w-full" frameborder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen></iframe>
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

          </div>
        }

        <!-- ═══ FILE ═══ -->
        @if (svc.sectionEditorType() === 'FILE') {
          <div class="space-y-4">

            <!-- Existing file: show current attachment with download + replace -->
            @if (svc.sectionFileUrl() && !svc.selectedFile()) {
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

            <!-- Existing PDF preview (when not replacing) -->
            @if (svc.safePdfUrl() && !svc.selectedFile() && !fileReplaceMode(); as pdfUrl) {
              <div>
                <label class="text-xs font-semibold text-slate-600 mb-2 block">Xem trước</label>
                <div class="h-[380px] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  <iframe [src]="svc.safePdfUrl()" class="h-full w-full" frameborder="0"></iframe>
                </div>
              </div>
            }

          </div>
        }

        <!-- ═══ QUIZ ═══ -->
        @if (svc.sectionEditorType() === 'QUIZ') {
          <div class="space-y-4 rounded-xl border border-violet-200 bg-violet-50 p-4">
            <div class="space-y-1">
              <label class="block text-xs font-black uppercase text-violet-800">Thiết lập trắc nghiệm</label>
              <p class="text-sm text-violet-900">Cấu hình và chọn câu hỏi cho mục trắc nghiệm này.</p>
            </div>

            <div class="grid gap-3 md:grid-cols-2">
              <!-- Quiz type selector -->
              <div class="rounded-lg border border-violet-200 bg-white p-3">
                <label class="mb-2 block text-sm font-medium text-slate-700">Loại</label>
                <div class="grid gap-2 md:grid-cols-3">
                  @for (type of quizTypes; track type) {
                    <button type="button"
                      (click)="svc.sectionQuizType.set(type); svc.markDirty()"
                      class="rounded-lg border px-3 py-2 text-sm font-medium transition"
                      [class.border-violet-600]="svc.sectionQuizType() === type"
                      [class.bg-violet-600]="svc.sectionQuizType() === type"
                      [class.text-white]="svc.sectionQuizType() === type"
                      [class.border-slate-200]="svc.sectionQuizType() !== type"
                      [class.bg-white]="svc.sectionQuizType() !== type"
                      [class.text-slate-700]="svc.sectionQuizType() !== type">
                      {{ getQuizTypeLabel(type) }}
                    </button>
                  }
                </div>
              </div>

              <!-- Quiz settings -->
              <div class="rounded-lg border border-violet-200 bg-white p-3">
                <label class="mb-2 block text-sm font-medium text-slate-700">Thiết lập làm bài</label>
                <div class="grid grid-cols-3 gap-3">
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-500">Phút</label>
                    <input type="number" min="1"
                      [ngModel]="svc.sectionQuizTimeLimit()"
                      (ngModelChange)="svc.sectionQuizTimeLimit.set(+$event); svc.markDirty()"
                      class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-500">Điểm đạt</label>
                    <input type="number" min="0" max="100"
                      [ngModel]="svc.sectionQuizPassingScore()"
                      (ngModelChange)="svc.sectionQuizPassingScore.set(+$event); svc.markDirty()"
                      class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-500">Số lần</label>
                    <input type="number" min="1"
                      [ngModel]="svc.sectionQuizMaxAttempts()"
                      (ngModelChange)="svc.sectionQuizMaxAttempts.set(+$event); svc.markDirty()"
                      class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Checkboxes -->
            <div class="grid gap-2 md:grid-cols-3">
              <label class="flex items-start gap-2 rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-slate-700">
                <input type="checkbox"
                  [ngModel]="svc.sectionQuizShuffleQuestions()"
                  (ngModelChange)="svc.sectionQuizShuffleQuestions.set($event); svc.markDirty()"
                  class="mt-0.5 h-4 w-4 rounded text-violet-600" />
                <span>Trộn câu hỏi</span>
              </label>
              <label class="flex items-start gap-2 rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-slate-700">
                <input type="checkbox"
                  [ngModel]="svc.sectionQuizShuffleOptions()"
                  (ngModelChange)="svc.sectionQuizShuffleOptions.set($event); svc.markDirty()"
                  class="mt-0.5 h-4 w-4 rounded text-violet-600" />
                <span>Trộn đáp án</span>
              </label>
              <label class="flex items-start gap-2 rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-slate-700">
                <input type="checkbox"
                  [ngModel]="svc.sectionQuizShowResults()"
                  (ngModelChange)="svc.sectionQuizShowResults.set($event); svc.markDirty()"
                  class="mt-0.5 h-4 w-4 rounded text-violet-600" />
                <span>Hiện kết quả ngay</span>
              </label>
            </div>

            <!-- Questions list -->
            <div class="rounded-lg border border-violet-200 bg-white">
              <div class="flex items-center justify-between gap-3 border-b border-violet-100 px-4 py-3">
                <div>
                  <h4 class="text-sm font-semibold text-slate-800">
                    Câu hỏi ({{ svc.sectionQuizSelectedQuestions().length }})
                  </h4>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <button type="button" (click)="svc.showSectionQuizBankModal.set(true)"
                    class="rounded-lg border border-violet-200 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-50">
                    Chọn từ ngân hàng
                  </button>
                  <button type="button" (click)="svc.showSectionQuizRandomModal.set(true)"
                    class="rounded-lg border border-violet-200 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-50">
                    Thêm ngẫu nhiên
                  </button>
                </div>
              </div>

              <div class="max-h-64 overflow-y-auto p-3">
                @if (svc.sectionQuizSelectedQuestions().length === 0) {
                  <div class="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
                    <p class="text-sm font-medium text-slate-700">Chưa có câu hỏi.</p>
                    <p class="mt-1 text-xs text-slate-500">Chọn từ ngân hàng hoặc thêm ngẫu nhiên.</p>
                  </div>
                } @else {
                  <div class="space-y-2">
                    @for (q of svc.sectionQuizSelectedQuestions(); track q.id; let idx = $index) {
                      <div class="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                        <span class="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700 tabular-nums">
                          {{ idx + 1 }}
                        </span>
                        <p class="min-w-0 flex-1 line-clamp-2 text-sm font-medium text-slate-800">{{ q.content }}</p>
                        <button type="button" (click)="removeQuestion(q.id)"
                          class="rounded p-1 text-slate-400 hover:bg-white hover:text-red-600" aria-label="Xóa">
                          <lucide-icon name="x" [size]="16"></lucide-icon>
                        </button>
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
          [disabled]="svc.isSaving() || !svc.sectionTitle().trim()"
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

    /* prose styles loaded via styleUrls: section-editor-prose.scss */
  `],
})
export class SectionEditorComponent {
  readonly svc = inject(CurriculumEditorService);
  private readonly http = inject(HttpClient);

  readonly lessonId = input.required<string>();
  readonly courseId = input.required<string>();

  readonly closed = output<void>();
  readonly saved = output<void>();

  readonly editorPanel = viewChild<ElementRef>('editorPanel');
  readonly isExpanded = signal(false);
  readonly isPreviewMode = signal(false);
  readonly videoSourceTab = signal<'upload' | 'youtube'>('upload');
  readonly isDragOver = signal(false);
  private readonly sanitizer = inject(DomSanitizer);

  private readonly presignedUpload = inject(PresignedUploadService, { optional: true });
  readonly editorUploadFn = createTiptapUploadFn(this.http, environment.apiUrl, this.presignedUpload ?? undefined);
  readonly editorVideoUploadFn = this.presignedUpload ? createTiptapVideoUploadFn(this.presignedUpload) : null;
  readonly quizTypes: SectionQuizAssessmentType[] = ['PRACTICE', 'ASSESSMENT', 'EXAM'];
  readonly lessonTemplates = LESSON_TEMPLATES;
  readonly showTemplatePicker = signal(true);
  readonly isContentEmpty = computed(() => {
    const content = this.svc.sectionContent();
    if (!content) return true;
    const stripped = content.replace(/<[^>]*>/g, '').trim();
    return stripped.length === 0;
  });

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
  }

  toggleExpand(): void {
    this.isExpanded.update(v => !v);
  }

  readonly cfUploadStatus = computed<CfUploadStatus>(() => {
    if (this.svc.sectionVideoIsUploading()) return 'uploading';
    if (this.svc.selectedSectionVideoFile()) return 'staged';
    if (this.svc.sectionVideoAssetId()) {
      const status = this.svc.sectionVideoProcessingStatus();
      if (status === 'PROCESSING') return 'uploading';
      if (status === 'FAILED') return 'error';
      return 'done';
    }
    return 'idle';
  });

  applyTemplate(tpl: LessonTemplate): void {
    this.showTemplatePicker.set(false);
    if (tpl.content) {
      this.svc.sectionContent.set(tpl.content);
      this.svc.markDirty();
    }
  }

  onTitleChange(value: string): void {
    this.svc.sectionTitle.set(value);
    this.svc.markDirty();
  }

  async onSave(): Promise<void> {
    const success = await this.svc.saveSection(this.lessonId(), this.courseId());
    if (success) this.saved.emit();
  }

  async onClose(): Promise<void> {
    const closed = await this.svc.closeSectionSurfaceWithConfirm();
    if (closed) this.closed.emit();
  }

  onVideoFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.svc.selectedSectionVideoFile.set(file);
      this.svc.markDirty();
    }
  }

  resetVideoUpload(): void {
    this.svc.selectedSectionVideoFile.set(null);
    this.svc.sectionVideoAssetId.set(null);
    this.svc.sectionVideoProcessingStatus.set(null);
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.svc.selectedFile.set(file);
      this.svc.markDirty();
    }
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
    if (status === 'PROCESSING') return 'Đang xử lý video...';
    if (status === 'FAILED') return 'Xử lý video thất bại.';
    return 'Video đã được gắn.';
  }

  formatProfile(profile: OfflineVideoProfileDescriptor): string {
    return formatOfflineVideoProfileLabel(profile);
  }

  getQuizTypeLabel(type: SectionQuizAssessmentType): string {
    switch (type) {
      case 'PRACTICE': return 'Luyện tập';
      case 'ASSESSMENT': return 'Đánh giá';
      case 'EXAM': return 'Thi';
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
      this.svc.selectedSectionVideoFile.set(file);
      this.svc.markDirty();
    }
  }

  // ── Video: tab switching ─────────────────────────────────────────────

  switchVideoTab(tab: 'upload' | 'youtube'): void {
    if (tab === this.videoSourceTab()) return;
    // Clear video state when switching tabs
    this.resetVideoUpload();
    this.svc.sectionVideoUrl.set('');
    this.svc.sectionVideoType.set(tab === 'youtube' ? 'YOUTUBE' : null);
    this.videoSourceTab.set(tab);
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
    this.svc.markDirty();
  }

  getYouTubeEmbedUrl(videoId: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube.com/embed/${videoId}`
    );
  }

  // ── File section helpers ─────────────────────────────────────────────

  readonly fileReplaceMode = signal(false);
  private stagedPdfObjectUrl: string | null = null;

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
