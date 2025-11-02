import { Injectable, signal, computed } from '@angular/core';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number; // in milliseconds, 0 means persistent
  action?: {
    label: string;
    callback: () => void;
  };
  timestamp: Date;
  read: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private _notifications = signal<Notification[]>([]);
  private _isVisible = signal(false);

  // Readonly signals
  readonly notifications = this._notifications.asReadonly();
  readonly isVisible = this._isVisible.asReadonly();
  readonly unreadCount = computed(() => 
    this._notifications().filter(n => !n.read).length
  );

  show(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): string {
    const id = this.generateId();
    // Vô hiệu hóa hiển thị thông báo để tránh popup
    /*
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date(),
      read: false
    };

    this._notifications.update(notifications => [newNotification, ...notifications]);
    */
    // Vô hiệu hóa hiển thị
    // this._isVisible.set(true);

    // Auto-hide if duration is specified
    /*
    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        this.hide(id);
      }, notification.duration);
    }
    */

    return id;
  }

  hide(id: string): void {
    this._notifications.update(notifications => 
      notifications.filter(n => n.id !== id)
    );
    // Hide notification panel if no notifications left
    setTimeout(() => {
      if (this._notifications().length === 0) {
        this._isVisible.set(false);
      }
    }, 0);
  }

  markAsRead(id: string): void {
    this._notifications.update(notifications =>
      notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      )
    );
  }

  markAllAsRead(): void {
    this._notifications.update(notifications =>
      notifications.map(n => ({ ...n, read: true }))
    );
  }

  clearAll(): void {
    this._notifications.set([]);
    this._isVisible.set(false);
  }

  clearRead(): void {
    this._notifications.update(notifications =>
      notifications.filter(n => !n.read)
    );
  }

  // Convenience methods
  info(title: string, message: string, options?: Partial<Notification>): string {
    return this.show({
      title,
      message,
      type: 'info',
      duration: 5000,
      ...options
    });
  }

  success(title: string, message: string, options?: Partial<Notification>): string {
    return this.show({
      title,
      message,
      type: 'success',
      duration: 5000,
      ...options
    });
  }

  warning(title: string, message: string, options?: Partial<Notification>): string {
    return this.show({
      title,
      message,
      type: 'warning',
      duration: 7000,
      ...options
    });
  }

  error(title: string, message: string, options?: Partial<Notification>): string {
    return this.show({
      title,
      message,
      type: 'error',
      duration: 0, // Persistent until manually closed
      ...options
    });
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
