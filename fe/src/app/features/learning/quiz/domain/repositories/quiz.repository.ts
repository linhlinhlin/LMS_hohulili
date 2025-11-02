import { Injectable, inject } from '@angular/core';
import { Observable, map, catchError, throwError } from 'rxjs';
import { Quiz, QuizAttempt, QuizResult, QuizFilter, QuizSearchParams, QuizStatistics } from '../../types';
import { QuizEntity, QuizAttemptEntity } from '../entities/quiz.entity';

/**
 * Quiz Repository Interface
 *
 * Defines the contract for quiz data access operations
 */
export interface IQuizRepository {
  // Quiz CRUD operations
  findById(id: string): Observable<Quiz | null>;
  findAll(params?: QuizSearchParams): Observable<Quiz[]>;
  findByCourseId(courseId: string): Observable<Quiz[]>;
  findByInstructorId(instructorId: string): Observable<Quiz[]>;
  create(quiz: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>): Observable<Quiz>;
  update(id: string, quiz: Partial<Quiz>): Observable<Quiz>;
  delete(id: string): Observable<boolean>;

  // Quiz publishing
  publish(id: string): Observable<Quiz>;
  archive(id: string): Observable<Quiz>;

  // Quiz attempts
  findAttemptsByQuizId(quizId: string): Observable<QuizAttempt[]>;
  findAttemptsByStudentId(studentId: string): Observable<QuizAttempt[]>;
  findAttemptById(attemptId: string): Observable<QuizAttempt | null>;
  createAttempt(attempt: Omit<QuizAttempt, 'id'>): Observable<QuizAttempt>;
  updateAttempt(id: string, attempt: Partial<QuizAttempt>): Observable<QuizAttempt>;
  completeAttempt(id: string, result: QuizResult): Observable<QuizAttempt>;

  // Statistics and analytics
  getQuizStatistics(quizId: string): Observable<QuizStatistics>;
  getStudentQuizHistory(studentId: string, courseId?: string): Observable<QuizAttempt[]>;
}

/**
 * Quiz Repository Implementation
 *
 * Concrete implementation of the quiz repository
 * In a real application, this would connect to a backend API
 */
export class QuizRepository implements IQuizRepository {
  private quizzes: Map<string, Quiz> = new Map();
  private attempts: Map<string, QuizAttempt> = new Map();

  constructor() {
    // Initialize with mock data
    this.initializeMockData();
  }

  findById(id: string): Observable<Quiz | null> {
    return new Observable(observer => {
      setTimeout(() => {
        const quiz = this.quizzes.get(id) || null;
        observer.next(quiz);
        observer.complete();
      }, 100);
    });
  }

  findAll(params?: QuizSearchParams): Observable<Quiz[]> {
    return new Observable(observer => {
      setTimeout(() => {
        let quizzes = Array.from(this.quizzes.values());

        // Apply filters
        if (params?.filter) {
          quizzes = this.applyFilters(quizzes, params.filter);
        }

        // Apply search
        if (params?.query) {
          quizzes = this.applySearch(quizzes, params.query);
        }

        // Apply sorting
        if (params?.sortBy) {
          quizzes = this.applySorting(quizzes, params.sortBy, params.sortOrder || 'desc');
        }

        // Apply pagination
        if (params?.page && params?.limit) {
          const startIndex = (params.page - 1) * params.limit;
          const endIndex = startIndex + params.limit;
          quizzes = quizzes.slice(startIndex, endIndex);
        }

        observer.next(quizzes);
        observer.complete();
      }, 100);
    });
  }

  findByCourseId(courseId: string): Observable<Quiz[]> {
    return new Observable(observer => {
      setTimeout(() => {
        const quizzes = Array.from(this.quizzes.values())
          .filter(quiz => quiz.courseId === courseId);
        observer.next(quizzes);
        observer.complete();
      }, 100);
    });
  }

  findByInstructorId(instructorId: string): Observable<Quiz[]> {
    return new Observable(observer => {
      setTimeout(() => {
        const quizzes = Array.from(this.quizzes.values())
          .filter(quiz => quiz.instructorId === instructorId);
        observer.next(quizzes);
        observer.complete();
      }, 100);
    });
  }

  create(quizData: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>): Observable<Quiz> {
    return new Observable(observer => {
      setTimeout(() => {
        const id = this.generateId();
        const now = new Date();

        const quiz: Quiz = {
          ...quizData,
          id,
          createdAt: now,
          updatedAt: now
        };

        this.quizzes.set(id, quiz);
        observer.next(quiz);
        observer.complete();
      }, 100);
    });
  }

