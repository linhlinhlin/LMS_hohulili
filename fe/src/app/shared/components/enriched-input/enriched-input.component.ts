import { Component, input, output, signal, viewChild, ElementRef, computed, effect, inject, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ContentIdentityService } from '../../../core/services/content-identity.service';
import { ImageLifecycleService } from '../../../core/services/image-lifecycle.service';
import { ContentBlock } from '../../../api/types/content-block.types';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MathQuickToolbarComponent } from '../math-quick-toolbar/math-quick-toolbar.component';
import { LucideAngularModule } from 'lucide-angular';
import katex from 'katex';

/**
 * SOTA 2026: Professional Enriched Input (Quizizz/Kahoot pattern)
 *
 * Design principles (based on industry SOTA research):
 * - Clean text input by default — NO persistent toolbars
 * - Small icon buttons (image, f(x)) at edge of field, visible on hover/focus
 * - Math toolbar opens as popover on Σ click ONLY (Quizizz pattern)
 * - Rendered preview when not focused (display mode)
 * - Raw textarea when focused (edit mode)
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-enriched-input',
    imports: [FormsModule, MathQuickToolbarComponent, LucideAngularModule],
    template: `
    <div class="relative w-full group/enriched">

      <!-- Math Symbol Popover (on-demand, Quizizz pattern) -->
      @if (showMathPopover()) {
        <div class="absolute bottom-full left-0 mb-1 z-40 animate-fade-in"
             (mousedown)="$event.preventDefault()">
           <app-math-quick-toolbar (insertSymbol)="onInsertSymbol($event)"></app-math-quick-toolbar>
        </div>
      }

      <!-- DISPLAY MODE: rendered preview (when NOT focused AND has content) -->
      @if (!isFocused() && rawValue()) {
        <div class="min-h-[36px] px-3 py-1.5 text-sm text-gray-900 font-medium leading-relaxed cursor-text rounded-lg border border-transparent hover:border-gray-200 transition-colors"
             (click)="focusInput()">
          @if (hasRichContent()) {
            <div [innerHTML]="previewHtml()" class="enriched-display"></div>
          } @else {
            <span>{{ rawValue() }}</span>
          }
        </div>
      }

      <!-- EDIT MODE: textarea + action buttons (when focused OR empty) -->
      @if (isFocused() || !rawValue()) {
        <div class="relative border rounded-lg bg-white transition-all overflow-hidden"
             [class.border-[#0056D2]]="isFocused()"
             [class.ring-2]="isFocused()"
             [class.ring-[#0056D2]/10]="isFocused()"
             [class.border-gray-200]="!isFocused()"
             [class.border-red-500]="isInvalid()">

          <!-- Image Thumbnails (SOTA: 128px container, hover overlay — Google Forms/FlexiQuiz pattern) -->
          @if (imageChips().length > 0) {
            <div class="flex items-center gap-2 overflow-x-auto border-b border-gray-100 p-2">
              <span class="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                {{ imageChips().length }} ảnh
              </span>
              @for (img of visibleImageChips(); track img.uuid; let i = $index) {
                <div class="relative group/img h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                  <img [src]="img.url"
                       class="block h-full w-full object-cover"
                       [alt]="'Ảnh ' + (i + 1)"
                       (error)="onImageError($event)"
                       (click)="expandImage(img)">
                  <!-- Hover overlay (replace + delete) -->
                  <div class="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2"
                       (mousedown)="$event.preventDefault()">
                    <button type="button"
                            (click)="replaceImage(img.uuid); $event.stopPropagation()"
                            class="w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-gray-600 hover:text-[#0056D2] transition-colors shadow-sm"
                            title="Thay ảnh">
                      <lucide-icon name="refresh-cw" [size]="14"></lucide-icon>
                    </button>
                    <button type="button"
                            (click)="removeImage(img.uuid); $event.stopPropagation()"
                            class="w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-gray-600 hover:text-rose-500 transition-colors shadow-sm"
                            title="Xóa ảnh">
                      <lucide-icon name="trash-2" [size]="14"></lucide-icon>
                    </button>
                  </div>
                  <div class="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/50 rounded text-[9px] text-white font-medium pointer-events-none">
                    Ảnh {{i + 1}}
                  </div>
                </div>
              }
              @if (hiddenImageCount() > 0) {
                <button type="button"
                        (click)="openImageGallery(); $event.stopPropagation()"
                        class="h-14 w-16 shrink-0 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs font-semibold text-slate-600 transition-colors hover:border-[#0056D2] hover:bg-[#0056D2]/5 hover:text-[#0056D2]"
                        [attr.aria-label]="'Xem tất cả ' + imageChips().length + ' ảnh'">
                  +{{ hiddenImageCount() }}
                </button>
              }
              <button type="button"
                      (click)="openImageGallery(); $event.stopPropagation()"
                      class="ml-auto shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold text-[#0056D2] hover:bg-[#0056D2]/5">
                Quản lý
              </button>
            </div>
          }

          <!-- Textarea + Action buttons -->
          <div class="relative">
            <div class="flex items-center p-1 min-h-[36px]">
              <textarea
                #inputRef
                [attr.placeholder]="placeholder() || 'Nhập nội dung...'"
                [value]="rawValue()"
                (input)="onInput($event)"
                (paste)="onPaste($event)"
                (focus)="onFocus()"
                (blur)="onBlur()"
                (keydown)="onKeyDown($event)"
                rows="1"
                class="flex-1 w-full px-2 py-1 pr-14 border-none focus:ring-0 focus:outline-none bg-transparent placeholder-gray-400 resize-none min-h-[28px] overflow-hidden"
                [class.text-xs]="hasRichContent()"
                [class.text-gray-500]="hasRichContent()"
                [class.font-mono]="hasRichContent()"
                [class.text-sm]="!hasRichContent()"
                [class.text-gray-900]="!hasRichContent()"
                [class.font-medium]="!hasRichContent()"
                style="line-height: 1.5;"
              ></textarea>
            </div>

            <!-- Action Icons (Quizizz pattern: small icons at right edge) -->
            <div class="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 pointer-events-none group-hover/enriched:opacity-100 group-hover/enriched:pointer-events-auto transition-opacity"
                 [class.opacity-100]="isFocused()"
                 [class.pointer-events-auto]="isFocused()"
                 (mousedown)="$event.preventDefault()">
               <button type="button" (click)="addImage(); $event.stopPropagation()"
                       class="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-[#0056D2] rounded hover:bg-[#0056D2]/5 transition-colors"
                       title="Chèn ảnh" aria-label="Chèn ảnh">
                 <lucide-icon name="image" [size]="14"></lucide-icon>
               </button>
               <button type="button" (click)="toggleMathPopover(); $event.stopPropagation()"
                       class="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-amber-600 rounded hover:bg-amber-50 transition-colors"
                       [class.text-amber-600]="showMathPopover()"
                       [class.bg-amber-50]="showMathPopover()"
                       title="Chèn công thức" aria-label="Chèn công thức">
                 <span class="font-serif italic font-bold text-xs leading-none">f(x)</span>
               </button>
            </div>
          </div>

          <!-- Live Preview Strip (Khan Academy / MathBlockTool pattern) -->
          @if (hasRichContent()) {
            <div class="px-3 py-1.5 border-t border-gray-100 bg-gradient-to-r from-sky-50/80 to-blue-50/50 flex items-center gap-2 min-h-[32px]">
              <span class="text-[10px] text-gray-400 font-medium uppercase tracking-wide shrink-0">Xem trước</span>
              <div [innerHTML]="previewHtml()" class="enriched-preview text-sm text-gray-800 leading-relaxed flex-1"></div>
            </div>
          }
        </div>
      }

      <!-- Hidden File Input -->
      <input #fileInput type="file" class="hidden" accept="image/*" multiple (change)="onFileSelected($event)">

      <!-- Processing Overlay -->
      @if (isProcessing()) {
        <div class="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg z-10">
          <div class="flex items-center gap-2 text-[#0056D2]">
            <div class="h-4 w-4 animate-spin rounded-full border-2 border-[#0056D2] border-t-transparent"></div>
            <span class="text-xs font-medium">Đang tải...</span>
          </div>
        </div>
      }

      <!-- Image Expand Modal -->
      @if (expandedImageUrl()) {
        <div class="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-8"
             (click)="closeExpandedImage()">
          <div class="relative max-w-4xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden animate-fade-in"
               (click)="$event.stopPropagation()">
            <div class="border-b border-gray-200 px-4 py-2.5 flex justify-between items-center">
              <span class="text-gray-900 text-sm font-semibold">Xem ảnh</span>
              <button (click)="closeExpandedImage()"
                      class="text-gray-400 hover:text-gray-600 transition-colors w-6 h-6 flex items-center justify-center">
                <lucide-icon name="x" size="16"></lucide-icon>
              </button>
            </div>
            <div class="p-4 bg-gray-100">
              <img [src]="expandedImageUrl()"
                   class="max-w-full max-h-[70vh] mx-auto rounded-lg shadow-lg object-contain"
                   (error)="onImageError($event)">
            </div>
          </div>
        </div>
      }

      @if (imageGalleryOpen()) {
        <div class="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-6"
             role="dialog"
             aria-modal="true"
             aria-label="Quản lý ảnh"
             (click)="closeImageGallery()">
          <div class="w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl"
               (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <div>
                <p class="text-sm font-semibold text-slate-900">Quản lý ảnh</p>
                <p class="text-xs text-slate-500">{{ imageChips().length }} ảnh trong nội dung này</p>
              </div>
              <button type="button"
                      (click)="closeImageGallery()"
                      class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Đóng">
                <lucide-icon name="x" [size]="16"></lucide-icon>
              </button>
            </div>
            <div class="grid max-h-[70vh] grid-cols-2 gap-3 overflow-y-auto bg-slate-50 p-4 sm:grid-cols-3 lg:grid-cols-4">
              @for (img of imageChips(); track img.uuid; let i = $index) {
                <figure class="group/img overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <button type="button"
                          class="block w-full bg-slate-50"
                          (click)="expandImage(img)"
                          [attr.aria-label]="'Xem ảnh ' + (i + 1)">
                    <img [src]="img.url"
                         class="h-36 w-full object-contain p-2"
                         [alt]="'Ảnh ' + (i + 1)"
                         (error)="onImageError($event)">
                  </button>
                  <figcaption class="flex items-center justify-between gap-2 border-t border-slate-100 px-2 py-2">
                    <span class="text-xs font-semibold text-slate-500">Ảnh {{ i + 1 }}</span>
                    <div class="flex items-center gap-1">
                      <button type="button"
                              (click)="replaceImage(img.uuid)"
                              class="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-[#0056D2]/5 hover:text-[#0056D2]"
                              aria-label="Thay ảnh">
                        <lucide-icon name="refresh-cw" [size]="13"></lucide-icon>
                      </button>
                      <button type="button"
                              (click)="removeImage(img.uuid)"
                              class="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                              aria-label="Xóa ảnh">
                        <lucide-icon name="trash-2" [size]="13"></lucide-icon>
                      </button>
                    </div>
                  </figcaption>
                </figure>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
    styles: [`
    :host { display: block; }
    .animate-fade-in { animation: fadeIn 0.15s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    /* Display mode: larger images (80px) for rendered preview */
    .enriched-display { word-break: break-word; }
    .enriched-display img { display: inline-block; max-height: 3.5rem; width: auto; border-radius: 0.375rem; vertical-align: middle; margin: 0.25rem 0.125rem; border: 1px solid #e5e7eb; object-fit: contain; background: #f9fafb; padding: 2px; }
    .enriched-display .katex { font-size: 0.9em; }
    /* Live preview strip: small inline images */
    .enriched-preview { word-break: break-word; max-height: 3.25rem; overflow: hidden; }
    .enriched-preview img { display: inline-block; height: 1.5rem; width: auto; border-radius: 0.25rem; vertical-align: middle; margin: 0 0.125rem; border: 1px solid #e5e7eb; object-fit: contain; }
    .enriched-preview .katex { font-size: 0.9em; }
  `]
})
export class EnrichedInputFieldComponent {
    private identityService = inject(ContentIdentityService);
    private imageService = inject(ImageLifecycleService);
    private sanitizer = inject(DomSanitizer);

    // Signal inputs
    placeholder = input<string>('');
    initialValue = input<string>('');
    isInvalid = input<boolean>(false);
    mediaPreviewMode = input<'compact' | 'expanded'>('compact');
    mediaPreviewLimit = input<number>(4);

    // Signal outputs
    valueChange = output<string>();
    blocksChange = output<ContentBlock[]>();
    enterOnEmpty = output<void>();

    // State
    rawValue = signal('');
    isProcessing = signal(false);
    isFocused = signal(false);
    showMathPopover = signal(false);
    expandedImageUrl = signal<string | null>(null);
    imageGalleryOpen = signal(false);
    replacingUuid = signal<string | null>(null);
    private pendingUploads = 0;

    // Track whether initialValue has been applied (prevents re-application)
    private initialValueApplied = false;

    // Computed: image chips from raw value
    imageChips = computed(() => {
        const val = this.rawValue();
        const images: { uuid: string; url: string }[] = [];
        const regex = /\[IMG:([^\]]+)\]/g;
        let match;
        while ((match = regex.exec(val)) !== null) {
            const uuid = match[1];
            const url = this.identityService.resolveUrl(uuid);
            images.push({ uuid, url });
        }
        return images;
    });
    visibleImageChips = computed(() => {
        const chips = this.imageChips();
        if (this.mediaPreviewMode() === 'expanded') {
            return chips;
        }
        return chips.slice(0, this.normalizedMediaPreviewLimit());
    });
    hiddenImageCount = computed(() => Math.max(0, this.imageChips().length - this.visibleImageChips().length));

    hasRichContent = computed(() => {
        const val = this.rawValue();
        return val.includes('[IMG:') || val.includes('[VID:') || val.includes('$') || val.includes('\\');
    });

    isFormula = computed(() => {
        const val = this.rawValue();
        return val.includes('$') || val.includes('\\');
    });

    inputRef = viewChild<ElementRef<HTMLTextAreaElement>>('inputRef');
    fileInputRef = viewChild<ElementRef<HTMLInputElement>>('fileInput');

    constructor() {
        // Apply initialValue once when it arrives
        effect(() => {
            const initVal = this.initialValue();
            if (initVal && !this.initialValueApplied) {
                this.initialValueApplied = true;
                this.rawValue.set(initVal);
                setTimeout(() => this.adjustHeight());
            }
        });
    }

    // --- Public API ---

    focus(): void {
        this.focusInput();
    }

    focusInput(): void {
        this.isFocused.set(true);
        setTimeout(() => {
            const el = this.inputRef()?.nativeElement;
            if (el) {
                el.focus();
                this.adjustHeight();
            }
        });
    }

    // --- Event Handlers ---

    onFocus(): void {
        this.isFocused.set(true);
    }

    onBlur(): void {
        // Delay to allow popover mousedown→preventDefault to keep focus.
        // If focus has truly left (activeElement !== our textarea), close everything.
        setTimeout(() => {
            const textarea = this.inputRef()?.nativeElement;
            if (textarea && document.activeElement === textarea) {
                return; // Popover prevented blur — stay in edit mode
            }
            this.showMathPopover.set(false);
            this.isFocused.set(false);
        }, 150);
        this.emitChanges();
    }

    onInput(event: Event) {
        const target = event.target as HTMLTextAreaElement;
        this.rawValue.set(target.value);
        this.emitChanges();
        this.adjustHeight();
    }

    onKeyDown(event: KeyboardEvent) {
        event.stopPropagation();

        const el = this.inputRef()?.nativeElement;
        if (!el) return;

        // Enter on empty → add new option
        if (event.key === 'Enter' && !event.shiftKey && !el.value.trim()) {
            event.preventDefault();
            this.enterOnEmpty.emit();
            return;
        }

        // Escape → close math popover or blur
        if (event.key === 'Escape') {
            if (this.showMathPopover()) {
                this.showMathPopover.set(false);
            } else {
                el.blur();
            }
            return;
        }

        const val = el.value;
        const start = el.selectionStart ?? 0;

        // Math shortcuts inside $...$
        const insideMath = this.isCursorInsideMath(val, start);
        if (insideMath && event.key === '/') {
            event.preventDefault();
            this.insertAtCursor('\\frac{tử số}{mẫu số}');
        } else if (insideMath && event.key === '^') {
            event.preventDefault();
            this.insertAtCursor('^{số mũ}');
        } else if (insideMath && event.key === '_') {
            event.preventDefault();
            this.insertAtCursor('_{chỉ số}');
        } else if (event.key === 'Tab') {
            if (this.handleSmartNavigation(event, val, start)) {
                event.preventDefault();
            }
        }
    }

    // --- Math Popover ---

    toggleMathPopover(): void {
        const next = !this.showMathPopover();
        this.showMathPopover.set(next);
        if (next) {
            this.focusInput();
        }
    }

    onInsertSymbol(symbol: string) {
        this.insertAtCursor(symbol);
    }

    insertMath() {
        this.focusInput();
        setTimeout(() => this.insertAtCursor('x^2'));
    }

    // --- Image ---

    addImage(): void {
        this.replacingUuid.set(null);
        this.fileInputRef()?.nativeElement.click();
    }

    replaceImage(uuid: string): void {
        this.replacingUuid.set(uuid);
        this.fileInputRef()?.nativeElement.click();
    }

    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        const files = Array.from(input.files ?? []);
        if (files.length > 0) {
            if (this.replacingUuid()) {
                this.uploadAndInsert(files[0]);
            } else {
                files.forEach(file => this.uploadAndInsert(file));
            }
        }
        input.value = '';
    }

    async onPaste(event: ClipboardEvent) {
        const items = event.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                event.preventDefault();
                const file = items[i].getAsFile();
                if (file) this.uploadAndInsert(file);
                break;
            }
        }
    }

    removeImage(uuid: string) {
        const val = this.rawValue();
        this.rawValue.set(val.replace(`[IMG:${uuid}]`, '').replace(/\s+/g, ' ').trim());
        this.emitChanges();
    }

    expandImage(img: { uuid: string; url: string }) {
        this.imageGalleryOpen.set(false);
        this.expandedImageUrl.set(img.url);
    }

    closeExpandedImage() {
        this.expandedImageUrl.set(null);
    }

    openImageGallery() {
        this.imageGalleryOpen.set(true);
    }

    closeImageGallery() {
        this.imageGalleryOpen.set(false);
    }

    onImageError(event: Event) {
        (event.target as HTMLImageElement).src = '/icons/icon-192x192.png';
    }

    // --- Rendering ---

    previewHtml(): SafeHtml {
        let text = this.rawValue();
        let renderedImages = 0;
        const maxInlineImages = this.mediaPreviewMode() === 'compact'
            ? Math.min(2, this.normalizedMediaPreviewLimit())
            : Number.POSITIVE_INFINITY;

        // Images → inline thumbnail
        text = text.replace(/\[IMG:([^\]]+)\]/g, (_match, idOrUrl) => {
            renderedImages += 1;
            if (renderedImages > maxInlineImages) {
                if (renderedImages === maxInlineImages + 1) {
                    const hidden = Math.max(1, this.imageChips().length - maxInlineImages);
                    return `<span class="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 align-middle">+${hidden} ảnh</span>`;
                }
                return '';
            }
            const url = this.identityService.resolveUrl(idOrUrl);
            return `<img src="${url}" />`;
        });

        // Videos → badge
        text = text.replace(/\[VID:([^\]]+)\]/g, () => {
            return `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 border border-blue-200 rounded text-[10px] text-blue-700 align-middle mx-0.5">&#9654; Video</span>`;
        });

        // Math → KaTeX
        try {
            text = text.replace(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g, (match) => {
                const isDisplay = match.startsWith('$$');
                const cleanTex = isDisplay ? match.slice(2, -2) : match.slice(1, -1);
                return katex.renderToString(cleanTex, {
                    throwOnError: false,
                    displayMode: isDisplay
                });
            });
        } catch { /* ignore render errors */ }

        return this.sanitizer.bypassSecurityTrustHtml(text);
    }

    // --- Internal ---

    private normalizedMediaPreviewLimit(): number {
        const limit = Number(this.mediaPreviewLimit());
        if (!Number.isFinite(limit)) {
            return 4;
        }
        return Math.max(1, Math.round(limit));
    }

    private adjustHeight() {
        const el = this.inputRef()?.nativeElement;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
    }

    private insertAtCursor(text: string) {
        const el = this.inputRef()?.nativeElement;
        if (!el) return;

        const val = el.value;
        const start = el.selectionStart ?? 0;
        const end = el.selectionEnd ?? 0;

        let toInsert = text;
        if (!this.isCursorInsideMath(val, start) && !text.startsWith('$')) {
            toInsert = `$${text}$`;
        }

        const newValue = val.substring(0, start) + toInsert + val.substring(end);
        this.rawValue.set(newValue);
        this.emitChanges();

        setTimeout(() => {
            const inputEl = this.inputRef()?.nativeElement;
            if (!inputEl) return;
            // Select first Vietnamese placeholder
            const m = toInsert.match(/[a-zà-ỹA-ZÀ-Ỹ\s]{2,}/u);
            if (m) {
                const pStart = start + toInsert.indexOf(m[0]);
                inputEl.setSelectionRange(pStart, pStart + m[0].length);
            } else {
                const pos = start + toInsert.length;
                inputEl.setSelectionRange(pos, pos);
            }
            this.adjustHeight();
        });
    }

    private isCursorInsideMath(val: string, pos: number): boolean {
        const before = val.substring(0, pos);
        return (before.match(/\$/g) || []).length % 2 !== 0;
    }

    private handleSmartNavigation(e: KeyboardEvent, value: string, pos: number): boolean {
        const el = this.inputRef()?.nativeElement;
        if (!el) return false;

        const placeholderRegex = /\{([a-zà-ỹA-ZÀ-Ỹ\s]{2,})\}/gu;
        let match;
        const matches: { start: number; end: number }[] = [];
        while ((match = placeholderRegex.exec(value)) !== null) {
            matches.push({ start: match.index + 1, end: match.index + 1 + match[1].length });
        }

        if (e.shiftKey) {
            for (let i = matches.length - 1; i >= 0; i--) {
                if (matches[i].end < pos) {
                    el.setSelectionRange(matches[i].start, matches[i].end);
                    return true;
                }
            }
        } else {
            for (const m of matches) {
                if (m.start > pos) {
                    el.setSelectionRange(m.start, m.end);
                    return true;
                }
            }
            const nextBrace = value.indexOf('}', pos);
            if (nextBrace !== -1) {
                el.setSelectionRange(nextBrace + 1, nextBrace + 1);
                return true;
            }
        }
        return false;
    }

    private uploadAndInsert(file: File) {
        const replacing = this.replacingUuid();
        this.replacingUuid.set(null);
        this.beginUpload();
        this.imageService.uploadTemp(file).subscribe({
            next: (result) => {
                if (replacing) {
                    // Replace existing image
                    const val = this.rawValue();
                    this.rawValue.set(val.replace(`[IMG:${replacing}]`, `[IMG:${result.uuid}]`));
                } else {
                    // Append new image
                    const tag = `[IMG:${result.uuid}]`;
                    this.rawValue.set(this.rawValue() + ' ' + tag + ' ');
                }
                this.finishUpload();
                this.emitChanges();
            },
            error: () => {
                this.replacingUuid.set(null);
                this.finishUpload();
            }
        });
    }

    private beginUpload(): void {
        this.pendingUploads += 1;
        this.isProcessing.set(true);
    }

    private finishUpload(): void {
        this.pendingUploads = Math.max(0, this.pendingUploads - 1);
        this.isProcessing.set(this.pendingUploads > 0);
    }

    private emitChanges() {
        const val = this.rawValue();
        this.valueChange.emit(val);

        const blocks: ContentBlock[] = [];
        const regex = /(\[IMG:[^\]]+\]|\[VID:[^\]]+\]|\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g;
        val.split(regex).forEach(part => {
            if (!part) return;
            if (part.startsWith('[IMG:') && part.endsWith(']')) {
                const uuid = part.slice(5, -1);
                blocks.push({ id: crypto.randomUUID(), type: 'image', url: this.identityService.resolveUrl(uuid) || uuid });
            } else if (part.startsWith('[VID:') && part.endsWith(']')) {
                blocks.push({ id: crypto.randomUUID(), type: 'video', url: part.slice(5, -1) });
            } else if (part.startsWith('$')) {
                const isDisplay = part.startsWith('$$');
                blocks.push({ id: crypto.randomUUID(), type: 'formula', content: isDisplay ? part.slice(2, -2) : part.slice(1, -1), format: isDisplay ? 'display' : 'inline' });
            } else if (part.trim()) {
                blocks.push({ id: crypto.randomUUID(), type: 'text', content: part });
            }
        });

        this.blocksChange.emit(blocks);
    }
}
