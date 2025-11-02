import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap, of, throwError } from 'rxjs';
import { QuizInfrastructureService } from '../../infrastructure/services/quiz.service';
import { QuizEntity, QuizAttemptEntity } from '../../domain/entities/quiz.entity';
import { Quiz, QuizAttempt, QuizResult, QuizAnswer } from '../../types';

/**
 * Take Quiz Use Case
 *
 * Application service for quiz taking operations
 */
@Injectable({
  providedIn: 'root'
})
export class TakeQuizUseCase {
  private infrastructureService = inject(QuizInfrastructureService);
  private get quizRepository() {
    return this.infrastructureService.getRepository();
  }

  /**
   * Start a quiz attempt
   */
  startQuiz(quizId: string, studentId: string): Observable<{ quiz: Quiz; attempt: QuizAttempt }> {
    return this.quizRepository.findById(quizId).pipe(
      switchMap(quiz => {
        if (!quiz) {
          return throwError(() => new Error('Quiz not found'));
        }

        if (!quiz.isActive) {
          return throwError(() => new Error('Quiz is not active'));
        }

        // Check if student has attempts remaining
        return this.quizRepository.findAttemptsByStudentId(studentId).pipe(
          map(attempts => {
            const quizAttempts = attempts.filter(a => a.quizId === quizId);
            if (quizAttempts.length >= quiz.maxAttempts) {
              throw new Error('Maximum attempts reached');
            }
            return quiz;
          })
        );
      }),
      switchMap(quiz => {
        // Create new attempt
        const attemptData: Omit<QuizAttempt, 'id'> = {
          quizId,
          studentId,
          startTime: new Date(),
          answers: [],
          score: 0,
          percentage: 0,
          isPassed: false,
          status: 'in-progress' as any,
          timeSpent: 0
        };

        return this.quizRepository.createAttempt(attemptData).pipe(
          map(attempt => ({ quiz: quiz!, attempt }))
        );
      })
    );
  }

  /**
   * Submit an answer for a question
   */
  submitAnswer(attemptId: string, questionId: string, answer: string | string[], timeSpent: number): Observable<QuizAttempt> {
    return this.quizRepository.findAttemptById(attemptId).pipe(
      switchMap(attempt => {
        if (!attempt) {
          return throwError(() => new Error('Attempt not found'));
        }

        if (attempt.status !== 'in-progress') {
          return throwError(() => new Error('Attempt is not in progress'));
        }

        // Add answer to attempt
        const answers = [...attempt.answers];
        const existingAnswerIndex = answers.findIndex(a => a.questionId === questionId);

        const quizAnswer: QuizAnswer = {
          questionId,
          answer,
          isCorrect: false, // Will be calculated on submission
          points: 0,
          timeSpent
        };

        if (existingAnswerIndex >= 0) {
          answers[existingAnswerIndex] = quizAnswer;
        } else {
          answers.push(quizAnswer);
        }

        return this.quizRepository.updateAttempt(attemptId, { answers });
      })
    );
  }

  /**
   * Complete a quiz attempt
   */
  completeQuiz(attemptId: string): Observable<QuizResult> {
    return this.quizRepository.findAttemptById(attemptId).pipe(
      switchMap(attempt => {
        if (!attempt) {
          return throwError(() => new Error('Attempt not found'));
        }

        return this.quizRepository.findById(attempt.quizId).pipe(
          switchMap(quiz => {
            if (!quiz) {
              return throwError(() => new Error('Quiz not found'));
            }

            // Create domain entities for calculation
            const quizEntity = new QuizEntity(
              quiz.id, quiz.title, quiz.description, quiz.courseId, quiz.instructorId,
              quiz.questions, quiz.timeLimit, quiz.passingScore, quiz.maxAttempts,
              quiz.difficulty, quiz.status, quiz.tags, quiz.instructions, quiz.dueDate,
              quiz.createdAt, quiz.updatedAt
            );

            const attemptEntity = new QuizAttemptEntity(
              attempt.id, attempt.quizId, attempt.studentId, attempt.startTime,
              attempt.endTime, attempt.answers, attempt.status
            );

            // Calculate result
            const result = attemptEntity.complete(quizEntity);

            // Save the completed attempt
            return this.quizRepository.completeAttempt(attemptId, result).pipe(
              map(() => result)
            );
          })
        );
      })
    );
  }

  /**
   * Get current quiz state for a student
   */
  getQuizState(quizId: string, studentId: string): Observable<{ quiz: Quiz; attempt: QuizAttempt | null }> {
    return this.quizRepository.findById(quizId).pipe(
      switchMap(quiz => {
        if (!quiz) {
          return throwError(() => new Error('Quiz not found'));
        }

        return this.quizRepository.findAttemptsByStudentId(studentId).pipe(
          map(attempts => {
            const quizAttempts = attempts
              .filter(a => a.quizId === quizId)
              .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

            // Return the most recent in-progress attempt, or null if none
            const currentAttempt = quizAttempts.find(a => a.status === 'in-progress') || null;

            return { quiz, attempt: currentAttempt };
          })
        );
      })
    );
  }

  /**
   * Get quiz results for a student
   */
  getQuizResults(studentId: string, quizId?: string): Observable<QuizAttempt[]> {
    return this.quizRepository.findAttemptsByStudentId(studentId).pipe(
      map(attempts => {
        let filtered = attempts.filter(a => a.status === 'completed');
        if (quizId) {
          filtered = filtered.filter(a => a.quizId === quizId);
        }
        return filtered.sort((a, b) =>
          (b.submittedAt || b.endTime || b.startTime).getTime() -
          (a.submittedAt || a.endTime || a.startTime).getTime()
        );
      })
    );
  }

  /**
   * Check if student can attempt quiz
   */
  canAttemptQuiz(quizId: string, studentId: string): Observable<{ canAttempt: boolean; reason?: string }> {
    return this.quizRepository.findById(quizId).pipe(
      switchMap(quiz => {
        if (!quiz) {
          return of({ canAttempt: false, reason: 'Quiz not found' });
        }

        if (!quiz.isActive) {
          return of({ canAttempt: false, reason: 'Quiz is not active' });
        }

        return this.quizRepository.findAttemptsByStudentId(studentId).pipe(
          map(attempts => {
            const quizAttempts = attempts.filter(a => a.quizId === quizId);

            if (quizAttempts.length >= quiz.maxAttempts) {
              return { canAttempt: false, reason: 'Maximum attempts reached' };
            }

            // Check if there's an in-progress attempt
            const inProgressAttempt = quizAttempts.find(a => a.status === 'in-progress');
            if (inProgressAttempt) {
              return { canAttempt: false, reason: 'Quiz already in progress' };
            }

            return { canAttempt: true };
          })
        );
      })
    );
  }
}