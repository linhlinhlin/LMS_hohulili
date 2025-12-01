# Design Document

## Overview

This feature enables students to take quizzes associated with lessons in their enrolled courses. The implementation reuses the existing teacher quiz preview component with adaptations for the student domain. Students will access quizzes through a "Làm bài" button on the course detail page, complete the quiz in a dedicated interface, and receive immediate feedback on their performance.

The design follows Angular standalone component architecture and integrates with the existing API infrastructure. The quiz-taking experience mirrors the teacher's preview functionality to maintain consistency and reduce development effort.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Student Domain                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │  Course Detail   │────────▶│  Student Quiz    │          │
│  │   Component      │         │     Taking       │          │
│  │                  │         │   Component      │          │
│  └──────────────────┘         └──────────────────┘          │
│         │                              │                     │
│         │                              │                     │
│         ▼                              ▼                     │
│  ┌──────────────────────────────────────────────┐           │
│  │           Quiz API Service                    │           │
│  │  (Shared between Teacher & Student)           │           │
│  └──────────────────────────────────────────────┘           │
│                       │                                      │
└───────────────────────┼──────────────────────────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │  Backend API    │
              │  /api/v1/quizzes│
              └─────────────────┘
```

### Component Structure

```
fe/src/app/features/student/
├── pages/
│   ├── course-detail.component.ts          (Modified)
│   ├── course-detail.component.html        (Modified)
│   └── course-detail.component.scss        (Modified)
├── quiz/
│   ├── student-quiz-taking.component.ts    (New)
│   └── student-quiz-taking.component.scss  (New - Optional)
└── student.routes.ts                        (Modified)
```

### Routing Structure

```
/student/quiz/take/:lessonId?title=...&returnUrl=...
```

## Components and Interfaces

### 1. Course Detail Component (Modified)

**Purpose**: Display course content and provide quiz access buttons

**New Properties**:
```typescript
interface LessonWithQuiz extends Lesson {
  hasQuiz?: boolean;  // Indicates if lesson has an associated quiz
}
```

**New Methods**:
```typescript
// Check if a lesson has a quiz
hasQuiz(lessonId: string): boolean

// Navigate to quiz taking interface
goToQuiz(lessonId: string, lessonTitle: string): void
```

**API Integration**:
- Call `QuizApi.getQuizByLessonId(lessonId)` for each lesson to check quiz existence
- Cache results to avoid repeated API calls

### 2. Student Quiz Taking Component (New)

**Purpose**: Provide quiz-taking interface for students

**Component Signature**:
```typescript
@Component({
  selector: 'app-student-quiz-taking',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-quiz-taking.component.html',
  styleUrls: ['./student-quiz-taking.component.scss']
})
export class StudentQuizTakingComponent implements OnInit, OnDestroy
```

**State Signals**:
```typescript
lessonId = '';
quizTitle = signal('Bài kiểm tra');
returnUrl = '';

loading = signal(true);
error = signal<string | null>(null);
questions = signal<QuizQuestion[]>([]);
currentIndex = signal(0);
answers = signal<Record<string, string>>({});
showResults = signal(false);
showResultsModal = signal(true);

// Timer
timeRemaining = signal(30 * 60);
timeSpent = signal(0);
private timerInterval: any;
private startTime = 0;
```

**Computed Signals**:
```typescript
currentQuestion = computed(() => this.questions()[this.currentIndex()]);
answeredCount = computed(() => Object.keys(this.answers()).length);
correctCount = computed(() => { /* count correct answers */ });
wrongCount = computed(() => { /* count wrong answers */ });
unansweredCount = computed(() => { /* count unanswered */ });
scorePercent = computed(() => { /* calculate percentage */ });
```

**Methods**:
```typescript
// Lifecycle
ngOnInit(): void
ngOnDestroy(): void

// Data Loading
async loadQuiz(): Promise<void>

// Timer Management
startTimer(): void
stopTimer(): void
formatTime(seconds: number): string

// Answer Management
selectAnswer(questionId: string, optionKey: string): void

// Navigation
prevQuestion(): void
nextQuestion(): void
goToQuestion(index: number): void
goBack(): void

// Quiz Submission
submitQuiz(): void
closeResults(): void
resetQuiz(): void
```

### 3. Student Routes (Modified)

**New Route**:
```typescript
{
  path: 'quiz/take/:lessonId',
  loadComponent: () => import('./quiz/student-quiz-taking.component')
    .then(m => m.StudentQuizTakingComponent),
  title: 'Làm bài trắc nghiệm'
}
```

## Data Models

### QuizQuestion Interface

```typescript
interface QuizQuestion {
  id: string;
  content: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  options: QuestionOption[];
  correctOption: string;
}

