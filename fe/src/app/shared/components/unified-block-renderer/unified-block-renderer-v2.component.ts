import { Component, input, inject, signal, ViewEncapsulation, effect, OnDestroy, ChangeDetectionStrategy } from '@angular/core';

import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ContentBlock, TextBlock, FormulaBlock, ImageBlock } from '../../../api/types/content-block.types';
import { OfflineStorageService } from '../../../core/services/offline-storage.service';
import katex from 'katex';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-unified-block-renderer-v2',
    imports: [],
    template: `
    <div class="space-y-4">
      @for (block of renderedBlocks(); track block.id) {
        @switch (block.type) {
          @case ('text') {
            <div class="prose max-w-none text-gray-800"
                 [innerHTML]="getSafeHtml(block)">
            </div>
          }
          @case ('formula') {
            <div class="my-4 py-2 px-4 bg-gray-50 rounded-lg overflow-x-auto text-center"
                 [innerHTML]="renderMath(block)">
            </div>
          }
          @case ('image') {
            <div class="flex justify-center my-4">
                <div class="relative max-w-full">
                    <img [src]="getImageUrl(block)" 
                         [alt]="getCaption(block)"
                         class="rounded-lg shadow-sm"
                         [style.width.px]="getWidth(block)"
                         loading="lazy"
                         (error)="onImageError($event)">
                    @if (getCaption(block)) {
                      <p class="text-xs text-center text-gray-500 mt-2 italic">
                          {{ getCaption(block) }}
                      </p>
                    }
                    @if (isPending(block)) {
                      <div class="absolute top-2 right-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <span class="material-symbols-outlined text-[14px]">cloud_off</span> Pending
                      </div>
                    }
                </div>
            </div>
          }
        }
      }

      @if (isLoading()) {
        <div class="flex justify-center py-4">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0056D2]"></div>
        </div>
      }
    </div>
  `,
    styleUrls: [], // Uses global katex.min.css
    encapsulation: ViewEncapsulation.None // Needed for KaTeX styles to apply inside innerHTML
})
export class UnifiedBlockRendererV2Component implements OnDestroy {
    // Signal inputs - Angular v20+
    rawData = input<string | ContentBlock[]>([]);
    storageKey = input<string | undefined>(undefined); // Cache key for offline

    private sanitizer = inject(DomSanitizer);
    private offlineService = inject(OfflineStorageService);

    renderedBlocks = signal<ContentBlock[]>([]);
    isLoading = signal<boolean>(false);

    private worker: Worker | undefined;

    constructor() {
        // Initialize worker
        if (typeof Worker !== 'undefined') {
            const workerUrl = new URL('../../workers/content-parser.worker', import.meta.url);
            this.worker = new Worker(workerUrl);
            this.worker.onmessage = ({ data }: MessageEvent) => {
                this.renderedBlocks.set(data);
                this.isLoading.set(false);
                const key = this.storageKey();
                if (key) {
                    this.offlineService.saveBlocks(key, data);
                }
            };
        } else {
        }

        // Effect to handle rawData changes (replaces ngOnChanges)
        effect(() => {
            const data = this.rawData();
            if (data && this.worker) {
                this.isLoading.set(true);
                this.worker.postMessage(data);
            }
        });
    }

    ngOnDestroy(): void {
        this.worker?.terminate();
    }

    getSafeHtml(block: ContentBlock): SafeHtml {
        return this.sanitizer.bypassSecurityTrustHtml((block as TextBlock).content);
    }

    renderMath(block: ContentBlock): SafeHtml {
        const formula = (block as FormulaBlock).content;
        try {
            const html = katex.renderToString(formula, {
                throwOnError: false,
                displayMode: (block as FormulaBlock).format === 'display'
            });
            return this.sanitizer.bypassSecurityTrustHtml(html);
        } catch (e) {
            return this.sanitizer.bypassSecurityTrustHtml(`<span class="text-red-500">Error rendering formula</span>`);
        }
    }

    getImageUrl(block: ContentBlock): string {
        return (block as ImageBlock).url;
    }

    getCaption(block: ContentBlock): string {
        return (block as ImageBlock).caption || '';
    }

    getWidth(block: ContentBlock): number | undefined {
        return (block as ImageBlock).width;
    }

    isPending(block: ContentBlock): boolean {
        return (block as ImageBlock).localStatus === 'pending_download';
    }

    onImageError(event: any) {
        // Fallback logic for offline could go here
        event.target.src = 'assets/images/placeholder-image-off.png';
    }
}
