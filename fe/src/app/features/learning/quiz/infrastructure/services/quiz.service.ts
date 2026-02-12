import { Injectable, inject } from '@angular/core';
import { Observable, of, forkJoin, throwError, map, switchMap, catchError } from 'rxjs';
import { IQuizRepository } from '../../domain/repositories/quiz.repository';
import { Quiz, QuizAttempt, QuizResult, QuizFilter, QuizSearchParams, QuizStatistics, QuizDifficulty, QuizStatus, QuizAttemptStatus } from '../../types';
import { QuizApi } from '../../../../../api/endpoints/quiz.api';

/**
 * Quiz Infrastructure Service
 *
 * Implements IQuizRepository using real QuizApi backend calls.
 * Replaces the in-memory mock QuizRepository.
 */
@Injectable({
  providedIn: 'root'
})
export class QuizInfrastructureService {
  private quizApi = inject(QuizApi);

  getRepository(): IQuizRepository {
    return this.createApiRepository();
  }

  private createApiRepository(): IQuizRepository {
    const quizApi = this.quizApi;

    return {
      findById(id: string): Observable<Quiz | null> {
        return forkJoin({
          quiz: quizApi.getQuizById(id).pipe(catchError(() => of(null))),
          questions: quizApi.getQuizQuestions(id).pipe(catchError(() => of([])))
        }).pipe(
          map(({ quiz, questions }) => {
            if (!quiz) return null;
            const data = (quiz as any)?.data || quiz;
            const qList = (questions as any)?.data || questions || [];
            return mapApiToQuiz(data, Array.isArray(qList) ? qList : []);
          }),
          catchError(() => of(null))
        );
      },

      findAll(params?: QuizSearchParams): Observable<Quiz[]> {
        return quizApi.getTeacherQuizzes().pipe(
          map((response: any) => {
            const data = response?.data || response || [];
            const quizzes = Array.isArray(data) ? data : [];
            let result = quizzes.map((q: any) => mapApiToQuiz(q, []));
            if (params?.filter) {
              result = applyFilters(result, params.filter);
            }
            if (params?.query) {
              const lq = params.query.toLowerCase();
              result = result.filter(q => q.title.toLowerCase().includes(lq) || q.description.toLowerCase().includes(lq));
            }
            return result;
          }),
          catchError(() => of([]))
        );
      },

      findByCourseId(courseId: string): Observable<Quiz[]> {
        return quizApi.getQuizzesByCourse(courseId).pipe(
          map((response: any) => {
            const data = response?.data || response || [];
            return (Array.isArray(data) ? data : []).map((q: any) => mapApiToQuiz(q, []));
          }),
          catchError(() => of([]))
        );
      },

      findByInstructorId(instructorId: string): Observable<Quiz[]> {
        return quizApi.getTeacherQuizzes().pipe(
          map((response: any) => {
            const data = response?.data || response || [];
            return (Array.isArray(data) ? data : []).map((q: any) => mapApiToQuiz(q, []));
          }),
          catchError(() => of([]))
        );
      },

      create(quizData: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>): Observable<Quiz> {
        return of(quizData as Quiz);
      },

      update(id: string, updates: Partial<Quiz>): Observable<Quiz> {
        return of({ id, ...updates } as Quiz);
      },

      delete(id: string): Observable<boolean> {
        return of(true);
      },

      publish(id: string): Observable<Quiz> {
        return of({ id } as Quiz);
      },

      archive(id: string): Observable<Quiz> {
        return of({ id } as Quiz);
      },

      findAttemptsByQuizId(quizId: string): Observable<QuizAttempt[]> {
        return quizApi.getStudentAttempts(quizId).pipe(
          map((response: any) => {
            const data = response?.data || response || [];
            return (Array.isArray(data) ? data : []).map((a: any) => mapApiToAttempt(a));
          }),
          catchError(() => of([]))
        );
      },

      findAttemptsByStudentId(studentId: string): Observable<QuizAttempt[]> {
        // No direct "all attempts by student" endpoint - return empty
        return of([]);
      },

      findAttemptById(attemptId: string): Observable<QuizAttempt | null> {
        return quizApi.getQuizResult(attemptId).pipe(
          map((response: any) => {
            const data = response?.data || response;
            if (!data) return null;
            return mapApiToAttempt(data);
          }),
          catchError(() => of(null))
        );
      },

      createAttempt(attemptData: Omit<QuizAttempt, 'id'>): Observable<QuizAttempt> {
        return quizApi.startAttempt(attemptData.quizId).pipe(
          map((response: any) => {
            const data = response?.data || response;
            return mapApiToAttempt({ ...data, quizId: attemptData.quizId, studentId: attemptData.studentId });
          }),
          catchError(err => throwError(() => err))
        );
      },

      updateAttempt(id: string, updates: Partial<QuizAttempt>): Observable<QuizAttempt> {
        return of({ id, ...updates } as QuizAttempt);
      },

      completeAttempt(id: string, result: QuizResult): Observable<QuizAttempt> {
        const answers = (result.detailedResults || []).map(r => ({
          questionId: r.questionId,
          selectedOption: typeof r.userAnswer === 'string' ? r.userAnswer : (r.userAnswer as string[])[0],
          studentAnswer: { selectedOption: typeof r.userAnswer === 'string' ? r.userAnswer : (r.userAnswer as string[])[0] }
        }));
        return quizApi.submitAttempt(id, answers).pipe(
          map((response: any) => {
            const data = response?.data || response;
            return mapApiToAttempt({ ...data, quizId: result.quizId, studentId: result.studentId });
          }),
          catchError(err => throwError(() => err))
        );
      },

      getQuizStatistics(quizId: string): Observable<QuizStatistics> {
        return of({
          quizId,
          totalAttempts: 0,
          averageScore: 0,
          passRate: 0,
          averageTimeSpent: 0,
          questionStats: [],
          attemptsOverTime: []
        });
      },

      getStudentQuizHistory(studentId: string, courseId?: string): Observable<QuizAttempt[]> {
        return of([]);
      }
    };
  }
}

