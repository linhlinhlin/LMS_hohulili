# Phân hệ 3 — Đánh giá / Trắc nghiệm (Nghiêm Thị Mỹ Linh)

> Sinh viên: Nghiêm Thị Mỹ Linh — Lớp KPM63ĐH — VIMARU
> Phụ trách: phân hệ tạo bài đánh giá trắc nghiệm (assessment, quiz, assignment, rubric)

---

## 1. Kiến trúc lớp

```
┌─────────────────────────────────────────────────────────┐
│ PRESENTATION LAYER (Web Controllers)                     │
│ - QuizControllerV3, QuestionControllerV3                 │
│ - AssignmentControllerV3, StudentAssignmentControllerV3  │
│ - RubricControllerV3, QuestionBankControllerV3           │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│ APPLICATION LAYER (Use Cases & DTOs)                     │
│ - CreateQuizUseCaseV3, QuizAttemptUseCase                │
│ - CreateAssignmentUseCaseV3, GradeSubmissionUseCase      │
│ - QuestionBankManagementUseCase, RubricCrudUseCase       │
│ - DTOs: QuizAttemptResponse, StartQuizAttemptCommand     │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│ DOMAIN LAYER (Rich Models & Services)                    │
│ - Aggregate Roots: Quiz, QuizAttempt, Assignment         │
│            QuestionBank, Rubric, Question                │
│ - Domain Service: GradingService (strategy pattern)      │
│ - Value Objects: QuizId, AssignmentId, QuizSettings      │
│ - Grading Strategies: SingleChoice, MultipleChoice, etc. │
│ - Domain Events: QuizSubmittedEvent, SubmissionGradedEvent│
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│ INFRASTRUCTURE LAYER (Persistence & Adapters)            │
│ - JPA Repositories: QuizRepositoryAdapter, etc.          │
│ - JPA Entities: QuizJpaEntity, QuizAttemptJpaEntity       │
│ - Event Handlers: GradingAuditLogHandler                 │
│ - Persistence Ports: StudentAssessmentAccessPort         │
└─────────────────────────────────────────────────────────┘
```

### 11 Domain Models (Aggregate Roots)

1. **Quiz** — bài kiểm tra (DRAFT → PUBLISHED → ARCHIVED)
2. **Question** — câu hỏi (7 loại: SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE, FILL_IN_BLANK, SHORT_ANSWER, ESSAY, MATH)
3. **QuizAttempt** — lần làm bài (IN_PROGRESS → SUBMITTED → GRADED/TIMEOUT)
4. **Assignment** — bài tập (6 loại: ESSAY, FILE_UPLOAD, PROJECT, PRESENTATION, TEXT, QUIZ)
5. **QuestionBank** — ngân hàng câu hỏi (PERSONAL/DEPARTMENT/INSTITUTIONAL × PUBLIC/PRIVATE)
6. **QuestionBankCategory** — danh mục
7. **Rubric** — rubric chấm điểm (library mode hoặc assigned mode)
8. **QuizQuestion** — quan hệ Quiz-Question (displayOrder + points override)
9. **QuestionOption** — lựa chọn
10. **QuizId, AssignmentId, QuestionBankId** — Value Objects (typed IDs)
11. **QuizSettings** — value object (timeLimitMinutes, maxAttempts, shuffleQuestions, accessPassword, availableFrom/dueAt/lockAt)

### File chính

