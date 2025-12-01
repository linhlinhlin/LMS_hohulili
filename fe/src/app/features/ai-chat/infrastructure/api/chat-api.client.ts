/**
 * ChatApiClient - HTTP client for Maritime AI Backend
 * Handles communication with the AI chatbot API
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer, of } from 'rxjs';
import { catchError, map, timeout, retry, tap } from 'rxjs/operators';
import {
  ChatRequest,
  ChatResponse,
  HealthStatus,
  UserRole,
  ChatContext,
} from '../../domain/types';

/**
 * API Configuration
 */
export const AI_CHAT_CONFIG = {
  baseUrl: 'https://maritime-ai-chatbot.onrender.com',
  apiKey: 'secret_key_cho_team_lms',
  timeout: 60000, // 60 seconds for cold start
  coldStartThreshold: 10000, // 10 seconds indicates cold start
  retryAttempts: 1,
  retryDelay: 1000,
} as const;

/**
 * API Error types
 */
export interface ApiError {
  type: 'validation' | 'unauthorized' | 'rate_limited' | 'timeout' | 'network' | 'server';
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
  private lastRequestTiming: RequestTiming | null = null;
  private isServerAwake = false;

  /**
   * Get HTTP headers for API requests
   */
  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'X-API-Key': AI_CHAT_CONFIG.apiKey,
    });
  }

  /**
   * Send a chat message to the AI backend
   */
  sendChatMessage(
    userId: string,
    message: string,
    role: UserRole,
    sessionId?: string,
    context?: ChatContext
  ): Observable<ChatResponse> {
    const startTime = Date.now();

    const request: ChatRequest = {
      user_id: userId,
      message,
      role,
      session_id: sessionId,
      context,
    };

    return this.http
      .post<ChatResponse>(
        `${AI_CHAT_CONFIG.baseUrl}/api/v1/chat`,
        request,
        { headers: this.getHeaders() }
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
        catchError((error: HttpErrorResponse | Error) => this.handleError(error))
      );
  }

  /**
   * Check API health status
   */
  checkHealth(): Observable<HealthStatus> {
    return this.http
      .get<{ status: string; database?: string }>(
        `${AI_CHAT_CONFIG.baseUrl}/health`
      )
      .pipe(
        timeout(10000), // 10 second timeout for health check
        map((response: { status: string; database?: string }) => ({
          status: response.status === 'ok' ? 'healthy' : 'unhealthy',
          message: response.database ? `Database: ${response.database}` : undefined,
          timestamp: new Date().toISOString(),
        } as HealthStatus)),
        tap(() => {
          this.isServerAwake = true;
        }),
        catchError(() =>
          of({
            status: 'unhealthy',
            message: 'Service unavailable',
            timestamp: new Date().toISOString(),
          } as HealthStatus)
        )
      );
  }

  /**
   * Wake up the server by calling health endpoint
   * Useful to reduce cold start delay before user sends first message
   */
  wakeUpServer(): Observable<boolean> {
    return this.checkHealth().pipe(
      map((health: HealthStatus) => health.status === 'healthy'),
      catchError(() => of(false))
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
   * Handle HTTP errors and convert to ApiError
   */
  private handleError(error: HttpErrorResponse | Error): Observable<never> {
    let apiError: ApiError;

    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 400:
          apiError = {
            type: 'validation',
            message: error.error?.message || 'Dữ liệu không hợp lệ',
            details: error.error?.details,
          };
          break;
        case 401:
          apiError = {
            type: 'unauthorized',
            message: 'Không có quyền truy cập API',
          };
          break;
        case 429:
          apiError = {
            type: 'rate_limited',
            message: 'Quá nhiều yêu cầu, vui lòng thử lại sau',
            retryAfter: error.error?.retry_after || 60,
          };
          break;
        case 0:
          apiError = {
            type: 'network',
            message: 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.',
          };
          break;
        default:
          apiError = {
            type: 'server',
            message: error.error?.message || 'Đã xảy ra lỗi từ server',
          };
      }
    } else if (error.name === 'TimeoutError') {
      apiError = {
        type: 'timeout',
        message: 'Yêu cầu quá thời gian chờ. Vui lòng thử lại.',
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
