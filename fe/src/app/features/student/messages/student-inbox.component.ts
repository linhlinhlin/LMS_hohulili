import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import {
  MessageRecipientCandidate,
  MessagingService,
} from '../../../core/services/messaging.service';
import { ConversationListItemComponent } from './conversation-list-item.component';
import { MessageRecipientPickerComponent } from './message-recipient-picker.component';
import {
  Conversation,
  ConversationListItem,
  toConversationListItem,
} from './utils/message-utils';

@Component({
  selector: 'app-student-inbox',
  imports: [
    FormsModule,
    RouterModule,
    ConversationListItemComponent,
    MessageRecipientPickerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-slate-50">
      <div class="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div class="mx-auto max-w-4xl px-4 py-4">
          <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 class="text-2xl font-bold text-slate-900">Tin nhắn</h1>
              <p class="mt-1 text-sm text-slate-500">
                {{ totalUnread() > 0 ? totalUnread() + ' tin nhắn chưa đọc' : 'Tất cả tin nhắn đã đọc' }}
              </p>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                (click)="openRecipientPicker()"
                class="rounded-lg bg-[#0056D2] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#004BB5]">
                Tin nhắn mới
              </button>
              <button
                type="button"
                (click)="refreshConversations()"
                class="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Làm mới danh sách hội thoại">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
              </button>
            </div>
          </div>

          <div class="relative">
            <svg
              class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onSearchChange()"
              placeholder="Tìm kiếm hội thoại..."
              class="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-10 focus:border-[#0056D2] focus:ring-2 focus:ring-[#0056D2]" />
            @if (searchQuery) {
              <button
                type="button"
                (click)="clearSearch()"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                aria-label="Xóa từ khóa tìm kiếm">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            }
          </div>
        </div>
      </div>

      <div class="mx-auto max-w-4xl px-4 py-4">
        @if (error() && filteredConversations().length > 0) {
          <div class="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {{ error() }}
          </div>
        }

        @if (loading() && allConversations().length === 0) {
          <div class="flex items-center justify-center py-12">
            <div class="h-8 w-8 animate-spin rounded-full border-b-2 border-[#0056D2]"></div>
            <span class="ml-3 text-slate-600">Đang tải hội thoại...</span>
          </div>
        } @else if (error() && allConversations().length === 0) {
          <div class="rounded-2xl border border-red-200 bg-white px-6 py-12 text-center">
            <svg class="mx-auto mb-3 h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <p class="mb-3 text-slate-600">{{ error() }}</p>
            <button
              type="button"
              (click)="refreshConversations()"
              class="rounded-lg bg-[#0056D2] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#004BB5]">
              Thử lại
            </button>
          </div>
        } @else if (filteredConversations().length === 0) {
          <div class="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
            <svg class="mx-auto mb-4 h-16 w-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
            </svg>
            @if (searchQuery.trim()) {
              <h3 class="mb-1 text-lg font-semibold text-slate-900">Không tìm thấy hội thoại phù hợp</h3>
              <p class="text-slate-500">Hãy thử từ khóa khác hoặc tạo cuộc trò chuyện mới.</p>
            } @else {
              <h3 class="mb-1 text-lg font-semibold text-slate-900">Chưa có tin nhắn nào</h3>
              <p class="text-slate-500">Tin nhắn từ giảng viên sẽ xuất hiện ở đây.</p>
            }
          </div>
        } @else {
          <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            @for (conversation of filteredConversations(); track conversation.conversationId) {
              <app-conversation-list-item
                [conversation]="conversation"
                [isSelected]="selectedConversationId() === conversation.conversationId"
                (select)="onSelectConversation($event)"></app-conversation-list-item>
            }
          </div>
        }
      </div>

      @if (showRecipientPicker()) {
        <app-message-recipient-picker
          (close)="closeRecipientPicker()"
          (recipientSelected)="handleRecipientSelected($event)"></app-message-recipient-picker>
      }
    </div>
  `,
})
export class StudentInboxComponent implements OnInit, OnDestroy {
  private readonly messagingService = inject(MessagingService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private readonly conversationsState = signal<ConversationListItem[]>([]);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly selectedConversationId = signal<string | null>(null);
  readonly showRecipientPicker = signal(false);

  searchQuery = '';

  private get currentUserId(): string {
    return this.authService.getCurrentUser()?.id || '';
  }

  readonly allConversations = computed(() => this.conversationsState());

  readonly filteredConversations = computed(() => {
    const keyword = this.searchQuery.trim().toLowerCase();
    if (!keyword) {
      return this.conversationsState();
    }

    return this.conversationsState().filter((conversation) => {
      return (
        conversation.otherParticipant.name.toLowerCase().includes(keyword) ||
        conversation.lastMessagePreview.toLowerCase().includes(keyword)
      );
    });
  });

  readonly totalUnread = computed(() => {
    return this.conversationsState().reduce((total, conversation) => total + conversation.unreadCount, 0);
  });

  ngOnInit(): void {
    this.messagingService.setCurrentUserId(this.currentUserId);
    this.loadConversations();
  }

  ngOnDestroy(): void {
    this.messagingService.stopPolling();
  }

  refreshConversations(): void {
    this.loadConversations();
  }

  onSearchChange(): void {
    // Search is handled by computed state.
  }

  clearSearch(): void {
    this.searchQuery = '';
  }

  openRecipientPicker(): void {
    this.showRecipientPicker.set(true);
  }

  closeRecipientPicker(): void {
    this.showRecipientPicker.set(false);
  }

  handleRecipientSelected(recipient: MessageRecipientCandidate): void {
    this.showRecipientPicker.set(false);

    if (recipient.conversationId) {
      this.onSelectConversation(recipient.conversationId);
      return;
    }

    this.router.navigate(['/student/messages/new'], {
      queryParams: {
        recipientId: recipient.userId,
        recipientName: recipient.displayName,
        recipientRole: recipient.role,
      },
    });
  }

  onSelectConversation(conversationId: string): void {
    this.selectedConversationId.set(conversationId);
    this.router.navigate(['/student/messages', conversationId]);
  }

  private loadConversations(): void {
    this.loading.set(true);
    this.error.set(null);

    this.messagingService.getConversations().subscribe({
      next: (conversations) => {
        this.applyConversations(conversations);
        this.loading.set(false);
        this.startConversationPolling();
      },
      error: () => {
        this.error.set('Không thể tải danh sách hội thoại.');
        this.loading.set(false);
      },
    });
  }

  private startConversationPolling(): void {
    this.messagingService.startConversationListPolling((conversations) => {
      this.applyConversations(conversations);
      if (this.error()) {
        this.error.set(null);
      }
    });
  }

  private applyConversations(conversations: Conversation[]): void {
    const items = conversations.map((conversation) => toConversationListItem(conversation, this.currentUserId));
    this.conversationsState.set(items);
  }
}