| Tầng | File | LOC |
|---|---|---|
| Domain | `Quiz.java` | 382 |
| Domain | `QuizAttempt.java` | 276 |
| Domain | `Assignment.java` | 250+ |
| Domain | `Question.java` | 200+ |
| Domain | `QuestionBank.java` | 150 |
| Domain | `Rubric.java` | 150+ |
| Domain Service | `GradingService.java` | 68 |
| Domain Service | `SingleChoiceGradingStrategy.java` | 48 |
| Domain Service | `MultipleChoiceGradingStrategy.java` | 60+ |
| App | `QuizAttemptUseCase.java` | 400+ |
| App | `CreateQuizUseCaseV3.java` | 250+ |
| App | `CreateAssignmentUseCaseV3.java` | 200+ |
| App | `QuestionBankManagementUseCase.java` | 300+ |
| App | `RubricCrudUseCase.java` | 200+ |
| Web | `QuizControllerV3.java` | 1500+ |
| Web | `AssignmentControllerV3.java` | 800+ |
| Web | `QuestionBankControllerV3.java` | 600+ |

### Số liệu

- Backend: 106 Java file (assessment module)
- Frontend: ~4,714 LOC (quiz + assignment)
- Controllers: 6 chính
- Endpoints: 59+
- Tests: 29 test class
- Migrations: V54, V55

---

## 2. Business Logic chính (8 flow)

### Flow 1 — Tạo Quiz

**Endpoint:** `POST /api/v3/quizzes`
**Use case:** `CreateQuizUseCaseV3.execute(CreateQuizCommand)`

```
1. Validate ownership: teacher own lesson
   File: QuizControllerV3.java:95
2. Quiz.create() factory
   File: Quiz.java:199
   - DRAFT status
   - QuizSettings default: 30 phút, 3 lần, đậu 70%, không shuffle
3. Persist + publish QuizCreatedEvent
4. Response Quiz ID
```

**Security:**
- `@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")`
- `verifyLessonOwnership()`

---

### Flow 2 — Thêm Question vào Quiz

**Endpoint:** `POST /api/v3/quizzes/{quizId}/questions`

```java
// Quiz.java:332-349
public void addQuestion(UUID questionId, Integer displayOrder) {
    if (!isEditable()) {
        throw new IllegalStateException("Không thể thêm câu hỏi vào bài kiểm tra đã phát hành/lưu trữ");
    }
    boolean exists = this.questions.stream()
        .anyMatch(q -> q.getQuestionId().equals(questionId));
    if (exists) {
        throw new IllegalArgumentException("Câu hỏi này đã tồn tại trong bài kiểm tra");
    }
    this.questions.add(QuizQuestion.create(this.id.value(), questionId, displayOrder));
    this.updatedAt = Instant.now();
}
```

---

### Flow 3 — Học viên làm Quiz (3-bước: Start → Answer → Submit → Auto-Grade)

#### 3a. StartAttempt

**Endpoint:** `POST /api/v3/quizzes/{quizId}/attempts`

```
1. Load Quiz -> check isPublished()
2. Check availability window (availableFrom <= now <= lockAt)
3. Validate access password
4. Check access control (canAccessQuiz)
5. Check max attempts -> chỉ count SUBMITTED/GRADED/TIMEOUT (không IN_PROGRESS)
6. Extract question IDs từ quiz.questions
7. Server-side shuffle (nếu shuffleQuestions=true)
8. Create QuizAttempt.start(quizId, studentId, questionIds)
9. Persist, return attemptId
```

**Evidence:** `QuizAttemptUseCase.java:45-101`
- Line 56-67: PUBLISHED + availability window (Canvas SOTA)
- Line 70-72: Access password
- Line 79-86: Max attempts (chỉ completed)
- Line 94-97: Server-side shuffle

**Security:**
- KHÔNG tiết lộ question IDs cho client trước submit
- Server-side shuffle chống gian lận
- Access password prevents unauthorized

---

#### 3b. SubmitAttempt (3-Step Auto-Grade)

**Endpoint:** `POST /api/v3/quizzes/attempts/{attemptId}/submit`

