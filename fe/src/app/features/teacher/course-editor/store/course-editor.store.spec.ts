import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { ToastService } from '../../../../core/services/toast.service';
import { CourseAuthoringService, CourseDraftDTO } from '../services/course-authoring.service';
import { CourseEditorStore } from './course-editor.store';

describe('CourseEditorStore', () => {
  let store: CourseEditorStore;
  let authoringService: jasmine.SpyObj<CourseAuthoringService>;

  const draft = (id: string): CourseDraftDTO => ({
    id,
    code: id.toUpperCase(),
    title: `Course ${id}`,
    description: '',
    deliveryMode: 'SELF_PACED',
    chapters: [],
  });

  beforeEach(() => {
    authoringService = jasmine.createSpyObj<CourseAuthoringService>('CourseAuthoringService', [
      'getCourseDraft',
      'updateCourseInfo',
    ]);

    TestBed.configureTestingModule({
      providers: [
        CourseEditorStore,
        { provide: CourseAuthoringService, useValue: authoringService },
        { provide: ToastService, useValue: jasmine.createSpyObj<ToastService>('ToastService', ['error']) },
      ],
    });

    store = TestBed.inject(CourseEditorStore);
  });

  it('clears editor state and ignores a stale load after reset', () => {
    const staleLoad$ = new Subject<CourseDraftDTO>();
    authoringService.getCourseDraft.and.returnValue(staleLoad$.asObservable());

    store.loadCourse('course-a', true);
    expect(store.isLoading()).toBeTrue();

    store.resetEditorState();

    expect(store.courseTree()).toBeNull();
    expect(store.isLoading()).toBeFalse();
    expect(store.saveStatus()).toBe('saved');

    staleLoad$.next(draft('course-a'));
    staleLoad$.complete();

    expect(store.courseTree()).toBeNull();
  });

  it('keeps the latest course when an earlier request resolves late', () => {
    const firstLoad$ = new Subject<CourseDraftDTO>();
    const secondLoad$ = new Subject<CourseDraftDTO>();
    authoringService.getCourseDraft.and.returnValues(
      firstLoad$.asObservable(),
      secondLoad$.asObservable(),
    );

    store.loadCourse('course-a', true);
    store.loadCourse('course-b', true);

    firstLoad$.next(draft('course-a'));
    expect(store.courseTree()).toBeNull();

    secondLoad$.next(draft('course-b'));
    expect(store.courseTree()?.id).toBe('course-b');
  });
});
