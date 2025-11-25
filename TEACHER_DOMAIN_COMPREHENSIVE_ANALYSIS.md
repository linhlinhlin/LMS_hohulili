# Teacher Domain Comprehensive Analysis

## 1. Current Backend Architecture Analysis

### 1.1 Package Structure
The current backend follows a traditional layered architecture:

```
com.example.lms/
├── config/          # Security, JWT, OpenAPI configurations
├── controller/      # REST controllers (traditional layered approach)
├── dto/            # Data Transfer Objects
├── entity/         # JPA entities (mostly anemic domain model)
├── repository/     # Spring Data JPA repositories
├── service/        # Business services (mix of application and domain services)
└── util/           # Utility classes
```

### 1.2 DDD Implementation Status
- **Partial DDD**: Only `StudentLessonProgress` entity has domain behaviors
- **Domain Service**: `LessonProgressDomainService` exists for progress tracking
- **Missing**: No clear domain package, aggregates not defined, business logic scattered

### 1.3 Issues Identified
1. **Anemic Domain Model**: Most entities are data containers without business logic
2. **Business Logic Scattering**: Domain rules spread across services and controllers
3. **No Aggregates**: No clear aggregate boundaries defined
4. **Missing Domain Events**: No event-driven architecture
5. **Layer Violations**: Controllers directly calling repositories
6. **No Value Objects**: All data represented as primitives or basic types

## 2. Teacher Domain Entities & Relationships

### 2.1 Core Entities

#### User (Teacher)
- **Role**: TEACHER
- **Responsibilities**: Create/manage courses, questions, assignments
- **Relationships**:
  - 1:many → Course (teacher_id)
  - 1:many → Question (created_by)

#### Course
- **Aggregate Root Candidate**
- **Attributes**: code, title, description, status, teacher
- **Relationships**:
  - many:1 ← User (teacher)
  - 1:many → Section
  - 1:many → Assignment
  - many:many → User (enrolled students)

#### Section
- **Attributes**: title, description, orderIndex
- **Relationships**:
  - many:1 → Course
  - 1:many → Lesson

#### Lesson
- **Attributes**: title, content, videoUrl, duration, orderIndex, lessonType
- **Relationships**:
  - many:1 → Section
  - 1:1 → Quiz (optional)
  - 1:1 → LessonAssignment (optional)

#### Question
- **Attributes**: content, correctOption, difficulty, tags, status
- **Relationships**:
  - many:1 → User (createdBy)
  - many:1 → Course (optional)
  - 1:many → QuestionOption

#### Quiz
- **Attributes**: timeLimit, passingScore, shuffle settings
- **Relationships**:
  - 1:1 → Lesson
  - 1:many → QuizQuestion

#### Assignment
- **Attributes**: title, description, dueDate, maxScore, type
- **Relationships**:
  - many:1 → Course
  - 1:many → AssignmentSubmission

### 2.2 Entity Relationship Diagram
```
User (TEACHER)
├── 1:many → Course
│   ├── 1:many → Section
│   │   ├── 1:many → Lesson
│   │   │   ├── 1:1 → Quiz
│   │   │   └── 1:1 → LessonAssignment
│   └── 1:many → Assignment
│       └── 1:many → AssignmentSubmission
├── 1:many → Question
│   ├── 1:many → QuestionOption
│   └── many:1 → Course (optional)
└── many:many → Course (enrolled students)
```

### 2.3 Missing Entities
1. **Enrollment Entity**: Currently handled via many-to-many relationship
2. **Grade/Score Entity**: For assignment and quiz grading
3. **Notification Entity**: For teacher-student communications

## 3. Current Teacher APIs

### 3.1 Course Management APIs
| Method | Endpoint | Description | Authorization |
|--------|----------|-------------|---------------|
| GET | `/api/v1/courses/my-courses` | Get teacher's courses | TEACHER |
| POST | `/api/v1/courses` | Create new course | TEACHER |
| PUT | `/api/v1/courses/{id}` | Update course | TEACHER (owner) |
| DELETE | `/api/v1/courses/{id}` | Delete course | TEACHER (owner) |
| GET | `/api/v1/courses/{id}/content` | Get course content | TEACHER/OWNER |
| POST | `/api/v1/courses/{id}/enrollments` | Enroll student | TEACHER/ADMIN |
| POST | `/api/v1/courses/{id}/bulk-enroll` | Bulk enroll students | TEACHER/ADMIN |
| GET | `/api/v1/courses/{id}/students` | Get enrolled students | TEACHER/ADMIN |

### 3.2 Question Bank APIs
| Method | Endpoint | Description | Authorization |
|--------|----------|-------------|---------------|
| POST | `/api/v1/questions` | Create question | TEACHER/ADMIN |
| GET | `/api/v1/questions/my-questions` | Get my questions | TEACHER/ADMIN |
| GET | `/api/v1/questions` | List questions with filters | TEACHER/ADMIN |
| PUT | `/api/v1/questions/{id}` | Update question | TEACHER/ADMIN |
| DELETE | `/api/v1/questions/{id}` | Delete question | TEACHER/ADMIN |
| GET | `/api/v1/questions/course/{courseId}` | Get questions by course | TEACHER/ADMIN |
| GET | `/api/v1/questions/course/{courseId}/user` | Get my questions in course | TEACHER/ADMIN |

