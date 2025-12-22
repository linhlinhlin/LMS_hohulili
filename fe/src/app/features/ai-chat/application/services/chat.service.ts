/**
 * ChatService - Main service for chat functionality
 * Manages messages, API communication, and state
 * 
 * Session Isolation: Responses are only added to the session that initiated the request
 * 
 * Updated: 10/12/2025 - Added typewriter effect for streaming-like UX
 */
import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { ChatMessage, ChatData, SessionSummary, Source } from '../../domain/types';
import { ChatApiClient, ClientApiError } from '../../infrastructure/api/chat-api.client';
import { SessionManagementService } from './session-management.service';
import {
  createUserMessage,
  createAiMessage,
  updateMessageStatus,
} from '../../domain/entities/chat-message.entity';
import { Typewriter } from '../../utils/typewriter.util';

/**
 * Feature flag for real streaming vs fake streaming
 * Set to true when AI Service streaming endpoint is deployed
 * 
 * ✅ ENABLED: Team AI confirmed streaming working (11/12/2025)
 * See: Documents/XACNHAN_STREAMING_OK_20251211.md
 */
const USE_REAL_STREAMING = true;

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
 * Map source from AI Service (snake_case) to Frontend (camelCase)
 * AI Service returns: image_url, page_number, document_id, bounding_boxes
 * Frontend expects: imageUrl, pageNumber, documentId, boundingBoxes
 */
