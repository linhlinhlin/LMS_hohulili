import { Injectable, signal, computed, inject } from '@angular/core';
import { AuthService } from '../core/services/auth.service';
import { CourseService } from './course.service';
import { CommunicationService } from '../shared/services/communication.service';

/**
 * Global State Service - Unified Application State Management
 *
 * This service provides a single source of truth for all application state,
 * coordinating between different feature states and providing computed
 * cross-cutting concerns.
 */
@Injectable({
  providedIn: 'root'
})
export class GlobalState {
  private authService = inject(AuthService);
  private courseService = inject(CourseService);
  private communicationService = inject(CommunicationService);

  // Global application state signals
  private _isInitializing = signal<boolean>(true);
  private _lastActivity = signal<Date>(new Date());
  private _networkStatus = signal<'online' | 'offline'>('online');

  // Readonly signals
  readonly isInitializing = this._isInitializing.asReadonly();
  readonly lastActivity = this._lastActivity.asReadonly();
  readonly networkStatus = this._networkStatus.asReadonly();

  // Auth state is managed by AuthService - use authService directly
  // These computed signals are removed to avoid duplication


  readonly systemHealth = computed(() => ({
    isOnline: this._networkStatus() === 'online',
    lastActivity: this._lastActivity(),
    hasErrors: false, // Would be computed from error service
    isLoading: this.courseService.isLoading() || this.communicationService.isLoading()
  }));


  updateLastActivity(): void {
    this._lastActivity.set(new Date());
  }

  setNetworkStatus(status: 'online' | 'offline'): void {
    this._networkStatus.set(status);
  }

  // Cross-cutting business logic methods
  async initializeApplication(): Promise<void> {
    try {
      this._isInitializing.set(true);

      // Initialize all services - AuthService auto-initializes
      await Promise.all([
        this.courseService.getCourses(),
        this.communicationService.getAnnouncements()
      ]);

      this.updateLastActivity();
    } catch (error) {
      // App init failure — non-blocking, individual services handle their own state
    } finally {
      this._isInitializing.set(false);
    }
  }

  async refreshAllData(): Promise<void> {
    try {
      await Promise.all([
        this.courseService.getCourses(),
        this.communicationService.getAnnouncements(),
        this.communicationService.getConversations()
      ]);

      this.updateLastActivity();
    } catch (error) {
      // Refresh failure — non-blocking, individual services handle their own state
    }
  }

  // Global logout
  async logout(): Promise<void> {
    await this.authService.logout();
    // Additional cleanup would go here
    this._lastActivity.set(new Date());
  }

  // Emergency reset (for development/testing)
  resetAllState(): void {
    this._isInitializing.set(true);
    this._lastActivity.set(new Date());
    this._networkStatus.set('online');

    // Reset individual services
    this.authService.logout();
    // Other services would have reset methods
  }

  // Network status monitoring
  startNetworkMonitoring(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.setNetworkStatus('online'));
      window.addEventListener('offline', () => this.setNetworkStatus('offline'));
    }
  }
}