### 3.3 Content Management APIs
| Method | Endpoint | Description | Authorization |
|--------|----------|-------------|---------------|
| POST | `/api/v1/sections` | Create section | TEACHER/ADMIN |
| POST | `/api/v1/lessons` | Create lesson | TEACHER/ADMIN |
| PUT | `/api/v1/lessons/{id}` | Update lesson | TEACHER/ADMIN |
| DELETE | `/api/v1/lessons/{id}` | Delete lesson | TEACHER/ADMIN |

### 3.4 Assignment APIs
| Method | Endpoint | Description | Authorization |
|--------|----------|-------------|---------------|
| POST | `/api/v1/assignments` | Create assignment | TEACHER/ADMIN |
| GET | `/api/v1/assignments` | List assignments | TEACHER/STUDENT |
| PUT | `/api/v1/assignments/{id}` | Update assignment | TEACHER/ADMIN |
| GET | `/api/v1/assignments/{id}/submissions` | Get submissions | TEACHER/ADMIN |

### 3.5 Quiz APIs
| Method | Endpoint | Description | Authorization |
|--------|----------|-------------|---------------|
| POST | `/api/v1/quizzes` | Create quiz | TEACHER/ADMIN |
| GET | `/api/v1/quizzes` | List quizzes | TEACHER/STUDENT |
| PUT | `/api/v1/quizzes/{id}` | Update quiz | TEACHER/ADMIN |
| GET | `/api/v1/quizzes/{id}/attempts` | Get quiz attempts | TEACHER/ADMIN |

### 3.6 File/Document APIs
| Method | Endpoint | Description | Authorization |
|--------|----------|-------------|---------------|
| POST | `/api/v1/files/upload` | Upload file | TEACHER/STUDENT |
| POST | `/api/v1/documents/upload` | Upload document | TEACHER/ADMIN |
| GET | `/api/v1/files/{id}` | Serve file | Public (authenticated) |

## 4. Architectural Issues in Teacher Domain

### 4.1 Domain Logic Issues
1. **Anemic Entities**: Course, Question, Quiz entities have no business logic
2. **Service Layer Bloat**: All business logic in services, not in domain
3. **Missing Invariants**: No domain rules enforced at entity level
4. **No Aggregate Boundaries**: Unclear what constitutes a valid aggregate

### 4.2 API Design Issues
1. **Inconsistent Authorization**: Mix of @PreAuthorize and SecurityConfig rules
2. **Missing Domain Validation**: Business rules not enforced in domain layer
3. **Direct Repository Access**: Controllers bypass service layer in some cases
4. **No Domain Events**: Changes don't trigger domain events

### 4.3 Data Integrity Issues
1. **Missing Constraints**: No unique constraints on business keys
2. **Lazy Loading Problems**: N+1 queries due to improper lazy loading
3. **Transaction Boundaries**: Unclear transaction boundaries for complex operations

## 5. DDD/Clean Architecture Refactor Plan

### 5.1 Proposed Package Structure
```
com.example.lms/
├── domain/
│   ├── teacher/                    # Teacher bounded context
│   │   ├── aggregate/             # Aggregates
│   │   │   ├── course/           # Course aggregate
│   │   │   ├── question/         # Question aggregate
│   │   │   └── enrollment/       # Enrollment aggregate
│   │   ├── entity/               # Domain entities
│   │   ├── valueobject/          # Value objects
│   │   ├── service/              # Domain services
│   │   ├── repository/           # Domain repositories (interfaces)
│   │   └── event/                # Domain events
│   └── student/                   # Student bounded context
├── application/
│   ├── teacher/                   # Application services
│   │   ├── command/              # Command handlers
│   │   ├── query/                # Query handlers
│   │   └── dto/                  # Application DTOs
│   └── student/
├── infrastructure/
│   ├── persistence/              # JPA implementations
│   ├── messaging/                # Event publishing
│   └── external/                 # External service adapters
└── presentation/
    ├── api/                      # REST controllers
    └── web/                      # Web layer
```

### 5.2 Aggregate Design

#### Course Aggregate
```java
@AggregateRoot
public class Course {
    @EntityId
    private CourseId id;
    private CourseCode code;        // Value object
    private CourseTitle title;      // Value object
    private CourseDescription description; // Value object
    private TeacherId teacherId;
    private CourseStatus status;

    private List<Section> sections = new ArrayList<>();
    private List<Enrollment> enrollments = new ArrayList<>();

    // Domain behaviors
    public void enrollStudent(StudentId studentId) { /* business logic */ }
    public void addSection(Section section) { /* business logic */ }
    public void publish() { /* business logic */ }
}
```

