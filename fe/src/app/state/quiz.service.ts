import { Injectable, signal, computed } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { 
  Quiz, 
  Question, 
  QuizAttempt, 
  QuizResult, 
  QuizFilter, 
  QuizStats,
  QuestionType,
  AttemptStatus,
  Answer
} from '../shared/types/quiz.types';

@Injectable({
  providedIn: 'root'
})
export class QuizService {
  private quizzes = signal<Quiz[]>([]);
  private attempts = signal<QuizAttempt[]>([]);

  constructor() {
    this.initializeMockData();
  }

  // Mock data initialization
  private initializeMockData(): void {
    const mockQuizzes: Quiz[] = [
      {
        id: 'quiz-1',
        title: 'Kiến thức cơ bản về Hàng hải',
        description: 'Quiz kiểm tra kiến thức cơ bản về ngành hàng hải',
        courseId: 'course-1',
        instructorId: 'instructor-1',
        questions: [
          {
            id: 'q1',
            quizId: 'quiz-1',
            type: QuestionType.MULTIPLE_CHOICE,
            text: 'Cảng biển lớn nhất Việt Nam là gì?',
            options: ['Cảng Sài Gòn', 'Cảng Hải Phòng', 'Cảng Đà Nẵng', 'Cảng Cái Mép'],
            correctAnswer: 'Cảng Sài Gòn',
            points: 10,
            explanation: 'Cảng Sài Gòn là cảng biển lớn nhất và quan trọng nhất của Việt Nam',
            order: 1,
            isRequired: true
          },
          {
            id: 'q2',
            quizId: 'quiz-1',
            type: QuestionType.TRUE_FALSE,
            text: 'Tàu container là loại tàu chuyên chở hàng hóa trong các container tiêu chuẩn',
            correctAnswer: 'true',
            points: 10,
            explanation: 'Đúng, tàu container được thiết kế đặc biệt để chở container',
            order: 2,
            isRequired: true
          },
          {
            id: 'q3',
            quizId: 'quiz-1',
            type: QuestionType.FILL_BLANK,
            text: 'Tên viết tắt của Tổ chức Hàng hải Quốc tế là ___',
            correctAnswer: 'IMO',
            points: 15,
            explanation: 'IMO là viết tắt của International Maritime Organization',
            order: 3,
            isRequired: true
          }
        ],
        timeLimit: 30,
        passingScore: 70,
        maxAttempts: 3,
        isActive: true,
        createdAt: new Date('2024-09-01'),
        updatedAt: new Date('2024-09-01'),
        dueDate: new Date('2024-09-30'),
        instructions: 'Hãy đọc kỹ câu hỏi và chọn đáp án đúng nhất. Bạn có 30 phút để hoàn thành quiz này.',
        totalPoints: 35
      },
      {
        id: 'quiz-2',
        title: 'An toàn Hàng hải',
        description: 'Quiz về các quy định an toàn trong ngành hàng hải',
        courseId: 'course-1',
        instructorId: 'instructor-1',
        questions: [
          {
            id: 'q4',
            quizId: 'quiz-2',
            type: QuestionType.MULTIPLE_CHOICE,
            text: 'Màu sắc của đèn hiệu bên mạn phải của tàu là gì?',
            options: ['Đỏ', 'Xanh lá', 'Xanh dương', 'Trắng'],
            correctAnswer: 'Xanh lá',
            points: 10,
            explanation: 'Đèn hiệu bên mạn phải có màu xanh lá cây',
            order: 1,
            isRequired: true
          },
          {
            id: 'q5',
            quizId: 'quiz-2',
            type: QuestionType.SHORT_ANSWER,
            text: 'Viết tên 3 loại thiết bị cứu sinh cơ bản trên tàu',
            correctAnswer: 'phao cứu sinh, xuồng cứu sinh, áo phao',
            points: 20,
            explanation: 'Các thiết bị cứu sinh cơ bản bao gồm phao, xuồng và áo phao',
            order: 2,
            isRequired: true
          }
        ],
        timeLimit: 20,
        passingScore: 80,
        maxAttempts: 2,
        isActive: true,
        createdAt: new Date('2024-09-05'),
        updatedAt: new Date('2024-09-05'),
        dueDate: new Date('2024-10-15'),
        instructions: 'Quiz về an toàn hàng hải. Hãy trả lời chính xác để đảm bảo an toàn.',
        totalPoints: 30
      },
      {
        id: 'quiz-3',
        title: 'Luật Hàng hải Quốc tế',
        description: 'Quiz về các quy định pháp luật hàng hải quốc tế',
        courseId: 'course-2',
        instructorId: 'instructor-2',
        questions: [
          {
            id: 'q6',
            quizId: 'quiz-3',
            type: QuestionType.MULTIPLE_CHOICE,
            text: 'Công ước SOLAS được ký kết năm nào?',
            options: ['1974', '1975', '1976', '1977'],
            correctAnswer: '1974',
            points: 15,
            explanation: 'Công ước SOLAS (Safety of Life at Sea) được ký kết năm 1974',
            order: 1,
            isRequired: true
          }
        ],
        timeLimit: 45,
        passingScore: 75,
        maxAttempts: 1,
        isActive: true,
        createdAt: new Date('2024-09-10'),
        updatedAt: new Date('2024-09-10'),
        instructions: 'Quiz về luật hàng hải quốc tế. Chỉ được làm 1 lần duy nhất.',
        totalPoints: 15
      }
    ];

    this.quizzes.set(mockQuizzes);
  }