```
STEP 1: Convert student answers format
  - Client gửi List<AttemptAnswer> {questionId, selectedOption, studentAnswer (JSONB)}
  - Server validate format

STEP 2: Fetch & Map all questions
  - Batch-load tất cả Question (không chỉ answered)
  - Lý do: unanswered cũng đếm vào denominator

STEP 3: Grade each question (GradingService dispatch)
  For each QuizQuestion in quiz:
    a. Fetch Question
    b. Find student answer (không có -> score 0)
    c. GradingService.grade(question, studentAnswer, pointsOverride)
       Dispatch by Question.QuestionType:
       - SINGLE_CHOICE -> SingleChoiceGradingStrategy
       - MULTIPLE_CHOICE -> MultipleChoiceGradingStrategy
       - TRUE_FALSE -> TrueFalseGradingStrategy
       - FILL_IN_BLANK -> FillInBlankGradingStrategy
       - SHORT_ANSWER -> ShortAnswerGradingStrategy
       - ESSAY -> EssayGradingStrategy (manual -> SUBMITTED)
       - MATH -> MathGradingStrategy (LaTeX symbolic)
    d. GradeResult(isCorrect, pointsEarned, maxPoints, feedback)
    e. Apply QuizQuestion.points override
    f. Accumulate total
    g. AttemptItem với isCorrect + pointsEarned + feedback + correctOption*

  *SECURITY: Server-side resolve correctOption (Line 174-177):
    - effectiveCorrectOption từ question.answerKey || question.correctOption
    - Client KHÔNG bao giờ thấy correctOption trong /questions API

  i. Timeout check: nếu elapsed > timeLimitMinutes + 60s grace -> TIMEOUT
     Line 122-132: 60s grace period cho network latency

STEP 4: Update attempt status & score
  - Mark SUBMITTED hoặc TIMEOUT
  - finishGrading(totalScore, isPassed)
  - Publish QuizSubmittedEvent

STEP 5: Gated Response (Canvas pattern)
  if quiz.settings.showResultsImmediately:
    if quiz.settings.showCorrectAnswers:
      -> reveal correctOption + feedback (toFullItemMap)
    else:
      -> hide correctOption, show isCorrect + feedback (toStrippedItemMap)
  else:
    -> hide all, "Bài đã nộp, chờ giáo viên phát hành"
```

**Evidence:** `QuizAttemptUseCase.java:104-250`, `GradingService.java`, `QuizControllerV3.java:1254-1319`

---

#### 3c. Học viên xem Question (NO correctOption!)

**Endpoint:** `GET /api/v3/quizzes/{quizId}/questions`

```java
// QuizControllerV3.java:261-264
boolean isStudent = user.getRole() == UserJpaEntity.UserRole.STUDENT;
List<Map<String, Object>> result = questions.stream()
    .map(q -> isStudent ? toStudentQuestionMap(q) : toQuestionMap(q))
    .toList();

// toStudentQuestionMap() Line 1192-1217
private Map<String, Object> toStudentQuestionMap(QuestionJpaEntity q) {
    Map<String, Object> map = new HashMap<>();
    map.put("id", q.getId().toString());
    map.put("content", extractTextFromBlocks(q.getContentBlocks()));
    map.put("contentBlocks", q.getContentBlocks());
    map.put("questionType", q.getQuestionType().name());
    // options, difficulty, tags, status
    // NO correctOption, NO answerKey!
    return map;
}
```

**Lý do:** Student không biết đáp án trước submit. Inspect HTML thấy options nhưng `correctOption` field không xuất hiện.

---

### Flow 4 — Question Bank (Public Bank & Deep Copy)

```
QuestionBank Visibility & Access:

Enum: BankType = PERSONAL | DEPARTMENT | INSTITUTIONAL
Enum: Visibility = PUBLIC | PRIVATE

Public Bank Flow:
1. Teacher A tạo bank: PERSONAL + PUBLIC
2. Teacher B xem: GET /api/v3/question-banks/public
   -> Server filter (visibility=PUBLIC && status=ACTIVE)
3. Teacher B copy: POST /api/v3/question-banks/{A_bankId}/copy-to-my-bank
   QuestionBankManagementUseCase.copyBankToMyBank():
     a. Load source bank questions
     b. Create new destination bank (owner=B)
     c. For each source question:
        - Deep copy: new Question (mới UUID, copy content blocks)
        - new question.createdBy = B
        - new question.packageId = destination_bankId
     d. Return new bank với questions mới

4. isOwner guard: chỉ owner sửa/xóa được bank
```