function mapSourceToFrontend(source: any): Source {
  return {
    title: source.title || '',
    content: source.content || '',
    url: source.url || source.image_url,
    imageUrl: source.imageUrl || source.image_url,
    pageNumber: source.pageNumber ?? source.page_number,
    documentId: source.documentId || source.document_id,
    boundingBoxes: (source.boundingBoxes || source.bounding_boxes || []).map((box: any) => ({
      x0: box.x0,
      y0: box.y0,
      x1: box.x1,
      y1: box.y1
    }))
  };
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

  // Typewriter for streaming effect
  private typewriter = new Typewriter();

  // Signal for streaming text (updated during typewriter effect)
  private readonly _streamingText = signal<string>('');
  private readonly _streamingThinking = signal<string>('');
  private readonly _isStreaming = signal<boolean>(false);

  readonly streamingText = this._streamingText.asReadonly();
  readonly streamingThinking = this._streamingThinking.asReadonly();
  readonly isStreaming = this._isStreaming.asReadonly();

  constructor() {
    // Auto-save messages when they change
    effect(() => {
      const messages = this._messages();
      if (messages.length > 0) {
        this.sessionService.saveSessionState(messages);
      }
    });

    // React to user changes (login/logout) - reload data for new user
    // Track previous userId to detect actual changes
    let previousUserId: string | null = null;

    effect(() => {
      const userId = this.sessionService.currentUserId();
      const isInitialized = this.sessionService.isInitialized();

      if (isInitialized) {
        // Only react if userId actually changed (not just signal re-read)
        if (previousUserId !== null && previousUserId !== userId) {
          console.log(`🔄 AI Chat: User changed from ${previousUserId || 'anonymous'} to ${userId || 'anonymous'}, reloading data`);
          // Cancel any pending request when user changes
          this.cancelPendingRequest();
          // Clear current messages and reload for new user
          this._messages.set([]);
          this._sessions.set([]);
          this._suggestedQuestions.set([]);
          this._error.set(null);

          if (userId) {
            // User is logged in - load their sessions
            this.loadSessions();
          }
        } else if (previousUserId === null && userId) {
          // Initial load for logged-in user
          console.log(`🔄 AI Chat: Initial load for user ${userId}`);
          this.loadSessions();
        }

        previousUserId = userId;
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
    // Also stop any ongoing streaming
    this.stopStreaming();
  }

  /**
   * Initialize the chat service
   * NOTE: Data loading (loadHistory/loadSessions) is handled by effect() reactively
   *       to prevent duplicate calls when user logs in.
   */
  async initialize(): Promise<void> {
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
   * Uses real streaming if available, otherwise falls back to regular request with typewriter effect
   * 
   * Session Safety: Captures session ID at request time and validates on response
   */
  async sendMessage(content: string): Promise<void> {
    if (!content.trim() || this._isLoading()) return;

    // Use real streaming if enabled
    if (USE_REAL_STREAMING) {
      return this.sendMessageWithStreaming(content);
    }

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
   * Handle successful API response with typewriter effect
   * Creates streaming-like UX similar to ChatGPT/Claude
   */
  private handleSuccessResponse(response: ChatData): void {
    this.stopLoadingTimer();
    this._isTyping.set(false);
    this._isLoading.set(false);

    // Start streaming effect
    this._isStreaming.set(true);
    this._streamingText.set('');
    this._streamingThinking.set('');

    // Create placeholder AI message (will be updated during streaming)
    const aiMessage = createAiMessage(
      '', // Start empty, will be filled by typewriter
      response.sources,
      response.metadata.processingTime
    );

    this._messages.update((msgs) => [...msgs, aiMessage]);
    const messageIndex = this._messages().length - 1;

    // Start typewriter effect
    this.typewriter.start(response.answer, {
      onChunk: (currentText) => {
        this._streamingText.set(currentText);

        // Update the AI message content in real-time
        this._messages.update((msgs) => {
          const updated = [...msgs];
          if (updated[messageIndex]) {
            updated[messageIndex] = {
              ...updated[messageIndex],
              content: currentText
            };
          }
          return updated;
        });
      },
      onThinking: (thinkingText) => {
        this._streamingThinking.set(thinkingText);
      },
      onComplete: () => {
        this._isStreaming.set(false);
        this._streamingText.set('');
        this._streamingThinking.set('');

        // Ensure final content is set
        this._messages.update((msgs) => {
          const updated = [...msgs];
          if (updated[messageIndex]) {
            updated[messageIndex] = {
              ...updated[messageIndex],
              content: response.answer
            };
          }
          return updated;
        });

        // Update suggested questions after streaming completes
        if (response.suggestedQuestions?.length) {
          this._suggestedQuestions.set(response.suggestedQuestions);
        } else {
          this._suggestedQuestions.set([]);
        }
      }
    });

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
   * Stop streaming effect (e.g., when user switches session)
   */
  stopStreaming(): void {
    this.typewriter.stop();
    this._isStreaming.set(false);
    this._streamingText.set('');
    this._streamingThinking.set('');
  }

  /**
   * Streaming speed configuration
   * MIN_CHUNK_DELAY: Minimum delay between UI updates (ms) for consistent speed
   */
  private readonly MIN_CHUNK_DELAY = 30; // 30ms between updates for smooth animation
  private lastChunkTime = 0;

  /**
   * Patterns that indicate STATUS messages (not real thinking or answer)
   * These are short status updates like "Đang phân tích...", "Đang tra cứu..."
   * They should NOT be shown in thinking panel or answer, just SKIPPED
   * 
   * Status messages are typically:
   * - Short (< 100 chars)
   * - End with "..."
   * - Describe what AI is doing, not what AI is thinking
   */
  private readonly STATUS_PATTERNS = [
    /^Đang phân tích/,
    /^Đang tra cứu/,
    /^Đang tìm kiếm/,
    /^Đang xử lý/,
    /^Đang tổng hợp/,
    /^Đang bắt đầu/,
    /^Đang tổng hợp câu trả lời/,
    /^Đang kiểm tra/,
    /^Đang truy vấn/,
    /^Đang kết nối/,
    /^Đang đọc/,
    /^Đang chuẩn bị/,
    /^Analyzing/i,
    /^Searching/i,
    /^Processing/i,
    /^Starting/i,
    /^Checking/i,
    /^Querying/i,
    /^Connecting/i,
    /^Reading/i,
    /^Preparing/i,
  ];

  /**
   * Patterns that indicate REAL THINKING content (AI reasoning process)
   * These should be stored in thinking panel, not in main answer
   * 
   * Common Vietnamese thinking patterns from AI:
   * - "Người dùng lại gửi một lời chào..."
   * - "Tôi cần đáp lại một cách thân thiện..."
   * - "Tôi sẽ tiếp tục duy trì phong cách..."
   */
  private readonly REAL_THINKING_PATTERNS = [
    /^Người dùng/,           // "Người dùng lại gửi..."
    /^Tôi cần/,              // "Tôi cần đáp lại..."
    /^Tôi sẽ/,               // "Tôi sẽ tiếp tục..."
    /^Tôi nhận thấy/,        // "Tôi nhận thấy..."
    /^Tôi hiểu/,             // "Tôi hiểu rằng..."
    /^Tôi đang/,             // "Tôi đang xem xét..."
    /^Câu hỏi này/,          // "Câu hỏi này..."
    /^Đây là/,               // "Đây là câu hỏi..."
    /^Để trả lời/,           // "Để trả lời câu hỏi..."
    /^Theo như/,             // "Theo như tôi hiểu..."
    /^Dựa trên/,             // "Dựa trên thông tin..."
    /^Với câu hỏi/,          // "Với câu hỏi này..."
    /^Xem xét/,              // "Xem xét yêu cầu..."
    /^Phân tích:/,           // "Phân tích: ..."
    /^Suy nghĩ:/,            // "Suy nghĩ: ..."
    /^The user/i,            // English: "The user is asking..."
    /^I need to/i,           // English: "I need to..."
    /^I will/i,              // English: "I will..."
    /^I understand/i,        // English: "I understand..."
    /^This question/i,       // English: "This question..."
    /^Let me/i,              // English: "Let me think..."
    /^Thinking:/i,           // English: "Thinking: ..."
  ];

  /**
   * Track if we're in status phase (receiving status messages before real content)
   */
  private isInStatusPhase = false;

  /**
   * Track if we're receiving real thinking content
   */
  private isReceivingThinking = false;

  /**
   * Check if content is a STATUS message (not real thinking or answer)
   * Status messages are short updates about what AI is doing
   * They should be SKIPPED, not added to thinking or answer
   */
  private isStatusMessage(content: string): boolean {
    if (!content) return false;
    const trimmed = content.trim();

    // Status messages are typically short and match specific patterns
    if (trimmed.length > 200) return false; // Real content is usually longer

    // Check for status patterns
    const matchesStatus = this.STATUS_PATTERNS.some(pattern => pattern.test(trimmed));
    if (matchesStatus) {
      console.log('📊 Detected STATUS message (will skip):', trimmed.substring(0, 50));
      this.isInStatusPhase = true;
      return true;
    }

    // If we're in status phase and content contains "..." and is short, it's continuation
    if (this.isInStatusPhase && trimmed.length < 100 && trimmed.includes('...')) {
      console.log('📊 Detected STATUS continuation (will skip):', trimmed.substring(0, 50));
      return true;
    }

    return false;
  }

  /**
   * Check if content is REAL THINKING (AI reasoning process)
   * This should be stored in thinking panel
   * 
   * Real thinking patterns (Vietnamese):
   * - "Người dùng..." (The user...)
   * - "Tôi cần..." (I need to...)
   * - "Tôi sẽ..." (I will...)
   * - "Câu hỏi này..." (This question...)
   * 
   * NOT thinking (status messages):
   * - "Đang phân tích..." (Analyzing...)
   * - "Đang tra cứu..." (Searching...)
   */
  private isRealThinkingContent(content: string): boolean {
    if (!content) return false;
    const trimmed = content.trim();

    // If already receiving thinking, continue until we see clear answer content
    if (this.isReceivingThinking) {
      // Check if this looks like the end of thinking (start of real answer)
      // Real answers typically:
      // 1. Don't start with thinking patterns
      // 2. Are longer and more substantive
      // 3. Don't start with "Tôi" or "Người" (common thinking starters)

      // If content is very short, it might be continuation of thinking
      if (trimmed.length < 30) {
        return true;
      }

      // Check if it matches thinking patterns - if so, continue thinking
      const matchesThinking = this.REAL_THINKING_PATTERNS.some(p => p.test(trimmed));
      if (matchesThinking) {
        return true;
      }

      // Check if it starts with common thinking starters
      if (trimmed.startsWith('Tôi ') || trimmed.startsWith('Người ') ||
        trimmed.startsWith('Để ') || trimmed.startsWith('Theo ')) {
        return true;
      }

      // If we get here, it's likely the real answer
      console.log('📝 Looks like real answer, ending thinking phase');
      this.isReceivingThinking = false;
      return false;
    }

    // Check for real thinking patterns at the START of content
    const matchesThinking = this.REAL_THINKING_PATTERNS.some(pattern => pattern.test(trimmed));
    if (matchesThinking) {
      console.log('🧠 Detected REAL THINKING content:', trimmed.substring(0, 50));
      this.isReceivingThinking = true;
      return true;
    }

    return false;
  }

  /**
   * Reset status phase tracker
   */
  private resetStatusPhase(): void {
    this.isInStatusPhase = false;
    this.isReceivingThinking = false;
  }

  /**
   * Throttle function to ensure consistent streaming speed
   */
  private async throttleChunk(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastChunkTime;
    if (elapsed < this.MIN_CHUNK_DELAY) {
      await new Promise(resolve => setTimeout(resolve, this.MIN_CHUNK_DELAY - elapsed));
    }
    this.lastChunkTime = Date.now();
  }

  /**
   * Send message with real SSE streaming
   * Uses the /chat/stream endpoint for real-time response
   * 
   * Features:
   * - Throttled updates for consistent streaming speed
   * - Thinking content stored separately (not in message content)
   * - Sources and suggested questions handled properly
   */
  private async sendMessageWithStreaming(content: string): Promise<void> {
    this._error.set(null);
    this._isLoading.set(true);
    this._loadingTime.set(0);
    this._isStreaming.set(true);
    this._streamingText.set('');
    this._streamingThinking.set('');
    this.lastChunkTime = Date.now();
    this.resetStatusPhase(); // Reset status phase for new message

    // Start loading timer
    this.startLoadingTimer();

    // Create and add user message
    const userMessage = createUserMessage(content);
    this._messages.update((msgs) => [...msgs, userMessage]);
    this._messages.update((msgs) =>
      msgs.map((m) => m.id === userMessage.id ? updateMessageStatus(m, 'sent') : m)
    );

    // Show typing indicator initially
    this._isTyping.set(true);

    // Get session state
    const { sessionId, context } = this.sessionService.getSessionState();

    // Track pending request
    this.pendingRequest = {
      sessionId: sessionId ?? null,
      userMessageId: userMessage.id,
      content: content
    };

    // Create placeholder AI message
    const aiMessage = createAiMessage('', [], 0);
    this._messages.update((msgs) => [...msgs, aiMessage]);
    const messageIndex = this._messages().length - 1;

    let fullAnswer = '';
    let thinkingContent = '';
    let sources: Source[] = [];
    let suggestedQuestions: string[] = [];
    let receivedSessionId: string | null = null;
    let streamCompleted = false; // Flag to track if we received done event

    try {
      console.log('🎬 Starting streaming for message:', content.substring(0, 50));

      // Stream from API
      for await (const event of this.apiClient.streamChat(content, sessionId, context)) {
        // Check if stream was already completed (shouldn't happen but safety check)
        if (streamCompleted) {
          console.log('⚠️ Received event after done, ignoring');
          continue;
        }

        // DEBUG: Log all events to understand what AI Service sends
        console.log('🔍 RAW EVENT:', JSON.stringify(event));

        // Stop typing indicator after first event
        this._isTyping.set(false);

        const eventType = event.type || 'answer';

        // DEBUG: Log event type detection
        console.log('🔀 SWITCH eventType:', eventType, 'event.type:', event.type);

        switch (eventType) {
          case 'thinking_start':
            // Thinking started - just log, don't add placeholder text
            console.log('🧠 Thinking started');
            // Don't add "Đang bắt đầu suy luận..." - UI will show this based on isStreaming
            break;

          case 'thinking':
            // Real thinking event - AI reasoning process
            // This is the actual thinking content (not status messages)
            const thinkingEventContent = event.content || '';

            // Skip if it's a status message disguised as thinking event
            if (this.isStatusMessage(thinkingEventContent)) {
              console.log('📊 Skipping status message in thinking event');
              break;
            }

            console.log('🧠 Real thinking content:', thinkingEventContent.substring(0, 50));
            thinkingContent += thinkingEventContent;
            if (!thinkingEventContent.endsWith('\n')) {
              thinkingContent += '\n';
            }
            this._streamingThinking.set(thinkingContent);

            // Update message metadata with thinking
            this._messages.update((msgs) => {
              const updated = [...msgs];
              if (updated[messageIndex]) {
                updated[messageIndex] = {
                  ...updated[messageIndex],
                  metadata: {
                    ...updated[messageIndex].metadata,
                    thinking: thinkingContent
                  }
                };
              }
              return updated;
            });
            break;

          case 'thinking_end':
            // Thinking completed
            console.log('🧠 Thinking completed');
            break;

          case 'answer':
            // Answer chunk - append to full answer with throttle
            const answerContent = event.content || '';

            console.log('📥 Answer event received:', {
              content: answerContent.substring(0, 100),
              fullAnswerLength: fullAnswer.length,
              thinkingContentLength: thinkingContent.length,
              isInStatusPhase: this.isInStatusPhase,
              hasSources: !!(event as any).sources,
              hasQuestions: !!(event as any).suggested_questions
            });

            // WORKAROUND: Backend sends empty answer {} as implicit done signal
            // If we have content already and receive empty answer with no additional data,
            // treat it as stream completion
            const hasNoContent = !answerContent;
            const hasNoSources = !(event as any).sources?.length;
            const hasNoQuestions = !(event as any).suggested_questions?.length && !(event as any).questions?.length;
            const hasExistingContent = fullAnswer.length > 0;

            if (hasNoContent && hasNoSources && hasNoQuestions && hasExistingContent) {
              console.log('🏁 Empty answer event detected with existing content - treating as implicit done');
              streamCompleted = true;
              break;
            }

            // Check if sources are included in answer event (some AI services do this)
            const answerSources = (event as any).sources;
            if (answerSources && Array.isArray(answerSources) && answerSources.length > 0) {
              console.log('📚 Found sources in answer event!');
              console.log('📚 Raw sources count:', answerSources.length);
              sources = this.mapSourcesToFrontend(answerSources);
              console.log('📚 Mapped sources count:', sources.length);

              // IMPORTANT: Update message metadata with sources IMMEDIATELY
              // Don't wait until stream ends - sources should be visible right away
              this._messages.update((msgs) => {
                const updated = [...msgs];
                if (updated[messageIndex]) {
                  updated[messageIndex] = {
                    ...updated[messageIndex],
                    metadata: {
                      ...updated[messageIndex].metadata,
                      sources: sources,
                    },
                  };
                  console.log('📚 Message updated with sources at index:', messageIndex);
                }
                return updated;
              });
            }

            // Check if suggested_questions are in answer event
            const answerQuestions = (event as any).suggested_questions || (event as any).questions;
            if (answerQuestions && Array.isArray(answerQuestions) && answerQuestions.length > 0) {
              console.log('❓ Found suggestions in answer event!');
              suggestedQuestions = answerQuestions;
              // Update suggested questions immediately
              this._suggestedQuestions.set(suggestedQuestions);
            }

            // Check if this is a STATUS message (like "Đang phân tích...")
            // Status messages should be SKIPPED - they're not real content
            if (this.isStatusMessage(answerContent)) {
              // Skip status messages - don't add to thinking or answer
              // The UI will show "Đang suy luận..." based on isStreaming state
              break;
            }

            // Exit status phase when real content arrives
            if (this.isInStatusPhase && answerContent.length > 0) {
              console.log('📝 Real content started, exiting status phase');
              this.isInStatusPhase = false;
            }

            // Check if this is REAL THINKING content (AI reasoning)
            // This should go to thinking panel, not main answer
            if (this.isRealThinkingContent(answerContent)) {
              console.log('🧠 Adding to thinking content:', answerContent.substring(0, 50));
              thinkingContent += answerContent;
              if (!answerContent.endsWith('\n')) {
                thinkingContent += '\n';
              }
              this._streamingThinking.set(thinkingContent);

              // Update message metadata with thinking
              this._messages.update((msgs) => {
                const updated = [...msgs];
                if (updated[messageIndex]) {
                  updated[messageIndex] = {
                    ...updated[messageIndex],
                    metadata: {
                      ...updated[messageIndex].metadata,
                      thinking: thinkingContent
                    }
                  };
                }
                return updated;
              });
              break; // Don't add to fullAnswer
            }

            await this.throttleChunk();
            fullAnswer += answerContent;
            this._streamingText.set(fullAnswer);

            // Update message in real-time (NO thinking tags in content)
            this._messages.update((msgs) => {
              const updated = [...msgs];
              if (updated[messageIndex]) {
                updated[messageIndex] = {
                  ...updated[messageIndex],
                  content: fullAnswer, // Only main answer, no thinking tags
                  metadata: {
                    ...updated[messageIndex].metadata,
                    thinking: thinkingContent || undefined // Store thinking separately
                  }
                };
              }
              return updated;
            });
            break;

          case 'sources':
            // Sources event - citations with bounding boxes
            // Map from snake_case (AI Service) to camelCase (Frontend)
            // AI Service may send sources in different formats:
            // 1. event.sources (array)
            // 2. event.data.sources (nested)
            // 3. Direct array in event
            console.log('📚📚📚 SOURCES EVENT RECEIVED! 📚📚📚');
            console.log('📚 Raw event:', JSON.stringify(event));
            console.log('📚 event.sources:', event.sources);
            console.log('📚 event.data?.sources:', (event as any).data?.sources);

            const sourcesData = event.sources || (event as any).data?.sources || (Array.isArray(event) ? event : null);
            console.log('📚 sourcesData extracted:', sourcesData);

            if (sourcesData && Array.isArray(sourcesData)) {
              sources = this.mapSourcesToFrontend(sourcesData);
              console.log('📚 Mapped sources count:', sources.length);
              console.log('📚 Mapped sources detail:', JSON.stringify(sources));

              // Update message metadata with sources immediately
              this._messages.update((msgs) => {
                const updated = [...msgs];
                if (updated[messageIndex]) {
                  updated[messageIndex] = {
                    ...updated[messageIndex],
                    metadata: {
                      ...updated[messageIndex].metadata,
                      sources: sources
                    }
                  };
                  console.log('📚 Message updated with sources at index:', messageIndex);
                  console.log('📚 Updated message metadata:', JSON.stringify(updated[messageIndex].metadata));
                }
                return updated;
              });
            } else {
              console.log('⚠️ Sources event has no valid sources array');
              console.log('⚠️ sourcesData type:', typeof sourcesData);
              console.log('⚠️ Is array:', Array.isArray(sourcesData));
            }
            break;

          case 'suggested_questions':
            // Suggested questions for follow-up
            if (event.questions) {
              suggestedQuestions = event.questions;
              console.log('❓ Received suggestions:', suggestedQuestions.length);
            }
            break;

          case 'metadata':
            // Metadata event - processing info
            // Extract session_id if present
            console.log('📊 Metadata event:', JSON.stringify(event));
            if ((event as any).session_id) {
              receivedSessionId = (event as any).session_id;
            }
            // Check if sources are included in metadata
            const metaSources = (event as any).sources || (event as any).data?.sources;
            if (metaSources && Array.isArray(metaSources) && metaSources.length > 0) {
              console.log('📚 Found sources in metadata event!');
              sources = this.mapSourcesToFrontend(metaSources);
              this._messages.update((msgs) => {
                const updated = [...msgs];
                if (updated[messageIndex]) {
                  updated[messageIndex] = {
                    ...updated[messageIndex],
                    metadata: {
                      ...updated[messageIndex].metadata,
                      sources: sources
                    }
                  };
                }
                return updated;
              });
            }
            break;

          case 'done':
            // Stream completed - mark as done
            console.log('✅ Stream completed via done event:', JSON.stringify(event));
            streamCompleted = true;

            // Check if sources are included in done event
            const doneSources = (event as any).sources || (event as any).data?.sources;
            if (doneSources && Array.isArray(doneSources) && doneSources.length > 0) {
              console.log('📚 Found sources in done event!');
              sources = this.mapSourcesToFrontend(doneSources);
            }

            // Check if suggested_questions are in done event
            const doneQuestions = (event as any).suggested_questions || (event as any).questions;
            if (doneQuestions && Array.isArray(doneQuestions) && doneQuestions.length > 0) {
              console.log('❓ Found suggestions in done event!');
              suggestedQuestions = doneQuestions;
            }

            // Note: break here only exits switch, not for-await loop
            // The loop will continue but streamCompleted flag will skip further processing
            break;

          case 'error':
            // Error event
            throw new Error(event.message || 'Stream error');

          default:
            // Unknown event type - treat as answer if has content
            if (event.content) {
              await this.throttleChunk();
              fullAnswer += event.content;
              this._streamingText.set(fullAnswer);

              this._messages.update((msgs) => {
                const updated = [...msgs];
                if (updated[messageIndex]) {
                  updated[messageIndex] = {
                    ...updated[messageIndex],
                    content: fullAnswer,
                    metadata: {
                      ...updated[messageIndex].metadata,
                      thinking: thinkingContent || undefined
                    }
                  };
                }
                return updated;
              });
            }
        }

        // CRITICAL: Break out of for-await loop when done event received
        if (streamCompleted) {
          console.log('🛑 Breaking out of stream loop after done event');
          break;
        }
      }

      // Clear pending request
      this.pendingRequest = null;

      // Update session ID if new one received
      if (!sessionId && receivedSessionId) {
        this.sessionService.setSessionId(receivedSessionId);

        // Add new session to sidebar
        const newSession: SessionSummary = {
          id: receivedSessionId,
          title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messageCount: 2
        };
        this._sessions.update(sessions => [newSession, ...sessions]);
        setTimeout(() => this.loadSessions(), 500);
      }

      // Finalize message - reset all loading states
      this.stopLoadingTimer();
      this._isStreaming.set(false);
      this._isTyping.set(false);
      this._isLoading.set(false);
      this._streamingText.set('');
      this._streamingThinking.set('');
      this.resetStatusPhase();

      // Update final message with sources and thinking (stored in metadata)
      console.log('📝 Finalizing message with sources:', sources.length, 'sources');
      console.log('📝 Sources array:', JSON.stringify(sources));
      console.log('📝 fullAnswer length:', fullAnswer.length);
      console.log('📝 thinkingContent length:', thinkingContent.length);
      console.log('📝 suggestedQuestions:', suggestedQuestions);
      this._messages.update((msgs) => {
        const updated = [...msgs];
        if (updated[messageIndex]) {
          updated[messageIndex] = {
            ...updated[messageIndex],
            content: fullAnswer, // Clean content without thinking tags
            metadata: {
              sources: sources,
              processingTime: 0,
              thinking: thinkingContent || undefined // Thinking stored in metadata
            }
          };
          console.log('✅ Message updated with sources:', updated[messageIndex].metadata?.sources?.length);
        }
        return updated;
      });

      // Update suggested questions
      if (suggestedQuestions.length > 0) {
        this._suggestedQuestions.set(suggestedQuestions);
      }

      this.lastFailedMessage = null;
      console.log('🎉 Streaming completed successfully');

    } catch (error) {
      console.error('❌ Streaming error:', error);
      this.pendingRequest = null;
      this.stopLoadingTimer();
      this._isStreaming.set(false);
      this._isTyping.set(false);
      this._isLoading.set(false);

      // Mark user message as error
      this._messages.update((msgs) => {
        const lastUserMsgIndex = findLastIndex(msgs, (m: ChatMessage) => m.sender === 'user');
        if (lastUserMsgIndex !== -1) {
          const updated = [...msgs];
          updated[lastUserMsgIndex] = updateMessageStatus(updated[lastUserMsgIndex], 'error');
          return updated;
        }
        return msgs;
      });

      // Remove empty AI message if no content received
      if (!fullAnswer) {
        this._messages.update((msgs) => msgs.filter((_, i) => i !== messageIndex));
      }

      this._error.set(error instanceof Error ? error.message : 'Lỗi kết nối streaming');
      this.lastFailedMessage = content;
    }
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

  /**
   * Map sources from AI Service (snake_case) to Frontend (camelCase)
   * AI Service returns: image_url, page_number, document_id, bounding_boxes
   * Frontend expects: imageUrl, pageNumber, documentId, boundingBoxes
   */
  private mapSourcesToFrontend(sources: any[]): Source[] {
    if (!sources || !Array.isArray(sources)) return [];
    return sources.map(mapSourceToFrontend);
  }
}

