/**
 * ChatMessageComponent
 * Displays a single chat message with proper alignment and formatting
 */
import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage } from '../../../domain/types';
import { renderMarkdown } from '../../../utils/markdown-renderer.util';
import { getMessageAlignment } from '../../../domain/entities/chat-message.entity';

@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="chat-message"
      [class.user-message]="isUserMessage()"
      [class.ai-message]="!isUserMessage()"
      [class.error-message]="isError()"
    >
      <!-- Avatar -->
      <div class="message-avatar" [class.user-avatar]="isUserMessage()">
        @if (isUserMessage()) {
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="avatar-icon">
            <path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clip-rule="evenodd" />
          </svg>
        } @else {
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="avatar-icon ai">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        }
      </div>

      <!-- Message Content -->
      <div class="message-content">
        <div
          class="message-bubble"
          [innerHTML]="renderedContent()"
        ></div>

        <!-- Timestamp -->
        <div class="message-meta">
          <span class="message-time">{{ formattedTime() }}</span>
          @if (isError()) {
            <span class="error-indicator">Gửi thất bại</span>
          }
        </div>

        <!-- Retry button for error messages -->
        @if (isError()) {
          <button class="retry-button" (click)="onRetry()">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="retry-icon">
              <path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clip-rule="evenodd" />
            </svg>
            Thử lại
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .chat-message {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
      max-width: 85%;
    }

    .user-message {
      flex-direction: row-reverse;
      margin-left: auto;
    }

    .ai-message {
      margin-right: auto;
    }

    .message-avatar {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .user-avatar {
      background: #3b82f6;
      color: white;
    }

    .avatar-icon {
      width: 18px;
      height: 18px;
    }

    .avatar-icon.ai {
      color: #6b7280;
    }

    .message-content {
      flex: 1;
      min-width: 0;
    }

    .message-bubble {
      padding: 12px 16px;
      border-radius: 18px;
      line-height: 1.5;
      word-wrap: break-word;
    }

    .user-message .message-bubble {
      background: #3b82f6;
      color: white;
      border-bottom-right-radius: 4px;
    }

    .ai-message .message-bubble {
      background: #f3f4f6;
      color: #1f2937;
      border-bottom-left-radius: 4px;
    }

    .error-message .message-bubble {
      background: #fef2f2;
      border: 1px solid #fecaca;
    }

    .message-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
      padding: 0 4px;
    }

    .message-time {
      font-size: 11px;
      color: #9ca3af;
    }

    .error-indicator {
      font-size: 11px;
      color: #ef4444;
    }

    .retry-button {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-top: 8px;
      padding: 6px 12px;
      font-size: 13px;
      color: #3b82f6;
      background: transparent;
      border: 1px solid #3b82f6;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .retry-button:hover {
      background: #eff6ff;
    }

    .retry-icon {
      width: 14px;
      height: 14px;
    }

    /* Markdown styles inside message */
    .message-bubble :global(h1),
    .message-bubble :global(h2),
    .message-bubble :global(h3) {
      margin: 8px 0 4px;
      font-weight: 600;
    }

    .message-bubble :global(p) {
      margin: 0 0 8px;
    }

    .message-bubble :global(ul),
    .message-bubble :global(ol) {
      margin: 8px 0;
      padding-left: 20px;
    }

    .message-bubble :global(code) {
      background: rgba(0, 0, 0, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.9em;
    }

    .message-bubble :global(pre) {
      background: #1f2937;
      color: #f3f4f6;
      padding: 12px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 8px 0;
    }

    .message-bubble :global(pre code) {
      background: transparent;
      padding: 0;
    }

    .message-bubble :global(strong) {
      font-weight: 600;
    }

    .message-bubble :global(a) {
      color: inherit;
      text-decoration: underline;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatMessageComponent {
  // Inputs
  message = input.required<ChatMessage>();

  // Outputs
  retry = output<void>();

  // Computed
  isUserMessage = computed(() => this.message().sender === 'user');
  isError = computed(() => this.message().status === 'error');
  alignment = computed(() => getMessageAlignment(this.message()));

  renderedContent = computed(() => {
    const content = this.message().content;
    return this.isUserMessage() ? content : renderMarkdown(content);
  });

  formattedTime = computed(() => {
    return this.message().timestamp.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  });

  onRetry(): void {
    this.retry.emit();
  }
}
