# Design Document

## Overview

Cải thiện form tạo bài trắc nghiệm trong Section Editor bằng cách tích hợp đầy đủ các trường cấu hình quiz và giao diện chọn câu hỏi trực tiếp vào form, thay vì yêu cầu giáo viên phải qua modal riêng biệt. Điều này giảm số bước cần thiết và cải thiện trải nghiệm người dùng.

## Architecture

### Current Flow (Before)
1. Giáo viên chọn "Trắc nghiệm" → Chỉ nhập tiêu đề
2. Nhấn "Tạo bài trắc nghiệm" → Quiz được tạo với cấu hình mặc định
3. Hệ thống mở modal riêng để cấu hình chi tiết
4. Giáo viên cấu hình và chọn câu hỏi trong modal
5. Lưu và đóng modal

### New Flow (After)
1. Giáo viên chọn "Trắc nghiệm" → Form mở rộng hiển thị tất cả trường
2. Giáo viên nhập: tiêu đề, thời gian, điểm, số lần làm
3. Giáo viên chọn package và chọn câu hỏi (tùy chọn)
4. Nhấn "Tạo bài trắc nghiệm" → Quiz được tạo với đầy đủ cấu hình và câu hỏi
5. Hoàn tất trong một bước

## Components and Interfaces

### 1. Enhanced Quiz Form Section

**Location:** `section-editor.component.ts` template

**Structure:**
```typescript
<!-- Quiz Configuration Section - Expanded -->
<div *ngIf="isQuizType" class="space-y-6">
  <!-- Quiz Settings Card -->
  <div class="bg-purple-50 rounded-xl p-6 border border-purple-200">
    <h4>⚙️ Cấu hình bài trắc nghiệm</h4>
    
    <!-- Time Limit -->
    <div>
      <label>Thời gian làm bài (phút)</label>
      <input type="number" formControlName="quizTimeLimit" />
    </div>
    
    <!-- Passing Score -->
    <div>
      <label>Điểm tối thiểu để đạt (%)</label>
      <input type="number" formControlName="quizMaxScore" />
    </div>
    
    <!-- Max Attempts -->
    <div>
      <label>Số lần làm tối đa</label>
      <input type="number" formControlName="quizMaxAttempts" />
    </div>
  </div>
  
  <!-- Question Selection Card -->
  <div class="bg-blue-50 rounded-xl p-6 border border-blue-200">
    <h4>📝 Chọn câu hỏi (tùy chọn)</h4>
    
    <!-- Package Selector -->
    <div>
      <label>Chọn gói câu hỏi</label>
      <select [(ngModel)]="selectedPackageId" (change)="loadPackageQuestions()">
        <option value="">-- Chọn gói câu hỏi --</option>
        <option *ngFor="let pkg of packages()" [value]="pkg.id">
          {{ pkg.name }} ({{ pkg.questionCount }} câu)
        </option>
      </select>
    </div>
    
    <!-- Question List with Checkboxes -->
    <div *ngIf="packageQuestions().length > 0">
      <div *ngFor="let q of packageQuestions()">
        <label>
          <input type="checkbox" 
                 [checked]="isQuestionSelected(q.id)"
                 (change)="toggleQuestionSelection(q.id)" />
          {{ q.content }}
        </label>
      </div>
    </div>
    
    <!-- Selected Questions Preview -->
    <div *ngIf="selectedQuestions().length > 0">
      <h5>Đã chọn: {{ selectedQuestions().length }} câu</h5>
      <div *ngFor="let q of selectedQuestions()">
        <!-- Question preview with remove button -->
      </div>
    </div>
  </div>
</div>
```

### 2. Form State Management

**New Signals:**
```typescript
// Package and question selection
packages = signal<Package[]>([]);
selectedPackageId = signal<string>('');
packageQuestions = signal<Question[]>([]);
selectedQuestionIds = signal<Set<string>>(new Set());
selectedQuestions = computed(() => {
  const ids = this.selectedQuestionIds();
  return this.packageQuestions().filter(q => ids.has(q.id));
});

// Loading states
packagesLoading = signal<boolean>(false);
questionsLoading = signal<boolean>(false);
```

### 3. Form Validation

**Enhanced Validators:**
```typescript
createForm = this.fb.group({
  title: ['', [Validators.required, Validators.maxLength(255)]],
  lessonType: ['LECTURE', [Validators.required]],
  
  // Quiz-specific with validation
  quizTimeLimit: [30, [
    Validators.required, 
    Validators.min(1), 
    Validators.max(180)
  ]],
  quizMaxScore: [60, [
    Validators.required, 
    Validators.min(0), 
    Validators.max(100)
  ]],
  quizMaxAttempts: [1, [
    Validators.required, 
    Validators.min(1), 
    Validators.max(10)
  ]]
});
```

## Data Models

### Quiz Creation Request (Enhanced)

