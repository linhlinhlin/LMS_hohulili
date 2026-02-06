/**
 * ChatPanelComponent
 * Popup chat panel with messages, input, and suggestions
 * Inspired by Notion's chat panel design
 */
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  output,
  signal,
  computed,
  HostListener,
  ElementRef,
  viewChild,
  afterNextRender,
} from '@angular/core';

import { Router } from '@angular/router';
import { ChatService } from '../../../application/services/chat.service';
import { ChatMessageComponent } from '../chat-message/chat-message.component';
import { ChatMessageInputComponent } from '../chat-message-input/chat-message-input.component';
import { TypingIndicatorComponent } from '../typing-indicator/typing-indicator.component';
import { SuggestedQuestionsComponent } from '../suggested-questions/suggested-questions.component';

@Component({
  selector: 'app-chat-panel',
  imports: [
    ChatMessageComponent,
    ChatMessageInputComponent,
    TypingIndicatorComponent,
    SuggestedQuestionsComponent
],
  template: `
    <div
      class="chat-panel"
      [class.mobile]="isMobile()"
      [class.visible]="isVisible()"
    >
      <!-- Header -->
      <div class="panel-header">
        <div class="header-title">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="header-icon">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
          <span>Trợ lý AI Hàng Hải</span>
        </div>
        <div class="header-actions">
          <button class="expand-button" (click)="onExpand()" title="Mở rộng">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.28 7.78l3.22-3.22v2.69a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.69l-3.22 3.22a.75.75 0 001.06 1.06zM2 17.25v-4.5a.75.75 0 011.5 0v2.69l3.22-3.22a.75.75 0 011.06 1.06L4.56 16.5h2.69a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75z" />
            </svg>
          </button>
          <button class="close-button" (click)="onClose()" title="Đóng">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Messages Area -->
      <div class="panel-messages" #messagesContainer>
        <!-- Cold Start Notice -->
        @if (chatService.serviceState().coldStartDetected) {
          <div class="cold-start-notice">
            <span class="icon">⏳</span>
            <span>Server đang khởi động, có thể mất 20-30 giây cho lần đầu...</span>
          </div>
        }

        @if (chatService.messages().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">🚢</div>
            <h3>Xin chào!</h3>
            <p>Tôi là trợ lý AI chuyên về hàng hải. Hãy hỏi tôi về COLREGs, luật hàng hải, hoặc bất kỳ chủ đề nào liên quan!</p>
          </div>
        } @else {
          @for (message of chatService.messages(); track message.id; let i = $index) {
            <app-chat-message
              [message]="message"
              [isStreaming]="chatService.isStreaming() && i === chatService.messages().length - 1"
              [streamingThinking]="i === chatService.messages().length - 1 ? chatService.streamingThinking() : ''"
              (retry)="onRetry()"
            />
          }
        }


        @if (chatService.isTyping()) {
          <app-typing-indicator />
        }
      </div>

      <!-- Suggested Questions -->
      @if (chatService.suggestedQuestions().length > 0) {
        <div class="panel-suggestions">
          <app-suggested-questions
            [questions]="chatService.suggestedQuestions()"
            (questionSelected)="onSuggestionClick($event)"
          />
        </div>
      }

      <!-- Error Message -->
      @if (chatService.error()) {
        <div class="panel-error">
          <span>{{ chatService.error() }}</span>
          <button (click)="chatService.clearError()">Đóng</button>
        </div>
      }

      <!-- Extended Loading Indicator -->
      @if (chatService.isLoading() && chatService.loadingTime() > 5000) {
        <div class="extended-loading">
          <span>Đang xử lý, vui lòng đợi...</span>
          <span class="time">{{ formatLoadingTime(chatService.loadingTime()) }}</span>
        </div>
      }

      <!-- Input Area -->
      <app-chat-message-input
        [isLoading]="chatService.isLoading()"
        (messageSent)="onSendMessage($event)"
      />
    </div>
  `,
  styles: [`
    .chat-panel {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 380px;
      height: 520px;
      max-height: calc(100vh - 120px);
      display: flex;
      flex-direction: column;
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
      overflow: hidden;
      z-index: 999;
      opacity: 0;
      transform: translateY(20px) scale(0.95);
      pointer-events: none;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .chat-panel.visible {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }

    .chat-panel.mobile {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      height: 100%;
      max-height: 100%;
      border-radius: 0;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 15px;
      font-weight: 600;
    }

    .header-icon {
      width: 24px;
      height: 24px;
    }

    .header-actions {
      display: flex;
      gap: 4px;
    }

    .expand-button,
    .close-button {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.15);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .expand-button:hover,
    .close-button:hover {
      background: rgba(255, 255, 255, 0.25);
    }

    .expand-button svg,
    .close-button svg {
      width: 16px;
      height: 16px;
    }

    .panel-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
    }

    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 24px;
      color: #6b7280;
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .empty-state h3 {
      margin: 0 0 8px;
      font-size: 18px;
      color: #1f2937;
    }

    .empty-state p {
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
    }

    .panel-suggestions {
      padding: 0 16px;
      border-top: 1px solid #e5e7eb;
    }

    .panel-error {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      background: #fef2f2;
      color: #dc2626;
      font-size: 13px;
    }

    .panel-error button {
      padding: 4px 8px;
      font-size: 12px;
      color: #dc2626;
      background: transparent;
      border: 1px solid #dc2626;
      border-radius: 4px;
      cursor: pointer;
    }

    /* Cold Start & Loading Styles */
    .cold-start-notice {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: #fff7ed;
      color: #c2410c;
      font-size: 12px;
      border-bottom: 1px solid #ffedd5;
    }

    .extended-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 8px;
      font-size: 12px;
      color: #6b7280;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
    }

    .extended-loading .time {
      font-weight: 600;
      color: #3b82f6;
    }

    @media (max-width: 767px) {
      .chat-panel {
        bottom: 0;
        right: 0;
      }

      .expand-button {
        display: none;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatPanelComponent {
  readonly chatService = inject(ChatService);
  private readonly router = inject(Router);

  // Outputs
  closePanel = output<void>();
  expandPanel = output<void>();

  // State
  isVisible = signal(true);
  isMobile = signal(false);

  // View child
  messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

  constructor() {
    this.checkMobile();

    afterNextRender(() => {
      this.scrollToBottom();
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkMobile();
  }

  private checkMobile(): void {
    if (typeof window !== 'undefined') {
      this.isMobile.set(window.innerWidth < 768);
    }
  }

  onSendMessage(message: string): void {
    this.chatService.sendMessage(message);
    setTimeout(() => this.scrollToBottom(), 100);
  }

  onSuggestionClick(question: string): void {
    this.chatService.sendSuggestedQuestion(question);
    setTimeout(() => this.scrollToBottom(), 100);
  }

  onRetry(): void {
    this.chatService.retryLastMessage();
  }

  onClose(): void {
    this.closePanel.emit();
  }

  onExpand(): void {
    this.expandPanel.emit();
    // Navigate to chat page
    this.router.navigate(['/ai-chat']);
  }

  private scrollToBottom(): void {
    const container = this.messagesContainer();
    if (container) {
      container.nativeElement.scrollTop = container.nativeElement.scrollHeight;
    }
  }

  formatLoadingTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  }
}
