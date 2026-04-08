/**
 * Conversation List Item Component
 *
 * Item trong danh sách conversation của Student Inbox.
 * - Avatar và tên giảng viên
 * - Preview tin nhắn cuối
 * - Timestamp
 * - Unread badge
 *
 * @requirements 2.4, 2.5
 */
import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';

import { ConversationListItem, formatMessageTime } from './utils/message-utils';

@Component({
  selector: 'app-conversation-list-item',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      (click)="onSelect()"
      class="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 last:border-b-0"
      [class.bg-[#0056D2]/5]="isSelected()"
      [class.font-semibold]="isSelected()"
    >
      <!-- Avatar -->
      <div class="relative flex-shrink-0">
        <div
          class="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium"
          [class.bg-[#0056D2]]="!conversation().otherParticipant.avatar"
        >
          @if (conversation().otherParticipant.avatar) {
            <img
              [src]="conversation().otherParticipant.avatar"
              [alt]="conversation().otherParticipant.name"
              class="w-12 h-12 rounded-full object-cover"
            />
          } @else {
            {{ getInitials(conversation().otherParticipant.name) }}
          }
        </div>

        <!-- Unread Badge -->
        @if (conversation().unreadCount > 0) {
          <span
            class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
          >
            {{ conversation().unreadCount > 9 ? '9+' : conversation().unreadCount }}
          </span>
        }
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between mb-1">
          <div class="flex items-center gap-1.5 min-w-0">
            <h3
              class="font-medium truncate"
              [class.text-slate-900]="conversation().unreadCount === 0"
              [class.text-black]="conversation().unreadCount > 0"
              [class.font-semibold]="conversation().unreadCount > 0"
            >
              {{ conversation().otherParticipant.name }}
            </h3>
            @if (roleLabel()) {
              <span class="flex-shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                {{ roleLabel() }}
              </span>
            }
          </div>
          <span
            class="text-xs flex-shrink-0 ml-2"
            [class.text-slate-400]="conversation().unreadCount === 0"
            [class.text-[#0056D2]]="conversation().unreadCount > 0"
            [class.font-medium]="conversation().unreadCount > 0"
          >
            {{ formatTime(conversation().lastMessageTime) }}
          </span>
        </div>
        <p
          class="text-sm truncate"
          [class.text-slate-500]="conversation().unreadCount === 0"
          [class.text-slate-700]="conversation().unreadCount > 0"
          [class.font-medium]="conversation().unreadCount > 0"
        >
          @if (conversation().isOwnLastMessage) {
            <span class="text-slate-400">Bạn: </span>
          }
          {{ conversation().lastMessagePreview || 'Chưa có tin nhắn' }}
        </p>
      </div>

      <!-- Archived indicator -->
      @if (conversation().isArchived) {
        <span class="text-xs text-slate-400 px-2 py-1 bg-slate-100 rounded">
          Đã lưu trữ
        </span>
      }
    </button>
  `,
})
export class ConversationListItemComponent {
  // Signal inputs (Angular v20+)
  readonly conversation = input.required<ConversationListItem>();
  readonly isSelected = input<boolean>(false);

  // Output function (Angular v20+)
  readonly select = output<string>();

  onSelect(): void {
    this.select.emit(this.conversation().conversationId);
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  roleLabel(): string {
    switch (this.conversation().otherParticipant.role) {
      case 'TEACHER': return 'GV';
      case 'ADMIN': return 'QTV';
      case 'ORG_ADMIN': return 'QL';
      case 'STUDENT': return 'HV';
      default: return '';
    }
  }

  formatTime(dateString: string): string {
    return formatMessageTime(dateString);
  }
}
