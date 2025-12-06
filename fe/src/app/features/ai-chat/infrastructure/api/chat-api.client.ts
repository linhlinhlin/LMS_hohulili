/**
 * ChatApiClient - HTTP client for LMS Backend AI Proxy
 * Handles communication with the AI chatbot via LMS Backend
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse, HttpParams } from '@angular/common/http';
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
} from '../../domain/types';

/**
 * API Configuration
 */
export const AI_CHAT_CONFIG = {
  baseUrl: '/api/v1/ai', // LMS Backend Proxy
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
