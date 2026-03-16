import { Injectable, inject, signal, computed } from '@angular/core';
import {
  ensureOfflineDbReady,
  isOfflineDbUnavailableError,
  isOfflinePersistenceSupported,
  offlineDb,
  getCurrentUserId,
  type OfflineQuizData,
  type OfflineQuizAttempt,
} from '../db/lms-offline.db';
import { NetworkStatusService } from './network-status.service';
import { ToastService } from './toast.service';

export type { OfflineQuizData };

export interface OfflineQuizSubmission {
  quizId: string;
  lessonId: string;
  courseId: string;
  sectionId?: string;
  mode?: 'lesson' | 'section';
  /** client-generated UUID used as attemptId until server creates a real one */
  localAttemptId: string;
  answers: Record<string, string | number | string[]>;
  submittedAt: Date;
}

/**
 * Manages offline quiz availability and offline submission queuing.
 *
 * Design (Phase 3B):
 * - Quiz questions (without correct answers) are downloaded during course download
 * - When offline: student takes quiz from local data, submission queued to syncQueue
 * - When online: OfflineSyncService picks up the queued submission and syncs it
 * - No client-side auto-grading — server grades (preserves academic integrity)
 */
@Injectable({ providedIn: 'root' })
export class OfflineQuizService {
  private readonly network = inject(NetworkStatusService);
  private readonly toast = inject(ToastService);
  private readonly offlineSupported = isOfflinePersistenceSupported();

  /** Pending quiz submissions not yet synced (signal for badge display) */
  readonly pendingSubmissionCount = signal(0);

  constructor() {
    if (!this.offlineSupported) {
      return;
    }
    void this.refreshPendingCount().catch((error) => {
      if (!isOfflineDbUnavailableError(error)) {
        console.error('[OfflineQuizService] Failed to initialize pending count:', error);
      }
    });
  }

  /**
   * Get offline quiz data for a lesson.
   * Returns null if not downloaded.
   */
  async getQuizForLesson(lessonId: string, sectionId?: string): Promise<OfflineQuizData | null> {
    if (!(await this.ensureOfflineReady(true))) {
      return null;
    }
    const userId = getCurrentUserId();
    const records = await offlineDb.quizData
      .where('[userId+lessonId]').equals([userId, lessonId])
      .toArray();

    if (sectionId) {
      return records.find(record => record.mode === 'section' && record.sectionId === sectionId) ?? null;
    }

    return records.find(record => record.mode !== 'section') ?? records[0] ?? null;
  }

  /**
   * Get offline quiz data by quizId.
   */
  async getQuizById(quizId: string, sectionId?: string): Promise<OfflineQuizData | null> {
    if (!(await this.ensureOfflineReady(true))) {
      return null;
    }
    const userId = getCurrentUserId();
    const records = await offlineDb.quizData
      .where('[userId+quizId]').equals([userId, quizId])
      .toArray();

    if (sectionId) {
      return records.find(record => record.sectionId === sectionId) ?? null;
    }

    return records.find(record => record.mode !== 'section') ?? records[0] ?? null;
  }

  /**
   * Check if a lesson has a quiz available offline.
   */
  async hasOfflineQuiz(lessonId: string, sectionId?: string): Promise<boolean> {
    const quiz = await this.getQuizForLesson(lessonId, sectionId);
    return quiz !== null && quiz.questions.length > 0;
  }

  /**
   * Queue a quiz submission for sync when back online.
   * Used when student submits quiz while offline.
   *
   * The sync endpoint will:
   * 1. Call startAttempt(quizId) to get a real server attemptId
   * 2. Submit answers with the server attemptId
   * 3. Return the graded result (student sees it after sync)
   */
  async queueOfflineSubmission(submission: OfflineQuizSubmission): Promise<void> {
    await this.ensureOfflineReady();
    const userId = getCurrentUserId();
    const mode = submission.mode ?? 'lesson';
    const quiz = await this.getQuizById(submission.quizId, submission.sectionId);

    if (!quiz) {
      throw new Error('Bài kiểm tra này chưa được tải về cho chế độ ngoại tuyến.');
    }

    if (this.normalizeQuizType(quiz.quizType) !== 'PRACTICE') {
      throw new Error('Bài kiểm tra này chỉ được làm online để bảo toàn tính nghiêm túc của đánh giá.');
    }

    // Store in quizAttempts for tracking
    const attempt: OfflineQuizAttempt = {
      quizId: submission.quizId,
      lessonId: submission.lessonId,
      sectionId: submission.sectionId,
      mode,
      userId,
      answers: submission.answers,
      submittedAt: submission.submittedAt,
      syncStatus: 'pending',
      retryCount: 0,
    };
    await offlineDb.quizAttempts.add(attempt);

    // Queue to syncQueue for OfflineSyncService to pick up
    await offlineDb.syncQueue.add({
      entityType: 'quizAttempt',
      operationType: 'CREATE',
      endpoint: mode === 'section' && submission.sectionId
        ? `/api/v3/quizzes/lessons/${submission.lessonId}/sections/${submission.sectionId}/submit`
        : `/api/v3/quizzes/${submission.quizId}/attempts/start`,
      payload: {
        quizId: submission.quizId,
        lessonId: submission.lessonId,
        courseId: submission.courseId,
        sectionId: submission.sectionId,
        mode,
        localAttemptId: submission.localAttemptId,
        answers: submission.answers,
        submittedAt: submission.submittedAt.toISOString(),
      },
      createdAt: new Date(),
      syncStatus: 'pending',
      retryCount: 0,
      userId,
    });

    await this.refreshPendingCount();
    this.toast.info('Bài làm đã lưu — kết quả sẽ hiển thị khi có mạng');
  }

  /**
   * Get count of quiz attempts awaiting sync.
   */
  async refreshPendingCount(): Promise<void> {
    if (!(await this.ensureOfflineReady(true))) {
      this.pendingSubmissionCount.set(0);
      return;
    }
    const userId = getCurrentUserId();
    const count = await offlineDb.quizAttempts
      .where('userId').equals(userId)
      .filter(a => a.syncStatus === 'pending')
      .count();
    this.pendingSubmissionCount.set(count);
  }

  /**
   * Delete quiz data for a course (called when course is removed).
   */
  async clearForCourse(courseId: string): Promise<void> {
    if (!(await this.ensureOfflineReady(true))) {
      return;
    }
    const userId = getCurrentUserId();
    await offlineDb.quizData
      .where('[userId+courseId]').equals([userId, courseId])
      .delete();
  }

  private async ensureOfflineReady(optional = false): Promise<boolean> {
    try {
      await ensureOfflineDbReady();
      return true;
    } catch (error) {
      if (!isOfflineDbUnavailableError(error)) {
        throw error;
      }

      if (!optional) {
        this.toast.warning('Bộ nhớ ngoại tuyến hiện không khả dụng trên trình duyệt này.');
        throw error;
      }

      return false;
    }
  }

  private normalizeQuizType(rawQuizType: unknown): 'PRACTICE' | 'ASSESSMENT' | 'EXAM' {
    const normalized = typeof rawQuizType === 'string'
      ? rawQuizType.trim().toUpperCase()
      : 'ASSESSMENT';

    if (normalized === 'PRACTICE' || normalized === 'EXAM') {
      return normalized;
    }

    return 'ASSESSMENT';
  }
}
