import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';

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
  imports: [FormsModule, PickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="border-t bg-white p-4">
      @if (showAssignmentSelector() && assignments().length > 0) {
        <div class="mb-3">
          <label class="mb-1 block text-sm text-slate-600">Đính kèm bài tập (tùy chọn)</label>
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

      <div class="flex items-end gap-2">
        <!-- Emoji picker toggle -->
        <div class="relative" (click)="$event.stopPropagation()">
          <button
            type="button"
            (click)="toggleEmojiPicker()"
            class="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            [class.bg-slate-100]="showEmojiPicker()"
            [class.text-[#0056D2]]="showEmojiPicker()"
            aria-label="Chọn biểu cảm">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </button>

          <!-- ngx-emoji-mart picker (Slack-like, professional) -->
          @if (showEmojiPicker()) {
            <div class="absolute bottom-full left-0 mb-2 z-50">
              <emoji-mart
                [style]="{ width: '320px' }"
                [perLine]="8"
                [emojiSize]="22"
                [showPreview]="false"
                [autoFocus]="true"
                [i18n]="i18n"
                title="Chọn biểu cảm"
                emoji=""
                [set]="$any('native')"
                (emojiClick)="onEmojiSelect($event)">
              </emoji-mart>
            </div>
          }
        </div>

        <div class="relative flex-1">
          <textarea
            #textareaRef
            [(ngModel)]="messageContent"
            (keydown)="onKeyDown($event)"
            (input)="autoResize()"
            [placeholder]="placeholder()"
            [disabled]="loading()"
            rows="1"
            class="w-full resize-none rounded-lg border px-4 py-3 pr-12 focus:border-[#0056D2] focus:ring-2 focus:ring-[#0056D2] disabled:cursor-not-allowed disabled:bg-slate-100"
            [class.border-slate-300]="!loading()"
            [class.border-slate-200]="loading()"
            style="max-height: 150px; min-height: 44px;">
          </textarea>

          @if (showCharCount() && messageContent.length > 0) {
            <span
              class="absolute bottom-2 right-14 text-xs"
              [class.text-slate-400]="messageContent.length < maxLength()"
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
          [class.bg-slate-100]="!canSend()"
          [class.text-slate-400]="!canSend()"
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

      <p class="mt-2 text-xs text-slate-400">
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
  readonly showEmojiPicker = signal(false);

  /** Vietnamese i18n for emoji-mart */
  readonly i18n = {
    search: 'Tìm biểu cảm',
    notfound: 'Không tìm thấy',
    categories: {
      search: 'Kết quả tìm kiếm',
      recent: 'Thường dùng',
      people: 'Mặt cười & Người',
      nature: 'Động vật & Thiên nhiên',
      foods: 'Đồ ăn & Thức uống',
      activity: 'Hoạt động',
      places: 'Du lịch & Địa điểm',
      objects: 'Đồ vật',
      symbols: 'Biểu tượng',
      flags: 'Cờ',
    },
  };

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.showEmojiPicker()) {
      this.showEmojiPicker.set(false);
    }
  }

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

  toggleEmojiPicker(): void {
    this.showEmojiPicker.update((v) => !v);
  }

  onEmojiSelect(event: any): void {
    const emoji = event?.emoji?.native;
    if (!emoji) return;

    const textarea = this.textareaRef()?.nativeElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      this.messageContent =
        this.messageContent.substring(0, start) + emoji + this.messageContent.substring(end);
      setTimeout(() => {
        textarea.focus();
        const newPos = start + emoji.length;
        textarea.setSelectionRange(newPos, newPos);
      });
    } else {
      this.messageContent += emoji;
    }
  }

  send(): void {
    if (!this.canSend()) {
      return;
    }

    const event = this.buildDraftEvent();
    if (!event) {
      return;
    }

    this.showEmojiPicker.set(false);
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
