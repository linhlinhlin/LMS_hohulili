import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import {
  AnnouncementService,
  Announcement,
  CreateAnnouncementRequest,
} from '../../../core/services/announcement.service';

interface CourseOption { id: string; title: string; }
type FilterTab = 'all' | 'important';

@Component({
  selector: 'app-teacher-announcements',
  imports: [CommonModule, FormsModule],
  templateUrl: './teacher-announcements.component.html',
  styleUrl: './teacher-announcements.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherAnnouncementsComponent implements OnInit {
  private readonly announcementService = inject(AnnouncementService);
  private readonly http = inject(HttpClient);

  private readonly INITIAL_COUNT = 10;
  private readonly LOAD_MORE_COUNT = 10;

  readonly loading = this.announcementService.loading;
  readonly announcements = this.announcementService.announcements;
  readonly courses = signal<CourseOption[]>([]);
  readonly courseNameMap = signal<Map<string, string>>(new Map());
  readonly showCreateForm = signal(false);
  readonly creating = signal(false);
  readonly createError = signal<string | null>(null);
  readonly deleteTarget = signal<string | null>(null);
  readonly activeFilter = signal<FilterTab>('all');
  readonly visibleCount = signal(this.INITIAL_COUNT);

  selectedCourseId = '';
  formTitle = '';
  formContent = '';
  formPriority = 'NORMAL';

  readonly filterTabs = [
    { key: 'all' as FilterTab, label: 'Tất cả', count: computed(() => this.announcements().length) },
    { key: 'important' as FilterTab, label: 'Quan trọng', count: computed(() => this.announcements().filter(a => a.priority === 'IMPORTANT').length) },
  ];

  readonly filteredAnnouncements = computed(() => {
    const all = this.announcements();
    if (this.activeFilter() === 'important') return all.filter(a => a.priority === 'IMPORTANT');
    return all;
  });

  readonly visibleAnnouncements = computed(() => this.filteredAnnouncements().slice(0, this.visibleCount()));
  readonly hasMoreToShow = computed(() => this.visibleCount() < this.filteredAnnouncements().length);
  readonly remainingCount = computed(() => Math.max(0, this.filteredAnnouncements().length - this.visibleCount()));

  canSubmit(): boolean {
    return !!this.selectedCourseId && !!this.formTitle.trim() && !!this.formContent.trim();
  }

  ngOnInit(): void {
    this.loadCourses();
  }

  setFilter(tab: FilterTab): void {
    this.activeFilter.set(tab);
    this.visibleCount.set(this.INITIAL_COUNT);
  }

  loadMore(): void {
    this.visibleCount.update(c => c + this.LOAD_MORE_COUNT);
  }

  openCreateForm(): void {
    this.showCreateForm.set(true);
    this.createError.set(null);
  }

  deleteAnnouncement(id: string, event: Event): void {
    event.stopPropagation();
    this.deleteTarget.set(id);
  }

  confirmDelete(): void {
    const id = this.deleteTarget();
    if (!id) return;
    this.deleteTarget.set(null);
    this.announcementService.deleteAnnouncement(id).subscribe();
  }

  submitAnnouncement(): void {
    if (!this.canSubmit()) return;
    this.creating.set(true);
    this.createError.set(null);

    const request: CreateAnnouncementRequest = {
      courseId: this.selectedCourseId,
      title: this.formTitle.trim(),
      content: this.formContent.trim(),
      priority: this.formPriority,
      targetType: 'COURSE',
    };

    this.announcementService.createAnnouncement(request).subscribe({
      next: () => {
        this.creating.set(false);
        this.showCreateForm.set(false);
        this.formTitle = '';
        this.formContent = '';
        this.formPriority = 'NORMAL';
        this.selectedCourseId = '';
      },
      error: (err) => {
        this.creating.set(false);
        this.createError.set(err?.error?.message || err?.error?.error?.message || 'Không thể gửi thông báo.');
      },
    });
  }

  private loadCourses(): void {
    this.http
      .get<{ data?: { content?: CourseOption[] } }>('/api/v3/teacher/courses/my-courses?page=0&size=100')
      .subscribe({
        next: (res) => {
          const list = res?.data?.content ?? [];
          this.courses.set(list);
          const names = new Map<string, string>();
          for (const c of list) names.set(c.id, c.title);
          this.courseNameMap.set(names);

          const ids = list.map(c => c.id);
          if (ids.length > 0) {
            this.announcementService.getAnnouncements(undefined, ids).subscribe();
          }
        },
        error: () => this.courses.set([]),
      });
  }
}
