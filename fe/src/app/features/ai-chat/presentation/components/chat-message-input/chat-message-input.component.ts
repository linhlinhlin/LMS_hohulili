/**
 * ChatMessageInputComponent
 * Text input with send button for chat messages
 * Includes keyboard shortcuts hints
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
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat-message-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="input-wrapper">
      <div class="chat-input-container" [class.focused]="isFocused()">
        <textarea
          #inputField
          class="chat-input"
          [placeholder]="placeholder()"
          [(ngModel)]="messageText"
          (keydown.enter)="onEnterKey($event)"
          (input)="onInput()"
          (focus)="isFocused.set(true)"
          (blur)="isFocused.set(false)"
          [disabled]="isLoading()"
          rows="1"
          aria-label="Nhập tin nhắn"
          [attr.aria-disabled]="isLoading()"
        ></textarea>

        <button
          class="send-button"
          [disabled]="!canSend()"
          (click)="onSend()"
          [title]="isLoading() ? 'Đang gửi...' : 'Gửi tin nhắn (Enter)'"
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

      <!-- Keyboard Shortcuts Hint -->
      <div class="shortcuts-hint" [class.visible]="showHints()">
        <div class="hint-item">
          <kbd>Enter</kbd>
          <span>Gửi</span>
        </div>
        <div class="hint-item">
          <kbd>Shift</kbd>+<kbd>Enter</kbd>
          <span>Xuống dòng</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .input-wrapper {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .chat-input-container {
      display: flex;
      align-items: flex-end;
      gap: 12px;
      padding: 16px 20px;
      background: white;
      border: 1px solid #E2E8F0;
      border-radius: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      transition: all 0.2s ease;
    }

    .chat-input-container.focused {
      border-color: #0369A1;
      box-shadow: 0 2px 12px rgba(3, 105, 161, 0.12);
    }

    .chat-input {
      flex: 1;
      min-height: 24px;
      max-height: 150px;
      padding: 0;
      font-size: 15px;
      line-height: 1.5;
      color: #1F2937;
      background: transparent;
      border: none;
      resize: none;
      outline: none;
      font-family: inherit;
    }

    .chat-input::placeholder {
      color: #94A3B8;
    }

    .chat-input:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    .send-button {
      flex-shrink: 0;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0369A1 0%, #0284C7 100%);
      color: white;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .send-button:hover:not(:disabled) {
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(3, 105, 161, 0.3);
    }

    .send-button:disabled {
      background: #CBD5E1;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .send-icon {
      width: 20px;
      height: 20px;
    }

    .loading-spinner {
      width: 22px;
      height: 22px;
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

    /* Keyboard Shortcuts Hint */
    .shortcuts-hint {
      display: flex;
      gap: 16px;
      justify-content: flex-end;
      padding: 0 4px;
      opacity: 0;
      transform: translateY(-4px);
      transition: all 0.2s ease;
      pointer-events: none;
    }

    .shortcuts-hint.visible {
      opacity: 1;
      transform: translateY(0);
    }

    .hint-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      color: #94A3B8;
    }

    kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      background: #F1F5F9;
      border: 1px solid #E2E8F0;
      border-radius: 4px;
      font-family: inherit;
      font-size: 0.6875rem;
      font-weight: 500;
      color: #64748B;
    }

    @media (max-width: 480px) {
      .shortcuts-hint {
        display: none;
      }
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
  isFocused = signal(false);

  // Show hints when focused and has text
  showHints = computed(() => this.isFocused() || this.messageText().length > 0);

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

