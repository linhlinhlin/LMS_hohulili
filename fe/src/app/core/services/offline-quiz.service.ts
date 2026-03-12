import { Injectable, inject, signal, computed } from '@angular/core';
import { ensureOfflineDbReady, offlineDb, getCurrentUserId, type OfflineQuizData, type OfflineQuizAttempt } from '../db/lms-offline.db';
import { NetworkStatusService } from './network-status.service';
import { ToastService } from './toast.service';

export type { OfflineQuizData };

export interface OfflineQuizSubmission {
  quizId: string;
  lessonId: string;
  courseId: string;
  /** client-generated UUID used as attemptId until server creates a real one */
  localAttemptId: string;
  answers: Record<string, string | number>;
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

  /** Pending quiz submissions not yet synced (signal for badge display) */
  readonly pendingSubmissionCount = signal(0);

  constructor() {
    void this.refreshPendingCount().catch((error) => {
      console.error('[OfflineQuizService] Failed to initialize pending count:', error);
    });
  }

  /**
   * Get offline quiz data for a lesson.
   * Returns null if not downloaded.
   */
  async getQuizForLesson(lessonId: string): Promise<OfflineQuizData | null> {
    await ensureOfflineDbReady();
    const userId = getCurrentUserId();
    const record = await offlineDb.quizData
      .where('[userId+lessonId]').equals([userId, lessonId])
      .first();
    return record ?? null;
  }

  /**
   * Get offline quiz data by quizId.
   */
  async getQuizById(quizId: string): Promise<OfflineQuizData | null> {
    await ensureOfflineDbReady();
    const userId = getCurrentUserId();
    const record = await offlineDb.quizData
      .where('[userId+quizId]').equals([userId, quizId])
      .first();
    return record ?? null;
  }

  /**
   * Check if a lesson has a quiz available offline.
   */
  async hasOfflineQuiz(lessonId: string): Promise<boolean> {
    const quiz = await this.getQuizForLesson(lessonId);
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
    await ensureOfflineDbReady();
    const userId = getCurrentUserId();

    // Store in quizAttempts for tracking
    const attempt: OfflineQuizAttempt = {
      quizId: submission.quizId,
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
      // Endpoint pattern: sync service starts a fresh attempt using quizId, then submits answers
      endpoint: `/api/v3/quizzes/${submission.quizId}/attempts/start`,
      payload: {
        quizId: submission.quizId,
        lessonId: submission.lessonId,
        courseId: submission.courseId,
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
    await ensureOfflineDbReady();
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
    await ensureOfflineDbReady();
    const userId = getCurrentUserId();
    await offlineDb.quizData
      .where('[userId+courseId]').equals([userId, courseId])
      .delete();
  }
}