**Evidence:**
- `QuestionBank.java:42-55, 77-80, 115-117, 142-150`
- `QuestionBankManagementUseCase`

---

### Flow 5 — Tạo Assignment & Gắn Rubric

```
1. Create Assignment aggregate
   File: Assignment.java:112
   public static Assignment create(courseId, lessonId, title, description,
                                    instructions, AssignmentType, maxScore)
   -> DRAFT, default maxScore=100, passingScore=60, maxAttempts=1

2. Validate ownership

3. Create or link Rubric
   Option A: Create new inline
   Option B: Select from library (assignmentId=null before, set now)
   File: Rubric.java:75-79
   public void assignTo(UUID assignmentId) {
       this.assignmentId = assignmentId;
   }
   Library mode: assignmentId=null, reusable
   Assigned mode: assignmentId=X, bound to 1

4. Persist
```

---

### Flow 6 — Học viên nộp Assignment

**Endpoint:** `POST /api/v3/assignments/{assignmentId}/submissions`

```
1. Load Assignment -> check deadline, allowLateSubmission
2. Create submission (content text, attachments URLs, submittedAt)
3. Set status=SUBMITTED
4. Publish AssignmentSubmittedEvent (email teacher)
5. Return submission ID
```

---

### Flow 7 — Giáo viên SpeedGrader

**Endpoint:** `GET /api/v3/assignments/{assignmentId}/submissions/{submissionId}`

```
1. Load submission + attachment URLs
2. Display file preview (FilePreviewComponent)
   - PDF/image/document trong iframe
   - MIME type validation server-side
3. Load rubric criteria từ assignment.rubric
4. Teacher nhập grade theo rubric:
   - Mỗi criterion: select band (Excellent/Good/Fair/Poor)
   - Sum points
5. Save grade: POST /grade
   GradeSubmissionUseCase
   - Create SubmissionGrade (scoredPoints, feedback, rubricCriteriaGrades)
   - Publish SubmissionGradedEvent
   - Audit log
```

**Evidence:** `fe/src/app/features/teacher/assignment-hub/components/speed-grader.component.ts:1-100`

---

### Flow 8 — Review & Appeal

**Review (Canvas SOTA):**
- Student xem result (gated by showResultsImmediately)
- showCorrectAnswers=true: thấy correctOption + answer + feedback
- showCorrectAnswers=false: chỉ isCorrect + feedback

**Appeal (future):**
- Student tạo appeal: "Câu X không rõ"
- Queue OPEN → PENDING → RESOLVED
- Teacher xem appeal + answer + solution
- Update score hoặc reject

---

## 3. Quyết định kỹ thuật (10 cái)

### TD-01: 11 domain model (cao nhất 7 module)

**WHY:**
- Cấu trúc nghiệp vụ phong phú: maritime có multiple assessment types (practice, exam, STCW certifications), reusable question banks, rubric grading, offline sync (3-step attempt)
- Aggregate boundaries (DDD): Quiz, QuizAttempt, Assignment, QuestionBank đều là roots
- Rich domain logic: không phải CRUD bừa
  - Quiz.addQuestion() — validate draft + prevent duplicate
  - QuizAttempt.submit() — complex grading dispatch
  - QuestionBank.changeVisibility() — public/private control
  - Rubric.assignTo() — library vs bound

**ALTERNATIVES:**
- Flatter (1-2 class): hard to test, violate SRP
- Microservices: overkill (tightly coupled workflows)