interface QuestionOption {
  key: string;        // A, B, C, D
  content: string;    // Option text
}
```

### Quiz State

```typescript
interface QuizState {
  questions: QuizQuestion[];
  currentIndex: number;
  answers: Record<string, string>;  // questionId -> selectedOptionKey
  showResults: boolean;
  timeRemaining: number;
  timeSpent: number;
}
```

### Quiz Results

```typescript
interface QuizResults {
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  scorePercent: number;
  timeSpent: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Quiz button visibility consistency
*For any* lesson in the course detail page, the "Làm bài" button should be visible if and only if the lesson has an associated quiz in the backend
**Validates: Requirements 1.1, 1.2**

### Property 2: Navigation parameter preservation
*For any* quiz navigation from course detail page, the lesson ID, quiz title, and return URL should be correctly passed to the quiz-taking component
**Validates: Requirements 2.2, 2.3**

### Property 3: Question data integrity
*For any* quiz loaded from the API, all questions should have valid IDs, non-empty content, a difficulty level, at least 2 options, and a correct option that matches one of the option keys
**Validates: Requirements 4.2, 4.5**

### Property 4: Answer persistence across navigation
*For any* sequence of question navigations (previous, next, or direct), all previously selected answers should remain unchanged
**Validates: Requirements 5.4**

### Property 5: Progress indicator accuracy
*For any* quiz state, the answered count displayed in the progress indicator should equal the number of questions with selected answers
**Validates: Requirements 5.5**

### Property 6: Navigation button state consistency
*For any* current question index, the "Câu trước" button should be disabled if and only if the index is 0, and the "Câu tiếp" button should be replaced with "Nộp bài" if and only if the index is at the last question
**Validates: Requirements 6.4, 6.5**

### Property 7: Timer countdown accuracy
*For any* running timer, the time remaining should decrease by exactly 1 second per second, and should automatically submit the quiz when reaching zero
**Validates: Requirements 7.2, 7.4**

### Property 8: Score calculation correctness
*For any* submitted quiz, the score percentage should equal (number of correct answers / total questions) × 100, rounded to the nearest integer
**Validates: Requirements 8.4**

### Property 9: Results statistics consistency
*For any* quiz results, the sum of correct answers, wrong answers, and unanswered questions should equal the total number of questions
**Validates: Requirements 9.2**

### Property 10: Answer review immutability
*For any* quiz in review mode (after submission), attempting to select an option should not change the answers state
**Validates: Requirements 10.5**

### Property 11: Quiz reset completeness
*For any* quiz that is reset, all answers should be cleared, the current index should be 0, results should be hidden, and the timer should restart with the full time limit
**Validates: Requirements 11.1, 11.2, 11.3, 11.4**

### Property 12: Back navigation cleanup
*For any* back navigation from the quiz interface, the timer should be stopped and no quiz state should be persisted
**Validates: Requirements 12.1, 12.4, 12.5**

## Error Handling

### API Errors

1. **Quiz Not Found**
   - Display: "Bài kiểm tra này không tồn tại hoặc đã bị xóa"
   - Action: Provide back button to return to course detail

2. **No Questions**
   - Display: "Bài kiểm tra này chưa có câu hỏi nào"
   - Action: Provide back button to return to course detail

3. **Network Error**
   - Display: "Không thể tải bài kiểm tra. Vui lòng kiểm tra kết nối mạng"
   - Action: Provide retry button and back button

4. **Authentication Error**
   - Redirect to login page with return URL

### Client-Side Errors

1. **Invalid Lesson ID**
   - Display: "Đường dẫn không hợp lệ"
   - Action: Redirect to student courses page

2. **Timer Expiration**
   - Automatically submit quiz
   - Display results modal with time-out message

### Error Display Pattern

```typescript
@if (error()) {
  <div class="error-container">
    <div class="error-icon">⚠️</div>
    <h3>{{ error() }}</h3>
    <button (click)="goBack()">Quay lại</button>
  </div>
}
```

## Testing Strategy

### Unit Testing

Unit tests will verify specific examples and edge cases:

1. **Component Initialization**
   - Test component loads with valid lesson ID
   - Test component handles missing lesson ID
   - Test component handles invalid query parameters

2. **Answer Selection**
   - Test selecting an answer updates the answers state
   - Test changing an answer updates correctly
   - Test answer selection in review mode is disabled

3. **Navigation**
   - Test previous button disabled on first question
   - Test next button changes to submit on last question
   - Test direct navigation to specific question

4. **Timer**
   - Test timer starts on component init
   - Test timer stops on quiz submission
   - Test timer auto-submits at zero

5. **Results Calculation**
   - Test score calculation with all correct answers
   - Test score calculation with all wrong answers
   - Test score calculation with mixed answers
   - Test score calculation with unanswered questions

### Property-Based Testing

Property-based tests will verify universal properties across all inputs using **fast-check** library for TypeScript. Each test will run a minimum of 100 iterations.

1. **Property 1: Quiz button visibility consistency**
   - Generate: Random lesson lists with varying quiz associations
   - Test: Button visibility matches quiz existence
   - Tag: **Feature: student-quiz-taking, Property 1: Quiz button visibility consistency**

2. **Property 2: Navigation parameter preservation**
   - Generate: Random lesson IDs, titles, and return URLs
   - Test: All parameters correctly passed through navigation
   - Tag: **Feature: student-quiz-taking, Property 2: Navigation parameter preservation**

3. **Property 3: Question data integrity**
   - Generate: Random quiz responses from API
   - Test: All questions have required fields and valid structure
   - Tag: **Feature: student-quiz-taking, Property 3: Question data integrity**

4. **Property 4: Answer persistence across navigation**
   - Generate: Random navigation sequences and answer selections
   - Test: Answers remain unchanged after navigation
   - Tag: **Feature: student-quiz-taking, Property 4: Answer persistence across navigation**

5. **Property 5: Progress indicator accuracy**
   - Generate: Random answer states
   - Test: Answered count equals number of answered questions
   - Tag: **Feature: student-quiz-taking, Property 5: Progress indicator accuracy**

6. **Property 6: Navigation button state consistency**
   - Generate: Random question indices
   - Test: Button states match index position
   - Tag: **Feature: student-quiz-taking, Property 6: Navigation button state consistency**

7. **Property 7: Timer countdown accuracy**
   - Generate: Random timer durations
   - Test: Timer decrements correctly and auto-submits at zero
   - Tag: **Feature: student-quiz-taking, Property 7: Timer countdown accuracy**

8. **Property 8: Score calculation correctness**
   - Generate: Random answer combinations
   - Test: Score percentage calculation is accurate
   - Tag: **Feature: student-quiz-taking, Property 8: Score calculation correctness**

9. **Property 9: Results statistics consistency**
   - Generate: Random quiz results
   - Test: Sum of answer categories equals total questions
   - Tag: **Feature: student-quiz-taking, Property 9: Results statistics consistency**

10. **Property 10: Answer review immutability**
    - Generate: Random answer selection attempts in review mode
    - Test: Answers state remains unchanged
    - Tag: **Feature: student-quiz-taking, Property 10: Answer review immutability**

11. **Property 11: Quiz reset completeness**
    - Generate: Random quiz states before reset
    - Test: All state properly reset to initial values
    - Tag: **Feature: student-quiz-taking, Property 11: Quiz reset completeness**

12. **Property 12: Back navigation cleanup**
    - Generate: Random quiz states before navigation
    - Test: Timer stopped and no state persisted
    - Tag: **Feature: student-quiz-taking, Property 12: Back navigation cleanup**

### Integration Testing

Integration tests will verify the interaction between components:

1. **Course Detail to Quiz Taking Flow**
   - Test clicking "Làm bài" button navigates correctly
   - Test return URL brings user back to course detail

2. **API Integration**
   - Test quiz questions loaded from backend
   - Test error handling for failed API calls

3. **Routing Integration**
   - Test student guard allows authenticated students
   - Test route parameters extracted correctly

### Testing Framework

- **Unit Tests**: Jasmine + Karma (Angular default)
- **Property-Based Tests**: fast-check
- **Integration Tests**: Jasmine + Karma with TestBed
- **E2E Tests**: (Optional) Cypress or Playwright

### Test Configuration

```typescript
// Example property-based test setup
import * as fc from 'fast-check';

describe('StudentQuizTakingComponent - Property Tests', () => {
  it('Property 8: Score calculation correctness', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 50 }),
        (correctAnswers) => {
          const total = correctAnswers.length;
          const correct = correctAnswers.filter(x => x).length;
          const expected = Math.round((correct / total) * 100);
          
          const result = calculateScore(correct, total);
          
          return result === expected;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

## Implementation Notes

### Code Reuse Strategy

1. **Template Reuse**: Copy the entire template from `quiz-preview.component.ts` to `student-quiz-taking.component.ts`
2. **Logic Reuse**: Copy all component logic including signals, computed values, and methods
3. **Styling Reuse**: Use the same inline styles or reference shared SCSS
4. **API Reuse**: Use the existing `QuizApi` service without modifications

### Differences from Teacher Preview

1. **Route Path**: `/student/quiz/take/:lessonId` instead of `/teacher/quiz/preview/:lessonId`
2. **Guard**: Use `studentGuard` instead of `teacherGuard`
3. **Return Navigation**: Return to student course detail instead of teacher course management
4. **Future Enhancement**: Add quiz attempt persistence (not in current scope)

### Performance Considerations

1. **Lazy Loading**: Component is lazy-loaded through routing
2. **API Caching**: Cache quiz existence checks in course detail component
3. **Change Detection**: Use OnPush strategy with signals for optimal performance
4. **Timer Optimization**: Use single interval, clear on destroy

### Accessibility

1. **Keyboard Navigation**: All buttons accessible via keyboard
2. **Screen Reader Support**: Proper ARIA labels on interactive elements
3. **Focus Management**: Focus management for modal dialogs
4. **Color Contrast**: Ensure sufficient contrast for all text and buttons

### Mobile Responsiveness

1. **Breakpoints**:
   - Desktop: > 1024px (show sidebar)
   - Tablet: 768px - 1024px (hide sidebar, show compact navigator)
   - Mobile: < 768px (optimized layout)

2. **Touch Targets**: Minimum 44x44px for all interactive elements

3. **Viewport**: Use responsive units (rem, %, vw/vh)
