import { Component, signal, Injectable } from '@angular/core';
import { CommonModule } from '@angular/common';

// ============ TOAST SERVICE ============
export interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
}

@Injectable({ providedIn: 'root' })
export class ChatToastService {
    private readonly _toasts = signal<Toast[]>([]);
    readonly toasts = this._toasts.asReadonly();

    show(message: string, type: Toast['type'] = 'info', duration = 3000): void {
        const id = `toast-${Date.now()}`;
        const toast: Toast = { id, message, type, duration };

        this._toasts.update(toasts => [...toasts, toast]);

        if (duration > 0) {
            setTimeout(() => this.dismiss(id), duration);
        }
    }

    success(message: string, duration = 3000): void {
        this.show(message, 'success', duration);
    }

    error(message: string, duration = 5000): void {
        this.show(message, 'error', duration);
    }

    info(message: string, duration = 3000): void {
        this.show(message, 'info', duration);
    }

    warning(message: string, duration = 4000): void {
        this.show(message, 'warning', duration);
    }

    dismiss(id: string): void {
        this._toasts.update(toasts => toasts.filter(t => t.id !== id));
    }

    clear(): void {
        this._toasts.set([]);
    }
}

// ============ TOAST CONTAINER COMPONENT ============
@Component({
    selector: 'app-chat-toast-container',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div 
          class="toast" 
          [class.toast-success]="toast.type === 'success'"
          [class.toast-error]="toast.type === 'error'"
          [class.toast-warning]="toast.type === 'warning'"
          [class.toast-info]="toast.type === 'info'"
        >
          <div class="toast-icon">
            @switch (toast.type) {
              @case ('success') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              }
              @case ('error') {
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
          <span class="toast-message">{{ toast.message }}</span>
          <button class="toast-close" (click)="toastService.dismiss(toast.id)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      }
    </div>
  `,
    styles: [`
    .toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 400px;
    }

    .toast {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      background: #FFFFFF;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      animation: slideIn 0.3s ease-out;
      border-left: 4px solid;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .toast-success {
      border-left-color: #10B981;
    }

    .toast-success .toast-icon {
      color: #10B981;
    }

    .toast-error {
      border-left-color: #EF4444;
    }

    .toast-error .toast-icon {
      color: #EF4444;
    }

    .toast-warning {
      border-left-color: #F59E0B;
    }

    .toast-warning .toast-icon {
      color: #F59E0B;
    }

    .toast-info {
      border-left-color: #0369A1;
    }

    .toast-info .toast-icon {
      color: #0369A1;
    }

    .toast-icon {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
    }

    .toast-icon svg {
      width: 100%;
      height: 100%;
    }

    .toast-message {
      flex: 1;
      font-size: 0.875rem;
      color: #1F2937;
      font-weight: 500;
    }

    .toast-close {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      padding: 0;
      background: none;
      border: none;
      color: #9CA3AF;
      cursor: pointer;
      transition: color 0.15s;
    }

    .toast-close:hover {
      color: #4B5563;
    }

    .toast-close svg {
      width: 100%;
      height: 100%;
    }

    @media (max-width: 480px) {
      .toast-container {
        left: 16px;
        right: 16px;
        bottom: 16px;
        max-width: none;
      }
    }
  `]
})
export class ChatToastContainerComponent {
    constructor(public toastService: ChatToastService) { }
}

