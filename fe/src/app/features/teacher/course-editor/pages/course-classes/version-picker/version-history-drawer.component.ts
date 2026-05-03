import { Component, ChangeDetectionStrategy, inject, input, output, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { SideDrawerComponent } from '../../../../../../shared/components/side-drawer/side-drawer.component';
import { ToastService } from '../../../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../../../core/services/confirm-dialog.service';
import { ClassService, PublicationSummary } from '../../../../../../state/class.service';

/**
 * Course-level version history + bulk adopt.
 * Pattern: GitHub releases page, Coursera Studio publication history.
 * - Timeline of all publications
 * - Per-row "Đẩy cho lớp đang mở" bulk action
 * - Shows pinned class count + auto-following count
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-version-history-drawer',
  imports: [CommonModule, SideDrawerComponent],
  template: `
    <app-side-drawer
        [isOpen]="isOpen()"
        title="Lịch sử phiên bản"
        subtitle="Tất cả bản phát hành của khoá học"
        width="600px"
        (onClose)="close()">

      <div class="space-y-4">

        @if (isLoading()) {
          <div class="py-12 text-center text-sm text-slate-400">
            <svg class="w-5 h-5 mx-auto mb-2 animate-spin text-[#0056D2]" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            Đang tải…
          </div>
        }

        @if (!isLoading() && publications().length === 0) {
          <div class="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
            <h3 class="text-sm font-semibold text-amber-900 mb-1">Chưa có bản phát hành</h3>
            <p class="text-xs text-amber-700 leading-relaxed">
              Bấm <strong>"Xuất bản"</strong> ở đầu trang chỉnh sửa khoá để gửi yêu cầu duyệt. Sau khi quản trị viên duyệt, hệ thống sẽ tạo bản v1.
            </p>
          </div>
        }

        @if (!isLoading() && publications().length > 0) {
          <!-- Summary stats -->
          <div class="grid grid-cols-3 gap-3 text-center">
            <div class="rounded-lg bg-slate-50 border border-slate-200 p-3">
              <div class="text-xl font-bold text-slate-900 tabular-nums">{{ publications().length }}</div>
              <div class="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">Phiên bản</div>
            </div>
            <div class="rounded-lg bg-blue-50 border border-blue-100 p-3">
              <div class="text-xl font-bold text-[#0056D2] tabular-nums">v{{ latestPublication()?.publicationNumber }}</div>
              <div class="text-[10px] text-[#0056D2] uppercase tracking-wide mt-0.5">Mới nhất</div>
            </div>
            <div class="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
              <div class="text-xl font-bold text-emerald-700 tabular-nums">{{ totalEffective() }}</div>
              <div class="text-[10px] text-emerald-700 uppercase tracking-wide mt-0.5">Lớp đang dùng</div>
            </div>
          </div>

          <!-- Timeline -->
          <div class="space-y-2">
            @for (pub of publications(); track pub.id; let idx = $index) {
              <article class="rounded-xl border p-4 transition-all"
                       [class.border-emerald-200]="pub.isLatest"
                       [class.bg-emerald-50/30]="pub.isLatest"
                       [class.border-slate-200]="!pub.isLatest">
                <header class="flex items-center gap-2 mb-2">
                  <span class="text-base font-bold text-slate-900 tabular-nums">v{{ pub.publicationNumber }}</span>
                  @if (pub.isLatest) {
                    <span class="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 rounded">Mới nhất</span>
                  }
                  <span class="ml-auto text-[11px] text-slate-400 tabular-nums">
                    {{ pub.publishedAt | date:'dd/MM/yyyy HH:mm' }}
                  </span>
                </header>

                @if (pub.publishedByName) {
                  <p class="text-[11px] text-slate-500 mb-2">Phát hành bởi {{ pub.publishedByName }}</p>
                }

                @if (pub.releaseNotes) {
                  <p class="text-xs text-slate-700 mb-3 leading-relaxed whitespace-pre-line">{{ pub.releaseNotes }}</p>
                } @else {
                  <p class="text-xs text-slate-400 italic mb-3">Không có ghi chú phát hành</p>
                }

                <footer class="flex items-center gap-3 pt-2 border-t border-slate-100">
                  <div class="flex-1 text-[11px] text-slate-500">
                    <span class="font-semibold text-slate-700">{{ pub.pinnedClassCount }}</span> lớp ghim
                    @if (pub.isLatest && pub.effectiveClassCount > pub.pinnedClassCount) {
                      <span class="text-emerald-700"> + {{ pub.effectiveClassCount - pub.pinnedClassCount }} theo bản mới</span>
                    }
                  </div>
                  <button type="button"
                          (click)="bulkAdopt(pub)"
                          [disabled]="busyPubId() === pub.id"
                          class="px-3 py-1.5 text-[11px] font-semibold text-[#0056D2] hover:bg-[#0056D2]/10 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
                    @if (busyPubId() === pub.id) {
                      <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                    }
                    Đẩy cho tất cả lớp đang mở
                  </button>
                </footer>
              </article>
            }
          </div>
        }
      </div>

      <div footer class="flex justify-end">
        <button (click)="close()"
                class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
          Đóng
        </button>
      </div>
    </app-side-drawer>
  `
})
export class VersionHistoryDrawerComponent {
  private classService = inject(ClassService);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);

  isOpen = input.required<boolean>();
  courseId = input.required<string>();

  readonly closeRequested = output<void>();
  readonly bulkAdopted = output<void>();

  publications = signal<PublicationSummary[]>([]);
  isLoading = signal(false);
  busyPubId = signal<string | null>(null);

  latestPublication = computed(() => this.publications().find(p => p.isLatest) ?? null);
  totalEffective = computed(() => {
    return this.publications().reduce((sum, p) => sum + p.effectiveClassCount, 0);
  });

  constructor() {
    effect(() => {
      if (this.isOpen() && this.courseId()) {
        this.load();
      }
    });
  }

  private load() {
    this.isLoading.set(true);
    this.classService.listPublications(this.courseId()).subscribe({
      next: (pubs) => {
        this.publications.set(pubs);
        this.isLoading.set(false);
      },
      error: () => {
        this.publications.set([]);
        this.isLoading.set(false);
        this.toast.error('Không thể tải lịch sử phiên bản');
      }
    });
  }

  async bulkAdopt(pub: PublicationSummary) {
    const confirmed = await this.confirmDialog.confirm({
      title: `Đẩy v${pub.publicationNumber} cho tất cả lớp đang mở?`,
      message: `Tất cả lớp có trạng thái "Đang mở" sẽ được ghim vào phiên bản v${pub.publicationNumber}. Lớp đã đóng sẽ không bị ảnh hưởng.\n\nHọc viên trong các lớp này sẽ thấy nội dung của bản v${pub.publicationNumber}.`,
      variant: 'info',
      confirmText: 'Đẩy phiên bản',
      cancelText: 'Huỷ'
    });
    if (!confirmed) return;

    this.busyPubId.set(pub.id);
    try {
      const result = await firstValueFrom(this.classService.bulkAdoptPublication(this.courseId(), pub.id, 'OPEN_ONLY'));
      const skipped = result?.skippedClassNames?.length ?? 0;
      const skipNote = skipped > 0 ? ` (bỏ qua ${skipped} lớp đã ghim sẵn)` : '';
      this.toast.success(`Đã đẩy v${pub.publicationNumber} cho ${result?.affectedClassCount ?? 0} lớp${skipNote}`);
      this.bulkAdopted.emit();
      this.load();
    } catch (err: any) {
      this.toast.error('Đẩy phiên bản thất bại: ' + (err?.error?.message || err?.message || 'Lỗi không xác định'));
    } finally {
      this.busyPubId.set(null);
    }
  }

  close() {
    this.closeRequested.emit();
  }
}
