import { Component, Input, Output, EventEmitter, signal, ViewChildren, QueryList, ElementRef, AfterViewChecked, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContentBlock } from '../../../api/types/content-block.types';
import { UnifiedBlockRendererV2Component } from '../unified-block-renderer/unified-block-renderer-v2.component';
import { ImageLifecycleService } from '../../../core/services/image-lifecycle.service';
import { ContentIdentityService } from '../../../core/services/content-identity.service';

@Component({
    selector: 'app-block-editor',
    standalone: true,
    imports: [CommonModule, FormsModule, UnifiedBlockRendererV2Component],
    template: `
    <div class="space-y-1 block-editor-container">
       <!-- Block List -->
       <div *ngFor="let block of blocks(); let i = index; trackBy: trackByBlockId" class="group relative flex items-start -ml-8 pl-8">
          
          <!-- Hover Handle / Actions (Left Gutter) -->
          <div class="absolute left-0 top-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center pr-2 cursor-grab active:cursor-grabbing select-none"
               title="Drag to move (Coming soon)">
             <div class="p-1 hover:bg-gray-100 rounded text-gray-400">
               <!-- Material Icon: drag_indicator -->
               <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
             </div>
             <!-- Delete Button -->
             <button type="button" class="ml-1 p-1 hover:bg-red-50 hover:text-red-500 rounded text-gray-400" (click)="removeBlock(i)" title="Delete Block">
               <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
             </button>
          </div>

          <!-- Content Area -->
          <div class="flex-1 min-w-0 relative">
              
              <!-- Text / Formula Block (Editable Textarea) -->
              <div *ngIf="block.type === 'text' || block.type === 'formula'">
                  <textarea
                    #editorInput
                    [value]="getBlockContent(block)"
                    (input)="updateBlockContent(i, $event)"
                    (keydown)="onKeyDown($event, i)"
                    (focus)="activateBlock(i)"
                    rows="1"
                    class="w-full border-none focus:ring-0 p-1 text-base resize-none bg-transparent overflow-hidden leading-relaxed placeholder-gray-300 transition-all font-sans"
                    [class.font-mono]="block.type === 'formula'"
                    [class.bg-gray-50]="block.type === 'formula'"
                    [placeholder]="i === 0 && blocks().length === 1 ? 'Start writing or type / for commands...' : 'Type / for commands...'"
                    style="min-height: 1.5em;"
                    oninput="this.style.height = ''; this.style.height = this.scrollHeight + 'px'"
                  ></textarea>
                  <!-- Quick Formula Hint -->
                  <div *ngIf="block.type === 'formula'" class="text-xs text-blue-500 mt-1 pl-1 font-mono">
                     Supports LaTeX (e.g., $E=mc^2$)
                  </div>
              </div>

               <!-- Image Block -->
                <!-- Image Block -->
              <div *ngIf="block.type === 'image'" class="my-3 select-none">
                 
                 <!-- Empty State: Upload/Embed UI -->
                 <div *ngIf="!block['url']" class="rounded-xl bg-gray-50 border border-gray-200 p-1 animate-fade-in shadow-sm max-w-xl">
                    
                    <!-- Tabs -->
                    <div class="flex items-center gap-1 p-1 mb-1 border-b border-gray-200/50">
                        <button (click)="setBlockTab(block.id, 'upload')" 
                                class="flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all"
                                [class.bg-white]="getBlockState(block.id).tab === 'upload'"
                                [class.shadow-sm]="getBlockState(block.id).tab === 'upload'"
                                [class.text-blue-600]="getBlockState(block.id).tab === 'upload'"
                                [class.text-gray-500]="getBlockState(block.id).tab !== 'upload'">
                            Upload
                        </button>
                        <button (click)="setBlockTab(block.id, 'embed')" 
                                class="flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all"
                                [class.bg-white]="getBlockState(block.id).tab === 'embed'"
                                [class.shadow-sm]="getBlockState(block.id).tab === 'embed'"
                                [class.text-blue-600]="getBlockState(block.id).tab === 'embed'"
                                [class.text-gray-500]="getBlockState(block.id).tab !== 'embed'">
                            Embed Link
                        </button>
                    </div>

                    <!-- Upload Tab -->
                    <div *ngIf="getBlockState(block.id).tab === 'upload'" class="p-3">
                        <div class="bg-white border-2 border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center hover:bg-blue-50 hover:border-blue-200 transition-colors cursor-pointer group/upload"
                             (click)="fileInput.click()">
                            <div class="w-10 h-10 rounded-full bg-blue-50 text-blue-500 mb-3 flex items-center justify-center group-hover/upload:scale-110 transition-transform">
                                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            </div>
                            <span class="text-sm font-medium text-gray-700 mb-1">Click to upload image</span>
                            <span class="text-xs text-gray-400">SVG, PNG, JPG or GIF (max. 5MB)</span>
                        </div>
                        <input #fileInput type="file" class="hidden" accept="image/*" (change)="handleImageUpload($event, i)">
                    </div>

                    <!-- Embed Tab -->
                    <div *ngIf="getBlockState(block.id).tab === 'embed'" class="p-3">
                        <div class="flex gap-2">
                            <input type="text" 
                                   [value]="getBlockState(block.id).embedUrl"
                                   (input)="updateEmbedUrl(block.id, $event)"
                                   (keydown.enter)="confirmEmbed(i, block.id)"
                                   placeholder="Paste link to an image..."
                                   class="flex-1 text-sm border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 bg-white shadow-sm">
                            <button (click)="confirmEmbed(i, block.id)"
                                    class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-colors whitespace-nowrap">
                                Embed Image
                            </button>
                        </div>
                        <p class="text-[10px] text-gray-400 mt-2 ml-1">Works with any public image URL.</p>
                    </div>

                 </div>

                 <!-- Filled State: Image Display -->
                 <div *ngIf="block['url']" class="relative group/image inline-block">
                     <img [src]="resolveUrl(block['url'])" 
                          class="max-h-96 rounded-lg shadow-sm border border-gray-100 bg-white">
                     
                     <div class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/image:opacity-100 transition-opacity">
                        <button type="button" class="p-1.5 bg-white/90 backdrop-blur shadow-sm rounded-md hover:text-blue-600 text-gray-600 border border-gray-200" title="Replace" (click)="resetImage(i)">
                           <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                     </div>
                 </div>

                 <input *ngIf="block['url']"
                    type="text" 
                    class="block w-full text-sm text-gray-400 border-none bg-transparent focus:ring-0 mt-1 italic placeholder-gray-300 text-center" 
                    [value]="block['caption'] || ''"
                    (input)="updateBlockCaption(i, $event)"
                    placeholder="Write a caption..."
                 >
              </div>

          </div>
       </div>

       <!-- Slash Command Menu -->
       <div *ngIf="showSlashMenu()" 
            class="fixed bg-white shadow-xl rounded-lg border border-gray-100 overflow-hidden z-[9999] w-64 text-gray-800 animate-in fade-in zoom-in duration-100"
            [style.top.px]="slashMenuCoords.y"
            [style.left.px]="slashMenuCoords.x">
          <div class="px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
            Basic Blocks
          </div>
          <div class="py-1 max-h-60 overflow-y-auto">
            <button type="button" (click)="convertBlockType('text')" class="flex items-center w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors gap-3">
               <div class="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded shadow-sm text-gray-500">
                  <span class="text-lg font-serif">T</span>
               </div>
               <div class="flex flex-col">
                  <span class="text-sm font-medium text-gray-900">Text</span>
                  <span class="text-xs text-gray-400">Just start writing with plain text.</span>
               </div>
            </button>
            <button type="button" (click)="convertBlockType('image')" class="flex items-center w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors gap-3">
               <div class="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded shadow-sm text-gray-500">
                 <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
               </div>
               <div class="flex flex-col">
                  <span class="text-sm font-medium text-gray-900">Image</span>
                  <span class="text-xs text-gray-400">Upload or embed an image.</span>
               </div>
            </button>
            <button type="button" (click)="convertBlockType('formula')" class="flex items-center w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors gap-3">
               <div class="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded shadow-sm text-gray-500">
                  <span class="font-serif italic font-bold">Σ</span>
               </div>
               <div class="flex flex-col">
                  <span class="text-sm font-medium text-gray-900">Math Formula</span>
                  <span class="text-xs text-gray-400">Insert math equations (KaTeX).</span>
               </div>
            </button>
          </div>
       </div>

       <!-- Empty State (if absolutely no blocks, though usually we start with 1) -->
       <div *ngIf="blocks().length === 0" class="py-2 text-gray-300 cursor-text italic" (click)="addBlockType('text')">
          Type '/' for commands...
       </div>
    </div>
  `,
    styles: [`
    :host { display: block; }
    textarea { outline: none; box-shadow: none; }
    /* Hide scrollbar for cleaner look if needed */
    textarea::-webkit-scrollbar { display: none; }
    .animate-fade-in { animation: fadeIn 0.15s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(2px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class BlockEditorComponent implements AfterViewChecked {
    blocks = signal<ContentBlock[]>([]);

    // Services
    private imageService = inject(ImageLifecycleService);
    private identityService = inject(ContentIdentityService);

    // UI State for Image Blocks
    blockStates: Record<string, { tab: 'upload' | 'embed', embedUrl: string }> = {};

    @Input() set initialBlocks(val: ContentBlock[]) {
        if (val && val.length > 0) {
            this.blocks.set(val);
        } else {
            // Ensure at least one empty block exists
            if (this.blocks().length === 0) {
                this.addBlockType('text');
            }
        }
    }

    @Output() blocksChange = new EventEmitter<ContentBlock[]>();

    @ViewChildren('editorInput') inputs!: QueryList<ElementRef<HTMLTextAreaElement>>;

    activeBlockIndex = signal<number | null>(null);
    showSlashMenu = signal(false);
    slashMenuCoords = { x: 0, y: 0 };
    pendingFocusIndex: number | null = null;
    pendingCursorPos: 'start' | 'end' | null = null;

    ngAfterViewChecked() {
        if (this.pendingFocusIndex !== null) {
            const inputs = this.inputs.toArray();
            if (inputs[this.pendingFocusIndex]) {
                const el = inputs[this.pendingFocusIndex].nativeElement;
                el.focus();

                // Cursor positioning
                if (this.pendingCursorPos === 'end') {
                    el.setSelectionRange(el.value.length, el.value.length);
                } else if (this.pendingCursorPos === 'start') {
                    el.setSelectionRange(0, 0);
                }

                // Auto-resize immediately
                el.style.height = 'auto';
                el.style.height = el.scrollHeight + 'px';
            }
            this.pendingFocusIndex = null;
            this.pendingCursorPos = null;
        }
    }

    setBlocks(blocks: ContentBlock[]) {
        this.blocks.set(blocks.length > 0 ? blocks : []);
        if (this.blocks().length === 0) this.addBlockType('text');
    }

    activateBlock(index: number) {
        this.activeBlockIndex.set(index);
    }

    getBlockContent(block: ContentBlock): string {
        return (block as any).content || '';
    }

    updateBlockContent(index: number, event: Event) {
        const val = (event.target as HTMLTextAreaElement).value;
        const target = event.target as HTMLElement;

        // Check for Slash Command
        if (val === '/') {
            // Only trigger if strictly equal for now, or maybe check last char
            this.openSlashMenu(target);
        } else {
            if (this.showSlashMenu()) this.showSlashMenu.set(false);
        }

        // Auto-expand
        target.style.height = 'auto';
        target.style.height = target.scrollHeight + 'px';

        this.updateBlock(index, { content: val });
    }

    updateBlockCaption(index: number, event: Event) {
        const val = (event.target as HTMLInputElement).value;
        this.updateBlock(index, { caption: val });
    }

    updateBlock(index: number, changes: Partial<ContentBlock>) {
        const current = this.blocks();
        const updated = [...current];
        updated[index] = { ...updated[index], ...changes } as any;
        this.blocks.set(updated);
        this.blocksChange.emit(updated);
    }

    /**
     * Notion-like Key Handling
     */
    onKeyDown(event: KeyboardEvent, index: number) {
        if (this.showSlashMenu()) {
            if (event.key === 'Escape') {
                this.showSlashMenu.set(false);
                event.preventDefault();
            }
            return;
        }

        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.addBlockType('text', index + 1);
        }
        else if (event.key === 'Backspace') {
            const currentBlock = this.blocks()[index];
            const content = (currentBlock as any).content || '';
            const el = event.target as HTMLTextAreaElement;

            // Delete if box is empty OR at start
            if (el.selectionStart === 0 && el.selectionEnd === 0) {
                if (index > 0) {
                    event.preventDefault();
                    this.mergeBlockWithPrevious(index);
                } else {
                    // Start of first block? Do nothing unless we want to remove formatting (todo)
                }
            }
        }
        else if (event.key === 'ArrowUp') {
            const el = event.target as HTMLTextAreaElement;
            // Only move up if at first line? 
            // Simplified: if index > 0
            if (index > 0) {
                // Check if cursor is on first line is hard in textarea. 
                // Just moving up for any arrow up is annoying while editing.
                // Let's stick to standard behavior unless at start.
                if (el.selectionStart === 0) {
                    event.preventDefault();
                    this.pendingFocusIndex = index - 1;
                    this.pendingCursorPos = 'end';
                    this.ngAfterViewChecked();
                }
            }
        }
        else if (event.key === 'ArrowDown') {
            const el = event.target as HTMLTextAreaElement;
            if (index < this.blocks().length - 1) {
                if (el.selectionStart === el.value.length) {
                    event.preventDefault();
                    this.pendingFocusIndex = index + 1;
                    this.pendingCursorPos = 'start';
                    this.ngAfterViewChecked();
                }
            }
        }
    }

    mergeBlockWithPrevious(index: number) {
        const current = this.blocks();
        const prevIndex = index - 1;
        const prevBlock = current[prevIndex];
        const currBlock = current[index];

        // Logic: Merge text
        if (prevBlock.type === 'text' && currBlock.type === 'text') {
            const prevContent = (prevBlock as any).content || '';
            const currContent = (currBlock as any).content || '';

            // Update previous block
            this.updateBlock(prevIndex, { content: prevContent + currContent });

            // Remove current
            this.removeBlock(index);

            // Focus previous at the merge point
            this.pendingFocusIndex = prevIndex;
            // We can't easily set cursor to middle index here without more logic, 
            // but 'end' of previous content is close enough
            // (Ideally we calculate length of prevContent before merge)
            this.pendingCursorPos = 'end';
        } else {
            // Just focus previous if types incompatible 
            this.removeBlock(index);
            this.pendingFocusIndex = prevIndex;
            this.pendingCursorPos = 'end';
        }
    }

    removeBlock(index: number) {
        const updated = this.blocks().filter((_, i) => i !== index);
        this.blocks.set(updated);
        this.blocksChange.emit(updated);

        // Ensure one block
        if (updated.length === 0) {
            this.addBlockType('text');
        }
    }

    addBlockType(type: 'text' | 'image' | 'formula', index?: number) {
        const newBlock: ContentBlock = {
            id: crypto.randomUUID(),
            type: type as any,
            content: ''
        };

        if (type === 'image') {
            (newBlock as any).url = ''; // Pending upload
        }

        const current = this.blocks();
        const output = [...current];
        const insertAt = index !== undefined ? index : current.length;

        output.splice(insertAt, 0, newBlock);

        this.blocks.set(output);
        this.blocksChange.emit(output);
        this.showSlashMenu.set(false);

        // Focus new block
        this.pendingFocusIndex = insertAt;
        this.pendingCursorPos = 'start';
    }

    convertBlockType(type: 'text' | 'image' | 'formula') {
        const index = this.activeBlockIndex();
        if (index === null) return;

        this.updateBlock(index, { type: type as any });
        this.showSlashMenu.set(false);
        // Re-focus
        this.pendingFocusIndex = index;
    }

    openSlashMenu(target: HTMLElement) {
        const rect = target.getBoundingClientRect();
        this.slashMenuCoords = {
            x: rect.left,
            y: rect.bottom + 5
        };
        this.showSlashMenu.set(true);
    }

    handleImageUpload(event: Event, index: number) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        // Optimistic update or loading state?
        // Ideally we show a spinner. For now, simple standard upload.

        this.imageService.uploadTemp(file).subscribe({
            next: (res) => {
                this.updateBlock(index, { url: res.uuid }); // Save UUID
            },
            error: (err) => {
                console.error('Block Image Upload failed', err);
                alert('Upload failed. Please try again.');
            }
        });

        input.value = ''; // Reset input
    }

    // --- Block UI State Handling ---

    getBlockState(blockId: string) {
        if (!this.blockStates[blockId]) {
            this.blockStates[blockId] = { tab: 'upload', embedUrl: '' };
        }
        return this.blockStates[blockId];
    }

    setBlockTab(blockId: string, tab: 'upload' | 'embed') {
        if (!this.blockStates[blockId]) {
            this.blockStates[blockId] = { tab: tab, embedUrl: '' };
        } else {
            this.blockStates[blockId].tab = tab;
        }
    }

    updateEmbedUrl(blockId: string, event: Event) {
        const val = (event.target as HTMLInputElement).value;
        const state = this.getBlockState(blockId);
        state.embedUrl = val;
    }

    confirmEmbed(index: number, blockId: string) {
        const state = this.getBlockState(blockId);
        if (state.embedUrl) {
            this.updateBlock(index, { url: state.embedUrl });
            // Reset state
            state.embedUrl = '';
            state.tab = 'upload';
        }
    }

    resolveUrl(url: string | undefined): string {
        if (!url) return '';
        if (url.startsWith('http')) return url; // External link
        return this.identityService.resolveUrl(url); // Internal UUID
    }

    resetImage(index: number) {
        this.updateBlock(index, { url: '' });
    }

    trackByBlockId(index: number, block: ContentBlock): string {
        return block.id;
    }
}
