/**
 * Announcement Service
 *
 * Quản lý thông báo khóa học (teacher → students).
 * Hỗ trợ đánh dấu đã đọc và đếm thông báo chưa đọc.
 */
import { inject, Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map, tap } from 'rxjs';

export interface Announcement {
  id: string;
  courseId: string;
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  priority: 'NORMAL' | 'IMPORTANT';
  targetType: 'COURSE' | 'CLASS' | 'ALL_STUDENTS';
  publishedAt: string;
  updatedAt?: string;
  isRead?: boolean;
}

export interface CreateAnnouncementRequest {
  courseId: string;
  title: string;
  content: string;
  priority?: string;
  targetType?: string;
}

@Injectable({ providedIn: 'root' })
export class AnnouncementService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/v3/announcements';

  private readonly _announcements = signal<Announcement[]>([]);
  private readonly _readIds = signal<Set<string>>(new Set());
  private readonly _unreadCount = signal(0);
  private readonly _loading = signal(false);

  readonly announcements = this._announcements.asReadonly();
  readonly unreadCount = this._unreadCount.asReadonly();
  readonly loading = this._loading.asReadonly();

  readonly announcementsWithReadStatus = computed(() => {
    const readIds = this._readIds();
    return this._announcements().map((a) => ({
      ...a,
      isRead: readIds.has(a.id),
    }));
  });

  getAnnouncements(courseId?: string, courseIds?: string[]): Observable<Announcement[]> {
    this._loading.set(true);

    const params: Record<string, string> = {};
    if (courseId) params['courseId'] = courseId;
    if (courseIds?.length) params['courseIds'] = courseIds.join(',');

    return this.http
      .get<{ data: Announcement[] }>(this.apiUrl, { params })
      .pipe(
        map((res) => res.data ?? []),
        tap((announcements) => {
          this._announcements.set(announcements);
          this._loading.set(false);
        }),
        catchError(() => {
          this._loading.set(false);
          return of([]);
        }),
      );
  }

  createAnnouncement(request: CreateAnnouncementRequest): Observable<Announcement> {
    return this.http
      .post<{ data: Announcement }>(this.apiUrl, request)
      .pipe(
        map((res) => res.data),
        tap((announcement) => {
          this._announcements.update((list) => [announcement, ...list]);
        }),
      );
  }

  deleteAnnouncement(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this._announcements.update((list) => list.filter((a) => a.id !== id));
      }),
    );
  }

  markAsRead(announcementIds: string[]): Observable<void> {
    if (!announcementIds.length) return of(undefined);

    return this.http
      .post<void>(`${this.apiUrl}/mark-read`, { announcementIds })
      .pipe(
        tap(() => {
          this._readIds.update((ids) => {
            const newSet = new Set(ids);
            announcementIds.forEach((id) => newSet.add(id));
            return newSet;
          });
        }),
        catchError(() => of(undefined)),
      );
  }

  loadReadIds(): Observable<Set<string>> {
    return this.http
      .get<{ data: string[] }>(`${this.apiUrl}/read-ids`)
      .pipe(
        map((res) => new Set(res.data ?? [])),
        tap((ids) => this._readIds.set(ids)),
        catchError(() => of(new Set<string>())),
      );
  }

  getUnreadCount(courseIds: string[]): Observable<number> {
    if (!courseIds.length) return of(0);
    return this.http
      .get<{ data: { unreadCount: number } }>(`${this.apiUrl}/unread-count`, {
        params: { courseIds: courseIds.join(',') },
      })
      .pipe(
        map((res) => res.data?.unreadCount ?? 0),
        tap((count) => this._unreadCount.set(count)),
        catchError(() => of(0)),
      );
  }
}
