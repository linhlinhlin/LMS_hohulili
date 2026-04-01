import { Component, input, output, signal, viewChild, ElementRef, computed, effect, inject, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ContentIdentityService } from '../../../core/services/content-identity.service';
import { ImageLifecycleService } from '../../../core/services/image-lifecycle.service';
import { ContentBlock } from '../../../api/types/content-block.types';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MathQuickToolbarComponent } from '../math-quick-toolbar/math-quick-toolbar.component';
import { IconComponent } from '../icon/icon.component';
import { LucideAngularModule } from 'lucide-angular';
import katex from 'katex';

/**
 * SOTA 2025: Professional Enriched Input (Kahoot/Quizizz-inspired)
 * 
 * Features:
 * - Visual thumbnail chips instead of raw [IMG:uuid]
 * - Inline formula preview with KaTeX
 * - Drag-drop & paste image support
 * - Clean, professional UI
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-enriched-input',
    imports: [FormsModule, MathQuickToolbarComponent, IconComponent, LucideAngularModule],
    template: `
    <div class="relative w-full group">
      <!-- Math Toolbar (Visible when focused or has math) -->
      @if (isFocused() || isFormula()) {
        <div class="absolute bottom-full left-0 mb-1 z-40 animate-fade-in">
           <app-math-quick-toolbar (insertSymbol)="onInsertSymbol($event)"></app-math-quick-toolbar>
        </div>
      }

      <!-- Preview Layer (Rendered output) -->
      @if (hasRichContent() && isFocused()) {
        <div class="absolute bottom-full right-0 mb-2 p-3 bg-white rounded-lg shadow-xl border border-[#0056D2]/20 z-50 min-w-[200px] max-w-sm pointer-events-none">
           <div class="text-[10px] text-gray-400 mb-1 font-bold uppercase tracking-wider flex justify-between items-center">
             <span>Kết quả hiển thị</span>
             @if (isFormula()) {
               <span class="text-[#0056D2] bg-[#0056D2]/5 px-1.5 rounded font-mono">TeX</span>
             }
             @if (hasImage()) {
               <span class="text-green-600 bg-green-50 px-1.5 rounded"><app-icon name="image" size="sm"/></span>
             }
           </div>
           <div [innerHTML]="previewHtml()" class="prose prose-sm max-w-none text-gray-800"></div>
        </div>
      }

      <!-- Main Input Container -->
      <div class="relative border rounded-lg bg-white transition-all overflow-hidden"
           [class.border-gray-200]="!isInvalid() && !isFocused()"
           [class.border-[#0056D2]]="isFocused()"
           [class.ring-4]="isFocused()"
           [class.ring-[#0056D2]/5]="isFocused()"
           [class.border-red-500]="isInvalid()">
        
        <!-- Content Display Area (Chips + Text Input) -->
        <div class="flex flex-wrap items-center gap-1.5 p-1 min-h-[40px]">
          
          <!-- Image Chips (Optional, keeping for better UX with files) -->
          @for (img of imageChips(); track img.uuid; let i = $index) {
            <div class="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg group/chip hover:shadow-sm transition-all cursor-pointer"
                 (click)="expandImage(img)">
              <img [src]="img.url" 
                   class="w-6 h-6 rounded object-cover border border-white shadow-sm" 
                   [alt]="'Image ' + (i + 1)"
                   (error)="onImageError($event)">
              <span class="text-[10px] text-gray-500 font-black uppercase tracking-wider">Ảnh {{i + 1}}</span>
              <button type="button" 
                      (click)="removeImage(img.uuid); $event.stopPropagation()" 
                      class="w-4 h-4 flex items-center justify-center rounded-full bg-gray-200 text-gray-500 hover:bg-rose-500 hover:text-white opacity-0 group-hover/chip:opacity-100 transition-all text-[10px]"
                      title="Xóa ảnh">
                ×
              </button>
            </div>
          }

          <!-- Unified Rich Input -->
            <textarea
              #inputRef
              [attr.placeholder]="placeholder() || 'Nhập nội dung...'"
              [value]="rawValue()"
              (input)="onInput($event)"
              (paste)="onPaste($event)"
              (focus)="isFocused.set(true)"
              (blur)="onBlur()"
              (keydown)="onKeyDown($event)"
              rows="1"
              class="flex-1 w-full px-3 py-1.5 border-none focus:ring-0 focus:outline-none bg-transparent text-sm text-gray-900 font-medium placeholder-gray-400 resize-none min-h-[32px] overflow-hidden"
              style="line-height: 1.5;"
            ></textarea>
        </div>

        <!-- Action Buttons -->
        <div class="absolute right-1 bottom-1 flex items-center space-x-1 text-gray-400 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
           <button type="button" (click)="fileInput.click()" 
                   class="w-7 h-7 flex items-center justify-center hover:text-[#0056D2] rounded-lg hover:bg-[#0056D2]/5 transition-colors relative group/btn"
                   aria-label="Chèn ảnh vào đáp án"
                   title="Chèn ảnh">
             <lucide-icon name="image" size="16"></lucide-icon>
             <div class="hidden group-hover/btn:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] font-bold rounded-lg whitespace-nowrap z-50">Chèn ảnh</div>
           </button>
           
           <button type="button" (click)="insertMath()" 
                   class="w-7 h-7 flex items-center justify-center hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-colors relative group/btn"
                   aria-label="Chèn công thức vào đáp án"
                   title="Chèn công thức">
             <span class="font-serif italic font-bold text-base leading-none">Σ</span>
             <div class="hidden group-hover/btn:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] font-bold rounded-lg whitespace-nowrap z-50">Công thức</div>
           </button>
        </div>
      </div>

      <!-- Hidden File Input -->
      <input #fileInput type="file" class="hidden" accept="image/*" (change)="onFileSelected($event)">
      
      <!-- Processing Indicator (Overlay) -->
      @if (isProcessing()) {
        <div class="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
          <div class="flex items-center gap-2 text-[#0056D2]">
            <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="text-sm font-medium">Đang tải ảnh...</span>
          </div>
        </div>
      }

      <!-- Image Expand Modal -->
      @if (expandedImageUrl()) {
        <div class="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-8"
             (click)="closeExpandedImage()">
          <div class="relative max-w-4xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden animate-fade-in"
               (click)="$event.stopPropagation()">
            <!-- Modal Header -->
            <div class="border-b border-gray-200 px-4 py-2.5 flex justify-between items-center bg-white">
              <span class="text-gray-900 text-sm font-semibold">Xem ảnh</span>
              <button (click)="closeExpandedImage()"
                      class="text-gray-400 hover:text-gray-600 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <!-- Image -->
            <div class="p-4 bg-gray-100">
              <img [src]="expandedImageUrl()" 
                   class="max-w-full max-h-[70vh] mx-auto rounded-lg shadow-lg object-contain"
                   (error)="onImageError($event)">
            </div>
          </div>
        </div>
      }
    </div>
  `,
    styles: [`
    :host { display: block; }
    .animate-fade-in { animation: fadeIn 0.2s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class EnrichedInputFieldComponent {
    private identityService = inject(ContentIdentityService);
    private imageService = inject(ImageLifecycleService);
    private sanitizer = inject(DomSanitizer);

    // Signal inputs - Angular v20+
    placeholder = input<string>('');
    initialValue = input<string>('');
    isInvalid = input<boolean>(false);

    // Signal outputs - Angular v20+
    valueChange = output<string>();
    blocksChange = output<ContentBlock[]>();

    // Raw value contains the full hybrid string: "Text [IMG:uuid] $formula$"
    rawValue = signal('');
    isProcessing = signal(false);
    isFocused = signal(false);
    expandedImageUrl = signal<string | null>(null);

    // Computed: Extract image UUIDs and their URLs for chips
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

    // Computed: Extract formulas for chips
    formulaChips = computed(() => {
        const val = this.rawValue();
        const formulas: { content: string; isDisplay: boolean }[] = [];
        const regex = /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g;
        let match;
        while ((match = regex.exec(val)) !== null) {
            const isDisplay = match[1].startsWith('$$');
            const content = isDisplay ? match[1].slice(2, -2) : match[1].slice(1, -1);
            formulas.push({ content, isDisplay });
        }
        return formulas;
    });

    // Computed: Text-only value (without images and formulas) for text input
    textOnlyValue = computed(() => {
        let val = this.rawValue();
        // Remove image tags
        val = val.replace(/\[IMG:[^\]]+\]/g, '');
        // Remove formula tags
        val = val.replace(/\$\$[\s\S]*?\$\$|\$[\s\S]*?\$/g, '');
        return val.trim();
    });

    hasRichContent = computed(() => {
        const val = this.rawValue();
        return val.includes('[IMG:') || val.includes('[VID:') || val.includes('$') || val.includes('\\');
    });

    isFormula = computed(() => {
        const val = this.rawValue();
        return val.includes('$') || val.includes('\\');
    });

    hasImage = computed(() => {
        return this.rawValue().includes('[IMG:');
    });

    // Computed: Visual feedback parts for the backdrop layer
    highlightedParts = computed(() => {
        const val = this.rawValue();
        const parts: { text: string; type: 'text' | 'latex' | 'image' | 'video' }[] = [];
        const regex = /(\[IMG:[^\]]+\]|\[VID:[^\]]+\]|\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g;

        const splitParts = val.split(regex);
        splitParts.forEach(part => {
            if (!part) return;
            if (part.startsWith('[IMG:')) {
                parts.push({ text: part, type: 'image' });
            } else if (part.startsWith('[VID:')) {
                parts.push({ text: part, type: 'video' });
            } else if (part.startsWith('$')) {
                parts.push({ text: part, type: 'latex' });
            } else {
                parts.push({ text: part, type: 'text' });
            }
        });
        return parts;
    });

    inputRef = viewChild<ElementRef<HTMLTextAreaElement>>('inputRef');

    constructor() {
        effect(() => {
            const initVal = this.initialValue();
            if (initVal && this.rawValue() === '') {
                this.rawValue.set(initVal);
                setTimeout(() => this.adjustHeight());
            }
        });
    }

    onInput(event: Event) {
        const target = event.target as HTMLTextAreaElement;
        const newValue = target.value;

        this.rawValue.set(newValue);
        this.emitChanges();
        this.adjustHeight();
    }

    private adjustHeight() {
        const el = this.inputRef()?.nativeElement;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
    }

    onBlur() {
        this.isFocused.set(false);
        this.emitChanges();
    }

    onKeyDown(event: KeyboardEvent) {
        event.stopPropagation();
        
        const el = this.inputRef()?.nativeElement;
        if (!el) return;

        const val = el.value;
        const start = el.selectionStart ?? 0;
        const end = el.selectionEnd ?? 0;

        // --- Math Shortcuts (only active inside $...$ math context) ---
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
        }
        
        // --- Smart Tab Navigation ---
        else if (event.key === 'Tab') {
            if (this.handleSmartNavigation(event, val, start)) {
                event.preventDefault();
            }
        }
        
        // --- Exit Block with Space ---
        else if (event.key === ' ' && start === end && start > 0 && val[start - 1] === '}') {
            // Optional: Jump out of brace on space
            // event.preventDefault();
            // el.setSelectionRange(start + 1, start + 1);
        }
    }

    private insertAtCursor(text: string) {
        const el = this.inputRef()?.nativeElement;
        if (!el) return;

        const val = el.value;
        const start = el.selectionStart ?? 0;
        const end = el.selectionEnd ?? 0;

        // Smart wrap if needed
        let contentToInsert = text;
        const isInsideMath = this.isCursorInsideMath(val, start);
        if (!isInsideMath && !text.startsWith('$')) {
            contentToInsert = `$${text}$`;
        }

        const newValue = val.substring(0, start) + contentToInsert + val.substring(end);
        this.rawValue.set(newValue);
        this.emitChanges();

        // Position cursor at first placeholder
        setTimeout(() => {
            const placeholderMatch = contentToInsert.match(/[a-zà-ỹA-ZÀ-Ỹ\s]{2,}/u);
            const inputEl = this.inputRef()?.nativeElement;
            if (!inputEl) return;

            if (placeholderMatch) {
                const p = placeholderMatch[0];
                const pStart = start + contentToInsert.indexOf(p);
                inputEl.setSelectionRange(pStart, pStart + p.length);
            } else {
                const newPos = start + contentToInsert.length;
                inputEl.setSelectionRange(newPos, newPos);
            }
            this.adjustHeight();
        });
    }

    private isCursorInsideMath(val: string, pos: number): boolean {
        const before = val.substring(0, pos);
        const after = val.substring(pos);
        const dollarCountBefore = (before.match(/\$/g) || []).length;
        // Simple parity check: if odd number of $ before, we are likely inside
        return dollarCountBefore % 2 !== 0;
    }

    private handleSmartNavigation(e: KeyboardEvent, value: string, pos: number): boolean {
        const el = this.inputRef()?.nativeElement;
        if (!el) return false;

        const isShift = e.shiftKey;
        
        // Pattern: placeholder inside braces
        const placeholderRegex = /\{([a-zà-ỹA-ZÀ-Ỹ\s]{2,})\}/gu;
        let match;
        const matches: { start: number; end: number }[] = [];

        while ((match = placeholderRegex.exec(value)) !== null) {
            matches.push({
                start: match.index + 1,
                end: match.index + 1 + match[1].length
            });
        }

        if (isShift) {
            // Jump Back
            for (let i = matches.length - 1; i >= 0; i--) {
                if (matches[i].end < pos) {
                    el.setSelectionRange(matches[i].start, matches[i].end);
                    return true;
                }
            }
        } else {
            // Jump Forward
            for (let i = 0; i < matches.length; i++) {
                if (matches[i].start > pos) {
                    el.setSelectionRange(matches[i].start, matches[i].end);
                    return true;
                }
            }
            
            // No more placeholders, find next closing brace to jump out
            const nextBrace = value.indexOf('}', pos);
            if (nextBrace !== -1) {
                el.setSelectionRange(nextBrace + 1, nextBrace + 1);
                return true;
            }
        }

        return false;
    }

    removeImage(uuid: string) {
        const val = this.rawValue();
        const newVal = val.replace(`[IMG:${uuid}]`, '').replace(/\s+/g, ' ').trim();
        this.rawValue.set(newVal);
        this.emitChanges();
    }

    expandImage(img: { uuid: string; url: string }) {
        this.expandedImageUrl.set(img.url);
    }

    closeExpandedImage() {
        this.expandedImageUrl.set(null);
    }

    removeFormula(index: number) {
        const formulas = this.formulaChips();
        if (index >= 0 && index < formulas.length) {
            const formulaToRemove = formulas[index];
            const fullFormula = formulaToRemove.isDisplay
                ? `$$${formulaToRemove.content}$$`
                : `$${formulaToRemove.content}$`;
            const val = this.rawValue();
            const newVal = val.replace(fullFormula, '').replace(/\s+/g, ' ').trim();
            this.rawValue.set(newVal);
            this.emitChanges();
        }
    }

    onImageError(event: Event) {
        const img = event.target as HTMLImageElement;
        img.src = '/icons/icon-192x192.png';
    }

    renderFormulaPreview(latex: string): SafeHtml {
        try {
            const html = katex.renderToString(latex, { throwOnError: false });
            return this.sanitizer.bypassSecurityTrustHtml(html);
        } catch {
            return latex;
        }
    }

    previewHtml(): SafeHtml {
        let text = this.rawValue();

        // Parse Images: [IMG:uuid] -> <img src="...">
        text = text.replace(/\[IMG:([^\]]+)\]/g, (match, idOrUrl) => {
            const url = this.identityService.resolveUrl(idOrUrl);
            return `<img src="${url}" class="h-12 w-auto object-cover rounded border border-gray-200 inline-block align-middle mx-1" />`;
        });

        // Parse Videos: [VID:url] -> video icon chip
        text = text.replace(/\[VID:([^\]]+)\]/g, () => {
            return `<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 align-middle mx-1">&#9654; Video</span>`;
        });

        // Parse Math using KaTeX
        try {
            text = text.replace(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g, (match) => {
                const isDisplay = match.startsWith('$$');
                const cleanTex = isDisplay ? match.slice(2, -2) : match.slice(1, -1);
                return katex.renderToString(cleanTex, {
                    throwOnError: false,
                    displayMode: isDisplay
                });
            });
        } catch (e) {
        }

        return this.sanitizer.bypassSecurityTrustHtml(text);
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

    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            this.uploadAndInsert(input.files[0]);
        }
        input.value = '';
    }

    insertMath() {
        const current = this.rawValue();
        const newValue = current + ' $x^2$ ';
        this.rawValue.set(newValue);
        this.emitChanges();

        // Focus input after adding
        setTimeout(() => {
            this.inputRef()?.nativeElement?.focus();
        });
    }

    onInsertSymbol(symbol: string) {
        this.insertAtCursor(symbol);
    }

    private uploadAndInsert(file: File) {
        this.isProcessing.set(true);
        this.imageService.uploadTemp(file).subscribe({
            next: (result) => {
                const current = this.rawValue();
                const tag = `[IMG:${result.uuid}]`;
                const newValue = current + ' ' + tag + ' ';
                this.rawValue.set(newValue);
                this.isProcessing.set(false);
                this.emitChanges();
            },
            error: () => {
                this.isProcessing.set(false);
            }
        });
    }

    private emitChanges() {
        const val = this.rawValue();
        this.valueChange.emit(val);

        const blocks: ContentBlock[] = [];
        const regex = /(\[IMG:[^\]]+\]|\[VID:[^\]]+\]|\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g;
        const parts = val.split(regex);

        parts.forEach(part => {
            if (!part) return;

            if (part.startsWith('[IMG:') && part.endsWith(']')) {
                const uuid = part.slice(5, -1);
                const resolvedUrl = this.identityService.resolveUrl(uuid);
                blocks.push({
                    id: crypto.randomUUID(),
                    type: 'image',
                    url: resolvedUrl || uuid
                });
            } else if (part.startsWith('[VID:') && part.endsWith(']')) {
                const url = part.slice(5, -1);
                blocks.push({
                    id: crypto.randomUUID(),
                    type: 'video',
                    url: url
                });
            } else if (part.startsWith('$')) {
                const isDisplay = part.startsWith('$$');
                blocks.push({
                    id: crypto.randomUUID(),
                    type: 'formula',
                    content: isDisplay ? part.slice(2, -2) : part.slice(1, -1),
                    format: isDisplay ? 'display' : 'inline'
                });
            } else {
                blocks.push({
                    id: crypto.randomUUID(),
                    type: 'text',
                    content: part
                });
            }
        });

        const validBlocks = blocks.filter(b => {
            if (b.type === 'text') {
                return b.content && b.content.trim().length > 0;
            }
            return true;
        });

        this.blocksChange.emit(validBlocks);
    }
}
