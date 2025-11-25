# Design Document - Teacher Domain

## Overview

Tài liệu này mô tả thiết kế kỹ thuật chi tiết cho **Teacher Domain** trong hệ thống LMS hàng hải, tuân thủ nghiêm ngặt các nguyên tắc Domain-Driven Design (DDD), Clean Architecture, và SOLID principles.

Teacher Domain là một Bounded Context độc lập, quản lý toàn bộ nghiệp vụ liên quan đến giảng viên, bao gồm:
- Course Management (Quản lý khóa học)
- Student Progress Tracking (Theo dõi tiến độ học viên)
- Assignment & Grading (Bài tập và chấm điểm)
- Quiz Management (Quản lý trắc nghiệm)
- Analytics & Reporting (Phân tích và báo cáo)
- Communication (Giao tiếp với học viên)

### Design Principles

1. **Domain-Driven Design (DDD)**
   - Bounded Context: Teacher Domain tách biệt với Student Domain và Admin Domain
   - Aggregate Roots: Course, Assignment, Quiz
   - Value Objects: Progress, Grade, Analytics
   - Domain Services: Business logic thuần túy
   - Application Services: Orchestration và infrastructure

2. **Clean Architecture**
   - Domain Layer: Entities, Value Objects, Domain Services
   - Application Layer: Use Cases, DTOs, Application Services
   - Infrastructure Layer: Repositories, External Services
   - Presentation Layer: Controllers, API Endpoints

3. **SOLID Principles**
   - Single Responsibility: Mỗi class có một trách nhiệm duy nhất
   - Open/Closed: Mở rộng thông qua interface, không sửa code cũ
   - Liskov Substitution: Subclass có thể thay thế parent class
   - Interface Segregation: Interface nhỏ và tập trung
   - Dependency Inversion: Phụ thuộc vào abstraction, không phụ thuộc vào implementation

## Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Presentation Layer                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  TeacherController                                       │  │
│  │  - REST API Endpoints                                    │  │
│  │  - Request/Response DTOs                                 │  │
│  │  - Authentication & Authorization                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                     Application Layer                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  TeacherApplicationService                               │  │
│  │  - Use Case Orchestration                                │  │
│  │  - Transaction Management                                │  │
│  │  - DTO Mapping                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                       Domain Layer                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Domain Services                                         │  │
│  │  - TeacherDomainService                                  │  │
│  │  - StudentProgressCalculator                             │  │
│  │  - GradingService                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Aggregates                                              │  │
│  │  - Course (Aggregate Root)                               │  │
│  │  - Assignment (Aggregate Root)                           │  │
│  │  - Quiz (Aggregate Root)                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Value Objects                                           │  │
│  │  - Progress, Grade, Analytics                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                   Infrastructure Layer                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Repositories                                            │  │
│  │  - CourseRepository, AssignmentRepository                │  │
│  │  - StudentProgressRepository                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  External Services                                       │  │
│  │  - FileStorageService, EmailService                      │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```



### Bounded Context Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                      Teacher Context                            │
│  - Manages courses, assignments, quizzes                        │
│  - Tracks student progress                                      │
│  - Provides analytics                                           │
└────────────┬────────────────────────────────────┬───────────────┘
             │                                    │
             │ Anti-Corruption Layer              │ Shared Kernel
             │                                    │
┌────────────▼────────────────┐    ┌─────────────▼──────────────┐
│     Student Context         │    │      Admin Context         │
│  - Enrolls in courses       │    │  - Approves courses        │
│  - Submits assignments      │    │  - Manages users           │
│  - Takes quizzes            │    │  - Views system analytics  │
└─────────────────────────────┘    └────────────────────────────┘
```

## Components and Interfaces

### 1. TeacherController (Presentation Layer)

**Responsibility:** Handle HTTP requests, validate input, return responses

**Endpoints:**

```java
@RestController
@RequestMapping("/api/v1/teacher")
@RequiredArgsConstructor
public class TeacherController {
    
    // Student Management
    GET    /students                    // Get all students from teacher's courses
    GET    /students/{id}               // Get student detail
    GET    /students/{id}/analytics     // Get student analytics
    PATCH  /students/{id}/status        // Update student status
    POST   /students/{id}/messages      // Send message to student
    
    // Course Management (delegated to CourseController)
    // Already exists in CourseController
    
    // Assignment Management
    GET    /assignments                 // Get all assignments
    GET    /assignments/{id}            // Get assignment detail
    GET    /assignments/{id}/submissions // Get submissions
    POST   /assignments/{id}/grade      // Grade submission
    
    // Analytics
    GET    /analytics/overview          // Dashboard overview
    GET    /analytics/courses/{id}      // Course analytics
    GET    /analytics/performance       // Teaching performance
}
```



### 2. TeacherApplicationService (Application Layer)

**Responsibility:** Orchestrate use cases, manage transactions, map DTOs

```java
@Service
@RequiredArgsConstructor
@Transactional
public class TeacherApplicationService {
    
    private final TeacherDomainService teacherDomainService;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final StudentProgressRepository progressRepository;
    private final AssignmentRepository assignmentRepository;
    
    /**
     * Get all students from teacher's courses with filters
     */
    public Page<TeacherStudentSummaryDTO> getMyStudents(
        UUID teacherId,
        Pageable pageable,
        UUID courseId,
        String status,
        String search
    ) {
        // 1. Get teacher's courses
        List<Course> courses = getCoursesByTeacher(teacherId, courseId);
        
        // 2. Get students from those courses
        Set<User> students = getStudentsFromCourses(courses);
        
        // 3. Calculate progress and grades for each student
        List<TeacherStudentSummaryDTO> studentDTOs = students.stream()
            .map(student -> buildStudentSummary(student, courses))
            .filter(dto -> matchesFilters(dto, status, search))
            .collect(Collectors.toList());
        
        // 4. Apply pagination
        return paginateResults(studentDTOs, pageable);
    }
    
    /**
     * Get detailed student information
     */
    public TeacherStudentDetailDTO getStudentDetail(UUID teacherId, UUID studentId) {
        // Verify teacher has access to this student
        verifyTeacherStudentAccess(teacherId, studentId);
        
        User student = userRepository.findById(studentId)
            .orElseThrow(() -> new NotFoundException("Student not found"));
        
        // Build detailed DTO with progress, assignments, analytics
        return buildStudentDetail(student, teacherId);
    }
    
    // ... other methods
}
```

