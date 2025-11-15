import { Injectable, signal, computed, inject } from '@angular/core';
import { UserRole } from '../shared/types/user.types';
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


  readonly userProgressSummary = computed(() => {
    const user = this.authService.currentUser();
    if (!user || user.role !== UserRole.STUDENT) return null;

    // This would aggregate progress across all enrolled courses
    // For now, return mock data
    return {
      completedCourses: 2,
      inProgressCourses: 3,
      totalProgress: 65,
      certificatesEarned: 2
    };
  });

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
      console.error('Application initialization failed:', error);
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
      console.error('Data refresh failed:', error);
    }
  }

  // User-specific computed state - using authService directly
  readonly studentDashboardData = computed(() => {
    if (this.authService.userRole() !== UserRole.STUDENT) return null;

    return {
      enrolledCourses: this.courseService.courses(),
      recentMessages: this.communicationService.recentMessages(),
      progressSummary: this.userProgressSummary()
    };
  });

  readonly teacherDashboardData = computed(() => {
    if (this.authService.userRole() !== UserRole.TEACHER) return null;

    return {
      courses: this.courseService.courses(),
      students: [], // Would come from teacher service
      assignments: [], // Would come from teacher service
      unreadMessages: this.communicationService.unreadMessages()
    };
  });

  readonly adminDashboardData = computed(() => {
    if (this.authService.userRole() !== UserRole.ADMIN) return null;

    return {
      systemHealth: this.systemHealth(),
      userStats: {
        total: 0, // Would come from admin service
        active: 0,
        newThisMonth: 0
      },
      courseStats: {
        total: this.courseService.courses().length,
        pending: 0, // Would come from admin service
        approved: 0
      }
    };
  });

  // Global search functionality
  searchGlobal(query: string): any[] {
    const results = [];

    // Search courses
    const courseResults = this.courseService.courses()
      .filter(course =>
        course.title.toLowerCase().includes(query.toLowerCase()) ||
        course.description.toLowerCase().includes(query.toLowerCase())
      )
      .map(course => ({ type: 'course', item: course }));

    // Search messages
    const messageResults = this.communicationService.messages()
      .filter(message =>
        message.subject.toLowerCase().includes(query.toLowerCase()) ||
        message.content.toLowerCase().includes(query.toLowerCase())
      )
      .map(message => ({ type: 'message', item: message }));

    // Search announcements
    const announcementResults = this.communicationService.announcements()
      .filter(announcement =>
        announcement.title.toLowerCase().includes(query.toLowerCase()) ||
        announcement.content.toLowerCase().includes(query.toLowerCase())
      )
      .map(announcement => ({ type: 'announcement', item: announcement }));

    return [...courseResults, ...messageResults, ...announcementResults];
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

  // Utility methods for cross-cutting concerns
  getCurrentUserPermissions(): string[] {
    const role = this.authService.userRole();
    if (!role) return [];

    // This would be more sophisticated in a real app
    // with role-based permissions from backend
    switch (role) {
      case UserRole.ADMIN:
        return ['read', 'write', 'delete', 'manage_users', 'manage_system'];
      case UserRole.TEACHER:
        return ['read', 'write', 'manage_courses', 'manage_students'];
      case UserRole.STUDENT:
        return ['read', 'enroll_courses'];
      default:
        return ['read'];
    }
  }

  hasPermission(permission: string): boolean {
    return this.getCurrentUserPermissions().includes(permission);
  }

  // Network status monitoring
  startNetworkMonitoring(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.setNetworkStatus('online'));
      window.addEventListener('offline', () => this.setNetworkStatus('offline'));
    }
  }

  // Activity tracking
  trackActivity(): void {
    this.updateLastActivity();
  }

  // Global error state (would integrate with error service)
  readonly hasGlobalErrors = computed(() => false); // Placeholder

  // Performance monitoring
  readonly performanceMetrics = computed(() => ({
    lastActivity: this._lastActivity(),
    networkStatus: this._networkStatus(),
    isInitializing: this._isInitializing()
  }));
}