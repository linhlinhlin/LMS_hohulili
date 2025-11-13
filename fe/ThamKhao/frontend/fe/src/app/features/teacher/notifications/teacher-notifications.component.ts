import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../infrastructure/services/notification.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-teacher-notifications',
  imports: [CommonModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="p-6 space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Thông báo</h1>
        <div class="flex items-center gap-2">
          <button class="px-4 py-2 border rounded-lg text-sm" (click)="markAllRead()">Đánh dấu đã đọc</button>
          <button class="px-4 py-2 border rounded-lg text-sm" (click)="clearAll()">Xóa tất cả</button>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow">
        <div class="divide-y">
          <div *ngFor="let n of notifications()" class="p-4 flex items-start gap-4">
            <div class="mt-1">
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs"
                [ngClass]="{
                  'bg-blue-100 text-blue-800': n.type === 'assignment',
                  'bg-green-100 text-green-800': n.type === 'course',
                  'bg-gray-100 text-gray-800': n.type === 'system',
                  'bg-yellow-100 text-yellow-800': n.type === 'grade'
                }"
              >{{ n.type }}</span>
            </div>
            <div class="flex-1">
              <p class="font-medium text-gray-900" [class.opacity-60]="n.isRead">{{ n.title }}</p>
              <p class="text-sm text-gray-600" [class.opacity-60]="n.isRead">{{ n.message }}</p>
              <div class="mt-2 flex items-center gap-3 text-xs text-gray-500">
                <span>{{ n.timestamp | date:'short' }}</span>
                <span *ngIf="n.priority === 'urgent'" class="text-red-600 font-medium">Khẩn cấp</span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <a *ngIf="n.actionUrl" [routerLink]="n.actionUrl" class="text-indigo-600 text-sm">Xem</a>
              <button *ngIf="!n.isRead" class="px-3 py-1 border rounded text-sm" (click)="markRead(n.id)">Đã đọc</button>
              <button class="px-3 py-1 border rounded text-sm" (click)="remove(n.id)">Xóa</button>
            </div>
          </div>
          <div class="p-6 text-gray-500" *ngIf="notifications().length === 0">Không có thông báo.</div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeacherNotificationsComponent {
  private ns = inject(NotificationService);
  notifications = this.ns.notifications;

  async markAllRead() {
    await this.ns.markAllAsRead();
  }

  async markRead(id: string) {
    await this.ns.markAsRead(id);
  }

  async remove(id: string) {
    await this.ns.deleteNotification(id);
  }

  clearAll() {
    this.ns.clearAllNotifications();
  }
}