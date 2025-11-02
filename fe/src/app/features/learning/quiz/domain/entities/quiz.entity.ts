import { Quiz, Question, QuizAttempt, QuizAnswer, QuestionType, QuizStatus, QuizAttemptStatus, QuizDifficulty } from '../../types';

/**
 * Quiz Domain Entity
 *
 * Represents a quiz in the domain layer with business logic
 */
export class QuizEntity {
  constructor(
    public readonly id: string,
    public title: string,
    public description: string,
    public readonly courseId: string,
    public readonly instructorId: string,
    public questions: Question[],
    public timeLimit?: number,
    public passingScore: number = 70,
    public maxAttempts: number = 3,
    public difficulty: QuizDifficulty = QuizDifficulty.INTERMEDIATE,
    public status: QuizStatus = QuizStatus.DRAFT,
    public tags: string[] = [],
    public instructions?: string,
    public dueDate?: Date,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  /**
   * Business logic: Check if quiz is active
   */
  get isActive(): boolean {
    return this.status === QuizStatus.PUBLISHED &&
           (!this.dueDate || this.dueDate > new Date());
  }

  /**
   * Business logic: Calculate total points
   */
  get totalPoints(): number {
    return this.questions.reduce((total, question) => total + question.points, 0);
  }

  /**
   * Business logic: Validate quiz before publishing
   */
  canBePublished(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.title.trim()) {
      errors.push('Quiz title is required');
    }

    if (!this.description.trim()) {
      errors.push('Quiz description is required');
    }

    if (this.questions.length === 0) {
      errors.push('Quiz must have at least one question');
    }

    if (this.passingScore < 0 || this.passingScore > 100) {
      errors.push('Passing score must be between 0 and 100');
    }

    if (this.timeLimit && this.timeLimit <= 0) {
      errors.push('Time limit must be positive');
    }

    // Validate questions
    this.questions.forEach((question, index) => {
      if (!question.text.trim()) {
        errors.push(`Question ${index + 1}: Text is required`);
      }

      if (question.points <= 0) {
        errors.push(`Question ${index + 1}: Points must be positive`);
      }

      if (question.type === QuestionType.MULTIPLE_CHOICE && (!question.options || question.options.length < 2)) {
        errors.push(`Question ${index + 1}: Multiple choice questions must have at least 2 options`);
      }

      if (!question.correctAnswer || (Array.isArray(question.correctAnswer) && question.correctAnswer.length === 0)) {
        errors.push(`Question ${index + 1}: Correct answer is required`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Business logic: Publish quiz
   */
  publish(): void {
    const validation = this.canBePublished();
    if (!validation.valid) {
      throw new Error(`Cannot publish quiz: ${validation.errors.join(', ')}`);
    }

    this.status = QuizStatus.PUBLISHED;
    this.updatedAt = new Date();
  }

  /**
   * Business logic: Archive quiz
   */
  archive(): void {
    this.status = QuizStatus.ARCHIVED;
    this.updatedAt = new Date();
  }

  /**
   * Business logic: Add question
   */
  addQuestion(question: Omit<Question, 'id' | 'order'>): void {
    const newQuestion: Question = {
      ...question,
      id: this.generateQuestionId(),
      order: this.questions.length
    };

    this.questions.push(newQuestion);
    this.updatedAt = new Date();
  }

  /**
   * Business logic: Remove question
   */
  removeQuestion(questionId: string): void {
    this.questions = this.questions.filter(q => q.id !== questionId);
    // Reorder remaining questions
    this.questions.forEach((q, index) => q.order = index);
    this.updatedAt = new Date();
  }

  /**
   * Business logic: Update question
   */
  updateQuestion(questionId: string, updates: Partial<Question>): void {
    const questionIndex = this.questions.findIndex(q => q.id === questionId);
    if (questionIndex === -1) {
      throw new Error(`Question with id ${questionId} not found`);
    }

    this.questions[questionIndex] = { ...this.questions[questionIndex], ...updates };
    this.updatedAt = new Date();
  }

  /**
   * Business logic: Reorder questions
   */
  reorderQuestions(newOrder: string[]): void {
    const reorderedQuestions: Question[] = [];

    newOrder.forEach((questionId, index) => {
      const question = this.questions.find(q => q.id === questionId);
      if (question) {
        reorderedQuestions.push({ ...question, order: index });
      }
    });

    if (reorderedQuestions.length !== this.questions.length) {
      throw new Error('Invalid question order: some questions are missing');
    }

    this.questions = reorderedQuestions;
    this.updatedAt = new Date();
  }

  private generateQuestionId(): string {
    return `question_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Question Domain Entity
 */
export class QuestionEntity {
  constructor(
    public readonly id: string,
    public text: string,
    public type: QuestionType,
    public correctAnswer: string | string[],
    public options?: string[],
    public explanation?: string,
    public points: number = 1,
    public timeLimit?: number,
    public order: number = 0,
    public tags: string[] = []
  ) {}

  /**
   * Business logic: Validate question
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.text.trim()) {
      errors.push('Question text is required');
    }

    if (this.points <= 0) {
      errors.push('Points must be positive');
    }

    if (this.type === QuestionType.MULTIPLE_CHOICE && (!this.options || this.options.length < 2)) {
      errors.push('Multiple choice questions must have at least 2 options');
    }

    if (!this.correctAnswer || (Array.isArray(this.correctAnswer) && this.correctAnswer.length === 0)) {
      errors.push('Correct answer is required');
    }

    if (this.timeLimit && this.timeLimit <= 0) {
      errors.push('Time limit must be positive');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Business logic: Check if answer is correct
   */
  isCorrectAnswer(answer: string | string[]): boolean {
    if (Array.isArray(this.correctAnswer) && Array.isArray(answer)) {
      return this.correctAnswer.length === answer.length &&
             this.correctAnswer.every(ans => answer.includes(ans));
    }

    return this.correctAnswer === answer;
  }

  /**
   * Business logic: Calculate points for answer
   */
  calculatePoints(answer: string | string[]): number {
    return this.isCorrectAnswer(answer) ? this.points : 0;
  }
}

/**
 * Quiz Attempt Domain Entity
 */
export class QuizAttemptEntity {
  constructor(
    public readonly id: string,
    public readonly quizId: string,
    public readonly studentId: string,
    public readonly startTime: Date,
    public endTime?: Date,
    public answers: QuizAnswer[] = [],
    public status: QuizAttemptStatus = QuizAttemptStatus.IN_PROGRESS
  ) {}

  /**
   * Business logic: Add answer
   */
  addAnswer(questionId: string, answer: string | string[], timeSpent: number): void {
    const existingAnswerIndex = this.answers.findIndex(a => a.questionId === questionId);

    const quizAnswer: QuizAnswer = {
      questionId,
      answer,
      isCorrect: false, // Will be calculated when quiz is submitted
      points: 0, // Will be calculated when quiz is submitted
      timeSpent
    };

    if (existingAnswerIndex >= 0) {
      this.answers[existingAnswerIndex] = quizAnswer;
    } else {
      this.answers.push(quizAnswer);
    }
  }

  /**
   * Business logic: Complete attempt
   */
  complete(quiz: QuizEntity): QuizResult {
    this.endTime = new Date();
    this.status = QuizAttemptStatus.COMPLETED;

    // Calculate results
    let totalScore = 0;
    let correctAnswers = 0;

    this.answers.forEach(answer => {
      const question = quiz.questions.find(q => q.id === answer.questionId);
      if (question) {
        const questionEntity = new QuestionEntity(
          question.id, question.text, question.type, question.correctAnswer,
          question.options, question.explanation, question.points,
          question.timeLimit, question.order, question.tags
        );

        answer.isCorrect = questionEntity.isCorrectAnswer(answer.answer);
        answer.points = questionEntity.calculatePoints(answer.answer);

        if (answer.isCorrect) {
          correctAnswers++;
        }
        totalScore += answer.points;
      }
    });

    const percentage = quiz.totalPoints > 0 ? (totalScore / quiz.totalPoints) * 100 : 0;
    const isPassed = percentage >= quiz.passingScore;

    return {
      attemptId: this.id,
      quizId: this.quizId,
      studentId: this.studentId,
      score: totalScore,
      percentage: Math.round(percentage),
      totalQuestions: quiz.questions.length,
      correctAnswers,
      timeSpent: this.getTimeSpent(),
      isPassed,
      submittedAt: this.endTime,
      detailedResults: this.answers.map(answer => {
        const question = quiz.questions.find(q => q.id === answer.questionId)!;
        return {
          questionId: answer.questionId,
          questionText: question.text,
          userAnswer: answer.answer,
          correctAnswer: question.correctAnswer,
          isCorrect: answer.isCorrect,
          points: answer.points,
          maxPoints: question.points,
          explanation: question.explanation
        };
      })
    };
  }

  /**
   * Business logic: Get time spent
   */
  getTimeSpent(): number {
    const endTime = this.endTime || new Date();
    return Math.floor((endTime.getTime() - this.startTime.getTime()) / 1000);
  }

  /**
   * Business logic: Check if attempt can be submitted
   */
  canBeSubmitted(): boolean {
    return this.status === QuizAttemptStatus.IN_PROGRESS;
  }

  /**
   * Business logic: Abandon attempt
   */
  abandon(): void {
    this.status = QuizAttemptStatus.ABANDONED;
    this.endTime = new Date();
  }
}

/**
 * Quiz Result Domain Entity
 */
export interface QuizResult {
  attemptId: string;
  quizId: string;
  studentId: string;
  score: number;
  percentage: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  isPassed: boolean;
  submittedAt: Date;
  detailedResults: {
    questionId: string;
    questionText: string;
    userAnswer: string | string[];
    correctAnswer: string | string[];
    isCorrect: boolean;
    points: number;
    maxPoints: number;
    explanation?: string;
  }[];
}