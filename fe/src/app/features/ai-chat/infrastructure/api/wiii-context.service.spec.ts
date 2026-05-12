import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { WiiiContextService } from './wiii-context.service';
import { PageDataExtractorService } from './page-data-extractor.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ChapterApi } from '../../../../api/client/chapter.api';
import { LessonApi } from '../../../../api/client/lesson.api';
import { SectionApi } from '../../../../api/client/section.api';
import { QuizApi } from '../../../../api/endpoints/quiz.api';
import { CourseEditorStore } from '../../../teacher/course-editor/store/course-editor.store';
import { CurriculumSelectionService } from '../../../teacher/course-editor/services/curriculum-selection.service';

describe('WiiiContextService - operator preview/apply flows', () => {
  let service: WiiiContextService;
  let chapterApi: jasmine.SpyObj<ChapterApi>;
  let lessonApi: jasmine.SpyObj<LessonApi>;
  let sectionApi: jasmine.SpyObj<SectionApi>;
  let quizApi: jasmine.SpyObj<QuizApi>;
  let courseEditorStore: jasmine.SpyObj<CourseEditorStore>;
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
    courseEditorStore = jasmine.createSpyObj<CourseEditorStore>('CourseEditorStore', [
      'courseTree',
      'addChapterLocal',
      'addLessonLocal',
      'invalidateCache',
      'loadCourse',
    ]);
    courseEditorStore.courseTree.and.returnValue({ id: 'course-1', chapters: [] } as any);

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
          provide: ChapterApi,
          useValue: jasmine.createSpyObj<ChapterApi>('ChapterApi', ['createChapter']),
        },
        {
          provide: LessonApi,
          useValue: jasmine.createSpyObj<LessonApi>('LessonApi', ['getLessonById', 'updateLesson', 'createLesson']),
        },
        {
          provide: SectionApi,
          useValue: jasmine.createSpyObj<SectionApi>('SectionApi', ['updateSection']),
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
        {
          provide: CourseEditorStore,
          useValue: courseEditorStore,
        },
      ],
    });

    service = TestBed.inject(WiiiContextService);
    chapterApi = TestBed.inject(ChapterApi) as jasmine.SpyObj<ChapterApi>;
    lessonApi = TestBed.inject(LessonApi) as jasmine.SpyObj<LessonApi>;
    sectionApi = TestBed.inject(SectionApi) as jasmine.SpyObj<SectionApi>;
    quizApi = TestBed.inject(QuizApi) as jasmine.SpyObj<QuizApi>;

    routerEvents$.next(new NavigationEnd(1, '/teacher/courses/course-1/editor/curriculum', '/teacher/courses/course-1/editor/curriculum'));
  });

  it('previews and applies a lesson patch through the host action flow', async () => {
    let previewedContent = '';
    let lessonReadCount = 0;
    lessonApi.getLessonById.and.callFake(() => {
      lessonReadCount += 1;
      return of({
        data: {
          id: 'lesson-1',
          title: lessonReadCount === 1 ? 'Bai hoc goc' : 'Bai hoc moi',
          description: 'Mo ta cu',
          content: lessonReadCount === 1 ? 'Noi dung cu' : previewedContent,
          courseId: 'course-1',
          sectionId: 'chapter-1',
          lessonType: 'LECTURE',
          durationMinutes: 15,
          orderIndex: 2,
          isRequired: true,
        },
      } as any);
    });
    lessonApi.updateLesson.and.returnValue(of({ success: true } as any));

    let panelPreview: any;
    const previewSub = service.operatorPreview$.subscribe((previewPanel) => {
      panelPreview = previewPanel;
    });
    const proposedContent = [
      '# Bài học mới',
      '## Mục tiêu học tập',
      '- Giáo viên kiểm tra diff trước khi áp dụng',
      '- Giáo viên đối chiếu citation với tài liệu gốc',
      '## Nội dung',
      'Nội dung đã chỉnh sửa',
    ].join('\n');
    previewedContent = proposedContent;
    const preview = await (service as any).handleActionRequest('authoring.preview_lesson_patch', {
      lesson_id: 'lesson-1',
      title: 'Bai hoc moi',
      content: proposedContent,
      source_references: [{ kind: 'chapter', page_start: 2, page_end: 3, excerpt: 'Nguon tai lieu' }],
    });
    previewSub.unsubscribe();

    expect(preview.success).toBeTrue();
    expect(preview.data?.preview_kind).toBe('lesson_patch');
    expect(preview.data?.apply_action).toBe('authoring.apply_lesson_patch');
    expect(preview.data?.lesson_title).toBe('Bai hoc goc');
    expect(preview.data?.proposed_lesson_title).toBe('Bai hoc moi');
    expect(preview.data?.target_label).toBe('Bai hoc moi');
    expect(String(preview.data?.summary)).toContain('Bai hoc moi');
    expect(String(preview.data?.summary)).not.toContain('Bai hoc goc"');
    expect(String(preview.data?.summary)).not.toContain('..');
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
      content_excerpt: jasmine.stringContaining('Bài học mới'),
      content_preview: jasmine.stringContaining('## Mục tiêu học tập'),
      learning_objectives: [
        'Giáo viên kiểm tra diff trước khi áp dụng',
        'Giáo viên đối chiếu citation với tài liệu gốc',
      ],
      blocks: jasmine.any(Array),
    }));
    expect(preview.data?.block_diff).toEqual(jasmine.objectContaining({
      added: 0,
      removed: 0,
      changed: 1,
      unchanged: 0,
      items: jasmine.any(Array),
    }));
    expect(preview.data?.source_references).toEqual([
      jasmine.objectContaining({ kind: 'chapter', page_start: 2, page_end: 3, excerpt: 'Nguon tai lieu' }),
    ]);
    expect(panelPreview).toEqual(jasmine.objectContaining({
      token: preview.data?.preview_token,
      kind: 'lesson_patch',
      targetLabel: 'Bai hoc moi',
      sourceReferences: [jasmine.objectContaining({ page_start: 2 })],
    }));

    await expectAsync((service as any).handleActionRequest('authoring.apply_lesson_patch', {
      preview_token: preview.data?.preview_token,
    })).toBeRejectedWithError(/host_preview_approval_required/);
    expect(lessonApi.updateLesson).not.toHaveBeenCalled();

    const applied = await service.approveOperatorPreview(String(preview.data?.preview_token));

    expect(applied.success).toBeTrue();
    expect(lessonApi.updateLesson).toHaveBeenCalledWith('lesson-1', jasmine.objectContaining({
      courseId: 'course-1',
      chapterId: 'chapter-1',
      title: 'Bai hoc moi',
      content: proposedContent,
    }), jasmine.objectContaining({
      headers: jasmine.anything(),
    }));
    expect(lessonApi.getLessonById).toHaveBeenCalledWith('lesson-1', jasmine.objectContaining({
      headers: jasmine.anything(),
    }));
    expect(applied.data?.['verified']).toBeTrue();
  });

  it('applies content patches to the selected lesson text section for modern lessons', async () => {
    const nextContent = 'Noi dung moi tu tai lieu Wiii';
    let lessonReadCount = 0;
    lessonApi.getLessonById.and.callFake(() => {
      lessonReadCount += 1;
      return of({
        data: {
          id: 'lesson-1',
          title: 'Bai hoc co section',
          description: 'Mo ta cu',
          content: lessonReadCount === 1 ? 'Noi dung cu' : nextContent,
          courseId: 'course-1',
          sectionId: 'chapter-1',
          lessonType: 'LECTURE',
          durationMinutes: 15,
          orderIndex: 2,
          isRequired: true,
          sections: [
            {
              id: 'section-1',
              type: 'TEXT',
              title: 'Noi dung chinh',
              content: lessonReadCount === 1 ? 'Noi dung cu' : nextContent,
              isRequired: true,
            },
          ],
        },
      } as any);
    });
    sectionApi.updateSection.and.returnValue(of({ success: true, data: { id: 'section-1' } } as any));
    lessonApi.updateLesson.and.returnValue(of({ success: true } as any));

    const preview = await (service as any).handleActionRequest('authoring.preview_lesson_patch', {
      lesson_id: 'lesson-1',
      content: nextContent,
    });

    expect(preview.success).toBeTrue();
    expect(preview.data?.content_target).toEqual(jasmine.objectContaining({
      section_id: 'section-1',
      type: 'TEXT',
    }));
    expect(preview.data?.block_diff).toEqual(jasmine.objectContaining({
      changed: 1,
      unchanged: 0,
    }));

    const applied = await service.approveOperatorPreview(String(preview.data?.preview_token));

    expect(applied.success).toBeTrue();
    expect(sectionApi.updateSection).toHaveBeenCalledWith(
      'lesson-1',
      'section-1',
      jasmine.any(FormData),
      jasmine.objectContaining({ headers: jasmine.anything() }),
    );
    expect(lessonApi.updateLesson).not.toHaveBeenCalled();
    expect(applied.data?.['verified']).toBeTrue();
  });

  it('renames the target text section when lesson title and content change together', async () => {
    const nextTitle = 'Bai hoc moi tu tai lieu';
    const nextSectionTitle = 'N\u1ed9i dung: Bai hoc moi tu tai lieu';
    const nextContent = 'Noi dung moi co marker Wiii';
    let lessonReadCount = 0;
    lessonApi.getLessonById.and.callFake(() => {
      lessonReadCount += 1;
      return of({
        data: {
          id: 'lesson-1',
          title: lessonReadCount === 1 ? 'Bai hoc cu' : nextTitle,
          description: 'Mo ta cu',
          content: lessonReadCount === 1 ? 'Noi dung cu' : nextContent,
          courseId: 'course-1',
          sectionId: 'chapter-1',
          lessonType: 'LECTURE',
          durationMinutes: 15,
          orderIndex: 2,
          isRequired: true,
          sections: [
            {
              id: 'section-1',
              type: 'TEXT',
              title: lessonReadCount === 1 ? 'Tieu de section cu' : nextSectionTitle,
              content: lessonReadCount === 1 ? 'Noi dung cu' : nextContent,
              isRequired: true,
            },
          ],
        },
      } as any);
    });
    sectionApi.updateSection.and.returnValue(of({ success: true, data: { id: 'section-1' } } as any));
    lessonApi.updateLesson.and.returnValue(of({ success: true } as any));

    const preview = await (service as any).handleActionRequest('authoring.preview_lesson_patch', {
      lesson_id: 'lesson-1',
      title: nextTitle,
      content: nextContent,
    });

    expect(preview.success).toBeTrue();
    expect(preview.data?.content_target).toEqual(jasmine.objectContaining({
      section_id: 'section-1',
      title: 'Tieu de section cu',
      proposed_title: nextSectionTitle,
    }));

    const applied = await service.approveOperatorPreview(String(preview.data?.preview_token));

    expect(applied.success).toBeTrue();
    const formData = sectionApi.updateSection.calls.mostRecent().args[2] as FormData;
    const payload = JSON.parse(await (formData.get('data') as Blob).text());
    expect(payload).toEqual(jasmine.objectContaining({
      title: nextSectionTitle,
      content: nextContent,
    }));
    expect(lessonApi.updateLesson).toHaveBeenCalledWith('lesson-1', jasmine.objectContaining({
      title: nextTitle,
    }), jasmine.objectContaining({ headers: jasmine.anything() }));
    expect(applied.data?.['verified']).toBeTrue();
  });

  it('keeps a lesson patch preview retryable when post-apply verification fails', async () => {
    let lessonReadCount = 0;
    lessonApi.getLessonById.and.callFake(() => {
      lessonReadCount += 1;
      return of({
        data: {
          id: 'lesson-1',
          title: lessonReadCount >= 3 ? 'Bai hoc da verify' : 'Bai hoc cu',
          description: 'Mo ta cu',
          content: 'Noi dung cu',
          courseId: 'course-1',
          sectionId: 'chapter-1',
          lessonType: 'LECTURE',
          durationMinutes: 15,
          orderIndex: 2,
          isRequired: true,
        },
      } as any);
    });
    lessonApi.updateLesson.and.returnValue(of({ success: true } as any));

    const preview = await (service as any).handleActionRequest('authoring.preview_lesson_patch', {
      lesson_id: 'lesson-1',
      title: 'Bai hoc da verify',
    });

    const failed = await service.approveOperatorPreview(String(preview.data?.preview_token));

    expect(failed.success).toBeFalse();
    expect(failed.error).toContain('host_preview_apply_verification_failed:title');
    expect(lessonApi.updateLesson).toHaveBeenCalledTimes(1);

    const retried = await service.approveOperatorPreview(String(preview.data?.preview_token));

    expect(retried.success).toBeTrue();
    expect(retried.data?.['verified']).toBeTrue();
    expect(lessonApi.updateLesson).toHaveBeenCalledTimes(2);
  });

  it('previews and applies a document course plan through teacher approval', async () => {
    chapterApi.createChapter.and.returnValues(
      of({ data: { id: 'chapter-1', title: 'Chương 1', orderIndex: 0 } } as any),
      of({ data: { id: 'chapter-2', title: 'Chương 2', orderIndex: 1 } } as any),
    );
    lessonApi.createLesson.and.returnValues(
      of({ data: { id: 'lesson-1', title: 'Bài 1', lessonType: 'LECTURE', orderIndex: 0 } } as any),
      of({ data: { id: 'lesson-2', title: 'Bài 2', lessonType: 'LECTURE', orderIndex: 0 } } as any),
    );

    let panelPreview: any;
    const previewSub = service.operatorPreview$.subscribe((previewPanel) => {
      panelPreview = previewPanel;
    });
    const preview = await (service as any).handleActionRequest('authoring.generate_course_from_document', {
      course_id: 'course-1',
      summary: 'Wiii đã dựng cây khóa học nháp. Giáo viên cần xem citation trước khi áp dụng vào LMS.',
      course_plan: {
        title: 'Khai thác HoLiLiHu LMS',
        description: 'Khóa học từ tài liệu hướng dẫn',
        chapters: [
          {
            title: 'Chương 1',
            summary: 'Tổng quan',
            learning_objectives: ['Hiểu vai trò'],
            lessons: [
              {
                title: 'Bài 1',
                summary: 'Bản đồ hệ thống',
                activity: 'Đối chiếu vai trò',
                quick_check: 'Vai trò nào được tạo khóa?',
                source_references: [{ kind: 'document', title: 'Manual', page_start: 1 }],
              },
            ],
            source_references: [{ kind: 'document', title: 'Manual', page_start: 1 }],
          },
          {
            title: 'Chương 2',
            summary: 'Giảng viên',
            learning_objectives: ['Tạo khóa'],
            lessons: [
              {
                title: 'Bài 2',
                summary: 'Tạo khóa học mới',
                source_references: [{ kind: 'document', title: 'Manual', page_start: 23 }],
              },
            ],
          },
        ],
        implementation_checklist: ['Không publish tự động'],
      },
      source_references: [{ kind: 'document', title: 'Manual', page_start: 1 }],
    });
    previewSub.unsubscribe();

    expect(preview.success).toBeTrue();
    expect(preview.data?.preview_kind).toBe('course_plan');
    expect(preview.data?.apply_action).toBe('authoring.apply_course_plan');
    expect(String(preview.data?.summary).match(/Giáo viên cần xem/g)?.length).toBe(1);
    expect(preview.data?.course_plan).toEqual(jasmine.objectContaining({
      title: 'Khai thác HoLiLiHu LMS',
      chapters: jasmine.any(Array),
    }));
    expect(panelPreview).toEqual(jasmine.objectContaining({
      token: preview.data?.preview_token,
      kind: 'course_plan',
      targetLabel: 'Khai thác HoLiLiHu LMS',
      sourceReferences: jasmine.arrayContaining([
        jasmine.objectContaining({ page_start: 1 }),
        jasmine.objectContaining({ page_start: 23 }),
      ]),
    }));

    await expectAsync((service as any).handleActionRequest('authoring.apply_course_plan', {
      preview_token: preview.data?.preview_token,
    })).toBeRejectedWithError(/host_preview_approval_required/);
    expect(chapterApi.createChapter).not.toHaveBeenCalled();

    const applied = await service.approveOperatorPreview(String(preview.data?.preview_token));

    expect(applied.success).toBeTrue();
    expect(chapterApi.createChapter).toHaveBeenCalledTimes(2);
    expect(lessonApi.createLesson).toHaveBeenCalledTimes(2);
    expect(lessonApi.createLesson).toHaveBeenCalledWith('chapter-1', jasmine.objectContaining({
      title: 'Bài 1',
      type: 'LECTURE',
      content: jasmine.stringContaining('## Nguồn đối chiếu'),
    }));
    expect(courseEditorStore.invalidateCache).toHaveBeenCalledWith('course-1');
    expect(courseEditorStore.loadCourse).toHaveBeenCalledWith('course-1', true);
    expect(router.navigate).toHaveBeenCalledWith(['/teacher/courses', 'course-1', 'editor', 'curriculum']);
    expect(applied.data?.['chapters_created']).toBe(2);
    expect(applied.data?.['lessons_created']).toBe(2);
    expect(applied.data?.['next_route']).toBe('/teacher/courses/course-1/editor/curriculum');
    expect(applied.data?.['navigated_to_curriculum']).toBeTrue();
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

    const applied = await service.approveOperatorPreview(String(preview.data?.preview_token));

    expect(applied.success).toBeTrue();
    expect(quizApi.createLessonQuizV3).toHaveBeenCalledWith('lesson-1', jasmine.objectContaining({
      title: 'Quiz tieng Trung',
      description: '30 cau hoi luyen tap',
      questionIds: ['q1', 'q2', 'q3'],
      publishImmediately: false,
    }));
    expect(applied.data?.['quiz_id']).toBe('quiz-1');
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

    const published = await service.approveOperatorPreview(String(preview.data?.preview_token));

    expect(published.success).toBeTrue();
    expect(quizApi.publishQuiz).toHaveBeenCalledWith('quiz-9');
    expect(published.data?.['published']).toBeTrue();
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

  it('exposes lesson preview tools from the editor URL when selection state has not hydrated', () => {
    (TestBed.inject(Router) as any).url =
      '/teacher/courses/course-1/editor/curriculum?chapterId=chapter-1&lessonId=lesson-from-url';

    const capabilities = (service as any).buildCapabilities({
      page_type: 'course_editor',
      course_id: 'course-1',
    });
    const toolNames = capabilities.tools.map((tool: any) => tool.name);

    expect(toolNames).toContain('authoring.preview_lesson_patch');
    expect(toolNames).toContain('authoring.apply_lesson_patch');
    expect(toolNames).toContain('assessment.preview_quiz_commit');
  });

  it('previews a lesson patch using the lessonId from the current editor URL', async () => {
    (TestBed.inject(Router) as any).url =
      '/teacher/courses/course-1/editor/curriculum?chapterId=chapter-1&lessonId=lesson-from-url';
    lessonApi.getLessonById.and.returnValue(of({
      data: {
        id: 'lesson-from-url',
        title: 'Lesson from URL',
        description: 'Existing description',
        content: 'Existing content',
        courseId: 'course-1',
        sectionId: 'chapter-1',
        lessonType: 'LECTURE',
        durationMinutes: 15,
        orderIndex: 2,
        isRequired: true,
      },
    } as any));

    const preview = await (service as any).handleActionRequest('authoring.preview_lesson_patch', {
      content: 'Generated content from uploaded source',
      source_references: [{ kind: 'page', page_start: 1, excerpt: 'Uploaded source excerpt' }],
    });

    expect(preview.success).toBeTrue();
    expect(lessonApi.getLessonById).toHaveBeenCalledWith('lesson-from-url');
    expect(preview.data?.lesson_id).toBe('lesson-from-url');
    expect(preview.data?.source_references).toEqual([
      jasmine.objectContaining({ page_start: 1, excerpt: 'Uploaded source excerpt' }),
    ]);
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
    button.setAttribute('data-wiii-click-safe', 'true');
    button.setAttribute('data-wiii-click-kind', 'navigation');
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
    button.setAttribute('data-wiii-click-safe', 'true');
    button.setAttribute('data-wiii-click-kind', 'navigation');
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

  it('refuses semantic navigation clicks when the host target is not marked safe', async () => {
    const button = document.createElement('button');
    button.textContent = 'Bai tiep theo';
    const clickSpy = spyOn(button, 'click');
    document.body.appendChild(button);

    try {
      await expectAsync((service as any).handleActionRequest('navigation.go_to', {
        target: 'next_lesson',
      })).toBeRejectedWithError(/Unsupported navigation target/);

      expect(clickSpy).not.toHaveBeenCalled();
    } finally {
      button.remove();
    }
  });

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
        selector: 'continue-lesson',
        message: 'Đây là nút tiếp tục.',
        duration_ms: 1500,
      });

      expect(result.success).toBeTrue();
      expect(result.data?.summary).toContain('continue-lesson');
      // The cursor SVG must have been mounted by the handler.
      expect(document.getElementById('wiii-pointy-cursor')).not.toBeNull();
      expect(document.getElementById('wiii-pointy-overlay')).not.toBeNull();
    });

    it('ui.click only clicks targets explicitly marked safe', async () => {
      const target = document.createElement('button');
      target.setAttribute('data-wiii-id', 'browse-courses');
      target.setAttribute('data-wiii-click-safe', 'true');
      target.setAttribute('data-wiii-click-kind', 'navigation');
      target.setAttribute('data-wiii-test', 'pointy');
      target.textContent = 'Browse';
      const clickSpy = spyOn(target, 'click');
      document.body.appendChild(target);

      const result = await (service as any).handleActionRequest('ui.click', {
        selector: 'browse-courses',
      });

      expect(result.success).toBeTrue();
      expect(result.data?.clicked).toBeTrue();
      expect(result.data?.click_kind).toBe('navigation');
      expect(clickSpy).toHaveBeenCalled();
    });

    it('ui.click fails closed for unsafe targets', async () => {
      const target = document.createElement('button');
      target.setAttribute('data-wiii-id', 'submit-quiz');
      target.setAttribute('data-wiii-test', 'pointy');
      target.textContent = 'Submit';
      const clickSpy = spyOn(target, 'click');
      document.body.appendChild(target);

      const result = await (service as any).handleActionRequest('ui.click', {
        selector: 'submit-quiz',
      });

      expect(result.success).toBeFalse();
      expect(result.error).toContain('unsafe_click_target');
      expect(clickSpy).not.toHaveBeenCalled();
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
          { selector: 'tour-a', message: 'A', duration_ms: 5 },
          { selector: 'tour-b', message: 'B', duration_ms: 5 },
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

    it('ui.scroll_to fails closed when the selector is missing', async () => {
      const result = await (service as any).handleActionRequest('ui.scroll_to', {
        selector: '[data-wiii-id="nope-scroll"]',
      });
      expect(result.success).toBeFalse();
      expect(result.error).toContain('selector_not_found');
    });

    it('ui.scroll_to honours explicit block argument when provided', async () => {
      const target = document.createElement('section');
      target.setAttribute('data-wiii-id', 'block-start');
      target.setAttribute('data-wiii-test', 'pointy');
      document.body.appendChild(target);
      const spy = spyOn(target, 'scrollIntoView');

      const result = await (service as any).handleActionRequest('ui.scroll_to', {
        selector: '[data-wiii-id="block-start"]',
        block: 'start',
      });

      expect(result.success).toBeTrue();
      expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ block: 'start' }));
    });

    it('ui.highlight reuses the same cursor node across consecutive calls', async () => {
      const a = document.createElement('button');
      a.setAttribute('data-wiii-id', 'reuse-a');
      a.setAttribute('data-wiii-test', 'pointy');
      const b = document.createElement('button');
      b.setAttribute('data-wiii-id', 'reuse-b');
      b.setAttribute('data-wiii-test', 'pointy');
      document.body.appendChild(a);
      document.body.appendChild(b);

      await (service as any).handleActionRequest('ui.highlight', {
        selector: '[data-wiii-id="reuse-a"]',
        message: 'A',
        duration_ms: 1000,
      });
      await (service as any).handleActionRequest('ui.highlight', {
        selector: '[data-wiii-id="reuse-b"]',
        message: 'B',
        duration_ms: 1000,
      });

      const cursors = document.querySelectorAll('#wiii-pointy-cursor');
      expect(cursors.length).toBe(1);
    });

    it('ui.highlight summary falls back to text when target has no id or aria-label', async () => {
      const target = document.createElement('button');
      target.setAttribute('data-wiii-test', 'pointy');
      target.textContent = 'Khám phá khóa học';
      document.body.appendChild(target);

      const result = await (service as any).handleActionRequest('ui.highlight', {
        selector: 'button[data-wiii-test="pointy"]',
      });

      expect(result.success).toBeTrue();
      expect(String(result.data?.summary)).toContain('Khám phá khóa học');
    });

    it('ui.show_tour cancels in flight when a new tour starts', async () => {
      const a = document.createElement('div');
      a.setAttribute('data-wiii-id', 'concurrent-a');
      a.setAttribute('data-wiii-test', 'pointy');
      const b = document.createElement('div');
      b.setAttribute('data-wiii-id', 'concurrent-b');
      b.setAttribute('data-wiii-test', 'pointy');
      document.body.appendChild(a);
      document.body.appendChild(b);

      const long = (service as any).handleActionRequest('ui.show_tour', {
        steps: [{ selector: '[data-wiii-id="concurrent-a"]', message: 'A', duration_ms: 200 }],
      });
      const second = await (service as any).handleActionRequest('ui.show_tour', {
        steps: [{ selector: '[data-wiii-id="concurrent-b"]', message: 'B', duration_ms: 5 }],
      });
      const first = await long;

      expect(first.data?.cancelled).toBeTrue();
      expect(second.data?.cancelled).toBeFalse();
    });
  });
});
