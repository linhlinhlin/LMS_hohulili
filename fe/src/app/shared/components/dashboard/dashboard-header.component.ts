import { Component, inject, output, signal, ChangeDetectionStrategy, ViewEncapsulation } from "@angular/core"
import { CommonModule } from "@angular/common"
import { RouterModule, Router } from "@angular/router"
import { FormsModule } from "@angular/forms"
import { AuthService } from "../../../core/services/auth.service"
import { SmartBreadcrumbsComponent } from "../navigation/smart-breadcrumbs.component"

@Component({
  selector: "app-dashboard-header",
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SmartBreadcrumbsComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <header class="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-30 backdrop-blur-sm bg-white/95">
      <div class="flex items-center justify-between h-20 px-8">
        <div class="flex items-center space-x-6">
          <!-- Mobile Menu Button -->
          <button 
            (click)="mobileMenuToggle.emit()"
            class="md:hidden p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200">
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path>
            </svg>
          </button>
          
          <!-- Breadcrumbs for Student -->
          @if (authService.userRole() === 'student') {
            <app-smart-breadcrumbs></app-smart-breadcrumbs>
          } @else {
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                  <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                </svg>
              </div>
              <h1 class="text-2xl font-bold text-gray-900">{{ getDashboardTitle() }}</h1>
            </div>
          }
        </div>

        <!-- Top Bar Actions -->
        <div class="flex items-center space-x-6">
          <!-- Search với thiết kế đẹp -->
          <div class="relative hidden lg:block">
            <input type="text" 
                   placeholder="Tìm kiếm khóa học, bài tập..."
                   [(ngModel)]="searchQuery"
                   (input)="onSearch($event)"
                   class="w-80 pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all duration-200 shadow-sm">
            <svg class="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"></path>
            </svg>
          </div>

          <!-- Notifications với badge -->
          <button class="relative p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200 group">
            <svg class="w-6 h-6 group-hover:scale-110 transition-transform duration-200" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"></path>
            </svg>
            <span class="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
            <span class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              3
            </span>
          </button>

          <!-- User Profile với thiết kế hiện đại -->
          <div class="flex items-center space-x-4 bg-gray-50 rounded-xl p-2 hover:bg-gray-100 transition-colors duration-200 cursor-pointer group"
               (click)="toggleUserMenu()">
            <div class="relative">
              <img [src]="currentUser()?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'" 
                   [alt]="userName()" 
                   class="w-10 h-10 rounded-xl object-cover border-2 border-blue-200 shadow-sm group-hover:scale-105 transition-transform duration-200">
              <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div class="hidden md:block">
              <p class="text-sm font-semibold text-gray-900">{{ userName() }}</p>
              <p class="text-xs text-gray-500">{{ getUserRoleLabel() }}</p>
            </div>
            <svg class="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"></path>
            </svg>
          </div>

          <!-- Quick Actions với gradient -->
          <button 
            (click)="goToQuickAction()"
            class="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105">
            {{ getQuickActionText() }}
          </button>

          <!-- Logout với thiết kế đẹp -->
          <button 
            (click)="logout()"
            class="p-3 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 group">
            <svg class="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd"></path>
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- User Menu Dropdown -->
    @if (showUserMenu()) {
      <div class="fixed inset-0 z-40" (click)="showUserMenu.set(false)"></div>
      <div class="absolute right-4 top-16 z-50 w-64 bg-white rounded-lg shadow-lg border border-gray-200">
        <div class="p-4 border-b border-gray-200">
          <div class="flex items-center space-x-3">
            <img [src]="currentUser()?.avatar || '/assets/default-avatar.png'" 
                 [alt]="userName()"
                 class="w-10 h-10 rounded-full">
            <div>
              <p class="font-medium text-gray-900">{{ userName() }}</p>
              <p class="text-sm text-gray-500">{{ getUserRoleLabel() }}</p>
            </div>
          </div>
        </div>
        
        <div class="py-2">
          <button (click)="router.navigate(['/profile']); showUserMenu.set(false)"
                  class="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors">
            <svg class="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path>
            </svg>
            Hồ sơ cá nhân
          </button>
          
          <button (click)="router.navigate(['/settings']); showUserMenu.set(false)"
                  class="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors">
            <svg class="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"></path>
            </svg>
            Cài đặt
          </button>
          
          <button (click)="router.navigate(['/help']); showUserMenu.set(false)"
                  class="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors">
            <svg class="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"></path>
            </svg>
            Trợ giúp
          </button>
          
          <div class="border-t border-gray-200 my-2"></div>
          
          <button (click)="logout(); showUserMenu.set(false)"
                  class="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors">
            <svg class="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd"></path>
            </svg>
            Đăng xuất
          </button>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardHeaderComponent {
  protected authService = inject(AuthService)
  protected router = inject(Router)

  mobileMenuToggle = output<void>()
  searchQuery = signal('')
  showUserMenu = signal(false)

  currentUser = this.authService.currentUser
  userName = this.authService.userName

  getDashboardTitle(): string {
    const role = this.authService.userRole()
    switch (role) {
      case 'student': return 'Student Dashboard'
      case 'teacher': return 'Teacher Dashboard'
      case 'admin': return 'Admin Dashboard'
      default: return 'Dashboard'
    }
  }

  getUserRoleLabel(): string {
    const role = this.authService.userRole()
    switch (role) {
      case 'student': return 'Sinh viên'
      case 'teacher': return 'Giảng viên'
      case 'admin': return 'Quản trị viên'
      default: return 'Người dùng'
    }
  }

  getQuickActionText(): string {
    const role = this.authService.userRole()
    switch (role) {
      case 'student': return 'Tiếp tục học'
      case 'teacher': return 'Tạo khóa học'
      case 'admin': return 'Quản lý hệ thống'
      default: return 'Hành động'
    }
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement
    this.searchQuery.set(target.value)
    
    // Implement search functionality
    if (this.searchQuery().trim()) {
      // Navigate to search results page
      this.router.navigate(['/search'], { 
        queryParams: { q: this.searchQuery().trim() } 
      });
    }
  }

  goToQuickAction(): void {
    const role = this.authService.userRole()
    switch (role) {
      case 'student':
        this.router.navigate(['/dashboard/student/learning'])
        break
      case 'teacher':
        this.router.navigate(['/dashboard/teacher/courses'])
        break
      case 'admin':
        this.router.navigate(['/dashboard/admin/users'])
        break
      default:
        this.router.navigate(['/dashboard'])
    }
  }

  logout(): void {
    this.authService.logout()
  }

  toggleUserMenu(): void {
    this.showUserMenu.set(!this.showUserMenu());
  }
}