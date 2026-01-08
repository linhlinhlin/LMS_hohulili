/**
 * ChatApiClient - HTTP client for LMS Backend AI Proxy
 * Handles communication with the AI chatbot via LMS Backend
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, timeout, tap } from 'rxjs/operators';
import {
  ChatRequest,
  ChatResponse,
  ChatData,
  ChatContext,
  SessionsResponse,
  SessionDetail,
  HealthStatus,
  HistoryResponse,
  StreamEvent,
} from '../../domain/types';

/**
 * API Configuration
 */
export const AI_CHAT_CONFIG = {
  baseUrl: '/api/v3/ai', // LMS Backend Proxy
  timeout: 60000, // 60 seconds
  coldStartThreshold: 10000, // 10 seconds indicates cold start
} as const;

/**
 * API Error types (Client side)
 */
export interface ClientApiError {
  type: 'validation' | 'unauthorized' | 'forbidden' | 'rate_limited' | 'timeout' | 'network' | 'server' | 'ai_service_error' | 'service_unavailable';
  message: string;
  details?: unknown;
  retryAfter?: number;
}

/**
 * Request timing info for cold start detection
 */
export interface RequestTiming {
  startTime: number;
  endTime: number;
  duration: number;
  isColdStart: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ChatApiClient {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private lastRequestTiming: RequestTiming | null = null;
  private isServerAwake = false;

  /**
   * Send a chat message to the LMS Backend Proxy
   */
  sendChatMessage(
    message: string,
    sessionId?: string,
    context?: ChatContext
  ): Observable<ChatData> {
    const startTime = Date.now();

    // Build request - only include sessionId if it's a valid non-empty string
    const request: ChatRequest = {
      message,
      // Only include sessionId if it's truthy (not empty string, null, or undefined)
      ...(sessionId ? { sessionId } : {}),
      context,
    };

    return this.http
      .post<ChatResponse>(
        `${AI_CHAT_CONFIG.baseUrl}/chat`,
        request
      )
      .pipe(
        timeout(AI_CHAT_CONFIG.timeout),
        tap(() => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          this.lastRequestTiming = {
            startTime,
            endTime,
            duration,
            isColdStart: duration > AI_CHAT_CONFIG.coldStartThreshold,
          };
          this.isServerAwake = true;
        }),
        map(response => response.data),
        catchError((error: HttpErrorResponse | Error) => this.handleError(error))
      );
  }

