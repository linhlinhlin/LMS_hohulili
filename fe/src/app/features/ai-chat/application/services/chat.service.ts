/**
 * ChatService - Main service for chat functionality
 * Manages messages, API communication, and state
 * 
 * Session Isolation: Responses are only added to the session that initiated the request
 */
import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { ChatMessage, ChatData, SessionSummary } from '../../domain/types';
import { ChatApiClient, ClientApiError } from '../../infrastructure/api/chat-api.client';
import { ChatStorageRepository } from '../../infrastructure/repositories/chat-storage.repository';
import { SessionManagementService } from './session-management.service';
import {
  createUserMessage,
  createAiMessage,
  updateMessageStatus,
} from '../../domain/entities/chat-message.entity';

/**
 * Helper function to find last index (ES2022 compatible)
 */
function findLastIndex<T>(arr: T[], predicate: (item: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i])) {
      return i;
    }
  }
  return -1;
}

/**
 * Chat service state
 */
interface ChatServiceState {
  isHealthy: boolean;
  isInitialized: boolean;
  coldStartDetected: boolean;
}

/**
 * Pending request tracker to prevent race conditions when switching sessions
 */
interface PendingRequest {
  sessionId: string | null;
  userMessageId: string;
  content: string;
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private readonly apiClient = inject(ChatApiClient);
  private readonly storage = inject(ChatStorageRepository);
  private readonly sessionService = inject(SessionManagementService);

  // State signals
  private readonly _messages = signal<ChatMessage[]>([]);
  private readonly _sessions = signal<SessionSummary[]>([]);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _isTyping = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _suggestedQuestions = signal<string[]>([]);
  private readonly _loadingTime = signal<number>(0);
  private readonly _serviceState = signal<ChatServiceState>({
    isHealthy: true,
    isInitialized: false,
    coldStartDetected: false,
  });

  // CRITICAL: Track pending request to handle session switching
  private pendingRequest: PendingRequest | null = null;

  // Public readonly signals
  readonly messages = this._messages.asReadonly();
  readonly sessions = this._sessions.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isTyping = this._isTyping.asReadonly();
  readonly error = this._error.asReadonly();
  readonly suggestedQuestions = this._suggestedQuestions.asReadonly();
  readonly loadingTime = this._loadingTime.asReadonly();
  readonly serviceState = this._serviceState.asReadonly();

  // Computed signals
  readonly hasMessages = computed(() => this._messages().length > 0);
  readonly lastMessage = computed(() => {
    const msgs = this._messages();
    return msgs.length > 0 ? msgs[msgs.length - 1] : null;
  });
  readonly lastUserMessage = computed(() => {
    return [...this._messages()].reverse().find((m) => m.sender === 'user');
  });
  readonly canSendMessage = computed(() => {
    return !this._isLoading() && this._serviceState().isHealthy;
  });

  // Track last failed message for retry
  private lastFailedMessage: string | null = null;
  private loadingTimer: any = null;

  constructor() {
    // Auto-save messages when they change
    effect(() => {
      const messages = this._messages();
      if (messages.length > 0) {
        this.sessionService.saveSessionState(messages);
      }
    });

    // React to user changes (login/logout) - reload data for new user
    effect(() => {
      const userId = this.sessionService.currentUserId();
      const isInitialized = this.sessionService.isInitialized();

      if (isInitialized) {
        console.log(`🔄 AI Chat: User changed to ${userId || 'anonymous'}, reloading data`);
        // Cancel any pending request when user changes
        this.cancelPendingRequest();
        // Clear current messages and reload for new user
        this._messages.set([]);
        this._sessions.set([]);
        this._suggestedQuestions.set([]);
        this._error.set(null);

        if (userId) {
          // User is logged in - load their data
          this.loadHistory();
          this.loadSessions();
        }
      }
    });

    // Initialize service
    this.initialize();
  }

  /**
   * Cancel pending request when switching context
   */
  private cancelPendingRequest(): void {
    if (this.pendingRequest) {
      console.log('⚠️ Cancelling pending request due to context switch');
      this.pendingRequest = null;
      this._isLoading.set(false);
      this._isTyping.set(false);
      this.stopLoadingTimer();
    }
  }

  /**
   * Initialize the chat service
   */
  async initialize(): Promise<void> {
    // Load stored messages
    this.loadHistory();

    // Load sessions list
    this.loadSessions();

    // Check API health
    this.checkHealth();

    this._serviceState.update((state) => ({
      ...state,
      isInitialized: true,
    }));
  }

