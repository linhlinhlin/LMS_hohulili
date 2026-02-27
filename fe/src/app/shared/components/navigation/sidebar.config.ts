import { SidebarConfig, SidebarMenuItem } from './sidebar.component';
import type { UserRole as UserRoleType } from '../../../shared/types/user.types';

// Student Sidebar Configuration
export const studentSidebarConfig: SidebarConfig = {
  role: 'student',
  title: 'Cổng Học viên',
  logoIcon: 'courses',
  showProgress: true,
  progressValue: 75,
  progressLabel: 'Tiến độ học tập',
  menuItems: [
    {
      label: 'Trang chủ',
      route: '/student',
      icon: 'home',
      exact: true
    },
    {
      label: 'Khóa học của tôi',
      route: '/student/my-courses',
      icon: 'courses'
    },
    {
      label: 'Bài tập của tôi',
      route: '/student/assignments',
      icon: 'blog'
    },
    {
      label: 'Tin nhắn',
      route: '/student/messages',
      icon: 'mail'
    },
    {
      label: 'Trợ Lý AI',
      route: '/student/ai-chat',
      icon: 'globe',
      badge: 'NEW'
    },
    {
      label: 'Phân tích',
      route: '/student/analytics',
      icon: 'bar-chart'
    },
    {
      label: 'Bảng điểm',
      route: '/student/grades',
      icon: 'check'
    },
    {
      label: 'Lịch sử thanh toán',
      route: '/student/payments',
      icon: 'briefcase'
    },
    {
      label: 'Khám phá',
      route: '/student/browse',
      icon: 'search'
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
      icon: 'home'
    },
    {
      label: 'Khóa học',
      route: '/teacher/courses',
      icon: 'courses'
    },
    {
      label: 'Bài tập & Chấm điểm',
      route: '/teacher/assessments',
      icon: 'blog',
      children: [
        {
          label: 'Bài tập tự luận',
          route: '/teacher/assessments/assignments',
          icon: 'file-text'
        },
        {
          label: 'Thư viện Rubric',
          route: '/teacher/assessments/rubrics',
          icon: 'blog'
        },
        {
          label: 'Bài tập trắc nghiệm',
          route: '/teacher/assessments/quizzes',
          icon: 'check'
        },
        {
          label: 'Ngân hàng câu hỏi',
          route: '/teacher/assessments/question-bank',
          icon: 'info'
        }
      ]
    },

    {
      label: 'Phân tích',
      route: '/teacher/analytics',
      icon: 'bar-chart'
    },
    {
      label: 'Doanh thu',
      route: '/teacher/revenue',
      icon: 'tag'
    },
    {
      label: 'Lời mời',
      route: '/teacher/invitations',
      icon: 'mail'
    },
    {
      label: 'Thông báo',
      route: '/teacher/notifications',
      icon: 'bell'
    },
    {
      label: 'Trợ Lý AI',
      route: '/teacher/ai-chat',
      icon: 'globe',
      badge: 'NEW'
    }
  ]
};

// Full Admin Sidebar Configuration (all items — SYSTEM_ADMIN sees everything)
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
    label: 'Phân tích',
    route: '/admin/analytics',
    icon: 'bar-chart'
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
  },
  {
    label: 'LMS AI',
    route: '/admin/ai-chat',
    icon: 'globe',
    badge: 'NEW'
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

// ORG_ADMIN sidebar (operations only — no settings/logs/AI knowledge)
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
      return studentSidebarConfig; // fallback
  }
}
