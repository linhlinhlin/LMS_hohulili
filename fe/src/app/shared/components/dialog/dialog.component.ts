import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  effect,
  signal,
  HostListener,
  PLATFORM_ID,
  DestroyRef
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';
import { BodyScrollLockService } from '../../services/body-scroll-lock.service';

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type DialogVariant = 'default' | 'danger' | 'warning' | 'info' | 'success';

let _dialogSeq = 0;

/**
 * Shared Dialog primitive — SOTA a11y + design tokens.
 *
 * Features:
 *  - Portal-style fixed positioning (always above page content)
 *  - Body scroll lock (ref-counted for stacked dialogs)
 *  - CDK focus trap + auto focus restore on close
 *  - ESC key to close (configurable)
 *  - Backdrop click to close (configurable)
 *  - ARIA: role="dialog" + aria-modal + aria-labelledby wired to title
 *  - Optional header with variant icon + subtitle + close button
 *  - Content projection: default slot for body, [dialogFooter] for sticky footer
 *  - Size variants: sm (420px), md (560px), lg (720px), xl (960px), full
 *  - Variants: default | danger | warning | info | success (affects header icon tint)
 *
 * Usage:
 * ```html
 * <app-dialog
 *   [open]="rejectModalOpen()"
 *   title="Từ chối khóa học"
 *   [subtitle]="courseName"
 *   size="md"
 *   variant="danger"
 *   [busy]="rejecting()"
 *   (close)="closeRejectModal()">
 *   <!-- body -->
 *   <p>...</p>
 *   <!-- footer -->
 *   <div dialogFooter>
 *     <button (click)="close()">Hủy</button>
 *     <button (click)="confirm()">Từ chối</button>
 *   </div>
 * </app-dialog>
 * ```
 */