  // Get all quizzes
  getQuizzes(filter?: QuizFilter): Observable<Quiz[]> {
    let filteredQuizzes = this.quizzes();
    
    if (filter) {
      if (filter.courseId) {
        filteredQuizzes = filteredQuizzes.filter(q => q.courseId === filter.courseId);
      }
      if (filter.instructorId) {
        filteredQuizzes = filteredQuizzes.filter(q => q.instructorId === filter.instructorId);
      }
      if (filter.isActive !== undefined) {
        filteredQuizzes = filteredQuizzes.filter(q => q.isActive === filter.isActive);
      }
    }

    return of(filteredQuizzes).pipe(delay(500));
  }

  // Get quiz by ID
  getQuiz(id: string): Observable<Quiz | undefined> {
    const quiz = this.quizzes().find(q => q.id === id);
    return of(quiz).pipe(delay(300));
  }

  // Get questions for a quiz
  getQuizQuestions(quizId: string): Observable<Question[]> {
    const quiz = this.quizzes().find(q => q.id === quizId);
    return of(quiz?.questions || []).pipe(delay(200));
  }

  // Start quiz attempt
  startQuizAttempt(quizId: string, userId: string): Observable<QuizAttempt> {
    const quiz = this.quizzes().find(q => q.id === quizId);
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    const attempt: QuizAttempt = {
      id: `attempt-${Date.now()}`,
      quizId,
      userId,
      answers: [],
      startTime: new Date(),
      timeSpent: 0,
      score: 0,
      percentage: 0,
      isPassed: false,
      status: AttemptStatus.IN_PROGRESS
    };

    const currentAttempts = this.attempts();
    this.attempts.set([...currentAttempts, attempt]);

    return of(attempt).pipe(delay(200));
  }

  // Submit quiz attempt
  submitQuizAttempt(attemptId: string, answers: Answer[]): Observable<QuizResult> {
    const attempt = this.attempts().find(a => a.id === attemptId);
    if (!attempt) {
      throw new Error('Attempt not found');
    }

    const quiz = this.quizzes().find(q => q.id === attempt.quizId);
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    // Calculate score
    let totalScore = 0;
    let correctAnswers = 0;
    const totalQuestions = quiz.questions.length;

    answers.forEach(answer => {
      const question = quiz.questions.find(q => q.id === answer.questionId);
      if (question) {
        let isCorrect = false;
        
        if (question.type === QuestionType.MULTIPLE_CHOICE || question.type === QuestionType.TRUE_FALSE) {
          isCorrect = answer.answer === question.correctAnswer;
        } else if (question.type === QuestionType.FILL_BLANK) {
          isCorrect = (answer.answer as string).toLowerCase().trim() === (question.correctAnswer as string).toLowerCase().trim();
        } else if (question.type === QuestionType.SHORT_ANSWER) {
          // Simple keyword matching for short answers
          const correctKeywords = (question.correctAnswer as string).toLowerCase().split(',').map(k => k.trim());
          const answerKeywords = (answer.answer as string).toLowerCase().split(' ').map(k => k.trim());
          isCorrect = correctKeywords.some(keyword => 
            answerKeywords.some(ans => ans.includes(keyword) || keyword.includes(ans))
          );
        }

        answer.isCorrect = isCorrect;
        answer.points = isCorrect ? question.points : 0;
        totalScore += answer.points;
        
        if (isCorrect) {
          correctAnswers++;
        }
      }
    });

    const percentage = Math.round((totalScore / quiz.totalPoints) * 100);
    const isPassed = percentage >= quiz.passingScore;
    const endTime = new Date();
    const timeSpent = Math.round((endTime.getTime() - attempt.startTime.getTime()) / 1000);

    // Update attempt
    const updatedAttempt: QuizAttempt = {
      ...attempt,
      answers,
      endTime,
      timeSpent,
      score: totalScore,
      percentage,
      isPassed,
      status: AttemptStatus.SUBMITTED,
      submittedAt: endTime
    };

    const currentAttempts = this.attempts();
    const attemptIndex = currentAttempts.findIndex(a => a.id === attemptId);
    if (attemptIndex !== -1) {
      currentAttempts[attemptIndex] = updatedAttempt;
      this.attempts.set([...currentAttempts]);
    }

    // Create result
    const result: QuizResult = {
      attemptId,
      quizId: attempt.quizId,
      userId: attempt.userId,
      score: totalScore,
      percentage,
      isPassed,
      totalQuestions,
      correctAnswers,
      incorrectAnswers: totalQuestions - correctAnswers,
      timeSpent,
      submittedAt: endTime,
      feedback: isPassed 
        ? `Chúc mừng! Bạn đã vượt qua quiz với điểm số ${percentage}%`
        : `Bạn cần cải thiện thêm. Điểm số hiện tại: ${percentage}% (Yêu cầu: ${quiz.passingScore}%)`
    };

    return of(result).pipe(delay(500));
  }

