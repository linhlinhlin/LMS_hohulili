import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnnouncementService, Announcement } from '../../../core/services/announcement.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-announcement-list',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="space-y-3">
        <div class="h-4 w-24 animate-pulse rounded bg-slate-200"></div>
        @for (i of [1, 2, 3]; track i) {
          <div class="rounded-lg border border-slate-200 bg-white p-4">
            <div class="mb-2 flex items-start justify-between">
              <div class="h-4 w-48 animate-pulse rounded bg-slate-200"></div>
              <div class="h-2 w-2 animate-pulse rounded-full bg-slate-200"></div>
            </div>
            <div class="mb-2 space-y-1">
              <div class="h-3 w-full animate-pulse rounded bg-slate-100"></div>
              <div class="h-3 w-3/4 animate-pulse rounded bg-slate-100"></div>
            </div>
            <div class="flex gap-3">
              <div class="h-3 w-24 animate-pulse rounded bg-slate-100"></div>
              <div class="h-3 w-20 animate-pulse rounded bg-slate-100"></div>
            </div>
          </div>
        }
      </div>
    } @else if (announcements().length === 0) {
      <div class="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center">
        <svg class="mx-auto mb-4 h-16 w-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
        </svg>
        <h3 class="mb-1 text-lg font-semibold text-slate-900">Chưa có thông báo</h3>
        <p class="text-slate-500">Thông báo từ giảng viên sẽ xuất hiện ở đây.</p>
      </div>
    } @else {
      <div class="space-y-3">
        @for (group of groupedAnnouncements(); track group.courseId) {
          <div>
            <h3 class="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              {{ group.courseName || 'Khóa học' }}
            </h3>
            @for (announcement of group.items; track announcement.id) {
              <div
                class="mb-2 rounded-lg border bg-white p-4 transition"
                [class]="announcement.isRead
                  ? 'border-slate-200'
                  : 'border-[#0056D2]/30 bg-[#0056D2]/5'"
                (click)="onAnnouncementClick(announcement)">
                <div class="mb-1 flex items-start justify-between gap-2">
                  <div class="flex items-center gap-2">
                    @if (announcement.priority === 'IMPORTANT') {
                      <span class="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Quan trọng
                      </span>
                    }
                    <h4 class="font-medium text-slate-900" [class.font-bold]="!announcement.isRead">
                      {{ announcement.title }}
                    </h4>
                  </div>
                  @if (!announcement.isRead) {
                    <span class="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[#0056D2]"></span>
                  }
                </div>
                <p class="mb-2 line-clamp-2 text-sm text-slate-600">{{ announcement.content }}</p>
                <div class="flex items-center gap-3 text-xs text-slate-400">
                  <span>{{ announcement.authorName }}</span>
                  <span>{{ announcement.publishedAt | date:'dd/MM/yyyy HH:mm' }}</span>
                </div>
              </div>
            }
          </div>
        }
      </div>
    }

    @if (selectedAnnouncement()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" (click)="closeDetail()">
        <div class="w-full max-w-lg rounded-lg bg-white shadow-xl" (click)="$event.stopPropagation()">
          <div class="border-b border-slate-200 px-6 py-4">
            <div class="flex items-start justify-between">
              <div>
                @if (selectedAnnouncement()!.priority === 'IMPORTANT') {
                  <span class="mb-1 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    Quan trọng
                  </span>
                }
                <h2 class="text-lg font-bold text-slate-900">{{ selectedAnnouncement()!.title }}</h2>
              </div>
              <button type="button" (click)="closeDetail()"
                class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div class="mt-1 flex items-center gap-3 text-sm text-slate-500">
              <span>{{ selectedAnnouncement()!.authorName }}</span>
              <span>{{ selectedAnnouncement()!.publishedAt | date:'dd/MM/yyyy HH:mm' }}</span>
            </div>
          </div>
          <div class="max-h-[60vh] overflow-y-auto px-6 py-4">
            <div class="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">{{ selectedAnnouncement()!.content }}</div>
          </div>
        </div>
      </div>
    }
  `,
})
export class AnnouncementListComponent implements OnInit {
  private readonly announcementService = inject(AnnouncementService);
  private readonly authService = inject(AuthService);

  readonly loading = this.announcementService.loading;
  readonly selectedAnnouncement = signal<Announcement | null>(null);

  readonly announcements = this.announcementService.announcementsWithReadStatus;

  readonly groupedAnnouncements = computed(() => {
    const all = this.announcements();
    const groups = new Map<string, { courseId: string; courseName: string; items: Announcement[] }>();

    for (const a of all) {
      if (!groups.has(a.courseId)) {
        groups.set(a.courseId, { courseId: a.courseId, courseName: '', items: [] });
      }
      groups.get(a.courseId)!.items.push(a);
    }

    return Array.from(groups.values());
  });

  ngOnInit(): void {
    // Load announcements for enrolled courses
    // For now, load all — in production, pass enrolled courseIds
    this.announcementService.getAnnouncements().subscribe();
    this.announcementService.loadReadIds().subscribe();
  }

  onAnnouncementClick(announcement: Announcement): void {
    this.selectedAnnouncement.set(announcement);

    if (!announcement.isRead) {
      this.announcementService.markAsRead([announcement.id]).subscribe();
    }
  }

  closeDetail(): void {
    this.selectedAnnouncement.set(null);
  }
}
