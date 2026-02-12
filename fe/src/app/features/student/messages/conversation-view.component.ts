/**
 * Conversation View Component
 *
 * Hiển thị chi tiết một cuộc hội thoại.
 * - Full message history
 * - MessageBubbleComponent cho từng tin nhắn
 * - MessageInputComponent để trả lời
 * - Mark as read khi mở
 *
 * @requirements 2.2, 2.3, 3.4
 */
import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  AfterViewChecked,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  viewChild
} from '@angular/core';

import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MessagingService, SendMessageRequest } from '../../../core/services/messaging.service';
import { AuthService } from '../../../core/services/auth.service';
import { MessageBubbleComponent } from '../../../shared/components/message-bubble.component';
import { MessageInputComponent, MessageSendEvent } from '../../../shared/components/message-input.component';
import { Message, sortMessagesByDate, Conversation } from './utils/message-utils';

@Component({
  selector: 'app-conversation-view',
  imports: [RouterModule, MessageBubbleComponent, MessageInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white border-b px-4 py-3 flex items-center gap-3">
        <button
          (click)="goBack()"
          class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
        </button>

        @if (otherParticipant()) {
          <div class="flex items-center gap-3 flex-1">
            <div class="w-10 h-10 bg-[#0056D2] rounded-full flex items-center justify-center text-white font-medium">
              {{ getInitials(otherParticipant()!.name) }}
            </div>
            <div>
              <h2 class="font-medium text-gray-900">{{ otherParticipant()!.name }}</h2>
              <p class="text-sm text-gray-500">Giảng viên</p>
            </div>
          </div>
        }

        <button
          (click)="refreshMessages()"
          class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Làm mới"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            ></path>
          </svg>
        </button>
      </div>

      <!-- Messages Area -->
      <div #messagesContainer class="flex-1 overflow-y-auto p-4">
        @if (loading()) {
          <div class="flex items-center justify-center h-full">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0056D2]"></div>
            <span class="ml-3 text-gray-600">Đang tải tin nhắn...</span>
          </div>
        } @else if (error()) {
          <div class="flex flex-col items-center justify-center h-full text-center">
            <svg class="w-12 h-12 text-red-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <p class="text-gray-600 mb-2">{{ error() }}</p>
            <button (click)="refreshMessages()" class="text-[#0056D2] hover:text-[#004BB5]">
              Thử lại
            </button>
          </div>
        } @else if (sortedMessages().length === 0) {
          <div class="flex flex-col items-center justify-center h-full text-center">
            <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-1">Chưa có tin nhắn</h3>
            <p class="text-gray-500">Bắt đầu cuộc trò chuyện với giảng viên</p>
          </div>
        } @else {
          @for (message of sortedMessages(); track message.id) {
            <app-message-bubble
              [message]="message"
              [currentUserId]="currentUserId"
            ></app-message-bubble>
          }
        }
      </div>

      <!-- Input Area -->
      <app-message-input
        #messageInput
        [placeholder]="'Nhập tin nhắn...'"
        (messageSend)="onSendMessage($event)"
      ></app-message-input>
    </div>
  `,
})
export class ConversationViewComponent implements OnInit, OnDestroy, AfterViewChecked {
  readonly messagesContainer = viewChild.required<ElementRef<HTMLDivElement>>('messagesContainer');
  readonly messageInput = viewChild.required<MessageInputComponent>('messageInput');

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private messagingService = inject(MessagingService);
  private authService = inject(AuthService);

  // State
  private _messages = signal<Message[]>([]);
  private _conversation = signal<Conversation | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  private shouldScrollToBottom = false;
  
  get currentUserId(): string {
    return this.authService.getCurrentUser()?.id || '';
  }

  conversationId: string | null = null;

  // Computed
  sortedMessages = computed(() => sortMessagesByDate(this._messages()));

  otherParticipant = computed(() => {
    const conv = this._conversation();
    if (!conv) return null;
    return conv.participants.find((p) => p.id !== this.currentUserId) || null;
  });

  ngOnInit(): void {
    this.conversationId = this.route.snapshot.paramMap.get('conversationId');
    if (this.conversationId) {
      this.loadMessages();
      this.messagingService.setCurrentUserId(this.currentUserId);
    }
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

  private loadMessages(): void {
    if (!this.conversationId) return;

    this.loading.set(true);
    this.error.set(null);

    this.messagingService.getMessages(this.conversationId).subscribe({
      next: (messages) => {
        this._messages.set(messages);
        this.loading.set(false);
        this.shouldScrollToBottom = true;

        // Mark unread messages as read
        const unreadIds = messages
          .filter((m) => !m.isRead && m.senderId !== this.currentUserId)
          .map((m) => m.id);
        if (unreadIds.length > 0) {
          this.messagingService.markAsRead(unreadIds).subscribe({
            error: () => {} // Non-blocking — messages still displayed
          });
        }

        // Start polling
        this.messagingService.startPolling(this.conversationId!);
      },
      error: (err) => {
        this.error.set('Không thể tải tin nhắn');
        this.loading.set(false);
      },
    });

    // Also load conversation details
    this.loadConversationDetails();
  }

  private loadConversationDetails(): void {
    if (!this.conversationId) return;
    
    // Load conversation from service
    this.messagingService.getConversations().subscribe({
      next: (conversations) => {
        const conv = conversations.find(c => c.id === this.conversationId);
        if (conv) {
          this._conversation.set(conv);
        }
      }
    });
  }

  onSendMessage(event: MessageSendEvent): void {
    if (!this.conversationId) return;

    const otherParticipant = this.otherParticipant();
    if (!otherParticipant) return;

    const request: SendMessageRequest = {
      recipientId: otherParticipant.id,
      content: event.content,
      assignmentId: event.assignmentId,
    };

    this.messagingService.sendMessage(request).subscribe({
      next: (response) => {
        this._messages.update((msgs) => [...msgs, response.message]);
        this.shouldScrollToBottom = true;
        this.messageInput().onSendComplete();
      },
      error: (err) => {
        this.messageInput().onSendError();
      },
    });
  }

  refreshMessages(): void {
    this.loadMessages();
  }

  goBack(): void {
    this.router.navigate(['/student/messages']);
  }

  private scrollToBottom(): void {
    const container = this.messagesContainer()?.nativeElement;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }
}