  update(id: string, updates: Partial<Quiz>): Observable<Quiz> {
    return new Observable(observer => {
      setTimeout(() => {
        const existingQuiz = this.quizzes.get(id);
        if (!existingQuiz) {
          observer.error(new Error(`Quiz with id ${id} not found`));
          return;
        }

        const updatedQuiz: Quiz = {
          ...existingQuiz,
          ...updates,
          updatedAt: new Date()
        };

        this.quizzes.set(id, updatedQuiz);
        observer.next(updatedQuiz);
        observer.complete();
      }, 100);
    });
  }

  delete(id: string): Observable<boolean> {
    return new Observable(observer => {
      setTimeout(() => {
        const deleted = this.quizzes.delete(id);
        observer.next(deleted);
        observer.complete();
      }, 100);
    });
  }

  publish(id: string): Observable<Quiz> {
    return this.update(id, { status: 'published' as any });
  }

  archive(id: string): Observable<Quiz> {
    return this.update(id, { status: 'archived' as any });
  }

  findAttemptsByQuizId(quizId: string): Observable<QuizAttempt[]> {
    return new Observable(observer => {
      setTimeout(() => {
        const attempts = Array.from(this.attempts.values())
          .filter(attempt => attempt.quizId === quizId);
        observer.next(attempts);
        observer.complete();
      }, 100);
    });
  }

  findAttemptsByStudentId(studentId: string): Observable<QuizAttempt[]> {
    return new Observable(observer => {
      setTimeout(() => {
        const attempts = Array.from(this.attempts.values())
          .filter(attempt => attempt.studentId === studentId);
        observer.next(attempts);
        observer.complete();
      }, 100);
    });
  }

  findAttemptById(attemptId: string): Observable<QuizAttempt | null> {
    return new Observable(observer => {
      setTimeout(() => {
        const attempt = this.attempts.get(attemptId) || null;
        observer.next(attempt);
        observer.complete();
      }, 100);
    });
  }

  createAttempt(attemptData: Omit<QuizAttempt, 'id'>): Observable<QuizAttempt> {
    return new Observable(observer => {
      setTimeout(() => {
        const id = this.generateId();

        const attempt: QuizAttempt = {
          ...attemptData,
          id
        };

        this.attempts.set(id, attempt);
        observer.next(attempt);
        observer.complete();
      }, 100);
    });
  }

  updateAttempt(id: string, updates: Partial<QuizAttempt>): Observable<QuizAttempt> {
    return new Observable(observer => {
      setTimeout(() => {
        const existingAttempt = this.attempts.get(id);
        if (!existingAttempt) {
          observer.error(new Error(`Attempt with id ${id} not found`));
          return;
        }

        const updatedAttempt: QuizAttempt = {
          ...existingAttempt,
          ...updates
        };

        this.attempts.set(id, updatedAttempt);
        observer.next(updatedAttempt);
        observer.complete();
      }, 100);
    });
  }

  completeAttempt(id: string, result: QuizResult): Observable<QuizAttempt> {
    return this.updateAttempt(id, {
      score: result.score,
      percentage: result.percentage,
      isPassed: result.isPassed,
      status: 'completed' as any,
      submittedAt: result.submittedAt,
      endTime: result.submittedAt,
      timeSpent: result.timeSpent
    });
  }

  getQuizStatistics(quizId: string): Observable<QuizStatistics> {
    return new Observable(observer => {
      setTimeout(() => {
        const attempts = Array.from(this.attempts.values())
          .filter(attempt => attempt.quizId === quizId);

        if (attempts.length === 0) {
          observer.next({
            quizId,
            totalAttempts: 0,
            averageScore: 0,
            passRate: 0,
            averageTimeSpent: 0,
            questionStats: [],
            attemptsOverTime: []
          });
          observer.complete();
          return;
        }

        const totalAttempts = attempts.length;
        const averageScore = attempts.reduce((sum, a) => sum + a.percentage, 0) / totalAttempts;
        const passRate = attempts.filter(a => a.isPassed).length / totalAttempts * 100;
        const averageTimeSpent = attempts.reduce((sum, a) => sum + a.timeSpent, 0) / totalAttempts;

        // Mock question stats - in real app, this would be calculated from detailed results
        const questionStats: any[] = [];

        // Mock attempts over time
        const attemptsOverTime: any[] = [];

        observer.next({
          quizId,
          totalAttempts,
          averageScore: Math.round(averageScore),
          passRate: Math.round(passRate),
          averageTimeSpent: Math.round(averageTimeSpent),
          questionStats,
          attemptsOverTime
        });
        observer.complete();
      }, 100);
    });
  }