#### Question Aggregate
```java
@AggregateRoot
public class Question {
    @EntityId
    private QuestionId id;
    private QuestionContent content;     // Value object
    private CorrectOption correctOption; // Value object
    private Difficulty difficulty;       // Value object
    private Tags tags;                   // Value object
    private TeacherId createdBy;
    private CourseId courseId;           // Optional

    private List<QuestionOption> options = new ArrayList<>();

    // Domain behaviors
    public void updateContent(QuestionContent newContent) { /* logic */ }
    public boolean isValid() { /* validation logic */ }
}
```

### 5.3 Domain Services
```java
public interface CourseDomainService {
    void validateCourseOwnership(TeacherId teacherId, CourseId courseId);
    void ensureCourseCanBeModified(Course course);
    CourseProgress calculateCourseProgress(Course course, StudentId studentId);
}

public interface QuestionDomainService {
    void validateQuestionOwnership(TeacherId teacherId, QuestionId questionId);
    List<Question> selectQuestionsForQuiz(CourseId courseId, QuizSpecification spec);
}
```

### 5.4 Application Services (Use Cases)
```java
public class CreateCourseUseCase {
    public CourseId execute(CreateCourseCommand command) {
        // Orchestrate domain objects
        // Publish domain events
        // Handle cross-aggregate operations
    }
}

public class EnrollStudentUseCase {
    public void execute(EnrollStudentCommand command) {
        // Business logic coordination
    }
}
```

### 5.5 Repository Interfaces (Domain Layer)
```java
public interface CourseRepository {
    Optional<Course> findById(CourseId id);
    Course save(Course course);
    List<Course> findByTeacherId(TeacherId teacherId);
    boolean existsByCode(CourseCode code);
}

public interface QuestionRepository {
    Optional<Question> findById(QuestionId id);
    Question save(Question question);
    List<Question> findByCreatorAndCourse(TeacherId teacherId, CourseId courseId);
}
```

### 5.6 Value Objects
```java
@ValueObject
public class CourseCode {
    private final String value;

    public CourseCode(String value) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException("Course code cannot be empty");
        }
        if (value.length() > 64) {
            throw new IllegalArgumentException("Course code too long");
        }
        this.value = value.toUpperCase();
    }
}

@ValueObject
public class Email {
    private final String value;

    public Email(String value) {
        // Validation logic
        this.value = value.toLowerCase();
    }
}
```

### 5.7 Domain Events
```java
public class CourseCreatedEvent {
    private final CourseId courseId;
    private final TeacherId teacherId;
    private final Instant occurredOn;
}

public class StudentEnrolledEvent {
    private final CourseId courseId;
    private final StudentId studentId;
    private final Instant occurredOn;
}
```

## 6. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
1. Create domain package structure
2. Define value objects
3. Implement basic aggregates (Course, Question)
4. Create domain repositories interfaces
5. Set up domain event infrastructure

### Phase 2: Core Domain (Week 3-4)
1. Implement domain services
2. Add business logic to aggregates
3. Create application services
4. Implement command/query handlers
5. Add domain event publishing

### Phase 3: Infrastructure (Week 5-6)
1. Implement JPA repositories
2. Create event listeners
3. Update controllers to use application services
4. Add integration tests
5. Performance optimization

### Phase 4: Advanced Features (Week 7-8)
1. Add enrollment aggregate
2. Implement grading domain
3. Add notification system
4. Complete API refactoring
5. End-to-end testing

## 7. Benefits of DDD Refactor

### 7.1 Maintainability
- **Clear Boundaries**: Each aggregate has well-defined responsibilities
- **Business Logic Centralization**: Domain rules in one place
- **Testability**: Domain logic easily testable without infrastructure

### 7.2 Scalability
- **Independent Deployment**: Bounded contexts can evolve separately
- **Event-Driven**: Loose coupling between components
- **CQRS Ready**: Foundation for read/write model separation

### 7.3 Team Productivity
- **Ubiquitous Language**: Shared understanding between team members
- **Reduced Bugs**: Domain invariants enforced at aggregate level
- **Easier Onboarding**: Clear structure for new developers

### 7.4 Business Value
- **Faster Feature Development**: Clear patterns for new features
- **Easier Refactoring**: Domain logic isolated from infrastructure
- **Better Requirements Alignment**: Domain model reflects business needs

## 8. Migration Strategy

### 8.1 Incremental Migration
1. **Start Small**: Begin with one aggregate (Course)
2. **Parallel Implementation**: Keep old and new implementations running
3. **Feature Flags**: Gradually switch features to new implementation
4. **Data Migration**: Ensure data consistency during transition

### 8.2 Risk Mitigation
1. **Comprehensive Testing**: Unit, integration, and E2E tests
2. **Monitoring**: Track performance and error rates
3. **Rollback Plan**: Ability to revert changes quickly
4. **Team Training**: Ensure all developers understand DDD patterns

### 8.3 Success Metrics
1. **Code Quality**: Reduced complexity, improved test coverage
2. **Development Speed**: Faster feature delivery
3. **Bug Reduction**: Fewer domain-related bugs
4. **Maintainability**: Easier to modify and extend

This comprehensive analysis provides a solid foundation for refactoring the Teacher domain towards proper DDD and clean architecture principles, ensuring long-term maintainability and scalability of the LMS system.