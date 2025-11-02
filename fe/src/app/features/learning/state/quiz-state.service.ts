import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Quiz, Question, QuizAttempt, QuizResult, QuestionType } from '../../../shared/types/quiz.types';

@Injectable({
  providedIn: 'root'
})
export class QuizStateService {
  private router = inject(Router);
  
  // Core signals for quiz state
  private _currentQuiz = signal<Quiz | null>(null);
  private _currentQuestionIndex = signal<number>(0);
  private _answers = signal<{ [questionId: string]: any }>({});
  private _timeRemaining = signal<number>(0);
  private _isQuizActive = signal<boolean>(false);
  private _isQuizCompleted = signal<boolean>(false);
  private _quizResult = signal<QuizResult | null>(null);
  private _error = signal<string | null>(null);

  // Timer management
  private timerInterval?: number;
  private startTime?: Date;

  // Readonly signals for external consumption
  readonly currentQuiz = this._currentQuiz.asReadonly();
  readonly currentQuestionIndex = this._currentQuestionIndex.asReadonly();
  readonly answers = this._answers.asReadonly();
  readonly timeRemaining = this._timeRemaining.asReadonly();
  readonly isQuizActive = this._isQuizActive.asReadonly();
  readonly isQuizCompleted = this._isQuizCompleted.asReadonly();
  readonly quizResult = this._quizResult.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed signals
  readonly currentQuestion = computed(() => {
    const quiz = this._currentQuiz();
    const index = this._currentQuestionIndex();
    return quiz && quiz.questions ? quiz.questions[index] : null;
  });

  readonly totalQuestions = computed(() => {
    const quiz = this._currentQuiz();
    return quiz ? quiz.questions.length : 0;
  });

  readonly progress = computed(() => {
    const total = this.totalQuestions();
    const current = this._currentQuestionIndex();
    return total > 0 ? Math.round((current / total) * 100) : 0;
  });

  readonly answeredQuestions = computed(() => {
    const answers = this._answers();
    return Object.keys(answers).length;
  });

  readonly timeFormatted = computed(() => {
    const time = this._timeRemaining();
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  });

  readonly canSubmit = computed(() => {
    return this._isQuizActive() && this.answeredQuestions() > 0;
  });

  readonly isLastQuestion = computed(() => {
    const current = this._currentQuestionIndex();
    const total = this.totalQuestions();
    return current >= total - 1;
  });

  readonly isFirstQuestion = computed(() => {
    return this._currentQuestionIndex() === 0;
  });

  constructor() {
    // Auto-submit when time runs out
    effect(() => {
      if (this._timeRemaining() <= 0 && this._isQuizActive()) {
        this.submitQuiz();
      }
    });
  }

  /**
   * Start a new quiz
   */
  startQuiz(quiz: Quiz): void {
    this._currentQuiz.set(quiz);
    this._currentQuestionIndex.set(0);
    this._answers.set({});
    this._timeRemaining.set(quiz.timeLimit || 1800); // Default 30 minutes
    this._isQuizActive.set(true);
    this._isQuizCompleted.set(false);
    this._quizResult.set(null);
    this._error.set(null);
    this.startTime = new Date();
    
    this.startTimer();
  }

  /**
   * Answer a question
   */
  answerQuestion(questionId: string, answer: any): void {
    if (!this._isQuizActive()) return;

    this._answers.update(answers => ({
      ...answers,
      [questionId]: answer
    }));
  }

  /**
   * Navigate to next question
   */
  nextQuestion(): void {
    const current = this._currentQuestionIndex();
    const total = this.totalQuestions();
    
    if (current < total - 1) {
      this._currentQuestionIndex.set(current + 1);
    }
  }

  /**
   * Navigate to previous question
   */
  previousQuestion(): void {
    const current = this._currentQuestionIndex();
    
    if (current > 0) {
      this._currentQuestionIndex.set(current - 1);
    }
  }

  /**
   * Navigate to specific question
   */
  goToQuestion(index: number): void {
    const total = this.totalQuestions();
    
    if (index >= 0 && index < total) {
      this._currentQuestionIndex.set(index);
    }
  }

  /**
   * Submit the quiz
   */
  submitQuiz(): void {
    if (!this._isQuizActive()) return;

    this.stopTimer();
    this._isQuizActive.set(false);
    this._isQuizCompleted.set(true);

    const result = this.calculateResult();
    this._quizResult.set(result);

    // Navigate to result page
    this.router.navigate(['/learn/quiz/result'], { 
      queryParams: { quizId: this._currentQuiz()?.id } 
    });
  }

