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
      group: 'Học tập',
      children: [
        {
          label: 'Tất cả khóa học',
          route: '/student/courses/library',
          icon: 'book'
        }
      ]
    },
    {
      label: 'Bài cần làm',
      route: '/student/tasks',
      icon: 'blog',
      group: 'Học tập',
      alsoActiveFor: ['/student/quiz', '/student/tasks']
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
      label: 'Thông báo',
      route: '/student/announcements',
      icon: 'bell',
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
      label: 'Khóa học của tôi',
      route: '/teacher/courses',
      icon: 'courses',
      exact: true,
      group: 'Giảng dạy',
      children: [
        {
          label: 'Tất cả khóa học',
          route: '/teacher/courses/library',
          icon: 'book'
        }
      ]
    },
    {
      label: 'Bài tập & Ngân hàng câu hỏi',
      route: '/teacher/assessments',
      icon: 'blog',
      group: 'Giảng dạy',
      children: [
        {
          label: 'Giao bài tập',
          route: '/teacher/assessments/classes',
          icon: 'users',
          children: [
            {
              label: 'Danh sách bài tập',
              route: '/teacher/assessments/classes/assignments',
              icon: 'blog'
            },
            {
              label: 'Bài kiểm tra',
              route: '/teacher/assessments/classes/quizzes',
              icon: 'check'
            }
          ]
        },
        {
          label: 'Ngân hàng câu hỏi',
          route: '/teacher/assessments/shared',
          icon: 'file-text',
          children: [
            {
              label: 'Ngân hàng câu hỏi',
              route: '/teacher/assessments/shared/question-bank',
              icon: 'file-text'
            },
            {
              label: 'Thư viện rubric',
              route: '/teacher/assessments/shared/rubrics',
              icon: 'tag'
            }
          ]
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
      group: 'Quản lý',
      children: [
        { label: 'Tổng quan', route: '/teacher/revenue', icon: 'bar-chart', exact: true },
        { label: 'Lịch sử rút tiền', route: '/teacher/revenue/payouts', icon: 'file-text' },
        { label: 'Tài khoản ngân hàng', route: '/teacher/revenue/bank-accounts', icon: 'briefcase' }
      ]
    },
    {
      label: 'Tin nhắn',
      route: '/teacher/messages',
      icon: 'mail',
      group: 'Công cụ'
    },
    {
      label: 'Thông báo',
      route: '/teacher/announcements',
      icon: 'bell',
      group: 'Công cụ'
    },
    {
      label: 'Lời mời',
      route: '/teacher/invitations',
      icon: 'mail',
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
    exact: true,
    group: 'Tổng quan'
  },
  {
    label: 'Người dùng',
    route: '/admin/users',
    icon: 'users',
    group: 'Quản lý',
    children: [
      { label: 'Tất cả', route: '/admin/users/all', icon: 'users' },
      { label: 'Giảng viên', route: '/admin/users/teachers', icon: 'briefcase' },
      { label: 'Học viên', route: '/admin/users/students', icon: 'graduation-cap' }
    ]
  },
  {
    label: 'Khóa học',
    route: '/admin/courses',
    icon: 'courses',
    group: 'Quản lý'
  },
  {
    label: 'Danh mục',
    route: '/admin/categories',
    icon: 'tag',
    group: 'Quản lý'
  },
  {
    label: 'Tổ chức',
    route: '/admin/organizations',
    icon: 'globe',
    group: 'Quản lý'
  },
  {
    label: 'Phân tích',
    route: '/admin/analytics',
    icon: 'bar-chart',
    group: 'Báo cáo'
  },
  {
    label: 'Rút tiền',
    route: '/admin/payouts',
    icon: 'briefcase',
    group: 'Tài chính'
  },
  {
    label: 'Cài đặt hệ thống',
    route: '/admin/settings',
    icon: 'settings',
    group: 'Hệ thống'
  },
  {
    label: 'Nhật ký kiểm toán',
    route: '/admin/logs',
    icon: 'file-text',
    group: 'Hệ thống'
  },
  {
    label: 'Bộ nhớ ngoại tuyến',
    route: '/admin/offline-storage',
    icon: 'download',
    group: 'Hệ thống'
  }
];

const orgAdminMenuItems: SidebarMenuItem[] = [
  {
    label: 'Tổng quan',
    route: '/org-admin/dashboard',
    icon: 'home',
    exact: true,
    group: 'Tổng quan'
  },
  {
    label: 'Giảng viên',
    route: '/org-admin/users/teachers',
    icon: 'briefcase',
    group: 'Quản lý'
  },
  {
    label: 'Học viên',
    route: '/org-admin/users/students',
    icon: 'graduation-cap',
    group: 'Quản lý'
  },
  {
    label: 'Khóa học',
    route: '/org-admin/courses',
    icon: 'courses',
    exact: true,
    group: 'Quản lý'
  },
  {
    label: 'Duyệt khóa học',
    route: '/org-admin/courses/review',
    icon: 'file-check',
    group: 'Quản lý'
  },
  {
    label: 'Phân tích',
    route: '/org-admin/analytics',
    icon: 'bar-chart',
    group: 'Báo cáo'
  },
  {
    label: 'Tổ chức',
    route: '/org-admin/organization',
    icon: 'shield',
    group: 'Báo cáo'
  }
];

// System Admin sidebar (full access)
export const adminSidebarConfig: SidebarConfig = {
  role: 'admin',
  title: 'Cổng Quản trị',
  subtitle: 'Quản trị hệ thống',
  logoIcon: 'settings',
  menuItems: allAdminMenuItems
};

// ORG_ADMIN sidebar (operations portal)
export const orgAdminSidebarConfig: SidebarConfig = {
  role: 'org_admin',
  title: 'Cổng Quản lý',
  subtitle: 'Tổ chức',
  logoIcon: 'courses',
  menuItems: orgAdminMenuItems
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
