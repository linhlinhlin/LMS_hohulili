import { Component, ChangeDetectionStrategy, inject, HostListener } from '@angular/core';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (dialog.isOpen()) {
      <div class="confirm-overlay" (click)="dialog.cancel()">
        <div class="confirm-modal" (click)="$event.stopPropagation()" role="alertdialog" aria-modal="true">
          @if (dialog.config(); as cfg) {
            <div class="confirm-header">
              <div class="confirm-icon" [class]="'icon-' + (cfg.variant || 'warning')">
                @switch (cfg.variant || 'warning') {
                  @case ('danger') {
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  }
                  @case ('warning') {
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  }
                  @case ('info') {
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  }
                }
              </div>
              <h3 class="confirm-title">{{ cfg.title }}</h3>
            </div>
            <p class="confirm-message">{{ cfg.message }}</p>
            <div class="confirm-actions">
              <button class="btn-cancel" (click)="dialog.cancel()">
                {{ cfg.cancelText || 'Hủy' }}
              </button>
              <button class="btn-confirm" [class]="'btn-' + (cfg.variant || 'warning')" (click)="dialog.accept()" #confirmBtn>
                {{ cfg.confirmText || 'Xác nhận' }}
              </button>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .confirm-overlay {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      animation: fadeIn 0.15s ease-out;
    }

    .confirm-modal {
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 420px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.2s ease-out;
    }

    .confirm-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .confirm-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .icon-danger {
      background: #fef2f2;
      color: #dc2626;
    }

    .icon-warning {
      background: #fffbeb;
      color: #d97706;
    }

    .icon-info {
      background: #eff6ff;
      color: #0056D2;
    }

    .confirm-title {
      font-size: 16px;
      font-weight: 600;
      color: #111827;
      margin: 0;
    }

    .confirm-message {
      font-size: 14px;
      color: #6b7280;
      line-height: 1.5;
      margin: 0 0 20px;
      white-space: pre-line;
    }

    .confirm-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    .btn-cancel, .btn-confirm {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: all 0.15s;
    }

    .btn-cancel {
      background: #f3f4f6;
      color: #374151;
    }

    .btn-cancel:hover {
      background: #e5e7eb;
    }

    .btn-danger {
      background: #dc2626;
      color: white;
    }

    .btn-danger:hover {
      background: #b91c1c;
    }

    .btn-warning {
      background: #d97706;
      color: white;
    }

    .btn-warning:hover {
      background: #b45309;
    }

    .btn-info {
      background: #0056D2;
      color: white;
    }

    .btn-info:hover {
      background: #004BB5;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(10px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
  `]
})
export class ConfirmDialogComponent {
  protected dialog = inject(ConfirmDialogService);

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.dialog.isOpen()) {
      this.dialog.cancel();
    }
  }
}
