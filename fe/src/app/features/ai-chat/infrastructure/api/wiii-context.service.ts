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
import { Injectable, OnDestroy, PLATFORM_ID, effect, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpHeaders } from '@angular/common/http';
import { Router, NavigationEnd } from '@angular/router';
import { Subject, Subscription, filter, firstValueFrom } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { PageDataExtractorService, type PageStructuredData } from './page-data-extractor.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ChapterApi } from '../../../../api/client/chapter.api';
import { LessonApi } from '../../../../api/client/lesson.api';
import { SectionApi } from '../../../../api/client/section.api';
import { QuizApi } from '../../../../api/endpoints/quiz.api';
import { CourseEditorStore } from '../../../teacher/course-editor/store/course-editor.store';
import { CurriculumSelectionService } from '../../../teacher/course-editor/services/curriculum-selection.service';
import {
  POINTY_ACTION_CLICK,
  POINTY_ACTION_HIGHLIGHT,
  POINTY_ACTION_SCROLL_TO,
  POINTY_ACTION_SHOW_TOUR,
  describeTarget,
  hideCursor,
  hideSpotlight,
  moveCursorToRect,
  resolvePointySelector,
  runTour,
  showSpotlight,
  type ClickParams,
  type HighlightParams,
  type ScrollToParams,
  type ShowTourParams,
  type TourStep,
} from '../pointy';

/** AI course generation progress event (from Wiii → LMS) */
export interface CourseProgressEvent {
  courseId: string;
  phase: 'COURSE_CREATED' | 'OUTLINE_READY' | 'CHAPTER_GENERATED' | 'COMPLETED';
  chapterIndex?: number;
  totalChapters?: number;
  title?: string;
}