@Component({
  selector: 'app-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule],
  template: `
    @if (open()) {
      <div
        class="dialog-overlay"
        [attr.data-size]="size()"
        (click)="onBackdropClick($event)">
        <div
          class="dialog-panel"
          [attr.data-size]="size()"
          [attr.data-variant]="variant()"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="titleId"
          [attr.aria-describedby]="subtitle() ? subtitleId : null"
          tabindex="-1"
          cdkTrapFocus
          [cdkTrapFocusAutoCapture]="true"
          (click)="$event.stopPropagation()">
          @if (!hideHeader()) {
            <header class="dialog-header">
              @if (variant() !== 'default') {
                <div class="dialog-icon" [attr.data-variant]="variant()">
                  @switch (variant()) {
                    @case ('danger') {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    }
                    @case ('warning') {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    }
                    @case ('info') {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                    }
                    @case ('success') {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    }
                  }
                </div>
              }
              <div class="dialog-heading">
                <h2 [id]="titleId" class="dialog-title">{{ title() }}</h2>
                @if (subtitle(); as st) {
                  <p [id]="subtitleId" class="dialog-subtitle">{{ st }}</p>
                }
              </div>
              @if (!hideCloseButton()) {
                <button
                  type="button"
                  class="dialog-close"
                  aria-label="Đóng"
                  [disabled]="busy()"
                  (click)="requestClose()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              }
            </header>
          }

          <div class="dialog-body">
            <ng-content></ng-content>
          </div>

          <div class="dialog-footer-slot">
            <ng-content select="[dialogFooter]"></ng-content>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: contents;
    }

    .dialog-overlay {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(4px);
      animation: dialog-fade-in 0.15s ease-out;
      overflow-y: auto;
    }

    .dialog-panel {
      position: relative;
      width: 100%;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.35);
      display: flex;
      flex-direction: column;
      max-height: calc(100vh - 32px);
      overflow: hidden;
      animation: dialog-slide-up 0.2s ease-out;
      outline: none;
    }

    .dialog-panel[data-size='sm'] { max-width: 420px; }
    .dialog-panel[data-size='md'] { max-width: 560px; }
    .dialog-panel[data-size='lg'] { max-width: 720px; }
    .dialog-panel[data-size='xl'] { max-width: 960px; }
    .dialog-panel[data-size='full'] {
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 32px);
      height: calc(100vh - 32px);
    }

    .dialog-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 20px 24px 12px;
      border-bottom: 1px solid #f1f5f9;
    }

    .dialog-icon {
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dialog-icon[data-variant='danger']  { background: #fef2f2; color: #dc2626; }
    .dialog-icon[data-variant='warning'] { background: #fffbeb; color: #d97706; }
    .dialog-icon[data-variant='info']    { background: #eff6ff; color: #0056D2; }
    .dialog-icon[data-variant='success'] { background: #f0fdf4; color: #16a34a; }

    .dialog-heading {
      flex: 1;
      min-width: 0;
    }

    .dialog-title {
      font-size: 18px;
      font-weight: 600;
      color: #0f172a;
      margin: 0;
      line-height: 1.4;
    }

    .dialog-subtitle {
      margin: 4px 0 0;
      font-size: 14px;
      color: #64748b;
      line-height: 1.5;
    }

    .dialog-close {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      color: #64748b;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, color 0.15s;
    }

    .dialog-close:hover:not(:disabled) {
      background: #f1f5f9;
      color: #0f172a;
    }

    .dialog-close:focus-visible {
      outline: 2px solid #0056D2;
      outline-offset: 2px;
    }

    .dialog-close:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .dialog-body {
      flex: 1;
      padding: 16px 24px 20px;
      overflow-y: auto;
      color: #334155;
      font-size: 14px;
      line-height: 1.6;
    }

    /* Footer slot wrapper — hidden entirely when nothing projected */
    .dialog-footer-slot {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      flex-wrap: wrap;
      padding: 16px 24px;
      border-top: 1px solid #f1f5f9;
      background: #f8fafc;
    }

    .dialog-footer-slot:empty {
      display: none;
    }

    @keyframes dialog-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes dialog-slide-up {
      from { opacity: 0; transform: translateY(12px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    @media (max-width: 640px) {
      .dialog-overlay { padding: 0; align-items: flex-end; }
      .dialog-panel {
        border-radius: 16px 16px 0 0;
        max-width: 100% !important;
        max-height: 90vh;
      }
      .dialog-panel[data-size='full'] {
        height: 100vh;
        max-height: 100vh;
        border-radius: 0;
      }
    }
  `]
})
export class DialogComponent {
  // Inputs
  open = input<boolean>(false);
  title = input<string>('');
  subtitle = input<string>('');
  size = input<DialogSize>('md');
  variant = input<DialogVariant>('default');
  closeOnBackdrop = input<boolean>(true);
  closeOnEsc = input<boolean>(true);
  busy = input<boolean>(false);
  hideHeader = input<boolean>(false);
  hideCloseButton = input<boolean>(false);

  // Outputs
  close = output<void>();

  // Internal
  protected readonly titleId = `dialog-title-${++_dialogSeq}`;
  protected readonly subtitleId = `dialog-subtitle-${_dialogSeq}`;

  private scrollLock = inject(BodyScrollLockService);
  private doc = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);
  private previousActiveElement = signal<HTMLElement | null>(null);
  private locked = false;

  constructor() {
    // Release scroll lock if component is destroyed while open
    inject(DestroyRef).onDestroy(() => {
      if (this.locked) {
        this.scrollLock.unlock();
        this.locked = false;
      }
    });

    // Sync scroll lock + focus restore with open state
    effect(() => {
      const isOpen = this.open();
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }
      if (isOpen && !this.locked) {
        this.previousActiveElement.set(this.doc.activeElement as HTMLElement | null);
        this.scrollLock.lock();
        this.locked = true;
      } else if (!isOpen && this.locked) {
        this.scrollLock.unlock();
        this.locked = false;
        // Restore focus on next frame so the trap has released
        queueMicrotask(() => {
          this.previousActiveElement()?.focus?.();
          this.previousActiveElement.set(null);
        });
      }
    });
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: Event): void {
    if (!this.open() || !this.closeOnEsc() || this.busy()) {
      return;
    }
    event.stopPropagation();
    this.close.emit();
  }

  onBackdropClick(_event: MouseEvent): void {
    if (!this.closeOnBackdrop() || this.busy()) {
      return;
    }
    this.close.emit();
  }

  requestClose(): void {
    if (this.busy()) {
      return;
    }
    this.close.emit();
  }
}