### 3. TeacherDomainService (Domain Layer)

**Responsibility:** Pure business logic, no infrastructure dependencies

```java
@Service
public class TeacherDomainService {
    
    /**
     * Calculate student progress in a course
     */
    public Progress calculateStudentProgress(User student, Course course) {
        int totalLessons = countTotalLessons(course);
        int completedLessons = countCompletedLessons(student, course);
        
        double percentage = totalLessons > 0 
            ? (double) completedLessons / totalLessons * 100 
            : 0.0;
        
        return Progress.of(completedLessons, totalLessons, percentage);
    }
    
    /**
     * Calculate average grade for student in teacher's courses
     */
    public Grade calculateAverageGrade(User student, List<Course> courses) {
        List<AssignmentSubmission> submissions = getSubmissions(student, courses);
        
        if (submissions.isEmpty()) {
            return Grade.notGraded();
        }
        
        double average = submissions.stream()
            .filter(s -> s.getScore() != null)
            .mapToDouble(s -> s.getScore().doubleValue())
            .average()
            .orElse(0.0);
        
        return Grade.of(average);
    }
    
    /**
     * Verify teacher has access to student
     */
    public void verifyTeacherStudentAccess(UUID teacherId, UUID studentId) {
        // Business rule: Teacher can only access students enrolled in their courses
        boolean hasAccess = checkStudentEnrolledInTeacherCourses(teacherId, studentId);
        
        if (!hasAccess) {
            throw new AccessDeniedException(
                "Teacher does not have access to this student"
            );
        }
    }
}
```



## Data Models

### Domain Entities

#### 1. Course Aggregate

```java
@Entity
@Table(name = "courses")
public class Course {
    @Id
    private UUID id;
    
    private String code;          // Unique course code
    private String title;
    private String description;
    
    @Enumerated(EnumType.STRING)
    private CourseStatus status;  // DRAFT, PENDING, APPROVED, REJECTED
    
    @ManyToOne
    private User teacher;         // Aggregate root owner
    
    @ManyToMany
    private Set<User> enrolledStudents;
    
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<Section> sections;
    
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<Assignment> assignments;
    
    private Instant createdAt;
    private Instant updatedAt;
    
    // Domain methods
    public void addSection(Section section) {
        sections.add(section);
        section.setCourse(this);
    }
    
    public void enrollStudent(User student) {
        if (status != CourseStatus.APPROVED) {
            throw new DomainException("Cannot enroll in non-approved course");
        }
        enrolledStudents.add(student);
    }
    
    public boolean isOwnedBy(User teacher) {
        return this.teacher.getId().equals(teacher.getId());
    }
}
```

#### 2. Section Entity

```java
@Entity
@Table(name = "sections")
public class Section {
    @Id
    private UUID id;
    
    @ManyToOne
    private Course course;
    
    private String title;
    private String description;
    private Integer orderIndex;
    
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    private List<Lesson> lessons;
    
    private Instant createdAt;
    private Instant updatedAt;
    
    // Domain methods
    public void addLesson(Lesson lesson) {
        lessons.add(lesson);
        lesson.setSection(this);
        lesson.setOrderIndex(lessons.size());
    }
    
    public void reorderLessons(List<UUID> lessonIds) {
        // Business logic for reordering
    }
}
```

#### 3. Lesson Entity

```java
@Entity
@Table(name = "lessons")
public class Lesson {
    @Id
    private UUID id;
    
    @ManyToOne
    private Section section;
    
    private String title;
    private String content;
    private String description;
    private String videoUrl;
    private Integer durationMinutes;
    private Integer orderIndex;
    
    @Enumerated(EnumType.STRING)
    private LessonType lessonType;  // LECTURE, ASSIGNMENT, QUIZ
    
    @OneToOne(cascade = CascadeType.ALL)
    private LessonAssignment lessonAssignment;
    
    @OneToMany(cascade = CascadeType.ALL)
    private List<LessonAttachment> attachments;
    
    private Instant createdAt;
    private Instant updatedAt;
}
```



#### 4. Assignment Aggregate

```java
@Entity
@Table(name = "assignments")
public class Assignment {
    @Id
    private UUID id;
    
    @ManyToOne
    private Course course;
    
    private String title;
    private String description;
    private String instructions;
    private LocalDateTime dueDate;
    private BigDecimal maxScore;
    
    @Enumerated(EnumType.STRING)
    private AssignmentType assignmentType;  // ESSAY, QUIZ, PROGRAMMING, PROJECT
    
    @Enumerated(EnumType.STRING)
    private AssignmentStatus status;  // DRAFT, PUBLISHED, CLOSED
    
    @Type(JsonBinaryType.class)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> assignmentConfig;
    
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AssignmentRubric> rubrics;
    
    @OneToMany(cascade = CascadeType.ALL)
    private List<Submission> submissions;
    
    private Instant createdAt;
    private Instant updatedAt;
    
    // Domain methods
    public void publish() {
        if (status == AssignmentStatus.PUBLISHED) {
            throw new DomainException("Assignment already published");
        }
        validateBeforePublish();
        status = AssignmentStatus.PUBLISHED;
    }
    
    public void addRubric(AssignmentRubric rubric) {
        rubrics.add(rubric);
        validateTotalPoints();
    }
    
    private void validateTotalPoints() {
        BigDecimal total = rubrics.stream()
            .map(AssignmentRubric::getMaxPoints)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        if (total.compareTo(maxScore) > 0) {
            throw new DomainException("Total rubric points exceed max score");
        }
    }
}
```

#### 5. Submission Entity