/** Matches Wiii's PageContext Pydantic model (schemas.py) */
export interface WiiiPageContext {
  page_type: string;
  page_title?: string;
  connector_id?: string;
  host_user_id?: string;
  host_workspace_id?: string;
  host_organization_id?: string;
  action?: string;
  user_role?: string;
  workflow_stage?: string;
  selection?: Record<string, unknown> | null;
  editable_scope?: Record<string, unknown> | null;
  entity_refs?: Array<Record<string, unknown>> | null;
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

export interface WiiiSidebarOpenDetail {
  action?: string;
  courseId?: string;
}

interface WiiiHostCapabilityTool {
  name: string;
  description: string;
  input_schema?: Record<string, unknown>;
  roles?: string[];
  permission?: string;
  required_permissions?: string[];
  requires_confirmation?: boolean;
  mutates_state?: boolean;
  surface?: string;
  result_schema?: Record<string, unknown>;
}

interface WiiiHostCapabilities {
  host_type: 'lms';
  host_name: string;
  connector_id?: string;
  host_workspace_id?: string;
  host_organization_id?: string;
  version: string;
  resources: string[];
  surfaces: string[];
  tools: WiiiHostCapabilityTool[];
}

const LMS_CONNECTOR_ID = 'maritime-lms';

export type OperatorPreviewKind = 'lesson_patch' | 'course_plan' | 'quiz_commit' | 'quiz_publish';

interface PendingOperatorPreview {
  kind: OperatorPreviewKind;
  token: string;
  createdAt: number;
  approvedAt?: number;
  approvalToken?: string;
  summary: string;
  payload: Record<string, unknown>;
}

export interface WiiiSourceReference {
  kind?: string;
  title?: string;
  label?: string;
  excerpt?: string;
  page?: number;
  page_start?: number;
  page_end?: number;
  chapter_index?: number;
  lesson_index?: number;
  block_id?: string;
}

export interface WiiiOperatorPreviewPanel {
  token: string;
  kind: OperatorPreviewKind;
  createdAt: number;
  summary: string;
  applyAction: string;
  targetLabel: string;
  changedFields: string[];
  sourceReferences: WiiiSourceReference[];
  data: Record<string, unknown>;
}

export interface WiiiOperatorApplyResult {
  token: string;
  kind: OperatorPreviewKind;
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

interface LessonPreviewBlock {
  id: string;
  type: string;
  label: string;
  excerpt: string;
}

interface LessonPreviewBlockDelta {
  index: number;
  status: 'added' | 'removed' | 'changed' | 'unchanged';
  before?: LessonPreviewBlock;
  after?: LessonPreviewBlock;
}

interface CoursePlanLesson {
  title: string;
  summary: string;
  activity?: string;
  quick_check?: string;
  duration_minutes?: number;
  source_references?: WiiiSourceReference[];
}

interface CoursePlanChapter {
  title: string;
  summary: string;
  learning_objectives: string[];
  lessons: CoursePlanLesson[];
  source_references?: WiiiSourceReference[];
}

interface NormalizedCoursePlan {
  title: string;
  description: string;
  audience?: string;
  duration?: string;
  chapters: CoursePlanChapter[];
  assessment_plan: string[];
  implementation_checklist: string[];
  source_document_title?: string;
}

@Injectable({ providedIn: 'root' })
export class WiiiContextService implements OnDestroy {
  private readonly router = inject(Router);
  private readonly pageDataExtractor = inject(PageDataExtractorService);
  private readonly authService = inject(AuthService);
  private readonly chapterApi = inject(ChapterApi);
  private readonly lessonApi = inject(LessonApi);
  private readonly sectionApi = inject(SectionApi);
  private readonly quizApi = inject(QuizApi);
  private readonly courseEditorStore = inject(CourseEditorStore);
  private readonly selectionService = inject(CurriculumSelectionService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private iframeEl: HTMLIFrameElement | null = null;
  private readonly embedOrigin: string | null;
  private routerSub?: Subscription;
  private lastContext: WiiiPageContext | null = null;
  private transientContextPatch: Partial<WiiiPageContext> | null = null;
  private readonly pendingOperatorPreviews = new Map<string, PendingOperatorPreview>();

  /** Observable for AI course generation progress events */
  readonly courseProgress$ = new Subject<CourseProgressEvent>();
  readonly operatorPreview$ = new Subject<WiiiOperatorPreviewPanel>();
  readonly operatorApplyResult$ = new Subject<WiiiOperatorApplyResult>();

  // Stored listener references for cleanup (Expert Fix 10)
  private screenshotListener: ((event: MessageEvent) => void) | null = null;
  private courseProgressListener: ((event: MessageEvent) => void) | null = null;

  constructor() {
    this.embedOrigin = this.resolveEmbedOrigin();
    this.startRouteTracking();
    effect(() => {
      this.selectionService.selectedChapterId();
      this.selectionService.selectedLessonId();
      this.selectionService.selectedSectionId();
      if (this.lastContext?.page_type === 'course_editor') {
        this.sendCapabilities();
        this.sendContext(this.lastContext);
      }
    });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.iframeEl = null;
    if (!this.isBrowser) {
      return;
    }
    if (this.screenshotListener) {
      window.removeEventListener('message', this.screenshotListener);
      this.screenshotListener = null;
    }
    if (this.courseProgressListener) {
      window.removeEventListener('message', this.courseProgressListener);
      this.courseProgressListener = null;
    }
  }

  /**
   * Connect the Wiii iframe for PostMessage delivery.
   * Called by ChatPanelComponent when iframe finishes loading.
   */
  connectIframe(iframe: HTMLIFrameElement): void {
    this.iframeEl = iframe;
    this.sendCapabilities();
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

  applySidebarIntent(detail?: WiiiSidebarOpenDetail | null): void {
    if (!detail) return;

    const patch: Partial<WiiiPageContext> = {};
    if (detail.action) patch.action = detail.action;
    if (detail.courseId) patch.course_id = detail.courseId;
    if (Object.keys(patch).length === 0) return;

    this.transientContextPatch = patch;
    if (this.lastContext) {
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
      this.sendCapabilities();
      this.sendContext(ctx);
    });

    // Cache initial context (sent when iframe connects via connectIframe)
    this.lastContext = this.extractPageContext(this.router.url);

    if (!this.isBrowser) {
      return;
    }

    // Sprint 234: Listen for operator action requests from Wiii iframe
    // Store reference for cleanup in ngOnDestroy (Expert Fix 10)
    this.screenshotListener = async (event: MessageEvent) => {
      if (this.embedOrigin && event.origin !== this.embedOrigin) return;
      if (this.iframeEl?.contentWindow && event.source !== this.iframeEl.contentWindow) return;
      if (event.data?.type !== 'wiii:action-request' || !event.data?.action) {
        return;
      }
      try {
        const result = await this.handleActionRequest(event.data.action, event.data.params || {});
        (event.source as Window)?.postMessage(
          {
            type: 'wiii:action-response',
            id: event.data.id,
            result,
          },
          this.embedOrigin ?? event.origin,
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Action failed';
        (event.source as Window)?.postMessage(
          {
            type: 'wiii:action-response',
            id: event.data.id,
            result: { success: false, error: message },
          },
          this.embedOrigin ?? event.origin,
        );
      }
    };
    window.addEventListener('message', this.screenshotListener);

    // AI Course Generation: Listen for progress events from Wiii iframe
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    this.courseProgressListener = (event: MessageEvent) => {
      if (this.embedOrigin && event.origin !== this.embedOrigin) return;
      if (event.data?.type !== 'wiii:course-progress') return;

      const payload = event.data.payload as CourseProgressEvent;
      if (!payload?.courseId || !uuidRegex.test(payload.courseId)) return;

      if (payload.phase === 'COURSE_CREATED') {
        this.router.navigate(['/teacher/courses', payload.courseId, 'editor', 'curriculum']);
      }

      this.courseProgress$.next(payload);
    };
    window.addEventListener('message', this.courseProgressListener);
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

    // ── Quiz result: /student/quiz/result ──
    if (path.match(/\/quiz\/result$/)) {
      return {
        page_type: 'quiz',
        page_title: 'Kết quả bài kiểm tra',
        content_type: 'quiz_result',
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
    if (path.match(/\/student\/(?:tasks|assignments)\/[^\/]+\/work/)) {
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

    // ── Course Editor: /teacher/courses/:courseId/editor/* ──
    const courseEditorMatch = path.match(/\/teacher\/courses\/([^\/]+)\/editor\/(curriculum|info|settings|classes)/);
    if (courseEditorMatch) {
      return {
        page_type: 'course_editor',
        page_title: 'Trình soạn khóa học',
        course_id: courseEditorMatch[1],
      };
    }

    // ── Teacher course creation wizard: /teacher/course-creation ──
    if (path.match(/\/teacher\/course-creation$/)) {
      return {
        page_type: 'teacher_course_creation',
        page_title: 'Tạo khóa học mới',
        workflow_stage: 'authoring',
      };
    }

    // ── Teacher / Admin catch-all ──
    if (path.includes('/teacher')) return { page_type: 'teacher_page', page_title: 'Cổng giảng viên' };
    if (path.includes('/admin')) return { page_type: 'admin_page', page_title: 'Quản trị' };

    return { page_type: 'other', page_title: 'LMS' };
  }

  private resolveCurrentUserRole(): 'student' | 'teacher' | 'admin' {
    const role = String(this.authService.currentUser()?.role || 'student').toLowerCase();
    if (role === 'admin') return 'admin';
    if (role === 'teacher' || role === 'instructor') return 'teacher';
    return 'student';
  }

  private inferWorkflowStage(pageType: string): string {
    if (pageType === 'course_editor') return 'authoring';
    if (pageType === 'quiz' || pageType === 'exam') return 'assessment';
    if (pageType === 'analytics' || pageType === 'grades') return 'analytics';
    if (pageType === 'admin_page') return 'governance';
    return 'learning';
  }

  private buildEditableScope(ctx: WiiiPageContext): Record<string, unknown> | null {
    if (ctx.page_type !== 'course_editor' || !ctx.course_id) {
      return null;
    }
    return {
      type: 'course',
      id: ctx.course_id,
      allowed_operations: ['outline', 'lesson_content', 'lesson_design', 'quiz', 'preview'],
      requires_confirmation: true,
    };
  }

  private buildSelection(): Record<string, unknown> | null {
    const selectedSection = this.selectionService.selectedSection();
    if (selectedSection) {
      return { type: 'section', id: selectedSection.id, label: selectedSection.title };
    }

    const selectedLesson = this.selectionService.selectedLesson();
    if (selectedLesson) {
      return { type: 'lesson', id: selectedLesson.id, label: selectedLesson.title };
    }

    const selectedChapter = this.selectionService.selectedChapter();
    if (selectedChapter) {
      return { type: 'chapter', id: selectedChapter.id, label: selectedChapter.title };
    }

    return null;
  }

  private buildEntityRefs(ctx: WiiiPageContext): Array<Record<string, unknown>> | null {
    const refs: Array<Record<string, unknown>> = [];
    if (ctx.course_id) {
      refs.push({ type: 'course', id: ctx.course_id, title: ctx.course_name || ctx.page_title || 'Khóa học hiện tại' });
    }
    if (ctx.lesson_id) {
      refs.push({ type: 'lesson', id: ctx.lesson_id, title: ctx.lesson_name || 'Bài học hiện tại' });
    }
    const selectedChapter = this.selectionService.selectedChapter();
    if (selectedChapter) {
      refs.push({ type: 'chapter', id: selectedChapter.id, title: selectedChapter.title || 'Current chapter' });
    }
    const selectedLesson = this.selectionService.selectedLesson();
    if (selectedLesson) {
      refs.push({ type: 'lesson', id: selectedLesson.id, title: selectedLesson.title || 'Current lesson' });
    }
    const selectedSection = this.selectionService.selectedSection();
    if (selectedSection) {
      refs.push({ type: 'section', id: selectedSection.id, title: selectedSection.title || 'Current section' });
    }
    const deduped = refs.filter((ref, index) => {
      const key = `${String(ref['type'] || '')}:${String(ref['id'] || '')}`;
      return refs.findIndex((item) => `${String(item['type'] || '')}:${String(item['id'] || '')}` === key) === index;
    });
    return deduped.length > 0 ? deduped : null;
  }

  private decorateContext(ctx: WiiiPageContext): WiiiPageContext {
    const hostIdentity = this.buildHostIdentityOverlay();
    return {
      ...ctx,
      ...hostIdentity,
      user_role: ctx.user_role || this.resolveCurrentUserRole(),
      workflow_stage: ctx.workflow_stage || this.inferWorkflowStage(ctx.page_type),
      selection: ctx.selection ?? this.buildSelection(),
      editable_scope: ctx.editable_scope ?? this.buildEditableScope(ctx),
      entity_refs: ctx.entity_refs ?? this.buildEntityRefs(ctx),
    };
  }

  private buildCapabilities(ctx: WiiiPageContext): WiiiHostCapabilities {
    const role = this.resolveCurrentUserRole();
    const courseId = String(ctx.course_id || '');
    const selectedLessonId = this.resolveCurrentLessonId({ lesson_id: ctx.lesson_id });
    const hostIdentity = this.buildHostIdentityOverlay();
    const tools: WiiiHostCapabilityTool[] = [
      {
        name: 'navigation.go_to',
        input_schema: {
          type: 'object',
          properties: {
            target: { type: 'string' },
            route: { type: 'string' },
            url: { type: 'string' },
          },
        },
        requires_confirmation: false,
        mutates_state: false,
        permission: 'use:tools',
        description: 'Đi tới một route trong LMS.',
        roles: ['student', 'teacher', 'admin'],
        surface: 'host_navigation',
        result_schema: { type: 'object', properties: { navigated: { type: 'boolean' } } },
      },
      {
        name: 'capture_screenshot',
        input_schema: {
          type: 'object',
          properties: {
            selector: { type: 'string' },
          },
        },
        requires_confirmation: false,
        mutates_state: false,
        permission: 'use:tools',
        description: 'Chụp ảnh phần trang hiện tại để Wiii xem layout hoặc lesson UI.',
        roles: ['student', 'teacher', 'admin'],
        surface: 'host_page',
        result_schema: { type: 'object', properties: { image: { type: 'string' } } },
      },
      // Wiii Pointy V1.1 — tutor-safe primitives. Safe-click only works on
      // host-marked navigation-like targets and remains fail-closed.
      // Vendored handlers in `../pointy/`. Quiz answer options must NOT be highlighted
      // (pedagogical guardrail enforced server-side via `lms-pointy-tutor` skill).
      {
        name: POINTY_ACTION_HIGHLIGHT,
        input_schema: {
          type: 'object',
          properties: {
            selector: { type: 'string' },
            message: { type: 'string' },
            duration_ms: { type: 'number' },
          },
          required: ['selector'],
        },
        requires_confirmation: false,
        mutates_state: false,
        permission: 'use:tools',
        description:
          'Trỏ và làm nổi bật một phần tử trên trang để hướng dẫn người dùng. Không tự click — chỉ chỉ đường.',
        roles: ['student', 'teacher', 'admin'],
        surface: 'host_page',
        result_schema: { type: 'object', properties: { summary: { type: 'string' } } },
      },
      {
        name: POINTY_ACTION_SCROLL_TO,
        input_schema: {
          type: 'object',
          properties: {
            selector: { type: 'string' },
            block: { type: 'string' },
          },
          required: ['selector'],
        },
        requires_confirmation: false,
        mutates_state: false,
        permission: 'use:tools',
        description: 'Cuộn trang đến một phần tử cụ thể.',
        roles: ['student', 'teacher', 'admin'],
        surface: 'host_page',
        result_schema: { type: 'object', properties: { summary: { type: 'string' } } },
      },
      {
        name: POINTY_ACTION_SHOW_TOUR,
        input_schema: {
          type: 'object',
          properties: {
            steps: { type: 'array' },
            start_at: { type: 'number' },
          },
          required: ['steps'],
        },
        requires_confirmation: false,
        mutates_state: false,
        permission: 'use:tools',
        description: 'Chạy hướng dẫn nhiều bước; mỗi bước trỏ + highlight một element kèm tooltip.',
        roles: ['student', 'teacher', 'admin'],
        surface: 'host_page',
        result_schema: {
          type: 'object',
          properties: {
            completed_steps: { type: 'number' },
            total_steps: { type: 'number' },
          },
        },
      },
      {
        name: POINTY_ACTION_CLICK,
        input_schema: {
          type: 'object',
          properties: {
            selector: { type: 'string' },
            message: { type: 'string' },
          },
          required: ['selector'],
        },
        requires_confirmation: false,
        mutates_state: false,
        permission: 'use:tools',
        description:
          'Bấm một mục điều hướng an toàn đã được LMS đánh dấu data-wiii-click-safe="true". Từ chối mặc định với submit, delete, publish, enroll, grade, payment.',
        roles: ['student', 'teacher', 'admin'],
        surface: 'host_page',
        result_schema: {
          type: 'object',
          properties: {
            clicked: { type: 'boolean' },
            click_kind: { type: 'string' },
          },
        },
      },
    ];

    if (role !== 'student' && ctx.page_type === 'course_editor' && courseId) {
      tools.push(
        {
          name: 'navigation.open_course_editor_tab',
          input_schema: {
            type: 'object',
            properties: {
              tab: { type: 'string' },
            },
          },
          requires_confirmation: false,
          mutates_state: false,
          permission: 'manage:courses',
          description: 'Mở đúng tab trong Course Editor hiện tại.',
          roles: ['teacher', 'admin'],
          surface: 'editor_shell',
          result_schema: { type: 'object', properties: { tab: { type: 'string' } } },
        },
        {
          name: 'authoring.generate_course_from_document',
          input_schema: {
            type: 'object',
            properties: {
              course_id: { type: 'string' },
              action: { type: 'string' },
              title: { type: 'string' },
              summary: { type: 'string' },
              course_plan: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  chapters: { type: 'array', items: { type: 'object' } },
                },
              },
              source_references: { type: 'array', items: { type: 'object' } },
            },
          },
          requires_confirmation: false,
          mutates_state: false,
          permission: 'manage:courses',
          description: 'Tạo bản xem trước cây khóa học/chương/bài từ tài liệu upload. Chỉ preview, chưa ghi LMS cho tới khi giáo viên bấm Áp dụng.',
          roles: ['teacher', 'admin'],
          surface: 'preview_panel',
          result_schema: {
            type: 'object',
            properties: {
              preview_token: { type: 'string' },
              preview_kind: { type: 'string' },
              summary: { type: 'string' },
            },
          },
        },
        {
          name: 'authoring.apply_course_plan',
          input_schema: {
            type: 'object',
            properties: {
              preview_token: { type: 'string' },
              approval_token: { type: 'string' },
            },
            required: ['preview_token', 'approval_token'],
          },
          requires_confirmation: true,
          mutates_state: true,
          permission: 'manage:courses',
          description: 'Tạo các chương/bài draft từ bản xem trước course_plan sau khi giáo viên xác nhận trong LMS.',
          roles: ['teacher', 'admin'],
          surface: 'editor_shell',
          result_schema: {
            type: 'object',
            properties: {
              applied: { type: 'boolean' },
              course_id: { type: 'string' },
              chapters_created: { type: 'number' },
              lessons_created: { type: 'number' },
            },
          },
        },
        {
          name: 'authoring.generate_lesson',
          input_schema: {
            type: 'object',
            properties: {
              course_id: { type: 'string' },
              action: { type: 'string' },
            },
          },
          requires_confirmation: false,
          mutates_state: false,
          permission: 'manage:courses',
          description: 'Mở Wiii với ngữ cảnh authoring để tạo hoặc mở rộng lesson hiện tại.',
          roles: ['teacher', 'admin'],
          surface: 'ai_sidebar',
          result_schema: { type: 'object', properties: { opened: { type: 'boolean' } } },
        },
        {
          name: 'authoring.improve_lesson_experience',
          input_schema: {
            type: 'object',
            properties: {
              course_id: { type: 'string' },
              action: { type: 'string' },
            },
          },
          requires_confirmation: false,
          mutates_state: false,
          permission: 'manage:courses',
          description: 'Mở Wiii ở chế độ chỉnh trải nghiệm lesson, visual, motion, và flow.',
          roles: ['teacher', 'admin'],
          surface: 'ai_sidebar',
          result_schema: { type: 'object', properties: { opened: { type: 'boolean' } } },
        },
        {
          name: 'assessment.create_quiz',
          input_schema: {
            type: 'object',
            properties: {
              course_id: { type: 'string' },
              action: { type: 'string' },
            },
          },
          requires_confirmation: false,
          mutates_state: false,
          permission: 'manage:courses',
          description: 'Mở Wiii để soạn quiz hoặc practice set cho khóa học hiện tại.',
          roles: ['teacher', 'admin'],
          surface: 'ai_sidebar',
          result_schema: { type: 'object', properties: { opened: { type: 'boolean' } } },
        },
      );

      if (selectedLessonId) {
        tools.push(
          {
            name: 'authoring.preview_lesson_patch',
            input_schema: {
              type: 'object',
              properties: {
                lesson_id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                content: { type: 'string' },
                source_references: { type: 'array', items: { type: 'object' } },
              },
            },
            requires_confirmation: false,
            mutates_state: false,
            permission: 'manage:courses',
            description: 'Prepare a preview for lesson updates before any LMS write happens.',
            roles: ['teacher', 'admin'],
            surface: 'preview_panel',
            result_schema: { type: 'object', properties: { preview_token: { type: 'string' }, summary: { type: 'string' } } },
          },
          {
            name: 'authoring.apply_lesson_patch',
            input_schema: {
              type: 'object',
              properties: {
                preview_token: { type: 'string' },
                approval_token: { type: 'string' },
              },
              required: ['preview_token', 'approval_token'],
            },
            requires_confirmation: true,
            mutates_state: true,
            permission: 'manage:courses',
            description: 'Apply a previously previewed lesson patch after explicit confirmation.',
            roles: ['teacher', 'admin'],
            surface: 'editor_shell',
            result_schema: { type: 'object', properties: { applied: { type: 'boolean' }, lesson_id: { type: 'string' } } },
          },
          {
            name: 'assessment.preview_quiz_commit',
            input_schema: {
              type: 'object',
              properties: {
                lesson_id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                question_ids: { type: 'array', items: { type: 'string' } },
                time_limit_minutes: { type: 'number' },
                max_attempts: { type: 'number' },
                passing_score: { type: 'number' },
              },
            },
            requires_confirmation: false,
            mutates_state: false,
            permission: 'manage:courses',
            description: 'Preview quiz creation or quiz updates before committing them to the LMS.',
            roles: ['teacher', 'admin'],
            surface: 'preview_panel',
            result_schema: { type: 'object', properties: { preview_token: { type: 'string' }, summary: { type: 'string' } } },
          },
          {
            name: 'assessment.apply_quiz_commit',
            input_schema: {
              type: 'object',
              properties: {
                preview_token: { type: 'string' },
                approval_token: { type: 'string' },
              },
              required: ['preview_token', 'approval_token'],
            },
            requires_confirmation: true,
            mutates_state: true,
            permission: 'manage:courses',
            description: 'Create or update the LMS quiz from a confirmed preview.',
            roles: ['teacher', 'admin'],
            surface: 'editor_shell',
            result_schema: { type: 'object', properties: { applied: { type: 'boolean' }, quiz_id: { type: 'string' } } },
          },
          {
            name: 'publish.preview_quiz',
            input_schema: {
              type: 'object',
              properties: {
                quiz_id: { type: 'string' },
                lesson_id: { type: 'string' },
              },
            },
            requires_confirmation: false,
            mutates_state: false,
            permission: 'manage:courses',
            description: 'Preview quiz publishing impact before the final publish step.',
            roles: ['teacher', 'admin'],
            surface: 'preview_panel',
            result_schema: { type: 'object', properties: { preview_token: { type: 'string' }, summary: { type: 'string' } } },
          },
          {
            name: 'publish.apply_quiz',
            input_schema: {
              type: 'object',
              properties: {
                preview_token: { type: 'string' },
                approval_token: { type: 'string' },
              },
              required: ['preview_token', 'approval_token'],
            },
            requires_confirmation: true,
            mutates_state: true,
            permission: 'manage:courses',
            description: 'Publish a quiz after an explicit teacher confirmation.',
            roles: ['teacher', 'admin'],
            surface: 'editor_shell',
            result_schema: { type: 'object', properties: { published: { type: 'boolean' }, quiz_id: { type: 'string' } } },
          },
        );
      }
    }

    return {
      host_type: 'lms',
      host_name: 'Holilihu LMS',
      connector_id: hostIdentity.connector_id,
      host_workspace_id: hostIdentity.host_workspace_id,
      host_organization_id: hostIdentity.host_organization_id,
      version: '2',
      resources: ['current-page', 'course-graph', 'selected-entities'],
      surfaces: ['chat_panel', 'inline_visual', 'artifact', 'editor_shell', 'preview_panel'],
      tools,
    };
  }

  private buildHostIdentityOverlay(): Pick<
    WiiiPageContext,
    'connector_id' | 'host_user_id' | 'host_workspace_id' | 'host_organization_id'
  > {
    const user = this.authService.getCurrentUser();
    const hostOrganizationId = String(user?.organizationId || '').trim() || undefined;
    return {
      connector_id: LMS_CONNECTOR_ID,
      host_user_id: user?.id ? String(user.id) : undefined,
      host_workspace_id: hostOrganizationId,
      host_organization_id: hostOrganizationId,
    };
  }

  private sendCapabilities(): void {
    if (!this.iframeEl || !this.embedOrigin) return;
    const ctx = this.lastContext || this.extractPageContext(this.router.url);
    const payload = this.buildCapabilities(this.decorateContext(ctx));
    this.iframeEl.contentWindow?.postMessage(
      {
        type: 'wiii:capabilities',
        payload,
      },
      this.embedOrigin,
    );
  }

  private async captureScreenshot(selector?: string): Promise<{ success: boolean; data?: { image: string } }> {
    const target = selector || 'main';
    const el = document.querySelector(target) as HTMLElement | null;
    if (!el) {
      throw new Error('Target element not found');
    }

    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(el, {
      scale: 1,
      useCORS: true,
      logging: false,
    });
    return { success: true, data: { image: canvas.toDataURL('image/jpeg', 0.7) } };
  }

  private createPreviewToken(kind: OperatorPreviewKind): string {
    return `${kind}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private createApprovalToken(kind: OperatorPreviewKind): string {
    return `approved-${kind}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private prunePendingPreviews(): void {
    const now = Date.now();
    for (const [token, preview] of this.pendingOperatorPreviews.entries()) {
      if (now - preview.createdAt > 30 * 60 * 1000) {
        this.pendingOperatorPreviews.delete(token);
      }
    }
  }

  private rememberPreview(
    kind: OperatorPreviewKind,
    summary: string,
    payload: Record<string, unknown>,
  ): PendingOperatorPreview {
    this.prunePendingPreviews();
    const preview: PendingOperatorPreview = {
      kind,
      token: this.createPreviewToken(kind),
      createdAt: Date.now(),
      summary,
      payload,
    };
    this.pendingOperatorPreviews.set(preview.token, preview);
    return preview;
  }

  private requirePreview(token: string, kind: OperatorPreviewKind): PendingOperatorPreview {
    this.prunePendingPreviews();
    const preview = this.pendingOperatorPreviews.get(token);
    if (!preview || preview.kind !== kind) {
      throw new Error(`Missing ${kind} preview`);
    }
    return preview;
  }

  private requireAnyPreview(token: string): PendingOperatorPreview {
    this.prunePendingPreviews();
    const preview = this.pendingOperatorPreviews.get(token);
    if (!preview) {
      throw new Error('Missing operator preview');
    }
    return preview;
  }

  private requireHostApproval(
    preview: PendingOperatorPreview,
    approvalToken: string | undefined,
  ): void {
    if (!approvalToken || preview.approvalToken !== approvalToken) {
      throw new Error('host_preview_approval_required');
    }
  }

  async approveOperatorPreview(previewToken: string): Promise<WiiiOperatorApplyResult> {
    const preview = this.requireAnyPreview(String(previewToken || '').trim());
    preview.approvalToken = this.createApprovalToken(preview.kind);
    preview.approvedAt = Date.now();

    try {
      const result = await this.handleActionRequest(this.applyActionForPreviewKind(preview.kind), {
        preview_token: preview.token,
        approval_token: preview.approvalToken,
      });
      const event: WiiiOperatorApplyResult = {
        token: preview.token,
        kind: preview.kind,
        success: result.success,
        data: result.data,
        error: result.error,
      };
      this.operatorApplyResult$.next(event);
      return event;
    } catch (error) {
      const event: WiiiOperatorApplyResult = {
        token: preview.token,
        kind: preview.kind,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
      this.operatorApplyResult$.next(event);
      return event;
    }
  }

  private applyActionForPreviewKind(kind: OperatorPreviewKind): string {
    switch (kind) {
      case 'lesson_patch':
        return 'authoring.apply_lesson_patch';
      case 'course_plan':
        return 'authoring.apply_course_plan';
      case 'quiz_commit':
        return 'assessment.apply_quiz_commit';
      case 'quiz_publish':
        return 'publish.apply_quiz';
    }
  }

  private announceOperatorPreview(
    preview: PendingOperatorPreview,
    data: Record<string, unknown>,
  ): void {
    this.operatorPreview$.next({
      token: preview.token,
      kind: preview.kind,
      createdAt: preview.createdAt,
      summary: String(data['summary'] || preview.summary || '').trim(),
      applyAction: String(data['apply_action'] || this.applyActionForPreviewKind(preview.kind)).trim(),
      targetLabel: String(data['target_label'] || data['course_title'] || data['lesson_title'] || data['quiz_title'] || preview.kind).trim(),
      changedFields: this.normalizeStringArray(data['changed_fields']),
      sourceReferences: this.normalizeSourceReferences(data['source_references']),
      data,
    });
  }

  private resolveCurrentCourseId(params: Record<string, unknown>): string {
    return String(
      params['course_id']
      || params['courseId']
      || this.lastContext?.course_id
      || '',
    ).trim();
  }

  private resolveCurrentLessonId(params: Record<string, unknown>): string {
    return String(
      params['lesson_id']
      || params['lessonId']
      || this.selectionService.selectedLessonId()
      || this.selectionService.selectedLesson()?.id
      || this.lastContext?.lesson_id
      || this.extractLessonIdFromCurrentUrl()
      || '',
    ).trim();
  }

  private extractLessonIdFromCurrentUrl(): string {
    if (!this.isBrowser) {
      return '';
    }
    const url = String(this.router.url || '');
    if (!url) {
      return '';
    }

    const queryText = url.includes('?') ? url.split('?')[1].split('#')[0] : '';
    if (queryText) {
      const query = new URLSearchParams(queryText);
      const fromQuery = query.get('lessonId') || query.get('lesson_id');
      if (fromQuery) {
        return fromQuery.trim();
      }
    }

    const pathMatch = url.match(/\/lesson\/([^/?#]+)/i);
    return pathMatch?.[1] ? decodeURIComponent(pathMatch[1]).trim() : '';
  }

  private normalizeString(value: unknown): string | undefined {
    const normalized = String(value ?? '').trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  private normalizeStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .map((item) => String(item || '').trim())
      .filter((item) => item.length > 0);
  }

  private normalizeSourceReferences(value: unknown): WiiiSourceReference[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item))
      .slice(0, 12)
      .map((item) => ({
        kind: this.normalizeString(item['kind']),
        title: this.normalizeString(item['title']),
        label: this.normalizeString(item['label']),
        excerpt: this.normalizeString(item['excerpt'] ?? item['text'] ?? item['snippet']),
        page: this.normalizeOptionalNumber(item['page'] ?? item['page_number']),
        page_start: this.normalizeOptionalNumber(item['page_start'] ?? item['pageStart'] ?? item['source_page_start']),
        page_end: this.normalizeOptionalNumber(item['page_end'] ?? item['pageEnd'] ?? item['source_page_end']),
        chapter_index: this.normalizeOptionalNumber(item['chapter_index'] ?? item['chapterIndex']),
        lesson_index: this.normalizeOptionalNumber(item['lesson_index'] ?? item['lessonIndex']),
        block_id: this.normalizeString(item['block_id'] ?? item['blockId']),
      }));
  }

  private normalizeOptionalNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
  }

  private buildPreviewExcerpt(value: unknown, maxLength = 240): string {
    const normalized = String(value ?? '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/\s+/g, ' ')
      .trim();
    if (!normalized) {
      return '';
    }
    if (normalized.length <= maxLength) {
      return normalized;
    }
    return `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
  }

  private buildPreviewText(value: unknown, maxLength = 1800): string {
    const normalized = String(value ?? '')
      .replace(/\r\n?/g, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .split('\n')
      .map((line) => line.replace(/[ \t]+/g, ' ').trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if (!normalized) {
      return '';
    }
    if (normalized.length <= maxLength) {
      return normalized;
    }
    return `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
  }

  private extractLearningObjectivesFromContent(value: unknown): string[] {
    const text = this.buildPreviewText(value, 5000);
    if (!text) {
      return [];
    }

    const lines = text.split('\n');
    const objectives: string[] = [];
    let inObjectiveSection = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      const normalizedHeading = trimmed
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();

      if (/^#{1,3}\s*muc tieu hoc tap\b/.test(normalizedHeading)) {
        inObjectiveSection = true;
        continue;
      }
      if (inObjectiveSection && /^#{1,3}\s+/.test(trimmed)) {
        break;
      }
      if (!inObjectiveSection) {
        continue;
      }

      const objective = trimmed
        .replace(/^[-*•]\s+/, '')
        .replace(/^\d+[.)-]\s+/, '')
        .trim();
      if (objective.length > 0) {
        objectives.push(objective);
      }
      if (objectives.length >= 6) {
        break;
      }
    }

    return objectives;
  }

  private buildActionSummary(prefix: string, details: string[]): string {
    const cleanDetails = details.filter((detail) => detail.trim().length > 0);
    if (cleanDetails.length === 0) {
      return prefix;
    }
    return `${prefix}: ${cleanDetails.join(', ')}.`;
  }

  private normalizeCoursePlan(raw: unknown): NormalizedCoursePlan {
    const record = raw && typeof raw === 'object' && !Array.isArray(raw)
      ? raw as Record<string, unknown>
      : {};
    const chapters = this.normalizeCoursePlanChapters(record['chapters']);
    return {
      title: this.normalizeString(record['title']) || this.normalizeString(record['course_title']) || 'Khóa học từ tài liệu',
      description: this.normalizeString(record['description']) || this.normalizeString(record['summary']) || '',
      audience: this.normalizeString(record['audience']),
      duration: this.normalizeString(record['duration']),
      chapters,
      assessment_plan: this.normalizeStringArray(record['assessment_plan'] || record['assessmentPlan']),
      implementation_checklist: this.normalizeStringArray(record['implementation_checklist'] || record['implementationChecklist']),
      source_document_title: this.normalizeString(record['source_document_title'] || record['sourceDocumentTitle']),
    };
  }

  private normalizeCoursePlanChapters(raw: unknown): CoursePlanChapter[] {
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item))
      .slice(0, 6)
      .map((item, index) => ({
        title: this.normalizeString(item['title']) || `Chương ${index + 1}`,
        summary: this.normalizeString(item['summary'] || item['description']) || '',
        learning_objectives: this.normalizeStringArray(item['learning_objectives'] || item['learningObjectives']).slice(0, 6),
        lessons: this.normalizeCoursePlanLessons(item['lessons']),
        source_references: this.normalizeSourceReferences(item['source_references'] || item['sourceReferences']),
      }))
      .filter((chapter) => chapter.lessons.length > 0);
  }

  private normalizeCoursePlanLessons(raw: unknown): CoursePlanLesson[] {
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item))
      .slice(0, 6)
      .map((item, index) => ({
        title: this.normalizeString(item['title']) || `Bài ${index + 1}`,
        summary: this.normalizeString(item['summary'] || item['description'] || item['content']) || '',
        activity: this.normalizeString(item['activity']),
        quick_check: this.normalizeString(item['quick_check'] || item['quickCheck']),
        duration_minutes: this.normalizeOptionalNumber(item['duration_minutes'] || item['durationMinutes']),
        source_references: this.normalizeSourceReferences(item['source_references'] || item['sourceReferences']),
      }));
  }

