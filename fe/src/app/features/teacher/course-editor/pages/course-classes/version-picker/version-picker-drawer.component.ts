import { Component, ChangeDetectionStrategy, inject, input, output, signal, effect, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, firstValueFrom } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { SideDrawerComponent } from '../../../../../../shared/components/side-drawer/side-drawer.component';
import { ToastService } from '../../../../../../core/services/toast.service';
import { ClassService, PublicationSummary } from '../../../../../../state/class.service';

type Mode = 'FOLLOW_LATEST' | 'PINNED';

/**
 * Per-class version picker.
 * Pattern: Coursera Studio "Set Active Version", edX Studio version selector.
 * - Radio: Theo bản mới nhất (auto-follow) vs Ghim cụ thể (Pinned)
 * - Show release notes per version
 * - Bulk action button for "Đẩy phiên bản này cho tất cả lớp đang mở"
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-version-picker-drawer',
  imports: [CommonModule, SideDrawerComponent],
  template: `
    <app-side-drawer
        [isOpen]="isOpen()"
        title="Phiên bản khoá học"
        [subtitle]="className() || 'Chọn nội dung học viên thấy trong lớp này'"
        width="520px"
        (onClose)="close()">

      <div class="space-y-5">

        <!-- Loading -->
        @if (isLoading()) {
          <div class="py-12 text-center text-sm text-slate-400">
            <svg class="w-5 h-5 mx-auto mb-2 animate-spin text-[#0056D2]" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            Đang tải phiên bản…
          </div>
        }

        <!-- Empty: no publications -->
        @if (!isLoading() && publications().length === 0) {
          <div class="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <h3 class="text-sm font-semibold text-amber-900 mb-1">Khoá học chưa có phiên bản nào</h3>
            <p class="text-xs text-amber-700 leading-relaxed">
              Bấm <strong>"Xuất bản"</strong> ở đầu trang để gửi khoá học cho quản trị viên duyệt. Sau khi duyệt, hệ thống sẽ tạo phiên bản đầu tiên (v1) và học viên trong lớp này sẽ thấy nội dung.
            </p>
          </div>
        }

        @if (!isLoading() && publications().length > 0) {
          <!-- Mode selector -->
          <fieldset class="space-y-2" role="radiogroup" aria-labelledby="vpd-mode-legend">
            <legend id="vpd-mode-legend" class="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Chế độ phiên bản</legend>

            <!-- FOLLOW_LATEST -->
            <label class="block rounded-xl border-2 p-4 cursor-pointer transition-all"
                   [class.border-[#0056D2]]="selectedMode() === 'FOLLOW_LATEST'"
                   [class.bg-[#0056D2]/5]="selectedMode() === 'FOLLOW_LATEST'"
                   [class.border-slate-200]="selectedMode() !== 'FOLLOW_LATEST'"
                   [class.hover:border-slate-300]="selectedMode() !== 'FOLLOW_LATEST'">
              <div class="flex items-start gap-3">
                <input type="radio" name="mode" value="FOLLOW_LATEST"
                       id="vpd-mode-follow"
                       [checked]="selectedMode() === 'FOLLOW_LATEST'"
                       (change)="selectedMode.set('FOLLOW_LATEST')"
                       aria-describedby="vpd-mode-follow-desc"
                       class="mt-0.5 w-4 h-4 text-[#0056D2] focus:ring-[#0056D2]">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-semibold text-slate-900">Theo bản mới nhất</span>
                    <span class="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">Khuyên dùng</span>
                  </div>
                  <p id="vpd-mode-follow-desc" class="text-xs text-slate-500 mt-1 leading-relaxed">
                    Lớp luôn hiển thị bản phát hành mới nhất. Phù hợp với lớp mới mở hoặc khoá học đang phát triển. Hiện tại: <strong>v{{ latestPublication()?.publicationNumber }}</strong>.
                  </p>
                </div>
              </div>
            </label>

            <!-- PINNED -->
            <label class="block rounded-xl border-2 p-4 cursor-pointer transition-all"
                   [class.border-[#0056D2]]="selectedMode() === 'PINNED'"
                   [class.bg-[#0056D2]/5]="selectedMode() === 'PINNED'"
                   [class.border-slate-200]="selectedMode() !== 'PINNED'"
                   [class.hover:border-slate-300]="selectedMode() !== 'PINNED'">
              <div class="flex items-start gap-3">
                <input type="radio" name="mode" value="PINNED"
                       id="vpd-mode-pinned"
                       [checked]="selectedMode() === 'PINNED'"
                       (change)="selectedMode.set('PINNED')"
                       aria-describedby="vpd-mode-pinned-desc"
                       class="mt-0.5 w-4 h-4 text-[#0056D2] focus:ring-[#0056D2]">
                <div class="flex-1 min-w-0">
                  <span class="text-sm font-semibold text-slate-900">Ghim phiên bản cụ thể</span>
                  <p id="vpd-mode-pinned-desc" class="text-xs text-slate-500 mt-1 leading-relaxed">
                    Khoá lớp vào một bản nhất định. Phù hợp khi học viên đang học giữa kỳ — bản mới sẽ không tự đẩy vào lớp này.
                  </p>
                </div>
              </div>
            </label>
          </fieldset>

          <!-- Version list (only when PINNED) -->
          @if (selectedMode() === 'PINNED') {
            <div>
              <h3 class="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Chọn phiên bản</h3>
              <div class="space-y-2 max-h-72 overflow-y-auto pr-1">
                @for (pub of publications(); track pub.id) {
                  <button type="button"
                          (click)="selectedPublicationId.set(pub.id)"
                          class="w-full text-left rounded-xl border p-3 transition-all"
                          [class.border-[#0056D2]]="selectedPublicationId() === pub.id"
                          [class.bg-[#0056D2]/5]="selectedPublicationId() === pub.id"
                          [class.border-slate-200]="selectedPublicationId() !== pub.id"
                          [class.hover:border-slate-300]="selectedPublicationId() !== pub.id">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-sm font-bold text-slate-900 tabular-nums">v{{ pub.publicationNumber }}</span>
                      @if (pub.isLatest) {
                        <span class="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">Mới nhất</span>
                      }
                      @if (pub.id === currentPublicationId()) {
                        <span class="px-1.5 py-0.5 text-[9px] font-bold bg-[#0056D2]/10 text-[#0056D2] border border-[#0056D2]/30 rounded">Đang dùng</span>
                      }
                      <span class="ml-auto text-[10px] text-slate-400 tabular-nums">
                        {{ pub.publishedAt | date:'dd/MM/yyyy HH:mm' }}
                      </span>
                    </div>
                    @if (pub.publishedByName) {
                      <p class="text-[11px] text-slate-500">Phát hành bởi {{ pub.publishedByName }}</p>
                    }
                    @if (pub.releaseNotes) {
                      <p class="text-xs text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">{{ pub.releaseNotes }}</p>
                    }
                    <div class="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                      <span>{{ pub.pinnedClassCount }} lớp đang ghim</span>
                      @if (pub.isLatest && pub.effectiveClassCount > pub.pinnedClassCount) {
                        <span>+ {{ pub.effectiveClassCount - pub.pinnedClassCount }} lớp theo bản mới nhất</span>
                      }
                    </div>
                  </button>
                }
              </div>
            </div>
          }
        }
      </div>

      <!-- Footer -->
      <div footer class="flex items-center justify-end gap-2">
        <button (click)="close()"
                class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
          Huỷ
        </button>
        <button (click)="apply()"
                type="button"
                [disabled]="!canApply() || isSaving()"
                [attr.title]="disabledReason()"
                [attr.aria-disabled]="!canApply() || isSaving()"
                class="px-4 py-2 text-sm font-semibold bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
          @if (isSaving()) {
            <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          }
          Áp dụng
        </button>
      </div>
    </app-side-drawer>
  `
})
export class VersionPickerDrawerComponent {
  private classService = inject(ClassService);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  isOpen = input.required<boolean>();
  classId = input.required<string>();
  className = input<string | null>(null);
  courseId = input.required<string>();
  /** Publication currently pinned to this class — null means class is auto-following latest */
  currentPublicationId = input<string | null>(null);
  currentVersionMode = input<'PINNED' | 'FOLLOW_LATEST'>('PINNED');

  readonly closeRequested = output<void>();
  readonly saved = output<void>();

  publications = signal<PublicationSummary[]>([]);
  isLoading = signal(false);
  isSaving = signal(false);

  selectedMode = signal<Mode>('FOLLOW_LATEST');
  selectedPublicationId = signal<string | null>(null);

  latestPublication = computed(() => this.publications().find(p => p.isLatest) ?? null);

  canApply = computed(() => {
    if (this.selectedMode() === 'FOLLOW_LATEST') {
      return this.currentVersionMode() !== 'FOLLOW_LATEST' || this.currentPublicationId() !== null;
    }
    const pickedId = this.selectedPublicationId();
    return pickedId !== null && pickedId !== this.currentPublicationId();
  });

  /** Why disabled — surfaced in the button title attr so screen readers + hover hint match. */
  disabledReason = computed(() => {
    if (this.isSaving()) return 'Đang lưu thay đổi...';
    if (this.canApply()) return null;
    if (this.selectedMode() === 'FOLLOW_LATEST') {
      return 'Lớp đã ở chế độ theo bản mới nhất';
    }
    if (!this.selectedPublicationId()) {
      return 'Chọn một phiên bản trong danh sách';
    }
    return 'Lớp đã ghim ở phiên bản này';
  });

  /** Cancel any in-flight load when a new open arrives — prevents stale data overwriting fresh load. */
  private readonly loadTrigger$ = new Subject<string>();

  constructor() {
    this.loadTrigger$
      .pipe(
        switchMap(courseId => this.classService.listPublications(courseId)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: pubs => {
          this.publications.set(pubs);
          this.isLoading.set(false);
        },
        error: () => {
          this.publications.set([]);
          this.isLoading.set(false);
          this.toast.error('Không thể tải danh sách phiên bản');
        }
      });

    effect(() => {
      if (this.isOpen() && this.courseId()) {
        this.isLoading.set(true);
        this.loadTrigger$.next(this.courseId());
        // Seed selection from current pin state so opening shows what's actually applied.
        const currentPub = this.currentPublicationId();
        if (currentPub) {
          this.selectedMode.set('PINNED');
          this.selectedPublicationId.set(currentPub);
        } else {
          this.selectedMode.set('FOLLOW_LATEST');
          this.selectedPublicationId.set(null);
        }
      }
    });
  }

  async apply() {
    if (this.isSaving()) return;
    const mode = this.selectedMode();
    this.isSaving.set(true);

    try {
      if (mode === 'FOLLOW_LATEST') {
        const result = await firstValueFrom(this.classService.followLatestPublication(this.classId()));
        const msg = result?.publicationNumber
          ? `Lớp đã chuyển sang theo bản mới nhất (v${result.publicationNumber})`
          : 'Lớp sẽ theo bản mới nhất khi khoá phát hành';
        this.toast.success(msg);
      } else {
        const pubId = this.selectedPublicationId();
        if (!pubId) return;
        const pub = this.publications().find(p => p.id === pubId);
        const result = await firstValueFrom(this.classService.adoptPublication(this.classId(), pubId));
        this.toast.success(`Lớp đã ghim vào v${result?.publicationNumber ?? pub?.publicationNumber ?? '?'}`);
      }
      this.saved.emit();
      this.closeRequested.emit();
    } catch (err: any) {
      this.toast.error('Áp dụng thất bại: ' + (err?.error?.message || err?.message || 'Lỗi không xác định'));
    } finally {
      this.isSaving.set(false);
    }
  }

  close() {
    if (this.isSaving()) return;
    this.closeRequested.emit();
  }
}