```java
@Entity
@Table(name = "submissions")
public class Submission {
    @Id
    private UUID id;
    
    @ManyToOne
    private Assignment assignment;
    
    @ManyToOne
    private User student;
    
    @Column(columnDefinition = "TEXT")
    private String content;
    
    private BigDecimal score;
    
    @Column(columnDefinition = "TEXT")
    private String feedback;
    
    @Enumerated(EnumType.STRING)
    private GradingStatus gradingStatus;  // PENDING, GRADED, RETURNED
    
    @OneToMany(cascade = CascadeType.ALL)
    private List<SubmissionAttachment> attachments;
    
    private Instant submittedAt;
    private Instant gradedAt;
    private Instant createdAt;
    private Instant updatedAt;
    
    // Domain methods
    public void grade(BigDecimal score, String feedback, User teacher) {
        validateScore(score);
        this.score = score;
        this.feedback = feedback;
        this.gradingStatus = GradingStatus.GRADED;
        this.gradedAt = Instant.now();
    }
    
    private void validateScore(BigDecimal score) {
        if (score.compareTo(BigDecimal.ZERO) < 0) {
            throw new DomainException("Score cannot be negative");
        }
        if (score.compareTo(assignment.getMaxScore()) > 0) {
            throw new DomainException("Score exceeds max score");
        }
    }
}
```



### Value Objects

#### 1. Progress Value Object

```java
@Embeddable
public class Progress {
    private int completedLessons;
    private int totalLessons;
    private double percentage;
    
    private Progress(int completed, int total, double percentage) {
        this.completedLessons = completed;
        this.totalLessons = total;
        this.percentage = percentage;
    }
    
    public static Progress of(int completed, int total, double percentage) {
        if (completed < 0 || total < 0) {
            throw new IllegalArgumentException("Lesson counts cannot be negative");
        }
        if (completed > total) {
            throw new IllegalArgumentException("Completed cannot exceed total");
        }
        return new Progress(completed, total, percentage);
    }
    
    public static Progress zero() {
        return new Progress(0, 0, 0.0);
    }
    
    public boolean isComplete() {
        return completedLessons == totalLessons && totalLessons > 0;
    }
    
    // Immutable - no setters
}
```

#### 2. Grade Value Object

```java
@Embeddable
public class Grade {
    private BigDecimal value;
    private GradeStatus status;
    
    private Grade(BigDecimal value, GradeStatus status) {
        this.value = value;
        this.status = status;
    }
    
    public static Grade of(double value) {
        if (value < 0 || value > 10) {
            throw new IllegalArgumentException("Grade must be between 0 and 10");
        }
        return new Grade(BigDecimal.valueOf(value), GradeStatus.GRADED);
    }
    
    public static Grade notGraded() {
        return new Grade(null, GradeStatus.NOT_GRADED);
    }
    
    public String getLetterGrade() {
        if (status == GradeStatus.NOT_GRADED) return "N/A";
        if (value.compareTo(BigDecimal.valueOf(8.5)) >= 0) return "A";
        if (value.compareTo(BigDecimal.valueOf(7.0)) >= 0) return "B";
        if (value.compareTo(BigDecimal.valueOf(5.5)) >= 0) return "C";
        if (value.compareTo(BigDecimal.valueOf(4.0)) >= 0) return "D";
        return "F";
    }
    
    enum GradeStatus {
        GRADED, NOT_GRADED, PENDING
    }
}
```

#### 3. Analytics Value Object

```java
public class StudentAnalytics {
    private final int totalStudyTimeMinutes;
    private final int averageSessionTimeMinutes;
    private final int streakDays;
    private final int assignmentsCompleted;
    private final int assignmentsOverdue;
    private final double averageScore;
    private final List<String> strongSubjects;
    private final List<String> improvementAreas;
    
    private StudentAnalytics(Builder builder) {
        this.totalStudyTimeMinutes = builder.totalStudyTimeMinutes;
        this.averageSessionTimeMinutes = builder.averageSessionTimeMinutes;
        this.streakDays = builder.streakDays;
        this.assignmentsCompleted = builder.assignmentsCompleted;
        this.assignmentsOverdue = builder.assignmentsOverdue;
        this.averageScore = builder.averageScore;
        this.strongSubjects = List.copyOf(builder.strongSubjects);
        this.improvementAreas = List.copyOf(builder.improvementAreas);
    }
    
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        // Builder pattern implementation
    }
}
```



### DTOs (Data Transfer Objects)

#### 1. TeacherStudentSummaryDTO

```java
@Data
@Builder
public class TeacherStudentSummaryDTO {
    private UUID id;
    private String fullName;
    private String email;
    private Instant enrolledAt;
    private Instant lastAccessed;
    
    // Aggregated data
    private Integer progressPercentage;      // Overall progress across all courses
    private Double averageGrade;             // Average grade across all assignments
    private String status;                   // active, inactive, suspended
    private Integer completedCourses;
    private Integer totalCourses;
    
    // For filtering
    private List<UUID> enrolledCourseIds;
}
```

#### 2. TeacherStudentDetailDTO

```java
@Data
@Builder
public class TeacherStudentDetailDTO {
    private UUID id;
    private String fullName;
    private String email;
    private String phone;
    private String avatar;
    private Instant enrolledAt;
    private Instant lastAccessed;
    
    // Overall metrics
    private Integer progressPercentage;
    private Double averageGrade;
    private String status;
    
    // Detailed information
    private List<StudentCourseProgressDTO> courseProgress;
    private List<StudentAssignmentSummaryDTO> assignmentSubmissions;
    private StudentAnalyticsDTO analytics;
}
```

#### 3. StudentCourseProgressDTO

```java
@Data
@Builder
public class StudentCourseProgressDTO {
    private UUID courseId;
    private String courseTitle;
    private Instant enrolledAt;
    private Integer progressPercentage;
    private Integer completedLessons;
    private Integer totalLessons;
    private Instant lastAccessed;
    private Double grade;
    private String status;  // in-progress, completed, dropped
}
```

#### 4. StudentAssignmentSummaryDTO