**EVIDENCE:** `/backend/src/main/java/com/example/lms/assessment/domain/model/` 28 file

---

### TD-02: Auto-grading server-side (không client)

**WHY:**
- **Security (Anti-cheat):** Client-side grade → DevTools sửa response = mock correct. Server-side là source of truth.
- **Consistency:** 6 type khác logic (SingleChoice vs Essay) — unified engine
- **Offline-first:** Student offline làm quiz → sync → server re-compute

**ALTERNATIVES:**
- Client grade + server verify: client computation leak answer key
- Hybrid: complexity, same risk

**EVIDENCE:** `QuizAttemptUseCase.java:41`, `GradingService.java`

---

### TD-03: Strip correctOption khỏi student API

**WHY:**
- Prevent inspection attack: HTML inspect không thấy "data-correct=A"
- Canvas SOTA pattern
- Enforce learning flow: answer → commit → see result

**ALTERNATIVES:**
- Client-side stripping (filter): student modify filter (DevTools)
- API versioning teacher vs student: maintenance burden — nhưng vẫn làm! `isStudent ? toStudentQuestionMap : toQuestionMap`

**EVIDENCE:** `QuizControllerV3.java:1192-1217, 1311-1319`

---

### TD-04: 3-step attempt (start/convert/submit)

**WHY:**
- **Offline-first sync:**
  ```
  1. Online -> POST start -> attemptId + questions cached
  2. Offline -> answer (IndexedDB)
  3. Online -> POST submit với all answers
  ```
- **Atomic lifecycle:** start = allocate + lock max attempts; submit = atomic grade
- **Server-side shuffle anti-cheat**

**ALTERNATIVES:**
- 2-step: không support offline
- Event-driven (saveAnswer per question): leaky grading window

**EVIDENCE:** `QuizAttemptUseCase.java:45-101 (start), 104-250 (submit), 94-97 (shuffle)`

---

### TD-05: Question Bank tách public/private

**WHY:**
- **Community of practice:** Maritime educators share STCW banks
- **Governance:** institutional bank (admin-curated) vs personal
- **Quality control:** không vô tình modify shared question

**ALTERNATIVES:**
- All shared: chaos
- All isolated: duplicate effort

**EVIDENCE:** `QuestionBank.java:142-150` (Visibility enum), `123-125` (isPublic)

---

### TD-06: Deep copy khi copy-to-my-bank (không reference)

**WHY:**
- **Edit independence:** A sửa Q1 → B (đã copy) không bị ảnh hưởng
- **Deletion safety:** A delete Q1 → B's Q2 unaffected (deep copy)
- **Usage stats (correctRate):** Q1 stats từ A's students, Q2 từ B's students

**ALTERNATIVES:**
- Reference + versioning: complexity
- Symlink/template: same problems as reference

**EVIDENCE:** `QuestionBankManagementUseCase.copyBankToMyBank()`

---

### TD-07: Rubric criteria tách riêng

**WHY:**
- **Reuse + consistency:** "Content" criterion 0-20 points dùng lại 5 assignment
- **Grading consistency:** clear rubric prevents grade inflation
- **DDD value object:** Criterion immutable, Rubric mutable

**ALTERNATIVES:**
- Inline: can't reuse
- Denormalization: hard to update

**EVIDENCE:** `Rubric.java:64-73`

---

### TD-08: EditorJS giữ cho quiz, Tiptap cho course content

**WHY:**
- **Question structured format:** EditorJS contentBlocks = array of {type, data} → easy render LaTeX, image with alt
- **Content needs rich:** Tiptap ProseMirror, full collaboration
- **Backwards compat:** Questions stored EditorJS từ V1, migrate cost không xứng

**ALTERNATIVES:**
- Unified: EditorJS cho content (poor UX) hoặc Tiptap cho questions (unstructured)

**EVIDENCE:**
- `fe/src/app/shared/blocks/block-types.ts:1-40`
- `V55__seed_assessment_enrollments.sql:6-10`