  /**
   * Get user's chat sessions
   */
  getSessions(page = 0, size = 20): Observable<SessionsResponse> {
    return this.http.get<SessionsResponse>(
      `${AI_CHAT_CONFIG.baseUrl}/sessions`,
      { params: new HttpParams().set('page', page).set('size', size) }
    ).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  /**
   * Get session detail
   */
  getSessionDetail(sessionId: string): Observable<SessionDetail> {
    return this.http.get<SessionDetail>(
      `${AI_CHAT_CONFIG.baseUrl}/sessions/${sessionId}`
    ).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): Observable<void> {
    return this.http.delete<void>(
      `${AI_CHAT_CONFIG.baseUrl}/sessions/${sessionId}`
    ).pipe(
      map(() => void 0),
      catchError((error) => this.handleError(error))
    );
  }

  /**
   * Check API health status
   */
  checkHealth(): Observable<HealthStatus> {
    return this.http
      .get<HealthStatus>(
        `${AI_CHAT_CONFIG.baseUrl}/health`
      )
      .pipe(
        timeout(10000),
        tap(() => {
          this.isServerAwake = true;
        }),
        catchError(() =>
          of({
            status: 'unhealthy',
            aiServiceStatus: 'unknown',
            version: 'unknown',
            error: 'Service unavailable',
          } as HealthStatus)
        )
      );
  }

  /**
   * Wake up the server
   */
  wakeUpServer(): Observable<boolean> {
    return this.checkHealth().pipe(
      map((health: HealthStatus) => health.status === 'healthy'),
      catchError(() => of(false))
    );
  }

  /**
   * Get chat history from server (Server-Side Sync)
   * API: GET /api/v1/history/{user_id}
   */
  getChatHistory(userId: string, limit = 20, offset = 0): Observable<HistoryResponse> {
    return this.http
      .get<HistoryResponse>(
        `${AI_CHAT_CONFIG.baseUrl}/history/${userId}`,
        { params: new HttpParams().set('limit', limit).set('offset', offset) }
      )
      .pipe(
        catchError((error) => this.handleError(error))
      );
  }

  /**
   * Delete all chat history for a user
   * API: DELETE /api/v1/history/{user_id}
   */
  deleteChatHistory(userId: string): Observable<void> {
    return this.http
      .delete<void>(`${AI_CHAT_CONFIG.baseUrl}/history/${userId}`)
      .pipe(
        map(() => void 0),
        catchError((error) => this.handleError(error))
      );
  }

  /**
   * Test streaming endpoint - for debugging SSE parsing
   * Call this to verify frontend can receive and parse SSE events
   */
  async *testStream(): AsyncGenerator<StreamEvent, void, unknown> {
    console.log('🧪 Testing SSE stream...');

    const token = typeof window !== 'undefined'
      ? localStorage.getItem('lms_access_token')
      : null;

    const headers: Record<string, string> = {
      'Accept': 'text/event-stream',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${AI_CHAT_CONFIG.baseUrl}/chat/stream/test`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Test stream error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let currentEventType: string | null = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          if (trimmedLine.startsWith('event:')) {
            currentEventType = trimmedLine.slice(6).trim();
            console.log('🧪 Test event type:', currentEventType);
            continue;
          }

          if (trimmedLine.startsWith('data:')) {
            const data = trimmedLine.slice(5).trim();
            if (data) {
              try {
                const parsed = JSON.parse(data);
                const eventType = currentEventType || 'answer';
                console.log('🧪 Test event:', eventType, parsed);
                yield { type: eventType as StreamEvent['type'], ...parsed };
              } catch {
                console.log('🧪 Test raw data:', data);
                yield { type: currentEventType as StreamEvent['type'] || 'answer', content: data } as StreamEvent;
              }
              currentEventType = null;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    console.log('🧪 Test stream completed');
  }

  /**
   * Stream chat response using Server-Sent Events (SSE)
   * Returns an async generator that yields SSE events
   * 
   * Events:
   * - thinking: AI reasoning process
   * - answer: Response chunks
   * - sources: Source citations
   * - suggested_questions: Follow-up questions
   * - metadata: Processing info
   * - done: Stream completed
   * - error: Error occurred
   */
  async *streamChat(
    message: string,
    sessionId?: string,
    context?: ChatContext
  ): AsyncGenerator<StreamEvent, void, unknown> {
    const request = {
      message,
      ...(sessionId ? { sessionId } : {}),
      context,
    };

    // Get auth token from localStorage (same as auth interceptor)
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('lms_access_token')
      : null;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    };

    // Add Authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('🚀 Starting SSE stream to:', `${AI_CHAT_CONFIG.baseUrl}/chat/stream`);
    console.log('🔑 Auth token present:', !!token);
    console.log('📦 Request body:', JSON.stringify(request));

    const response = await fetch(`${AI_CHAT_CONFIG.baseUrl}/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
      credentials: 'include', // Include cookies for auth
    });

    if (!response.ok) {
      console.error('❌ Stream response error:', response.status, response.statusText);
      if (response.status === 401) {
        this.router.navigate(['/login']);
        throw new Error('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại');
      }
      if (response.status === 403) {
        throw new Error('Bạn không có quyền truy cập tính năng này');
      }
      throw new Error(`Lỗi kết nối streaming: ${response.status}`);
    }

    console.log('✅ SSE stream connected');

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let currentEventType: string | null = null; // Track event type from "event:" line

    let receivedDoneEvent = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('📭 SSE stream ended (reader done)');
          // If we didn't receive a 'done' event, yield one to ensure proper cleanup
          if (!receivedDoneEvent) {
            console.log('📭 Yielding synthetic done event');
            yield { type: 'done' as StreamEvent['type'] };
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();

          // Log ALL raw lines for debugging
          if (trimmedLine) {
            console.log('📜 RAW SSE LINE:', trimmedLine.substring(0, 200));
          }

          // Skip empty lines (SSE event separator)
          if (!trimmedLine) {
            continue;
          }

          if (trimmedLine.startsWith('event:')) {
            // Capture event type for the next data line
            currentEventType = trimmedLine.slice(6).trim();
            console.log('📨 SSE event type:', currentEventType);
            // IMPORTANT: Check if this is sources event
            if (currentEventType === 'sources') {
              console.log('🎯🎯🎯 SOURCES EVENT TYPE DETECTED FROM event: LINE! 🎯🎯🎯');
            }
            // Check for done event type
            if (currentEventType === 'done') {
              console.log('✅✅✅ DONE EVENT TYPE DETECTED FROM event: LINE! ✅✅✅');
            }
            continue;
          }

          if (trimmedLine.startsWith('data:')) {
            const data = trimmedLine.slice(5).trim();
            if (data) {
              try {
                const parsed = JSON.parse(data);

                // IMPORTANT: AI Service sends sources/questions/metadata in "answer" events
                // So we MUST check content FIRST, then fall back to event type

                // Content-based detection ALWAYS runs first for special data types
                let eventType: string | null = null;

                // Check for sources array - HIGHEST PRIORITY
                if (parsed.sources && Array.isArray(parsed.sources) && parsed.sources.length > 0) {
                  eventType = 'sources';
                  console.log('🎯🎯🎯 SOURCES detected from content!', parsed.sources.length, 'sources');
                }
                // Check for questions array
                else if (parsed.questions && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
                  eventType = 'suggested_questions';
                  console.log('❓ QUESTIONS detected from content!', parsed.questions.length, 'questions');
                }
                // Check for metadata fields
                else if (parsed.processing_time !== undefined && parsed.model !== undefined) {
                  eventType = 'metadata';
                  console.log('📊 METADATA detected from content!');
                }
                // Check for done event - multiple ways Backend AI might signal completion:
                // 1. event: done line (currentEventType)
                // 2. parsed.type === 'done'
                // 3. parsed.status === 'complete' (Backend AI format)
                else if (currentEventType === 'done' || parsed.type === 'done' || parsed.status === 'complete') {
                  eventType = 'done';
                  console.log('✅ DONE EVENT detected!', { currentEventType, parsedType: parsed.type, status: parsed.status });
                }
                // Check for error event
                else if (currentEventType === 'error' || parsed.type === 'error') {
                  eventType = 'error';
                }
                // Fall back to event type from "event:" line or parsed.type
                else {
                  eventType = currentEventType || parsed.type || 'answer';
                }

                // Log sources detection
                if (eventType === 'sources') {
                  console.log('🎯🎯🎯 SOURCES EVENT WILL BE YIELDED! 🎯🎯🎯', {
                    eventType,
                    currentEventType,
                    parsedType: parsed.type,
                    sourcesCount: parsed.sources?.length
                  });
                }

                // Log ALL events for debugging
                console.log('📤 YIELDING EVENT:', eventType, JSON.stringify(parsed).substring(0, 200));

                // Track if we received done event
                if (eventType === 'done') {
                  receivedDoneEvent = true;
                }

                // IMPORTANT: Put type AFTER spread to ensure our detected type is used
                // If parsed has a "type" field, spread would override our detected type
                const event: StreamEvent = {
                  ...parsed,
                  type: eventType as StreamEvent['type'],  // Our detected type takes priority
                };

                console.log('📦 SSE event:', eventType, 'event.type:', event.type);
                yield event;
              } catch {
                // Not JSON, yield as raw text with event type
                const eventType = currentEventType || 'answer';
                console.log('📝 SSE raw data:', eventType, data);
                yield { type: eventType as StreamEvent['type'], content: data } as StreamEvent;
              }
              // Reset event type after processing data
              currentEventType = null;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Get last request timing info
   */
  getLastRequestTiming(): RequestTiming | null {
    return this.lastRequestTiming;
  }

  /**
   * Check if last request was a cold start
   */
  wasLastRequestColdStart(): boolean {
    return this.lastRequestTiming?.isColdStart ?? false;
  }

  /**
   * Check if server is likely awake
   */
  isServerLikelyAwake(): boolean {
    return this.isServerAwake;
  }

  /**
   * Handle HTTP errors and convert to ClientApiError
   */
  private handleError(error: HttpErrorResponse | Error): Observable<never> {
    let apiError: ClientApiError;

    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 400:
          apiError = {
            type: 'validation',
            message: error.error?.message || 'Tin nhắn không hợp lệ. Vui lòng kiểm tra lại.',
            details: error.error?.details,
          };
          break;
        case 401:
          apiError = {
            type: 'unauthorized',
            message: 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại',
          };
          this.router.navigate(['/login']);
          break;
        case 403:
          apiError = {
            type: 'forbidden',
            message: 'Bạn không có quyền truy cập tài nguyên này',
          };
          break;
        case 429:
          const retryAfter = error.headers.get('Retry-After') || '60';
          apiError = {
            type: 'rate_limited',
            message: `Bạn đã gửi quá nhiều tin nhắn. Vui lòng đợi ${retryAfter} giây.`,
            retryAfter: parseInt(retryAfter, 10),
          };
          break;
        case 502:
          apiError = {
            type: 'ai_service_error',
            message: 'Dịch vụ AI tạm thời không khả dụng (Bad Gateway).',
          };
          break;
        case 503:
          apiError = {
            type: 'service_unavailable',
            message: 'Dịch vụ đang bảo trì hoặc quá tải, vui lòng thử lại sau.',
          };
          break;
        case 504:
          apiError = {
            type: 'timeout',
            message: 'Yêu cầu quá thời gian chờ (Gateway Timeout). Server có thể đang khởi động.',
          };
          break;
        case 0:
          apiError = {
            type: 'network',
            message: 'Không thể kết nối. Vui lòng kiểm tra kết nối mạng của bạn.',
          };
          break;
        default:
          apiError = {
            type: 'server',
            message: error.error?.message || 'Đã xảy ra lỗi từ server, vui lòng thử lại.',
          };
      }
    } else if (error.name === 'TimeoutError') {
      apiError = {
        type: 'timeout',
        message: 'Yêu cầu quá thời gian chờ (Client Timeout). Server AI có thể đang khởi động.',
      };
    } else {
      apiError = {
        type: 'network',
        message: 'Đã xảy ra lỗi không xác định',
      };
    }

    return throwError(() => apiError);
  }
}