  /**
   * Reset quiz state
   */
  resetQuiz(): void {
    this.stopTimer();
    this._currentQuiz.set(null);
    this._currentQuestionIndex.set(0);
    this._answers.set({});
    this._timeRemaining.set(0);
    this._isQuizActive.set(false);
    this._isQuizCompleted.set(false);
    this._quizResult.set(null);
    this._error.set(null);
    this.startTime = undefined;
  }

  /**
   * Get answer for a specific question
   */
  getAnswer(questionId: string): any {
    const answers = this._answers();
    return answers[questionId];
  }

  /**
   * Check if a question is answered
   */
  isQuestionAnswered(questionId: string): boolean {
    const answers = this._answers();
    return questionId in answers;
  }

  /**
   * Get all answered questions
   */
  getAnsweredQuestions(): string[] {
    const answers = this._answers();
    return Object.keys(answers);
  }

  /**
   * Get unanswered questions
   */
  getUnansweredQuestions(): string[] {
    const quiz = this._currentQuiz();
    if (!quiz) return [];

    const answered = this.getAnsweredQuestions();
    return quiz.questions
      .map(q => q.id)
      .filter(id => !answered.includes(id));
  }

  /**
   * Start the timer
   */
  private startTimer(): void {
    this.stopTimer(); // Clear any existing timer
    
    this.timerInterval = window.setInterval(() => {
      this._timeRemaining.update(time => {
        if (time <= 1) {
          this.submitQuiz();
          return 0;
        }
        return time - 1;
      });
    }, 1000);
  }

  /**
   * Stop the timer
   */
  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
  }

  /**
   * Calculate quiz result
   */
  private calculateResult(): QuizResult {
    const quiz = this._currentQuiz();
    const answers = this._answers();
    const endTime = new Date();
    const timeSpent = this.startTime ? Math.floor((endTime.getTime() - this.startTime.getTime()) / 1000) : 0;

    if (!quiz) {
      return {
        attemptId: '',
        quizId: '',
        userId: '',
        score: 0,
        totalQuestions: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        timeSpent: 0,
        percentage: 0,
        isPassed: false,
        submittedAt: endTime
      };
    }

    let correctAnswers = 0;
    let incorrectAnswers = 0;

    quiz.questions.forEach(question => {
      const userAnswer = answers[question.id];
      const isCorrect = this.checkAnswer(question, userAnswer);
      
      if (isCorrect) {
        correctAnswers++;
      } else {
        incorrectAnswers++;
      }
    });

    const totalQuestions = quiz.questions.length;
    const score = correctAnswers;
    const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    const isPassed = percentage >= (quiz.passingScore || 70);

    return {
      attemptId: 'attempt_' + Date.now(),
      quizId: quiz.id,
      userId: 'current_user', // This should come from auth service
      score,
      totalQuestions,
      correctAnswers,
      incorrectAnswers,
      timeSpent,
      percentage,
      isPassed,
      submittedAt: endTime
    };
  }

  /**
   * Check if an answer is correct
   */
  private checkAnswer(question: Question, userAnswer: any): boolean {
    if (!userAnswer) return false;

    switch (question.type) {
      case QuestionType.MULTIPLE_CHOICE:
        return userAnswer === question.correctAnswer;
      
      case QuestionType.TRUE_FALSE:
        return userAnswer === question.correctAnswer;
      
      case QuestionType.FILL_BLANK:
        if (typeof userAnswer === 'string' && typeof question.correctAnswer === 'string') {
          return question.correctAnswer.toLowerCase().trim() === userAnswer.toLowerCase().trim();
        }
        return false;
      
      default:
        return false;
    }
  }

  /**
   * Get question navigation data
   */
  getQuestionNavigation(): Array<{ index: number; answered: boolean; current: boolean }> {
    const quiz = this._currentQuiz();
    const currentIndex = this._currentQuestionIndex();
    const answered = this.getAnsweredQuestions();

    if (!quiz) return [];

    return quiz.questions.map((question, index) => ({
      index,
      answered: answered.includes(question.id),
      current: index === currentIndex
    }));
  }

  /**
   * Get quiz statistics
   */
  getQuizStats(): {
    totalQuestions: number;
    answeredQuestions: number;
    unansweredQuestions: number;
    progress: number;
    timeRemaining: number;
    timeFormatted: string;
  } {
    return {
      totalQuestions: this.totalQuestions(),
      answeredQuestions: this.answeredQuestions(),
      unansweredQuestions: this.getUnansweredQuestions().length,
      progress: this.progress(),
      timeRemaining: this._timeRemaining(),
      timeFormatted: this.timeFormatted()
    };
  }
}