  private collectCoursePlanSourceReferences(plan: NormalizedCoursePlan, explicit: unknown): WiiiSourceReference[] {
    const refs: WiiiSourceReference[] = [
      ...this.normalizeSourceReferences(explicit),
    ];
    for (const [chapterIndex, chapter] of plan.chapters.entries()) {
      refs.push(...(chapter.source_references || []).map((ref) => ({
        ...ref,
        chapter_index: ref.chapter_index ?? chapterIndex + 1,
      })));
      for (const [lessonIndex, lesson] of chapter.lessons.entries()) {
        refs.push(...(lesson.source_references || []).map((ref) => ({
          ...ref,
          chapter_index: ref.chapter_index ?? chapterIndex + 1,
          lesson_index: ref.lesson_index ?? lessonIndex + 1,
        })));
      }
    }
    const seen = new Set<string>();
    return refs.filter((ref) => {
      const key = [
        ref.kind || '',
        ref.title || '',
        ref.page || '',
        ref.page_start || '',
        ref.page_end || '',
        ref.chapter_index || '',
        ref.lesson_index || '',
      ].join('|');
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    }).slice(0, 12);
  }

  private buildCoursePlanLessonContent(
    lesson: CoursePlanLesson,
    chapter: CoursePlanChapter,
    plan: NormalizedCoursePlan,
  ): string {
    const references = lesson.source_references?.length
      ? lesson.source_references
      : chapter.source_references || [];
    const sourceLines = references
      .slice(0, 4)
      .map((ref, index) => {
        const pageStart = ref.page_start ?? ref.page;
        const pageText = pageStart
          ? ref.page_end && ref.page_end !== pageStart
            ? `, trang ${pageStart}-${ref.page_end}`
            : `, trang ${pageStart}`
          : '';
        return `${index + 1}. ${ref.title || ref.label || plan.source_document_title || 'Tài liệu nguồn'}${pageText}${ref.excerpt ? ` - ${ref.excerpt}` : ''}`;
      });
    return [
      `# ${lesson.title}`,
      '',
      lesson.summary ? `## Tóm tắt\n${lesson.summary}` : '',
      chapter.learning_objectives.length
        ? `## Mục tiêu học tập\n${chapter.learning_objectives.map((item) => `- ${item}`).join('\n')}`
        : '',
      lesson.activity ? `## Hoạt động thực hành\n${lesson.activity}` : '',
      lesson.quick_check ? `## Câu hỏi kiểm tra nhanh\n${lesson.quick_check}` : '',
      sourceLines.length ? `## Nguồn đối chiếu\n${sourceLines.join('\n')}` : '',
    ].filter((part) => part.trim().length > 0).join('\n\n');
  }

