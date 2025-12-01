/**
 * SessionManagementService - Manages chat sessions and context
 * Uses Angular signals for reactive state management
 */
import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ChatContext, UserRole, ChatSession } from '../../domain/types';
import { ChatStorageRepository } from '../../infrastructure/repositories/chat-storage.repository';
import {
  createEmptyContext,
  mergeContexts,
} from '../../domain/value-objects/chat-context.vo';
import { DEFAULT_ROLE, parseRole } from '../../domain/value-objects/user-role.vo';

@Injectable({
  providedIn: 'root',
})
export class SessionManagementService {
  private readonly storage = inject(ChatStorageRepository);
  private readonly router = inject(Router);

  // State signals
  private readonly _sessionId = signal<string>(this.generateSessionId());
  private readonly _context = signal<ChatContext>(createEmptyContext());
  private readonly _userId = signal<string>('');
  private readonly _role = signal<UserRole>(DEFAULT_ROLE);

  // Public readonly signals
  readonly currentSessionId = this._sessionId.asReadonly();
  readonly currentContext = this._context.asReadonly();
  readonly currentUserId = this._userId.asReadonly();
  readonly currentRole = this._role.asReadonly();

  // Computed signals
  readonly hasContext = computed(() => {
    const ctx = this._context();
    return !!(ctx.courseId || ctx.lessonId);
  });

  readonly isAuthenticated = computed(() => {
    return this._role() !== 'guest' && !!this._userId();
  });

  constructor() {
    this.restoreSession();
  }

  /**
   * Generate a unique session ID
   */
  generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    const randomPart2 = Math.random().toString(36).substring(2, 15);
    return `session_${timestamp}_${randomPart}${randomPart2}`;
  }

  /**
   * Start a new session
   */
  startNewSession(): string {
    const newSessionId = this.generateSessionId();
    this._sessionId.set(newSessionId);
    this._context.set(createEmptyContext());
    this.storage.clearSession();
    return newSessionId;
  }

  /**
   * Update the current context
   */
  updateContext(context: Partial<ChatContext>): void {
    const currentCtx = this._context();
    this._context.set(mergeContexts(currentCtx, context));
  }

  /**
   * Set context from current route
   */
  updateContextFromRoute(): void {
    const url = this.router.url;
    const context: ChatContext = {
      pageUrl: url,
    };

    // Extract courseId from route like /student/courses/:courseId
    const courseMatch = url.match(/\/courses\/([^\/]+)/);
    if (courseMatch) {
      context.courseId = courseMatch[1];
    }

    // Extract lessonId from route like /lessons/:lessonId
    const lessonMatch = url.match(/\/lessons\/([^\/]+)/);
    if (lessonMatch) {
      context.lessonId = lessonMatch[1];
    }

    this.updateContext(context);
  }

  /**
   * Clear the current session
   */
  clearSession(): void {
    this._sessionId.set(this.generateSessionId());
    this._context.set(createEmptyContext());
    this.storage.clearSession();
  }

  /**
   * Set user information
   */
  setUser(userId: string, role: string): void {
    this._userId.set(userId);
    this._role.set(parseRole(role));
  }

  /**
   * Set user ID
   */
  setUserId(userId: string): void {
    this._userId.set(userId);
  }

  /**
   * Set user role
   */
  setRole(role: string): void {
    this._role.set(parseRole(role));
  }

  /**
   * Clear user information (logout)
   */
  clearUser(): void {
    this._userId.set('');
    this._role.set(DEFAULT_ROLE);
  }

  /**
   * Get session state for API request
   */
  getSessionState(): {
    sessionId: string;
    userId: string;
    role: UserRole;
    context: ChatContext;
  } {
    return {
      sessionId: this._sessionId(),
      userId: this._userId() || 'anonymous',
      role: this._role(),
      context: this._context(),
    };
  }

  /**
   * Restore session from storage
   */
  private restoreSession(): void {
    const storedSession = this.storage.loadSession();
    if (storedSession) {
      this._sessionId.set(storedSession.id);
      this._context.set(storedSession.context);
      this._userId.set(storedSession.userId);
    }
  }

  /**
   * Save current session state
   */
  saveSessionState(messages: ChatSession['messages']): void {
    const session: ChatSession = {
      id: this._sessionId(),
      userId: this._userId() || 'anonymous',
      messages,
      context: this._context(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.storage.saveSession(session);
  }
}
