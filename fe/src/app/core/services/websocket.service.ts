/**
 * WebSocket Service
 *
 * Quản lý kết nối STOMP/WebSocket tới backend.
 * Tự động reconnect, JWT auth qua STOMP headers.
 * Cung cấp observable subscriptions cho real-time messaging.
 */
import { Injectable, inject, signal, computed, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { Subject, Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface WsNewMessage {
  type: 'NEW_MESSAGE';
  messageId: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  createdAt: string;
  /** Reply reference (if backend includes it in WS payload) */
  replyToId?: string;
  replyTo?: { id: string; senderName: string; content: string };
}

export interface WsMessagesRead {
  type: 'MESSAGES_READ';
  conversationId: string;
  readByUserId: string;
  count: number;
  timestamp: string;
}

export interface WsUnreadCount {
  type: 'UNREAD_COUNT';
  unreadCount: number;
  timestamp: string;
}

export interface WsReaction {
  type: 'REACTION';
  conversationId: string;
  messageId: string;
  userId: string;
  emoji: string;
  action: 'added' | 'removed';
  timestamp: string;
}

export type WsEvent = WsNewMessage | WsMessagesRead | WsUnreadCount | WsReaction;

@Injectable({
  providedIn: 'root',
})
export class WebSocketService implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

  private client: Client | null = null;
  private subscriptions = new Map<string, StompSubscription>();
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private readonly reconnectBaseDelay = 2000; // ms

  /** Connection state */
  private readonly _connected = signal(false);
  readonly connected = this._connected.asReadonly();

  /** Subjects for different event types */
  private readonly conversationMessages$ = new Map<string, Subject<WsNewMessage>>();
  private readonly conversationReactions$ = new Map<string, Subject<WsReaction>>();
  private readonly notifications$ = new Subject<WsUnreadCount>();
  private readonly allEvents$ = new Subject<WsEvent>();

  /** Observable for all events (useful for debugging) */
  readonly events$ = this.allEvents$.asObservable();

  connect(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.client?.active) return;

    const token = this.auth.getToken();
    if (!token) return;

    // Native WebSocket URL — no SockJS needed (SOTA: Coursera/Slack pattern)
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const brokerURL = `${wsProtocol}//${host}/ws`;

    this.client = new Client({
      brokerURL,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 0, // We handle reconnect manually
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,

      onConnect: () => {
        this._connected.set(true);
        this.reconnectAttempts = 0;
        this.subscribeToUserNotifications();
      },

      onStompError: (frame) => {
        console.warn('[WS] STOMP error:', frame.headers['message']);
        this._connected.set(false);
        this.scheduleReconnect();
      },

      onWebSocketClose: () => {
        this._connected.set(false);
        this.scheduleReconnect();
      },

      onDisconnect: () => {
        this._connected.set(false);
      },
    });

    this.client.activate();
  }

  disconnect(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions.clear();
    this.conversationMessages$.forEach((subj) => subj.complete());
    this.conversationMessages$.clear();

    if (this.client?.active) {
      this.client.deactivate();
    }
    this.client = null;
    this._connected.set(false);
    this.reconnectAttempts = this.maxReconnectAttempts; // prevent auto-reconnect
  }

  /**
   * Subscribe to real-time messages for a specific conversation.
   * Returns an Observable that emits new messages.
   */
  subscribeToConversation(conversationId: string): Observable<WsNewMessage> {
    if (!this.conversationMessages$.has(conversationId)) {
      this.conversationMessages$.set(conversationId, new Subject<WsNewMessage>());
    }

    const destination = `/topic/conversation/${conversationId}`;
    if (!this.subscriptions.has(destination) && this.client?.active) {
      this.doSubscribe(destination, conversationId);
    }

    return this.conversationMessages$.get(conversationId)!.asObservable();
  }

  /**
   * Unsubscribe from a specific conversation.
   */
  unsubscribeFromConversation(conversationId: string): void {
    const destination = `/topic/conversation/${conversationId}`;
    const sub = this.subscriptions.get(destination);
    if (sub) {
      sub.unsubscribe();
      this.subscriptions.delete(destination);
    }
    // Don't complete the subject — may resubscribe later
  }

  /**
   * Observable for personal notifications (unread count updates).
   */
  getNotifications(): Observable<WsUnreadCount> {
    return this.notifications$.asObservable();
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.notifications$.complete();
    this.allEvents$.complete();
  }

  private subscribeToUserNotifications(): void {
    if (!this.client?.active) return;

    // Subscribe to personal notification queue
    const notifDest = '/user/queue/notifications';
    if (!this.subscriptions.has(notifDest)) {
      const sub = this.client.subscribe(notifDest, (message: IMessage) => {
        try {
          const payload = JSON.parse(message.body) as WsUnreadCount;
          this.notifications$.next(payload);
          this.allEvents$.next(payload);
        } catch (e) {
          console.warn('[WS] Failed to parse notification:', e);
        }
      });
      this.subscriptions.set(notifDest, sub);
    }
  }

  /**
   * Subscribe to reaction events for a conversation.
   */
  subscribeToReactions(conversationId: string): Observable<WsReaction> {
    if (!this.conversationReactions$.has(conversationId)) {
      this.conversationReactions$.set(conversationId, new Subject<WsReaction>());
    }
    return this.conversationReactions$.get(conversationId)!.asObservable();
  }

  private doSubscribe(destination: string, conversationId: string): void {
    if (!this.client?.active) return;

    const sub = this.client.subscribe(destination, (message: IMessage) => {
      try {
        const payload = JSON.parse(message.body) as WsEvent;
        this.allEvents$.next(payload);

        if (payload.type === 'NEW_MESSAGE') {
          const subject = this.conversationMessages$.get(conversationId);
          if (subject) {
            subject.next(payload as WsNewMessage);
          }
        } else if (payload.type === 'REACTION') {
          const subject = this.conversationReactions$.get(conversationId);
          if (subject) {
            subject.next(payload as WsReaction);
          }
        }
      } catch (e) {
        console.warn('[WS] Failed to parse message:', e);
      }
    });
    this.subscriptions.set(destination, sub);
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

    const token = this.auth.getToken();
    if (!token) return; // Don't reconnect if logged out

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectBaseDelay * Math.pow(1.5, this.reconnectAttempts - 1),
      30000
    );

    setTimeout(() => {
      if (!this.client?.active && this.auth.getToken()) {
        // Re-create client with fresh token
        this.client = null;
        this.connect();

        // Re-subscribe to all conversation topics
        const conversationIds = Array.from(this.conversationMessages$.keys());
        conversationIds.forEach((id) => {
          const dest = `/topic/conversation/${id}`;
          if (!this.subscriptions.has(dest)) {
            this.doSubscribe(dest, id);
          }
        });
      }
    }, delay);
  }
}