  private withCoursePlanReviewInstruction(summary: string): string {
    const clean = summary.replace(/\s+/g, ' ').trim();
    const lower = clean.toLocaleLowerCase('vi-VN');
    const alreadyAsksForReview = (
      lower.includes('giáo viên cần xem')
      || (lower.includes('citation') && lower.includes('áp dụng'))
      || (lower.includes('nguồn trích dẫn') && lower.includes('áp dụng'))
      || (lower.includes('source') && lower.includes('apply'))
    );
    if (alreadyAsksForReview) {
      return clean;
    }
    return `${clean.replace(/[.!?。]+$/u, '')}. Giáo viên cần xem cây chương/bài và nguồn trích dẫn trước khi áp dụng.`;
  }

  private async previewCoursePlan(
    params: Record<string, unknown>,
  ): Promise<{ success: boolean; data: Record<string, unknown> }> {
    const courseId = this.resolveCurrentCourseId(params);
    if (!courseId) {
      throw new Error('Missing course_id for course plan preview');
    }
    const rawPlan = params['course_plan'] || params['coursePlan'] || params['outline'];
    const plan = this.normalizeCoursePlan(rawPlan || params);
    if (plan.chapters.length === 0) {
      throw new Error('Course plan preview needs at least one chapter with lessons');
    }
    const sourceReferences = this.collectCoursePlanSourceReferences(
      plan,
      params['source_references'] || params['sourceReferences'],
    );
    const lessonCount = plan.chapters.reduce((sum, chapter) => sum + chapter.lessons.length, 0);
    const summary = this.normalizeString(params['summary'])
      || `Course plan preview ready: ${plan.chapters.length} chapters, ${lessonCount} lessons.`;
    const preview = this.rememberPreview('course_plan', summary, {
      course_id: courseId,
      course_plan: plan,
      source_references: sourceReferences,
      changed_fields: ['course_structure'],
    });
    const data = {
      preview_token: preview.token,
      preview_kind: preview.kind,
      course_id: courseId,
      course_title: plan.title,
      target_label: plan.title,
      apply_action: 'authoring.apply_course_plan',
      summary: this.withCoursePlanReviewInstruction(summary),
      changed_fields: ['course_structure'],
      source_references: sourceReferences,
      course_plan: plan,
    };
    this.announceOperatorPreview(preview, data);
    return { success: true, data };
  }