  /**
   * Load all chat sessions
   */
  loadSessions(): void {
    this.apiClient.getSessions().subscribe({
      next: (response) => {
        this._sessions.set(response.content);
      },
      error: (err) => {
        console.error('Failed to load sessions', err);
      }
    });
  }

  /**
   * Load a specific session
   * IMPORTANT: This cancels any pending request to prevent cross-session contamination
   */
  loadSession(sessionId: string): void {
    // CRITICAL: Cancel any pending request before switching sessions
    if (this.pendingRequest) {
      console.log('⚠️ Switching session while request pending - cancelling old request');
      this.cancelPendingRequest();
    }

    this._isLoading.set(true);
    this.apiClient.getSessionDetail(sessionId).subscribe({
      next: (detail) => {
        // Map DTO to Domain Entity
        const messages: ChatMessage[] = detail.messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          sender: msg.senderType === 'USER' ? 'user' : 'ai',
          timestamp: new Date(msg.createdAt),
          status: 'sent',
          metadata: {
            sources: msg.sources
          }
        }));

        this._messages.set(messages);
        this.sessionService.setSessionId(sessionId);
        this._suggestedQuestions.set([]); // Clear suggestions when switching
        this._error.set(null);
        this._isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load session detail', err);
        this._error.set('Không thể tải nội dung cuộc trò chuyện');
        this._isLoading.set(false);
      }
    });
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): void {
    this.apiClient.deleteSession(sessionId).subscribe({
      next: () => {
        // Remove from list
        this._sessions.update(sessions => sessions.filter(s => s.id !== sessionId));

        // If current session is deleted, clear it
        if (this.sessionService.getSessionState().sessionId === sessionId) {
          this.startNewSession();
        }
      },
      error: (err) => {
        console.error('Failed to delete session', err);
        this._error.set('Không thể xóa cuộc trò chuyện');
      }
    });
  }

  /**
   * Send a message to the AI
   * 
   * Session Safety: Captures session ID at request time and validates on response
   */
  async sendMessage(content: string): Promise<void> {
    if (!content.trim() || this._isLoading()) return;

    this._error.set(null);
    this._isLoading.set(true);
    this._loadingTime.set(0);

    // Start loading timer
    this.startLoadingTimer();

    // Create and add user message
    const userMessage = createUserMessage(content);
    this._messages.update((msgs) => [...msgs, userMessage]);

    // Update user message status to sent
    this._messages.update((msgs) =>
      msgs.map((m) =>
        m.id === userMessage.id ? updateMessageStatus(m, 'sent') : m
      )
    );

    // Show typing indicator
    this._isTyping.set(true);

    // Get session state BEFORE the request
    const { sessionId, context } = this.sessionService.getSessionState();

    // CRITICAL: Track this request with its session context
    this.pendingRequest = {
      sessionId: sessionId ?? null,
      userMessageId: userMessage.id,
      content: content
    };

    console.log(`📤 Sending message to session: ${sessionId || 'new'}`);

    // Send to API (Backend Proxy)
    this.apiClient
      .sendChatMessage(content, sessionId, context)
      .subscribe({
        next: (response: ChatData) => {
          // CRITICAL: Verify this response belongs to the current session
          const currentSessionId = this.sessionService.currentSessionId();
          const requestSessionId = this.pendingRequest?.sessionId;

          // Check if user switched sessions while waiting
          if (this.pendingRequest && this.pendingRequest.sessionId !== currentSessionId) {
            // Session changed - the response belongs to a different session
            // We need to handle this carefully:
            // 1. If this was a NEW session (sessionId was null), update if we're still on a new session
            // 2. If sessionId changed, we should NOT add to current view

            if (requestSessionId !== null && requestSessionId !== currentSessionId) {
              console.log(`⚠️ Session mismatch! Request was for ${requestSessionId}, but current is ${currentSessionId}`);
              console.log('   Response will be saved to server but not displayed');

              // Clear pending request and loading state
              this.pendingRequest = null;
              this.stopLoadingTimer();
              this._isTyping.set(false);
              this._isLoading.set(false);

              // Refresh sessions list to show the updated session
              this.loadSessions();
              return;
            }
          }

          // Update sessionId if new one is returned (for new sessions)
          if (!sessionId && response.sessionId) {
            this.sessionService.setSessionId(response.sessionId);

            // IMMEDIATELY add new session to sidebar (ChatGPT-like UX)
            const newSession: SessionSummary = {
              id: response.sessionId,
              title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              messageCount: 2 // user + AI
            };

            // Add to top of sessions list immediately
            this._sessions.update(sessions => [newSession, ...sessions]);

            // Also refresh from server to ensure consistency
            setTimeout(() => this.loadSessions(), 500);
          }

          // Clear pending request before handling response
          this.pendingRequest = null;
          this.handleSuccessResponse(response);
        },
        error: (error: ClientApiError) => {
          // Clear pending request on error too
          const pendingSession = this.pendingRequest?.sessionId;
          const currentSession = this.sessionService.currentSessionId();

          // Only show error if still on same session
          if (pendingSession === currentSession || (pendingSession === null && currentSession === null)) {
            this.pendingRequest = null;
            this.handleErrorResponse(error, content);
          } else {
            console.log('⚠️ Error occurred but session changed - suppressing error display');
            this.pendingRequest = null;
            this.stopLoadingTimer();
            this._isTyping.set(false);
            this._isLoading.set(false);
          }
        },
      });
  }

  /**
   * Handle successful API response
   */
  private handleSuccessResponse(response: ChatData): void {
    this.stopLoadingTimer();
    this._isTyping.set(false);
    this._isLoading.set(false);

    // Create AI message
    const aiMessage = createAiMessage(
      response.answer,
      response.sources,
      response.metadata.processingTime
    );

    this._messages.update((msgs) => [...msgs, aiMessage]);

    // Update suggested questions
    if (response.suggestedQuestions?.length) {
      this._suggestedQuestions.set(response.suggestedQuestions);
    } else {
      this._suggestedQuestions.set([]);
    }

    // Check for cold start
    if (this.apiClient.wasLastRequestColdStart()) {
      this._serviceState.update((state) => ({
        ...state,
        coldStartDetected: true,
      }));
    }

    this.lastFailedMessage = null;
  }

  /**
   * Handle API error response
   */
  private handleErrorResponse(error: ClientApiError, originalMessage: string): void {
    this.stopLoadingTimer();
    this._isTyping.set(false);
    this._isLoading.set(false);

    // Update last user message to error status
    this._messages.update((msgs) => {
      const lastUserMsgIndex = findLastIndex(msgs, (m: ChatMessage) => m.sender === 'user');
      if (lastUserMsgIndex !== -1) {
        const updated = [...msgs];
        updated[lastUserMsgIndex] = updateMessageStatus(
          updated[lastUserMsgIndex],
          'error'
        );
        return updated;
      }
      return msgs;
    });

    // Set error message
    this._error.set(error.message);
    this.lastFailedMessage = originalMessage;

    // Update service state if needed
    if (error.type === 'network' || error.type === 'server' || error.type === 'ai_service_error' || error.type === 'service_unavailable') {
      this._serviceState.update((state) => ({
        ...state,
        isHealthy: false,
      }));
    }
  }

  /**
   * Retry the last failed message
   */
  async retryLastMessage(): Promise<void> {
    if (!this.lastFailedMessage) return;

    // Remove the failed message
    this._messages.update((msgs) => {
      const lastUserMsgIndex = findLastIndex(
        msgs,
        (m: ChatMessage) => m.sender === 'user' && m.status === 'error'
      );
      if (lastUserMsgIndex !== -1) {
        return msgs.filter((_, i) => i !== lastUserMsgIndex);
      }
      return msgs;
    });

    // Resend
    const messageToRetry = this.lastFailedMessage;
    this.lastFailedMessage = null;
    await this.sendMessage(messageToRetry);
  }

  // Pagination state for infinite scroll
  private historyOffset = 0;
  private readonly HISTORY_LIMIT = 20;
  private hasMoreHistory = true;
  private isLoadingMoreHistory = false;

  /**
   * Load chat history from server (Server-Side Sync)
   */
  loadHistory(): void {
    const userId = this.sessionService.currentUserId();
    if (!userId) {
      console.log('No user ID, skipping history load');
      return;
    }

    // Reset pagination
    this.historyOffset = 0;
    this.hasMoreHistory = true;

    this.apiClient.getChatHistory(userId, this.HISTORY_LIMIT, 0).subscribe({
      next: (response) => {
        // Map server response to ChatMessage format
        const messages: ChatMessage[] = response.data.map((msg, index) => ({
          id: `history-${Date.now()}-${index}`,
          content: msg.content,
          sender: msg.role === 'user' ? 'user' : 'ai' as const,
          timestamp: new Date(msg.timestamp),
          status: 'sent' as const,
        }));

        this._messages.set(messages);
        this.historyOffset = response.data.length;
        this.hasMoreHistory = response.data.length >= this.HISTORY_LIMIT;

        console.log(`✅ Loaded ${messages.length} messages from server`);
      },
      error: (err) => {
        console.error('Failed to load history from server', err);
        // Fallback: Don't show error to user, just start fresh
        this._messages.set([]);
      }
    });
  }

  /**
   * Load more history messages (for infinite scroll)
   */
  loadMoreHistory(): void {
    if (this.isLoadingMoreHistory || !this.hasMoreHistory) return;

    const userId = this.sessionService.currentUserId();
    if (!userId) return;

    this.isLoadingMoreHistory = true;

    this.apiClient.getChatHistory(userId, this.HISTORY_LIMIT, this.historyOffset).subscribe({
      next: (response) => {
        const olderMessages: ChatMessage[] = response.data.map((msg, index) => ({
          id: `history-${Date.now()}-${this.historyOffset + index}`,
          content: msg.content,
          sender: msg.role === 'user' ? 'user' : 'ai' as const,
          timestamp: new Date(msg.timestamp),
          status: 'sent' as const,
        }));

        // Prepend older messages to the beginning
        this._messages.update(msgs => [...olderMessages, ...msgs]);
        this.historyOffset += response.data.length;
        this.hasMoreHistory = response.data.length >= this.HISTORY_LIMIT;
        this.isLoadingMoreHistory = false;

        console.log(`✅ Loaded ${olderMessages.length} more messages`);
      },
      error: (err) => {
        console.error('Failed to load more history', err);
        this.isLoadingMoreHistory = false;
      }
    });
  }

  /**
   * Check if more history can be loaded
   */
  canLoadMoreHistory(): boolean {
    return this.hasMoreHistory && !this.isLoadingMoreHistory;
  }

  /**
   * Clear chat history (Server-Side)
   */
  clearHistory(): void {
    const userId = this.sessionService.currentUserId();

    // Cancel any pending request
    this.cancelPendingRequest();

    this._messages.set([]);
    this._suggestedQuestions.set([]);
    this._error.set(null);
    this.lastFailedMessage = null;
    this.historyOffset = 0;
    this.hasMoreHistory = true;

    // Clear from server if user is logged in
    if (userId) {
      this.apiClient.deleteChatHistory(userId).subscribe({
        next: () => console.log('✅ History cleared from server'),
        error: (err) => console.error('Failed to clear server history', err)
      });
    }
  }

  /**
   * Start a new chat session
   */
  startNewSession(): void {
    // Cancel any pending request
    this.cancelPendingRequest();

    this._messages.set([]);
    this._suggestedQuestions.set([]);
    this._error.set(null);
    this.lastFailedMessage = null;
    this.sessionService.startNewSession();
  }

  /**
   * Check API health
   */
  checkHealth(): void {
    this.apiClient.checkHealth().subscribe({
      next: (health) => {
        this._serviceState.update((state) => ({
          ...state,
          isHealthy: health.status === 'healthy',
        }));
      },
      error: () => {
        this._serviceState.update((state) => ({
          ...state,
          isHealthy: false,
        }));
      },
    });
  }

  /**
   * Wake up the server (call before user interaction)
   */
  wakeUpServer(): void {
    this.apiClient.wakeUpServer().subscribe();
  }

  /**
   * Send a suggested question
   */
  sendSuggestedQuestion(question: string): void {
    this._suggestedQuestions.set([]);
    this.sendMessage(question);
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this._error.set(null);
  }

  /**
   * Start loading timer
   */
  private startLoadingTimer(): void {
    this.stopLoadingTimer();
    this.loadingTimer = setInterval(() => {
      this._loadingTime.update((t) => t + 100);
    }, 100);
  }

  /**
   * Stop loading timer
   */
  private stopLoadingTimer(): void {
    if (this.loadingTimer) {
      clearInterval(this.loadingTimer);
      this.loadingTimer = null;
    }
  }
}
