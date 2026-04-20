import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { CourseApi } from '../../../../../api/client/course.api';
import { CourseEditorStore } from '../../store/course-editor.store';
import { COURSE_REJECTION_CATEGORIES } from '../../../../admin/infrastructure/services/admin.service';

interface RejectionStatusPayload {
  status: string;
  reviewComment?: string;
  reviewedAt?: string;
  reviewedByName?: string;
  rejectionCategory?: string;
}

/**
 * Surfaces admin rejection feedback above every tab in the course-editor
 * layout. Teachers deep-linking into /curriculum, /classes, /settings
 * would otherwise miss the reason why their course came back.
 *
 * Dismiss state is persisted per (userId+courseId+reviewedAt) in
 * sessionStorage so re-opening the same review session won't nag,
 * but a NEW rejection (different reviewedAt) reappears automatically.
 */
@Component({
  selector: 'app-course-rejection-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (show()) {
      <section class="banner" role="alert" aria-labelledby="rejection-banner-title">
        <div class="icon" aria-hidden="true">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"/>
          </svg>
        </div>
        <div class="body">
          <h2 id="rejection-banner-title" class="title">
            {{ status()?.status === 'CHANGES_REQUESTED' ? 'Admin yêu cầu chỉnh sửa' : 'Khóa học bị từ chối' }}
          </h2>
          @if (categoryLabel()) {
            <p class="category">
              <span class="category-label">Lý do:</span>
              {{ categoryLabel() }}
            </p>
          }
          @if (status()?.reviewComment) {
            <p class="comment">{{ status()?.reviewComment }}</p>
          }
          <p class="meta">
            @if (status()?.reviewedByName) {
              <span>Người duyệt: {{ status()?.reviewedByName }}</span>
            }
            @if (reviewedAtText()) {
              <span>&middot; {{ reviewedAtText() }}</span>
            }
          </p>
          <p class="hint">Sau khi chỉnh sửa xong, quay lại trang "Tất cả khóa học" để gửi duyệt lại.</p>
        </div>
        <button type="button" class="dismiss" (click)="dismiss()" aria-label="Đóng thông báo">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </section>
    }
  `,
  styles: [`
    :host { display: block; }

    .banner {
      display: flex;
      gap: 0.875rem;
      padding: 0.875rem 1.125rem;
      background: #fef2f2;
      border-bottom: 1px solid #fecaca;
      border-left: 4px solid #dc2626;
      color: #7f1d1d;
    }

    .icon {
      flex: 0 0 auto;
      width: 32px;
      height: 32px;
      border-radius: 999px;
      background: #fee2e2;
      color: #dc2626;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .title {
      margin: 0;
      font-size: 0.9375rem;
      font-weight: 600;
      color: #7f1d1d;
    }

    .category { margin: 0; font-size: 0.8125rem; color: #991b1b; }
    .category-label { font-weight: 600; margin-right: 0.25rem; }

    .comment {
      margin: 0.125rem 0 0;
      font-size: 0.875rem;
      color: #374151;
      line-height: 1.55;
      white-space: pre-line;
    }

    .meta {
      margin: 0.125rem 0 0;
      font-size: 0.75rem;
      color: #6b7280;
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }

    .hint {
      margin: 0.125rem 0 0;
      font-size: 0.75rem;
      color: #991b1b;
      font-style: italic;
    }

    .dismiss {
      flex: 0 0 auto;
      background: transparent;
      border: none;
      color: #991b1b;
      cursor: pointer;
      width: 28px;
      height: 28px;
      border-radius: 0.375rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s ease;
    }

    .dismiss:hover { background: #fecaca; }
    .dismiss:focus-visible { outline: 2px solid #dc2626; outline-offset: 2px; }
  `]
})
export class CourseRejectionBannerComponent {
  private readonly store = inject(CourseEditorStore);
  private readonly courseApi = inject(CourseApi);

  private readonly DISMISS_KEY_PREFIX = 'lms:rejection-dismissed:';

  readonly status = signal<RejectionStatusPayload | null>(null);
  readonly dismissed = signal(false);

  readonly show = computed(() => {
    const s = this.status();
    if (!s) return false;
    if (s.status !== 'REJECTED' && s.status !== 'CHANGES_REQUESTED') return false;
    return !this.dismissed();
  });

  readonly categoryLabel = computed(() => {
    const code = this.status()?.rejectionCategory;
    if (!code) return '';
    return COURSE_REJECTION_CATEGORIES.find(o => o.value === code)?.label ?? '';
  });

  readonly reviewedAtText = computed(() => {
    const at = this.status()?.reviewedAt;
    if (!at) return '';
    try { return new Date(at).toLocaleString('vi-VN'); } catch { return ''; }
  });

  // Use a dedicated computed for the id so the fetch effect only fires
  // when the courseId actually changes (not on every courseTree mutation).
  private readonly courseId = computed(() => this.store.courseTree()?.id ?? null);

  constructor() {
    effect(() => {
      const id = this.courseId();
      if (!id) {
        untracked(() => {
          this.status.set(null);
          this.dismissed.set(false);
        });
        return;
      }
      untracked(() => this.loadStatus(id));
    });
  }

  private loadStatus(courseId: string) {
    this.courseApi.getReviewStatus(courseId).subscribe({
      next: (res: any) => {
        const data: RejectionStatusPayload | undefined = res?.data;
        if (data && (data.status === 'REJECTED' || data.status === 'CHANGES_REQUESTED')) {
          this.status.set(data);
          this.dismissed.set(this.isAlreadyDismissed(courseId, data.reviewedAt));
        } else {
          this.status.set(null);
          this.dismissed.set(false);
        }
      },
      error: () => { /* silent: don't block editor rendering on a non-critical fetch */ },
    });
  }

  dismiss() {
    const courseId = this.store.courseTree()?.id;
    const reviewedAt = this.status()?.reviewedAt;
    if (courseId && reviewedAt) {
      this.persistDismissal(courseId, reviewedAt);
    }
    this.dismissed.set(true);
  }

  private isAlreadyDismissed(courseId: string, reviewedAt?: string): boolean {
    if (!reviewedAt || typeof window === 'undefined') return false;
    try {
      return window.sessionStorage.getItem(this.dismissKey(courseId, reviewedAt)) === '1';
    } catch {
      return false;
    }
  }

  private persistDismissal(courseId: string, reviewedAt: string) {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(this.dismissKey(courseId, reviewedAt), '1');
    } catch {
      // Quota / private-browsing — fall back to in-memory only.
    }
  }

  private dismissKey(courseId: string, reviewedAt: string): string {
    return `${this.DISMISS_KEY_PREFIX}${courseId}:${reviewedAt}`;
  }
}
