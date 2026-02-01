/**
 * Messaging Service
 *
 * Service quản lý nhắn tin giữa giảng viên và học viên.
 * Hỗ trợ real-time updates thông qua polling hoặc WebSocket.
 *
 * @requirements 1.2, 1.3, 1.5, 2.2, 2.3, 3.4, 4.1, 6.2
 */
import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, interval, Subject, BehaviorSubject } from 'rxjs';
import { map, catchError, switchMap, takeUntil, tap } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  Message,
  Conversation,
  ConversationListItem,
  sortMessagesByDate,
  sortConversationsByRecent,
  filterEmptyConversations,
  filterConversationsBySearch,
  calculateUnreadCount,
  toConversationListItem,
} from '../../features/student/messages/utils/message-utils';

// API DTOs
export interface SendMessageRequest {
  recipientId: string;
  content: string;
  assignmentId?: string;
}

export interface SendMessageResponse {
  message: Message;
  conversationId: string;
}

export interface MarkAsReadRequest {
  messageIds: string[];
}

@Injectable({
  providedIn: 'root',
})
export class MessagingService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v3/messages';

  // State signals
  private _conversations = signal<Conversation[]>([]);
  private _currentConversation = signal<Conversation | null>(null);
  private _messages = signal<Message[]>([]);
  private _loading = signal(false);
  private _error = signal<string | null>(null);
  private _currentUserId = signal<string>('');

  // Polling control
  private pollingInterval = 5000; // 5 seconds
  private stopPolling$ = new Subject<void>();
  private isPolling = false;


  // Public readonly signals
  readonly conversations = this._conversations.asReadonly();
  readonly currentConversation = this._currentConversation.asReadonly();
  readonly messages = this._messages.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed signals
  readonly sortedConversations = computed(() => {
    const convs = this._conversations();
    const filtered = filterEmptyConversations(convs);
    return sortConversationsByRecent(filtered);
  });

  readonly sortedMessages = computed(() => {
    return sortMessagesByDate(this._messages());
  });

  readonly totalUnreadCount = computed(() => {
    return this._conversations().reduce((total, conv) => total + conv.unreadCount, 0);
  });

  readonly conversationListItems = computed(() => {
    const userId = this._currentUserId();
    return this.sortedConversations().map((conv) =>
      toConversationListItem(conv, userId)
    );
  });

  /**
   * Set current user ID for filtering
   */
  setCurrentUserId(userId: string): void {
    this._currentUserId.set(userId);
  }

  /**
   * Get all conversations for the current user
   *
   * @param includeArchived - Whether to include archived conversations
   * @returns Observable of conversations
   */
  getConversations(includeArchived: boolean = false): Observable<Conversation[]> {
    this._loading.set(true);
    this._error.set(null);

    return this.http
      .get<{ data: Conversation[] }>(`${this.apiUrl}/conversations`, {
        params: { includeArchived: includeArchived.toString() },
      })
      .pipe(
        map((response) => response.data || []),
        tap((conversations) => {
          this._conversations.set(conversations);
          this._loading.set(false);
        }),
        catchError((error) => {
          console.error('Error fetching conversations:', error);
          this._error.set('Không thể tải danh sách hội thoại');
          this._loading.set(false);
          return of([]);
        })
      );
  }

  /**
   * Get a specific conversation between two users
   *
   * @param userId1 - First user ID
   * @param userId2 - Second user ID
   * @returns Observable of conversation
   */
  getConversation(userId1: string, userId2: string): Observable<Conversation | null> {
    this._loading.set(true);

    return this.http
      .get<{ data: Conversation | null }>(`${this.apiUrl}/conversations/between`, {
        params: { userId1, userId2 },
      })
      .pipe(
        map((response) => response.data),
        tap((conversation) => {
          this._currentConversation.set(conversation);
          this._loading.set(false);
        }),
        catchError((error) => {
          console.error('Error fetching conversation:', error);
          this._loading.set(false);
          return of(null);
        })
      );
  }

  /**
   * Get messages for a conversation
   *
   * @param conversationId - The conversation ID
   * @returns Observable of messages
   */
  getMessages(conversationId: string): Observable<Message[]> {
    this._loading.set(true);
    this._error.set(null);

    return this.http
      .get<{ data: Message[] }>(`${this.apiUrl}/conversations/${conversationId}/messages`)
      .pipe(
        map((response) => response.data || []),
        tap((messages) => {
          this._messages.set(messages);
          this._loading.set(false);
        }),
        catchError((error) => {
          console.error('Error fetching messages:', error);
          this._error.set('Không thể tải tin nhắn');
          this._loading.set(false);
          return of([]);
        })
      );
  }


  /**
   * Send a new message
   *
   * @param request - Send message request
   * @returns Observable of send response
   *
   * **Feature: teacher-student-messaging, Property 1: Message Delivery Guarantee**
   */
  sendMessage(request: SendMessageRequest): Observable<SendMessageResponse> {
    this._loading.set(true);

    return this.http
      .post<{ data: SendMessageResponse }>(`${this.apiUrl}/send`, request)
      .pipe(
        map((response) => response.data),
        tap((response) => {
          // Add message to local state
          this._messages.update((msgs) => [...msgs, response.message]);

          // Update conversation's last message
          this._conversations.update((convs) =>
            convs.map((conv) =>
              conv.id === response.conversationId
                ? {
                  ...conv,
                  lastMessage: {
                    content: response.message.content,
                    senderId: response.message.senderId,
                    createdAt: response.message.createdAt,
                  },
                  updatedAt: response.message.createdAt,
                }
                : conv
            )
          );

          this._loading.set(false);
        }),
        catchError((error) => {
          console.error('Error sending message:', error);
          this._error.set('Không thể gửi tin nhắn');
          this._loading.set(false);
          throw error;
        })
      );
  }

  /**
   * Mark messages as read
   *
   * @param messageIds - Array of message IDs to mark as read
   * @returns Observable of success
   *
   * **Feature: teacher-student-messaging, Property 5: Read Status Update**
   */
  markAsRead(messageIds: string[]): Observable<void> {
    if (messageIds.length === 0) return of(undefined);

    return this.http
      .post<void>(`${this.apiUrl}/mark-read`, { messageIds })
      .pipe(
        tap(() => {
          // Update local message state
          this._messages.update((msgs) =>
            msgs.map((msg) =>
              messageIds.includes(msg.id) ? { ...msg, isRead: true } : msg
            )
          );

          // Update unread count in conversations
          const readCount = messageIds.length;
          const currentConvId = this._currentConversation()?.id;
          if (currentConvId) {
            this._conversations.update((convs) =>
              convs.map((conv) =>
                conv.id === currentConvId
                  ? { ...conv, unreadCount: Math.max(0, conv.unreadCount - readCount) }
                  : conv
              )
            );
          }
        }),
        catchError((error) => {
          console.error('Error marking messages as read:', error);
          return of(undefined);
        })
      );
  }

  /**
   * Archive a conversation
   *
   * @param conversationId - The conversation ID to archive
   * @returns Observable of success
   *
   * **Feature: teacher-student-messaging, Property 9: Archive Round-Trip**
   */
  archiveConversation(conversationId: string): Observable<void> {
    return this.http
      .post<void>(`${this.apiUrl}/conversations/${conversationId}/archive`, {})
      .pipe(
        tap(() => {
          this._conversations.update((convs) =>
            convs.map((conv) =>
              conv.id === conversationId ? { ...conv, isArchived: true } : conv
            )
          );
        }),
        catchError((error) => {
          console.error('Error archiving conversation:', error);
          this._error.set('Không thể lưu trữ hội thoại');
          throw error;
        })
      );
  }

  /**
   * Restore an archived conversation
   *
   * @param conversationId - The conversation ID to restore
   * @returns Observable of success
   */
  restoreConversation(conversationId: string): Observable<void> {
    return this.http
      .post<void>(`${this.apiUrl}/conversations/${conversationId}/restore`, {})
      .pipe(
        tap(() => {
          this._conversations.update((convs) =>
            convs.map((conv) =>
              conv.id === conversationId ? { ...conv, isArchived: false } : conv
            )
          );
        }),
        catchError((error) => {
          console.error('Error restoring conversation:', error);
          this._error.set('Không thể khôi phục hội thoại');
          throw error;
        })
      );
  }


  /**
   * Search messages across all conversations
   *
   * @param query - Search query string
   * @returns Observable of matching conversations
   *
   * **Feature: teacher-student-messaging, Property 6: Search Results Relevance**
   */
  searchMessages(query: string): Observable<Conversation[]> {
    if (!query || query.trim() === '') {
      return of(this._conversations());
    }

    return this.http
      .get<Conversation[]>(`${this.apiUrl}/search`, {
        params: { q: query },
      })
      .pipe(
        catchError((error) => {
          console.error('Error searching messages:', error);
          // Fallback to local search
          const filtered = filterConversationsBySearch(
            this._conversations(),
            query,
            this._currentUserId()
          );
          return of(filtered);
        })
      );
  }

  /**
   * Get total unread count for the current user
   *
   * @returns Observable of unread count
   */
  getUnreadCount(): Observable<number> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/unread-count`).pipe(
      map((response) => response.count),
      catchError((error) => {
        console.error('Error fetching unread count:', error);
        return of(this.totalUnreadCount());
      })
    );
  }

  /**
   * Start polling for new messages
   * Uses interval-based polling for real-time updates
   *
   * @param conversationId - Optional conversation ID to poll for specific conversation
   */
  startPolling(conversationId?: string): void {
    if (this.isPolling) return;
    this.isPolling = true;

    interval(this.pollingInterval)
      .pipe(
        takeUntil(this.stopPolling$),
        switchMap(() => {
          if (conversationId) {
            return this.getMessages(conversationId);
          }
          return this.getConversations();
        })
      )
      .subscribe();
  }

  /**
   * Stop polling for messages
   */
  stopPolling(): void {
    this.stopPolling$.next();
    this.isPolling = false;
  }

  /**
   * Poll messages once (manual refresh)
   *
   * @param conversationId - The conversation ID to refresh
   */
  pollMessages(conversationId: string): Observable<Message[]> {
    return this.getMessages(conversationId);
  }

  /**
   * Clear current conversation state
   */
  clearCurrentConversation(): void {
    this._currentConversation.set(null);
    this._messages.set([]);
  }

  /**
   * Clear all state
   */
  clearAll(): void {
    this._conversations.set([]);
    this._currentConversation.set(null);
    this._messages.set([]);
    this._error.set(null);
    this.stopPolling();
  }

}
