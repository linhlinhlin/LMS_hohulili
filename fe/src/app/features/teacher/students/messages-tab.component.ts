/**
 * Messages Tab Component
 *
 * Tab hiển thị cuộc hội thoại với học viên trong Student Detail.
 * - Hiển thị lịch sử tin nhắn
 * - Input để soạn và gửi tin nhắn mới
 * - Auto-scroll đến tin nhắn mới nhất
 * - Hỗ trợ đính kèm assignment reference
 *
 * @requirements 1.1, 1.4
 */
import {
  Component,
  input,
  OnInit,
  OnDestroy,
  viewChild,
  ElementRef,
  AfterViewChecked,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessagingService, SendMessageRequest } from '../../../core/services/messaging.service';
import { AuthService } from '../../../core/services/auth.service';
import { MessageBubbleComponent } from '../../../shared/components/message-bubble.component';
import {
  MessageInputComponent,
  MessageSendEvent,
  AssignmentOption,
} from '../../../shared/components/message-input.component';
import { Message, sortMessagesByDate } from '../../student/messages/utils/message-utils';

@Component({
  selector: 'app-messages-tab',
  standalone: true,
  imports: [CommonModule, MessageBubbleComponent, MessageInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col h-[600px] bg-gray-50 rounded-lg overflow-hidden">
      <!-- Header -->
      <div class="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span class="text-blue-600 font-medium">
              {{ getInitials(studentName()) }}
            </span>
          </div>
          <div>
            <h3 class="font-medium text-gray-900">{{ studentName() || 'Học viên' }}</h3>
            <p class="text-sm text-gray-500">Tin nhắn trực tiếp</p>
          </div>
        </div>
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
      <div
        #messagesContainer
        class="flex-1 overflow-y-auto p-4"
      >
        @if (loading()) {
          <div class="flex items-center justify-center h-full">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span class="ml-3 text-gray-600">Đang tải tin nhắn...</span>
          </div>
        } @else if (error()) {
          <div class="flex flex-col items-center justify-center h-full text-center">
            <svg class="w-12 h-12 text-red-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <p class="text-gray-600 mb-2">{{ error() }}</p>
            <button
              (click)="refreshMessages()"
              class="text-blue-600 hover:text-blue-800"
            >
              Thử lại
            </button>
          </div>
        } @else if (sortedMessages().length === 0) {
          <div class="flex flex-col items-center justify-center h-full text-center">
            <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-1">Chưa có tin nhắn</h3>
            <p class="text-gray-500">Bắt đầu cuộc trò chuyện với học viên</p>
          </div>
        } @else {
          @for (message of sortedMessages(); track message.id) {
            <app-message-bubble
              [message]="message"
              [currentUserId]="currentTeacherId"
            ></app-message-bubble>
          }
        }
      </div>

      <!-- Input Area -->
      <app-message-input
        #messageInput
        [placeholder]="'Nhập tin nhắn cho ' + (studentName() || 'học viên') + '...'"
        [showAssignmentSelector]="true"
        [assignments]="availableAssignments()"
        (messageSend)="onSendMessage($event)"
      ></app-message-input>
    </div>
  `,
})
export class MessagesTabComponent implements OnInit, OnDestroy, AfterViewChecked {
  readonly messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');
  readonly messageInput = viewChild<MessageInputComponent>('messageInput');

  // Signal inputs (Angular v20+)
  readonly studentId = input.required<string>();
  readonly studentName = input.required<string>();

  private messagingService = inject(MessagingService);
  private authService = inject(AuthService);

  get currentTeacherId(): string {
    return this.authService.getCurrentUser()?.id || '';
  }

  // State
  private _messages = signal<Message[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  private shouldScrollToBottom = false;
  private conversationId: string | null = null;

  // Available assignments for reference
  availableAssignments = signal<AssignmentOption[]>([]);

  // Computed
  sortedMessages = computed(() => sortMessagesByDate(this._messages()));

  ngOnInit(): void {
    this.loadMessages();
    this.loadAvailableAssignments();
    this.messagingService.setCurrentUserId(this.currentTeacherId);
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
    this.loading.set(true);
    this.error.set(null);

    // First get or create conversation
    this.messagingService.getConversation(this.currentTeacherId, this.studentId()).subscribe({
      next: (conversation) => {
        if (conversation) {
          this.conversationId = conversation.id;
          this.loadConversationMessages(conversation.id);
        } else {
          // No existing conversation
          this._messages.set([]);
          this.loading.set(false);
        }
      },
      error: (err) => {
        console.error('Error loading conversation:', err);
        this.error.set('Không thể tải cuộc hội thoại');
        this.loading.set(false);
      },
    });
  }

  private loadConversationMessages(conversationId: string): void {
    this.messagingService.getMessages(conversationId).subscribe({
      next: (messages) => {
        this._messages.set(messages);
        this.loading.set(false);
        this.shouldScrollToBottom = true;
        // Start polling for new messages
        this.messagingService.startPolling(conversationId);
      },
      error: (err) => {
        console.error('Error loading messages:', err);
        this.error.set('Không thể tải tin nhắn');
        this.loading.set(false);
      },
    });
  }

  private loadAvailableAssignments(): void {
    // TODO: Load from API - for now empty
    this.availableAssignments.set([]);
  }

  onSendMessage(event: MessageSendEvent): void {
    const request: SendMessageRequest = {
      recipientId: this.studentId(),
      content: event.content,
      assignmentId: event.assignmentId,
    };

    this.messagingService.sendMessage(request).subscribe({
      next: (response) => {
        // Add message to local state
        this._messages.update((msgs) => [...msgs, response.message]);
        this.shouldScrollToBottom = true;
        this.messageInput()?.onSendComplete();

        // Update conversation ID if this is first message
        if (!this.conversationId) {
          this.conversationId = response.conversationId;
        }
      },
      error: (err) => {
        console.error('Error sending message:', err);
        this.messageInput()?.onSendError('Không thể gửi tin nhắn. Vui lòng thử lại.');
      },
    });
  }

  refreshMessages(): void {
    if (this.conversationId) {
      this.loadConversationMessages(this.conversationId);
    } else {
      this.loadMessages();
    }
  }

  private scrollToBottom(): void {
    const container = this.messagesContainer()?.nativeElement;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  getInitials(name: string): string {
    if (!name) return '';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }
}