```java
@Data
@Builder
public class StudentAssignmentSummaryDTO {
    private UUID assignmentId;
    private String assignmentTitle;
    private String courseTitle;
    private LocalDateTime dueDate;
    private Instant submittedAt;
    private String status;  // pending, submitted, graded, overdue
    private BigDecimal score;
    private BigDecimal maxScore;
    private String feedback;
}
```

#### 5. StudentAnalyticsDTO

```java
@Data
@Builder
public class StudentAnalyticsDTO {
    private Integer totalStudyTimeMinutes;
    private Integer averageSessionTimeMinutes;
    private Integer streakDays;
    private Integer assignmentsCompleted;
    private Integer assignmentsOverdue;
    private Double averageScore;
    private List<String> strongSubjects;
    private List<String> improvementAreas;
    private List<LearningActivityDTO> learningActivity;
}
```



## API Design

### RESTful API Endpoints

#### Student Management APIs

**1. Get All Students from Teacher's Courses**

```
GET /api/v1/teacher/students

Query Parameters:
- page: int (default: 0)
- size: int (default: 20)
- courseId: UUID (optional) - Filter by specific course
- status: string (optional) - Filter by status (active, inactive, suspended)
- search: string (optional) - Search by name or email

Response: 200 OK
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "uuid",
        "fullName": "Nguyễn Văn An",
        "email": "an.nguyen@student.edu.vn",
        "enrolledAt": "2024-09-01T00:00:00Z",
        "lastAccessed": "2024-11-18T10:30:00Z",
        "progressPercentage": 75,
        "averageGrade": 8.5,
        "status": "active",
        "completedCourses": 2,
        "totalCourses": 3,
        "enrolledCourseIds": ["uuid1", "uuid2", "uuid3"]
      }
    ],
    "pageable": {
      "pageNumber": 0,
      "pageSize": 20,
      "totalElements": 45,
      "totalPages": 3
    }
  }
}

Error Responses:
- 401 Unauthorized: Invalid or missing JWT token
- 403 Forbidden: User is not a teacher
- 500 Internal Server Error: Server error
```

**2. Get Student Detail**

```
GET /api/v1/teacher/students/{studentId}

Path Parameters:
- studentId: UUID

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "uuid",
    "fullName": "Nguyễn Văn An",
    "email": "an.nguyen@student.edu.vn",
    "phone": "+84901234567",
    "avatar": "https://storage.example.com/avatars/uuid.jpg",
    "enrolledAt": "2024-09-01T00:00:00Z",
    "lastAccessed": "2024-11-18T10:30:00Z",
    "progressPercentage": 75,
    "averageGrade": 8.5,
    "status": "active",
    "courseProgress": [
      {
        "courseId": "uuid",
        "courseTitle": "Maritime Safety Fundamentals",
        "enrolledAt": "2024-09-01T00:00:00Z",
        "progressPercentage": 80,
        "completedLessons": 16,
        "totalLessons": 20,
        "lastAccessed": "2024-11-18T10:30:00Z",
        "grade": 8.7,
        "status": "in-progress"
      }
    ],
    "assignmentSubmissions": [
      {
        "assignmentId": "uuid",
        "assignmentTitle": "Safety Procedures Quiz",
        "courseTitle": "Maritime Safety Fundamentals",
        "dueDate": "2024-11-20T23:59:59",
        "submittedAt": "2024-11-18T15:30:00Z",
        "status": "graded",
        "score": 85.0,
        "maxScore": 100.0,
        "feedback": "Good work! Pay attention to emergency procedures."
      }
    ],
    "analytics": {
      "totalStudyTimeMinutes": 1200,
      "averageSessionTimeMinutes": 45,
      "streakDays": 7,
      "assignmentsCompleted": 12,
      "assignmentsOverdue": 1,
      "averageScore": 8.5,
      "strongSubjects": ["Navigation", "Safety"],
      "improvementAreas": ["Engineering"]
    }
  }
}

Error Responses:
- 401 Unauthorized
- 403 Forbidden: Teacher doesn't have access to this student
- 404 Not Found: Student not found
```



**3. Get Student Analytics**

```
GET /api/v1/teacher/students/{studentId}/analytics

Query Parameters:
- courseId: UUID (optional) - Filter analytics by specific course
- timeRange: string (optional) - week, month, semester, year

Response: 200 OK
{
  "success": true,
  "data": {
    "totalStudyTimeMinutes": 1200,
    "averageSessionTimeMinutes": 45,
    "streakDays": 7,
    "assignmentsCompleted": 12,
    "assignmentsOverdue": 1,
    "averageScore": 8.5,
    "strongSubjects": ["Navigation", "Safety"],
    "improvementAreas": ["Engineering"],
    "learningActivity": [
      {
        "date": "2024-11-18",
        "studyTimeMinutes": 90,
        "lessonsCompleted": 3
      }
    ]
  }
}
```

**4. Update Student Status**

```
PATCH /api/v1/teacher/students/{studentId}/status

Request Body:
{
  "status": "active" | "inactive" | "suspended",
  "reason": "Optional reason for status change"
}

Response: 200 OK
{
  "success": true,
  "message": "Student status updated successfully"
}

Error Responses:
- 400 Bad Request: Invalid status value
- 403 Forbidden: Teacher doesn't have permission
- 404 Not Found: Student not found
```

**5. Send Message to Student**

```
POST /api/v1/teacher/students/{studentId}/messages

Request Body:
{
  "subject": "Assignment Feedback",
  "content": "Great work on your recent submission...",
  "priority": "normal" | "high"
}

Response: 200 OK
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "messageId": "uuid",
    "sentAt": "2024-11-18T10:30:00Z"
  }
}
```



#### Assignment Management APIs

**1. Get All Assignments**

```
GET /api/v1/teacher/assignments

Query Parameters:
- page: int (default: 0)
- size: int (default: 20)
- courseId: UUID (optional)
- status: string (optional) - DRAFT, PUBLISHED, CLOSED

Response: 200 OK
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "uuid",
        "title": "Safety Procedures Quiz",
        "courseId": "uuid",
        "courseTitle": "Maritime Safety Fundamentals",
        "dueDate": "2024-11-20T23:59:59",
        "status": "PUBLISHED",
        "totalSubmissions": 35,
        "totalStudents": 45,
        "averageScore": 8.2,
        "createdAt": "2024-09-01T00:00:00Z"
      }
    ],
    "pageable": {...}
  }
}
```

