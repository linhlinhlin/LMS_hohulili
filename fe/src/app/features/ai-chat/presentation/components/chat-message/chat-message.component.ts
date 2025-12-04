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
  signal,
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
        <div class="message-bubble">
          <!-- Main Content -->
          <div [innerHTML]="renderedContent()"></div>

          <!-- Sources (AI only) -->
          @if (!isUserMessage() && hasSources()) {
            <div class="sources-container">
              <div class="sources-header" (click)="toggleSources()">
                <span class="sources-icon">📚</span>
                <span class="sources-title">Nguồn tham khảo ({{ sources().length }})</span>
                <span class="sources-toggle">{{ showSources() ? '▼' : '▶' }}</span>
              </div>
              
              @if (showSources()) {
                <div class="sources-list">
                  @for (source of sources(); track $index) {
                    <div class="source-card">
                      <div class="source-title">{{ source.title }}</div>
                      <div class="source-snippet">{{ source.content }}</div>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>

        <!-- Metadata & Actions -->
        <div class="message-footer">
          <div class="message-meta">
            <span class="message-time">{{ formattedTime() }}</span>
            @if (isError()) {
              <span class="error-indicator">Gửi thất bại</span>
            }
          </div>

          <!-- Actions (Copy, Regenerate) -->
          <div class="message-actions">
            <button class="action-btn" (click)="onCopy()" title="Sao chép">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="action-icon">
                <path d="M8 4v12a2 2 0 002 2h8a2 2 0 002-2V7.242a2 2 0 00-.602-1.43L16.083 2.57A2 2 0 0014.685 2H10a2 2 0 00-2 2z" />
                <path d="M16 18v2a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h2" />
              </svg>
            </button>
            
            @if (!isUserMessage()) {
              <button class="action-btn" (click)="onRegenerate()" title="Tạo lại câu trả lời">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="action-icon">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            }
          </div>
        </div>

        <!-- Retry button for error messages -->
        @if (isError()) {
          <div class="error-actions">
            <button 
              class="retry-button" 
              (click)="onRetry()"
              [disabled]="isRetrying()"
            >
              @if (isRetrying()) {
                <span class="spinner"></span>
                Đang thử lại...
              } @else {
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="retry-icon">
                  <path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clip-rule="evenodd" />
                </svg>
                Thử lại
              }
            </button>
            <button class="dismiss-button" (click)="onDismiss()">
              Bỏ qua
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .chat-message {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
      max-width: 90%;
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
      overflow: hidden;
    }

    .user-avatar {
      background: #0a192f; /* Deep Blue */
      color: white;
    }

    .avatar-icon {
      width: 18px;
      height: 18px;
    }

    .avatar-icon.ai {
      color: #0a192f; /* Deep Blue for AI icon */
    }

    .message-content {
      flex: 1;
      min-width: 0;
    }

    .message-bubble {
      padding: 12px 16px;
      border-radius: 12px;
      line-height: 1.6;
      word-wrap: break-word;
      font-size: 0.95rem;
    }

    .user-message .message-bubble {
      background: #0a192f; /* Deep Blue for user message */
      color: #ffffff;
      border-bottom-right-radius: 4px;
    }

    .ai-message .message-bubble {
      background: transparent;
      color: #1f2937;
      padding-left: 0;
    }

    .error-message .message-bubble {
      background: #fef2f2;
      border: 1px solid #fecaca;
    }

    /* Sources Styles */
    .sources-container {
      margin-top: 16px;
      border-top: 1px solid #e5e7eb;
      padding-top: 12px;
    }

    .sources-header {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      user-select: none;
      color: #4b5563;
      font-size: 0.85rem;
      font-weight: 500;
    }

    .sources-header:hover {
      color: #112240;
    }

    .sources-toggle {
      font-size: 0.7rem;
      margin-left: auto;
    }

    .sources-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 12px;
    }

    .source-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 10px;
      font-size: 0.85rem;
    }

    .source-title {
      font-weight: 600;
      color: #111827;
      margin-bottom: 4px;
    }

    .source-snippet {
      color: #6b7280;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* Footer & Actions */
    .message-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 4px;
      padding: 0 4px;
    }

    .message-meta {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .message-time {
      font-size: 11px;
      color: #9ca3af;
    }

    .message-actions {
      display: flex;
      gap: 8px;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .chat-message:hover .message-actions {
      opacity: 1;
    }

    .action-btn {
      background: none;
      border: none;
      color: #9ca3af;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .action-btn:hover {
      color: #374151;
      background-color: #f3f4f6;
    }

    .action-icon {
      width: 14px;
      height: 14px;
    }

    .error-indicator {
      font-size: 11px;
      color: #ef4444;
    }

    .error-actions {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }

    .retry-button,
    .dismiss-button {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      font-size: 13px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .retry-button {
      color: #0a192f;
      background: transparent;
      border: 1px solid #0a192f;
    }

    .retry-button:hover:not(:disabled) {
      background: #e6f1ff;
    }

    .retry-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .dismiss-button {
      color: #6b7280;
      background: transparent;
      border: 1px solid #e5e7eb;
    }

    .dismiss-button:hover {
      background: #f9fafb;
      color: #374151;
    }

    .retry-icon {
      width: 14px;
      height: 14px;
    }

    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid #0a192f;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Markdown styles inside message */
    .message-bubble :global(h1),
    .message-bubble :global(h2),
    .message-bubble :global(h3) {
      margin: 16px 0 8px;
      font-weight: 600;
      color: #111827;
    }

    .message-bubble :global(p) {
      margin: 0 0 12px;
    }

    .message-bubble :global(ul),
    .message-bubble :global(ol) {
      margin: 12px 0;
      padding-left: 24px;
    }

    .message-bubble :global(li) {
      margin-bottom: 4px;
    }

    .message-bubble :global(code) {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.9em;
      color: #e11d48; /* Red-pink for code */
    }

    .message-bubble :global(pre) {
      background: #112240; /* Dark Blue for code blocks */
      color: #e6f1ff;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 16px 0;
    }

    .message-bubble :global(pre code) {
      background: transparent;
      padding: 0;
      color: inherit;
    }

    .message-bubble :global(strong) {
      font-weight: 600;
      color: inherit;
    }

    .message-bubble :global(a) {
      color: #2563eb;
      text-decoration: none;
    }
    
    .message-bubble :global(a:hover) {
      text-decoration: underline;
    }

    /* Table Styles */
    .message-bubble :global(table) {
      border-collapse: collapse;
      width: 100%;
      margin: 16px 0;
      font-size: 0.9em;
    }

    .message-bubble :global(th),
    .message-bubble :global(td) {
      border: 1px solid #e5e7eb;
      padding: 8px 12px;
      text-align: left;
    }

    .message-bubble :global(th) {
      background: #f9fafb;
      font-weight: 600;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatMessageComponent {
  // Inputs
  message = input.required<ChatMessage>();

  // Outputs
  retry = output<void>();
  dismiss = output<void>();
  regenerate = output<void>();

  // Signals
  isRetrying = signal(false);
  showSources = signal(false);

  // Computed
  isUserMessage = computed(() => this.message().sender === 'user');
  isError = computed(() => this.message().status === 'error');
  alignment = computed(() => getMessageAlignment(this.message()));

  sources = computed(() => this.message().metadata?.sources || []);
  hasSources = computed(() => this.sources().length > 0);

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
    this.isRetrying.set(true);
    this.retry.emit();
  }

  onDismiss(): void {
    this.dismiss.emit();
  }

  toggleSources(): void {
    this.showSources.update(v => !v);
  }

  onCopy(): void {
    navigator.clipboard.writeText(this.message().content).then(() => {
      // Optional: Show toast or tooltip
    });
  }

  onRegenerate(): void {
    this.regenerate.emit();
  }
}