  getStudentQuizHistory(studentId: string, courseId?: string): Observable<QuizAttempt[]> {
    return new Observable(observer => {
      setTimeout(() => {
        let attempts = Array.from(this.attempts.values())
          .filter(attempt => attempt.studentId === studentId);

        if (courseId) {
          // Filter by course - would need to join with quiz data in real app
          attempts = attempts.filter(attempt => {
            const quiz = this.quizzes.get(attempt.quizId);
            return quiz?.courseId === courseId;
          });
        }

        // Sort by submission date (most recent first)
        attempts.sort((a, b) => {
          const aDate = a.submittedAt || a.endTime || a.startTime;
          const bDate = b.submittedAt || b.endTime || b.startTime;
          return bDate.getTime() - aDate.getTime();
        });

        observer.next(attempts);
        observer.complete();
      }, 100);
    });
  }

  private applyFilters(quizzes: Quiz[], filter: QuizFilter): Quiz[] {
    return quizzes.filter(quiz => {
      if (filter.courseId && quiz.courseId !== filter.courseId) return false;
      if (filter.status && quiz.status !== filter.status) return false;
      if (filter.difficulty && quiz.difficulty !== filter.difficulty) return false;
      if (filter.instructorId && quiz.instructorId !== filter.instructorId) return false;
      if (filter.tags && !filter.tags.some(tag => quiz.tags.includes(tag))) return false;

      if (filter.dateRange) {
        const quizDate = quiz.createdAt;
        if (quizDate < filter.dateRange.start || quizDate > filter.dateRange.end) {
          return false;
        }
      }

      return true;
    });
  }

  private applySearch(quizzes: Quiz[], query: string): Quiz[] {
    const lowerQuery = query.toLowerCase();
    return quizzes.filter(quiz =>
      quiz.title.toLowerCase().includes(lowerQuery) ||
      quiz.description.toLowerCase().includes(lowerQuery) ||
      quiz.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  private applySorting(quizzes: Quiz[], sortBy: string, sortOrder: 'asc' | 'desc'): Quiz[] {
    return [...quizzes].sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'createdAt':
          aValue = a.createdAt.getTime();
          bValue = b.createdAt.getTime();
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'difficulty':
          const difficultyOrder = { 'beginner': 1, 'intermediate': 2, 'advanced': 3 };
          aValue = difficultyOrder[a.difficulty] || 0;
          bValue = difficultyOrder[b.difficulty] || 0;
          break;
        case 'updatedAt':
        default:
          aValue = a.updatedAt.getTime();
          bValue = b.updatedAt.getTime();
          break;
      }

      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });
  }

  private generateId(): string {
    return `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeMockData(): void {
    // Mock quizzes data
    const mockQuizzes: Quiz[] = [
      {
        id: 'quiz-1',
        title: 'Kỹ thuật Tàu biển Cơ bản - Chương 1',
        description: 'Bài kiểm tra kiến thức về cấu trúc tàu biển cơ bản',
        courseId: 'course-1',
        instructorId: 'instructor-1',
        questions: [], // Would be populated in real implementation
        timeLimit: 30,
        passingScore: 70,
        maxAttempts: 3,
        difficulty: 'beginner' as any,
        status: 'published' as any,
        tags: ['Kỹ thuật', 'Tàu biển', 'Cơ bản'],
        totalPoints: 100,
        isActive: true,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15')
      },
      {
        id: 'quiz-2',
        title: 'An toàn Hàng hải - Tổng hợp',
        description: 'Bài kiểm tra tổng hợp kiến thức an toàn hàng hải',
        courseId: 'course-2',
        instructorId: 'instructor-2',
        questions: [],
        timeLimit: 45,
        passingScore: 80,
        maxAttempts: 2,
        difficulty: 'intermediate' as any,
        status: 'published' as any,
        tags: ['An toàn', 'Hàng hải'],
        totalPoints: 100,
        isActive: true,
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-01')
      }
    ];

    mockQuizzes.forEach(quiz => this.quizzes.set(quiz.id, quiz));
  }
}