  private async applyCoursePlan(
    params: Record<string, unknown>,
  ): Promise<{ success: boolean; data: Record<string, unknown> }> {
    const previewToken = this.normalizeString(params['preview_token']);
    if (!previewToken) {
      throw new Error('Missing preview_token for course plan apply');
    }
    const preview = this.requirePreview(previewToken, 'course_plan');
    this.requireHostApproval(preview, this.normalizeString(params['approval_token'] || params['approvalToken']));
    const courseId = String(preview.payload['course_id'] || '').trim();
    const plan = preview.payload['course_plan'] as NormalizedCoursePlan | undefined;
    if (!courseId || !plan || !Array.isArray(plan.chapters) || plan.chapters.length === 0) {
      throw new Error('Course plan preview is missing course structure');
    }

    let chaptersCreated = 0;
    let lessonsCreated = 0;
    const createdChapters: Array<{ id: string; title: string; lesson_count: number }> = [];
    for (const [chapterIndex, chapter] of plan.chapters.entries()) {
      const chapterResponse: any = await firstValueFrom(this.chapterApi.createChapter(courseId, {
        title: chapter.title,
        description: chapter.summary || undefined,
        orderIndex: chapterIndex,
      }));
      const createdChapter = chapterResponse?.data || chapterResponse;
      const chapterId = typeof createdChapter === 'string' ? createdChapter : String(createdChapter?.id || '').trim();
      if (!chapterId) {
        throw new Error(`Course plan apply could not create chapter ${chapterIndex + 1}`);
      }
      chaptersCreated += 1;
      createdChapters.push({ id: chapterId, title: chapter.title, lesson_count: chapter.lessons.length });
      if (this.courseEditorStore.courseTree()?.id === courseId) {
        this.courseEditorStore.addChapterLocal({
          id: chapterId,
          title: (typeof createdChapter === 'object' ? createdChapter?.title : null) || chapter.title,
          description: (typeof createdChapter === 'object' ? createdChapter?.description : null) || chapter.summary || '',
          orderIndex: (typeof createdChapter === 'object' ? createdChapter?.orderIndex : null) ?? chapterIndex,
          lessons: [],
        });
      }

      for (const [lessonIndex, lesson] of chapter.lessons.entries()) {
        const lessonResponse: any = await firstValueFrom(this.lessonApi.createLesson(chapterId, {
          title: lesson.title,
          description: lesson.summary || undefined,
          content: this.buildCoursePlanLessonContent(lesson, chapter, plan),
          durationMinutes: lesson.duration_minutes || 15,
          orderIndex: lessonIndex,
          type: 'LECTURE',
        }));
        const createdLesson = lessonResponse?.data || lessonResponse;
        const lessonId = typeof createdLesson === 'string' ? createdLesson : String(createdLesson?.id || '').trim();
        if (lessonId) {
          lessonsCreated += 1;
          if (this.courseEditorStore.courseTree()?.id === courseId) {
            this.courseEditorStore.addLessonLocal(chapterId, {
              id: lessonId,
              title: (typeof createdLesson === 'object' ? createdLesson?.title : null) || lesson.title,
              type: (typeof createdLesson === 'object' ? (createdLesson?.type || createdLesson?.lessonType) : null) || 'LECTURE',
              orderIndex: (typeof createdLesson === 'object' ? createdLesson?.orderIndex : null) ?? lessonIndex,
              isRequired: (typeof createdLesson === 'object' ? createdLesson?.isRequired : null) ?? false,
              sections: (typeof createdLesson === 'object' ? createdLesson?.sections : null) || [],
            });
          }
        }
      }
    }
    this.pendingOperatorPreviews.delete(previewToken);
    if (this.courseEditorStore.courseTree()?.id === courseId) {
      this.courseEditorStore.invalidateCache(courseId);
      this.courseEditorStore.loadCourse(courseId, true);
    }
    const nextRoute = `/teacher/courses/${courseId}/editor/curriculum`;
    const navigatedToCurriculum = await this.router.navigate(['/teacher/courses', courseId, 'editor', 'curriculum']);
    const nextStep = navigatedToCurriculum
      ? 'LMS đã mở tab Nội dung để rà soát chương/bài nháp, kiểm tra nguồn trích dẫn, rồi mới xuất bản.'
      : 'Mở tab Nội dung để rà soát chương/bài nháp, kiểm tra nguồn trích dẫn, rồi mới xuất bản.';

    return {
      success: true,
      data: {
        applied: true,
        course_id: courseId,
        course_title: plan.title,
        chapters_created: chaptersCreated,
        lessons_created: lessonsCreated,
        chapters: createdChapters,
        next_route: nextRoute,
        navigated_to_curriculum: navigatedToCurriculum,
        next_step: nextStep,
        summary: `Đã tạo ${chaptersCreated} chương và ${lessonsCreated} bài học nháp từ tài liệu. ${nextStep}`,
      },
    };
  }

  private extractLessonPreviewBlocks(source: unknown): LessonPreviewBlock[] {
    if (!source) {
      return [];
    }

    if (Array.isArray(source)) {
      return source
        .map((item, index) => this.normalizeLessonPreviewBlock(item, index))
        .filter((item): item is LessonPreviewBlock => item !== null)
        .slice(0, 8);
    }

    if (typeof source === 'object') {
      const record = source as Record<string, unknown>;
      const nestedBlocks =
        record['contentBlocks']
        ?? record['content_blocks']
        ?? record['structuredContent']
        ?? record['structured_content']
        ?? record['blocks'];
      if (nestedBlocks && nestedBlocks !== source) {
        const normalizedNested = this.extractLessonPreviewBlocks(nestedBlocks);
        if (normalizedNested.length > 0) {
          return normalizedNested;
        }
      }

      const contentCandidate =
        record['content']
        ?? record['text']
        ?? record['html']
        ?? record['description']
        ?? record['caption'];
      const excerpt = this.buildPreviewExcerpt(contentCandidate, 160);
      if (!excerpt) {
        return [];
      }
      return [{
        id: String(record['id'] || 'block-1').trim() || 'block-1',
        type: String(record['type'] || 'text').trim() || 'text',
        label: this.buildLessonBlockLabel(record, 0),
        excerpt,
      }];
    }

    const normalizedText = this.buildPreviewExcerpt(source, 1200);
    if (!normalizedText) {
      return [];
    }

    return normalizedText
      .split(/\n{2,}|(?<=[.!?])\s{2,}/)
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0)
      .slice(0, 8)
      .map((segment, index) => ({
        id: `block-${index + 1}`,
        type: 'text',
        label: `Doan ${index + 1}`,
        excerpt: this.buildPreviewExcerpt(segment, 160),
      }));
  }

  private normalizeLessonPreviewBlock(value: unknown, index: number): LessonPreviewBlock | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      const excerpt = this.buildPreviewExcerpt(value, 160);
      if (!excerpt) {
        return null;
      }
      return {
        id: `block-${index + 1}`,
        type: 'text',
        label: `Doan ${index + 1}`,
        excerpt,
      };
    }

    const record = value as Record<string, unknown>;
    const excerpt = this.buildPreviewExcerpt(
      record['content'] ?? record['text'] ?? record['html'] ?? record['caption'] ?? record['url'],
      160,
    );
    if (!excerpt) {
      return null;
    }

