import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { AdminSidebarComponent } from '../../../../shared/components/navigation/admin-sidebar.component';

@Component({
  selector: 'app-admin-layout-simple',
  imports: [CommonModule, RouterModule, RouterOutlet, AdminSidebarComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="min-h-screen flex">
      <!-- Desktop Sidebar -->
      <div class="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-50">
        <app-admin-sidebar></app-admin-sidebar>
      </div>

      <!-- Mobile sidebar overlay -->
      @if (isMobileSidebarOpen()) {
        <div class="fixed inset-0 z-50 lg:hidden"
             (click)="toggleMobileSidebar()">
          <div class="fixed inset-0 bg-black bg-opacity-50"></div>
          <div class="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
            <app-admin-sidebar></app-admin-sidebar>
          </div>
        </div>
      }

      <!-- Main content area -->
      <div class="lg:pl-64 flex flex-col flex-1 min-w-0 min-h-screen">
        <!-- Mobile top bar -->
        <header class="bg-white shadow-sm border-b border-gray-200 lg:hidden sticky top-0 z-40">
          <div class="px-4 sm:px-6">
            <div class="flex justify-between items-center h-16">
              <div class="flex items-center">
                <button (click)="toggleMobileSidebar()" 
                        class="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                        aria-label="Open sidebar">
                  <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <h1 class="ml-3 text-lg font-semibold text-gray-900">Admin Portal</h1>
              </div>
              <div class="flex items-center space-x-3">
                <span class="text-sm text-gray-600 hidden sm:inline">{{ authService.currentUser()?.fullName }}</span>
                <button (click)="logout()" 
                        class="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                        aria-label="Logout">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <!-- Page content -->
        <main class="flex-1">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    /* Ensure proper layout */
    :host {
      display: block;
    }
    
    /* Fix main content alignment - start from top-left, not centered */
    main {
      display: block;
      width: 100%;
      /* Remove any centering that might be applied globally */
    }
    
    /* Smooth transitions */
    .lg\\:pl-64 {
      transition: padding-left 0.3s ease;
    }
    
    /* Mobile sidebar animation */
    @media (max-width: 1023px) {
      .fixed.inset-y-0.left-0 {
        animation: slideIn 0.3s ease-out;
      }
    }
    
    @keyframes slideIn {
      from {
        transform: translateX(-100%);
      }
      to {
        transform: translateX(0);
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminLayoutSimpleComponent {
  protected authService = inject(AuthService);
  protected isMobileSidebarOpen = signal(false);

  toggleMobileSidebar(): void {
    this.isMobileSidebarOpen.update(open => !open);
  }

  logout(): void {
    this.authService.logout();
  }
}