**2. Get Assignment Submissions**

```
GET /api/v1/teacher/assignments/{assignmentId}/submissions

Query Parameters:
- page: int
- size: int
- gradingStatus: string (optional) - PENDING, GRADED, RETURNED

Response: 200 OK
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "uuid",
        "studentId": "uuid",
        "studentName": "Nguyễn Văn An",
        "studentEmail": "an.nguyen@student.edu.vn",
        "submittedAt": "2024-11-18T15:30:00Z",
        "gradingStatus": "PENDING",
        "score": null,
        "feedback": null,
        "attachments": [
          {
            "id": "uuid",
            "fileName": "assignment.pdf",
            "fileUrl": "https://storage.example.com/submissions/uuid.pdf",
            "fileSize": 1024000
          }
        ]
      }
    ],
    "pageable": {...}
  }
}
```

**3. Grade Submission**

```
POST /api/v1/teacher/assignments/{assignmentId}/submissions/{submissionId}/grade

Request Body:
{
  "score": 85.0,
  "feedback": "Good work! Pay attention to emergency procedures.",
  "rubricScores": [
    {
      "rubricId": "uuid",
      "score": 20.0
    }
  ],
  "attachments": [
    {
      "fileName": "feedback.pdf",
      "fileUrl": "https://storage.example.com/feedback/uuid.pdf"
    }
  ]
}

Response: 200 OK
{
  "success": true,
  "message": "Submission graded successfully",
  "data": {
    "submissionId": "uuid",
    "score": 85.0,
    "gradedAt": "2024-11-18T16:00:00Z"
  }
}
```



#### Analytics APIs

**1. Get Dashboard Overview**

```
GET /api/v1/teacher/analytics/overview

Response: 200 OK
{
  "success": true,
  "data": {
    "totalCourses": 5,
    "totalStudents": 120,
    "activeCourses": 4,
    "draftCourses": 1,
    "averageCompletionRate": 75.5,
    "pendingGrading": 15,
    "totalRevenue": 12000.0,
    "averageRating": 4.7,
    "recentActivity": [
      {
        "type": "NEW_ENROLLMENT",
        "studentName": "Nguyễn Văn An",
        "courseName": "Maritime Safety",
        "timestamp": "2024-11-18T10:00:00Z"
      }
    ]
  }
}
```

**2. Get Course Analytics**

```
GET /api/v1/teacher/analytics/courses/{courseId}

Response: 200 OK
{
  "success": true,
  "data": {
    "courseId": "uuid",
    "courseTitle": "Maritime Safety Fundamentals",
    "totalStudents": 45,
    "activeStudents": 42,
    "averageProgress": 75.5,
    "averageGrade": 8.2,
    "completionRate": 68.9,
    "enrollmentTrend": [
      {
        "date": "2024-11-01",
        "enrollments": 5
      }
    ],
    "lessonEngagement": [
      {
        "lessonId": "uuid",
        "lessonTitle": "Introduction to Safety",
        "completionRate": 95.6,
        "averageTimeSpent": 45
      }
    ],
    "assignmentPerformance": [
      {
        "assignmentId": "uuid",
        "assignmentTitle": "Safety Quiz",
        "submissionRate": 88.9,
        "averageScore": 8.5
      }
    ]
  }
}
```

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "TEACHER_001",
    "message": "Teacher does not have access to this student",
    "details": "Student is not enrolled in any of your courses",
    "timestamp": "2024-11-18T10:30:00Z",
    "path": "/api/v1/teacher/students/uuid"
  }
}
```

### Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| TEACHER_001 | Access denied to student | 403 |
| TEACHER_002 | Course not found | 404 |
| TEACHER_003 | Assignment not found | 404 |
| TEACHER_004 | Invalid grading data | 400 |
| TEACHER_005 | Student not enrolled | 400 |
| TEACHER_006 | Duplicate enrollment | 409 |
| TEACHER_007 | Course not approved | 400 |
| TEACHER_008 | Invalid status transition | 400 |
| TEACHER_009 | Unauthorized operation | 403 |
| TEACHER_010 | Database error | 500 |



## Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐         ┌─────────────────┐
│     users       │         │    courses      │
├─────────────────┤         ├─────────────────┤
│ id (PK)         │◄────────┤ teacher_id (FK) │
│ username        │         │ code (UNIQUE)   │
│ email (UNIQUE)  │         │ title           │
│ password        │         │ description     │
│ full_name       │         │ status          │
│ role            │         │ created_at      │
│ enabled         │         │ updated_at      │
│ created_at      │         └─────────────────┘
│ updated_at      │                 │
└─────────────────┘                 │
         │                          │
         │                          ▼
         │              ┌─────────────────┐
         │              │    sections     │
         │              ├─────────────────┤
         │              │ id (PK)         │
         │              │ course_id (FK)  │
         │              │ title           │
         │              │ description     │
         │              │ order_index     │
         │              │ created_at      │
         │              │ updated_at      │
         │              └─────────────────┘
         │                      │
         │                      ▼
         │              ┌─────────────────┐
         │              │    lessons      │
         │              ├─────────────────┤
         │              │ id (PK)         │
         │              │ section_id (FK) │
         │              │ title           │
         │              │ content         │
         │              │ video_url       │
         │              │ duration_min    │
         │              │ order_index     │
         │              │ lesson_type     │
         │              │ created_at      │
         │              │ updated_at      │
         │              └─────────────────┘
         │                      │
         │                      ▼
         │         ┌──────────────────────────┐
         │         │ student_lesson_progress  │
         │         ├──────────────────────────┤
         │         │ id (PK)                  │
         ├─────────┤ student_id (FK)          │
         │         │ lesson_id (FK)           │
         │         │ status                   │
         │         │ time_spent_minutes       │
         │         │ completed_at             │
         │         │ created_at               │
         │         │ updated_at               │
         │         └──────────────────────────┘
         │
         │         ┌─────────────────┐
         │         │  assignments    │
         │         ├─────────────────┤
         │         │ id (PK)         │
         │         │ course_id (FK)  │
         │         │ title           │
         │         │ description     │
         │         │ instructions    │
         │         │ due_date        │
         │         │ max_score       │
         │         │ assignment_type │
         │         │ status          │
         │         │ config (JSONB)  │
         │         │ created_at      │
         │         │ updated_at      │
         │         └─────────────────┘
         │                 │
         │                 ▼
         │         ┌─────────────────┐
         │         │  submissions    │
         │         ├─────────────────┤
         │         │ id (PK)         │
         ├─────────┤ student_id (FK) │
         │         │ assignment_id   │
         │         │ content         │
         │         │ score           │
         │         │ feedback        │
         │         │ grading_status  │
         │         │ submitted_at    │
         │         │ graded_at       │
         │         │ created_at      │
         │         │ updated_at      │
         │         └─────────────────┘
         │
         │         ┌──────────────────────┐
         └─────────┤ course_enrollments   │
                   ├──────────────────────┤
                   │ student_id (FK, PK)  │
                   │ course_id (FK, PK)   │
                   │ enrolled_at          │
                   └──────────────────────┘
```

