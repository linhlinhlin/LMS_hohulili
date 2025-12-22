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
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConversationListItem, formatMessageTime } from './utils/message-utils';

@Component({
  selector: 'app-conversation-list-item',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      (click)="onSelect()"
      class="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
      [class.bg-blue-50]="isSelected"
      [class.border-l-4]="isSelected"
      [class.border-l-blue-600]="isSelected"
    >
      <!-- Avatar -->
      <div class="relative flex-shrink-0">
        <div
          class="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium"
          [class.bg-blue-600]="!conversation.otherParticipant.avatar"
        >
          @if (conversation.otherParticipant.avatar) {
            <img
              [src]="conversation.otherParticipant.avatar"
              [alt]="conversation.otherParticipant.name"
              class="w-12 h-12 rounded-full object-cover"
            />
          } @else {
            {{ getInitials(conversation.otherParticipant.name) }}
          }
        </div>

        <!-- Unread Badge -->
        @if (conversation.unreadCount > 0) {
          <span
            class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
          >
            {{ conversation.unreadCount > 9 ? '9+' : conversation.unreadCount }}
          </span>
        }
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between mb-1">
          <h3
            class="font-medium truncate"
            [class.text-gray-900]="conversation.unreadCount === 0"
            [class.text-black]="conversation.unreadCount > 0"
            [class.font-semibold]="conversation.unreadCount > 0"
          >
            {{ conversation.otherParticipant.name }}
          </h3>
          <span
            class="text-xs flex-shrink-0 ml-2"
            [class.text-gray-400]="conversation.unreadCount === 0"
            [class.text-blue-600]="conversation.unreadCount > 0"
            [class.font-medium]="conversation.unreadCount > 0"
          >
            {{ formatTime(conversation.lastMessageTime) }}
          </span>
        </div>
        <p
          class="text-sm truncate"
          [class.text-gray-500]="conversation.unreadCount === 0"
          [class.text-gray-700]="conversation.unreadCount > 0"
          [class.font-medium]="conversation.unreadCount > 0"
        >
          {{ conversation.lastMessagePreview || 'Chưa có tin nhắn' }}
        </p>
      </div>

      <!-- Archived indicator -->
      @if (conversation.isArchived) {
        <span class="text-xs text-gray-400 px-2 py-1 bg-gray-100 rounded">
          Đã lưu trữ
        </span>
      }
    </button>
  `,
})
export class ConversationListItemComponent {
  @Input({ required: true }) conversation!: ConversationListItem;
  @Input() isSelected = false;

  @Output() select = new EventEmitter<string>();

  onSelect(): void {
    this.select.emit(this.conversation.conversationId);
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  formatTime(dateString: string): string {
    return formatMessageTime(dateString);
  }
}

