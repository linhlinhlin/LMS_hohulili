/**
 * ChatService - Main service for chat functionality
 * Manages messages, API communication, and state
 */
import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { ChatMessage, ChatResponse } from '../../domain/types';
import { ChatApiClient, ApiError } from '../../infrastructure/api/chat-api.client';
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
  private readonly _isLoading = signal<boolean>(false);
  private readonly _isTyping = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _suggestedQuestions = signal<string[]>([]);
  private readonly _serviceState = signal<ChatServiceState>({
    isHealthy: true,
    isInitialized: false,
    coldStartDetected: false,
  });

  // Public readonly signals
  readonly messages = this._messages.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isTyping = this._isTyping.asReadonly();
  readonly error = this._error.asReadonly();
  readonly suggestedQuestions = this._suggestedQuestions.asReadonly();
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

  constructor() {
    // Auto-save messages when they change
    effect(() => {
      const messages = this._messages();
      if (messages.length > 0) {
        this.sessionService.saveSessionState(messages);
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

    // Check API health
    this.checkHealth();

    this._serviceState.update((state) => ({
      ...state,
      isInitialized: true,
    }));
  }

  /**
   * Send a message to the AI
   */
  async sendMessage(content: string): Promise<void> {
    if (!content.trim() || this._isLoading()) return;

    this._error.set(null);
    this._isLoading.set(true);

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
    const { sessionId, userId, role, context } =
      this.sessionService.getSessionState();

    // Send to API
    this.apiClient
      .sendChatMessage(userId, content, role, sessionId, context)
      .subscribe({
        next: (response: ChatResponse) => {
          this.handleSuccessResponse(response);
        },
        error: (error: ApiError) => {
          this.handleErrorResponse(error, content);
        },
      });
  }

  /**
   * Handle successful API response
   */
  private handleSuccessResponse(response: ChatResponse): void {
    this._isTyping.set(false);
    this._isLoading.set(false);

    if (response.status === 'success' && response.data) {
      // Create AI message
      const aiMessage = createAiMessage(
        response.data.answer,
        response.data.sources,
        response.metadata?.processing_time
      );

      this._messages.update((msgs) => [...msgs, aiMessage]);

      // Update suggested questions
      if (response.data.suggested_questions?.length) {
        this._suggestedQuestions.set(response.data.suggested_questions);
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
  }

  /**
   * Handle API error response
   */
  private handleErrorResponse(error: ApiError, originalMessage: string): void {
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
    if (error.type === 'network' || error.type === 'server') {
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
}
