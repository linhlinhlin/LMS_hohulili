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
    <div class="border-t border-slate-100 bg-white px-3 py-2.5">
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

      <!-- Input row — Messenger desktop: [Textarea] [😀] [▶/👍] -->
      <div class="flex items-end gap-1">
        <!-- Textarea — Messenger pill shape, takes most space -->
        <div class="relative flex-1">
          <textarea
            #textareaRef
            [(ngModel)]="messageContent"
            (keydown)="onKeyDown($event)"
            (input)="autoResize()"
            [placeholder]="placeholder()"
            [disabled]="loading()"
            rows="1"
            class="w-full resize-none rounded-[20px] border bg-slate-50 px-4 py-2 text-[14px] leading-5 focus:border-[#0056D2] focus:bg-white focus:ring-1 focus:ring-[#0056D2] disabled:cursor-not-allowed disabled:bg-slate-100 appearance-none"
            [class.border-slate-200]="true"
            style="max-height: 120px; min-height: 36px; -moz-appearance: none; -webkit-appearance: none;">
          </textarea>

          @if (showCharCount() && messageContent.length > 0) {
            <span
              class="absolute bottom-1.5 right-3 text-[10px]"
              [class.text-slate-400]="messageContent.length < maxLength()"
              [class.text-red-500]="messageContent.length >= maxLength()">
              {{ messageContent.length }}/{{ maxLength() }}
            </span>
          }
        </div>

        <!-- Emoji picker — RIGHT side of textarea (Messenger pattern) -->
        <div class="relative flex-shrink-0 mb-0.5" (click)="$event.stopPropagation()">
          <button
            type="button"
            (click)="toggleEmojiPicker()"
            class="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-[#0056D2]"
            [class.bg-[#0056D2]/10]="showEmojiPicker()"
            [class.text-[#0056D2]]="showEmojiPicker()"
            aria-label="Chọn biểu cảm">
            <svg class="h-[22px] w-[22px]" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
              <line x1="9" y1="9" x2="9.01" y2="9"/>
              <line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
          </button>

          @if (showEmojiPicker()) {
            <div class="absolute bottom-full right-0 mb-2 z-50">
              <emoji-mart
                [style]="{ width: '320px' }"
                [perLine]="8"
                [emojiSize]="24"
                [isNative]="true"
                [showPreview]="false"
                [autoFocus]="true"
                [i18n]="i18n"
                [color]="'#0056D2'"
                title="Chọn biểu cảm"
                emoji=""
                (emojiClick)="onEmojiSelect($event)">
              </emoji-mart>
            </div>
          }
        </div>

        <!-- Send / Like button — Messenger: send arrow when has text, 👍 when empty -->
        <button
          type="button"
          (click)="hasContent ? send() : sendLike()"
          [disabled]="loading()"
          aria-label="Gửi tin nhắn"
          class="mb-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-all"
          [class.bg-[#0056D2]]="hasContent"
          [class.text-white]="hasContent"
          [class.hover:bg-[#004BB5]]="hasContent"
          [class.text-[#0056D2]]="!hasContent"
          [class.hover:bg-[#0056D2]/10]="!hasContent">
          @if (loading()) {
            <svg class="h-[18px] w-[18px] animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          } @else if (hasContent) {
            <!-- Send arrow (Messenger filled) -->
            <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          } @else {
            <!-- 👍 Like (Messenger default when empty) -->
            <svg class="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
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

      <p class="mt-1.5 text-center text-[11px] text-slate-300">
        Enter gửi · Shift+Enter xuống dòng
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

  get hasContent(): boolean {
    return this.messageContent.trim().length > 0;
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

  /** Messenger pattern: send 👍 when textarea is empty */
  sendLike(): void {
    if (this.loading() || this.externallyDisabled()) return;
    this.loading.set(true);
    this.messageSend.emit({ content: '👍' });
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
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
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
      textarea.style.height = '36px';
    }
  }
}
