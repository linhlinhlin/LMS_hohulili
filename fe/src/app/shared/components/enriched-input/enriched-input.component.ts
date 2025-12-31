import { Component, Input, Output, EventEmitter, signal, ViewChild, ElementRef, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContentIdentityService } from '../../../core/services/content-identity.service';
import { ImageLifecycleService } from '../../../core/services/image-lifecycle.service';
import { ContentBlock } from '../../../api/types/content-block.types';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MathQuickToolbarComponent } from '../math-quick-toolbar/math-quick-toolbar.component';
import katex from 'katex';

@Component({
    selector: 'app-enriched-input',
    standalone: true,
    imports: [CommonModule, FormsModule, MathQuickToolbarComponent],
    template: `
    <div class="relative w-full group">
      <!-- Toolbar (Visible when focused or has math) -->
      <div *ngIf="isFocused() || isFormula()" class="absolute bottom-full left-0 mb-1 z-40 animate-fade-in">
         <app-math-quick-toolbar (insertSymbol)="onInsertSymbol($event)"></app-math-quick-toolbar>
      </div>

      <!-- Preview Layer (Tooltip style above input - Rendered Math) -->
      <div *ngIf="hasRichContent()" 
           class="absolute bottom-full right-0 mb-2 p-3 bg-white rounded-lg shadow-xl border border-blue-200 z-50 min-w-[200px] max-w-sm pointer-events-none">
         <div class="text-[10px] text-gray-400 mb-1 font-bold uppercase tracking-wider flex justify-between items-center">
           <span>Kết quả hiển thị</span>
           <span *ngIf="isFormula()" class="text-blue-600 bg-blue-50 px-1.5 rounded font-mono">TeX</span>
         </div>
         <div [innerHTML]="previewHtml()" class="prose prose-sm max-w-none text-gray-800"></div>
      </div>

      <!-- Input Field -->
      <div class="relative flex items-center border rounded-md bg-white transition-all"
           [class.border-gray-300]="!isInvalid && !isFocused()"
           [class.border-blue-500]="isFocused()"
           [class.ring-2]="isFocused()"
           [class.ring-blue-100]="isFocused()"
           [class.border-red-500]="isInvalid">
        
        <!-- Text Input -->
        <input
          #inputRef
          type="text"
          [attr.placeholder]="placeholder"
          [value]="rawValue()"
          (input)="onInput($event)"
          (paste)="onPaste($event)"
          (focus)="isFocused.set(true)"
          (blur)="onBlur()"
          (keydown)="onKeyDown($event)"
          class="w-full px-3 py-2.5 border-none focus:ring-0 bg-transparent rounded-md text-sm text-gray-900 placeholder-gray-400"
        />

        <!-- Actions (Right aligned) -->
        <div class="flex items-center px-2 space-x-1 text-gray-400 border-l border-gray-100 pl-2 ml-1">
           <!-- Image Upload Button -->
           <button type="button" (click)="fileInput.click()" class="p-1.5 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors relative group/btn">
             <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
             <div class="hidden group-hover/btn:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-[10px] rounded whitespace-nowrap">Chèn ảnh</div>
           </button>
           
           <!-- Math Toggle Button (Manual trigger if needed) -->
           <button type="button" (click)="insertMath()" class="p-1.5 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors relative group/btn">
             <span class="font-serif italic font-bold text-lg leading-none">Σ</span>
             <div class="hidden group-hover/btn:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-[10px] rounded whitespace-nowrap">Công thức</div>
           </button>
        </div>
      </div>

      <!-- Hidden File Input -->
      <input #fileInput type="file" class="hidden" accept="image/*" (change)="onFileSelected($event)">
      
      <!-- Processing Indicator -->
      <div *ngIf="isProcessing()" class="absolute right-12 top-2.5 bg-white px-2">
        <svg class="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    </div>
  `,
    styles: [`
    :host { display: block; }
    .animate-fade-in { animation: fadeIn 0.2s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class EnrichedInputFieldComponent {
    @Input() placeholder = '';
    @Input() initialValue = '';
    @Input() isInvalid = false;

    @Output() valueChange = new EventEmitter<string>();
    @Output() blocksChange = new EventEmitter<ContentBlock[]>();

    rawValue = signal('');
    isProcessing = signal(false);
    isFocused = signal(false);

    hasRichContent = computed(() => {
        const val = this.rawValue();
        return val.includes('[IMG:') || val.includes('$') || val.includes('\\');
    });

    isFormula = computed(() => {
        const val = this.rawValue();
        return val.includes('$') || val.includes('\\');
    });

    @ViewChild('inputRef') inputRef!: ElementRef<HTMLInputElement>;

    constructor(
        private identityService: ContentIdentityService,
        private imageService: ImageLifecycleService,
        private sanitizer: DomSanitizer
    ) {
        effect(() => {
            if (this.initialValue && this.rawValue() === '') {
                this.rawValue.set(this.initialValue);
            }
        }, { allowSignalWrites: true });
    }

    onInput(event: Event) {
        const target = event.target as HTMLInputElement;
        this.rawValue.set(target.value);
        this.emitChanges();
    }

    onBlur() {
        setTimeout(() => this.isFocused.set(false), 200);
        this.emitChanges();
    }

    onKeyDown(event: KeyboardEvent) {
        event.stopPropagation();
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
            console.warn('Math render error', e);
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
        this.insertAtCursor('$x^2$');
    }

    /**
     * SOTA 2025: Smart symbol insertion with placeholder selection
     * - Wraps in $ if needed
     * - Selects first Vietnamese placeholder for easy replacement
     */
    onInsertSymbol(symbol: string) {
        let contentToInsert = symbol;
        const current = this.rawValue();

        // Smart wrap: if valid TeX command and no $ in text, wrap in $...$
        if (symbol.startsWith('\\') && !current.includes('$')) {
            contentToInsert = `$${symbol}$`;
        }

        this.insertAtCursorWithSelection(contentToInsert);
    }

    private insertAtCursor(text: string) {
        const input = this.inputRef.nativeElement;
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;

        const current = this.rawValue();
        const before = current.substring(0, start);
        const after = current.substring(end);

        const newValue = before + text + after;
        this.rawValue.set(newValue);

        setTimeout(() => {
            input.focus();
            input.setSelectionRange(start + text.length, start + text.length);
        });

        this.emitChanges();
    }

    /**
     * SOTA 2025: Insert text and auto-select first placeholder
     * Placeholders are Vietnamese text like "tử số", "mẫu số", "bậc", "biểu thức"
     */
    private insertAtCursorWithSelection(text: string) {
        const input = this.inputRef.nativeElement;
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;

        const current = this.rawValue();
        const before = current.substring(0, start);
        const after = current.substring(end);

        const newValue = before + text + after;
        this.rawValue.set(newValue);

        // Update input value immediately
        input.value = newValue;

        setTimeout(() => {
            input.focus();
            
            // Find first Vietnamese placeholder to select
            const placeholderRegex = /[a-zà-ỹA-ZÀ-Ỹ\s]{2,}/u;
            const match = text.match(placeholderRegex);
            
            if (match) {
                const placeholder = match[0];
                const placeholderStart = start + text.indexOf(placeholder);
                const placeholderEnd = placeholderStart + placeholder.length;
                input.setSelectionRange(placeholderStart, placeholderEnd);
            } else {
                // If no placeholder, find first {} and place cursor inside
                const braceIndex = text.indexOf('{}');
                if (braceIndex !== -1) {
                    const cursorPos = start + braceIndex + 1;
                    input.setSelectionRange(cursorPos, cursorPos);
                } else {
                    input.setSelectionRange(start + text.length, start + text.length);
                }
            }
        }, 0);

        this.emitChanges();
    }

    private uploadAndInsert(file: File) {
        this.isProcessing.set(true);
        this.imageService.uploadTemp(file).subscribe({
            next: (result) => {
                const tag = `[IMG:${result.uuid}]`;
                this.insertAtCursor(' ' + tag + ' ');
                this.isProcessing.set(false);
            },
            error: (err) => {
                console.error('Upload failed', err);
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
