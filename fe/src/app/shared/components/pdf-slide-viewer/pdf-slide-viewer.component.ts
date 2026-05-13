import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { PdfViewerService } from '../../services/pdf-viewer.service';
import { IconComponent } from '../icon/icon.component';

type PdfJsModule = typeof import('pdfjs-dist');

@Component({
  selector: 'app-pdf-slide-viewer',
  imports: [CommonModule, IconComponent],
  templateUrl: './pdf-slide-viewer.component.html',
  styleUrls: ['./pdf-slide-viewer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PdfSlideViewerComponent implements AfterViewInit, OnInit, OnDestroy {
  readonly sourceUrl = input.required<string>();
  readonly fileName = input<string>('');
  readonly downloadUrl = input<string | null>(null);

  private readonly pdfViewer = inject(PdfViewerService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);
  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private static pdfJsPromise: Promise<PdfJsModule> | null = null;

  readonly isLoading = signal(false);
  readonly isRendering = signal(false);
  readonly error = signal<string | null>(null);
  readonly pageNumber = signal(1);
  readonly totalPages = signal(0);
  readonly canGoPrevious = computed(() => this.pageNumber() > 1 && !this.isLoading() && !this.isRendering());
  readonly canGoNext = computed(() => this.pageNumber() < this.totalPages() && !this.isLoading() && !this.isRendering());

  private pdfDocument: PDFDocumentProxy | null = null;
  private loadingTask: PDFDocumentLoadingTask | null = null;
  private renderTask: RenderTask | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private resizeFrame: number | null = null;
  private loadToken = 0;
  private renderToken = 0;
  private touchStartX: number | null = null;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      effect(() => {
        void this.loadDocument(this.sourceUrl());
      }, { injector: this.injector });
    }
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      if (this.pdfDocument) {
        this.scheduleRenderCurrentPage();
      }
    });
    this.resizeObserver.observe(this.host.nativeElement);
    void this.renderCurrentPage();
  }

  ngOnDestroy(): void {
    this.loadToken++;
    this.cancelScheduledRender();
    this.releaseDocument();
    this.resizeObserver?.disconnect();
  }

  async previousPage(): Promise<void> {
    if (!this.canGoPrevious()) {
      return;
    }
    this.pageNumber.update(page => page - 1);
    await this.renderCurrentPage();
  }

  async nextPage(): Promise<void> {
    if (!this.canGoNext()) {
      return;
    }
    this.pageNumber.update(page => page + 1);
    await this.renderCurrentPage();
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches.item(0)?.clientX ?? null;
  }

  onTouchEnd(event: TouchEvent): void {
    const startX = this.touchStartX;
    this.touchStartX = null;
    const endX = event.changedTouches.item(0)?.clientX ?? null;
    if (startX === null || endX === null) {
      return;
    }

    const delta = endX - startX;
    if (Math.abs(delta) < 48) {
      return;
    }

    if (delta < 0) {
      void this.nextPage();
    } else {
      void this.previousPage();
    }
  }

  openInNewTab(): void {
    const url = this.sourceUrl();
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  private async loadDocument(url: string): Promise<void> {
    const token = ++this.loadToken;
    this.releaseDocument();
    this.isLoading.set(true);
    this.error.set(null);
    this.pageNumber.set(1);
    this.totalPages.set(0);

    try {
      const buffer = await firstValueFrom(this.pdfViewer.getPdfArrayBuffer(url));
      if (token !== this.loadToken) {
        return;
      }
      if (!buffer) {
        throw new Error('empty-pdf');
      }

      const pdfjs = await this.loadPdfJs();
      if (token !== this.loadToken) {
        return;
      }

      const loadingTask = pdfjs.getDocument({ data: buffer.slice(0) });
      this.loadingTask = loadingTask;
      const pdf = await loadingTask.promise;
      if (this.loadingTask === loadingTask) {
        this.loadingTask = null;
      }
      if (token !== this.loadToken) {
        await pdf.destroy();
        return;
      }

      this.pdfDocument = pdf;
      this.totalPages.set(pdf.numPages);
      this.isLoading.set(false);
      await this.renderCurrentPage();
    } catch {
      if (token !== this.loadToken) {
        return;
      }
      this.isLoading.set(false);
      this.error.set('Không thể mở bản xem trước trên điện thoại.');
    }
  }

  private async renderCurrentPage(): Promise<void> {
    const pdf = this.pdfDocument;
    const canvas = this.canvasRef()?.nativeElement;
    if (!pdf || !canvas || this.isLoading()) {
      return;
    }

    const token = ++this.renderToken;
    this.cancelRender();
    this.isRendering.set(true);

    try {
      const page = await pdf.getPage(this.pageNumber());
      if (token !== this.renderToken) {
        return;
      }

      const maxStageWidth = Math.max(280, this.host.nativeElement.clientWidth - 28);
      const baseViewport = page.getViewport({ scale: 1 });
      const cssScale = maxStageWidth / baseViewport.width;
      const viewport = page.getViewport({ scale: cssScale });
      const outputScale = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('canvas-unavailable');
      }
      context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
      context.clearRect(0, 0, viewport.width, viewport.height);

      const task = page.render({ canvas: null, canvasContext: context, viewport });
      this.renderTask = task;
      await task.promise;
    } catch (error) {
      if (this.isRenderCancelled(error)) {
        return;
      }
      this.error.set('Không thể hiển thị trang hiện tại.');
    } finally {
      if (token === this.renderToken) {
        this.renderTask = null;
        this.isRendering.set(false);
      }
    }
  }

  private cancelRender(): void {
    if (this.renderTask) {
      this.renderTask.cancel();
      this.renderTask = null;
    }
  }

  private cancelLoad(): void {
    if (this.loadingTask) {
      void this.loadingTask.destroy().catch(() => undefined);
      this.loadingTask = null;
    }
  }

  private cancelScheduledRender(): void {
    if (this.resizeFrame !== null) {
      cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = null;
    }
  }

  private scheduleRenderCurrentPage(): void {
    this.cancelScheduledRender();
    this.resizeFrame = requestAnimationFrame(() => {
      this.resizeFrame = null;
      void this.renderCurrentPage();
    });
  }

  private releaseDocument(): void {
    this.cancelLoad();
    this.cancelRender();
    if (this.pdfDocument) {
      void this.pdfDocument.destroy();
      this.pdfDocument = null;
    }
  }

  private async loadPdfJs(): Promise<PdfJsModule> {
    if (!PdfSlideViewerComponent.pdfJsPromise) {
      PdfSlideViewerComponent.pdfJsPromise = import('pdfjs-dist').then(pdfjs => {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'assets/pdfjs/pdf.worker.min.mjs',
          document.baseURI
        ).toString();
        return pdfjs;
      });
    }
    return PdfSlideViewerComponent.pdfJsPromise;
  }

  private isRenderCancelled(error: unknown): boolean {
    return typeof error === 'object'
      && error !== null
      && 'name' in error
      && (error as { name?: string }).name === 'RenderingCancelledException';
  }
}