  // Get quiz attempts for user
  getQuizAttempts(userId: string, quizId?: string): Observable<QuizAttempt[]> {
    let filteredAttempts = this.attempts().filter(a => a.userId === userId);
    
    if (quizId) {
      filteredAttempts = filteredAttempts.filter(a => a.quizId === quizId);
    }

    return of(filteredAttempts).pipe(delay(300));
  }

  // Get quiz statistics
  getQuizStats(quizId: string): Observable<QuizStats> {
    const quiz = this.quizzes().find(q => q.id === quizId);
    const quizAttempts = this.attempts().filter(a => a.quizId === quizId && a.status === AttemptStatus.SUBMITTED);
    
    if (!quiz || quizAttempts.length === 0) {
      return of({
        totalAttempts: 0,
        averageScore: 0,
        passRate: 0,
        averageTimeSpent: 0,
        completionRate: 0,
        mostMissedQuestions: [],
        difficultyDistribution: { easy: 0, medium: 0, hard: 0 }
      });
    }

    const totalAttempts = quizAttempts.length;
    const averageScore = quizAttempts.reduce((sum, a) => sum + a.percentage, 0) / totalAttempts;
    const passRate = (quizAttempts.filter(a => a.isPassed).length / totalAttempts) * 100;
    const averageTimeSpent = quizAttempts.reduce((sum, a) => sum + a.timeSpent, 0) / totalAttempts;
    const completionRate = 100; // All submitted attempts are completed

    // Calculate most missed questions
    const questionMissCount: { [key: string]: number } = {};
    quizAttempts.forEach(attempt => {
      attempt.answers.forEach(answer => {
        if (!answer.isCorrect) {
          questionMissCount[answer.questionId] = (questionMissCount[answer.questionId] || 0) + 1;
        }
      });
    });

    const mostMissedQuestions = Object.entries(questionMissCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([questionId]) => questionId);

    // Simple difficulty distribution based on points
    const difficultyDistribution = {
      easy: quiz.questions.filter(q => q.points <= 10).length,
      medium: quiz.questions.filter(q => q.points > 10 && q.points <= 20).length,
      hard: quiz.questions.filter(q => q.points > 20).length
    };

    return of({
      totalAttempts,
      averageScore: Math.round(averageScore * 100) / 100,
      passRate: Math.round(passRate * 100) / 100,
      averageTimeSpent: Math.round(averageTimeSpent),
      completionRate,
      mostMissedQuestions,
      difficultyDistribution
    }).pipe(delay(400));
  }

  // Get quiz by course
  getQuizzesByCourse(courseId: string): Observable<Quiz[]> {
    return this.getQuizzes({ courseId });
  }

  // Get active quizzes
  getActiveQuizzes(): Observable<Quiz[]> {
    return this.getQuizzes({ isActive: true });
  }

  // Check if user can attempt quiz
  canAttemptQuiz(quizId: string, userId: string): Observable<boolean> {
    const quiz = this.quizzes().find(q => q.id === quizId);
    if (!quiz || !quiz.isActive) {
      return of(false);
    }

    const userAttempts = this.attempts().filter(a => a.quizId === quizId && a.userId === userId);
    const submittedAttempts = userAttempts.filter(a => a.status === AttemptStatus.SUBMITTED);
    
    return of(submittedAttempts.length < quiz.maxAttempts);
  }
}