    return {
      id: String(record['id'] || `block-${index + 1}`).trim() || `block-${index + 1}`,
      type: String(record['type'] || 'text').trim() || 'text',
      label: this.buildLessonBlockLabel(record, index),
      excerpt,
    };
  }

  private buildLessonBlockLabel(record: Record<string, unknown>, index: number): string {
    const explicit =
      this.normalizeString(record['label'])
      || this.normalizeString(record['title'])
      || this.normalizeString(record['caption']);
    if (explicit) {
      return explicit;
    }
    const type = this.normalizeString(record['type']) || 'text';
    return `${type} ${index + 1}`;
  }

  private normalizeLessonSections(lesson: unknown): Array<Record<string, unknown>> {
    if (!lesson || typeof lesson !== 'object' || Array.isArray(lesson)) {
      return [];
    }
    const record = lesson as Record<string, unknown>;
    const raw =
      record['sections']
      ?? record['contentBlocks']
      ?? record['content_blocks']
      ?? [];
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item))
      .map((item, index) => {
        const data = item['data'] && typeof item['data'] === 'object' && !Array.isArray(item['data'])
          ? item['data'] as Record<string, unknown>
          : {};
        return {
          id: this.normalizeString(item['id']) || `block-${index + 1}`,
          type: this.normalizeString(item['type'] ?? data['type']) || 'TEXT',
          title: this.normalizeString(item['title'] ?? data['title'] ?? item['label'] ?? data['label']) || `Phần ${index + 1}`,
          content: this.normalizeString(item['content'] ?? data['content'] ?? item['text'] ?? data['text']) || '',
          isRequired: item['isRequired'] ?? data['isRequired'] ?? false,
        };
      });
  }

  private resolveLessonContentSection(
    lesson: unknown,
    params: Record<string, unknown>,
  ): Record<string, unknown> | null {
    const explicitId =
      this.normalizeString(params['section_id'])
      || this.normalizeString(params['sectionId'])
      || this.normalizeString(params['block_id'])
      || this.normalizeString(params['blockId']);
    const sections = this.normalizeLessonSections(lesson);
    if (sections.length === 0) {
      return null;
    }
    if (explicitId) {
      const explicit = sections.find((section) => String(section['id'] || '') === explicitId);
      if (explicit) {
        return explicit;
      }
    }
    return sections.find((section) => String(section['type'] || '').toUpperCase() === 'TEXT')
      || sections.find((section) => String(section['content'] || '').trim().length > 0)
      || sections[0]
      || null;
  }

  private buildLessonBlocksAfterContentPatch(
    beforeBlocks: LessonPreviewBlock[],
    targetSectionId: string | undefined,
    nextContent: string,
  ): LessonPreviewBlock[] {
    const nextExcerpt = this.buildPreviewExcerpt(nextContent, 160);
    if (!targetSectionId || beforeBlocks.length === 0) {
      return this.extractLessonPreviewBlocks(nextContent);
    }
    let replaced = false;
    const patched = beforeBlocks.map((block) => {
      if (block.id !== targetSectionId) {
        return block;
      }
      replaced = true;
      return {
        ...block,
        excerpt: nextExcerpt,
      };
    });
    if (replaced) {
      return patched;
    }
    return [{
      id: targetSectionId,
      type: 'TEXT',
      label: 'Nội dung Wiii đề xuất',
      excerpt: nextExcerpt,
    }, ...beforeBlocks].slice(0, 8);
  }

  private buildSectionFormData(payload: Record<string, unknown>): FormData {
    const formData = new FormData();
    formData.append('data', new Blob([JSON.stringify(payload)], {
      type: 'application/json; charset=utf-8',
    }));
    return formData;
  }

  private buildLessonBlockDiff(
    beforeBlocks: LessonPreviewBlock[],
    afterBlocks: LessonPreviewBlock[],
  ): {
    added: number;
    removed: number;
    changed: number;
    unchanged: number;
    items: LessonPreviewBlockDelta[];
  } {
    const maxLen = Math.max(beforeBlocks.length, afterBlocks.length);
    const items: LessonPreviewBlockDelta[] = [];
    let added = 0;
    let removed = 0;
    let changed = 0;
    let unchanged = 0;

    for (let index = 0; index < maxLen; index += 1) {
      const before = beforeBlocks[index];
      const after = afterBlocks[index];

      if (!before && after) {
        added += 1;
        items.push({ index, status: 'added', after });
        continue;
      }
      if (before && !after) {
        removed += 1;
        items.push({ index, status: 'removed', before });
        continue;
      }

      const isSame =
        before?.type === after?.type
        && before?.label === after?.label
        && before?.excerpt === after?.excerpt;

      if (isSame) {
        unchanged += 1;
        items.push({ index, status: 'unchanged', before, after });
      } else {
        changed += 1;
        items.push({ index, status: 'changed', before, after });
      }
    }

    return {
      added,
      removed,
      changed,
      unchanged,
      items: items.slice(0, 8),
    };
  }

  private buildWiiiAuthoringRequestOptions(): { headers: HttpHeaders } {
    return {
      headers: new HttpHeaders({
        'ngsw-bypass': 'true',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      }),
    };
  }

  private async getLessonDetail(lessonId: string, options?: any): Promise<any> {
    const request = options === undefined
      ? this.lessonApi.getLessonById(lessonId)
      : this.lessonApi.getLessonById(lessonId, options);
    const response = await firstValueFrom(request);
    return (response as any)?.data || response;
  }

  private async verifyLessonPatchApplied(
    lessonId: string,
    payload: Record<string, unknown>,
    changedFields: string[],
    contentSectionId: string,
    expectedContent: string,
    options: any,
  ): Promise<void> {
    const lesson = await this.getLessonDetail(lessonId, options);

    if (changedFields.includes('title')) {
      const expectedTitle = String(payload['title'] || '').trim();
      const actualTitle = String(lesson?.title || '').trim();
      if (expectedTitle && actualTitle !== expectedTitle) {
        throw new Error('host_preview_apply_verification_failed:title');
      }
    }

    if (changedFields.includes('description')) {
      const expectedDescription = String(payload['description'] || '').trim();
      const actualDescription = String(lesson?.description || '').trim();
      if (expectedDescription && actualDescription !== expectedDescription) {
        throw new Error('host_preview_apply_verification_failed:description');
      }
    }

    if (!changedFields.includes('content')) {
      return;
    }

    const actualContent = contentSectionId
      ? this.findLessonSectionContent(lesson, contentSectionId)
      : String(lesson?.content || '');
    if (contentSectionId && !actualContent) {
      throw new Error('host_preview_apply_verification_failed:section_missing');
    }
    if (!this.lessonContentContainsExpected(actualContent, expectedContent)) {
      throw new Error('host_preview_apply_verification_failed:content');
    }

    const expectedSectionTitle = String(payload['content_section_next_title'] || '').trim();
    if (contentSectionId && expectedSectionTitle) {
      const actualSectionTitle = String(this.findLessonSection(lesson, contentSectionId)?.['title'] || '').trim();
      if (actualSectionTitle !== expectedSectionTitle) {
        throw new Error('host_preview_apply_verification_failed:section_title');
      }
    }
  }

  private findLessonSection(lesson: unknown, sectionId: string): Record<string, unknown> | null {
    return this.normalizeLessonSections(lesson)
      .find((section) => String(section['id'] || '').trim() === sectionId)
      || null;
  }

  private findLessonSectionContent(lesson: unknown, sectionId: string): string {
    const target = this.findLessonSection(lesson, sectionId);
    return String(target?.['content'] || '').trim();
  }

  private lessonContentContainsExpected(actual: unknown, expected: unknown): boolean {
    const actualText = this.normalizeVerificationText(actual);
    const expectedText = this.normalizeVerificationText(expected);
    if (!expectedText) {
      return true;
    }
    if (actualText === expectedText || actualText.includes(expectedText)) {
      return true;
    }
    return this.buildVerificationAnchors(expectedText)
      .some((anchor) => actualText.includes(anchor));
  }

  private buildVerificationAnchors(expectedText: string): string[] {
    const minAnchorLength = expectedText.length < 40 ? Math.max(4, expectedText.length) : 24;
    const lineAnchors = expectedText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length >= minAnchorLength)
      .slice(0, 4)
      .map((line) => line.slice(0, 220).trim());
    const windowAnchors = [
      expectedText.slice(0, 800).trim(),
      expectedText.slice(Math.max(0, expectedText.length - 800)).trim(),
    ].filter((anchor) => anchor.length >= minAnchorLength);
    return [...new Set([...lineAnchors, ...windowAnchors])];
  }

  private normalizeVerificationText(value: unknown): string {
    return String(value ?? '')
      .normalize('NFC')
      .replace(/\r\n?/g, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .split('\n')
      .map((line) => line
        .replace(/^#{1,6}\s+/, '')
        .replace(/^[-*\u2022]\s+/, '')
        .replace(/[ \t]+/g, ' ')
        .trim())
      .filter((line) => line.length > 0)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private buildContentSectionTitle(lessonTitle: unknown): string {
    const title = String(lessonTitle || '')
      .replace(/^Bản nháp:\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!title) {
      return '';
    }
    return `Nội dung: ${title}`.slice(0, 120).trim();
  }

  private async resolveQuizIdForLesson(lessonId: string, explicitQuizId?: string): Promise<string> {
    if (explicitQuizId && explicitQuizId.trim().length > 0) {
      return explicitQuizId.trim();
    }
    return firstValueFrom(this.quizApi.resolveQuizIdByLessonId(lessonId));
  }

  private async previewLessonPatch(
    params: Record<string, unknown>,
  ): Promise<{ success: boolean; data: Record<string, unknown> }> {
    const lessonId = this.resolveCurrentLessonId(params);
    if (!lessonId) {
      throw new Error('Missing lesson_id for lesson patch preview');
    }

    const lesson = await this.getLessonDetail(lessonId);
    const title = this.normalizeString(params['title']);
    const description = this.normalizeString(params['description']);
    const content = this.normalizeString(params['content']);
    const sourceReferences = this.normalizeSourceReferences(
      params['source_references'] || params['sourceReferences'],
    );
    const targetContentSection = content
      ? this.resolveLessonContentSection(lesson, params)
      : null;
    const targetContentSectionId = this.normalizeString(targetContentSection?.['id']);
    const nextContentSectionTitle = targetContentSectionId && title
      ? this.buildContentSectionTitle(title)
      : '';
    const changedFields = [
      ...(title ? ['title'] : []),
      ...(description ? ['description'] : []),
      ...(content ? ['content'] : []),
    ];
    if (changedFields.length === 0) {
      throw new Error('Lesson patch preview needs at least one field to change');
    }

    const currentLessonTitle = String(lesson?.title || lessonId).trim();
    const proposedLessonTitle = title ?? currentLessonTitle;
    const summary = this.buildActionSummary(
      `Bản xem trước bài học đã sẵn sàng cho "${proposedLessonTitle}"`,
      changedFields,
    );
    const reviewSummary = `${summary.replace(/[.!?。]+$/u, '')}. Giáo viên cần xem phần so sánh thay đổi và nguồn trích dẫn trong LMS trước khi áp dụng.`;
    const beforeBlocks = this.extractLessonPreviewBlocks(
      (lesson as Record<string, unknown> | undefined)?.['sections']
      ?? (lesson as Record<string, unknown> | undefined)?.['contentBlocks']
      ?? lesson?.content,
    );
    const afterBlocks = content
      ? this.buildLessonBlocksAfterContentPatch(beforeBlocks, targetContentSectionId, content)
      : beforeBlocks;
    const blockDiff = this.buildLessonBlockDiff(beforeBlocks, afterBlocks);
    const preview = this.rememberPreview('lesson_patch', summary, {
      lesson_id: lessonId,
      course_id: String(lesson?.courseId || this.resolveCurrentCourseId(params) || '').trim(),
      chapter_id: String(lesson?.sectionId || lesson?.chapterId || '').trim(),
      lesson_type: String(lesson?.lessonType || 'LECTURE'),
      title: title ?? lesson?.title ?? '',
      description: description ?? lesson?.description ?? '',
      content: content ?? lesson?.content ?? '',
      content_section_id: targetContentSectionId || '',
      content_section_title: this.normalizeString(targetContentSection?.['title']) || '',
      content_section_next_title: nextContentSectionTitle,
      duration_minutes: Number(lesson?.durationMinutes || 0),
      order_index: Number(lesson?.orderIndex || 0),
      is_required: Boolean((lesson as any)?.isRequired ?? false),
      changed_fields: changedFields,
      source_references: sourceReferences,
    });

    const data = {
      preview_token: preview.token,
      preview_kind: preview.kind,
      lesson_id: lessonId,
      lesson_title: currentLessonTitle,
      proposed_lesson_title: proposedLessonTitle,
      course_id: String(lesson?.courseId || this.resolveCurrentCourseId(params) || '').trim() || undefined,
      apply_action: 'authoring.apply_lesson_patch',
      summary: reviewSummary,
      changed_fields: changedFields,
      content_target: targetContentSectionId
        ? {
          section_id: targetContentSectionId,
          title: this.normalizeString(targetContentSection?.['title']) || targetContentSectionId,
          proposed_title: nextContentSectionTitle || undefined,
          type: this.normalizeString(targetContentSection?.['type']) || 'TEXT',
        }
        : undefined,
      target_label: proposedLessonTitle,
      source_references: sourceReferences,
      lesson_before: {
        title: String(lesson?.title || '').trim(),
        description: String(lesson?.description || '').trim(),
        content_excerpt: this.buildPreviewExcerpt(lesson?.content),
        content_preview: this.buildPreviewText(lesson?.content),
        learning_objectives: this.extractLearningObjectivesFromContent(lesson?.content),
        blocks: beforeBlocks,
      },
      lesson_after: {
        title: title ?? String(lesson?.title || '').trim(),
        description: description ?? String(lesson?.description || '').trim(),
        content_excerpt: this.buildPreviewExcerpt(content ?? lesson?.content),
        content_preview: this.buildPreviewText(content ?? lesson?.content),
        learning_objectives: this.extractLearningObjectivesFromContent(content ?? lesson?.content),
        blocks: afterBlocks,
      },
      block_diff: blockDiff,
    };
    this.announceOperatorPreview(preview, data);

    return {
      success: true,
      data,
    };
  }

  private async applyLessonPatch(
    params: Record<string, unknown>,
  ): Promise<{ success: boolean; data: Record<string, unknown> }> {
    const previewToken = this.normalizeString(params['preview_token']);
    if (!previewToken) {
      throw new Error('Missing preview_token for lesson patch apply');
    }

    const preview = this.requirePreview(previewToken, 'lesson_patch');
    this.requireHostApproval(preview, this.normalizeString(params['approval_token'] || params['approvalToken']));
    const payload = preview.payload;
    const lessonId = String(payload['lesson_id'] || '').trim();
    const courseId = String(payload['course_id'] || '').trim();
    const chapterId = String(payload['chapter_id'] || '').trim();
    if (!lessonId || !courseId || !chapterId) {
      throw new Error('Lesson patch preview is missing lesson/course/chapter context');
    }
    const changedFields = this.normalizeStringArray(payload['changed_fields']);
    const content = String(payload['content'] || '').trim();
    const contentSectionId = String(payload['content_section_id'] || '').trim();
    const contentSectionTitle = String(payload['content_section_next_title'] || '').trim();
    const metadataChanged = changedFields.some((field) => field === 'title' || field === 'description');
    const contentChanged = changedFields.includes('content');
    const requestOptions = this.buildWiiiAuthoringRequestOptions();

    if (contentChanged && contentSectionId) {
      await firstValueFrom(this.sectionApi.updateSection(
        lessonId,
        contentSectionId,
        this.buildSectionFormData({
          ...(contentSectionTitle ? { title: contentSectionTitle } : {}),
          content,
        }),
        requestOptions,
      ));
    }

    if (metadataChanged || (contentChanged && !contentSectionId)) {
      await firstValueFrom(this.lessonApi.updateLesson(lessonId, {
        courseId,
        chapterId,
        title: String(payload['title'] || '').trim() || undefined,
        description: String(payload['description'] || '').trim() || undefined,
        lessonType: String(payload['lesson_type'] || 'LECTURE'),
        content: contentChanged && !contentSectionId ? content || undefined : undefined,
        durationMinutes: Number(payload['duration_minutes'] || 0),
        isRequired: Boolean(payload['is_required'] ?? false),
        isPreview: false,
        orderIndex: Number(payload['order_index'] || 0),
      }, requestOptions));
    }
    await this.verifyLessonPatchApplied(
      lessonId,
      payload,
      changedFields,
      contentSectionId,
      content,
      requestOptions,
    );
    this.pendingOperatorPreviews.delete(previewToken);

    return {
      success: true,
      data: {
        applied: true,
        verified: true,
        lesson_id: lessonId,
        course_id: courseId,
        content_section_id: contentSectionId || undefined,
        lesson_title: String(payload['title'] || lessonId).trim() || lessonId,
        summary: `Applied and verified lesson patch for lesson ${lessonId}.`,
      },
    };
  }

  private async previewQuizCommit(
    params: Record<string, unknown>,
  ): Promise<{ success: boolean; data: Record<string, unknown> }> {
    const lessonId = this.resolveCurrentLessonId(params);
    if (!lessonId) {
      throw new Error('Missing lesson_id for quiz preview');
    }

    let existingQuizId: string | null = null;
    try {
      existingQuizId = await this.resolveQuizIdForLesson(
        lessonId,
        this.normalizeString(params['quiz_id']) || this.normalizeString(params['quizId']),
      );
    } catch {
      existingQuizId = null;
    }

    const questionIds = this.normalizeStringArray(params['question_ids'] || params['questionIds']);
    const title = this.normalizeString(params['title']) || 'Quiz moi';
    const summary = existingQuizId
      ? this.buildActionSummary(`Quiz update preview ready for "${title}"`, [`questions=${questionIds.length}`])
      : this.buildActionSummary(`Quiz creation preview ready for "${title}"`, [`questions=${questionIds.length}`]);

    const preview = this.rememberPreview('quiz_commit', summary, {
      lesson_id: lessonId,
      quiz_id: existingQuizId || '',
      title,
      description: this.normalizeString(params['description']) || '',
      question_ids: questionIds,
      time_limit_minutes: Number(params['time_limit_minutes'] || params['timeLimitMinutes'] || 30),
      max_attempts: Number(params['max_attempts'] || params['maxAttempts'] || 1),
      passing_score: Number(params['passing_score'] || params['passingScore'] || 60),
      shuffle_questions: params['shuffle_questions'] ?? params['shuffleQuestions'] ?? true,
      shuffle_options: params['shuffle_options'] ?? params['shuffleOptions'] ?? true,
      show_results_immediately: params['show_results_immediately'] ?? params['showResultsImmediately'] ?? true,
      show_correct_answers: params['show_correct_answers'] ?? params['showCorrectAnswers'] ?? true,
    });

    const data = {
      preview_token: preview.token,
      preview_kind: preview.kind,
      quiz_id: existingQuizId || undefined,
      lesson_id: lessonId,
      quiz_title: title,
      apply_action: 'assessment.apply_quiz_commit',
      question_count: questionIds.length,
      summary: `${summary} Review the LMS preview panel before committing it.`,
      target_label: title,
      quiz_plan: {
        mode: existingQuizId ? 'update' : 'create',
        title,
        description: this.normalizeString(params['description']) || '',
        question_count: questionIds.length,
        time_limit_minutes: Number(params['time_limit_minutes'] || params['timeLimitMinutes'] || 30),
        max_attempts: Number(params['max_attempts'] || params['maxAttempts'] || 1),
        passing_score: Number(params['passing_score'] || params['passingScore'] || 60),
      },
    };
    this.announceOperatorPreview(preview, data);

    return {
      success: true,
      data,
    };
  }

  private async applyQuizCommit(
    params: Record<string, unknown>,
  ): Promise<{ success: boolean; data: Record<string, unknown> }> {
    const previewToken = this.normalizeString(params['preview_token']);
    if (!previewToken) {
      throw new Error('Missing preview_token for quiz apply');
    }

    const preview = this.requirePreview(previewToken, 'quiz_commit');
    this.requireHostApproval(preview, this.normalizeString(params['approval_token'] || params['approvalToken']));
    const payload = preview.payload;
    const lessonId = String(payload['lesson_id'] || '').trim();
    if (!lessonId) {
      throw new Error('Quiz preview is missing lesson context');
    }

    let quizId = String(payload['quiz_id'] || '').trim();
    const questionIds = Array.isArray(payload['question_ids'])
      ? payload['question_ids'].map((item) => String(item))
      : [];

    if (quizId) {
      await firstValueFrom(this.quizApi.updateQuizSettings(quizId, {
        title: String(payload['title'] || '').trim() || undefined,
        timeLimitMinutes: Number(payload['time_limit_minutes'] || 30),
        maxAttempts: Number(payload['max_attempts'] || 1),
        passingScore: Number(payload['passing_score'] || 60),
        shuffleQuestions: Boolean(payload['shuffle_questions'] ?? true),
        shuffleOptions: Boolean(payload['shuffle_options'] ?? true),
        showResultsImmediately: Boolean(payload['show_results_immediately'] ?? true),
        showCorrectAnswers: Boolean(payload['show_correct_answers'] ?? true),
      }));
      if (questionIds.length > 0) {
        await firstValueFrom(this.quizApi.updateQuizQuestions(quizId, { questionIds }));
      }
    } else {
      const created = await firstValueFrom(this.quizApi.createLessonQuizV3(lessonId, {
        title: String(payload['title'] || '').trim() || 'Quiz moi',
        description: String(payload['description'] || '').trim() || '',
        timeLimitMinutes: Number(payload['time_limit_minutes'] || 30),
        maxAttempts: Number(payload['max_attempts'] || 1),
        passingScore: Number(payload['passing_score'] || 60),
        shuffleQuestions: Boolean(payload['shuffle_questions'] ?? true),
        shuffleOptions: Boolean(payload['shuffle_options'] ?? true),
        showResultsImmediately: Boolean(payload['show_results_immediately'] ?? true),
        showCorrectAnswers: Boolean(payload['show_correct_answers'] ?? true),
        questionIds,
        publishImmediately: false,
      }));
      quizId = String((created as any)?.id || '').trim();
    }
    this.pendingOperatorPreviews.delete(previewToken);

    return {
      success: true,
      data: {
        applied: true,
        quiz_id: quizId,
        lesson_id: lessonId,
        quiz_title: String(payload['title'] || quizId).trim() || quizId,
        question_count: questionIds.length,
        summary: `Committed quiz changes for lesson ${lessonId}.`,
      },
    };
  }

  private async previewQuizPublish(
    params: Record<string, unknown>,
  ): Promise<{ success: boolean; data: Record<string, unknown> }> {
    const lessonId = this.resolveCurrentLessonId(params);
    const quizId = await this.resolveQuizIdForLesson(
      lessonId,
      this.normalizeString(params['quiz_id']) || this.normalizeString(params['quizId']),
    );
    const quiz = await firstValueFrom(this.quizApi.getQuizById(quizId));
    const title = String((quiz as any)?.title || quizId).trim();
    const summary = `Quiz publish preview ready for "${title}". Confirm explicitly when you want me to publish it.`;
    const preview = this.rememberPreview('quiz_publish', summary, {
      quiz_id: quizId,
      lesson_id: lessonId,
      title,
    });

    const data = {
      preview_token: preview.token,
      preview_kind: preview.kind,
      quiz_id: quizId,
      lesson_id: lessonId,
      quiz_title: title,
      apply_action: 'publish.apply_quiz',
      summary,
      target_label: title,
      publish_plan: {
        quiz_id: quizId,
        lesson_id: lessonId,
        title,
        status: String((quiz as any)?.status || '').trim() || undefined,
      },
    };
    this.announceOperatorPreview(preview, data);

    return {
      success: true,
      data,
    };
  }

  private async applyQuizPublish(
    params: Record<string, unknown>,
  ): Promise<{ success: boolean; data: Record<string, unknown> }> {
    const previewToken = this.normalizeString(params['preview_token']);
    if (!previewToken) {
      throw new Error('Missing preview_token for quiz publish');
    }

    const preview = this.requirePreview(previewToken, 'quiz_publish');
    this.requireHostApproval(preview, this.normalizeString(params['approval_token'] || params['approvalToken']));
    const quizId = String(preview.payload['quiz_id'] || '').trim();
    if (!quizId) {
      throw new Error('Quiz publish preview is missing quiz_id');
    }

    await firstValueFrom(this.quizApi.publishQuiz(quizId));
    this.pendingOperatorPreviews.delete(previewToken);
    return {
      success: true,
      data: {
        published: true,
        quiz_id: quizId,
        lesson_id: String(preview.payload['lesson_id'] || '').trim() || undefined,
        quiz_title: String(preview.payload['title'] || quizId).trim() || quizId,
        summary: `Published quiz ${quizId}.`,
      },
    };
  }

  private dispatchSidebarAction(action: string, courseId?: string | null): { success: boolean; data: { opened: boolean; action: string } } {
    window.dispatchEvent(new CustomEvent('wiii:open-sidebar', {
      detail: {
        action,
        courseId: courseId || this.lastContext?.course_id,
      },
    }));
    return { success: true, data: { opened: true, action } };
  }

  // ── Wiii Pointy V1 handlers (vendored — see fe/src/app/features/ai-chat/infrastructure/pointy) ──

  private handlePointyHighlight(
    params: HighlightParams,
  ): { success: boolean; data?: Record<string, unknown>; error?: string } {
    const selector = String(params?.selector || '').trim();
    if (!selector) {
      return { success: false, error: 'missing_selector' };
    }
    const target = resolvePointySelector(selector);
    if (!target) {
      return { success: false, error: `selector_not_found:${selector}` };
    }
    if (typeof (target as HTMLElement).scrollIntoView === 'function') {
      (target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    moveCursorToRect(target.getBoundingClientRect(), { duration_ms: 600 });
    showSpotlight(target, {
      message: params.message,
      duration_ms: params.duration_ms,
    });
    return {
      success: true,
      data: { summary: `Đã trỏ vào ${describeTarget(target)}` },
    };
  }

  private handlePointyScrollTo(
    params: ScrollToParams,
  ): { success: boolean; data?: Record<string, unknown>; error?: string } {
    const selector = String(params?.selector || '').trim();
    if (!selector) {
      return { success: false, error: 'missing_selector' };
    }
    const target = resolvePointySelector(selector);
    if (!target) {
      return { success: false, error: `selector_not_found:${selector}` };
    }
    if (typeof (target as HTMLElement).scrollIntoView === 'function') {
      (target as HTMLElement).scrollIntoView({
        behavior: 'smooth',
        block: params.block || 'center',
      });
    }
    return {
      success: true,
      data: { summary: `Đã cuộn tới ${describeTarget(target)}` },
    };
  }

  private async handlePointyShowTour(
    params: ShowTourParams,
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    const rawSteps = Array.isArray(params?.steps) ? params.steps : [];
    const steps: TourStep[] = rawSteps.filter(
      (step): step is TourStep =>
        !!step && typeof step.selector === 'string' && typeof step.message === 'string',
    );
    if (steps.length === 0) {
      return { success: false, error: 'invalid_tour_steps' };
    }
    const result = await runTour(steps, {
      startAt: params.start_at,
      resolveSelector: (selector) => resolvePointySelector(selector),
    });
    // Defensive cleanup if the tour completed without a follow-up call.
    if (result.completed_steps === result.total_steps && !result.cancelled) {
      hideSpotlight();
      hideCursor();
    }
    return {
      success: true,
      data: {
        summary: `Tour ${result.completed_steps}/${result.total_steps} bước.`,
        completed_steps: result.completed_steps,
        total_steps: result.total_steps,
        missing_selectors: result.missing_selectors,
        cancelled: result.cancelled,
      },
    };
  }

  private handlePointyClick(
    params: ClickParams,
  ): { success: boolean; data?: Record<string, unknown>; error?: string } {
    const selector = String(params?.selector || '').trim();
    if (!selector) {
      return { success: false, error: 'missing_selector' };
    }
    const target = resolvePointySelector(selector);
    if (!target) {
      return { success: false, error: `selector_not_found:${selector}` };
    }
    if (!(target instanceof HTMLElement) || target.getAttribute('data-wiii-click-safe') !== 'true') {
      return { success: false, error: `unsafe_click_target:${selector}` };
    }
    if (
      target.hasAttribute('disabled')
      || target.getAttribute('aria-disabled') === 'true'
      || (target instanceof HTMLButtonElement && target.disabled)
    ) {
      return { success: false, error: `disabled_click_target:${selector}` };
    }
    if (!target.isConnected || !this.isVisiblePointyTarget(target)) {
      return { success: false, error: `target_not_visible:${selector}` };
    }
    if (typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    moveCursorToRect(target.getBoundingClientRect(), { duration_ms: 260 });
    showSpotlight(target, {
      message: params.message || 'Wiii đang mở mục này cho bạn.',
      duration_ms: 900,
    });
    target.click();
    return {
      success: true,
      data: {
        summary: `Đã bấm ${describeTarget(target)}`,
        clicked: true,
        click_kind: target.getAttribute('data-wiii-click-kind') || 'safe',
      },
    };
  }

  private isVisiblePointyTarget(target: HTMLElement): boolean {
    if (typeof window === 'undefined') {
      return true;
    }
    const style = window.getComputedStyle(target);
    return style.display !== 'none'
      && style.visibility !== 'hidden'
      && style.opacity !== '0';
  }

  private async handleActionRequest(
    action: string,
    params: Record<string, unknown>,
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    switch (action) {
      case 'capture_screenshot':
        return this.captureScreenshot(String(params['selector'] || 'main'));
      case POINTY_ACTION_HIGHLIGHT:
        return this.handlePointyHighlight(params as unknown as HighlightParams);
      case POINTY_ACTION_SCROLL_TO:
        return this.handlePointyScrollTo(params as unknown as ScrollToParams);
      case POINTY_ACTION_SHOW_TOUR:
        return this.handlePointyShowTour(params as unknown as ShowTourParams);
      case POINTY_ACTION_CLICK:
        return this.handlePointyClick(params as unknown as ClickParams);
      case 'navigation.go_to': {
        const target = String(params['target'] || '').trim();
        const route = String(params['route'] || '').trim();
        const url = String(params['url'] || '').trim();
        const semanticTarget = target || (this.isSemanticNavigationTarget(route) ? route : '');
        if (semanticTarget) {
          const navigated = this.navigateByTarget(semanticTarget);
          if (navigated) {
            return { success: true, data: { navigated: true, target: semanticTarget } };
          }
          throw new Error(`Unsupported navigation target: ${semanticTarget}`);
        }

        const destination = url || route;
        if (destination) {
          await this.router.navigateByUrl(destination);
          return { success: true, data: { navigated: true, url: destination } };
        }

        throw new Error('Missing route');
      }
      case 'navigation.open_course_editor_tab': {
        const courseId = String(params['courseId'] || this.lastContext?.course_id || '').trim();
        const tab = String(params['tab'] || 'curriculum').trim() || 'curriculum';
        if (!courseId) throw new Error('Missing courseId');
        await this.router.navigate(['/teacher/courses', courseId, 'editor', tab]);
        return { success: true, data: { navigated: true, tab } };
      }
      case 'authoring.generate_course_from_document': {
        if (params['course_plan'] || params['coursePlan'] || params['outline'] || params['chapters']) {
          return this.previewCoursePlan(params);
        }
        return this.dispatchSidebarAction('generate_course_from_document', this.resolveCurrentCourseId(params));
      }
      case 'authoring.apply_course_plan':
        return this.applyCoursePlan(params);
      case 'authoring.generate_lesson':
        return this.dispatchSidebarAction('generate_lesson', String(params['courseId'] || this.lastContext?.course_id || ''));
      case 'authoring.improve_lesson_experience':
        return this.dispatchSidebarAction('improve_lesson_experience', String(params['courseId'] || this.lastContext?.course_id || ''));
      case 'authoring.preview_lesson_patch':
        return this.previewLessonPatch(params);
      case 'authoring.apply_lesson_patch':
        return this.applyLessonPatch(params);
      case 'assessment.create_quiz':
        return this.dispatchSidebarAction('create_quiz', String(params['courseId'] || this.lastContext?.course_id || ''));
      case 'assessment.preview_quiz_commit':
        return this.previewQuizCommit(params);
      case 'assessment.apply_quiz_commit':
        return this.applyQuizCommit(params);
      case 'publish.preview_quiz':
        return this.previewQuizPublish(params);
      case 'publish.apply_quiz':
        return this.applyQuizPublish(params);
      default:
        throw new Error(`Unsupported host action: ${action}`);
    }
  }

  private sendContext(ctx: WiiiPageContext): void {
    if (!this.iframeEl || !this.embedOrigin) return;
    try {
      const shouldApplyTransientPatch =
        !!this.transientContextPatch
        && (ctx.page_type === 'course_editor' || ctx.page_type === 'teacher_course_creation');
      const payload = this.decorateContext(
        shouldApplyTransientPatch
          ? { ...ctx, ...this.transientContextPatch }
          : ctx,
      );

      // Sprint 223: Extract structured page data for rich AI context
      const structured: PageStructuredData = this.pageDataExtractor.extract(payload.page_type);
      const hydratedPayload = this.hydrateStructuredContext(payload, structured);

      this.iframeEl.contentWindow?.postMessage(
        {
          type: 'wiii:page-context',
          payload: {
            ...hydratedPayload,
            structured, // Sprint 223: rich page data
          },
        },
        this.embedOrigin,
      );
      if (this.transientContextPatch?.action) {
        this.transientContextPatch = null;
      }
    } catch {
      // Iframe may not be ready — silently ignore
    }
  }

  private hydrateStructuredContext(
    payload: WiiiPageContext,
    structured: PageStructuredData,
  ): WiiiPageContext {
    if (!structured) {
      return payload;
    }

    switch (structured._type) {
      case 'assignment':
        {
          const assignmentSummary = this.buildAssignmentContextSummary(structured);
        return {
          ...payload,
          page_title: this.preferSpecificTitle(payload.page_title, structured.title, ['lam_bai_tap']),
          course_name: payload.course_name || structured.course_name || undefined,
          content_snippet:
            payload.content_snippet
            || this.buildSnippet(assignmentSummary),
          assignment_description:
            payload.assignment_description
            || this.buildSnippet(assignmentSummary),
        };
        }
      case 'lesson':
        return {
          ...payload,
          page_title: this.preferSpecificTitle(payload.page_title, structured.lesson_title, ['bai_hoc']),
          course_name: payload.course_name || structured.course_name || undefined,
          lesson_name: payload.lesson_name || structured.lesson_title || undefined,
          chapter_name: payload.chapter_name || structured.chapter_name || undefined,
          content_snippet:
            payload.content_snippet
            || this.buildSnippet(structured.content_text || structured.lesson_title),
        };
      case 'quiz_result':
        {
          const quizSummary = this.buildQuizResultContextSummary(structured);
          const firstQuestion = structured.questions[0];
          return {
            ...payload,
            page_title: this.preferSpecificTitle(
              payload.page_title,
              structured.quiz_title,
              ['bai_kiem_tra', 'ket_qua_bai_kiem_tra'],
            ),
            content_type: payload.content_type || 'quiz_result',
            content_snippet: payload.content_snippet || this.buildSnippet(quizSummary, 1600),
            quiz_question: payload.quiz_question || firstQuestion?.question_text || undefined,
          };
        }
      case 'course_overview':
        return {
          ...payload,
          page_title: this.preferSpecificTitle(
            payload.page_title,
            structured.course_name,
            ['tong_quan_khoa_hoc'],
          ),
          course_name: payload.course_name || structured.course_name || undefined,
        };
      default:
        return payload;
    }
  }

  private buildSnippet(value: string | undefined, maxLength = 1200): string | undefined {
    const normalized = String(value || '').replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return undefined;
    }
    if (normalized.length <= maxLength) {
      return normalized;
    }
    return `${normalized.slice(0, maxLength - 3).trim()}...`;
  }

  private buildAssignmentContextSummary(structured: Extract<PageStructuredData, { _type: 'assignment' }>): string {
    const parts = [
      structured.title ? `Bai tap: ${structured.title}` : '',
      structured.course_name ? `Mon hoc: ${structured.course_name}` : '',
      structured.due_date ? `Han nop: ${structured.due_date}` : '',
      structured.status ? `Trang thai: ${structured.status}` : '',
      structured.max_score !== undefined ? `Diem toi da: ${structured.max_score}` : '',
      structured.instructions ? `Yeu cau va huong dan: ${structured.instructions}` : '',
    ];
    return parts.filter((part) => part.length > 0).join('\n');
  }

  private buildQuizResultContextSummary(
    structured: Extract<PageStructuredData, { _type: 'quiz_result' }>,
  ): string {
    const parts = [
      structured.quiz_title ? `Ket qua quiz: ${structured.quiz_title}` : '',
      structured.score !== null && structured.max_score !== null
        ? `Diem: ${structured.score}/${structured.max_score} (${structured.score_percent}%)`
        : '',
      structured.passing_score !== null ? `Moc dat: ${structured.passing_score}%` : '',
      structured.passed === true ? 'Trang thai: Dat yeu cau' : '',
      structured.passed === false ? 'Trang thai: Chua dat' : '',
      structured.total_questions ? `Tong so cau: ${structured.total_questions}` : '',
      structured.correct_answers || structured.incorrect_answers
        ? `Ket qua tung cau: ${structured.correct_answers} dung, ${structured.incorrect_answers} sai`
        : '',
    ];

    const questionLines = structured.questions.slice(0, 3).map((question) => {
      const details = [
        question.question_text ? `Cau ${question.index}: ${question.question_text}` : '',
        question.selected_option ? `Ban chon: ${question.selected_option}` : '',
        question.correct_option ? `Dap an dung: ${question.correct_option}` : '',
      ].filter((value) => value.length > 0);
      return details.join(' | ');
    });

    return [...parts, ...questionLines]
      .filter((value) => value.length > 0)
      .join('\n');
  }

  private preferSpecificTitle(
    current: string | undefined,
    candidate: string | undefined,
    genericFallbacks: string[],
  ): string | undefined {
    const next = String(candidate || '').trim();
    if (!next) {
      return current;
    }

    const currentTitle = String(current || '').trim();
    const normalizedCurrent = this.normalizeNavigationTarget(currentTitle);
    if (
      !currentTitle
      || currentTitle === 'LMS'
      || genericFallbacks.includes(normalizedCurrent)
    ) {
      return next;
    }

    return currentTitle;
  }

  private navigateByTarget(target: string): boolean {
    const normalized = this.normalizeNavigationTarget(target);

    if (normalized === 'next_lesson' || normalized === 'next') {
      return this.clickButtonByText(['Bai tiep theo']);
    }

    if (normalized === 'previous_lesson' || normalized === 'previous' || normalized === 'back') {
      return this.clickButtonByText(['Bai truoc']);
    }

    return false;
  }

  private isSemanticNavigationTarget(value: string): boolean {
    const normalized = this.normalizeNavigationTarget(value);
    return ['next_lesson', 'next', 'previous_lesson', 'previous', 'back'].includes(normalized);
  }

  private clickButtonByText(candidates: string[]): boolean {
    const button = Array.from(document.querySelectorAll('button[data-wiii-click-safe="true"]')).find((node) => {
      if (node.getAttribute('data-wiii-click-kind') !== 'navigation') {
        return false;
      }
      const text = this.normalizeNavigationTarget(node.textContent || '');
      return candidates.some((candidate) => text.includes(this.normalizeNavigationTarget(candidate)));
    });

    if (!button || !(button instanceof HTMLButtonElement)) {
      return false;
    }

    button.click();
    return true;
  }

  private normalizeNavigationTarget(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private resolveEmbedOrigin(): string | null {
    try {
      return new URL(environment.wiiiEmbedUrl).origin;
    } catch {
      return null;
    }
  }
}
