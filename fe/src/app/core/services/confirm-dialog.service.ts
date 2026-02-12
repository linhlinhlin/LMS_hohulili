import { Injectable, signal } from '@angular/core';

export interface ConfirmDialogConfig {
  title: string;
  message: string;
  variant?: 'danger' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  readonly isOpen = signal(false);
  readonly config = signal<ConfirmDialogConfig | null>(null);

  private resolvePromise: ((value: boolean) => void) | null = null;

  confirm(config: ConfirmDialogConfig): Promise<boolean> {
    this.config.set(config);
    this.isOpen.set(true);
    return new Promise<boolean>(resolve => {
      this.resolvePromise = resolve;
    });
  }

  accept(): void {
    this.resolvePromise?.(true);
    this.close();
  }

  cancel(): void {
    this.resolvePromise?.(false);
    this.close();
  }

  private close(): void {
    this.isOpen.set(false);
    this.config.set(null);
    this.resolvePromise = null;
  }
}
