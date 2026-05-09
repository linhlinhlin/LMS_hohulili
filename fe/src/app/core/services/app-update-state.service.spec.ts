import { fakeAsync, tick } from '@angular/core/testing';
import {
  AppUpdateStateService,
  AppUpdateVersionInfo,
  buildAppUpdatePromptCopy,
  classifyAppUpdateContext,
} from './app-update-state.service';

const version: AppUpdateVersionInfo = {
  currentHash: 'old',
  latestHash: 'new',
  detectedAt: 1,
  severity: 'normal',
  releaseNote: null,
};

describe('classifyAppUpdateContext', () => {
  it('defers updates while learners are inside a lesson', () => {
    const blocker = classifyAppUpdateContext('/student/learn/course/course-1/lesson/lesson-1');

    expect(blocker?.kind).toBe('learning');
    expect(blocker?.label).toBe('Đang học');
  });

  it('defers updates while a learner is taking a quiz', () => {
    const blocker = classifyAppUpdateContext('/student/quiz/take/quiz-1');

    expect(blocker?.kind).toBe('assessment');
  });

  it('defers updates while teachers are authoring content', () => {
    const blocker = classifyAppUpdateContext('/teacher/courses/course-1/editor/curriculum');

    expect(blocker?.kind).toBe('authoring');
  });

  it('defers updates during payment flows', () => {
    const blocker = classifyAppUpdateContext('/payment/checkout');

    expect(blocker?.kind).toBe('transaction');
  });

  it('uses offline as the highest priority blocker', () => {
    const blocker = classifyAppUpdateContext('/student/quiz/take/quiz-1', { online: false });

    expect(blocker?.kind).toBe('offline');
  });
});

describe('buildAppUpdatePromptCopy', () => {
  it('creates calm ready copy for safe routes', () => {
    const copy = buildAppUpdatePromptCopy({
      status: 'ready',
      version,
      blocker: null,
      reason: null,
      dismissedUntil: 0,
    });

    expect(copy?.title).toBe('Có bản cập nhật mới');
    expect(copy?.primaryText).toBe('Cập nhật');
    expect(copy?.secondaryText).toBe('Để sau');
  });

  it('explains the safe point when the update is deferred', () => {
    const blocker = classifyAppUpdateContext('/teacher/courses/course-1/editor/curriculum');
    const copy = buildAppUpdatePromptCopy({
      status: 'deferred',
      version,
      blocker,
      reason: null,
      dismissedUntil: 0,
    });

    expect(copy?.title).toBe('Bản cập nhật đã sẵn sàng');
    expect(copy?.message).toContain('Hãy lưu bản nháp');
  });
});

describe('AppUpdateStateService', () => {
  let service: AppUpdateStateService;

  beforeEach(() => {
    service = new AppUpdateStateService();
  });

  it('switches between ready and deferred as blockers change', () => {
    service.markReady(version, null);

    expect(service.state().status).toBe('ready');
    expect(service.shouldShowPrompt()).toBeTrue();

    service.updateBlocker(classifyAppUpdateContext('/student/quiz/take/quiz-1'));

    expect(service.state().status).toBe('deferred');
    expect(service.state().blocker?.kind).toBe('assessment');

    service.updateBlocker(null);

    expect(service.state().status).toBe('ready');
  });

  it('temporarily hides non-critical prompts when the user chooses later', fakeAsync(() => {
    service.markReady(version, null);

    service.dismissFor(1000);

    expect(service.shouldShowPrompt()).toBeFalse();

    tick(1300);

    expect(service.shouldShowPrompt()).toBeTrue();
  }));
});
