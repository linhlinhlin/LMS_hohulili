/**
 * Student Inbox Component
 *
 * Trang inbox hiển thị tất cả cuộc hội thoại với giảng viên.
 * - Danh sách conversations
 * - Search/filter
 * - Sort by most recent
 * - Empty state
 *
 * @requirements 2.1, 4.1, 6.1
 */
import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MessagingService } from '../../../core/services/messaging.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConversationListItemComponent } from './conversation-list-item.component';
import {
  ConversationListItem,
  filterConversationsBySearch,
  sortConversationsByRecent,
  filterEmptyConversations,
  toConversationListItem,
  calculateTotalUnreadCount,
} from './utils/message-utils';

@Component({
  selector: 'app-student-inbox',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ConversationListItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white border-b sticky top-0 z-10">
        <div class="max-w-4xl mx-auto px-4 py-4">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Tin nhắn</h1>
              <p class="text-sm text-gray-500">
                {{ totalUnread() > 0 ? totalUnread() + ' tin nhắn chưa đọc' : 'Tất cả tin nhắn đã đọc' }}
              </p>
            </div>
            <button
              (click)="refreshConversations()"
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

          <!-- Search -->
          <div class="relative">
            <svg
              class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              ></path>
            </svg>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onSearchChange()"
              placeholder="Tìm kiếm cuộc hội thoại..."
              class="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            @if (searchQuery) {
              <button
                (click)="clearSearch()"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            }
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="max-w-4xl mx-auto">
        @if (loading()) {
          <div class="flex items-center justify-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span class="ml-3 text-gray-600">Đang tải...</span>
          </div>
        } @else if (error()) {
          <div class="text-center py-12">
            <svg class="w-12 h-12 text-red-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <p class="text-gray-600 mb-2">{{ error() }}</p>
            <button (click)="refreshConversations()" class="text-blue-600 hover:text-blue-800">
              Thử lại
            </button>
          </div>
        } @else if (filteredConversations().length === 0) {
          <div class="text-center py-12">
            <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
            </svg>
            @if (searchQuery) {
              <h3 class="text-lg font-medium text-gray-900 mb-1">Không tìm thấy kết quả</h3>
              <p class="text-gray-500">Thử tìm kiếm với từ khóa khác</p>
            } @else {
              <h3 class="text-lg font-medium text-gray-900 mb-1">Chưa có tin nhắn</h3>
              <p class="text-gray-500">Tin nhắn từ giảng viên sẽ xuất hiện ở đây</p>
            }
          </div>
        } @else {
          <div class="bg-white divide-y">
            @for (conversation of filteredConversations(); track conversation.conversationId) {
              <app-conversation-list-item
                [conversation]="conversation"
                [isSelected]="selectedConversationId() === conversation.conversationId"
                (select)="onSelectConversation($event)"
              ></app-conversation-list-item>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class StudentInboxComponent implements OnInit, OnDestroy {
  private messagingService = inject(MessagingService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // State
  private _conversations = signal<ConversationListItem[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  searchQuery = '';
  selectedConversationId = signal<string | null>(null);
  
  private get currentUserId(): string {
    return this.authService.getCurrentUser()?.id || '';
  }

  // Computed
  filteredConversations = computed(() => {
    let convs = this._conversations();
    if (this.searchQuery.trim()) {
      // Filter by search - need to convert back to Conversation type for filtering
      convs = convs.filter(
        (c) =>
          c.otherParticipant.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          c.lastMessagePreview.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }
    return convs;
  });

  totalUnread = computed(() => {
    return this._conversations().reduce((total, c) => total + c.unreadCount, 0);
  });

  ngOnInit(): void {
    this.loadConversations();
    this.messagingService.setCurrentUserId(this.currentUserId);
  }

  ngOnDestroy(): void {
    this.messagingService.stopPolling();
  }

  private loadConversations(): void {
    this.loading.set(true);
    this.error.set(null);

    this.messagingService.getConversations().subscribe({
      next: (conversations) => {
        const listItems = conversations.map((c) =>
          toConversationListItem(c, this.currentUserId)
        );
        this._conversations.set(listItems);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading conversations:', err);
        this.error.set('Không thể tải danh sách hội thoại');
        this.loading.set(false);
      },
    });
  }

  refreshConversations(): void {
    this.loadConversations();
  }

  onSearchChange(): void {
    // Search is reactive via computed
  }

  clearSearch(): void {
    this.searchQuery = '';
  }

  onSelectConversation(conversationId: string): void {
    this.selectedConversationId.set(conversationId);
    this.router.navigate(['/student/messages', conversationId]);
  }
}
