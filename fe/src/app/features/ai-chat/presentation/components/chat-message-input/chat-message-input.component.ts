/**
 * ChatMessageInputComponent
 * Text input with send button for chat messages
 */
import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  ElementRef,
  viewChild,
  afterNextRender,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat-message-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chat-input-container">
      <textarea
        #inputField
        class="chat-input"
        [placeholder]="placeholder()"
        [(ngModel)]="messageText"
        (keydown.enter)="onEnterKey($event)"
        (input)="onInput()"
        [disabled]="isLoading()"
        rows="1"
        aria-label="Nhập tin nhắn"
        [attr.aria-disabled]="isLoading()"
      ></textarea>

      <button
        class="send-button"
        [disabled]="!canSend()"
        (click)="onSend()"
        [title]="isLoading() ? 'Đang gửi...' : 'Gửi tin nhắn'"
        aria-label="Gửi tin nhắn"
        [attr.aria-disabled]="!canSend()"
      >
        @if (isLoading()) {
          <div role="status" aria-label="Đang gửi">
            <svg class="loading-spinner" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle class="spinner-track" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"/>
              <path class="spinner-head" d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
            </svg>
          </div>
        } @else {
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="send-icon">
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        }
      </button>
    </div>
  `,
  styles: [`
    .chat-input-container {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      padding: 12px;
      background: white;
      border-top: 1px solid #e5e7eb;
    }

    .chat-input {
      flex: 1;
      min-height: 40px;
      max-height: 120px;
      padding: 10px 14px;
      font-size: 14px;
      line-height: 1.4;
      color: #1f2937;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 20px;
      resize: none;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .chat-input:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .chat-input:disabled {
      background: #f3f4f6;
      cursor: not-allowed;
    }

    .chat-input::placeholder {
      color: #9ca3af;
    }

    .send-button {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      transition: all 0.2s;
    }

    .send-button:hover:not(:disabled) {
      background: #2563eb;
      transform: scale(1.05);
    }

    .send-button:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }

    .send-icon {
      width: 18px;
      height: 18px;
    }

    .loading-spinner {
      width: 20px;
      height: 20px;
      animation: spin 1s linear infinite;
    }

    .spinner-track {
      opacity: 0.25;
    }

    .spinner-head {
      opacity: 1;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatMessageInputComponent {
  // Inputs
  placeholder = input<string>('Nhập câu hỏi của bạn...');
  isLoading = input<boolean>(false);

  // Outputs
  messageSent = output<string>();

  // State
  messageText = signal('');

  // View child
  inputField = viewChild<ElementRef<HTMLTextAreaElement>>('inputField');

  constructor() {
    afterNextRender(() => {
      this.focusInput();
    });
  }

  canSend(): boolean {
    return this.messageText().trim().length > 0 && !this.isLoading();
  }

  onEnterKey(event: Event): void {
    const keyEvent = event as KeyboardEvent;
    if (!keyEvent.shiftKey) {
      event.preventDefault();
      this.onSend();
    }
  }

  onInput(): void {
    this.adjustTextareaHeight();
  }

  onSend(): void {
    const text = this.messageText().trim();
    if (text && !this.isLoading()) {
      this.messageSent.emit(text);
      this.messageText.set('');
      this.resetTextareaHeight();
      this.focusInput();
    }
  }

  focusInput(): void {
    const input = this.inputField();
    if (input) {
      input.nativeElement.focus();
    }
  }

  clearInput(): void {
    this.messageText.set('');
    this.resetTextareaHeight();
  }

  private adjustTextareaHeight(): void {
    const textarea = this.inputField()?.nativeElement;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }

  private resetTextareaHeight(): void {
    const textarea = this.inputField()?.nativeElement;
    if (textarea) {
      textarea.style.height = 'auto';
    }
  }
}
