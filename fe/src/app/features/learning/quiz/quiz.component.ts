import { Component, ChangeDetectionStrategy, ViewEncapsulation, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  points: number;
}

interface QuizResult {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  passed: boolean;
}

@Component({
  selector: 'app-quiz',
  imports: [CommonModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="quiz-container min-h-screen bg-gray-50">
      @if (!showResults()) {
        <!-- Quiz Header -->
        <div class="quiz-header">
          <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div class="quiz-title">
              <svg class="quiz-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
              </svg>
              {{ quizTitle() }}
            </div>
            <p class="quiz-subtitle">{{ quizDescription() }}</p>
            <div class="quiz-progress">
              <div class="progress-bar">
                <div class="progress-fill" [style.width.%]="progressPercentage()"></div>
              </div>
              <div class="progress-text">
                <span>Câu hỏi {{ currentQuestionIndex() + 1 }} / {{ totalQuestions() }}</span>
                <span>{{ timeRemaining() }} phút</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Quiz Content -->
        <div class="quiz-content">
          <div class="quiz-questions">
            @for (question of questions(); track question.id) {
              @if (question.id === currentQuestion().id) {
                <div class="question-card">
                  <div class="question-header">
                    <div class="question-number">{{ currentQuestionIndex() + 1 }}</div>
                    <div class="question-text">{{ question.question }}</div>
                    <div class="question-points">{{ question.points }} điểm</div>
                  </div>
                  
                  <div class="question-options">
                    @for (option of question.options; track $index) {
                      <div class="option-item"
                           [class.selected]="selectedAnswers()[currentQuestionIndex()] === $index"
                           [class.correct]="showAnswer() && $index === question.correctAnswer"
                           [class.incorrect]="showAnswer() && selectedAnswers()[currentQuestionIndex()] === $index && $index !== question.correctAnswer"
                           (click)="selectAnswer($index)">
                        <input type="radio" 
                               class="option-input"
                               [checked]="selectedAnswers()[currentQuestionIndex()] === $index"
                               [disabled]="showAnswer()">
                        <span class="option-text">{{ option }}</span>
                        @if (showAnswer()) {
                          @if ($index === question.correctAnswer) {
                            <svg class="option-icon correct" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                            </svg>
                          } @else if (selectedAnswers()[currentQuestionIndex()] === $index) {
                            <svg class="option-icon incorrect" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                            </svg>
                          }
                        }
                      </div>
                    }
                  </div>
                  
                  @if (showAnswer()) {
                    <div class="question-explanation">
                      <div class="explanation-title">Giải thích:</div>
                      <div>{{ question.explanation }}</div>
                    </div>
                  }
                </div>
              }
            }
          </div>
          
          <div class="quiz-navigation">
            <button class="nav-button btn-outline"
                    [disabled]="currentQuestionIndex() === 0"
                    (click)="previousQuestion()">
              <svg class="btn-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"></path>
              </svg>
              Câu trước
            </button>
            
            <div class="flex gap-2">
              @if (currentQuestionIndex() < totalQuestions() - 1) {
                <button class="nav-button btn-primary"
                        [disabled]="selectedAnswers()[currentQuestionIndex()] === undefined"
                        (click)="nextQuestion()">
                  Câu tiếp
                  <svg class="btn-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                  </svg>
                </button>
              } @else {
                <button class="nav-button btn-primary"
                        [disabled]="selectedAnswers()[currentQuestionIndex()] === undefined"
                        (click)="submitQuiz()">
                  Nộp bài
                  <svg class="btn-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                  </svg>
                </button>
              }
              
              @if (!showAnswer()) {
                <button class="nav-button btn-secondary"
                        (click)="showAnswerForCurrentQuestion()">
                  Xem đáp án
                </button>
              }
            </div>
          </div>
        </div>
      } @else {
        <!-- Quiz Results -->
        <div class="quiz-results">
          <div class="results-header">
            <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div class="results-title">
                <svg class="results-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
                Kết quả Quiz
              </div>
              <p class="results-subtitle">Chúc mừng bạn đã hoàn thành bài kiểm tra!</p>
            </div>
          </div>
          
          <div class="results-content">
            <div class="score-card">
              <div class="score-circle" [class]="getScoreClass()">
                <div class="score-text" [class]="getScoreClass()">{{ quizResult().score }}%</div>
              </div>
              <div class="score-label">{{ getScoreLabel() }}</div>
              <div class="score-description">{{ getScoreDescription() }}</div>
            </div>
            
            <div class="results-stats">
              <div class="stat-item">
                <div class="stat-value">{{ quizResult().correctAnswers }}</div>
                <div class="stat-label">Câu trả lời đúng</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ quizResult().totalQuestions }}</div>
                <div class="stat-label">Tổng số câu hỏi</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ quizResult().timeSpent }}</div>
                <div class="stat-label">Thời gian (phút)</div>
              </div>
            </div>
            
            <div class="results-actions">
              <button class="action-button btn-outline" (click)="retakeQuiz()">
                <svg class="btn-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"></path>
                </svg>
                Làm lại
              </button>
              <button class="action-button btn-primary" (click)="continueLearning()">
                <svg class="btn-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                </svg>
                Tiếp tục học
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizComponent implements OnInit {
  // Quiz data
  quizTitle = signal('Kiểm tra An toàn Hàng hải');
  quizDescription = signal('Bài kiểm tra kiến thức về an toàn hàng hải cơ bản');
  
  questions = signal<QuizQuestion[]>([
    {
      id: 1,
      question: 'Khi có tín hiệu báo động cháy trên tàu, hành động đầu tiên cần làm là gì?',
      options: [
        'Chạy ra ngoài ngay lập tức',
        'Báo cáo cho thuyền trưởng',
        'Kiểm tra vị trí cháy và báo động',
        'Lấy đồ đạc cá nhân'
      ],
      correctAnswer: 2,
      explanation: 'Khi có tín hiệu báo động cháy, cần kiểm tra vị trí cháy và báo động để xác định tình hình trước khi hành động.',
      points: 10
    },
    {
      id: 2,
      question: 'Trang bị bảo hộ cá nhân (PPE) nào là bắt buộc khi làm việc trên boong tàu?',
      options: [
        'Mũ bảo hiểm và găng tay',
        'Áo phao và giày chống trượt',
        'Kính bảo hộ và khẩu trang',
        'Tất cả các trang bị trên'
      ],
      correctAnswer: 3,
      explanation: 'Khi làm việc trên boong tàu, cần đầy đủ trang bị bảo hộ cá nhân để đảm bảo an toàn.',
      points: 10
    },
    {
      id: 3,
      question: 'Trong trường hợp khẩn cấp, thứ tự ưu tiên cứu hộ là gì?',
      options: [
        'Phụ nữ và trẻ em trước',
        'Người bị thương nặng trước',
        'Thuyền trưởng và sĩ quan',
        'Theo thứ tự gần nhất'
      ],
      correctAnswer: 1,
      explanation: 'Trong cứu hộ khẩn cấp, ưu tiên những người bị thương nặng cần được cứu chữa ngay lập tức.',
      points: 10
    },
    {
      id: 4,
      question: 'Khi tàu bị nghiêng, hành động nào là đúng?',
      options: [
        'Chạy về phía cao hơn',
        'Ở nguyên vị trí hiện tại',
        'Chạy về phía thấp hơn',
        'Nhảy xuống nước'
      ],
      correctAnswer: 0,
      explanation: 'Khi tàu bị nghiêng, cần di chuyển về phía cao hơn để tránh bị nước cuốn trôi.',
      points: 10
    },
    {
      id: 5,
      question: 'Tần suất kiểm tra thiết bị cứu sinh trên tàu là bao lâu?',
      options: [
        'Hàng tuần',
        'Hàng tháng',
        'Hàng quý',
        'Hàng năm'
      ],
      correctAnswer: 1,
      explanation: 'Thiết bị cứu sinh cần được kiểm tra hàng tháng để đảm bảo hoạt động tốt khi cần thiết.',
      points: 10
    }
  ]);
  
  // Quiz state
  currentQuestionIndex = signal(0);
  selectedAnswers = signal<number[]>([]);
  showAnswer = signal(false);
  showResults = signal(false);
  timeRemaining = signal(30);
  startTime = signal(0);
  
  // Computed values
  currentQuestion = computed(() => this.questions()[this.currentQuestionIndex()]);
  totalQuestions = computed(() => this.questions().length);
  progressPercentage = computed(() => 
    ((this.currentQuestionIndex() + 1) / this.totalQuestions()) * 100
  );
  
  quizResult = signal<QuizResult>({
    score: 0,
    totalQuestions: 0,
    correctAnswers: 0,
    timeSpent: 0,
    passed: false
  });
  
  ngOnInit() {
    this.initializeQuiz();
    this.startTimer();
  }
  
  initializeQuiz() {
    this.selectedAnswers.set(new Array(this.totalQuestions()).fill(undefined));
    this.startTime.set(Date.now());
  }
  
  startTimer() {
    const timer = setInterval(() => {
      const remaining = this.timeRemaining() - 1;
      this.timeRemaining.set(remaining);
      
      if (remaining <= 0) {
        clearInterval(timer);
        this.submitQuiz();
      }
    }, 60000); // 1 minute intervals
  }
  
  selectAnswer(answerIndex: number) {
    if (this.showAnswer()) return;
    
    const answers = [...this.selectedAnswers()];
    answers[this.currentQuestionIndex()] = answerIndex;
    this.selectedAnswers.set(answers);
  }
  
  nextQuestion() {
    if (this.currentQuestionIndex() < this.totalQuestions() - 1) {
      this.currentQuestionIndex.set(this.currentQuestionIndex() + 1);
      this.showAnswer.set(false);
    }
  }
  
  previousQuestion() {
    if (this.currentQuestionIndex() > 0) {
      this.currentQuestionIndex.set(this.currentQuestionIndex() - 1);
      this.showAnswer.set(false);
    }
  }
  
  showAnswerForCurrentQuestion() {
    this.showAnswer.set(true);
  }
  
  submitQuiz() {
    const answers = this.selectedAnswers();
    const questions = this.questions();
    let correctAnswers = 0;
    
    answers.forEach((answer, index) => {
      if (answer === questions[index].correctAnswer) {
        correctAnswers++;
      }
    });
    
    const score = Math.round((correctAnswers / this.totalQuestions()) * 100);
    const timeSpent = Math.round((Date.now() - this.startTime()) / 60000);
    
    this.quizResult.set({
      score,
      totalQuestions: this.totalQuestions(),
      correctAnswers,
      timeSpent,
      passed: score >= 70
    });
    
    this.showResults.set(true);
  }
  
  retakeQuiz() {
    this.currentQuestionIndex.set(0);
    this.selectedAnswers.set(new Array(this.totalQuestions()).fill(undefined));
    this.showAnswer.set(false);
    this.showResults.set(false);
    this.timeRemaining.set(30);
    this.startTime.set(Date.now());
    this.startTimer();
  }
  
  continueLearning() {
    // Navigate back to learning page
    window.history.back();
  }
  
  getScoreClass() {
    const score = this.quizResult().score;
    if (score >= 90) return 'score-excellent';
    if (score >= 70) return 'score-good';
    if (score >= 50) return 'score-fair';
    return 'score-poor';
  }
  
  getScoreLabel() {
    const score = this.quizResult().score;
    if (score >= 90) return 'Xuất sắc!';
    if (score >= 70) return 'Tốt!';
    if (score >= 50) return 'Trung bình';
    return 'Cần cải thiện';
  }
  
  getScoreDescription() {
    const score = this.quizResult().score;
    if (score >= 90) return 'Bạn đã nắm vững kiến thức về an toàn hàng hải!';
    if (score >= 70) return 'Bạn có kiến thức tốt về an toàn hàng hải!';
    if (score >= 50) return 'Bạn cần ôn tập thêm về an toàn hàng hải.';
    return 'Bạn cần học lại kiến thức về an toàn hàng hải.';
  }
}
