import { Component, input, output, signal, viewChild, ElementRef, computed, effect, inject, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ContentIdentityService } from '../../../core/services/content-identity.service';
import { ImageLifecycleService } from '../../../core/services/image-lifecycle.service';
import { ContentBlock } from '../../../api/types/content-block.types';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MathQuickToolbarComponent } from '../math-quick-toolbar/math-quick-toolbar.component';
import { IconComponent } from '../icon/icon.component';
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
    imports: [FormsModule, MathQuickToolbarComponent, IconComponent],
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
           [class.border-gray-300]="!isInvalid() && !isFocused()"
           [class.border-[#0056D2]]="isFocused()"
           [class.ring-2]="isFocused()"
           [class.ring-[#0056D2]/10]="isFocused()"
           [class.border-red-500]="isInvalid()">
        
        <!-- Content Display Area (Chips + Text Input) -->
        <div class="flex flex-wrap items-center gap-1.5 p-2 min-h-[44px]">
          
          <!-- Image Chips (Click to expand) -->
          @for (img of imageChips(); track img.uuid; let i = $index) {
            <div class="inline-flex items-center gap-1 px-2 py-1 bg-[#0056D2]/5 border border-[#0056D2]/20 rounded-lg group/chip hover:shadow-md transition-all cursor-pointer"
                 (click)="expandImage(img)">
              <!-- Image Thumbnail -->
              <img [src]="img.url" 
                   class="w-6 h-6 rounded object-cover border border-white shadow-sm" 
                   [alt]="'Image ' + (i + 1)"
                   (error)="onImageError($event)">
              <!-- Image Icon SVG -->
              <svg class="w-4 h-4 text-[#0056D2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <span class="text-xs text-[#004BB5] font-medium">Ảnh {{i + 1}}</span>
              <button type="button" 
                      (click)="removeImage(img.uuid); $event.stopPropagation()" 
                      class="w-4 h-4 flex items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-500 hover:text-white opacity-0 group-hover/chip:opacity-100 transition-all text-[10px]"
                      title="Xóa ảnh">
                ×
              </button>
            </div>
          }

          <!-- Formula Chips -->
          @for (formula of formulaChips(); track $index; let i = $index) {
            <div class="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full group/chip">
              <span class="text-amber-700 font-serif italic">Σ</span>
              <span [innerHTML]="renderFormulaPreview(formula.content)" class="text-xs max-w-[100px] overflow-hidden"></span>
              <button type="button" 
                      (click)="removeFormula(i)" 
                      class="w-4 h-4 flex items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-500 hover:text-white opacity-0 group-hover/chip:opacity-100 transition-all text-[10px]">
                ×
              </button>
            </div>
          }

          <!-- Text Input (for remaining text) -->
          <input
            #inputRef
            type="text"
            [attr.placeholder]="imageChips().length === 0 && formulaChips().length === 0 ? placeholder() : 'Thêm nội dung...'"
            [value]="textOnlyValue()"
            (input)="onTextInput($event)"
            (paste)="onPaste($event)"
            (focus)="isFocused.set(true)"
            (blur)="onBlur()"
            (keydown)="onKeyDown($event)"
            class="flex-1 min-w-[120px] px-2 py-1 border-none focus:ring-0 focus:outline-none bg-transparent text-sm text-gray-900 placeholder-gray-400"
          />
        </div>

        <!-- Action Buttons (Right aligned, inside border) -->
        <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1 text-gray-400">
           <!-- Image Upload Button -->
           <button type="button" (click)="fileInput.click()" 
                   class="p-1.5 hover:text-[#0056D2] rounded-md hover:bg-[#0056D2]/5 transition-colors relative group/btn"
                   [class.text-[#0056D2]]="hasImage()"
                   [class.bg-[#0056D2]/5]="hasImage()">
             <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
             <div class="hidden group-hover/btn:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-[10px] rounded whitespace-nowrap z-50">Chèn ảnh</div>
           </button>
           
           <!-- Math Toggle Button -->
           <button type="button" (click)="insertMath()" 
                   class="p-1.5 hover:text-[#0056D2] rounded-md hover:bg-[#0056D2]/5 transition-colors relative group/btn"
                   [class.text-amber-600]="isFormula()"
                   [class.bg-amber-50]="isFormula()">
             <span class="font-serif italic font-bold text-lg leading-none">Σ</span>
             <div class="hidden group-hover/btn:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-[10px] rounded whitespace-nowrap z-50">Công thức</div>
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
            <div class="bg-gray-800 px-4 py-2 flex justify-between items-center">
              <span class="text-white text-sm font-medium">Xem ảnh</span>
              <button (click)="closeExpandedImage()" 
                      class="text-white hover:text-red-400 transition-colors">
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
        const regex = /\[IMG:([a-zA-Z0-9-]+)\]/g;
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
        val = val.replace(/\[IMG:[a-zA-Z0-9-]+\]/g, '');
        // Remove formula tags
        val = val.replace(/\$\$[\s\S]*?\$\$|\$[\s\S]*?\$/g, '');
        return val.trim();
    });

    hasRichContent = computed(() => {
        const val = this.rawValue();
        return val.includes('[IMG:') || val.includes('$') || val.includes('\\');
    });

    isFormula = computed(() => {
        const val = this.rawValue();
        return val.includes('$') || val.includes('\\');
    });

    hasImage = computed(() => {
        return this.rawValue().includes('[IMG:');
    });

    inputRef = viewChild<ElementRef<HTMLInputElement>>('inputRef');

    constructor() {
        effect(() => {
            const initVal = this.initialValue();
            if (initVal && this.rawValue() === '') {
                this.rawValue.set(initVal);
            }
        }, { allowSignalWrites: true });
    }

    onTextInput(event: Event) {
        const target = event.target as HTMLInputElement;
        const newText = target.value;

        // Rebuild the full value: [images] + [formulas] + text
        const images = this.imageChips().map(img => `[IMG:${img.uuid}]`).join(' ');
        const formulas = this.formulaChips().map(f => f.isDisplay ? `$$${f.content}$$` : `$${f.content}$`).join(' ');

        const parts = [images, formulas, newText].filter(p => p.trim()).join(' ');
        this.rawValue.set(parts);
        this.emitChanges();
    }

    onBlur() {
        setTimeout(() => this.isFocused.set(false), 200);
        this.emitChanges();
    }

    onKeyDown(event: KeyboardEvent) {
        event.stopPropagation();
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
        img.src = 'assets/placeholder.png';
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
        text = text.replace(/\[IMG:([a-zA-Z0-9-]+)\]/g, (match, uuid) => {
            const url = this.identityService.resolveUrl(uuid);
            return `<img src="${url}" class="h-12 w-auto object-cover rounded border border-gray-200 inline-block align-middle mx-1" />`;
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
        let contentToInsert = symbol;
        const current = this.rawValue();

        // Smart wrap: if valid TeX command and no $ in text, wrap in $...$
        if (symbol.startsWith('\\') && !current.includes('$')) {
            contentToInsert = `$${symbol}$`;
        }

        const newValue = current + ' ' + contentToInsert + ' ';
        this.rawValue.set(newValue);
        this.emitChanges();
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
        const regex = /(\[IMG:[a-zA-Z0-9-]+\]|\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g;
        const parts = val.split(regex);

        parts.forEach(part => {
            if (!part) return;

            if (part.startsWith('[IMG:') && part.endsWith(']')) {
                const uuid = part.slice(5, -1);
                blocks.push({
                    id: crypto.randomUUID(),
                    type: 'image',
                    url: uuid
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

