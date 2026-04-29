import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { WiiiContextService } from './wiii-context.service';
import { PageDataExtractorService } from './page-data-extractor.service';
import { AuthService } from '../../../../core/services/auth.service';
import { LessonApi } from '../../../../api/client/lesson.api';
import { QuizApi } from '../../../../api/endpoints/quiz.api';
import { CurriculumSelectionService } from '../../../teacher/course-editor/services/curriculum-selection.service';

describe('WiiiContextService - operator preview/apply flows', () => {
  let service: WiiiContextService;
  let lessonApi: jasmine.SpyObj<LessonApi>;
  let quizApi: jasmine.SpyObj<QuizApi>;
  let pageDataExtractor: jasmine.SpyObj<PageDataExtractorService>;
  let router: { url: string; events: Subject<unknown>; navigate: jasmine.Spy; navigateByUrl: jasmine.Spy };
  let routerEvents$: Subject<unknown>;

  beforeEach(() => {
    routerEvents$ = new Subject<unknown>();
    router = {
      url: '/teacher/courses/course-1/editor/curriculum',
      events: routerEvents$,
      navigate: jasmine.createSpy('navigate').and.resolveTo(true),
      navigateByUrl: jasmine.createSpy('navigateByUrl').and.resolveTo(true),
    };
    pageDataExtractor = jasmine.createSpyObj<PageDataExtractorService>('PageDataExtractorService', ['extract']);
    pageDataExtractor.extract.and.returnValue(null);

    TestBed.configureTestingModule({
      providers: [
        WiiiContextService,
        CurriculumSelectionService,
        {
          provide: Router,
          useValue: {
            url: router.url,
            events: router.events.asObservable(),
            navigate: router.navigate,
            navigateByUrl: router.navigateByUrl,
          },
        },
        {
          provide: PageDataExtractorService,
          useValue: pageDataExtractor,
        },
        {
          provide: AuthService,
          useValue: {
            getCurrentUser: () => ({ id: 'teacher-1', role: 'teacher', organizationId: 'org-1' }),
            currentUser: () => ({ id: 'teacher-1', role: 'teacher', organizationId: 'org-1' }),
          },
        },
        {
          provide: LessonApi,
          useValue: jasmine.createSpyObj<LessonApi>('LessonApi', ['getLessonById', 'updateLesson']),
        },
        {
          provide: QuizApi,
          useValue: jasmine.createSpyObj<QuizApi>('QuizApi', [
            'resolveQuizIdByLessonId',
            'getQuizById',
            'updateQuizSettings',
            'updateQuizQuestions',
            'createLessonQuizV3',
            'publishQuiz',
          ]),
        },
        {
          provide: PLATFORM_ID,
          useValue: 'browser',
        },
      ],
    });

    service = TestBed.inject(WiiiContextService);
    lessonApi = TestBed.inject(LessonApi) as jasmine.SpyObj<LessonApi>;
    quizApi = TestBed.inject(QuizApi) as jasmine.SpyObj<QuizApi>;

    routerEvents$.next(new NavigationEnd(1, '/teacher/courses/course-1/editor/curriculum', '/teacher/courses/course-1/editor/curriculum'));
  });

  it('previews and applies a lesson patch through the host action flow', async () => {
    lessonApi.getLessonById.and.returnValue(of({
      data: {
        id: 'lesson-1',
        title: 'Bai hoc goc',
        description: 'Mo ta cu',
        content: 'Noi dung cu',
        courseId: 'course-1',
        sectionId: 'chapter-1',
        lessonType: 'LECTURE',
        durationMinutes: 15,
        orderIndex: 2,
        isRequired: true,
      },
    } as any));
    lessonApi.updateLesson.and.returnValue(of({ success: true } as any));

    const preview = await (service as any).handleActionRequest('authoring.preview_lesson_patch', {
      lesson_id: 'lesson-1',
      title: 'Bai hoc moi',
      content: 'Noi dung da chinh sua',
    });

    expect(preview.success).toBeTrue();
    expect(preview.data?.preview_kind).toBe('lesson_patch');
    expect(preview.data?.apply_action).toBe('authoring.apply_lesson_patch');
    expect(preview.data?.lesson_title).toBe('Bai hoc goc');
    expect(preview.data?.changed_fields).toEqual(['title', 'content']);
    expect(preview.data?.lesson_before).toEqual(jasmine.objectContaining({
      title: 'Bai hoc goc',
      description: 'Mo ta cu',
      content_excerpt: 'Noi dung cu',
      blocks: jasmine.any(Array),
    }));
    expect(preview.data?.lesson_after).toEqual(jasmine.objectContaining({
      title: 'Bai hoc moi',
      description: 'Mo ta cu',
      content_excerpt: 'Noi dung da chinh sua',
      blocks: jasmine.any(Array),
    }));
    expect(preview.data?.block_diff).toEqual(jasmine.objectContaining({
      added: 0,
      removed: 0,
      changed: 1,
      unchanged: 0,
      items: jasmine.any(Array),
    }));

    const applied = await (service as any).handleActionRequest('authoring.apply_lesson_patch', {
      preview_token: preview.data?.preview_token,
    });

    expect(applied.success).toBeTrue();
    expect(lessonApi.updateLesson).toHaveBeenCalledWith('lesson-1', jasmine.objectContaining({
      courseId: 'course-1',
      chapterId: 'chapter-1',
      title: 'Bai hoc moi',
      content: 'Noi dung da chinh sua',
    }));
  });

  it('previews and commits a new quiz through the host action flow', async () => {
    quizApi.resolveQuizIdByLessonId.and.returnValue(throwError(() => new Error('quiz not found')));
    quizApi.createLessonQuizV3.and.returnValue(of({
      id: 'quiz-1',
      title: 'Quiz tieng Trung',
    } as any));

    const preview = await (service as any).handleActionRequest('assessment.preview_quiz_commit', {
      lesson_id: 'lesson-1',
      title: 'Quiz tieng Trung',
      description: '30 cau hoi luyen tap',
      question_ids: ['q1', 'q2', 'q3'],
      time_limit_minutes: 20,
      max_attempts: 2,
    });

    expect(preview.success).toBeTrue();
    expect(preview.data?.preview_kind).toBe('quiz_commit');
    expect(preview.data?.apply_action).toBe('assessment.apply_quiz_commit');
    expect(preview.data?.question_count).toBe(3);
    expect(preview.data?.quiz_title).toBe('Quiz tieng Trung');
    expect(preview.data?.quiz_plan).toEqual(jasmine.objectContaining({
      mode: 'create',
      question_count: 3,
      time_limit_minutes: 20,
      max_attempts: 2,
    }));

    const applied = await (service as any).handleActionRequest('assessment.apply_quiz_commit', {
      preview_token: preview.data?.preview_token,
    });

    expect(applied.success).toBeTrue();
    expect(quizApi.createLessonQuizV3).toHaveBeenCalledWith('lesson-1', jasmine.objectContaining({
      title: 'Quiz tieng Trung',
      description: '30 cau hoi luyen tap',
      questionIds: ['q1', 'q2', 'q3'],
      publishImmediately: false,
    }));
    expect(applied.data?.quiz_id).toBe('quiz-1');
  });

  it('previews and publishes an existing quiz through the host action flow', async () => {
    quizApi.resolveQuizIdByLessonId.and.returnValue(of('quiz-9'));
    quizApi.getQuizById.and.returnValue(of({
      id: 'quiz-9',
      title: 'Quiz cuoi chuong',
    } as any));
    quizApi.publishQuiz.and.returnValue(of(undefined));

    const preview = await (service as any).handleActionRequest('publish.preview_quiz', {
      lesson_id: 'lesson-1',
    });

    expect(preview.success).toBeTrue();
    expect(preview.data?.preview_kind).toBe('quiz_publish');
    expect(preview.data?.apply_action).toBe('publish.apply_quiz');
    expect(preview.data?.quiz_id).toBe('quiz-9');
    expect(preview.data?.quiz_title).toBe('Quiz cuoi chuong');
    expect(preview.data?.publish_plan).toEqual(jasmine.objectContaining({
      quiz_id: 'quiz-9',
      lesson_id: 'lesson-1',
      title: 'Quiz cuoi chuong',
    }));

    const published = await (service as any).handleActionRequest('publish.apply_quiz', {
      preview_token: preview.data?.preview_token,
    });

    expect(published.success).toBeTrue();
    expect(quizApi.publishQuiz).toHaveBeenCalledWith('quiz-9');
    expect(published.data?.published).toBeTrue();
  });

  it('adds connector and workspace overlays to host context contracts', () => {
    const context = (service as any).decorateContext({
      page_type: 'course_editor',
      page_title: 'Curriculum',
    });
    const capabilities = (service as any).buildCapabilities(context);

    expect(context.connector_id).toBe('maritime-lms');
    expect(context.host_user_id).toBe('teacher-1');
    expect(context.host_workspace_id).toBe('org-1');
    expect(context.host_organization_id).toBe('org-1');
    expect(capabilities.connector_id).toBe('maritime-lms');
    expect(capabilities.host_workspace_id).toBe('org-1');
    expect(capabilities.host_organization_id).toBe('org-1');
  });

  it('recognizes student task work routes as assignment pages', () => {
    const context = (service as any).extractPageContext('/student/tasks/assignment-1/work');

    expect(context).toEqual(jasmine.objectContaining({
      page_type: 'assignment',
    }));
  });

  it('recognizes quiz result routes as quiz review pages', () => {
    const context = (service as any).extractPageContext('/student/quiz/result?attemptId=quiz-attempt-1');

    expect(context).toEqual(jasmine.objectContaining({
      page_type: 'quiz',
      page_title: 'Kết quả bài kiểm tra',
      content_type: 'quiz_result',
    }));
  });

  it('hydrates assignment snippets with title, status, deadline, and instructions before posting to the iframe', () => {
    pageDataExtractor.extract.and.returnValue({
      _type: 'assignment',
      title: 'Bai tap tinh huong so cuu',
      course_name: 'Ky nang an toan',
      due_date: '2026-04-12T10:00:00Z',
      status: 'IN_PROGRESS',
      instructions: 'Tom tat yeu cau, rubric, va checklist nop bai.',
      max_score: 10,
    });

    const postMessage = jasmine.createSpy('postMessage');
    service.connectIframe({ contentWindow: { postMessage } } as unknown as HTMLIFrameElement);

    (service as any).sendContext({
      page_type: 'assignment',
      page_title: 'LMS',
    });

    expect(postMessage).toHaveBeenCalled();
    const payload = postMessage.calls.mostRecent().args[0].payload;
    expect(payload.page_title).toBe('Bai tap tinh huong so cuu');
    expect(payload.assignment_description).toContain('rubric');
    expect(payload.content_snippet).toContain('Han nop');
    expect(payload.content_snippet).toContain('Trang thai');
    expect(payload.content_snippet).toContain('Diem toi da');
  });

  it('hydrates lesson snippets from structured extraction before posting to the iframe', () => {
    pageDataExtractor.extract.and.returnValue({
      _type: 'lesson',
      course_name: 'Huấn luyện an toàn',
      chapter_name: 'Chương 1',
      lesson_title: 'Bài 1.1: Các loại phương tiện cứu sinh',
      content_text: 'Xuồng cứu sinh là phương tiện ...',
      media_types: [],
      progress: 3,
    });

    const postMessage = jasmine.createSpy('postMessage');
    service.connectIframe({ contentWindow: { postMessage } } as unknown as HTMLIFrameElement);

    (service as any).sendContext({
      page_type: 'lesson',
      page_title: 'Bài học',
      lesson_id: 'lesson-1',
    });

    expect(postMessage).toHaveBeenCalled();
    const payload = postMessage.calls.mostRecent().args[0].payload;
    expect(payload.page_title).toBe('Bài 1.1: Các loại phương tiện cứu sinh');
    expect(payload.lesson_name).toBe('Bài 1.1: Các loại phương tiện cứu sinh');
    expect(payload.chapter_name).toBe('Chương 1');
    expect(payload.content_snippet).toContain('Xuồng cứu sinh');
  });

  it('hydrates quiz result snippets with score and question context before posting to the iframe', () => {
    pageDataExtractor.extract.and.returnValue({
      _type: 'quiz_result',
      quiz_title: 'Quiz theo lop',
      score: 10,
      max_score: 10,
      score_percent: 100,
      passing_score: 70,
      passed: true,
      total_questions: 1,
      correct_answers: 1,
      incorrect_answers: 0,
      show_correct_answers: true,
      questions: [
        {
          index: 1,
          question_text: 'Gio quanh vung ap thap ban cau Bac co xu huong nao?',
          selected_option: 'A',
          correct_option: 'A',
          is_correct: true,
        },
      ],
    });

    const postMessage = jasmine.createSpy('postMessage');
    service.connectIframe({ contentWindow: { postMessage } } as unknown as HTMLIFrameElement);

    (service as any).sendContext({
      page_type: 'quiz',
      page_title: 'Kết quả bài kiểm tra',
      content_type: 'quiz_result',
    });

    expect(postMessage).toHaveBeenCalled();
    const payload = postMessage.calls.mostRecent().args[0].payload;
    expect(payload.page_title).toBe('Quiz theo lop');
    expect(payload.content_type).toBe('quiz_result');
    expect(payload.content_snippet).toContain('Diem: 10/10 (100%)');
    expect(payload.content_snippet).toContain('Cau 1: Gio quanh vung ap thap ban cau Bac co xu huong nao?');
    expect(payload.quiz_question).toBe('Gio quanh vung ap thap ban cau Bac co xu huong nao?');
  });

  it('supports semantic next_lesson navigation targets', async () => {
    const button = document.createElement('button');
    button.textContent = 'Bài tiếp theo';
    button.textContent = 'Bai tiep theo';
    const clickSpy = spyOn(button, 'click');
    document.body.appendChild(button);

    try {
      const result = await (service as any).handleActionRequest('navigation.go_to', {
        target: 'next_lesson',
      });

      expect(result.success).toBeTrue();
      expect(clickSpy).toHaveBeenCalled();
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    } finally {
      button.remove();
    }
  });
  it('treats symbolic route values like next_lesson as semantic navigation targets', async () => {
    const button = document.createElement('button');
    button.textContent = 'BÃ i tiáº¿p theo';
    button.textContent = 'Bai tiep theo';
    const clickSpy = spyOn(button, 'click');
    document.body.appendChild(button);

    try {
      const result = await (service as any).handleActionRequest('navigation.go_to', {
        route: 'next_lesson',
      });

      expect(result.success).toBeTrue();
      expect(clickSpy).toHaveBeenCalled();
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    } finally {
      button.remove();
    }
  });

  // ── Wiii Pointy V1 — read-only tutor primitives ──

  describe('Wiii Pointy actions', () => {
    afterEach(() => {
      // Clean up any cursor / overlay nodes injected by handlers.
      for (const id of [
        'wiii-pointy-cursor',
        'wiii-pointy-overlay',
        'wiii-pointy-tooltip',
      ]) {
        const node = document.getElementById(id);
        node?.remove();
      }
      document.querySelectorAll('[data-wiii-test]').forEach((el) => el.remove());
    });

    it('ui.highlight succeeds when the selector resolves and reports describeTarget', async () => {
      const target = document.createElement('button');
      target.setAttribute('data-wiii-id', 'continue-lesson');
      target.setAttribute('data-wiii-test', 'pointy');
      target.textContent = 'Tiếp tục học';
      document.body.appendChild(target);

      const result = await (service as any).handleActionRequest('ui.highlight', {
        selector: '[data-wiii-id="continue-lesson"]',
        message: 'Đây là nút tiếp tục.',
        duration_ms: 1500,
      });

      expect(result.success).toBeTrue();
      expect(result.data?.summary).toContain('continue-lesson');
      // The cursor SVG must have been mounted by the handler.
      expect(document.getElementById('wiii-pointy-cursor')).not.toBeNull();
      expect(document.getElementById('wiii-pointy-overlay')).not.toBeNull();
    });

    it('ui.highlight fails closed when the selector is missing', async () => {
      const result = await (service as any).handleActionRequest('ui.highlight', {
        selector: '[data-wiii-id="nope"]',
      });
      expect(result.success).toBeFalse();
      expect(result.error).toContain('selector_not_found');
    });

    it('ui.scroll_to invokes scrollIntoView on the resolved target', async () => {
      const target = document.createElement('section');
      target.setAttribute('data-wiii-id', 'profile-card');
      target.setAttribute('data-wiii-test', 'pointy');
      document.body.appendChild(target);
      const spy = spyOn(target, 'scrollIntoView');

      const result = await (service as any).handleActionRequest('ui.scroll_to', {
        selector: '[data-wiii-id="profile-card"]',
        block: 'center',
      });

      expect(result.success).toBeTrue();
      expect(spy).toHaveBeenCalled();
    });

    it('ui.show_tour completes all steps with present selectors and reports counters', async () => {
      const a = document.createElement('div');
      a.setAttribute('data-wiii-id', 'tour-a');
      a.setAttribute('data-wiii-test', 'pointy');
      a.style.height = '20px';
      const b = document.createElement('div');
      b.setAttribute('data-wiii-id', 'tour-b');
      b.setAttribute('data-wiii-test', 'pointy');
      b.style.height = '20px';
      document.body.appendChild(a);
      document.body.appendChild(b);

      const result = await (service as any).handleActionRequest('ui.show_tour', {
        steps: [
          { selector: '[data-wiii-id="tour-a"]', message: 'A', duration_ms: 5 },
          { selector: '[data-wiii-id="tour-b"]', message: 'B', duration_ms: 5 },
        ],
      });

      expect(result.success).toBeTrue();
      expect(result.data?.completed_steps).toBe(2);
      expect(result.data?.total_steps).toBe(2);
      expect(result.data?.cancelled).toBeFalse();
      expect(result.data?.missing_selectors).toEqual([]);
    });

    it('ui.show_tour collects missing selectors without aborting', async () => {
      const present = document.createElement('div');
      present.setAttribute('data-wiii-id', 'tour-present');
      present.setAttribute('data-wiii-test', 'pointy');
      document.body.appendChild(present);

      const result = await (service as any).handleActionRequest('ui.show_tour', {
        steps: [
          { selector: '[data-wiii-id="tour-present"]', message: 'p', duration_ms: 5 },
          { selector: '[data-wiii-id="tour-missing"]', message: 'm', duration_ms: 5 },
        ],
      });

      expect(result.success).toBeTrue();
      expect(result.data?.completed_steps).toBe(1);
      expect(result.data?.missing_selectors).toEqual(['[data-wiii-id="tour-missing"]']);
    });

    it('ui.show_tour rejects an empty / malformed steps array', async () => {
      const result = await (service as any).handleActionRequest('ui.show_tour', {
        steps: [],
      });
      expect(result.success).toBeFalse();
      expect(result.error).toBe('invalid_tour_steps');
    });
  });
});
