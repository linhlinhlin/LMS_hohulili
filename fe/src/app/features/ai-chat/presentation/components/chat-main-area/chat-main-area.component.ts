import { Component, input, output, viewChild, ElementRef, AfterViewChecked, OnChanges, OnDestroy, ChangeDetectionStrategy } from '@angular/core';

import { ChatMessage } from '../../../domain/types';
import { ChatMessageComponent } from '../chat-message/chat-message.component';
import { ChatMessageInputComponent } from '../chat-message-input/chat-message-input.component';
import { SourceCitationComponent } from '../source-citation/source-citation.component';
import { SourcePanelComponent } from '../source-panel/source-panel.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-chat-main-area',
  imports: [ChatMessageComponent, ChatMessageInputComponent, SourceCitationComponent, SourcePanelComponent],
  template: `
    <div class="chat-container">
      <!-- Main Chat Area -->
      <div class="chat-area">
        <!-- Scrollable Messages Area -->
        <div class="messages-scroll" #scrollContainer>
          <div class="messages-inner">
            @if (messages().length > 0) {
              <!-- Each message with its source citation directly below -->
              @for (msg of messages(); track msg.id; let i = $index) {
              <app-chat-message
                [message]="msg"
                [isStreaming]="isStreaming() && i === messages().length - 1"
                [streamingThinking]="i === messages().length - 1 ? streamingThinking() : ''"
                (retry)="onRetry(msg)"
                (regenerate)="onRegenerate(msg)"
              ></app-chat-message>
              <!-- Source Citations - Displayed directly after its AI message -->
              @if (msg.sender === 'ai' && msg.metadata?.sources?.length) {
              <app-source-citation 
                [sources]="msg.metadata!.sources!"
              ></app-source-citation>
              }
            }
            
            <!-- Loading Indicator - Only show when loading AND NOT streaming -->
            @if (isLoading() && !isStreaming()) {
            <div class="thinking-indicator">
              <div class="thinking-avatar">
                <svg class="avatar-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L13.09 8.26L19 6L14.74 10.91L21 12L14.74 13.09L19 18L13.09 15.74L12 22L10.91 15.74L5 18L9.26 13.09L3 12L9.26 10.91L5 6L10.91 8.26L12 2Z" fill="currentColor"/>
                </svg>
              </div>
              <div class="thinking-content">
                <div class="thinking-dots">
                  <div class="dot"></div>
                  <div class="dot"></div>
                  <div class="dot"></div>
                </div>
                <span class="thinking-text">{{ thinkingSteps[currentThinkingStep] }}</span>
              </div>
            </div>
            }

            <!-- Suggested Questions -->
            @if (!isLoading() && suggestedQuestions().length > 0) {
            <div class="suggestions-section">
              <div class="suggestions-label">Câu hỏi gợi ý:</div>
              <div class="suggestions-list">
                @for (question of suggestedQuestions(); track question) {
                <button 
                  class="suggestion-btn"
                  (click)="onSelectSuggestion(question)"
                >
                  {{ question }}
                </button>
                }
              </div>
            </div>
            }
            } @else {
            <div class="welcome-container">
              <!-- Welcome Header -->
              <div class="welcome-header">
                <div class="welcome-icon-box">
                  <svg class="welcome-icon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="24" cy="24" r="22" stroke="currentColor" stroke-width="2" fill="none"/>
                    <circle cx="24" cy="24" r="18" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2" fill="none"/>
                    <path d="M24 4V8M24 40V44M4 24H8M40 24H44" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M24 12L27 24L24 36L21 24L24 12Z" fill="currentColor"/>
                    <path d="M12 24L24 21L36 24L24 27L12 24Z" fill="currentColor" opacity="0.6"/>
                    <circle cx="24" cy="24" r="3" fill="currentColor"/>
                  </svg>
                </div>
                <h1 class="welcome-title">Trợ lý AI Hàng hải</h1>
                <p class="welcome-subtitle">Hệ thống hỗ trợ học tập thông minh cho ngành Hàng hải</p>
              </div>

              <!-- Quick Actions -->
              <div class="quick-actions">
                <span class="actions-label">Bắt đầu với các chủ đề phổ biến</span>
                <div class="actions-grid">
                  <button class="action-card" (click)="onSelectSuggestion('Giải thích quy tắc 15 COLREGs về tình huống cắt nhau')">
                    <div class="action-icon-box">
                      <svg class="action-icon" viewBox="0 0 24 24" fill="none">
                        <path d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                    <div class="action-text">
                      <span class="action-title">Quy tắc COLREGs</span>
                      <span class="action-desc">Luật tránh va trên biển</span>
                    </div>
                  </button>

                  <button class="action-card" (click)="onSelectSuggestion('SOLAS là gì và các yêu cầu quan trọng về an toàn sinh mạng?')">
                    <div class="action-icon-box">
                      <svg class="action-icon" viewBox="0 0 24 24" fill="none">
                        <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                    <div class="action-text">
                      <span class="action-title">Công ước SOLAS</span>
                      <span class="action-desc">An toàn sinh mạng trên biển</span>
                    </div>
                  </button>

                  <button class="action-card" (click)="onSelectSuggestion('Hệ thống phao báo hiệu IALA gồm những loại nào?')">
                    <div class="action-icon-box">
                      <svg class="action-icon" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                        <path d="M12 2V6M12 18V22M2 12H6M18 12H22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <path d="M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                      </svg>
                    </div>
                    <div class="action-text">
                      <span class="action-title">Phao báo hiệu</span>
                      <span class="action-desc">Hệ thống phao IALA</span>
                    </div>
                  </button>

                  <button class="action-card" (click)="onSelectSuggestion('Giải thích các tín hiệu đèn hàng hải ban đêm')">
                    <div class="action-icon-box">
                      <svg class="action-icon" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2V4M12 20V22M4 12H2M6.31 6.31L4.9 4.9M17.69 6.31L19.1 4.9M6.31 17.69L4.9 19.1M17.69 17.69L19.1 19.1M22 12H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/>
                      </svg>
                    </div>
                    <div class="action-text">
                      <span class="action-title">Tín hiệu đèn</span>
                      <span class="action-desc">Nhận dạng tàu ban đêm</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
            }
        </div>
      </div>

      <!-- Fixed Input Area -->
      <div class="input-section">
        <div class="input-container">
          <app-chat-message-input
            [isLoading]="isLoading()"
            (messageSent)="onSendMessage($event)"
          ></app-chat-message-input>
        </div>
        <div class="disclaimer">
          <svg class="disclaimer-icon" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM7 4.5a1 1 0 112 0v3a1 1 0 01-2 0v-3zm1 7a1 1 0 100-2 1 1 0 000 2z"/>
          </svg>
          AI có thể mắc lỗi. Hãy kiểm tra lại thông tin quan trọng với các nguồn chính thức.
        </div>
      </div>
      </div>

      <!-- Source Panel Sidebar - Inline -->
      <app-source-panel></app-source-panel>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      overflow: hidden;
    }

    .chat-container {
      display: flex;
      height: 100%;
      width: 100%;
    }

    .chat-area {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #F8FAFC;
      transition: flex 0.3s ease;
    }

    /* ===== SCROLLABLE MESSAGES ===== */
    .messages-scroll {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      scroll-behavior: smooth;
    }

    .messages-inner {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px 20px 40px;
    }

    /* ===== FIXED INPUT SECTION ===== */
    .input-section {
      flex-shrink: 0;
      background: #FFFFFF;
      border-top: 1px solid #E2E8F0;
      padding: 16px 24px 12px;
    }

    .input-container {
      max-width: 800px;
      margin: 0 auto;
    }

    .disclaimer {
      max-width: 800px;
      margin: 10px auto 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 0.75rem;
      color: #94A3B8;
    }

    .disclaimer-icon {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }

    /* ===== WELCOME SCREEN ===== */
    .welcome-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      padding: 48px 24px;
      text-align: center;
      animation: fadeInUp 0.6s ease-out;
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .welcome-header {
      margin-bottom: 48px;
    }

    .welcome-icon-box {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 80px;
      height: 80px;
      margin-bottom: 24px;
      background: linear-gradient(135deg, #0369A1 0%, #0284C7 100%);
      border-radius: 20px;
      box-shadow: 0 8px 32px rgba(3, 105, 161, 0.25);
    }

    .welcome-icon {
      width: 48px;
      height: 48px;
      color: white;
    }

    .welcome-title {
      font-size: 1.875rem;
      font-weight: 700;
      color: #0F172A;
      margin: 0 0 8px 0;
      letter-spacing: -0.025em;
    }

    .welcome-subtitle {
      font-size: 1rem;
      color: #64748B;
      margin: 0;
      max-width: 400px;
    }

    /* ===== QUICK ACTIONS ===== */
    .quick-actions {
      width: 100%;
      max-width: 720px;
    }

    .actions-label {
      display: block;
      font-size: 0.875rem;
      color: #64748B;
      font-weight: 500;
      margin-bottom: 16px;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    @media (min-width: 640px) {
      .actions-grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }

    @media (max-width: 480px) {
      .actions-grid {
        grid-template-columns: 1fr;
      }
    }

    .action-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
      padding: 20px 16px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: left;
    }

    .action-card:hover {
      border-color: #0284C7;
      box-shadow: 0 4px 16px rgba(2, 132, 199, 0.12);
      transform: translateY(-2px);
    }

    .action-icon-box {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #F0F9FF;
      border-radius: 10px;
    }

    .action-icon {
      width: 24px;
      height: 24px;
      color: #0369A1;
    }

    .action-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .action-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #0F172A;
    }

    .action-desc {
      font-size: 0.75rem;
      color: #94A3B8;
    }

    /* ===== THINKING INDICATOR ===== */
    .thinking-indicator {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      margin-bottom: 16px;
    }

    .thinking-avatar {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, #0369A1 0%, #0284C7 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .avatar-icon {
      width: 20px;
      height: 20px;
      color: white;
    }

    .thinking-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .thinking-dots {
      display: flex;
      gap: 4px;
    }

    .dot {
      width: 8px;
      height: 8px;
      background-color: #0369A1;
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out both;
    }

    .dot:nth-child(1) { animation-delay: -0.32s; }
    .dot:nth-child(2) { animation-delay: -0.16s; }

    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
      40% { transform: scale(1); opacity: 1; }
    }

    .thinking-text {
      font-size: 0.875rem;
      color: #64748B;
    }

    /* ===== SUGGESTIONS ===== */
    .suggestions-section {
      padding: 16px 0;
      margin-top: 8px;
    }

    .suggestions-label {
      font-size: 0.8rem;
      color: #64748B;
      margin-bottom: 10px;
      font-weight: 500;
    }

    .suggestions-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .suggestion-btn {
      padding: 8px 16px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 20px;
      cursor: pointer;
      font-size: 0.875rem;
      color: #334155;
      transition: all 0.2s;
    }

    .suggestion-btn:hover {
      background: #F0F9FF;
      border-color: #0284C7;
      color: #0369A1;
    }
  `]
})
export class ChatMainAreaComponent implements AfterViewChecked, OnChanges, OnDestroy {
  // Signal inputs (Angular v20+)
  readonly messages = input<ChatMessage[]>([]);
  readonly isLoading = input<boolean>(false);
  readonly isStreaming = input<boolean>(false);
  readonly streamingThinking = input<string>('');
  readonly suggestedQuestions = input<string[]>([]);