### Key Indexes

```sql
-- Performance indexes for teacher queries
CREATE INDEX idx_courses_teacher_id ON courses(teacher_id);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_sections_course_id ON sections(course_id);
CREATE INDEX idx_lessons_section_id ON lessons(section_id);
CREATE INDEX idx_assignments_course_id ON assignments(course_id);
CREATE INDEX idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX idx_submissions_student_id ON submissions(student_id);
CREATE INDEX idx_submissions_grading_status ON submissions(grading_status);
CREATE INDEX idx_student_progress_student_id ON student_lesson_progress(student_id);
CREATE INDEX idx_student_progress_lesson_id ON student_lesson_progress(lesson_id);
CREATE INDEX idx_course_enrollments_student_id ON course_enrollments(student_id);
CREATE INDEX idx_course_enrollments_course_id ON course_enrollments(course_id);

-- Composite indexes for common queries
CREATE INDEX idx_courses_teacher_status ON courses(teacher_id, status);
CREATE INDEX idx_submissions_assignment_status ON submissions(assignment_id, grading_status);
```



## Testing Strategy

### Unit Tests

**Domain Layer Tests**

```java
@Test
public void testCalculateStudentProgress_WithCompletedLessons() {
    // Given
    User student = createTestStudent();
    Course course = createTestCourse();
    markLessonsAsCompleted(student, course, 15, 20);
    
    // When
    Progress progress = teacherDomainService.calculateStudentProgress(student, course);
    
    // Then
    assertEquals(15, progress.getCompletedLessons());
    assertEquals(20, progress.getTotalLessons());
    assertEquals(75.0, progress.getPercentage(), 0.01);
}

@Test
public void testVerifyTeacherStudentAccess_WhenStudentNotEnrolled_ThrowsException() {
    // Given
    UUID teacherId = UUID.randomUUID();
    UUID studentId = UUID.randomUUID();
    
    // When & Then
    assertThrows(AccessDeniedException.class, () -> {
        teacherDomainService.verifyTeacherStudentAccess(teacherId, studentId);
    });
}
```

**Application Layer Tests**

```java
@Test
public void testGetMyStudents_WithCourseFilter_ReturnsFilteredStudents() {
    // Given
    UUID teacherId = UUID.randomUUID();
    UUID courseId = UUID.randomUUID();
    Pageable pageable = PageRequest.of(0, 20);
    
    // When
    Page<TeacherStudentSummaryDTO> result = teacherApplicationService
        .getMyStudents(teacherId, pageable, courseId, null, null);
    
    // Then
    assertNotNull(result);
    assertTrue(result.getContent().stream()
        .allMatch(s -> s.getEnrolledCourseIds().contains(courseId)));
}
```

### Integration Tests

**Controller Integration Tests**

```java
@SpringBootTest
@AutoConfigureMockMvc
public class TeacherControllerIntegrationTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Test
    @WithMockUser(roles = "TEACHER")
    public void testGetMyStudents_ReturnsOk() throws Exception {
        mockMvc.perform(get("/api/v1/teacher/students")
                .param("page", "0")
                .param("size", "20"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.content").isArray());
    }
    
    @Test
    @WithMockUser(roles = "STUDENT")
    public void testGetMyStudents_AsStu dent_ReturnsForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/teacher/students"))
            .andExpect(status().isForbidden());
    }
}
```

### E2E Tests

**Scenario: Teacher views student progress**

```typescript
describe('Teacher Student Management', () => {
  it('should display list of students', async () => {
    // Login as teacher
    await loginAsTeacher('teacher@example.com', 'password');
    
    // Navigate to student management
    await page.goto('/teacher/students');
    
    // Verify students are displayed
    const students = await page.$$('.student-row');
    expect(students.length).toBeGreaterThan(0);
    
    // Verify student information
    const firstStudent = students[0];
    expect(await firstStudent.$('.student-name')).toBeTruthy();
    expect(await firstStudent.$('.student-progress')).toBeTruthy();
    expect(await firstStudent.$('.student-grade')).toBeTruthy();
  });
  
  it('should filter students by course', async () => {
    await loginAsTeacher('teacher@example.com', 'password');
    await page.goto('/teacher/students');
    
    // Select course filter
    await page.selectOption('#course-filter', 'course-uuid');
    await page.click('#apply-filter');
    
    // Verify filtered results
    await page.waitForSelector('.student-row');
    const students = await page.$$('.student-row');
    expect(students.length).toBeGreaterThan(0);
  });
});
```



## Security Considerations

### Authentication & Authorization

**JWT Token Structure**

