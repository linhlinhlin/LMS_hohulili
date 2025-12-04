/**
 * ChatService - Main service for chat functionality
 * Manages messages, API communication, and state
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

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private readonly apiClient = inject(ChatApiClient);
  private readonly storage = inject(ChatStorageRepository);
  private readonly sessionService = inject(SessionManagementService);

  // State signals
  private readonly _messages = signal<ChatMessage[]>([]);
  private readonly _sessions = signal<SessionSummary[]>([]); // New: Sessions list
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

  // Public readonly signals
  readonly messages = this._messages.asReadonly();
  readonly sessions = this._sessions.asReadonly(); // New: Expose sessions
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
   */
  loadSession(sessionId: string): void {
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
    if (confirm('Bạn có chắc chắn muốn xóa cuộc trò chuyện này?')) {
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
  }

  /**
   * Send a message to the AI
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

    // Get session state
    const { sessionId, context } = this.sessionService.getSessionState();

    // Send to API (Backend Proxy)
    this.apiClient
      .sendChatMessage(content, sessionId, context)
      .subscribe({
        next: (response: ChatData) => {
          // Update sessionId if new one is returned
          if (!sessionId && response.sessionId) {
            this.sessionService.setSessionId(response.sessionId);
            // Reload sessions list to show the new one
            this.loadSessions();
          }
          this.handleSuccessResponse(response);
        },
        error: (error: ClientApiError) => {
          this.handleErrorResponse(error, content);
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

  /**
   * Load chat history from storage
   */
  loadHistory(): void {
    const session = this.storage.loadSession();
    if (session?.messages?.length) {
      this._messages.set(session.messages);
    }
  }

  /**
   * Clear chat history
   */
  clearHistory(): void {
    this._messages.set([]);
    this._suggestedQuestions.set([]);
    this._error.set(null);
    this.lastFailedMessage = null;
    this.storage.clearSession();
  }

  /**
   * Start a new chat session
   */
  startNewSession(): void {
    this.clearHistory();
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
