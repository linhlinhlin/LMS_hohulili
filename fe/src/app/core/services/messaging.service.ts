/**
 * Messaging Service
 *
 * Service quản lý nhắn tin giữa giảng viên và học viên.
 * Realtime hiện tại dùng polling có kiểm soát, không nuốt state local của component.
 */
import { inject, Injectable, signal, computed, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, Subscription, interval, of, throwError } from 'rxjs';
import { catchError, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import {
  Conversation,
  Message,
  filterEmptyConversations,
  sortConversationsByRecent,
  sortMessagesByDate,
  toConversationListItem,
} from '../../features/student/messages/utils/message-utils';
import { WebSocketService, WsNewMessage, WsUnreadCount } from './websocket.service';

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

export interface MessageRecipientCandidate {
  userId: string;
  displayName: string;
  email: string;
  role: 'ADMIN' | 'ORG_ADMIN' | 'TEACHER' | 'STUDENT';
  avatarUrl?: string | null;
  conversationId?: string | null;
  relationshipType: string;
  contextType: string;
  contextId?: string | null;
  contextLabel?: string | null;
  canMessage: boolean;
}

interface RawConversation {
  id?: string;
  otherUserId?: string;
  otherUserName?: string;
  otherUserRole?: string;
  participants?: Array<{
    id?: string;
    name?: string;
    role?: string;
    avatar?: string | null;
  }>;
  lastMessage?: {
    content?: string;
    senderId?: string;
    createdAt?: string;
  } | null;
  lastMessagePreview?: string | null;
  lastMessageAt?: string | null;
  unreadCount?: number;
  isArchived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface RawMessage {
  id?: string;
  conversationId?: string;
  senderId?: string;
  senderName?: string;
  senderRole?: string;
  content?: string;
  isRead?: boolean;
  createdAt?: string;
  readAt?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class MessagingService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly ws = inject(WebSocketService);
  private readonly apiUrl = '/api/v3/messages';

  private readonly _conversations = signal<Conversation[]>([]);
  private readonly _currentConversation = signal<Conversation | null>(null);
  private readonly _messages = signal<Message[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _currentUserId = signal<string>('');
  private readonly _unreadCount = signal(0);

  private readonly pollingInterval = 5000;
  private readonly stopPolling$ = new Subject<void>();
  private isPolling = false;
  private pollingKey: string | null = null;

  /** WebSocket subscriptions */
  private wsSubs: Subscription[] = [];
  private wsConversationId: string | null = null;

  readonly conversations = this._conversations.asReadonly();
  readonly currentConversation = this._currentConversation.asReadonly();
  readonly messages = this._messages.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly sortedConversations = computed(() => {
    return sortConversationsByRecent(filterEmptyConversations(this._conversations()));
  });

  readonly sortedMessages = computed(() => sortMessagesByDate(this._messages()));

  readonly totalUnreadCount = computed(() => {
    const wsCount = this._unreadCount();
    if (wsCount > 0) return wsCount;
    return this._conversations().reduce((total, conversation) => total + conversation.unreadCount, 0);
  });

  readonly conversationListItems = computed(() => {
    const userId = this._currentUserId();
    return this.sortedConversations().map((conversation) => toConversationListItem(conversation, userId));
  });

  setCurrentUserId(userId: string): void {
    this._currentUserId.set(userId);
  }

  /**
   * Kết nối WebSocket và lắng nghe unread count notifications.
   * Gọi 1 lần khi user đã đăng nhập (ví dụ từ AppComponent hoặc layout).
   */
  connectWebSocket(): void {
    this.ws.connect();

    // Listen for unread count updates pushed from server
    const notifSub = this.ws.getNotifications().subscribe((event: WsUnreadCount) => {
      this._unreadCount.set(event.unreadCount);
    });
    this.wsSubs.push(notifSub);
  }

  /**
   * Subscribe to real-time messages for a specific conversation.
   * Falls back to polling if WebSocket is not connected.
   */
  subscribeConversationRealtime(
    conversationId: string,
    onNewMessage: (msg: WsNewMessage) => void,
  ): void {
    this.wsConversationId = conversationId;

    if (this.ws.connected()) {
      // WebSocket path
      const sub = this.ws.subscribeToConversation(conversationId).subscribe(onNewMessage);
      this.wsSubs.push(sub);
    }
    // Always start polling as fallback (WebSocket will give faster updates when available)
    this.startConversationPolling(conversationId, (messages) => {
      this._messages.set(messages);
    });
  }

  /**
   * Unsubscribe from conversation real-time updates.
   */
  unsubscribeConversationRealtime(): void {
    if (this.wsConversationId) {
      this.ws.unsubscribeFromConversation(this.wsConversationId);
      this.wsConversationId = null;
    }
    this.stopPolling();
  }

  disconnectWebSocket(): void {
    this.wsSubs.forEach((s) => s.unsubscribe());
    this.wsSubs = [];
    this.ws.disconnect();
  }

  ngOnDestroy(): void {
    this.disconnectWebSocket();
  }

  getConversations(includeArchived: boolean = false): Observable<Conversation[]> {
    this._loading.set(true);
    this._error.set(null);

    return this.fetchConversationsSilently(includeArchived).pipe(
      tap(() => this._loading.set(false)),
      catchError((error) => {
        this._error.set('Không thể tải danh sách hội thoại');
        this._loading.set(false);
        return throwError(() => error);
      })
    );
  }

  getConversation(userId1: string, userId2: string): Observable<Conversation | null> {
    this._loading.set(true);
    this._error.set(null);

    return this.http
      .get<{ data: RawConversation | null }>(`${this.apiUrl}/conversations/between`, {
        params: { userId1, userId2 },
      })
      .pipe(
        map((response) => response.data ? this.normalizeConversation(response.data) : null),
        tap((conversation) => {
          this._currentConversation.set(conversation);
          this._loading.set(false);
        }),
        catchError((error) => {
          this._error.set('Không thể tải cuộc hội thoại');
          this._loading.set(false);
          return throwError(() => error);
        })
      );
  }

  getMessages(conversationId: string): Observable<Message[]> {
    this._loading.set(true);
    this._error.set(null);

    return this.fetchMessagesSilently(conversationId).pipe(
      tap(() => this._loading.set(false)),
      catchError((error) => {
        this._error.set('Không thể tải tin nhắn');
        this._loading.set(false);
        return throwError(() => error);
      })
    );
  }

  getRecipients(options: {
    query?: string;
    contextType?: string;
    contextId?: string;
    limit?: number;
  } = {}): Observable<MessageRecipientCandidate[]> {
    const params: Record<string, string> = {};
    if (options.query?.trim()) {
      params['q'] = options.query.trim();
    }
    if (options.contextType?.trim()) {
      params['contextType'] = options.contextType.trim();
    }
    if (options.contextId?.trim()) {
      params['contextId'] = options.contextId.trim();
    }
    if (options.limit) {
      params['limit'] = String(options.limit);
    }

    return this.http
      .get<{ data?: { items?: MessageRecipientCandidate[] } }>(`${this.apiUrl}/recipients`, { params })
      .pipe(
        map((response) => (response?.data?.items ?? []).map((item) => ({
          ...item,
          conversationId: item.conversationId ?? null,
          contextId: item.contextId ?? null,
          contextLabel: item.contextLabel ?? null,
          avatarUrl: item.avatarUrl ?? null,
        })))
      );
  }

  sendMessage(request: SendMessageRequest): Observable<SendMessageResponse> {
    this._loading.set(true);

    return this.http
      .post<{ data: { message: RawMessage; conversationId: string } }>(`${this.apiUrl}/send`, request)
      .pipe(
        map((response) => ({
          conversationId: response.data.conversationId,
          message: this.normalizeMessage(response.data.message),
        })),
        tap((response) => {
          this._messages.update((messages) => [...messages, response.message]);
          this._conversations.update((conversations) =>
            conversations.map((conversation) =>
              conversation.id === response.conversationId
                ? {
                    ...conversation,
                    lastMessage: {
                      content: response.message.content,
                      senderId: response.message.senderId,
                      createdAt: response.message.createdAt,
                    },
                    updatedAt: response.message.createdAt,
                  }
                : conversation
            )
          );
          this._loading.set(false);
        }),
        catchError((error) => {
          this._error.set(error?.error?.message ?? error?.error?.error?.message ?? 'Không thể gửi tin nhắn');
          this._loading.set(false);
          return throwError(() => error);
        })
      );
  }

  markAsRead(messageIds: string[]): Observable<void> {
    if (messageIds.length === 0) {
      return of(undefined);
    }

    const previousMessages = this._messages();
    const previousConversations = this._conversations();

    return this.http.post<void>(`${this.apiUrl}/mark-read`, { messageIds }).pipe(
      tap(() => {
        this._messages.update((messages) =>
          messages.map((message) =>
            messageIds.includes(message.id) ? { ...message, isRead: true } : message
          )
        );

        const currentConversationId = this._currentConversation()?.id;
        if (currentConversationId) {
          this._conversations.update((conversations) =>
            conversations.map((conversation) =>
              conversation.id === currentConversationId
                ? {
                    ...conversation,
                    unreadCount: Math.max(
                      0,
                      conversation.unreadCount - messageIds.length
                    ),
                  }
                : conversation
            )
          );
        }
      }),
      catchError((error) => {
        this._messages.set(previousMessages);
        this._conversations.set(previousConversations);
        this._error.set('Không thể cập nhật trạng thái đã đọc');
        return throwError(() => error);
      })
    );
  }

  getUnreadCount(): Observable<number> {
    return this.http
      .get<{ data?: { unreadCount?: number }; unreadCount?: number }>(`${this.apiUrl}/unread-count`)
      .pipe(
        map((response) => response?.data?.unreadCount ?? response?.unreadCount ?? this.totalUnreadCount()),
        catchError(() => of(this.totalUnreadCount()))
      );
  }

  startConversationPolling(conversationId: string, onMessages: (messages: Message[]) => void): void {
    this.startPollingLoop(
      `conversation:${conversationId}`,
      () => this.fetchMessagesSilently(conversationId).pipe(catchError(() => of(this._messages()))),
      onMessages
    );
  }

  startConversationListPolling(onConversations: (conversations: Conversation[]) => void): void {
    this.startPollingLoop(
      'conversations',
      () => this.fetchConversationsSilently().pipe(catchError(() => of(this._conversations()))),
      onConversations
    );
  }

  stopPolling(): void {
    this.stopPolling$.next();
    this.isPolling = false;
    this.pollingKey = null;
  }

  pollMessages(conversationId: string): Observable<Message[]> {
    return this.fetchMessagesSilently(conversationId);
  }

  clearCurrentConversation(): void {
    this._currentConversation.set(null);
    this._messages.set([]);
  }

  clearAll(): void {
    this._conversations.set([]);
    this._currentConversation.set(null);
    this._messages.set([]);
    this._error.set(null);
    this.stopPolling();
  }

  private fetchConversationsSilently(includeArchived: boolean = false): Observable<Conversation[]> {
    return this.http
      .get<{ data: RawConversation[] }>(`${this.apiUrl}/conversations`, {
        params: { includeArchived: includeArchived.toString() },
      })
      .pipe(
        map((response) => (response.data ?? []).map((conversation) => this.normalizeConversation(conversation))),
        tap((conversations) => this._conversations.set(conversations))
      );
  }

  private fetchMessagesSilently(conversationId: string): Observable<Message[]> {
    return this.http
      .get<{ data: RawMessage[] }>(`${this.apiUrl}/conversations/${conversationId}/messages`)
      .pipe(
        map((response) => (response.data ?? []).map((message) => this.normalizeMessage(message))),
        tap((messages) => this._messages.set(messages))
      );
  }

  private startPollingLoop<T>(key: string, fetcher: () => Observable<T>, onNext: (value: T) => void): void {
    if (this.isPolling && this.pollingKey === key) {
      return;
    }

    this.stopPolling();
    this.isPolling = true;
    this.pollingKey = key;

    interval(this.pollingInterval)
      .pipe(
        takeUntil(this.stopPolling$),
        switchMap(() => fetcher())
      )
      .subscribe({
        next: onNext,
        error: () => {
          // polling is best-effort; keep UI stable
        },
      });
  }

  private normalizeConversation(raw: RawConversation): Conversation {
    const currentUserId = this._currentUserId();
    const participants = raw.participants?.length
      ? raw.participants.map((participant) => ({
          id: participant.id ?? '',
          name: participant.name ?? 'Unknown',
          role: this.normalizeRole(participant.role),
          avatar: participant.avatar ?? undefined,
        }))
      : this.buildLegacyParticipants(raw, currentUserId);

    const lastMessage = raw.lastMessage
      ? {
          content: raw.lastMessage.content ?? raw.lastMessagePreview ?? '',
          senderId: raw.lastMessage.senderId ?? raw.otherUserId ?? '',
          createdAt: raw.lastMessage.createdAt ?? raw.lastMessageAt ?? raw.updatedAt ?? raw.createdAt ?? new Date().toISOString(),
        }
      : raw.lastMessagePreview
        ? {
            content: raw.lastMessagePreview,
            senderId: raw.otherUserId ?? '',
            createdAt: raw.lastMessageAt ?? raw.updatedAt ?? raw.createdAt ?? new Date().toISOString(),
          }
        : undefined;

    return {
      id: raw.id ?? '',
      participants,
      lastMessage,
      unreadCount: Number(raw.unreadCount ?? 0),
      isArchived: Boolean(raw.isArchived),
      createdAt: raw.createdAt ?? raw.updatedAt ?? new Date().toISOString(),
      updatedAt: raw.updatedAt ?? raw.lastMessageAt ?? raw.createdAt ?? new Date().toISOString(),
    };
  }

  private normalizeMessage(raw: RawMessage): Message {
    return {
      id: raw.id ?? '',
      conversationId: raw.conversationId ?? '',
      senderId: raw.senderId ?? '',
      senderName: raw.senderName ?? 'Unknown',
      senderRole: this.normalizeRole(raw.senderRole),
      content: raw.content ?? '',
      isRead: Boolean(raw.isRead),
      createdAt: raw.createdAt ?? new Date().toISOString(),
      readAt: raw.readAt ?? undefined,
    };
  }

  private buildLegacyParticipants(raw: RawConversation, currentUserId: string): Conversation['participants'] {
    const otherUserId = raw.otherUserId ?? '';
    return [
      {
        id: currentUserId || 'current-user',
        name: 'Ban',
        role: 'STUDENT',
        avatar: undefined,
      },
      {
        id: otherUserId,
        name: raw.otherUserName ?? 'Unknown',
        role: this.normalizeRole(raw.otherUserRole),
        avatar: undefined,
      },
    ];
  }

  private normalizeRole(role: string | undefined): 'ADMIN' | 'ORG_ADMIN' | 'TEACHER' | 'STUDENT' {
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
}
