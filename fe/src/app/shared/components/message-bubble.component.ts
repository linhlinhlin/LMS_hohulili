/**
 * Message Bubble Component
 *
 * Hiển thị một tin nhắn trong cuộc hội thoại.
 * - Left alignment cho tin nhắn nhận
 * - Right alignment cho tin nhắn gửi
 * - Hỗ trợ assignment reference card
 * - XSS protection: sử dụng text interpolation thay vì innerHTML
 *
 * @requirements 1.4, 5.2, 5.4, Security
 */
import { Component, ChangeDetectionStrategy, input } from '@angular/core';

import { RouterLink } from '@angular/router';
import {
  Message,
  formatMessageTime,
  hasAssignmentReference,
  parseMessageWithLinks,
  TextSegment,
} from '../../features/student/messages/utils/message-utils';

@Component({
  selector: 'app-message-bubble',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex mb-4"
      [class.justify-end]="isOwnMessage"
      [class.justify-start]="!isOwnMessage"
    >
      <div
        class="max-w-[70%] rounded-2xl px-4 py-3"
        [class.bg-[#0056D2]]="isOwnMessage"
        [class.text-white]="isOwnMessage"
        [class.bg-gray-100]="!isOwnMessage"
        [class.text-gray-900]="!isOwnMessage"
        [class.rounded-br-md]="isOwnMessage"
        [class.rounded-bl-md]="!isOwnMessage"
      >
        <!-- Sender name (only for received messages) -->
        @if (!isOwnMessage) {
          <p class="text-xs font-medium text-gray-500 mb-1">
            {{ message().senderName }}
          </p>
        }

        <!-- Message content - XSS safe with auto-link detection -->
        <p class="text-sm whitespace-pre-wrap break-words">
          @for (segment of contentSegments; track $index) {
            @if (segment.type === 'link') {
              <a
                [href]="segment.url"
                target="_blank"
                rel="noopener noreferrer"
                class="underline hover:opacity-80"
                [class.text-blue-200]="isOwnMessage"
                [class.text-[#0056D2]]="!isOwnMessage"
              >{{ segment.content }}</a>
            } @else {
              {{ segment.content }}
            }
          }
        </p>

        <!-- Assignment Reference Card -->
        @if (hasReference()) {
          <div
            class="mt-2 p-3 rounded-lg border"
            [class.bg-[#0056D2]]="isOwnMessage"
            [class.border-blue-400]="isOwnMessage"
            [class.bg-white]="!isOwnMessage"
            [class.border-gray-200]="!isOwnMessage"
          >
            <div class="flex items-center gap-2 mb-1">
              <svg
                class="w-4 h-4"
                [class.text-blue-200]="isOwnMessage"
                [class.text-[#0056D2]]="!isOwnMessage"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                ></path>
              </svg>
              <span
                class="text-xs font-medium"
                [class.text-blue-200]="isOwnMessage"
                [class.text-gray-500]="!isOwnMessage"
              >
                Bài tập đính kèm
              </span>
            </div>
            <a
              [routerLink]="['/student/assignments', message().assignmentReference?.assignmentId]"
              class="block font-medium text-sm hover:underline"
              [class.text-white]="isOwnMessage"
              [class.text-[#0056D2]]="!isOwnMessage"
            >
              {{ message().assignmentReference?.assignmentTitle }}
            </a>
            <p
              class="text-xs mt-1"
              [class.text-blue-200]="isOwnMessage"
              [class.text-gray-500]="!isOwnMessage"
            >
              {{ message().assignmentReference?.courseName }}
            </p>
          </div>
        }

        <!-- Timestamp and read status -->
        <div
          class="flex items-center gap-2 mt-2"
          [class.justify-end]="isOwnMessage"
        >
          <span
            class="text-xs"
            [class.text-blue-200]="isOwnMessage"
            [class.text-gray-400]="!isOwnMessage"
          >
            {{ formatTime() }}
          </span>

          <!-- Read status (only for own messages) -->
          @if (isOwnMessage) {
            <span class="text-xs" [class.text-blue-200]="!message().isRead" [class.text-white]="message().isRead">
              @if (message().isRead) {
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              } @else {
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              }
            </span>
          }
        </div>
      </div>
    </div>
  `,
})
export class MessageBubbleComponent {
  readonly message = input.required<Message>();
  readonly currentUserId = input.required<string>();

  get isOwnMessage(): boolean {
    return this.message().senderId === this.currentUserId();
  }

  get contentSegments(): TextSegment[] {
    return parseMessageWithLinks(this.message().content);
  }

  hasReference(): boolean {
    return hasAssignmentReference(this.message());
  }

  formatTime(): string {
    return formatMessageTime(this.message().createdAt);
  }
}