```json
{
  "sub": "teacher-uuid",
  "email": "teacher@example.com",
  "role": "TEACHER",
  "iat": 1700308800,
  "exp": 1700395200
}
```

**Authorization Rules**

1. **Teacher can only access their own students**
   - Verify student is enrolled in teacher's courses
   - Check via `course_enrollments` table

2. **Teacher can only grade assignments from their courses**
   - Verify assignment belongs to teacher's course
   - Check via `assignments.course_id → courses.teacher_id`

3. **Teacher cannot modify other teachers' courses**
   - Verify course ownership before any modification
   - Check `courses.teacher_id == currentUser.id`

**Security Filters**

```java
@PreAuthorize("hasRole('TEACHER')")
public ResponseEntity<?> getMyStudents(...) {
    // Additional check: verify teacher owns the courses
    verifyTeacherOwnership(currentUser.getId(), courseId);
    // ...
}

private void verifyTeacherOwnership(UUID teacherId, UUID courseId) {
    Course course = courseRepository.findById(courseId)
        .orElseThrow(() -> new NotFoundException("Course not found"));
    
    if (!course.getTeacher().getId().equals(teacherId)) {
        throw new AccessDeniedException("You don't own this course");
    }
}
```

### Data Privacy

**PII Protection**

- Student phone numbers: Only visible to course teacher
- Student addresses: Not exposed via API
- Email addresses: Masked for non-enrolled students
- Grades: Only visible to student's teachers

**Audit Logging**

```java
@Aspect
@Component
public class TeacherAuditAspect {
    
    @AfterReturning("@annotation(AuditLog)")
    public void logTeacherAction(JoinPoint joinPoint) {
        String action = joinPoint.getSignature().getName();
        Object[] args = joinPoint.getArgs();
        
        auditLogRepository.save(AuditLog.builder()
            .userId(getCurrentUserId())
            .action(action)
            .parameters(serializeArgs(args))
            .timestamp(Instant.now())
            .build());
    }
}
```

### Rate Limiting

```java
@RateLimiter(name = "teacherApi", fallbackMethod = "rateLimitFallback")
public ResponseEntity<?> getMyStudents(...) {
    // API implementation
}

// Rate limit: 100 requests per minute per teacher
resilience4j.ratelimiter:
  instances:
    teacherApi:
      limitForPeriod: 100
      limitRefreshPeriod: 60s
      timeoutDuration: 5s
```



## Performance Optimization

### Caching Strategy

**Redis Cache Configuration**

```java
@Configuration
@EnableCaching
public class CacheConfig {
    
    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(10))
            .serializeKeysWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new StringRedisSerializer()))
            .serializeValuesWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new GenericJackson2JsonRedisSerializer()));
        
        return RedisCacheManager.builder(connectionFactory)
            .cacheDefaults(config)
            .build();
    }
}
```

**Cacheable Methods**

```java
@Cacheable(value = "teacherStudents", key = "#teacherId + '_' + #courseId")
public List<TeacherStudentSummaryDTO> getMyStudents(UUID teacherId, UUID courseId) {
    // Expensive database query
}

@CacheEvict(value = "teacherStudents", key = "#teacherId + '_*'")
public void enrollStudent(UUID teacherId, UUID courseId, UUID studentId) {
    // Invalidate cache when enrollment changes
}
```

### Database Query Optimization

**N+1 Query Prevention**

```java
// BAD: N+1 queries
public List<TeacherStudentSummaryDTO> getMyStudents(UUID teacherId) {
    List<Course> courses = courseRepository.findByTeacherId(teacherId);
    
    return courses.stream()
        .flatMap(course -> course.getEnrolledStudents().stream()) // N queries!
        .map(this::toDTO)
        .collect(Collectors.toList());
}

// GOOD: Single query with JOIN FETCH
@Query("SELECT DISTINCT c FROM Course c " +
       "LEFT JOIN FETCH c.enrolledStudents " +
       "WHERE c.teacher.id = :teacherId")
List<Course> findByTeacherIdWithStudents(@Param("teacherId") UUID teacherId);
```

**Pagination for Large Datasets**

```java
// Use cursor-based pagination for better performance
@Query("SELECT s FROM User s " +
       "JOIN s.enrolledCourses c " +
       "WHERE c.teacher.id = :teacherId " +
       "AND s.id > :cursor " +
       "ORDER BY s.id " +
       "LIMIT :limit")
List<User> findStudentsByCursor(
    @Param("teacherId") UUID teacherId,
    @Param("cursor") UUID cursor,
    @Param("limit") int limit
);
```

### Async Processing

**Background Jobs**

```java
@Service
public class TeacherAnalyticsService {
    
    @Async("teacherTaskExecutor")
    public CompletableFuture<StudentAnalyticsDTO> calculateStudentAnalytics(
        UUID studentId, UUID teacherId
    ) {
        // Heavy computation in background
        StudentAnalyticsDTO analytics = performComplexCalculations(studentId);
        return CompletableFuture.completedFuture(analytics);
    }
}

@Configuration
public class AsyncConfig {
    
    @Bean(name = "teacherTaskExecutor")
    public Executor teacherTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("teacher-async-");
        executor.initialize();
        return executor;
    }
}
```



## Frontend Integration

### Angular Service Architecture

```typescript
// teacher.service.ts
@Injectable({ providedIn: 'root' })
export class TeacherService {
  private api = inject(ApiClient);
  
  // Signals for state management
  private _students = signal<TeacherStudent[]>([]);
  private _isLoading = signal(false);
  private _error = signal<string | null>(null);
  
  // Computed signals
  readonly students = computed(() => this._students());
  readonly isLoading = computed(() => this._isLoading());
  readonly error = computed(() => this._error());
  
  // API methods
  async getMyStudents(params: StudentFilters): Promise<Page<TeacherStudent>> {
    this._isLoading.set(true);
    this._error.set(null);
    
    try {
      const response = await firstValueFrom(
        this.api.get<Page<TeacherStudent>>('/api/v1/teacher/students', { params })
      );
      
      this._students.set(response.content);
      return response;
    } catch (error) {
      this._error.set('Failed to load students');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }
  
  async getStudentDetail(studentId: string): Promise<TeacherStudentDetail> {
    return firstValueFrom(
      this.api.get<TeacherStudentDetail>(`/api/v1/teacher/students/${studentId}`)
    );
  }
}
```

