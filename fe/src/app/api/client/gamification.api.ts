import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from './api-client';
import { GAMIFICATION_ENDPOINTS } from '../endpoints/gamification.endpoints';

export interface StreakResponse {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
}

export interface AchievementResponse {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  earnedAt: string;
}

export interface GamificationProfile {
  streak: StreakResponse;
  achievements: AchievementResponse[];
  dailyGoalMinutes: number;
  todayStudyMinutes: number;
  totalAchievements: number;
}

export interface NotificationResponse {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

export interface HeatmapEntry {
  date: string;
  count: number;
  level: number;
}

export interface StudyTimeTrend {
  weekStart: string;
  totalMinutes: number;
}

@Injectable({ providedIn: 'root' })
export class GamificationApi {
  private api = inject(ApiClient);

  getProfile(): Observable<any> {
    return this.api.get(GAMIFICATION_ENDPOINTS.profile);
  }

  checkStreak(): Observable<any> {
    return this.api.post(GAMIFICATION_ENDPOINTS.checkStreak, {});
  }

  checkAchievements(): Observable<any> {
    return this.api.post(GAMIFICATION_ENDPOINTS.checkAchievements, {});
  }

  getNotifications(page = 0, size = 10): Observable<any> {
    return this.api.get(`${GAMIFICATION_ENDPOINTS.notifications}?page=${page}&size=${size}`);
  }

  markNotificationRead(id: string): Observable<any> {
    return this.api.patch(GAMIFICATION_ENDPOINTS.markNotificationRead(id), {});
  }

  getUnreadCount(): Observable<any> {
    return this.api.get(GAMIFICATION_ENDPOINTS.unreadCount);
  }

  getHeatmap(months = 12): Observable<any> {
    return this.api.get(`${GAMIFICATION_ENDPOINTS.heatmap}?months=${months}`);
  }

  getStudyTimeTrends(weeks = 12): Observable<any> {
    return this.api.get(`${GAMIFICATION_ENDPOINTS.studyTimeTrends}?weeks=${weeks}`);
  }
}
