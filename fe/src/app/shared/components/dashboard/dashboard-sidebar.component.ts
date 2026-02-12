import { Component, inject, input, ChangeDetectionStrategy } from "@angular/core"

import { RouterModule } from "@angular/router"
import { AuthService } from "../../../core/services/auth.service"

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "app-dashboard-sidebar",
  imports: [RouterModule],
  template: `
    <aside [class]="sidebarClasses()">
      <div class="p-6">
        <h2 class="text-lg font-semibold text-gray-900">LMS Dashboard</h2>
      </div>
      
      <nav class="mt-6">
        <div class="px-6 space-y-1">
          @if (userRole() === 'student') {
            <a routerLink="/dashboard/student" routerLinkActive="bg-[#0056D2]/5 text-[#004BB5]" 
               class="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-50">
              Trang chủ
            </a>
            <a routerLink="/courses" routerLinkActive="bg-[#0056D2]/5 text-[#004BB5]"
               class="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-50">
              Khóa học
            </a>
          }
          
          @if (userRole() === 'teacher') {
            <a routerLink="/dashboard/teacher" routerLinkActive="bg-[#0056D2]/5 text-[#004BB5]"
               class="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-50">
              Trang chủ
            </a>
            <a routerLink="/courses/manage" routerLinkActive="bg-[#0056D2]/5 text-[#004BB5]"
               class="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-50">
              Quản lý khóa học
            </a>
          }
          
          @if (userRole() === 'admin' || userRole() === 'org_admin') {
            <a routerLink="/dashboard/admin" routerLinkActive="bg-[#0056D2]/5 text-[#004BB5]"
               class="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-50">
              Trang chủ
            </a>
            <a routerLink="/admin/users" routerLinkActive="bg-[#0056D2]/5 text-[#004BB5]"
               class="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-50">
              Quản lý người dùng
            </a>
          }
        </div>
      </nav>
    </aside>
  `,
})
export class DashboardSidebarComponent {
  private authService = inject(AuthService)

  isOpen = input<boolean>(false)
  userRole = this.authService.userRole

  sidebarClasses() {
    return `w-64 bg-white border-r border-gray-200 h-full flex flex-col`
  }
}
