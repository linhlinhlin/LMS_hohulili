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

import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { MessagingService, SendMessageRequest } from '../../../core/services/messaging.service';
import { NetworkStatusService } from '../../../core/services/network-status.service';
import { WebSocketService, WsNewMessage, WsReaction } from '../../../core/services/websocket.service';
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
  avatar?: string;
};

@Component({
  selector: 'app-conversation-view',
  imports: [RouterModule, MessageBubbleComponent, MessageInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Full-height chat: 100dvh works on both desktop and mobile (handles iOS address bar) -->
    <div class="flex flex-col bg-white" style="height: 100dvh; height: 100vh;">

      <!-- ═══ Header: fixed top — Messenger 56px ═══ -->
      <div class="flex h-14 flex-shrink-0 items-center gap-2 border-b border-slate-200 px-3">
        <button type="button" (click)="goBack()"
          class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
          aria-label="Quay lại">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>

        @if (headerParticipant()) {
          <div class="flex flex-1 items-center gap-2 min-w-0">
            @if (headerParticipant()!.avatar) {
              <img [src]="headerParticipant()!.avatar" [alt]="headerParticipant()!.name"
                class="h-9 w-9 flex-shrink-0 rounded-full object-cover" />
            } @else {
              <div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#0056D2] text-sm font-semibold text-white">
                {{ getInitials(headerParticipant()!.name) }}
              </div>
            }
            <div class="min-w-0">
              <h2 class="truncate text-[15px] font-semibold leading-tight text-slate-900">{{ headerParticipant()!.name }}</h2>
              <p class="text-[12px] leading-tight text-slate-400">{{ roleLabel(headerParticipant()!.role) }}</p>
            </div>
          </div>
        }
      </div>

      @if (!network.online()) {
        <div class="flex-shrink-0 border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-[13px] text-amber-700">
          Đang offline — cần kết nối để gửi tin nhắn.
        </div>
      }

      <!-- ═══ Messages scroll area — fills all remaining space ═══ -->
      <div #messagesContainer class="flex-1 overflow-y-auto overscroll-contain bg-white px-3 py-2"
           style="min-height: 0; -webkit-overflow-scrolling: touch;"
           (scroll)="onScroll()">
        @if (loading()) {
          <div class="flex h-full flex-col justify-end gap-3">
            <div class="flex justify-start"><div class="w-[55%] space-y-2 rounded-[18px] bg-slate-100 p-3"><div class="h-3 w-16 animate-pulse rounded bg-slate-200"></div><div class="h-3 w-full animate-pulse rounded bg-slate-200"></div></div></div>
            <div class="flex justify-end"><div class="w-[45%] space-y-2 rounded-[18px] bg-[#0056D2]/10 p-3"><div class="h-3 w-full animate-pulse rounded bg-[#0056D2]/20"></div><div class="h-3 w-2/3 animate-pulse rounded bg-[#0056D2]/20"></div></div></div>
            <div class="flex justify-start"><div class="w-[40%] space-y-2 rounded-[18px] bg-slate-100 p-3"><div class="h-3 w-full animate-pulse rounded bg-slate-200"></div></div></div>
          </div>
        } @else if (error() && sortedMessages().length === 0) {
          <div class="flex h-full flex-col items-center justify-center text-center px-6">
            <svg class="mb-3 h-10 w-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <p class="mb-2 text-sm text-slate-500">{{ error() }}</p>
            <button type="button" (click)="refreshMessages()" class="text-sm text-[#0056D2] hover:underline">Thử lại</button>
          </div>
        } @else if (sortedMessages().length === 0) {
          <div class="flex h-full flex-col items-center justify-center text-center px-6">
            <div class="flex h-14 w-14 items-center justify-center rounded-full bg-[#0056D2]/10 mb-3">
              <svg class="h-7 w-7 text-[#0056D2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
            </div>
            <p class="text-[15px] font-medium text-slate-900">Chưa có tin nhắn</p>
            <p class="text-[13px] text-slate-400 mt-0.5">Hãy bắt đầu cuộc trò chuyện.</p>
          </div>
        } @else {
          @if (error()) {
            <div class="mb-2 rounded-lg bg-amber-50 px-3 py-1.5 text-[13px] text-amber-700">{{ error() }}</div>
          }

          @for (message of sortedMessages(); track message.id) {
            <app-message-bubble
              [message]="message"
              [currentUserId]="currentUserId"
              (reactionToggle)="onReactionToggle($event)"
              (recallMessage)="onRecallMessage($event)"
              (replyMessage)="onReplyMessage($event)"
              (scrollToMsg)="scrollToMessage($event)"></app-message-bubble>
          }
        }
      </div>

      <!-- ═══ Scroll to bottom button (Messenger ↓ pattern) ═══ -->
      @if (showScrollDown()) {
        <div class="flex-shrink-0 flex justify-center -mt-5 relative z-10">
          <button type="button" (click)="scrollToBottom()"
            class="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white shadow-md text-slate-500 transition hover:bg-slate-50 hover:text-slate-700">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
            </svg>
          </button>
        </div>
      }

      <!-- ═══ Reply preview bar (Messenger/Zalo pattern) ═══ -->
      @if (replyingTo()) {
        <div class="flex-shrink-0 flex items-center gap-2 border-t border-slate-100 bg-slate-50 px-3 py-2">
          <div class="flex-1 min-w-0 border-l-2 border-[#0056D2] pl-2">
            <p class="text-[12px] font-semibold text-[#0056D2]">{{ replyingTo()!.senderName }}</p>
            <p class="text-[12px] text-slate-500 truncate">{{ replyingTo()!.content }}</p>
          </div>
          <button type="button" (click)="cancelReply()"
            class="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      }

      <!-- ═══ Input: fixed bottom — never scrolls away ═══ -->
      <div class="flex-shrink-0">
        <app-message-input
          #messageInput
          [placeholder]="replyingTo() ? 'Trả lời ' + replyingTo()!.senderName + '...' : 'Nhập tin nhắn...'"
          [externallyDisabled]="!network.online()"
          [disabledReason]="'Đang offline — cần kết nối để gửi.'"
          (messageSend)="onSendMessage($event)"></app-message-input>
      </div>
    </div>
  `,
})
export class ConversationViewComponent implements OnInit, OnDestroy, AfterViewChecked {
  readonly messagesContainer = viewChild.required<ElementRef<HTMLDivElement>>('messagesContainer');
  readonly messageInput = viewChild.required<MessageInputComponent>('messageInput');

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly messagingService = inject(MessagingService);
  private readonly authService = inject(AuthService);
  private readonly wsService = inject(WebSocketService);
  private readonly destroyRef = inject(DestroyRef);

  readonly network = inject(NetworkStatusService);
  readonly wsConnected = this.wsService.connected;

  private readonly messagesState = signal<Message[]>([]);
  private readonly conversationState = signal<Conversation | null>(null);
  private readonly draftRecipientState = signal<HeaderParticipant | null>(null);
  readonly replyingTo = signal<{ id: string; senderName: string; content: string } | null>(null);
  readonly showScrollDown = signal(false);

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

  onScroll(): void {
    const el = this.messagesContainer().nativeElement;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    this.showScrollDown.set(distanceFromBottom > 200);
  }

  scrollToMessage(messageId: string): void {
    const el = document.getElementById('msg-' + messageId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Flash highlight
      el.classList.add('bg-[#0056D2]/10');
      setTimeout(() => el.classList.remove('bg-[#0056D2]/10'), 1500);
    }
  }

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
    this.messagingService.unsubscribeConversationRealtime();
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
    // Detect portal from current URL — teacher or student
    const url = this.router.url;
    const base = url.includes('/teacher/') ? '/teacher/messages' : '/student/messages';
    this.router.navigate([base]);
  }

  onSendMessage(event: MessageSendEvent): void {
    const recipient = this.headerParticipant();
    if (!recipient) {
      this.messageInput().onSendError('Không xác định được người nhận.');
      return;
    }

    const reply = this.replyingTo();
    this.replyingTo.set(null);

    const request: SendMessageRequest = {
      recipientId: recipient.id,
      content: event.content,
      replyToId: reply?.id,
      assignmentId: event.assignmentId,
    };

    // Optimistic: show "sending" bubble immediately (WhatsApp pattern)
    const tempId = 'sending-' + Date.now();
    // Build optimistic reply with replyTo for immediate visual (no F5 needed)
    const replyToData = reply ? {
      id: reply.id,
      senderName: reply.senderName,
      content: reply.content,
    } : undefined;

    const optimisticMsg: Message = {
      id: tempId,
      conversationId: this.conversationId || '',
      senderId: this.currentUserId,
      senderName: 'Bạn',
      senderRole: 'STUDENT',
      content: event.content,
      isRead: false,
      status: 'sending',
      replyToId: reply?.id,
      replyTo: replyToData,
      createdAt: new Date().toISOString(),
    };
    this.messagesState.update((msgs) => [...msgs, optimisticMsg]);
    this.shouldScrollToBottom = true;

    this.messagingService.sendMessage(request).subscribe({
      next: (response) => {
        this.error.set(null);
        // Replace optimistic message with real one
        this.messagesState.update((messages) => {
          const withoutOptimistic = messages.filter((m) => m.id !== tempId);
          if (withoutOptimistic.some((m) => m.id === response.message.id)) {
            return withoutOptimistic;
          }
          return [...withoutOptimistic, { ...response.message, status: 'sent' as const }];
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
        // Mark optimistic message as failed
        this.messagesState.update((msgs) =>
          msgs.map((m) => m.id === tempId ? { ...m, status: 'failed' as const } : m)
        );
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

  cancelReply(): void {
    this.replyingTo.set(null);
  }

  onReplyMessage(message: Message): void {
    this.replyingTo.set({
      id: message.id,
      senderName: message.senderId === this.currentUserId ? 'Bạn' : message.senderName,
      content: message.content?.substring(0, 100) || '',
    });
    this.messageInput().focus();
  }

  onRecallMessage(messageId: string): void {
    this.http
      .post<{ data: { recalled: boolean } }>('/api/v3/messages/recall', { messageId })
      .subscribe({
        next: () => {
          this.messagesState.update((messages) =>
            messages.map((m) =>
              m.id === messageId ? { ...m, recalled: true, content: '' } : m
            ),
          );
        },
        error: (err) => {
          const msg = err?.error?.error?.message || err?.error?.message || 'Không thể thu hồi tin nhắn';
          this.error.set(msg);
        },
      });
  }

  onReactionToggle(event: { messageId: string; emoji: string }): void {
    this.http
      .post<{ data: { action: string } }>('/api/v3/messages/reactions', event)
      .subscribe({
        next: (res) => {
          const action = res.data?.action;
          this.messagesState.update((messages) =>
            messages.map((m) => {
              if (m.id !== event.messageId) return m;
              const reactions = [...(m.reactions || [])];
              if (action === 'removed') {
                return { ...m, reactions: reactions.filter((r) => !(r.userId === this.currentUserId && r.emoji === event.emoji)) };
              } else {
                return { ...m, reactions: [...reactions, { userId: this.currentUserId, emoji: event.emoji }] };
              }
            }),
          );
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
    this.messagingService.unsubscribeConversationRealtime();
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
    this.messagingService.subscribeConversationRealtime(conversationId, (wsMsg: WsNewMessage) => {
      // Real-time message from WebSocket — append if not duplicate
      if (wsMsg.senderId !== this.currentUserId) {
        this.messagesState.update((messages) => {
          if (messages.some((m) => m.id === wsMsg.messageId)) return messages;
          return [
            ...messages,
            {
              id: wsMsg.messageId,
              conversationId: wsMsg.conversationId,
              senderId: wsMsg.senderId,
              senderName: wsMsg.senderName,
              senderRole: (wsMsg.senderRole as any) || 'STUDENT',
              content: wsMsg.content,
              isRead: false,
              createdAt: wsMsg.createdAt,
            },
          ];
        });
        this.shouldScrollToBottom = true;

        // Auto-mark as read
        this.messagingService.markAsRead([wsMsg.messageId]).subscribe();
      }
    });

    // Subscribe to real-time reactions (Messenger pattern)
    this.wsService.subscribeToReactions(conversationId).subscribe((wsReaction: WsReaction) => {
      // Skip own reactions (already updated optimistically)
      if (wsReaction.userId === this.currentUserId) return;

      this.messagesState.update((messages) =>
        messages.map((m) => {
          if (m.id !== wsReaction.messageId) return m;
          const reactions = [...(m.reactions || [])];
          if (wsReaction.action === 'removed') {
            return { ...m, reactions: reactions.filter((r) => !(r.userId === wsReaction.userId && r.emoji === wsReaction.emoji)) };
          } else {
            // Don't add duplicate
            if (reactions.some((r) => r.userId === wsReaction.userId && r.emoji === wsReaction.emoji)) return m;
            return { ...m, reactions: [...reactions, { userId: wsReaction.userId, emoji: wsReaction.emoji }] };
          }
        }),
      );
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

  scrollToBottom(): void {
    const container = this.messagesContainer().nativeElement;
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }
}
