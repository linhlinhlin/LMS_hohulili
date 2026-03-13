import { SidebarConfig, SidebarMenuItem } from './sidebar.component';
import type { UserRole as UserRoleType } from '../../../shared/types/user.types';

// Student Sidebar Configuration
export const studentSidebarConfig: SidebarConfig = {
  role: 'student',
  title: 'Cổng Học viên',
  logoIcon: 'courses',
  menuItems: [
    {
      label: 'Khóa học của tôi',
      route: '/student/courses',
      icon: 'courses',
      exact: true,
      group: 'Học tập'
    },
    {
      label: 'Bài cần làm',
      route: '/student/tasks',
      icon: 'blog',
      group: 'Học tập'
    },
    {
      label: 'Kết quả',
      route: '/student/results',
      icon: 'check',
      group: 'Học tập'
    },
    {
      label: 'Khám phá',
      route: '/student/browse',
      icon: 'search',
      group: 'Học tập'
    },
    {
      label: 'Tin nhắn',
      route: '/student/messages',
      icon: 'mail',
      group: 'Công cụ'
    },
    {
      label: 'Lưu trữ ngoại tuyến',
      route: '/student/storage',
      icon: 'download',
      group: 'Công cụ'
    },
    {
      label: 'Phân tích',
      route: '/student/analytics',
      icon: 'bar-chart',
      group: 'Tài khoản'
    },
    {
      label: 'Lịch sử thanh toán',
      route: '/student/payments',
      icon: 'briefcase',
      group: 'Tài khoản'
    },
    {
      label: 'Hồ sơ',
      route: '/student/profile',
      icon: 'users',
      group: 'Tài khoản'
    }
  ]
};

// Teacher Sidebar Configuration
export const teacherSidebarConfig: SidebarConfig = {
  role: 'teacher',
  title: 'Cổng Giảng viên',
  logoIcon: 'courses',
  menuItems: [
    {
      label: 'Trang chủ',
      route: '/teacher/dashboard',
      icon: 'home',
      group: 'Giảng dạy'
    },
    {
      label: 'Khóa học',
      route: '/teacher/courses',
      icon: 'courses',
      group: 'Giảng dạy'
    },
    {
      label: 'Đánh giá',
      route: '/teacher/assessments',
      icon: 'blog',
      group: 'Giảng dạy',
      children: [
        {
          label: 'Khóa học',
          route: '/teacher/assessments/courses/overview',
          icon: 'courses'
        },
        {
          label: 'Lớp học',
          route: '/teacher/assessments/classes/assignments',
          icon: 'users'
        },
        {
          label: 'Dùng chung',
          route: '/teacher/assessments/shared/question-bank',
          icon: 'info'
        }
      ]
    },
    {
      label: 'Học viên',
      route: '/teacher/students',
      icon: 'users',
      group: 'Quản lý'
    },
    {
      label: 'Phân tích',
      route: '/teacher/analytics',
      icon: 'bar-chart',
      group: 'Quản lý'
    },
    {
      label: 'Doanh thu',
      route: '/teacher/revenue',
      icon: 'tag',
      group: 'Quản lý'
    },
    {
      label: 'Lời mời',
      route: '/teacher/invitations',
      icon: 'mail',
      group: 'Khác'
    },
    {
      label: 'Thông báo',
      route: '/teacher/notifications',
      icon: 'bell',
      group: 'Khác'
    }
  ]
};

// Full Admin Sidebar Configuration (all items - SYSTEM_ADMIN sees everything)
const allAdminMenuItems: SidebarMenuItem[] = [
  {
    label: 'Trang chủ',
    route: '/admin/dashboard',
    icon: 'home',
    exact: true
  },
  {
    label: 'Người dùng',
    route: '/admin/users',
    icon: 'users'
  },
  {
    label: 'Khóa học',
    route: '/admin/courses',
    icon: 'courses'
  },
  {
    label: 'Danh mục',
    route: '/admin/categories',
    icon: 'tag'
  },
  {
    label: 'Phân tích',
    route: '/admin/analytics',
    icon: 'bar-chart'
  },
  {
    label: 'Rút tiền',
    route: '/admin/payouts',
    icon: 'tag'
  },
  {
    label: 'Cài đặt hệ thống',
    route: '/admin/settings',
    icon: 'settings'
  },
  {
    label: 'Nhật ký kiểm toán',
    route: '/admin/logs',
    icon: 'file-text'
  }
];

// Routes hidden from ORG_ADMIN (system-level only)
const systemOnlyRoutes = new Set(['/admin/settings', '/admin/logs']);

// System Admin sidebar (full access)
export const adminSidebarConfig: SidebarConfig = {
  role: 'admin',
  title: 'Cổng Quản trị',
  subtitle: 'Quản trị hệ thống',
  logoIcon: 'settings',
  menuItems: allAdminMenuItems
};

// ORG_ADMIN sidebar (operations only - no settings/logs/AI knowledge)
export const orgAdminSidebarConfig: SidebarConfig = {
  role: 'org_admin',
  title: 'Cổng Quản trị',
  subtitle: 'Chuyên viên',
  logoIcon: 'settings',
  menuItems: allAdminMenuItems.filter(item => !systemOnlyRoutes.has(item.route))
};

// Helper function to get sidebar config by role
export function getSidebarConfig(role: UserRoleType): SidebarConfig {
  switch (role) {
    case 'student':
      return studentSidebarConfig;
    case 'teacher':
      return teacherSidebarConfig;
    case 'org_admin':
      return orgAdminSidebarConfig;
    case 'admin':
      return adminSidebarConfig;
    default:
      return studentSidebarConfig;
  }
}
