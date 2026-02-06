/**
 * Message Input Component
 *
 * Component nhập tin nhắn có thể tái sử dụng.
 * - Textarea với auto-resize
 * - Nút gửi với loading state
 * - Assignment reference dropdown (optional)
 * - Enter key để gửi (Shift+Enter cho xuống dòng)
 * - Nút đính kèm file (disabled, chuẩn bị cho tương lai)
 *
 * @requirements 1.2, 5.1
 */
import {
  Component,
  input,
  output,
  signal,
  viewChild,
  ElementRef,
  ChangeDetectionStrategy,
} from '@angular/core';

import { FormsModule } from '@angular/forms';

export interface AssignmentOption {
  id: string;
  title: string;
  courseName: string;
}

export interface MessageSendEvent {
  content: string;
  assignmentId?: string;
}

@Component({
  selector: 'app-message-input',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="border-t bg-white p-4">
      <!-- Assignment Reference Selector -->
      @if (showAssignmentSelector() && assignments().length > 0) {
        <div class="mb-3">
          <label class="block text-sm text-gray-600 mb-1">Đính kèm bài tập (tùy chọn)</label>
          <select
            [(ngModel)]="selectedAssignmentId"
            class="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Không đính kèm --</option>
            @for (assignment of assignments(); track assignment.id) {
              <option [value]="assignment.id">
                {{ assignment.title }} ({{ assignment.courseName }})
              </option>
            }
          </select>
        </div>
      }

      <!-- Input Area -->
      <div class="flex items-end gap-3">
        <!-- Attachment Button (disabled, future feature) -->
        <button
          type="button"
          disabled
          class="p-2 text-gray-300 cursor-not-allowed"
          title="Đính kèm file (sắp có)"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            ></path>
          </svg>
        </button>

        <!-- Textarea -->
        <div class="flex-1 relative">
          <textarea
            #textareaRef
            [(ngModel)]="messageContent"
            (keydown)="onKeyDown($event)"
            (input)="autoResize()"
            [placeholder]="placeholder()"
            [disabled]="loading()"
            rows="1"
            class="w-full border rounded-2xl px-4 py-3 pr-12 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            [class.border-gray-300]="!loading()"
            [class.border-gray-200]="loading()"
            style="max-height: 150px; min-height: 44px;"
          ></textarea>

          <!-- Character count (optional) -->
          @if (showCharCount() && messageContent.length > 0) {
            <span
              class="absolute bottom-2 right-14 text-xs"
              [class.text-gray-400]="messageContent.length < maxLength()"
              [class.text-red-500]="messageContent.length >= maxLength()"
            >
              {{ messageContent.length }}/{{ maxLength() }}
            </span>
          }
        </div>

        <!-- Send Button -->
        <button
          type="button"
          (click)="send()"
          [disabled]="!canSend()"
          class="p-3 rounded-full transition-colors"
          [class.bg-blue-600]="canSend()"
          [class.hover:bg-blue-700]="canSend()"
          [class.text-white]="canSend()"
          [class.bg-gray-100]="!canSend()"
          [class.text-gray-400]="!canSend()"
          [class.cursor-not-allowed]="!canSend()"
        >
          @if (loading()) {
            <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          } @else {
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              ></path>
            </svg>
          }
        </button>
      </div>

      <!-- Error message with retry -->
      @if (errorMessage()) {
        <div class="flex items-center justify-between mt-2 px-2 py-1 bg-red-50 rounded-lg">
          <span class="text-xs text-red-600">{{ errorMessage() }}</span>
          <button
            (click)="retry()"
            class="text-xs text-red-600 hover:text-red-800 font-medium"
          >
            Thử lại
          </button>
        </div>
      }

      <!-- Hint text -->
      <p class="text-xs text-gray-400 mt-2">
        Nhấn Enter để gửi, Shift+Enter để xuống dòng
      </p>
    </div>
  `,
})
export class MessageInputComponent {
  textareaRef = viewChild<ElementRef<HTMLTextAreaElement>>('textareaRef');

  // Signal inputs - Angular v20+
  placeholder = input<string>('Nhập tin nhắn...');
  showAssignmentSelector = input<boolean>(false);
  assignments = input<AssignmentOption[]>([]);
  maxLength = input<number>(5000);
  showCharCount = input<boolean>(false);

  // Signal output - Angular v20+
  messageSend = output<MessageSendEvent>();

  messageContent = '';
  selectedAssignmentId = '';
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  private lastFailedMessage: MessageSendEvent | null = null;

  canSend(): boolean {
    const content = this.messageContent.trim();
    return content.length > 0 && content.length <= this.maxLength() && !this.loading();
  }

  onKeyDown(event: KeyboardEvent): void {
    // Enter without Shift sends the message
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  autoResize(): void {
    const textarea = this.textareaRef()?.nativeElement;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    }
  }

  send(): void {
    if (!this.canSend()) return;

    const content = this.messageContent.trim();
    this.loading.set(true);
    this.errorMessage.set(null);

    const event: MessageSendEvent = {
      content,
      assignmentId: this.selectedAssignmentId || undefined,
    };

    // Store for potential retry
    this.lastFailedMessage = event;

    this.messageSend.emit(event);

    // Clear input after sending
    this.messageContent = '';
    this.selectedAssignmentId = '';

    // Reset textarea height
    const ref = this.textareaRef();
    if (ref?.nativeElement) {
      ref.nativeElement.style.height = '44px';
    }
  }

  /**
   * Retry sending the last failed message
   */
  retry(): void {
    if (!this.lastFailedMessage) return;

    this.loading.set(true);
    this.errorMessage.set(null);
    this.messageSend.emit(this.lastFailedMessage);
  }

  /**
   * Called by parent component when message is sent successfully
   */
  onSendComplete(): void {
    this.loading.set(false);
    this.errorMessage.set(null);
    this.lastFailedMessage = null;
  }

  /**
   * Called by parent component when message send fails
   */
  onSendError(message: string = 'Không thể gửi tin nhắn. Vui lòng thử lại.'): void {
    this.loading.set(false);
    this.errorMessage.set(message);
  }

  /**
   * Focus the textarea
   */
  focus(): void {
    this.textareaRef()?.nativeElement?.focus();
  }
}
