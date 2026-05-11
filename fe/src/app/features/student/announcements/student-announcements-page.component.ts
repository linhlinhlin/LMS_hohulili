import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AnnouncementService, Announcement } from '../../../core/services/announcement.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

type AnnouncementWithRead = Announcement & { isRead?: boolean };
type FilterTab = 'all' | 'unread' | 'important';

@Component({
  selector: 'app-student-announcements-page',
  imports: [CommonModule, PaginationComponent],
  templateUrl: './student-announcements-page.component.html',
  styleUrl: './student-announcements-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentAnnouncementsPageComponent implements OnInit {
  private readonly announcementService = inject(AnnouncementService);
  private readonly http = inject(HttpClient);

  readonly PAGE_SIZE = 12;

  readonly loading = this.announcementService.loading;
  readonly selected = signal<AnnouncementWithRead | null>(null);
  readonly activeFilter = signal<FilterTab>('all');
  readonly currentPage = signal(0);
  readonly courseNameMap = signal<Map<string, string>>(new Map());

  readonly announcements = this.announcementService.announcementsWithReadStatus;
  readonly unreadCount = computed(() => this.announcements().filter(a => !a.isRead).length);

  readonly filterTabs = [
    { key: 'all' as FilterTab, label: 'Tất cả', count: computed(() => this.announcements().length) },
    { key: 'unread' as FilterTab, label: 'Chưa đọc', count: computed(() => this.unreadCount()) },
    { key: 'important' as FilterTab, label: 'Quan trọng', count: computed(() => this.announcements().filter(a => a.priority === 'IMPORTANT').length) },
  ];

  readonly filteredAnnouncements = computed(() => {
    const all = this.announcements();
    const f = this.activeFilter();
    if (f === 'unread') return all.filter(a => !a.isRead);
    if (f === 'important') return all.filter(a => a.priority === 'IMPORTANT');
    return all;
  });

  readonly totalItems = computed(() => this.filteredAnnouncements().length);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalItems() / this.PAGE_SIZE)));
  readonly effectiveCurrentPage = computed(() => Math.min(this.currentPage(), this.totalPages() - 1));

  readonly visibleAnnouncements = computed(() =>
    this.filteredAnnouncements().slice(
      this.effectiveCurrentPage() * this.PAGE_SIZE,
      (this.effectiveCurrentPage() + 1) * this.PAGE_SIZE,
    ),
  );

  ngOnInit(): void {
    this.http
      .get<{ data: { content: { id: string; title?: string }[] } }>('/api/v3/student/courses/enrolled?page=0&size=100')
      .subscribe({
        next: (res) => {
          const courses = res?.data?.content ?? [];
          const ids = courses.map(c => c.id);
          const names = new Map<string, string>();
          for (const c of courses) { if (c.title) names.set(c.id, c.title); }
          this.courseNameMap.set(names);
          if (ids.length > 0) {
            this.announcementService.getAnnouncements(undefined, ids).subscribe();
            this.announcementService.getUnreadCount(ids).subscribe();
          }
        },
      });
    this.announcementService.loadReadIds().subscribe();
  }

  setFilter(tab: FilterTab): void {
    this.activeFilter.set(tab);
    this.currentPage.set(0);
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages()) return;
    this.currentPage.set(page);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  openDetail(a: AnnouncementWithRead): void {
    this.selected.set(a);
    if (!a.isRead) {
      this.announcementService.markAsRead([a.id]).subscribe();
    }
  }

  closeDetail(): void {
    this.selected.set(null);
  }

  markAllAsRead(): void {
    const ids = this.announcements().filter(a => !a.isRead).map(a => a.id);
    if (ids.length > 0) this.announcementService.markAsRead(ids).subscribe();
  }
}