---

### TD-09: Math LaTeX với popover (Khan/Quizizz pattern)

**WHY:**
- **Maritime domain:** navigation formulas (haversine), stability calculations
- **Popover UX:** teacher gõ `\frac{x^2}{2}` → live preview
- **Symbolic equivalence grading:** MathGradingStrategy (future) — algebraic, not string match

**ALTERNATIVES:**
- Plain text: hard to grade
- Image upload: slow, no searchability

**EVIDENCE:** `block-types.ts:23-27` (FormulaBlockData)

---

### TD-10: SpeedGrader pattern (Canvas)

**WHY:**
- **Workflow efficiency:** không navigate back-forth
- **Rubric consistency:** always visible
- **Mobile-friendly:** Tailwind responsive (iPad)

**Canvas SOTA:** Pioneer 2011, Moodle/Schoology/Google Classroom copy

**ALTERNATIVES:**
- List view inline edit: cluttered
- Modal per submission: context loss

**EVIDENCE:** `speed-grader.component.ts:1-100`

---

## 4. Đặc thù MARITIME

### 4.1 STCW Certifications

**STCW** = International Convention on Standards of Training, Certification and Watchkeeping for Seafarers

**Support:**
- Quiz có thể tag "STCW" (Navigation, Engineering, Safety)
- Question Bank category: "STCW Safety", "STCW Navigation"
- Assignment có `countsTowardCertificate` flag
- Seed V55: ~100+ STCW question

**Evidence:**
- `Quiz.java:22` — `private boolean countsTowardCertificate;`
- `Quiz.java:295-299, 378-380` — chỉ EXAM type được count

### 4.2 Seed Data (V54/V55)

- **V54:** users (10 teachers + 25 students), courses (NAV-101, ENG-201, SAF-101, LAW-101)
- **V55:** seed assessments
  - 20+ quizzes
  - Assignments (file upload, essay)
  - Enrollments

### 4.3 Multi-language

- Vietnamese support (UI + error messages)
- Quiz error: "Thời gian giới hạn phải lớn hơn 0"
- No i18n file yet (hard-coded VN)
- Future: ngx-translate

---

## 5. Số liệu cụ thể

| Metric | Value |
|---|---|
| Backend Java (assessment) | 106 |
| Frontend TS (quiz + assignment) | ~40 |
| Controllers | 6 |
| API endpoints | 59+ |
| Domain models | 11 aggregates + 6 VOs |
| Use Cases | 15+ |
| Grading strategies | 6 (+ ready 7th: Math) |
| Test classes | 29 |
| FE LOC (quiz + assignment) | ~4,714 |
| BE domain LOC | ~2,000 |
| Migrations | V54, V55 |
| Seed quiz | ~20 |
| Default max attempts | 3 |
| Default time limit | 30 min + 60s grace |
| Default passing score | 70% |

---

## 6. Q&A Defense (12 câu)

### Q1: Vì sao 11 domain model? Không bị overly complex?

**A:** Mỗi model là aggregate root (DDD). Phức tạp justified bởi maritime domain:
- Quiz — controls quiz lifecycle + question collection (invariants: questions duy nhất, DRAFT để edit)
- QuizAttempt — isolated per student (invariant: status transition)
- Assignment — separate (deadline, file upload, rubric)
- QuestionBank — visibility + deep copy
- Rubric — criteria management + reuse
- Value Objects: type-safe IDs

Git history có "Refactor: Extract Rubric from Assignment" — thiết kế chủ động, không lỗi.

---

### Q2: Vì sao submit toàn bộ 1 lần (3-step), không progressive save?

**A:** Progressive save:
- Leaky grading window: "Q1 graded, Q2 pending" → expose answer
- Offline sync rối: offline không save được → data loss
- Timeout hard: when apply?

