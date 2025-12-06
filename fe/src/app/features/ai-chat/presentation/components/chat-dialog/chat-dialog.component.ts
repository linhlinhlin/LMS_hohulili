import { Component, signal, Injectable, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

// ============ DIALOG SERVICE ============
export interface DialogConfig {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'warning' | 'danger' | 'info';
}

export interface DialogState extends DialogConfig {
    id: string;
    isOpen: boolean;
    resolve?: (result: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ChatDialogService {
    private readonly _dialog = signal<DialogState | null>(null);
    readonly dialog = this._dialog.asReadonly();

    confirm(config: DialogConfig): Promise<boolean> {
        return new Promise((resolve) => {
            const state: DialogState = {
                ...config,
                id: `dialog-${Date.now()}`,
                isOpen: true,
                confirmText: config.confirmText || 'Xác nhận',
                cancelText: config.cancelText || 'Hủy',
                type: config.type || 'warning',
                resolve
            };
            this._dialog.set(state);
        });
    }

    close(result: boolean): void {
        const dialog = this._dialog();
        if (dialog?.resolve) {
            dialog.resolve(result);
        }
        this._dialog.set(null);
    }

    // Convenience methods
    confirmDelete(itemName: string): Promise<boolean> {
        return this.confirm({
            title: 'Xác nhận xóa',
            message: `Bạn có chắc chắn muốn xóa "${itemName}"? Hành động này không thể hoàn tác.`,
            confirmText: 'Xóa',
            cancelText: 'Hủy',
            type: 'danger'
        });
    }

    confirmClearHistory(): Promise<boolean> {
        return this.confirm({
            title: 'Xóa lịch sử trò chuyện',
            message: 'Tất cả cuộc trò chuyện sẽ bị xóa vĩnh viễn. Bạn có chắc chắn?',
            confirmText: 'Xóa tất cả',
            cancelText: 'Giữ lại',
            type: 'danger'
        });
    }

    confirmNewChat(): Promise<boolean> {
        return this.confirm({
            title: 'Bắt đầu cuộc trò chuyện mới?',
            message: 'Cuộc trò chuyện hiện tại sẽ được lưu lại trong lịch sử.',
            confirmText: 'Bắt đầu mới',
            cancelText: 'Tiếp tục',
            type: 'info'
        });
    }
}

// ============ DIALOG COMPONENT ============
@Component({
    selector: 'app-chat-dialog',
    standalone: true,
    imports: [CommonModule],
    template: `
    @if (dialogService.dialog(); as dialog) {
      <div class="dialog-overlay" (click)="onOverlayClick($event)">
        <div class="dialog-container" role="dialog" aria-modal="true">
          <!-- Icon -->
          <div class="dialog-icon" [class]="'dialog-icon-' + dialog.type">
            @switch (dialog.type) {
              @case ('danger') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M15 9l-6 6M9 9l6 6"/>
                </svg>
              }
              @case ('warning') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 9v4M12 17h.01"/>
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                </svg>
              }
              @default {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4M12 8h.01"/>
                </svg>
              }
            }
          </div>

          <!-- Content -->
          <h2 class="dialog-title">{{ dialog.title }}</h2>
          <p class="dialog-message">{{ dialog.message }}</p>

          <!-- Actions -->
          <div class="dialog-actions">
            <button 
              class="dialog-btn dialog-btn-cancel" 
              (click)="dialogService.close(false)"
            >
              {{ dialog.cancelText }}
            </button>
            <button 
              class="dialog-btn" 
              [class.dialog-btn-danger]="dialog.type === 'danger'"
              [class.dialog-btn-warning]="dialog.type === 'warning'"
              [class.dialog-btn-info]="dialog.type === 'info'"
              (click)="dialogService.close(true)"
            >
              {{ dialog.confirmText }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
    styles: [`
    .dialog-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .dialog-container {
      background: #FFFFFF;
      border-radius: 16px;
      padding: 28px;
      max-width: 400px;
      width: 90%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
      animation: scaleIn 0.2s ease-out;
    }

    @keyframes scaleIn {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .dialog-icon {
      width: 56px;
      height: 56px;
      margin: 0 auto 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dialog-icon svg {
      width: 28px;
      height: 28px;
    }

    .dialog-icon-danger {
      background: #FEE2E2;
      color: #DC2626;
    }

    .dialog-icon-warning {
      background: #FEF3C7;
      color: #D97706;
    }

    .dialog-icon-info {
      background: #E0F2FE;
      color: #0369A1;
    }

    .dialog-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #0F172A;
      margin: 0 0 12px;
    }

    .dialog-message {
      font-size: 0.9375rem;
      color: #64748B;
      margin: 0 0 24px;
      line-height: 1.5;
    }

    .dialog-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .dialog-btn {
      flex: 1;
      padding: 12px 20px;
      border-radius: 10px;
      font-size: 0.9375rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .dialog-btn-cancel {
      background: #F1F5F9;
      color: #475569;
    }

    .dialog-btn-cancel:hover {
      background: #E2E8F0;
    }

    .dialog-btn-danger {
      background: #DC2626;
      color: white;
    }

    .dialog-btn-danger:hover {
      background: #B91C1C;
    }

    .dialog-btn-warning {
      background: #D97706;
      color: white;
    }

    .dialog-btn-warning:hover {
      background: #B45309;
    }

    .dialog-btn-info {
      background: #0369A1;
      color: white;
    }

    .dialog-btn-info:hover {
      background: #075985;
    }
  `]
})
export class ChatDialogComponent {
    constructor(public dialogService: ChatDialogService) { }

    onOverlayClick(event: MouseEvent): void {
        if (event.target === event.currentTarget) {
            this.dialogService.close(false);
        }
    }
}
