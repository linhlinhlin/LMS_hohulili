export const LEARNING_ACTIVITY_ENDPOINTS = {
  HEARTBEAT: '/api/v3/learning-activity/heartbeat',
  READING_PROGRESS: '/api/v3/learning-activity/reading-progress',
  INTERACTIVE_VIDEO_EVENTS: '/api/v3/learning-activity/interactive-video/events',
  CONTINUE: '/api/v3/learning-activity/continue',
  STUDY_TIME_TODAY: '/api/v3/learning-activity/study-time/today',
  STUDY_TIME_TRENDS: '/api/v3/learning-activity/study-time/trends',
  HEATMAP: '/api/v3/learning-activity/heatmap',
} as const;