3-step atomic:
- Offline-first: cache + submit together
- Timeout at submit: server check elapsed once
- Grading atomic: all-or-nothing

Firebase Realtime Database (mobile-first LMS) cũng dùng batch.

---

### Q3: Chống cheat — học viên có thể inspect HTML xem answer?

**A:** Multi-layer:
1. **Client-side:** toStudentQuestionMap không có correctOption
2. **Network inspect:** /questions API không có correctOption
3. **Submit verification:** server re-grade
4. **Server-side shuffle:** Q1 của A != Q1 của B
5. **Timeout enforcement:** server check elapsed

Không 100% (conspiracy: friends share trước), nhưng defense in depth.

---

### Q4: Performance: 1000 học viên cùng nộp, làm sao?

**A:**
1. Stateless use cases → scale horizontal
2. Batch loading (single DB query, không N+1)
3. Async grading (future) cho essay/manual
4. PostgreSQL partitioning by quiz_id
5. Indexes (quiz_id, student_id, status)

Test: V55 seed 25 student × 10 course = 250 attempts. Schema support 1M rows easily (UUID PK).

---

### Q5: Security: file upload assignment, MIME check?

**A:**
```java
if (!allowedMimeTypes.contains(file.getContentType())) {
    throw new BusinessRuleException("FILE_TYPE_NOT_ALLOWED");
}
if (file.getSize() > 50 * 1024 * 1024) {
    throw new BusinessRuleException("FILE_TOO_LARGE");
}
String url = uploadToR2(file);
```

`FilePreviewComponent` handle PDF preview an toàn trong iframe. Backend ensure Content-Type header đúng.

---

### Q6: STCW questions dạng đặc thù, ví dụ?

**A:**

```
Example 1 (Navigation):
Type: SINGLE_CHOICE
Content: "Tính độ tàu từ A [10°N, 120°E] đến B [15°N, 122°E] dùng haversine?"
Options: A) 400nm B) 450nm C) 550nm D) 600nm
Answer: B

Example 2 (Safety):
Type: MULTIPLE_CHOICE
Content: "Liệt kê các bước trong SOLAS Fire Safety"
Options: A) Xác định vị trí B) Kêu gọi thủy thủ C) Chuẩn bị lifeboat
Answer: [A, B, C]

Example 3 (Engine Room):
Type: ESSAY
Content: "Mô tả engine startup sau maintenance, 5 safety check"
Answer: Manual grading theo rubric
```

Code support:
- 6 question types
- contentBlocks với image (engine diagram)
- Formula support cho navigation math

---

### Q7: Quiz vs Assignment khác nhau?

**A:**

| Aspect | Quiz | Assignment |
|---|---|---|
| Type | Auto-graded | Manual-graded |
| Duration | Timed (30-60 min) | No time limit (deadline) |
| Question types | Choice, T/F, Fill, Short | Essay, File, Project |
| Grade source | GradingService | Rubric (teacher) |
| Resubmit | Limited (maxAttempts) | 1 attempt + maybe 1 resubmit |
| Result | Immediate (showResultsImmediately) | After teacher grades |
| Cert counting | Có thể (countsTowardCertificate) | Thường không |

---

### Q8: Question Bank deep copy — real-world?

**A:** Scenario: VIMARU launch STCW curriculum:
1. **Admin tạo institutional bank:** "STCW-Safety-V1" (PUBLIC, INSTITUTIONAL) — 200 question
2. **Teacher A copy:** POST /copy-to-my-bank → 200 NEW question (deep copy) trong "My-Safety-Bank" (PERSONAL). Customize 10 question cho local context.
3. **Teacher B copy:** separate 200 NEW question (different UUID). Edit không ảnh hưởng A.
4. **Admin update STCW bank:** thêm question mới về IMO. A's + B's không bị (frozen copy). New teacher get 201 question.

Deep copy = critical cho independence.

---

### Q9: Rubric library vs assigned mode — khi nào?

