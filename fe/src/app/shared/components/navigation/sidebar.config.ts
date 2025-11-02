import { SidebarConfig, SidebarMenuItem } from './sidebar.component';
import type { UserRole as UserRoleType } from '../../../shared/types/user.types';

// Student Sidebar Configuration
export const studentSidebarConfig: SidebarConfig = {
  role: 'student',
  title: 'Student Portal',
  logoIcon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  showProgress: true,
  progressValue: 75,
  progressLabel: 'Tiến độ học tập',
  menuItems: [
    {
      label: 'Dashboard',
      route: '/student',
      icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z',
      exact: true
    },
    {
      label: 'Khóa học',
      route: '/student/courses',
      icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
    },
    {
      label: 'Học tập',
      route: '/student/learn',
      icon: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l.707.707A1 1 0 0012.414 11H13m-3 3a1 1 0 100 2h6a1 1 0 100-2H9z'
    },
    {
      label: 'Bài tập',
      route: '/student/assignments',
      icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      badge: '2'
    },
    {
      label: 'Quiz',
      route: '/student/quiz',
      icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      label: 'Thảo luận',
      route: '/student/forum',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
    },
    {
      label: 'Phân tích',
      route: '/student/analytics',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
    },
    {
      label: 'Hồ sơ',
      route: '/student/profile',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
    }
  ]
};

// Teacher Sidebar Configuration
export const teacherSidebarConfig: SidebarConfig = {
  role: 'teacher',
  title: 'Teacher Portal',
  logoIcon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  menuItems: [
    {
      label: 'Dashboard',
      route: '/teacher/dashboard',
  icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6'
    },
    {
      label: 'Khóa học',
      route: '/teacher/courses',
  icon: 'M12 6l-8 4 8 4 8-4-8-4zm0 10l-8-4v6l8 4 8-4v-6l-8 4z',
      children: [
        {
          label: 'Tạo khóa học',
          route: '/teacher/course-creation',
          icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6'
        }
      ]
    },
    {
      label: 'Bài tập',
      route: '/teacher/assignments',
  icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2H9zm0 0a2 2 0 002 2h2a2 2 0 002-2',
      children: [
        {
          label: 'Tạo bài tập',
          route: '/teacher/assignment-creation',
          icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6'
        }
      ]
    },
    {
      label: 'Học viên',
      route: '/teacher/students',
  icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M15 7a3 3 0 11-6 0 3 3 0 016 0z'
    },
    {
      label: 'Chấm điểm',
      route: '/teacher/grading',
  icon: 'M5 13l4 4L19 7',
      children: [
        {
          label: 'Quản lý Rubric',
          route: '/teacher/rubrics',
          icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
        }
      ]
    },
    {
      label: 'Phân tích',
      route: '/teacher/analytics',
  icon: 'M9 19V9a2 2 0 00-2-2H5v12h4zm6 0V5h-4v14h4zm2 0h2V7h-2v12z'
    },
    {
      label: 'Thông báo',
      route: '/teacher/notifications',
  icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0'
    }
  ]
};

// Admin Sidebar Configuration
export const adminSidebarConfig: SidebarConfig = {
  role: 'admin',
  title: 'Admin Portal',
  logoIcon: 'M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z',
  menuItems: [
    {
      label: 'Dashboard',
      route: '/admin/dashboard',
  icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6',
      exact: true
    },
    {
      label: 'Người dùng',
      route: '/admin/users',
  icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M15 7a3 3 0 11-6 0 3 3 0 016 0z'
    },
    {
      label: 'Khóa học',
      route: '/admin/courses',
  icon: 'M12 6l-8 4 8 4 8-4-8-4zm0 10l-8-4v6l8 4 8-4v-6l-8 4z'
    },
    {
      label: 'Phân tích',
      route: '/admin/analytics',
  icon: 'M9 19V9a2 2 0 00-2-2H5v12h4zm6 0V5h-4v14h4zm2 0h2V7h-2v12z'
    },
    {
      label: 'Cài đặt hệ thống',
      route: '/admin/settings',
  icon: 'M11.983 2a1 1 0 01.894.553l.894 1.789a6.992 6.992 0 012.122.879l1.98-.495a1 1 0 011.118.446l1 1.732a1 1 0 01-.224 1.29l-1.511 1.21c.083.45.125.912.125 1.386s-.042.936-.125 1.386l1.511 1.21a1 1 0 01.224 1.29l-1 1.732a1 1 0 01-1.118.446l-1.98-.495a6.992 6.992 0 01-2.122.879l-.894 1.789a1 1 0 01-.894.553h-2a1 1 0 01-.894-.553l-.894-1.789a6.992 6.992 0 01-2.122-.879l-1.98.495a1 1 0 01-1.118-.446l-1-1.732a1 1 0 01.224-1.29l1.511-1.21A6.97 6.97 0 015 12c0-.474.042-.936.125-1.386L3.614 9.404a1 1 0 01-.224-1.29l1-1.732a1 1 0 011.118-.446l1.98.495a6.992 6.992 0 012.122-.879l.894-1.789A1 1 0 019.983 2h2z'
    },
    {
      label: 'Báo cáo',
      route: '/admin/reports',
  icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2H9zm0 0a2 2 0 002 2h2a2 2 0 002-2'
    },
    {
      label: 'Thông báo',
      route: '/admin/notifications',
  icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0'
    },
    {
      label: 'Nhật ký hệ thống',
      route: '/admin/logs',
  icon: 'M12 20H6a2 2 0 01-2-2V8l6-4 6 4v2m-4 10V12h8m-8 8h8a2 2 0 002-2v-8h-8a2 2 0 00-2 2v8z'
    }
  ]
};

// Helper function to get sidebar config by role
export function getSidebarConfig(role: UserRoleType): SidebarConfig {
  switch (role) {
    case 'student':
      return studentSidebarConfig;
    case 'teacher':
      return teacherSidebarConfig;
    case 'admin':
      return adminSidebarConfig;
    default:
      return studentSidebarConfig; // fallback
  }
}