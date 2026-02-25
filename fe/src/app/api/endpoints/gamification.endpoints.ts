export const GAMIFICATION_ENDPOINTS = {
  profile: '/api/v3/gamification/profile',
  checkStreak: '/api/v3/gamification/check-streak',
  checkAchievements: '/api/v3/gamification/check-achievements',
  notifications: '/api/v3/gamification/notifications',
  markNotificationRead: (id: string) => `/api/v3/gamification/notifications/${id}/read`,
  markAllNotificationsRead: '/api/v3/gamification/notifications/read-all',
  deleteNotification: (id: string) => `/api/v3/gamification/notifications/${id}`,
  unreadCount: '/api/v3/gamification/notifications/unread-count',
  heatmap: '/api/v3/learning-activity/heatmap',
  studyTimeTrends: '/api/v3/learning-activity/study-time/trends',
} as const;
