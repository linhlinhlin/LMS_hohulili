import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage } from '../../../domain/types';
import { ChatMessageComponent } from '../chat-message/chat-message.component';
import { ChatMessageInputComponent } from '../chat-message-input/chat-message-input.component';

@Component({
  selector: 'app-chat-main-area',
  standalone: true,
  imports: [CommonModule, ChatMessageComponent, ChatMessageInputComponent],
  template: `
    <div class="main-area-container">
      <!-- Messages Area -->
      <div class="messages-container" #scrollContainer>
        <ng-container *ngIf="messages.length > 0; else welcomeTemplate">
          <app-chat-message
            *ngFor="let msg of messages"
            [message]="msg"
            (retry)="onRetry(msg)"
            (regenerate)="onRegenerate(msg)"
          ></app-chat-message>
          
          <!-- Loading Indicator (Thinking) -->
          <div *ngIf="isLoading" class="thinking-indicator">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
            <span class="thinking-text">{{ thinkingSteps[currentThinkingStep] }}</span>
          </div>

          <!-- Suggested Questions (Bottom) -->
          <div *ngIf="!isLoading && suggestedQuestions.length > 0" class="suggestions-bottom">
            <div class="suggestions-label">Gợi ý câu hỏi tiếp theo:</div>
            <div class="suggestions-chips">
              <button 
                *ngFor="let question of suggestedQuestions"
                class="suggestion-chip"
                (click)="onSelectSuggestion(question)"
              >
                {{ question }}
              </button>
            </div>
          </div>
        </ng-container>

        <ng-template #welcomeTemplate>
          <div class="welcome-screen">
            <div class="welcome-icon">⚓</div>
            <h2>Chào mừng đến với Trợ Lý AI Hàng Hải</h2>
            <p>Tôi có thể giúp gì cho bạn hôm nay?</p>
            <div class="suggestions">
              <button class="suggestion-chip" (click)="onSelectSuggestion('Giải thích quy tắc 15 COLREGs')">
                Giải thích quy tắc 15 COLREGs
              </button>
              <button class="suggestion-chip" (click)="onSelectSuggestion('SOLAS là gì?')">
                SOLAS là gì?
              </button>
              <button class="suggestion-chip" (click)="onSelectSuggestion('Các loại phao báo hiệu hàng hải')">
                Các loại phao báo hiệu hàng hải
              </button>
            </div>
          </div>
        </ng-template>
      </div>

      <!-- Input Area -->
      <div class="input-area">
        <app-chat-message-input
          [isLoading]="isLoading"
          (messageSent)="onSendMessage($event)"
        ></app-chat-message-input>
        <div class="disclaimer">
          AI có thể mắc lỗi. Hãy kiểm tra lại thông tin quan trọng.
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      background-color: #ffffff;
      position: relative;
    }

    .main-area-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background-color: #ffffff;
    }

    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      padding-bottom: 40px;
      scroll-behavior: smooth;
      background-color: #ffffff;
    }

    .welcome-screen {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #112240; /* Dark Blue */
      text-align: center;
      padding: 20px;
    }

    .welcome-icon {
      font-size: 4rem;
      margin-bottom: 20px;
      color: #0a192f; /* Deep Blue */
    }

    .welcome-screen h2 {
      margin-bottom: 10px;
      font-size: 1.75rem;
      font-weight: 700;
      color: #0a192f;
    }
    
    .welcome-screen p {
      color: #4b5563;
      margin-bottom: 30px;
    }

    .suggestions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: center;
      margin-top: 20px;
      max-width: 700px;
    }

    .suggestion-chip {
      padding: 10px 20px;
      background-color: #f0f4f8; /* Very light blue-gray */
      border: 1px solid #d1d5db;
      border-radius: 20px;
      cursor: pointer;
      font-size: 0.95rem;
      transition: all 0.2s;
      color: #1f2937;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }

    .suggestion-chip:hover {
      background-color: #e0e7ff; /* Light indigo/blue hover */
      border-color: #a5b4fc;
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .input-area {
      padding: 20px;
      background-color: #ffffff;
      border-top: 1px solid #e5e7eb;
      max-width: 900px;
      margin: 0 auto;
      width: 100%;
    }

    .disclaimer {
      text-align: center;
      font-size: 0.75rem;
      color: #9ca3af;
      margin-top: 8px;
    }

    .thinking-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 20px;
      color: #4b5563;
      font-size: 0.9rem;
      margin-bottom: 20px;
      background: #f3f4f6;
      border-radius: 8px;
      width: fit-content;
    }

    .dot {
      width: 6px;
      height: 6px;
      background-color: #0a192f; /* Deep Blue */
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out both;
    }

    .dot:nth-child(1) { animation-delay: -0.32s; }
    .dot:nth-child(2) { animation-delay: -0.16s; }

    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }

    /* Bottom Suggestions */
    .suggestions-bottom {
      padding: 10px 20px;
      margin-bottom: 20px;
    }

    .suggestions-label {
      font-size: 0.85rem;
      color: #6b7280;
      margin-bottom: 8px;
      font-weight: 500;
    }

    .suggestions-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  `]
})
export class ChatMainAreaComponent implements AfterViewChecked {
  @Input() messages: ChatMessage[] = [];
  @Input() isLoading: boolean = false;
  @Input() suggestedQuestions: string[] = [];

  @Output() sendMessage = new EventEmitter<string>();
  @Output() selectSuggestion = new EventEmitter<string>();
  @Output() regenerate = new EventEmitter<void>();

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

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
    if (this.isLoading) {
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
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
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