**A:** Library mode (assignmentId=null):
```java
Rubric rubric = Rubric.create(teacherId, "Writing Quality", "...", 100.0, criteria);
// reuse trong 5 assignments
```
- Pro: single rubric, consistent
- Con: edit ảnh hưởng all assignments

Assigned mode (assignmentId=X):
```java
rubric.assignTo(assignment1.id);
```
- Pro: independent per assignment
- Con: duplication

**Typical:** Library cho institutional rubric (STCW), assigned cho course-specific.

---

### Q10: Question có cả correctOption (legacy) và answerKey (new)?

**A:** Migration pattern:
```java
// Legacy (V1-V40):
Question { correctOption: "A" }

// New (V41+):
Question {
    correctOption: "A",  // backward compat
    answerKey: {
        "correctOption": "A",
        "correctOptions": ["A", "C"],  // MULTIPLE_CHOICE
        "tolerance": 0.01,  // MATH
        "symbolEquivalent": ["2+x", "x+2"]
    }
}
```

Server graceful handle:
```java
// QuizAttemptUseCase.java:174-177
String effective = (question.getAnswerKey() != null
        && question.getAnswerKey().containsKey("correctOption"))
    ? String.valueOf(question.getAnswerKey().get("correctOption"))
    : question.getCorrectOption();
```

Don't force migration → old questions vẫn grade.

---

### Q11: Appeal/review flow disputed grades?

**A:** (Partially in code, fully in requirements)

```
Student:
1. Submit -> see score
2. If showCorrectAnswers=true: thấy "Q1: You B, Correct A"
3. Disagree: "Q1 wording ambiguous"
4. Create appeal: POST /api/v3/quizzes/{quizId}/attempts/{attemptId}/appeal
   { questionId, reason, expectedPoints }
   Status: OPEN

Teacher:
1. GET /teacher/appeals
2. Review wording + answer + solution
3. Action:
   a. Reject: "B incorrect, A correct"
   b. Approve: update attempt.score, publish ScoreAdjustedEvent
4. Audit log

Result: CLOSED, student get updated grade.
```

---

### Q12: Offline-first sync cho quiz hoạt động sao?

**A:**

```
Timeline:
1. [Online] open quiz
   GET /attempts -> POST /start
   localStorage: { questions, answers: {}, attemptId, startTime }

2. [Offline] take quiz
   localStorage: { answers: { q1: "A", q2: { formula: "x+2" } } }
   Client tracks elapsed locally

3. [Online again] submit
   POST /submit { answers, elapsedTime }
   Server re-grade from scratch
   - Compare client format -> domain
   - Apply GradingService
   - Check server-side elapsed
   - Return graded result

3-step:
- startAttempt: server remember config
- Offline: client independent
- submitAttempt: server authoritative time + grading
```

Frontend caching: `quiz.service.ts` cache questions in localStorage, on reconnect sync.

---

# Kết luận phân hệ 3

Core module LMS hàng hải, xây dựng:

1. **11 domain model** — phong phú (Quiz, QuizAttempt, Assignment, QuestionBank, Rubric, Question + VOs)
2. **3-step attempt lifecycle** — offline-first + server-side grading security
3. **6 grading strategies** (+ extensible) — maritime types (formula, essay, choice)
4. **Server-side answer key** — strip correctOption (chống inspect)
5. **Community question banks** — deep copy (not reference)
6. **Rubric-based assignment** — SpeedGrader (Canvas SOTA)
7. **STCW certificate tracking** — countsTowardCertificate, institutional banks
8. **Comprehensive audit** — GradingAuditLogHandler

**Defense strong points:**
- Clean Arch + DDD (testable, maintainable)
- Security multi-layer (client strip + server verify + timeout)
- Maritime-specific (offline sync, STCW templates, formula)
- Production-ready (29 test, 59 endpoint, seed V54/V55)
