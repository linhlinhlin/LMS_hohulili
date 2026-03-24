import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { combineLatest } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { MessagingService, SendMessageRequest } from '../../../core/services/messaging.service';
import { NetworkStatusService } from '../../../core/services/network-status.service';
import { MessageBubbleComponent } from '../../../shared/components/message-bubble.component';
import {
  MessageInputComponent,
  MessageSendEvent,
} from '../../../shared/components/message-input.component';
import {
  Conversation,
  Message,
  sortMessagesByDate,
} from './utils/message-utils';

type HeaderParticipant = {
  id: string;
  name: string;
  role: 'ADMIN' | 'ORG_ADMIN' | 'TEACHER' | 'STUDENT';
};

@Component({
  selector: 'app-conversation-view',
  imports: [RouterModule, MessageBubbleComponent, MessageInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-screen flex-col bg-slate-50">
      <div class="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <button
          type="button"
          (click)="goBack()"
          class="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Quay lại danh sách tin nhắn">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
        </button>

        @if (headerParticipant()) {
          <div class="flex flex-1 items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-[#0056D2] font-medium text-white">
              {{ getInitials(headerParticipant()!.name) }}
            </div>
            <div class="min-w-0">
              <h2 class="truncate font-medium text-slate-900">{{ headerParticipant()!.name }}</h2>
              <p class="text-sm text-slate-500">{{ roleLabel(headerParticipant()!.role) }}</p>
            </div>
          </div>
        }

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
          Bạn đang offline. Tin nhắn cũ vẫn được giữ tại đây, nhưng cần kết nối lại để gửi tin nhắn mới.
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
            <p class="text-slate-500">Hãy bắt đầu cuộc trò chuyện đầu tiên.</p>
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
              [currentUserId]="currentUserId"></app-message-bubble>
          }
        }
      </div>

      <app-message-input
        #messageInput
        [placeholder]="'Nhập tin nhắn...'"
        [externallyDisabled]="!network.online()"
        [disabledReason]="'Bạn đang offline. Bạn vẫn có thể soạn nháp, nhưng cần kết nối lại để gửi tin nhắn.'"
        (messageSend)="onSendMessage($event)"></app-message-input>
    </div>
  `,
})
export class ConversationViewComponent implements OnInit, OnDestroy, AfterViewChecked {
  readonly messagesContainer = viewChild.required<ElementRef<HTMLDivElement>>('messagesContainer');
  readonly messageInput = viewChild.required<MessageInputComponent>('messageInput');

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messagingService = inject(MessagingService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly network = inject(NetworkStatusService);

  private readonly messagesState = signal<Message[]>([]);
  private readonly conversationState = signal<Conversation | null>(null);
  private readonly draftRecipientState = signal<HeaderParticipant | null>(null);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private shouldScrollToBottom = false;
  private conversationId: string | null = null;

  get currentUserId(): string {
    return this.authService.getCurrentUser()?.id || '';
  }

  readonly sortedMessages = computed(() => sortMessagesByDate(this.messagesState()));

  readonly headerParticipant = computed(() => {
    const conversation = this.conversationState();
    if (conversation) {
      return conversation.participants.find((participant) => participant.id !== this.currentUserId) ?? null;
    }

    return this.draftRecipientState();
  });

  ngOnInit(): void {
    this.messagingService.setCurrentUserId(this.currentUserId);

    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([paramMap, queryParamMap]) => {
        this.initializeView(
          paramMap.get('conversationId'),
          queryParamMap.get('recipientId'),
          queryParamMap.get('recipientName'),
          queryParamMap.get('recipientRole')
        );
      });
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
      this.loadConversationDetails(this.conversationId);
      return;
    }

    if (this.draftRecipientState()) {
      this.error.set(null);
      return;
    }

    this.error.set('Không xác định được cuộc trò chuyện cần hiển thị.');
  }

  goBack(): void {
    this.router.navigate(['/student/messages']);
  }

  onSendMessage(event: MessageSendEvent): void {
    const recipient = this.headerParticipant();
    if (!recipient) {
      this.messageInput().onSendError('Không xác định được người nhận.');
      return;
    }

    const request: SendMessageRequest = {
      recipientId: recipient.id,
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
        this.messageInput().onSendComplete();

        if (!this.conversationId && response.conversationId) {
          this.router.navigate(['/student/messages', response.conversationId], {
            replaceUrl: true,
          });
          return;
        }

        if (response.conversationId) {
          this.startConversationPolling(response.conversationId);
        }
      },
      error: (error) => {
        const apiMessage =
          error?.error?.error?.message ??
          error?.error?.message ??
          error?.error?.error?.code;
        const fallbackMessage = this.network.online()
          ? apiMessage || 'Không thể gửi tin nhắn. Vui lòng thử lại.'
          : 'Bạn đang offline. Tin nhắn được giữ lại trong ô soạn để gửi sau khi kết nối lại.';
        this.messageInput().onSendError(fallbackMessage);
      },
    });
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((word) => word[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  roleLabel(role: HeaderParticipant['role']): string {
    switch (role) {
      case 'ADMIN':
        return 'Quản trị hệ thống';
      case 'ORG_ADMIN':
        return 'Chuyên viên quản lý';
      case 'TEACHER':
        return 'Giảng viên';
      default:
        return 'Học viên';
    }
  }

  private initializeView(
    conversationId: string | null,
    recipientId: string | null,
    recipientName: string | null,
    recipientRole: string | null
  ): void {
    this.messagingService.stopPolling();
    this.error.set(null);
    this.loading.set(false);
    this.messagesState.set([]);
    this.conversationState.set(null);

    if (conversationId) {
      this.conversationId = conversationId;
      this.draftRecipientState.set(null);
      this.loading.set(true);
      this.loadConversationMessages(conversationId);
      this.loadConversationDetails(conversationId);
      return;
    }

    if (recipientId) {
      this.conversationId = null;
      this.draftRecipientState.set({
        id: recipientId,
        name: recipientName || 'Người nhận',
        role: this.normalizeRole(recipientRole),
      });
      return;
    }

    this.conversationId = null;
    this.draftRecipientState.set(null);
    this.error.set('Không xác định được cuộc trò chuyện hoặc người nhận.');
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

  private loadConversationDetails(conversationId: string): void {
    this.messagingService.getConversations().subscribe({
      next: (conversations) => {
        const conversation = conversations.find((item) => item.id === conversationId) ?? null;
        this.conversationState.set(conversation);
      },
      error: () => {
        if (!this.messagesState().length) {
          this.error.set('Không thể tải thông tin cuộc hội thoại.');
        }
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
      .filter((message) => !message.isRead && message.senderId !== this.currentUserId)
      .map((message) => message.id);

    if (unreadIds.length === 0) {
      return;
    }

    this.messagingService.markAsRead(unreadIds).subscribe({
      error: () => {
        // Keep the view stable; polling will retry later.
      },
    });
  }

  private normalizeRole(role: string | null): HeaderParticipant['role'] {
    switch ((role ?? '').toUpperCase()) {
      case 'ADMIN':
        return 'ADMIN';
      case 'ORG_ADMIN':
        return 'ORG_ADMIN';
      case 'TEACHER':
        return 'TEACHER';
      default:
        return 'STUDENT';
    }
  }

  private scrollToBottom(): void {
    const container = this.messagesContainer().nativeElement;
    container.scrollTop = container.scrollHeight;
  }
}
