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
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage } from '../../../domain/types';
import { renderMarkdown } from '../../../utils/markdown-renderer.util';
import { getMessageAlignment } from '../../../domain/entities/chat-message.entity';
import { ChatToastService } from '../chat-toast/chat-toast.component';

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
                <span class="sources-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                  </svg>
                </span>
                <span class="sources-title">Nguồn tham khảo ({{ sources().length }})</span>
                <span class="sources-toggle">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" [style.transform]="showSources() ? 'rotate(180deg)' : 'rotate(0)'">
                    <path d="M19 9l-7 7-7-7"/>
                  </svg>
                </span>
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
    /* ===== GEMINI/CHATGPT STYLE ===== */
    .chat-message {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      max-width: 100%;
    }

    /* User message: căn phải, width fit-content */
    .user-message {
      flex-direction: row-reverse;
      justify-content: flex-start;
    }

    .user-message .message-content {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    /* AI message: căn trái, full width */
    .ai-message {
      align-items: flex-start;
    }

    .message-avatar {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      margin-top: 2px;
    }

    .user-avatar {
      background: #E5E7EB;
      color: #374151;
    }

    .ai-message .message-avatar {
      background: linear-gradient(135deg, #0056D2 0%, #0040a0 100%);
      color: white;
    }

    .avatar-icon {
      width: 18px;
      height: 18px;
    }

    .avatar-icon.ai {
      color: white;
    }

    .message-content {
      flex: 1;
      min-width: 0;
    }

    /* User bubble: compact, fit-content */
    .user-message .message-content {
      max-width: 70%;
    }

    /* AI content: full width */
    .ai-message .message-content {
      max-width: 100%;
    }

    .message-bubble {
      line-height: 1.7;
      word-wrap: break-word;
      font-size: 15px;
    }

    /* User message: có background, rounded, compact */
    .user-message .message-bubble {
      display: inline-block;
      padding: 12px 16px;
      background: #F3F4F6;
      color: #1f2937;
      border-radius: 20px;
      border-bottom-right-radius: 6px;
      width: fit-content;
      max-width: 100%;
    }

    /* AI message: KHÔNG có background, viết thẳng xuống như Gemini */
    .ai-message .message-bubble {
      padding: 0;
      background: transparent;
      color: #1f2937;
      border-radius: 0;
    }

    .error-message .message-bubble {
      background: #fef2f2;
      border: 1px solid #fecaca;
      padding: 12px 16px;
      border-radius: 12px;
    }

    /* Sources Styles */
    .sources-container {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #E5E7EB;
    }

    .sources-header {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      user-select: none;
      color: #6b7280;
      font-size: 13px;
      font-weight: 500;
      padding: 8px 14px;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 20px;
      transition: all 0.2s ease;
    }

    .sources-header:hover {
      background: #F3F4F6;
      color: #374151;
    }

    .sources-toggle {
      width: 14px;
      height: 14px;
      transition: transform 0.2s ease;
    }

    .sources-toggle svg {
      width: 100%;
      height: 100%;
    }

    .sources-icon {
      width: 16px;
      height: 16px;
      color: #6b7280;
    }

    .sources-icon svg {
      width: 100%;
      height: 100%;
    }

    .sources-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 12px;
    }

    .source-card {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 12px 14px;
      font-size: 13px;
      transition: all 0.2s ease;
    }

    .source-card:hover {
      background: #F3F4F6;
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
      line-height: 1.5;
    }

    /* Footer & Actions */
    .message-footer {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 8px;
    }

    .user-message .message-footer {
      justify-content: flex-end;
    }

    .ai-message .message-footer {
      justify-content: flex-start;
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
      gap: 2px;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .chat-message:hover .message-actions {
      opacity: 1;
    }

    .action-btn {
      background: none;
      border: none;
      color: #9ca3af;
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      transition: all 0.2s ease;
    }

    .action-btn:hover {
      color: #374151;
      background-color: #F3F4F6;
    }

    .action-icon {
      width: 15px;
      height: 15px;
    }

    .error-indicator {
      font-size: 12px;
      color: #ef4444;
      font-weight: 500;
    }

    .error-actions {
      display: flex;
      gap: 10px;
      margin-top: 12px;
    }

    .retry-button,
    .dismiss-button {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 500;
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .retry-button {
      color: #0056D2;
      background: transparent;
      border: 1px solid #D1D5DB;
    }

    .retry-button:hover:not(:disabled) {
      background: #F3F4F6;
    }

    .retry-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .dismiss-button {
      color: #6b7280;
      background: transparent;
      border: 1px solid #E5E7EB;
    }

    .dismiss-button:hover {
      background: #F3F4F6;
    }

    .retry-icon {
      width: 14px;
      height: 14px;
    }

    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid #0056D2;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ===== CHATGPT/GEMINI STYLE TYPOGRAPHY ===== */
    
    /* Base text styling */
    .ai-message .message-bubble {
      font-size: 16px;
      line-height: 1.75;
      color: #0d0d0d;
      letter-spacing: -0.01em;
    }

    /* Headings - Clean and bold */
    .ai-message .message-bubble :global(h1),
    .ai-message .message-bubble :global(h2),
    .ai-message .message-bubble :global(h3),
    .ai-message .message-bubble :global(h4) {
      font-weight: 600;
      color: #0d0d0d;
      margin-top: 24px;
      margin-bottom: 12px;
      line-height: 1.4;
    }

    .ai-message .message-bubble :global(h1:first-child),
    .ai-message .message-bubble :global(h2:first-child),
    .ai-message .message-bubble :global(h3:first-child) {
      margin-top: 0;
    }

    .ai-message .message-bubble :global(h1) { font-size: 1.5em; }
    .ai-message .message-bubble :global(h2) { font-size: 1.25em; }
    .ai-message .message-bubble :global(h3) { font-size: 1.1em; }
    .ai-message .message-bubble :global(h4) { font-size: 1em; }

    /* Paragraphs - Comfortable reading */
    .ai-message .message-bubble :global(p) {
      margin: 0 0 16px;
      line-height: 1.75;
    }

    .ai-message .message-bubble :global(p:last-child) {
      margin-bottom: 0;
    }

    /* Lists - Clear hierarchy */
    .ai-message .message-bubble :global(ul),
    .ai-message .message-bubble :global(ol) {
      margin: 16px 0;
      padding-left: 28px;
    }

    .ai-message .message-bubble :global(li) {
      margin-bottom: 10px;
      line-height: 1.7;
      padding-left: 4px;
    }

    .ai-message .message-bubble :global(li:last-child) {
      margin-bottom: 0;
    }

    .ai-message .message-bubble :global(li > ul),
    .ai-message .message-bubble :global(li > ol) {
      margin-top: 8px;
      margin-bottom: 8px;
    }

    /* Inline code - Subtle highlight */
    .ai-message .message-bubble :global(code) {
      background: rgba(0, 0, 0, 0.05);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Söhne Mono', Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
      font-size: 0.875em;
      color: #0d0d0d;
    }

    /* Code blocks - Dark theme like ChatGPT */
    .ai-message .message-bubble :global(pre) {
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 16px 0;
      font-size: 14px;
      line-height: 1.6;
      font-family: 'Söhne Mono', Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
    }

    .ai-message .message-bubble :global(pre code) {
      background: transparent;
      padding: 0;
      color: inherit;
      font-size: inherit;
    }

    /* Bold text */
    .ai-message .message-bubble :global(strong),
    .ai-message .message-bubble :global(b) {
      font-weight: 600;
      color: #0d0d0d;
    }

    /* Italic text */
    .ai-message .message-bubble :global(em),
    .ai-message .message-bubble :global(i) {
      font-style: italic;
    }

    /* Links */
    .ai-message .message-bubble :global(a) {
      color: #0066cc;
      text-decoration: none;
      border-bottom: 1px solid transparent;
      transition: border-color 0.2s;
    }
    
    .ai-message .message-bubble :global(a:hover) {
      border-bottom-color: #0066cc;
    }

    /* Blockquote - Elegant styling */
    .ai-message .message-bubble :global(blockquote) {
      margin: 16px 0;
      padding: 12px 20px;
      background: #f7f7f8;
      border-left: 4px solid #10a37f;
      border-radius: 0 8px 8px 0;
      color: #374151;
      font-style: italic;
    }

    .ai-message .message-bubble :global(blockquote p) {
      margin: 0;
    }

    /* Horizontal rule */
    .ai-message .message-bubble :global(hr) {
      border: none;
      border-top: 1px solid #e5e5e5;
      margin: 24px 0;
    }

    /* Table Styles - Clean and readable */
    .ai-message .message-bubble :global(table) {
      border-collapse: collapse;
      width: 100%;
      margin: 16px 0;
      font-size: 14px;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      overflow: hidden;
    }

    .ai-message .message-bubble :global(th),
    .ai-message .message-bubble :global(td) {
      border: 1px solid #e5e5e5;
      padding: 12px 16px;
      text-align: left;
    }

    .ai-message .message-bubble :global(th) {
      background: #f7f7f8;
      font-weight: 600;
      color: #0d0d0d;
    }

    .ai-message .message-bubble :global(tr:nth-child(even) td) {
      background: #fafafa;
    }

    /* Definition lists */
    .ai-message .message-bubble :global(dl) {
      margin: 16px 0;
    }

    .ai-message .message-bubble :global(dt) {
      font-weight: 600;
      margin-top: 12px;
    }

    .ai-message .message-bubble :global(dd) {
      margin-left: 20px;
      margin-top: 4px;
    }

    /* Images */
    .ai-message .message-bubble :global(img) {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 16px 0;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatMessageComponent {
  private readonly toastService = inject(ChatToastService);

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
      this.toastService.success('Đã sao chép vào clipboard!');
    }).catch(() => {
      this.toastService.error('Không thể sao chép');
    });
  }

  onRegenerate(): void {
    this.regenerate.emit();
  }
}