```typescript
interface CreateQuizLessonRequest {
  title: string;
  sectionId: string;
  lessonType: 'QUIZ';
  
  // Quiz configuration
  quizTimeLimit: number;      // minutes (1-180)
  quizMaxScore: number;        // percentage (0-100)
  quizMaxAttempts: number;     // attempts (1-10)
  
  // Optional: questions to add immediately
  questionIds?: string[];
}
```

### Package Model

```typescript
interface Package {
  id: string;
  name: string;
  description: string;
  questionCount: number;
  createdBy: string;
  createdAt: string;
}
```

### Question Model

```typescript
interface Question {
  id: string;
  content: string;
  options: QuestionOption[];
  correctOption: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  tags: string;
  packageId: string;
}

interface QuestionOption {
  optionKey: string;  // A, B, C, D
  content: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Quiz configuration validation

*For any* quiz creation request with configuration values, the system should reject values outside valid ranges (time: 1-180, score: 0-100, attempts: 1-10) and accept values within ranges.

**Validates: Requirements 1.3, 5.2, 5.3, 5.4**

### Property 2: Question selection persistence

*For any* set of selected question IDs, when a quiz is created with those questions, querying the quiz should return exactly those questions in the quiz.

**Validates: Requirements 2.5, 4.3**

### Property 3: Default value application

*For any* quiz creation request with empty configuration fields, the system should apply default values (30 minutes, 60%, 1 attempt) to the created quiz.

**Validates: Requirements 1.4**

### Property 4: Optional question selection

*For any* quiz creation request without selected questions, the system should successfully create the quiz with zero questions and allow questions to be added later.

**Validates: Requirements 6.1, 6.2, 6.3**

### Property 5: Package question loading

*For any* valid package ID, when loading questions for that package, the system should return only questions belonging to that package.

**Validates: Requirements 2.3**

### Property 6: Question selection toggle

*For any* question, toggling selection twice (select then deselect) should result in the question not being selected.

**Validates: Requirements 3.3, 3.4**

## Error Handling

### Validation Errors

1. **Missing Title**
   - Display: "Tiêu đề là bắt buộc"
   - Prevent form submission

2. **Invalid Time Limit**
   - Display: "Thời gian phải từ 1-180 phút"
   - Highlight field in red

3. **Invalid Score**
   - Display: "Điểm phải từ 0-100%"
   - Highlight field in red

4. **Invalid Attempts**
   - Display: "Số lần làm phải từ 1-10"
   - Highlight field in red

### API Errors

1. **Package Loading Failed**
   - Display: "Không thể tải danh sách gói câu hỏi"
   - Show retry button

2. **Question Loading Failed**
   - Display: "Không thể tải câu hỏi từ gói này"
   - Show retry button

3. **Quiz Creation Failed**
   - Display: "Không thể tạo quiz: [error message]"
   - Keep form data for retry

4. **Question Addition Failed**
   - Display: "Quiz đã tạo nhưng không thể thêm câu hỏi"
   - Provide link to add questions manually

## Testing Strategy

### Unit Tests

1. **Form Validation Tests**
   - Test valid input ranges
   - Test invalid input rejection
   - Test default value application
   - Test required field validation

2. **Question Selection Tests**
   - Test single question selection
   - Test multiple question selection
   - Test question deselection
   - Test selection state persistence

3. **Package Loading Tests**
   - Test successful package load
   - Test empty package list
   - Test package load error handling

### Integration Tests

1. **Complete Quiz Creation Flow**
   - Create quiz with all fields filled
   - Create quiz with default values
   - Create quiz with selected questions
   - Create quiz without questions

2. **Question Selection Flow**
   - Select package → Load questions → Select questions → Create quiz
   - Verify questions are added to quiz

3. **Error Recovery Flow**
   - Handle API errors gracefully
   - Preserve form state on error
   - Allow retry after error

### Property-Based Tests

Using a JavaScript PBT library (fast-check), we will test:

1. **Configuration Value Ranges**
   - Generate random valid/invalid values
   - Verify validation behavior

2. **Question Selection Sets**
   - Generate random question selections
   - Verify persistence and retrieval

3. **Default Value Application**
   - Generate requests with missing fields
   - Verify defaults are applied

## UI/UX Considerations

### Progressive Disclosure

- Form starts collapsed with just title and type selector
- Expands to show quiz fields when "Trắc nghiệm" is selected
- Question selection is collapsible section (optional)

### Visual Hierarchy

1. **Primary Section**: Quiz configuration (purple theme)
2. **Secondary Section**: Question selection (blue theme)
3. **Tertiary Section**: Selected questions preview (green theme)

### Loading States

- Show skeleton loaders for packages
- Show spinner for questions
- Disable submit button during creation
- Show progress indicator for multi-step operations

### Success Feedback

- Toast notification: "Quiz đã tạo thành công"
- Auto-scroll to new quiz in list
- Highlight new quiz briefly

### Mobile Responsiveness

- Stack form fields vertically on mobile
- Use accordion for question selection
- Sticky submit button at bottom
