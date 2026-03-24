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
  let routerEvents$: Subject<unknown>;

  beforeEach(() => {
    routerEvents$ = new Subject<unknown>();

    TestBed.configureTestingModule({
      providers: [
        WiiiContextService,
        CurriculumSelectionService,
        {
          provide: Router,
          useValue: {
            url: '/teacher/courses/course-1/editor/curriculum',
            events: routerEvents$.asObservable(),
            navigate: jasmine.createSpy('navigate').and.resolveTo(true),
            navigateByUrl: jasmine.createSpy('navigateByUrl').and.resolveTo(true),
          },
        },
        {
          provide: PageDataExtractorService,
          useValue: {
            extract: jasmine.createSpy('extract').and.returnValue({}),
          },
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
});
