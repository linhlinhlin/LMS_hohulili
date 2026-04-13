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
            <div class="rounded-xl border border-[#0056D2]/20 bg-[#0056D2]/5 p-4">
              <p class="text-sm font-semibold text-gray-900">Video bài giảng</p>
              <p class="mt-1 text-sm text-gray-600">
                Tải video bài giảng lên. Video sẽ được tối ưu để phát trực tuyến và tải về xem ngoại tuyến.
              </p>
            </div>

            @if (cfUploadStatus() === 'idle') {
              <div class="relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#0056D2]/40 bg-[#0056D2]/5 p-6 transition-colors hover:bg-[#0056D2]/10">
                <input type="file" accept="video/*" (change)="onVideoFileSelected($event)"
                       class="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                <div class="pointer-events-none text-center">
                  <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#0056D2]/10">
                    <lucide-icon name="upload-cloud" [size]="24" class="text-[#0056D2]"></lucide-icon>
                  </div>
                  <p class="text-sm font-semibold text-gray-800">Nhấn để chọn video</p>
                  <p class="mt-1 text-xs text-gray-500">MP4, MOV, WebM</p>
                </div>
              </div>
            }

            @if (cfUploadStatus() === 'staged') {
              <div class="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4">
                <lucide-icon name="clock-3" [size]="20" class="mt-0.5 shrink-0 text-sky-600"></lucide-icon>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold text-sky-900">Video đã chọn, sẽ tải lên khi lưu.</p>
                  @if (svc.selectedSectionVideoFile()?.name; as fileName) {
                    <p class="mt-1 truncate text-xs font-medium text-slate-600">{{ fileName }}</p>
                  }
                </div>
                <button type="button" (click)="resetVideoUpload()"
                  class="shrink-0 text-xs text-slate-500 underline hover:text-slate-700">Bỏ chọn</button>
              </div>
            }

            @if (cfUploadStatus() === 'done') {
              <div class="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <lucide-icon name="check-circle" [size]="20" class="mt-0.5 shrink-0 text-emerald-600"></lucide-icon>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold text-emerald-800">Video đã được gắn.</p>
                  <p class="mt-0.5 text-xs text-emerald-700">{{ getVideoProcessingCopy() }}</p>
                  @if (svc.sectionVideoAvailableOfflineProfiles().length) {
                    <p class="mt-2 text-xs text-emerald-700">
                      Chất lượng tải về:
                      @for (profile of svc.sectionVideoAvailableOfflineProfiles(); track $index) {
                        <span>{{ formatProfile(profile) }}@if (!$last) {, }</span>
                      }
                    </p>
                  }
                </div>
              </div>
            }
          </div>
        }

        <!-- ═══ FILE ═══ -->
        @if (svc.sectionEditorType() === 'FILE') {
          <div class="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-black uppercase text-amber-800">Tài liệu đính kèm</label>
              @if (svc.sectionFileUrl()) {
                <a [href]="svc.sectionFileUrl()" target="_blank"
                   class="flex items-center gap-1 text-xs font-bold text-[#0056D2] hover:underline">
                  <lucide-icon name="download" [size]="12"></lucide-icon> Tải xuống
                </a>
              }
            </div>

            <div class="relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-300 bg-white p-5 transition-colors hover:bg-amber-50">
              <input type="file" (change)="onFileSelected($event)"
                     class="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
              @if (!svc.selectedFile()) {
                <div class="pointer-events-none text-center">
                  <div class="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <lucide-icon name="upload-cloud" [size]="20"></lucide-icon>
                  </div>
                  <p class="text-sm font-bold text-slate-700">Nhấn để tải lên tài liệu</p>
                  <p class="mt-1 text-xs text-slate-400">PDF, Word, Excel, PowerPoint (Max 50MB)</p>
                </div>
              } @else {
                <div class="pointer-events-none flex w-full max-w-xs items-center gap-3 rounded-lg border border-amber-200 bg-amber-100 p-3">
                  <lucide-icon name="file" [size]="20" class="flex-shrink-0 text-amber-600"></lucide-icon>
                  <div class="min-w-0 flex-grow">
                    <p class="truncate text-xs font-bold text-slate-800">{{ svc.selectedFile()!.name }}</p>
                    <p class="text-[10px] text-slate-500">{{ (svc.selectedFile()!.size / 1024 / 1024).toFixed(2) }} MB</p>
                  </div>
                  <button type="button" (click)="$event.stopPropagation(); svc.selectedFile.set(null)"
                    class="pointer-events-auto rounded p-1 text-amber-700 hover:bg-amber-200">
                    <lucide-icon name="x" [size]="14"></lucide-icon>
                  </button>
                </div>
              }
            </div>

            @if (svc.safePdfUrl(); as pdfUrl) {
              <div class="mt-4">
                <label class="text-xs font-bold text-slate-600 mb-2 block">Xem trước PDF</label>
                <div class="h-[420px] w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-800 shadow-inner">
                  <iframe [src]="pdfUrl" class="h-full w-full" frameborder="0"></iframe>
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
  }

  toggleExpand(): void {
    this.isExpanded.update(v => !v);
  }

  readonly cfUploadStatus = computed<CfUploadStatus>(() => {
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
    return '';
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
}
