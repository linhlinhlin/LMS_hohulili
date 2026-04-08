import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
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
      @if (showAssignmentSelector() && assignments().length > 0) {
        <div class="mb-3">
          <label class="mb-1 block text-sm text-gray-600">Đính kèm bài tập (tùy chọn)</label>
          <select
            [(ngModel)]="selectedAssignmentId"
            class="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#0056D2] focus:ring-2 focus:ring-[#0056D2]">
            <option value="">-- Không đính kèm --</option>
            @for (assignment of assignments(); track assignment.id) {
              <option [value]="assignment.id">
                {{ assignment.title }} ({{ assignment.courseName }})
              </option>
            }
          </select>
        </div>
      }

      <div class="flex items-end gap-3">
        <button
          type="button"
          disabled
          class="cursor-not-allowed p-2 text-gray-300"
          title="Tính năng đính kèm file sẽ bổ sung sau">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13">
            </path>
          </svg>
        </button>

        <div class="relative flex-1">
          <textarea
            #textareaRef
            [(ngModel)]="messageContent"
            (keydown)="onKeyDown($event)"
            (input)="autoResize()"
            [placeholder]="placeholder()"
            [disabled]="loading()"
            rows="1"
            class="w-full resize-none rounded-2xl border px-4 py-3 pr-12 focus:border-[#0056D2] focus:ring-2 focus:ring-[#0056D2] disabled:cursor-not-allowed disabled:bg-gray-100"
            [class.border-gray-300]="!loading()"
            [class.border-gray-200]="loading()"
            style="max-height: 150px; min-height: 44px;">
          </textarea>

          @if (showCharCount() && messageContent.length > 0) {
            <span
              class="absolute bottom-2 right-14 text-xs"
              [class.text-gray-400]="messageContent.length < maxLength()"
              [class.text-red-500]="messageContent.length >= maxLength()">
              {{ messageContent.length }}/{{ maxLength() }}
            </span>
          }
        </div>

        <button
          type="button"
          (click)="send()"
          [disabled]="!canSend()"
          [attr.aria-label]="externallyDisabled() ? 'Không thể gửi tin nhắn khi đang offline' : 'Gửi tin nhắn'"
          class="rounded-full p-3 transition-colors"
          [class.bg-[#0056D2]]="canSend()"
          [class.hover:bg-[#004BB5]]="canSend()"
          [class.text-white]="canSend()"
          [class.bg-gray-100]="!canSend()"
          [class.text-gray-400]="!canSend()"
          [class.cursor-not-allowed]="!canSend()">
          @if (loading()) {
            <svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          } @else {
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8">
              </path>
            </svg>
          }
        </button>
      </div>

      @if (externallyDisabled() && disabledReason()) {
        <div class="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p class="text-xs text-amber-800">{{ disabledReason() }}</p>
        </div>
      }

      @if (errorMessage()) {
        <div class="mt-2 flex items-center justify-between rounded-lg bg-red-50 px-2 py-1">
          <span class="text-xs text-red-600">{{ errorMessage() }}</span>
          @if (lastFailedMessage()) {
            <button
              type="button"
              (click)="retry()"
              class="text-xs font-medium text-red-600 hover:text-red-800">
              Thử lại
            </button>
          }
        </div>
      }

      <p class="mt-2 text-xs text-gray-400">
        Nhấn Enter để gửi, Shift+Enter để xuống dòng
      </p>
    </div>
  `,
})
export class MessageInputComponent {
  readonly textareaRef = viewChild<ElementRef<HTMLTextAreaElement>>('textareaRef');

  readonly placeholder = input<string>('Nhập tin nhắn...');
  readonly showAssignmentSelector = input<boolean>(false);
  readonly assignments = input<AssignmentOption[]>([]);
  readonly maxLength = input<number>(5000);
  readonly showCharCount = input<boolean>(false);
  readonly externallyDisabled = input<boolean>(false);
  readonly disabledReason = input<string>('');

  readonly messageSend = output<MessageSendEvent>();

  messageContent = '';
  selectedAssignmentId = '';
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly lastFailedMessage = signal<MessageSendEvent | null>(null);

  canSend(): boolean {
    const content = this.messageContent.trim();
    return (
      content.length > 0 &&
      content.length <= this.maxLength() &&
      !this.loading() &&
      !this.externallyDisabled()
    );
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  autoResize(): void {
    const textarea = this.textareaRef()?.nativeElement;
    if (!textarea) {
      return;
    }

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  }

  send(): void {
    if (!this.canSend()) {
      return;
    }

    const event = this.buildDraftEvent();
    if (!event) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.lastFailedMessage.set(event);
    this.messageSend.emit(event);
  }

  retry(): void {
    if (this.externallyDisabled()) {
      return;
    }

    const event = this.buildDraftEvent() ?? this.lastFailedMessage();
    if (!event) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.lastFailedMessage.set(event);
    this.messageSend.emit(event);
  }

  onSendComplete(): void {
    this.loading.set(false);
    this.errorMessage.set(null);
    this.lastFailedMessage.set(null);
    this.messageContent = '';
    this.selectedAssignmentId = '';
    this.resetTextareaHeight();
  }

  onSendError(message: string = 'Không thể gửi tin nhắn. Vui lòng thử lại.'): void {
    this.loading.set(false);
    this.errorMessage.set(message);
  }

  focus(): void {
    this.textareaRef()?.nativeElement?.focus();
  }

  private buildDraftEvent(): MessageSendEvent | null {
    const content = this.messageContent.trim();
    if (!content) {
      return null;
    }

    return {
      content,
      assignmentId: this.selectedAssignmentId || undefined,
    };
  }

  private resetTextareaHeight(): void {
    const textarea = this.textareaRef()?.nativeElement;
    if (textarea) {
      textarea.style.height = '44px';
    }
  }
}