### Component Design

```typescript
// student-management.component.ts
@Component({
  selector: 'app-student-management',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold">Học viên</h1>
      
      <!-- Filters -->
      <div class="filters">
        <input [(ngModel)]="searchTerm" placeholder="Tìm kiếm..." />
        <select [(ngModel)]="selectedCourse">
          <option value="">Tất cả khóa học</option>
          @for (course of courses(); track course.id) {
            <option [value]="course.id">{{ course.title }}</option>
          }
        </select>
        <button (click)="applyFilters()">Lọc</button>
      </div>
      
      <!-- Student List -->
      @if (isLoading()) {
        <div class="loading">Đang tải...</div>
      } @else if (error()) {
        <div class="error">{{ error() }}</div>
      } @else {
        <table>
          <thead>
            <tr>
              <th>Tên</th>
              <th>Email</th>
              <th>Tiến độ</th>
              <th>Điểm TB</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            @for (student of students(); track student.id) {
              <tr>
                <td>{{ student.fullName }}</td>
                <td>{{ student.email }}</td>
                <td>
                  <progress-bar [value]="student.progressPercentage" />
                </td>
                <td>{{ student.averageGrade | number:'1.1-1' }}</td>
                <td>
                  <status-badge [status]="student.status" />
                </td>
                <td>
                  <a [routerLink]="['/teacher/students', student.id]">
                    Chi tiết
                  </a>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
      
      <!-- Pagination -->
      <pagination
        [currentPage]="currentPage()"
        [totalPages]="totalPages()"
        (pageChange)="onPageChange($event)"
      />
    </div>
  `
})
export class StudentManagementComponent {
  private teacherService = inject(TeacherService);
  
  // Signals
  searchTerm = signal('');
  selectedCourse = signal('');
  currentPage = signal(1);
  
  // Computed
  students = computed(() => this.teacherService.students());
  isLoading = computed(() => this.teacherService.isLoading());
  error = computed(() => this.teacherService.error());
  
  async ngOnInit() {
    await this.loadStudents();
  }
  
  async loadStudents() {
    const params = {
      page: this.currentPage() - 1,
      size: 20,
      courseId: this.selectedCourse() || undefined,
      search: this.searchTerm() || undefined
    };
    
    await this.teacherService.getMyStudents(params);
  }
  
  applyFilters() {
    this.currentPage.set(1);
    this.loadStudents();
  }
}
```



## Deployment Considerations

### Environment Configuration

```yaml
# application-prod.yml
spring:
  datasource:
    url: jdbc:postgresql://prod-db:5432/lms
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      connection-timeout: 30000
  
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        jdbc:
          batch_size: 20
        order_inserts: true
        order_updates: true
  
  cache:
    type: redis
    redis:
      time-to-live: 600000  # 10 minutes

teacher:
  api:
    rate-limit:
      requests-per-minute: 100
    pagination:
      default-page-size: 20
      max-page-size: 100
```

### Monitoring & Observability

**Metrics**

```java
@Component
public class TeacherMetrics {
    
    private final MeterRegistry meterRegistry;
    
    public TeacherMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }
    
    public void recordStudentQuery(long duration) {
        meterRegistry.timer("teacher.students.query.duration")
            .record(duration, TimeUnit.MILLISECONDS);
    }
    
    public void incrementGradingAction() {
        meterRegistry.counter("teacher.grading.actions").increment();
    }
}
```

**Health Checks**

```java
@Component
public class TeacherHealthIndicator implements HealthIndicator {
    
    private final CourseRepository courseRepository;
    
    @Override
    public Health health() {
        try {
            long courseCount = courseRepository.count();
            return Health.up()
                .withDetail("totalCourses", courseCount)
                .build();
        } catch (Exception e) {
            return Health.down()
                .withDetail("error", e.getMessage())
                .build();
        }
    }
}
```

### Scalability

**Horizontal Scaling**

- Stateless API servers
- Session data in Redis
- File storage in S3/MinIO
- Database read replicas for queries

**Load Balancing**

```nginx
upstream teacher_api {
    least_conn;
    server teacher-api-1:8080;
    server teacher-api-2:8080;
    server teacher-api-3:8080;
}

server {
    listen 80;
    server_name api.lms.example.com;
    
    location /api/v1/teacher {
        proxy_pass http://teacher_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Migration Strategy

### Phase 1: Backend Implementation (Week 1-2)

1. Create DTOs and Value Objects
2. Implement TeacherDomainService
3. Implement TeacherApplicationService
4. Create TeacherController with endpoints
5. Write unit tests
6. Write integration tests

### Phase 2: Frontend Integration (Week 3)

1. Update StudentApi to use new endpoints
2. Fix StudentManagementComponent
3. Update TeacherService
4. Add error handling
5. Write component tests

### Phase 3: Testing & Deployment (Week 4)

1. E2E testing
2. Performance testing
3. Security audit
4. Deploy to staging
5. User acceptance testing
6. Deploy to production

## Documentation

### API Documentation (OpenAPI/Swagger)

```java
@OpenAPIDefinition(
    info = @Info(
        title = "Teacher API",
        version = "1.0",
        description = "API for teacher operations in LMS"
    )
)
@SecurityScheme(
    name = "Bearer Authentication",
    type = SecuritySchemeType.HTTP,
    bearerFormat = "JWT",
    scheme = "bearer"
)
public class TeacherApiDocumentation {
    // Swagger UI available at /swagger-ui.html
}
```

### Developer Guide

- Architecture overview
- API usage examples
- Common patterns
- Troubleshooting guide
- Performance tips

### User Guide

- Teacher dashboard walkthrough
- Student management guide
- Grading workflow
- Analytics interpretation

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-18  
**Author:** Kiro AI Assistant  
**Status:** Ready for Review