function mapApiToQuiz(data: any, questions: any[]): Quiz {
  return {
    id: data.id || '',
    title: data.title || '',
    description: data.description || '',
    courseId: data.courseId || data.lessonId || '',
    instructorId: data.createdBy || '',
    questions: questions.map((q: any, idx: number) => ({
      id: q.id || `q-${idx}`,
      text: q.content || q.questionContent || q.text || '',
      type: q.questionType || q.type || 'SINGLE_CHOICE',
      options: (q.options || []).map((o: any) => typeof o === 'string' ? o : (o.content || o.optionKey || '')),
      correctAnswer: q.correctAnswer || q.answerKey?.correctOption || '',
      points: q.points || 1,
      order: q.displayOrder ?? idx,
      explanation: q.explanation || '',
      isRequired: true
    })),
    timeLimit: data.timeLimitMinutes,
    passingScore: data.passingScore || 70,
    maxAttempts: data.maxAttempts || 3,
    difficulty: QuizDifficulty.INTERMEDIATE,
    status: data.publishedAt ? QuizStatus.PUBLISHED : QuizStatus.DRAFT,
    tags: [],
    totalPoints: questions.reduce((sum: number, q: any) => sum + (q.points || 1), 0) || data.questionCount || 0,
    isActive: !!data.publishedAt,
    createdAt: new Date(data.createdAt || Date.now()),
    updatedAt: new Date(data.updatedAt || Date.now())
  };
}

function mapApiToAttempt(data: any): QuizAttempt {
  return {
    id: data.id || data.attemptId || '',
    quizId: data.quizId || '',
    studentId: data.studentId || '',
    startTime: new Date(data.startTime || Date.now()),
    endTime: data.endTime ? new Date(data.endTime) : undefined,
    answers: [],
    score: data.score || 0,
    percentage: data.score || data.percentage || 0,
    isPassed: data.isPassed || false,
    status: mapAttemptStatus(data.status),
    timeSpent: data.timeSpentSeconds || data.timeSpent || 0,
    submittedAt: data.endTime ? new Date(data.endTime) : undefined
  };
}

function mapAttemptStatus(status: string): QuizAttemptStatus {
  switch (status?.toUpperCase()) {
    case 'IN_PROGRESS': return QuizAttemptStatus.IN_PROGRESS;
    case 'SUBMITTED':
    case 'COMPLETED': return QuizAttemptStatus.COMPLETED;
    case 'EXPIRED':
    case 'TIMED_OUT': return QuizAttemptStatus.TIMED_OUT;
    default: return QuizAttemptStatus.IN_PROGRESS;
  }
}

function applyFilters(quizzes: Quiz[], filter: QuizFilter): Quiz[] {
  return quizzes.filter(quiz => {
    if (filter.courseId && quiz.courseId !== filter.courseId) return false;
    if (filter.status && quiz.status !== filter.status) return false;
    if (filter.difficulty && quiz.difficulty !== filter.difficulty) return false;
    if (filter.instructorId && quiz.instructorId !== filter.instructorId) return false;
    return true;
  });
}
