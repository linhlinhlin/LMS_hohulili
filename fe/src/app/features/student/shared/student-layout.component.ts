import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { StudentSidebarComponent } from './student-sidebar.component';

@Component({
  selector: 'app-student-layout',
  imports: [CommonModule, RouterModule, RouterOutlet, StudentSidebarComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="min-h-screen bg-gray-100 flex">
      <!-- Sidebar -->
      <div class="hidden lg:flex lg:w-48 lg:flex-col">
        <app-student-sidebar></app-student-sidebar>
      </div>

      <!-- Mobile sidebar overlay -->
      <div *ngIf="isMobileSidebarOpen()" 
           class="fixed inset-0 z-50 lg:hidden"
           (click)="toggleMobileSidebar()">
        <div class="fixed inset-0 bg-black bg-opacity-50"></div>
        <div class="fixed inset-y-0 left-0 w-48 bg-white shadow-lg">
          <app-student-sidebar></app-student-sidebar>
        </div>
      </div>

      <!-- Main content -->
      <div class="flex-1 flex flex-col min-w-0">
        <!-- Top bar -->
        <header class="bg-white shadow-sm border-b border-gray-200 lg:hidden">
          <div class="px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
              <div class="flex items-center">
                <button (click)="toggleMobileSidebar()" 
                        class="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500">
                  <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <h1 class="ml-3 text-lg font-semibold text-gray-900">Student Portal</h1>
              </div>
              <div class="flex items-center space-x-4">
                <span class="text-sm text-gray-600">{{ authService.currentUser()?.name }}</span>
                <button (click)="logout()" 
                        class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <!-- Page content -->
        <main class="flex-1 overflow-auto">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentLayoutComponent {
  protected authService = inject(AuthService);
  protected isMobileSidebarOpen = signal(false);

  toggleMobileSidebar(): void {
    this.isMobileSidebarOpen.update(open => !open);
  }

  logout(): void {
    this.authService.logout();
  }
}