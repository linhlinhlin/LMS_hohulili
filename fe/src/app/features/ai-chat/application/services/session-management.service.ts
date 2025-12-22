/**
 * SessionManagementService - Manages chat sessions and context
 * Uses Angular signals for reactive state management
 * 
 * IMPORTANT: User isolation is handled via ChatStorageRepository
 * Each user has their own localStorage namespace
 */
import { Injectable, signal, computed, inject, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { ChatContext, UserRole, ChatSession } from '../../domain/types';
import { ChatStorageRepository } from '../../infrastructure/repositories/chat-storage.repository';
import { AuthService } from '../../../../core/services/auth.service';
import {
  createEmptyContext,
  mergeContexts,
} from '../../domain/value-objects/chat-context.vo';
import { DEFAULT_ROLE, parseRole } from '../../domain/value-objects/user-role.vo';

@Injectable({
  providedIn: 'root',
})
export class SessionManagementService implements OnDestroy {
  private readonly storage = inject(ChatStorageRepository);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  private authSubscription?: Subscription;

  // State signals
  private readonly _sessionId = signal<string>('');
  private readonly _context = signal<ChatContext>(createEmptyContext());
  private readonly _userId = signal<string>('');
  private readonly _role = signal<UserRole>(DEFAULT_ROLE);
  private readonly _isInitialized = signal<boolean>(false);

  // Public readonly signals
  readonly currentSessionId = this._sessionId.asReadonly();
  readonly currentContext = this._context.asReadonly();
  readonly currentUserId = this._userId.asReadonly();
  readonly currentRole = this._role.asReadonly();
  readonly isInitialized = this._isInitialized.asReadonly();

  // Computed signals
  readonly hasContext = computed(() => {
    const ctx = this._context();
    return !!(ctx.courseId || ctx.lessonId);
  });

  readonly isAuthenticated = computed(() => {
    return this._role() !== 'guest' && !!this._userId();
  });

  constructor() {
    // Subscribe to auth changes (login/logout)
    // Use distinctUntilChanged to prevent duplicate calls when user object is the same
    this.authSubscription = this.authService.currentUser$.pipe(
      map(user => user?.id?.toString() || null),
      distinctUntilChanged()
    ).subscribe(userId => {
      if (userId) {
        const user = this.authService.getCurrentUser();
        this.handleUserLogin(userId, user?.role || 'student');
      } else {
        this.handleUserLogout();
      }
    });

    this._isInitialized.set(true);
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
  }

  /**
   * Initialize from current auth state
   */
  private initializeFromAuth(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.handleUserLogin(currentUser.id.toString(), currentUser.role || 'student');
    }
    this._isInitialized.set(true);
  }

  /**
   * Handle user login - set up isolated storage
   */
  private handleUserLogin(userId: string, role: string): void {
    console.log(`🔐 AI Chat: Setting up session for user ${userId}`);

    // Set user info
    this._userId.set(userId);
    this._role.set(parseRole(role));

    // CRITICAL: Set userId in storage for isolation
    this.storage.setCurrentUserId(userId);

    // Clear any invalid sessions and restore user's session
    this.storage.clearInvalidSessions();
    this.restoreSession();
  }

  /**
   * Handle user logout - clear session data
   */
  private handleUserLogout(): void {
    console.log('🔐 AI Chat: User logged out, clearing session');

    // Clear current session
    this.clearSession();

    // Reset user info
    this._userId.set('');
    this._role.set(DEFAULT_ROLE);

    // Reset storage userId
    this.storage.setCurrentUserId('');
  }

  /**
   * Generate a placeholder session ID (will be replaced by backend UUID)
   * Returns empty string to indicate no session yet - backend will create one
   */
  generateSessionId(): string {
    // Return empty string - backend will generate UUID for new sessions
    return '';
  }

  /**
   * Start a new session
   * Clears sessionId so backend will create a new one
   */
  startNewSession(): string {
    // Clear sessionId - backend will generate new UUID
    this._sessionId.set('');
    this._context.set(createEmptyContext());
    this.storage.clearSession();
    return '';
  }

  /**
   * Set session ID manually (e.g. from backend response)
   */
  setSessionId(sessionId: string): void {
    this._sessionId.set(sessionId);
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
    // Clear sessionId - backend will generate new UUID on next chat
    this._sessionId.set('');
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
   * Returns sessionId as undefined if empty (for new sessions)
   */
  getSessionState(): {
    sessionId: string | undefined;
    userId: string;
    role: UserRole;
    context: ChatContext;
  } {
    const sessionId = this._sessionId();
    return {
      // Only send sessionId if it's a valid UUID (not empty)
      sessionId: sessionId && sessionId.length > 0 ? sessionId : undefined,
      userId: this._userId() || 'anonymous',
      role: this._role(),
      context: this._context(),
    };
  }

  /**
   * Restore session from storage
   * Only restores sessionId if it looks like a valid UUID
   */
  private restoreSession(): void {
    const storedSession = this.storage.loadSession();
    if (storedSession) {
      // Only restore sessionId if it looks like a UUID (contains dashes)
      // Old format "session_xxx" should not be restored
      const sessionId = storedSession.id;
      if (sessionId && sessionId.includes('-') && sessionId.length === 36) {
        this._sessionId.set(sessionId);
      } else {
        // Clear invalid sessionId
        this._sessionId.set('');
      }
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

