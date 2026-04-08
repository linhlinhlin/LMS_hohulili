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
import { AuthService } from '../../../core/services/auth.service';

interface CourseOption {
  id: string;
  title: string;
}

@Component({
  selector: 'app-teacher-announcements',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-slate-50">
      <div class="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div class="mx-auto max-w-[1400px] px-4 sm:px-6 py-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 class="text-2xl font-bold text-slate-900">Thông báo</h1>
              <p class="mt-1 text-sm text-slate-500">Quản lý thông báo gửi tới sinh viên trong các khóa học</p>
            </div>
            <button
              type="button"
              (click)="showCreateForm.set(true)"
              class="rounded-lg bg-[#0056D2] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#004BB5]">
              Tạo thông báo
            </button>
          </div>
        </div>
      </div>

      <div class="mx-auto max-w-[1400px] px-4 sm:px-6 py-4">
        @if (loading()) {
          <div class="space-y-3">
            @for (i of [1, 2, 3]; track i) {
              <div class="rounded-lg border border-slate-200 bg-white p-4">
                <div class="mb-2 flex items-start justify-between">
                  <div class="h-4 w-48 animate-pulse rounded bg-slate-200"></div>
                  <div class="h-6 w-16 animate-pulse rounded bg-slate-100"></div>
                </div>
                <div class="mb-2 space-y-1">
                  <div class="h-3 w-full animate-pulse rounded bg-slate-100"></div>
                  <div class="h-3 w-3/4 animate-pulse rounded bg-slate-100"></div>
                </div>
                <div class="h-3 w-32 animate-pulse rounded bg-slate-100"></div>
              </div>
            }
          </div>
        } @else if (announcements().length === 0) {
          <div class="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center">
            <svg class="mx-auto mb-4 h-16 w-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
            </svg>
            <h3 class="mb-1 text-lg font-semibold text-slate-900">Chưa có thông báo nào</h3>
            <p class="mb-4 text-slate-500">Tạo thông báo đầu tiên để gửi tới sinh viên.</p>
            <button
              type="button"
              (click)="showCreateForm.set(true)"
              class="rounded-lg bg-[#0056D2] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#004BB5]">
              Tạo thông báo
            </button>
          </div>
        } @else {
          <div class="space-y-3">
            @for (announcement of announcements(); track announcement.id) {
              <div class="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300">
                <div class="mb-1 flex items-start justify-between gap-2">
                  <div class="flex items-center gap-2">
                    @if (announcement.priority === 'IMPORTANT') {
                      <span class="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Quan trọng
                      </span>
                    }
                    <h3 class="font-medium text-slate-900">{{ announcement.title }}</h3>
                  </div>
                  <button
                    type="button"
                    (click)="deleteAnnouncement(announcement.id)"
                    class="rounded-lg p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                    title="Xóa thông báo">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  </button>
                </div>
                <p class="mb-2 text-sm text-slate-600 line-clamp-2">{{ announcement.content }}</p>
                <div class="flex items-center gap-3 text-xs text-slate-400">
                  <span>{{ announcement.publishedAt | date:'dd/MM/yyyy HH:mm' }}</span>
                  <span class="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">{{ announcement.targetType }}</span>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Create Modal -->
      @if (showCreateForm()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" (click)="showCreateForm.set(false)">
          <div class="w-full max-w-lg rounded-lg bg-white shadow-xl" (click)="$event.stopPropagation()">
            <div class="border-b border-slate-200 px-6 py-4">
              <div class="flex items-center justify-between">
                <h2 class="text-lg font-bold text-slate-900">Tạo thông báo mới</h2>
                <button type="button" (click)="showCreateForm.set(false)"
                  class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>

            <div class="px-6 py-4 space-y-4">
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">Khóa học</label>
                <select
                  [(ngModel)]="selectedCourseId"
                  class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-[#0056D2] focus:ring-2 focus:ring-[#0056D2]">
                  <option value="">-- Chọn khóa học --</option>
                  @for (course of courses(); track course.id) {
                    <option [value]="course.id">{{ course.title }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">Tiêu đề</label>
                <input
                  type="text"
                  [(ngModel)]="formTitle"
                  placeholder="Tiêu đề thông báo..."
                  maxlength="200"
                  class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-[#0056D2] focus:ring-2 focus:ring-[#0056D2]" />
              </div>

              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">Nội dung</label>
                <textarea
                  [(ngModel)]="formContent"
                  placeholder="Nội dung thông báo..."
                  rows="5"
                  maxlength="10000"
                  class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-[#0056D2] focus:ring-2 focus:ring-[#0056D2]"></textarea>
              </div>

              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">Mức độ</label>
                <select
                  [(ngModel)]="formPriority"
                  class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-[#0056D2] focus:ring-2 focus:ring-[#0056D2]">
                  <option value="NORMAL">Bình thường</option>
                  <option value="IMPORTANT">Quan trọng</option>
                </select>
              </div>

              @if (createError()) {
                <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {{ createError() }}
                </div>
              }
            </div>

            <div class="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                (click)="showCreateForm.set(false)"
                class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
                Hủy
              </button>
              <button
                type="button"
                (click)="submitAnnouncement()"
                [disabled]="creating() || !selectedCourseId || !formTitle.trim() || !formContent.trim()"
                class="rounded-lg bg-[#0056D2] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#004BB5] disabled:opacity-50">
                @if (creating()) {
                  <span class="flex items-center gap-2">
                    <div class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Đang gửi...
                  </span>
                } @else {
                  Gửi thông báo
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class TeacherAnnouncementsComponent implements OnInit {
  private readonly announcementService = inject(AnnouncementService);
  private readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);

  readonly loading = this.announcementService.loading;
  readonly announcements = this.announcementService.announcements;
  readonly courses = signal<CourseOption[]>([]);
  readonly showCreateForm = signal(false);
  readonly creating = signal(false);
  readonly createError = signal<string | null>(null);

  selectedCourseId = '';
  formTitle = '';
  formContent = '';
  formPriority = 'NORMAL';

  ngOnInit(): void {
    this.loadAnnouncements();
    this.loadCourses();
  }

  deleteAnnouncement(id: string): void {
    if (!confirm('Bạn có chắc muốn xóa thông báo này?')) return;
    this.announcementService.deleteAnnouncement(id).subscribe();
  }

  submitAnnouncement(): void {
    if (!this.selectedCourseId || !this.formTitle.trim() || !this.formContent.trim()) return;

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
        this.createError.set(
          err?.error?.message || err?.error?.error?.message || 'Không thể gửi thông báo. Vui lòng thử lại.',
        );
      },
    });
  }

  private loadAnnouncements(): void {
    // Load all announcements created by this teacher
    this.announcementService.getAnnouncements().subscribe();
  }

  private loadCourses(): void {
    this.http
      .get<{ data?: { content?: CourseOption[] } }>('/api/v3/teacher/courses/my-courses?page=0&size=100')
      .subscribe({
        next: (res) => {
          this.courses.set(res?.data?.content ?? []);
        },
        error: () => {
          this.courses.set([]);
        },
      });
  }
}
