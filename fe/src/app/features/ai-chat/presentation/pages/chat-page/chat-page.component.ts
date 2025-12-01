/**
 * ChatPageComponent
 * Full-page chat interface with complete history and sources
 */
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  ElementRef,
  viewChild,
  afterNextRender,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../../application/services/chat.service';
import { SessionManagementService } from '../../../application/services/session-management.service';
import { ChatMessageComponent } from '../../components/chat-message/chat-message.component';
import { ChatMessageInputComponent } from '../../components/chat-message-input/chat-message-input.component';
import { TypingIndicatorComponent } from '../../components/typing-indicator/typing-indicator.component';
import { SuggestedQuestionsComponent } from '../../components/suggested-questions/suggested-questions.component';
import { SourceCitationComponent } from '../../components/source-citation/source-citation.component';
import { AuthService } from '../../../../../core/services/auth.service';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [
    CommonModule,
    ChatMessageComponent,
    ChatMessageInputComponent,
    TypingIndicatorComponent,
    SuggestedQuestionsComponent,
    SourceCitationComponent,
  ],
  template: `
    <div class="chat-page">
      <!-- Header -->
      <header class="chat-header">
        <div class="header-content">
          <div class="header-title">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="header-icon">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
            <div>
              <h1>Trợ lý AI Hàng Hải</h1>
              <p class="header-subtitle">Hỏi đáp về COLREGs, luật hàng hải và kỹ thuật tàu biển</p>
            </div>
          </div>
          <button class="new-chat-button" (click)="onNewChat()">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Cuộc trò chuyện mới
          </button>
        </div>
      </header>

      <!-- Main Content -->
      <div class="chat-main">
        <!-- Messages Area -->
        <div class="messages-container" #messagesContainer>
          @if (chatService.messages().length === 0) {
            <div class="empty-state">
              <div class="empty-icon">🚢</div>
              <h2>Xin chào{{ userName() ? ', ' + userName() : '' }}!</h2>
              <p>Tôi là trợ lý AI chuyên về lĩnh vực hàng hải. Tôi có thể giúp bạn với:</p>
              <ul class="help-topics">
                <li>📚 Quy tắc phòng ngừa va chạm trên biển (COLREGs)</li>
                <li>⚓ Luật hàng hải quốc tế và Việt Nam</li>
                <li>🛳️ Kỹ thuật vận hành và bảo dưỡng tàu biển</li>
                <li>🌊 An toàn hàng hải và cứu hộ cứu nạn</li>
              </ul>
              <p class="start-hint">Hãy đặt câu hỏi để bắt đầu!</p>
            </div>
          } @else {
            <div class="messages-list">
              @for (message of chatService.messages(); track message.id) {
                <app-chat-message
                  [message]="message"
                  (retry)="onRetry()"
                />
                @if (message.sender === 'ai' && message.metadata?.sources?.length) {
                  <app-source-citation [sources]="message.metadata!.sources!" />
                }
              }

              @if (chatService.isTyping()) {
                <app-typing-indicator />
              }
            </div>
          }
        </div>

        <!-- Suggested Questions -->
        @if (chatService.suggestedQuestions().length > 0) {
          <div class="suggestions-area">
            <app-suggested-questions
              [questions]="chatService.suggestedQuestions()"
              (questionSelected)="onSuggestionClick($event)"
            />
          </div>
        }

        <!-- Service Status -->
        @if (!chatService.serviceState().isHealthy) {
          <div class="service-warning">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
            </svg>
            <span>Dịch vụ AI đang không khả dụng. Vui lòng thử lại sau.</span>
            <button (click)="chatService.checkHealth()">Kiểm tra lại</button>
          </div>
        }

        <!-- Error Message -->
        @if (chatService.error()) {
          <div class="error-banner">
            <span>{{ chatService.error() }}</span>
            <button (click)="chatService.clearError()">Đóng</button>
          </div>
        }

        <!-- Input Area -->
        <div class="input-area">
          <app-chat-message-input
            placeholder="Nhập câu hỏi về hàng hải..."
            [isLoading]="chatService.isLoading()"
            (messageSent)="onSendMessage($event)"
          />
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chat-page {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: #f9fafb;
    }

    .chat-header {
      background: white;
      border-bottom: 1px solid #e5e7eb;
      padding: 16px 24px;
    }

    .header-content {
      max-width: 900px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-icon {
      width: 48px;
      height: 48px;
      color: #3b82f6;
    }

    .header-title h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #1f2937;
    }

    .header-subtitle {
      margin: 4px 0 0;
      font-size: 14px;
      color: #6b7280;
    }

    .new-chat-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 500;
      color: white;
      background: #3b82f6;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .new-chat-button:hover {
      background: #2563eb;
    }

    .new-chat-button svg {
      width: 18px;
      height: 18px;
    }

    .chat-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      max-width: 900px;
      width: 100%;
      margin: 0 auto;
      padding: 0 24px;
      overflow: hidden;
    }

    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 24px 0;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 48px 24px;
      color: #4b5563;
    }

    .empty-icon {
      font-size: 64px;
      margin-bottom: 24px;
    }

    .empty-state h2 {
      margin: 0 0 12px;
      font-size: 24px;
      color: #1f2937;
    }

    .empty-state p {
      margin: 0 0 16px;
      font-size: 16px;
      line-height: 1.5;
    }

    .help-topics {
      list-style: none;
      padding: 0;
      margin: 0 0 24px;
      text-align: left;
    }

    .help-topics li {
      padding: 8px 0;
      font-size: 15px;
    }

    .start-hint {
      font-size: 14px;
      color: #9ca3af;
    }

    .messages-list {
      display: flex;
      flex-direction: column;
    }

    .suggestions-area {
      padding: 12px 0;
      border-top: 1px solid #e5e7eb;
    }

    .service-warning {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: #fef3c7;
      color: #92400e;
      border-radius: 8px;
      margin-bottom: 12px;
    }

    .service-warning svg {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .service-warning span {
      flex: 1;
      font-size: 14px;
    }

    .service-warning button {
      padding: 6px 12px;
      font-size: 13px;
      color: #92400e;
      background: transparent;
      border: 1px solid #92400e;
      border-radius: 6px;
      cursor: pointer;
    }

    .error-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: #fef2f2;
      color: #dc2626;
      border-radius: 8px;
      margin-bottom: 12px;
      font-size: 14px;
    }

    .error-banner button {
      padding: 4px 12px;
      font-size: 13px;
      color: #dc2626;
      background: transparent;
      border: 1px solid #dc2626;
      border-radius: 4px;
      cursor: pointer;
    }

    .input-area {
      padding: 16px 0 24px;
      background: #f9fafb;
    }

    @media (max-width: 767px) {
      .chat-header {
        padding: 12px 16px;
      }

      .header-content {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .header-icon {
        width: 36px;
        height: 36px;
      }

      .header-title h1 {
        font-size: 18px;
      }

      .new-chat-button {
        width: 100%;
        justify-content: center;
      }

      .chat-main {
        padding: 0 16px;
      }

      .empty-state {
        padding: 24px 16px;
      }

      .empty-icon {
        font-size: 48px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatPageComponent implements OnInit {
  readonly chatService = inject(ChatService);
  private readonly sessionService = inject(SessionManagementService);
  private readonly authService = inject(AuthService);

  // State
  userName = signal<string>('');

  // View child
  messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

  constructor() {
    afterNextRender(() => {
      this.scrollToBottom();
    });
  }

  ngOnInit(): void {
    // Set user info
    const user = this.authService.currentUser();
    if (user) {
      this.userName.set(user.fullName || '');
      this.sessionService.setUser(user.id, user.role || 'student');
    }

    // Update context
    this.sessionService.updateContextFromRoute();
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

  onNewChat(): void {
    this.chatService.startNewSession();
  }

  private scrollToBottom(): void {
    const container = this.messagesContainer();
    if (container) {
      container.nativeElement.scrollTop = container.nativeElement.scrollHeight;
    }
  }
}
