import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export interface ToastOptions {
  duration?: number;
  action?: {
    label: string;
    callback: () => void;
  };
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toasts = signal<Toast[]>([]);
  readonly toasts$ = this.toasts.asReadonly();

  private static readonly DEDUP_WINDOW_MS = 3000;
  private recentEntries = new Map<string, number>();

  success(titleOrMessage: string, messageOrOptions?: string | ToastOptions, options?: ToastOptions): void {
    const { message, opts } = this.parseArgs(titleOrMessage, messageOrOptions, options);
    this.show({ message, type: 'success', duration: opts?.duration || 3000 });
  }

  error(titleOrMessage: string, messageOrOptions?: string | ToastOptions, options?: ToastOptions): void {
    const { message, opts } = this.parseArgs(titleOrMessage, messageOrOptions, options);
    this.show({ message, type: 'error', duration: opts?.duration || 5000 });
  }

  warning(titleOrMessage: string, messageOrOptions?: string | ToastOptions, options?: ToastOptions): void {
    const { message, opts } = this.parseArgs(titleOrMessage, messageOrOptions, options);
    this.show({ message, type: 'warning', duration: opts?.duration || 4000 });
  }

  info(titleOrMessage: string, messageOrOptions?: string | ToastOptions, options?: ToastOptions): void {
    const { message, opts } = this.parseArgs(titleOrMessage, messageOrOptions, options);
    this.show({ message, type: 'info', duration: opts?.duration || 3000 });
  }

  private parseArgs(
    titleOrMessage: string,
    messageOrOptions?: string | ToastOptions,
    options?: ToastOptions
  ): { message: string; opts?: ToastOptions } {
    // Support both signatures:
    // 1. success(message: string)
    // 2. success(message: string, duration: number)
    // 3. success(title: string, message: string, options: ToastOptions)

    if (typeof messageOrOptions === 'string') {
      // Format: title, message, options
      return {
        message: `${titleOrMessage} - ${messageOrOptions}`,
        opts: options
      };
    } else {
      // Format: message, options (or just message)
      return {
        message: titleOrMessage,
        opts: messageOrOptions as ToastOptions | undefined
      };
    }
  }

  private show(toast: Omit<Toast, 'id'>): void {
    const dedupKey = `${toast.type}:${toast.message}`;
    const now = Date.now();
    const lastShownAt = this.recentEntries.get(dedupKey) ?? 0;
    if (now - lastShownAt < ToastService.DEDUP_WINDOW_MS) {
      return;
    }
    this.recentEntries.set(dedupKey, now);
    if (this.recentEntries.size > 50) {
      const cutoff = now - ToastService.DEDUP_WINDOW_MS;
      for (const [key, ts] of this.recentEntries) {
        if (ts < cutoff) this.recentEntries.delete(key);
      }
    }

    const id = crypto.randomUUID();
    const newToast = { ...toast, id };
    this.toasts.update(toasts => [...toasts, newToast]);
    if (toast.duration) {
      setTimeout(() => this.dismiss(id), toast.duration);
    }
  }

  dismiss(id: string): void {
    this.toasts.update(toasts => toasts.filter(t => t.id !== id));
  }
}