  // Output functions (Angular v20+)
  readonly sendMessage = output<string>();
  readonly selectSuggestion = output<string>();
  readonly regenerate = output<void>();

  // ViewChild signal (Angular v20+)
  private readonly scrollContainer = viewChild<ElementRef>('scrollContainer');

  thinkingSteps = [
    'Đang tìm kiếm trong cơ sở tri thức...',
    'Đang phân tích ngữ cảnh...',
    'Đang tổng hợp câu trả lời...'
  ];
  currentThinkingStep = 0;
  private thinkingInterval: any;

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  ngOnChanges() {
    if (this.isLoading()) {
      this.startThinkingAnimation();
    } else {
      this.stopThinkingAnimation();
    }
  }

  ngOnDestroy() {
    this.stopThinkingAnimation();
  }

  private startThinkingAnimation() {
    if (this.thinkingInterval) return;
    this.currentThinkingStep = 0;
    this.thinkingInterval = setInterval(() => {
      this.currentThinkingStep = (this.currentThinkingStep + 1) % this.thinkingSteps.length;
    }, 2500);
  }

  private stopThinkingAnimation() {
    if (this.thinkingInterval) {
      clearInterval(this.thinkingInterval);
      this.thinkingInterval = null;
    }
  }

  scrollToBottom(): void {
    try {
      const container = this.scrollContainer();
      if (container?.nativeElement) {
        container.nativeElement.scrollTop = container.nativeElement.scrollHeight;
      }
    } catch (err) { }
  }

  onSendMessage(message: string) {
    this.sendMessage.emit(message);
  }

  onSelectSuggestion(suggestion: string) {
    this.selectSuggestion.emit(suggestion);
  }

  onRetry(msg: ChatMessage) {
    if (msg.sender === 'user') {
      this.sendMessage.emit(msg.content);
    }
  }

  onRegenerate(msg: ChatMessage) {
    this.regenerate.emit();
  }
}
