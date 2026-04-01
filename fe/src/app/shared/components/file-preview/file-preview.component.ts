import { Component, input, signal, inject, effect, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl, SafeHtml } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { PdfViewerService } from '../../services/pdf-viewer.service';

/**
 * Shared FilePreviewComponent — detects file type and renders inline preview.
 *
 * Supported: PDF (iframe via PdfViewerService), DOCX (mammoth.js → HTML),
 * Images (native <img> with zoom), fallback download card.
 *
 * Usage: <app-file-preview [fileUrl]="url" [fileName]="name" />
 */
@Component({
  selector: 'app-file-preview',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (fileType()) {
      <!-- PDF Preview -->
      @case ('pdf') {
        <div class="w-full rounded-xl border border-gray-200 overflow-hidden bg-white">
          @if (pdfUrl()) {
            <iframe [src]="pdfUrl()" class="w-full h-[600px]" frameborder="0"></iframe>
          } @else {
            <div class="h-[600px] flex items-center justify-center">
              <div class="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#0056D2] border-t-transparent"></div>
            </div>
          }
        </div>
      }

      <!-- DOCX Preview -->
      @case ('docx') {
        <div class="w-full rounded-xl border border-gray-200 overflow-hidden bg-white">
          @if (docxLoading()) {
            <div class="h-[400px] flex items-center justify-center">
              <div class="text-center">
                <div class="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#0056D2] border-t-transparent"></div>
                <p class="text-xs text-gray-500 mt-3">Đang chuyển đổi tài liệu...</p>
              </div>
            </div>
          } @else if (docxHtml()) {
            <div class="p-6 prose prose-sm prose-slate max-w-none overflow-y-auto max-h-[600px]" [innerHTML]="docxHtml()"></div>
          } @else if (docxError()) {
            <div class="p-8 text-center">
              <p class="text-sm text-red-600">{{ docxError() }}</p>
              <a [href]="fileUrl()" target="_blank" download
                 class="inline-flex items-center gap-2 mt-3 text-sm font-medium text-[#0056D2] hover:underline">
                Tải về để xem
              </a>
            </div>
          }
        </div>
      }

      <!-- Image Preview -->
      @case ('image') {
        <div class="w-full rounded-xl border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center p-4">
          <img [src]="fileUrl()" [alt]="fileName()"
               (click)="imageZoomed.set(!imageZoomed())"
               class="max-w-full rounded-lg shadow-sm transition-all cursor-zoom-in"
               [class.max-h-[500px]]="!imageZoomed()"
               [class.max-h-none]="imageZoomed()" />
        </div>
      }

      <!-- Fallback: Download Card -->
      @default {
        <a [href]="fileUrl()" target="_blank" download
           class="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-[#0056D2] hover:shadow-md transition-all group">
          <div class="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#0056D2]/5 group-hover:text-[#0056D2] transition-colors">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/>
            </svg>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-gray-900 truncate group-hover:text-[#0056D2] transition-colors">{{ fileName() }}</p>
            <p class="text-xs text-gray-500">{{ getExtension() | uppercase }} — Nhấn để tải về</p>
          </div>
          <svg class="w-5 h-5 text-gray-300 group-hover:text-[#0056D2] flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"/>
          </svg>
        </a>
      }
    }
  `
})
export class FilePreviewComponent implements OnDestroy {
  fileUrl = input.required<string>();
  fileName = input<string>('');

  private sanitizer = inject(DomSanitizer);
  private http = inject(HttpClient);
  private pdfViewer = inject(PdfViewerService);

  fileType = signal<'pdf' | 'docx' | 'image' | 'other'>('other');
  pdfUrl = signal<SafeResourceUrl | null>(null);
  docxHtml = signal<SafeHtml | null>(null);
  docxLoading = signal(false);
  docxError = signal<string | null>(null);
  imageZoomed = signal(false);

  constructor() {
    effect(() => {
      const url = this.fileUrl();
      const name = this.fileName() || url;
      const ext = this.detectExtension(name, url);

      const normalizedUrl = this.normalizeUrl(url);
      if (ext === 'pdf') {
        this.fileType.set('pdf');
        this.loadPdf(normalizedUrl);
      } else if (ext === 'docx' || ext === 'doc') {
        this.fileType.set('docx');
        this.loadDocx(normalizedUrl);
      } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
        this.fileType.set('image');
      } else {
        this.fileType.set('other');
      }
    });
  }

  ngOnDestroy(): void {
    this.pdfViewer.cleanup();
  }

  getExtension(): string {
    return this.detectExtension(this.fileName(), this.fileUrl());
  }

  private detectExtension(name: string, url: string): string {
    const source = name || url || '';
    const clean = source.split('?')[0].split('#')[0];
    const ext = clean.split('.').pop()?.toLowerCase() || '';
    return ext;
  }

  /** Convert absolute backend URL to relative path for nginx proxy */
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // If it's a backend URL (different port), use just the pathname
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        return parsed.pathname;
      }
    } catch { /* not a valid URL, use as-is */ }
    return url;
  }

  private loadPdf(url: string): void {
    this.pdfUrl.set(null);
    this.pdfViewer.getSafePdfUrl(url).subscribe({
      next: (safeUrl) => this.pdfUrl.set(safeUrl),
      error: () => this.pdfUrl.set(null)
    });
  }

  private loadDocx(url: string): void {
    this.docxLoading.set(true);
    this.docxError.set(null);
    this.docxHtml.set(null);

    // Use HttpClient (goes through auth interceptor + base-url proxy) instead of native fetch
    this.http.get(url, { responseType: 'arraybuffer' }).subscribe({
      next: async (arrayBuffer) => {
        try {
          const mammoth = await import('mammoth') as any;
          const converter = mammoth.convertToHtml || mammoth.default?.convertToHtml;
          if (!converter) throw new Error('convertToHtml not found');
          const result = await converter({ arrayBuffer });
          this.docxHtml.set(this.sanitizer.bypassSecurityTrustHtml(result.value));
        } catch {
          this.docxError.set('Không thể xem trước file này.');
        } finally {
          this.docxLoading.set(false);
        }
      },
      error: () => {
        this.docxError.set('Không thể tải file.');
        this.docxLoading.set(false);
      }
    });
  }
}
