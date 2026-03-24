import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

import { AuthService } from '../../../core/services/auth.service';
import { MessagingService, SendMessageRequest } from '../../../core/services/messaging.service';
import { NetworkStatusService } from '../../../core/services/network-status.service';
import { MessageBubbleComponent } from '../../../shared/components/message-bubble.component';
import {
  AssignmentOption,
  MessageInputComponent,
  MessageSendEvent,
} from '../../../shared/components/message-input.component';
import { Message, sortMessagesByDate } from '../../student/messages/utils/message-utils';

@Component({
  selector: 'app-messages-tab',
  imports: [MessageBubbleComponent, MessageInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-[600px] flex-col overflow-hidden rounded-lg bg-slate-50">
      <div class="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-[#0056D2]/10">
            <span class="font-medium text-[#0056D2]">
              {{ getInitials(studentName()) }}
            </span>
          </div>
          <div>
            <h3 class="font-medium text-slate-900">{{ studentName() || 'Học viên' }}</h3>
            <p class="text-sm text-slate-500">Tin nhắn trực tiếp</p>
          </div>
        </div>

        <button
          type="button"
          (click)="refreshMessages()"
          class="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Làm mới tin nhắn">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
        </button>
      </div>

      @if (!network.online()) {
        <div class="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Đang offline. Bạn vẫn có thể soạn nháp, nhưng cần kết nối lại để gửi tin nhắn cho học viên.
        </div>
      }

      <div #messagesContainer class="flex-1 overflow-y-auto p-4">
        @if (loading()) {
          <div class="flex h-full items-center justify-center">
            <div class="h-8 w-8 animate-spin rounded-full border-b-2 border-[#0056D2]"></div>
            <span class="ml-3 text-slate-600">Đang tải tin nhắn...</span>
          </div>
        } @else if (error() && sortedMessages().length === 0) {
          <div class="flex h-full flex-col items-center justify-center text-center">
            <svg class="mb-3 h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <p class="mb-2 text-slate-600">{{ error() }}</p>
            <button type="button" (click)="refreshMessages()" class="text-[#0056D2] hover:text-[#004BB5]">
              Thử lại
            </button>
          </div>
        } @else if (sortedMessages().length === 0) {
          <div class="flex h-full flex-col items-center justify-center text-center">
            <svg class="mb-4 h-16 w-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
            </svg>
            <h3 class="mb-1 text-lg font-medium text-slate-900">Chưa có tin nhắn</h3>
            <p class="text-slate-500">Bắt đầu cuộc trò chuyện với học viên.</p>
          </div>
        } @else {
          @if (error()) {
            <div class="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {{ error() }}
            </div>
          }

          @for (message of sortedMessages(); track message.id) {
            <app-message-bubble
              [message]="message"
              [currentUserId]="currentTeacherId"></app-message-bubble>
          }
        }
      </div>

      <app-message-input
        #messageInput
        [placeholder]="'Nhập tin nhắn cho ' + (studentName() || 'học viên') + '...'"
        [showAssignmentSelector]="true"
        [assignments]="availableAssignments()"
        [externallyDisabled]="!network.online()"
        [disabledReason]="'Đang offline. Bạn vẫn có thể soạn nháp, nhưng cần kết nối lại để gửi tin nhắn cho học viên.'"
        (messageSend)="onSendMessage($event)"></app-message-input>
    </div>
  `,
})
export class MessagesTabComponent implements OnInit, OnDestroy, AfterViewChecked {
  readonly messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');
  readonly messageInput = viewChild<MessageInputComponent>('messageInput');

  readonly studentId = input.required<string>();
  readonly studentName = input.required<string>();

  private readonly messagingService = inject(MessagingService);
  private readonly authService = inject(AuthService);

  readonly network = inject(NetworkStatusService);

  private readonly messagesState = signal<Message[]>([]);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly availableAssignments = signal<AssignmentOption[]>([]);
  readonly sortedMessages = computed(() => sortMessagesByDate(this.messagesState()));

  private shouldScrollToBottom = false;
  private conversationId: string | null = null;

  get currentTeacherId(): string {
    return this.authService.getCurrentUser()?.id || '';
  }

  constructor() {
    effect(
      () => {
        const studentId = this.studentId();
        if (!studentId) {
          return;
        }

        this.messagingService.setCurrentUserId(this.currentTeacherId);
        this.resetConversationState();
        this.loadMessages(studentId);
      },
      { allowSignalWrites: true }
    );
  }

  ngOnInit(): void {
    this.loadAvailableAssignments();
  }

  ngOnDestroy(): void {
    this.messagingService.stopPolling();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  refreshMessages(): void {
    if (this.conversationId) {
      this.loadConversationMessages(this.conversationId);
      return;
    }

    this.loadMessages(this.studentId());
  }

  onSendMessage(event: MessageSendEvent): void {
    const request: SendMessageRequest = {
      recipientId: this.studentId(),
      content: event.content,
      assignmentId: event.assignmentId,
    };

    this.messagingService.sendMessage(request).subscribe({
      next: (response) => {
        this.error.set(null);
        this.messagesState.update((messages) => {
          if (messages.some((message) => message.id === response.message.id)) {
            return messages;
          }
          return [...messages, response.message];
        });
        this.shouldScrollToBottom = true;
        this.messageInput()?.onSendComplete();

        if (!this.conversationId) {
          this.conversationId = response.conversationId;
        }

        if (this.conversationId) {
          this.startConversationPolling(this.conversationId);
        }
      },
      error: (error) => {
        const apiMessage =
          error?.error?.error?.message ??
          error?.error?.message ??
          error?.error?.error?.code;
        const fallbackMessage = this.network.online()
          ? apiMessage || 'Không thể gửi tin nhắn. Vui lòng thử lại.'
          : 'Đang offline. Tin nhắn được giữ lại trong ô soạn để gửi sau khi kết nối lại.';
        this.messageInput()?.onSendError(fallbackMessage);
      },
    });
  }

  getInitials(name: string): string {
    if (!name) {
      return '';
    }

    return name
      .split(' ')
      .map((word) => word[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  private loadMessages(studentId: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.messagingService.getConversation(this.currentTeacherId, studentId).subscribe({
      next: (conversation) => {
        if (!conversation) {
          this.messagesState.set([]);
          this.loading.set(false);
          return;
        }

        this.conversationId = conversation.id;
        this.loadConversationMessages(conversation.id);
      },
      error: () => {
        this.error.set('Không thể tải cuộc hội thoại.');
        this.loading.set(false);
      },
    });
  }

  private loadConversationMessages(conversationId: string): void {
    this.loading.set(true);

    this.messagingService.getMessages(conversationId).subscribe({
      next: (messages) => {
        this.applyMessages(messages);
        this.startConversationPolling(conversationId);
      },
      error: () => {
        this.error.set('Không thể tải tin nhắn.');
        this.loading.set(false);
      },
    });
  }

  private startConversationPolling(conversationId: string): void {
    this.messagingService.startConversationPolling(conversationId, (messages) => {
      this.applyMessages(messages, false);
    });
  }

  private applyMessages(messages: Message[], forceScroll: boolean = true): void {
    const previousMessages = this.messagesState();
    const previousLastId = previousMessages.at(-1)?.id;
    const nextLastId = messages.at(-1)?.id;
    const changed = previousMessages.length !== messages.length || previousLastId !== nextLastId;

    this.messagesState.set(messages);
    this.loading.set(false);

    if (forceScroll || changed) {
      this.shouldScrollToBottom = true;
    }

    this.markUnreadMessages(messages);
  }

  private markUnreadMessages(messages: Message[]): void {
    const unreadIds = messages
      .filter((message) => !message.isRead && message.senderId !== this.currentTeacherId)
      .map((message) => message.id);

    if (unreadIds.length === 0) {
      return;
    }

    this.messagingService.markAsRead(unreadIds).subscribe({
      error: () => {
        // Preserve the current thread view; polling will reconcile later.
      },
    });
  }

  private loadAvailableAssignments(): void {
    this.availableAssignments.set([]);
  }

  private resetConversationState(): void {
    this.messagingService.stopPolling();
    this.conversationId = null;
    this.messagesState.set([]);
    this.loading.set(false);
    this.error.set(null);
  }

  private scrollToBottom(): void {
    const container = this.messagesContainer()?.nativeElement;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }
}
