import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AnnouncementService, CreateAnnouncementRequest } from '../../../core/services/announcement.service';

@Component({
  selector: 'app-create-announcement',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" (click)="onCancel()">
      <div class="w-full max-w-lg rounded-lg bg-white shadow-xl" (click)="$event.stopPropagation()">
        <div class="border-b border-slate-200 px-6 py-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-bold text-slate-900">Gửi thông báo</h2>
            <button type="button" (click)="onCancel()"
              class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        <div class="px-6 py-4 space-y-4">
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Tiêu đề</label>
            <input
              type="text"
              [(ngModel)]="title"
              placeholder="Tiêu đề thông báo..."
              maxlength="200"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-[#0056D2] focus:ring-2 focus:ring-[#0056D2]" />
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Nội dung</label>
            <textarea
              [(ngModel)]="content"
              placeholder="Nội dung thông báo..."
              rows="5"
              maxlength="10000"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-[#0056D2] focus:ring-2 focus:ring-[#0056D2]"></textarea>
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Mức độ</label>
            <select
              [(ngModel)]="priority"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-[#0056D2] focus:ring-2 focus:ring-[#0056D2]">
              <option value="NORMAL">Bình thường</option>
              <option value="IMPORTANT">Quan trọng</option>
            </select>
          </div>

          @if (error()) {
            <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {{ error() }}
            </div>
          }
        </div>

        <div class="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            (click)="onCancel()"
            class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
            Hủy
          </button>
          <button
            type="button"
            (click)="onSubmit()"
            [disabled]="sending() || !title.trim() || !content.trim()"
            class="rounded-lg bg-[#0056D2] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#004BB5] disabled:opacity-50">
            @if (sending()) {
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
  `,
})
export class CreateAnnouncementComponent {
  private readonly announcementService = inject(AnnouncementService);

  readonly courseId = input.required<string>();
  readonly close = output<void>();
  readonly created = output<void>();

  title = '';
  content = '';
  priority = 'NORMAL';

  readonly sending = signal(false);
  readonly error = signal<string | null>(null);

  onCancel(): void {
    this.close.emit();
  }

  onSubmit(): void {
    if (!this.title.trim() || !this.content.trim()) return;

    this.sending.set(true);
    this.error.set(null);

    const request: CreateAnnouncementRequest = {
      courseId: this.courseId(),
      title: this.title.trim(),
      content: this.content.trim(),
      priority: this.priority,
      targetType: 'COURSE',
    };

    this.announcementService.createAnnouncement(request).subscribe({
      next: () => {
        this.sending.set(false);
        this.created.emit();
        this.close.emit();
      },
      error: (err) => {
        this.sending.set(false);
        this.error.set(
          err?.error?.message || err?.error?.error?.message || 'Không thể gửi thông báo. Vui lòng thử lại.'
        );
      },
    });
  }
}
