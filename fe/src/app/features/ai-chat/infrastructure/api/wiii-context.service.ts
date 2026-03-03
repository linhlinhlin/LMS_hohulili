/**
 * WiiiContextService — Sprint 221: Page-Aware AI Context
 *
 * Sends page context to the Wiii AI iframe via PostMessage on every
 * route change. The iframe (EmbedApp) stores this in page-context-store
 * and merges it into every AI chat request, so Wiii knows what page
 * the student is viewing.
 *
 * Architecture:
 *   Router NavigationEnd → extractPageContext(url) → postMessage('wiii:page-context')
 *
 * Phase 1: URL-based context (page_type, course_id, lesson_id)
 * Phase 2: Content enrichment via enrichContext() from page components
 * Phase 3: Real-time interaction tracking (scroll, time-on-page)
 */
import { Injectable, OnDestroy, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { PageDataExtractorService, type PageStructuredData } from './page-data-extractor.service';

/** Matches Wiii's PageContext Pydantic model (schemas.py) */
export interface WiiiPageContext {
  page_type: string;
  page_title?: string;
  course_id?: string;
  course_name?: string;
  lesson_id?: string;
  lesson_name?: string;
  chapter_name?: string;
  content_snippet?: string;
  content_type?: string;
  quiz_question?: string;
  quiz_options?: string[];
  assignment_description?: string;
}

@Injectable({ providedIn: 'root' })
export class WiiiContextService implements OnDestroy {
  private readonly router = inject(Router);
  private readonly pageDataExtractor = inject(PageDataExtractorService);

  private iframeEl: HTMLIFrameElement | null = null;
  private readonly embedOrigin: string | null;
  private routerSub?: Subscription;
  private lastContext: WiiiPageContext | null = null;

  constructor() {
    this.embedOrigin = this.resolveEmbedOrigin();
    this.startRouteTracking();
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.iframeEl = null;
  }

  /**
   * Connect the Wiii iframe for PostMessage delivery.
   * Called by ChatPanelComponent when iframe finishes loading.
   */
  connectIframe(iframe: HTMLIFrameElement): void {
    this.iframeEl = iframe;
    // Send cached context immediately so Wiii gets current page info
    if (this.lastContext) {
      this.sendContext(this.lastContext);
    }
  }

  /** Disconnect iframe (e.g., when ChatPanel is destroyed). */
  disconnectIframe(): void {
    this.iframeEl = null;
  }

  /**
   * Phase 2 API: Page components can enrich context with data not in URL.
   * E.g., CourseLearningComponent provides course_name and lesson content.
   *
   * Usage:
   *   this.contextService.enrichContext({
   *     course_name: 'Máy Tàu Biển',
   *     lesson_name: 'Áp suất khí quyển',
   *     content_snippet: 'Áp suất khí quyển là lực...',
   *   });
   */
  enrichContext(extra: Partial<WiiiPageContext>): void {
    if (this.lastContext) {
      this.lastContext = { ...this.lastContext, ...extra };
      this.sendContext(this.lastContext);
    }
  }

  // ── Private ──

  private startRouteTracking(): void {
    this.routerSub = this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe(event => {
      const ctx = this.extractPageContext(event.urlAfterRedirects);
      this.lastContext = ctx;
      this.sendContext(ctx);
    });

    // Cache initial context (sent when iframe connects via connectIframe)
    this.lastContext = this.extractPageContext(this.router.url);

    // Sprint 223: Listen for screenshot requests from Wiii iframe
    window.addEventListener('message', async (event: MessageEvent) => {
      if (
        event.data?.type === 'wiii:action-request' &&
        event.data?.action === 'capture_screenshot'
      ) {
        try {
          const selector = event.data.params?.selector || 'main';
          const el = document.querySelector(selector) as HTMLElement;
          if (!el) throw new Error('Target element not found');

          // Dynamic import html2canvas (lazy load — only fetched when needed)
          const { default: html2canvas } = await import('html2canvas');
          const canvas = await html2canvas(el, {
            scale: 1,
            useCORS: true,
            logging: false,
          });
          const image = canvas.toDataURL('image/jpeg', 0.7);

          (event.source as Window)?.postMessage(
            {
              type: 'wiii:action-response',
              id: event.data.id,
              result: { success: true, data: { image } },
            },
            '*',
          );
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Screenshot failed';
          (event.source as Window)?.postMessage(
            {
              type: 'wiii:action-response',
              id: event.data.id,
              result: { success: false, error: message },
            },
            '*',
          );
        }
      }
    });
  }

  /**
   * Extract page context from the current URL.
   * Matches LMS Angular route patterns to determine page type and extract IDs.
   */
  private extractPageContext(url: string): WiiiPageContext {
    const path = url.split('?')[0].split('#')[0];

    // ── Lesson page: /student/learn/course/:courseId/lesson/:lessonId ──
    const lessonMatch = path.match(/\/learn\/course\/([^\/]+)\/lesson\/([^\/]+)/);
    if (lessonMatch) {
      return {
        page_type: 'lesson',
        page_title: 'Bài học',
        course_id: lessonMatch[1],
        lesson_id: lessonMatch[2],
      };
    }

    // ── Course overview: /student/learn/course/:courseId ──
    const courseLearnMatch = path.match(/\/learn\/course\/([^\/]+)$/);
    if (courseLearnMatch) {
      return {
        page_type: 'course_overview',
        page_title: 'Tổng quan khóa học',
        course_id: courseLearnMatch[1],
      };
    }

    // ── Quiz: /student/quiz/take/:quizId ──
    const quizMatch = path.match(/\/quiz\/take\/([^\/]+)/);
    if (quizMatch) {
      return {
        page_type: 'quiz',
        page_title: 'Bài kiểm tra',
        content_type: 'quiz',
      };
    }

    // ── Course detail: /student/course/:id ──
    const courseDetailMatch = path.match(/\/student\/course\/([^\/]+)/);
    if (courseDetailMatch) {
      return {
        page_type: 'course_detail',
        page_title: 'Chi tiết khóa học',
        course_id: courseDetailMatch[1],
      };
    }

    // ── Assignment work: /student/assignments/:id/work ──
    if (path.match(/\/assignments\/[^\/]+\/work/)) {
      return { page_type: 'assignment', page_title: 'Làm bài tập' };
    }

    // ── Simple page types (no IDs) ──
    if (path.includes('/dashboard')) return { page_type: 'dashboard', page_title: 'Trang chủ' };
    if (path.includes('/grades')) return { page_type: 'grades', page_title: 'Bảng điểm' };
    if (path.includes('/my-courses')) return { page_type: 'course_list', page_title: 'Khóa học của tôi' };
    if (path.includes('/assignments')) return { page_type: 'assignment_list', page_title: 'Bài tập' };
    if (path.includes('/analytics')) return { page_type: 'analytics', page_title: 'Phân tích học tập' };
    if (path.includes('/profile')) return { page_type: 'profile', page_title: 'Hồ sơ' };
    if (path.includes('/browse')) return { page_type: 'browse', page_title: 'Khám phá khóa học' };
    if (path.includes('/messages')) return { page_type: 'messages', page_title: 'Tin nhắn' };
    if (path.includes('/certificates')) return { page_type: 'certificates', page_title: 'Chứng chỉ' };
    if (path.includes('/storage')) return { page_type: 'storage', page_title: 'Lưu trữ' };
    if (path.includes('/payments')) return { page_type: 'payments', page_title: 'Thanh toán' };

    // ── Teacher / Admin catch-all ──
    if (path.includes('/teacher')) return { page_type: 'teacher_page', page_title: 'Cổng giảng viên' };
    if (path.includes('/admin')) return { page_type: 'admin_page', page_title: 'Quản trị' };

    return { page_type: 'other', page_title: 'LMS' };
  }

  private sendContext(ctx: WiiiPageContext): void {
    if (!this.iframeEl || !this.embedOrigin) return;
    try {
      // Sprint 223: Extract structured page data for rich AI context
      const structured: PageStructuredData = this.pageDataExtractor.extract(ctx.page_type);

      this.iframeEl.contentWindow?.postMessage(
        {
          type: 'wiii:page-context',
          payload: {
            ...ctx,
            structured, // Sprint 223: rich page data
          },
        },
        this.embedOrigin,
      );
    } catch {
      // Iframe may not be ready — silently ignore
    }
  }

  private resolveEmbedOrigin(): string | null {
    try {
      return new URL(environment.wiiiEmbedUrl).origin;
    } catch {
      return null;
    }
  }
}
