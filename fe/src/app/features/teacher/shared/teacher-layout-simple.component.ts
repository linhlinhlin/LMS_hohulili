import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SidebarComponent } from '../../../shared/components/navigation/sidebar.component';
import { teacherSidebarConfig } from '../../../shared/components/navigation/sidebar.config';

@Component({
  selector: 'app-teacher-layout-simple',
  imports: [CommonModule, RouterModule, RouterOutlet, SidebarComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- Modern gradient background for teacher portal -->
    <div class="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50/30 to-purple-50/50 flex flex-col">
      <!-- Desktop Sidebar - Full Height -->
      <div class="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:inset-y-0 lg:z-40">
        <app-sidebar [config]="teacherSidebarConfig"></app-sidebar>
      </div>

      <!-- Mobile sidebar overlay -->
      <div *ngIf="isMobileSidebarOpen()"
           class="fixed inset-0 z-50 lg:hidden"
           (click)="toggleMobileSidebar()">
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm"></div>
        <div class="fixed inset-y-0 left-0 w-72 bg-white/95 backdrop-blur-xl shadow-2xl border-r border-white/20">
          <app-sidebar [config]="teacherSidebarConfig"></app-sidebar>
        </div>
      </div>

      <!-- Main content area -->
      <div class="lg:pl-72 flex flex-col flex-1 min-h-0">
        <!-- Modern top navigation bar - Mobile only -->
        <header class="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 lg:hidden shadow-sm">
          <div class="px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
              <div class="flex items-center space-x-3">
                <!-- Modern hamburger menu -->
                <button (click)="toggleMobileSidebar()"
                        class="p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200">
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                <!-- Modern logo/brand -->
                <div class="flex items-center space-x-2">
                  <div class="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                    </svg>
                  </div>
                  <h1 class="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    Teacher Portal
                  </h1>
                </div>
              </div>

              <!-- Modern user menu -->
              <div class="flex items-center space-x-3">
                <!-- User avatar and info -->
                <div class="flex items-center space-x-2">
                  <div class="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {{ getUserInitials() }}
                  </div>
                  <div class="hidden sm:block">
                    <p class="text-sm font-medium text-gray-900">{{ authService.currentUser()?.fullName }}</p>
                    <p class="text-xs text-gray-500">Teacher</p>
                  </div>
                </div>

                <!-- Modern logout button -->
                <button (click)="logout()"
                        class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500/20">
                  <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <!-- Page content -->
        <main class="flex-1 overflow-auto bg-transparent">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeacherLayoutSimpleComponent {
  protected authService = inject(AuthService);
  protected isMobileSidebarOpen = signal(false);
  protected teacherSidebarConfig = teacherSidebarConfig;

  toggleMobileSidebar(): void {
    this.isMobileSidebarOpen.update(open => !open);
  }

  logout(): void {
    this.authService.logout();
  }

  getUserInitials(): string {
    const name = this.authService.currentUser()?.fullName || '';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }
}