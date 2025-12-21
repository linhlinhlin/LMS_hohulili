# Backend LMS Refactoring - Technical Design

## 🏗️ Architecture Overview

### Modular Monolith with DDD Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway Layer                         │
│  (REST Controllers - Thin, only HTTP concerns)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                           │
│  (Use Cases, DTOs, Application Services)                        │
│  - Orchestrates domain objects                                  │
│  - Transaction boundaries                                       │
│  - DTO mapping                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Domain Layer                              │
│  (Entities, Value Objects, Domain Services, Domain Events)      │
│  - Business rules                                               │
│  - Invariants                                                   │
│  - Pure Java, no framework dependencies                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                          │
│  (JPA Repositories, External APIs, File Storage)                │
│  - Database access                                              │
│  - External service integration                                 │
│  - Framework-specific code                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Module Structure

### Shared Kernel

```java
// shared/domain/model/BaseEntity.java
package com.example.lms.shared.domain.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@MappedSuperclass
public abstract class BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(name = "created_at", updatable = false)
    private Instant createdAt = Instant.now();
    
    @Column(name = "updated_at")
    private Instant updatedAt;
    
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
    
    // Getters
    public UUID getId() { return id; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    
    protected void setId(UUID id) { this.id = id; }
}
```

```java
// shared/domain/model/AggregateRoot.java
package com.example.lms.shared.domain.model;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public abstract class AggregateRoot extends BaseEntity {
    @Transient
    private final List<DomainEvent> domainEvents = new ArrayList<>();
    
    protected void registerEvent(DomainEvent event) {
        domainEvents.add(event);
    }
    
    public List<DomainEvent> getDomainEvents() {
        return Collections.unmodifiableList(domainEvents);
    }
    
    public void clearDomainEvents() {
        domainEvents.clear();
    }
}
```

```java
// shared/domain/event/DomainEvent.java
package com.example.lms.shared.domain.event;

import java.time.Instant;
import java.util.UUID;

public interface DomainEvent {
    UUID getEventId();
    Instant getOccurredAt();
    String getEventType();
}
```

### Value Objects

```java
// shared/domain/valueobject/Email.java
package com.example.lms.shared.domain.valueobject;

import jakarta.persistence.Embeddable;
import java.util.Objects;
import java.util.regex.Pattern;

@Embeddable
public class Email {
    private static final Pattern EMAIL_PATTERN = 
        Pattern.compile("^[A-Za-z0-9+_.-]+@(.+)$");
    
    private String value;
    
    protected Email() {} // JPA
    
    private Email(String value) {
        this.value = value;
    }
    
    public static Email of(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Email không được để trống");
        }
        if (!EMAIL_PATTERN.matcher(value).matches()) {
            throw new IllegalArgumentException("Email không đúng định dạng");
        }
        return new Email(value.toLowerCase().trim());
    }
    
    public String getValue() { return value; }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Email email = (Email) o;
        return Objects.equals(value, email.value);
    }
    
    @Override
    public int hashCode() { return Objects.hash(value); }
    
    @Override
    public String toString() { return value; }
}
```

```java
// shared/domain/valueobject/CourseCode.java
package com.example.lms.shared.domain.valueobject;

import jakarta.persistence.Embeddable;
import java.util.Objects;
import java.util.regex.Pattern;

@Embeddable
public class CourseCode {
    private static final Pattern CODE_PATTERN = 
        Pattern.compile("^[A-Z0-9]{3,20}$");
    
    private String value;
    
    protected CourseCode() {}
    
    private CourseCode(String value) {
        this.value = value;
    }
    
    public static CourseCode of(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Mã khóa học không được để trống");
        }
        String normalized = value.toUpperCase().trim();
        if (!CODE_PATTERN.matcher(normalized).matches()) {
            throw new IllegalArgumentException(
                "Mã khóa học phải từ 3-20 ký tự, chỉ chứa chữ hoa và số");
        }
        return new CourseCode(normalized);
    }
    
    public String getValue() { return value; }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        CourseCode that = (CourseCode) o;
        return Objects.equals(value, that.value);
    }
    
    @Override
    public int hashCode() { return Objects.hash(value); }
}
```

---

## 📚 Course Authoring Module

### Domain Model

```java
// course_authoring/domain/model/Course.java
package com.example.lms.course_authoring.domain.model;

import com.example.lms.shared.domain.model.AggregateRoot;
import com.example.lms.shared.domain.valueobject.CourseCode;
import com.example.lms.course_authoring.domain.event.*;
import jakarta.persistence.*;
import java.util.*;

@Entity
@Table(name = "courses")
public class Course extends AggregateRoot {
    
    @Embedded
    @AttributeOverride(name = "value", column = @Column(name = "code", unique = true))
    private CourseCode code;
    
    @Column(nullable = false)
    private String title;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CourseStatus status = CourseStatus.DRAFT;
    
    @Column(name = "teacher_id", nullable = false)
    private UUID teacherId;
    
    @OneToMany(mappedBy = "course", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    private List<Chapter> chapters = new ArrayList<>();
    
    // Review workflow
    @Column(columnDefinition = "TEXT")
    private String reviewComment;
    
    @Column(name = "reviewed_at")
    private java.time.Instant reviewedAt;
    
    @Column(name = "reviewed_by_id")
    private UUID reviewedById;
    
    protected Course() {} // JPA
    
    // Factory method - enforces invariants
    public static Course create(CourseCode code, String title, String description, UUID teacherId) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Tên khóa học không được để trống");
        }
        if (teacherId == null) {
            throw new IllegalArgumentException("Giảng viên không được để trống");
        }
        
        Course course = new Course();
        course.code = code;
        course.title = title.trim();
        course.description = description;
        course.teacherId = teacherId;
        course.status = CourseStatus.DRAFT;
        
        course.registerEvent(new CourseCreatedEvent(course.getId(), code.getValue(), title));
        return course;
    }
    
    // Domain behavior
    public void updateInfo(String title, String description) {
        if (this.status == CourseStatus.PENDING) {
            throw new IllegalStateException("Không thể chỉnh sửa khóa học đang chờ duyệt");
        }
        
        if (title != null && !title.isBlank()) {
            this.title = title.trim();
        }
        this.description = description;
        
        // If was approved, need re-approval
        if (this.status == CourseStatus.APPROVED) {
            this.status = CourseStatus.PENDING;
            clearReviewInfo();
        }
    }
    
    public void submitForApproval() {
        if (this.status != CourseStatus.DRAFT && this.status != CourseStatus.REJECTED) {
            throw new IllegalStateException("Chỉ có thể gửi duyệt khóa học ở trạng thái DRAFT hoặc REJECTED");
        }
        if (this.chapters.isEmpty()) {
            throw new IllegalStateException("Khóa học phải có ít nhất 1 chương");
        }
        
        this.status = CourseStatus.PENDING;
        clearReviewInfo();
        
        registerEvent(new CourseSubmittedForApprovalEvent(getId(), code.getValue()));
    }
    
    public void approve(UUID reviewerId, String comment) {
        if (this.status != CourseStatus.PENDING) {
            throw new IllegalStateException("Chỉ có thể duyệt khóa học đang chờ duyệt");
        }
        
        this.status = CourseStatus.APPROVED;
        this.reviewedById = reviewerId;
        this.reviewComment = comment;
        this.reviewedAt = java.time.Instant.now();
        
        registerEvent(new CourseApprovedEvent(getId(), code.getValue()));
    }
    
    public void reject(UUID reviewerId, String reason) {
        if (this.status != CourseStatus.PENDING) {
            throw new IllegalStateException("Chỉ có thể từ chối khóa học đang chờ duyệt");
        }
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Lý do từ chối không được để trống");
        }
        
        this.status = CourseStatus.REJECTED;
        this.reviewedById = reviewerId;
        this.reviewComment = reason;
        this.reviewedAt = java.time.Instant.now();
        
        registerEvent(new CourseRejectedEvent(getId(), code.getValue(), reason));
    }
    
    public void cancelApprovalRequest() {
        if (this.status != CourseStatus.PENDING) {
            throw new IllegalStateException("Chỉ có thể hủy yêu cầu duyệt khi đang chờ duyệt");
        }
        this.status = CourseStatus.DRAFT;
    }
    
    public Chapter addChapter(String title, String description, int orderIndex) {
        Chapter chapter = Chapter.create(this, title, description, orderIndex);
        this.chapters.add(chapter);
        return chapter;
    }
    
    public void removeChapter(UUID chapterId) {
        this.chapters.removeIf(c -> c.getId().equals(chapterId));
        reorderChapters();
    }
    
    private void reorderChapters() {
        for (int i = 0; i < chapters.size(); i++) {
            chapters.get(i).setOrderIndex(i);
        }
    }
    
    private void clearReviewInfo() {
        this.reviewComment = null;
        this.reviewedAt = null;
        this.reviewedById = null;
    }
    
    // Getters
    public CourseCode getCode() { return code; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public CourseStatus getStatus() { return status; }
    public UUID getTeacherId() { return teacherId; }
    public List<Chapter> getChapters() { return Collections.unmodifiableList(chapters); }
    public String getReviewComment() { return reviewComment; }
    public java.time.Instant getReviewedAt() { return reviewedAt; }
    public UUID getReviewedById() { return reviewedById; }
    
    public boolean isEditable() {
        return status == CourseStatus.DRAFT || status == CourseStatus.REJECTED;
    }
    
    public boolean isPublished() {
        return status == CourseStatus.APPROVED;
    }
    
    public enum CourseStatus {
        DRAFT("Bản nháp"),
        PENDING("Chờ duyệt"),
        APPROVED("Đã duyệt"),
        REJECTED("Bị từ chối");
        
        private final String displayName;
        CourseStatus(String displayName) { this.displayName = displayName; }
        public String getDisplayName() { return displayName; }
    }
}
```

### Application Layer - Use Cases

```java
// course_authoring/application/usecase/CreateCourseUseCase.java
package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.application.dto.*;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.shared.domain.valueobject.CourseCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CreateCourseUseCase {
    
    private final CourseRepository courseRepository;
    private final CourseMapper courseMapper;
    
    @Transactional
    public CourseResponse execute(CreateCourseCommand command) {
        // Validate unique code
        CourseCode code = CourseCode.of(command.getCode());
        if (courseRepository.existsByCode(code)) {
            throw new CourseCodeAlreadyExistsException(code.getValue());
        }
        
        // Create course
        Course course = Course.create(
            code,
            command.getTitle(),
            command.getDescription(),
            command.getTeacherId()
        );
        
        // Save
        course = courseRepository.save(course);
        
        // Return DTO
        return courseMapper.toResponse(course);
    }
}
```

```java
// course_authoring/application/dto/CreateCourseCommand.java
package com.example.lms.course_authoring.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record CreateCourseCommand(
    @NotBlank(message = "Mã khóa học không được để trống")
    @Size(min = 3, max = 20, message = "Mã khóa học phải từ 3-20 ký tự")
    String code,
    
    @NotBlank(message = "Tên khóa học không được để trống")
    @Size(max = 255, message = "Tên khóa học không được vượt quá 255 ký tự")
    String title,
    
    String description,
    
    @NotNull(message = "Teacher ID không được để trống")
    UUID teacherId
) {}
```

### Infrastructure Layer - Controller

```java
// course_authoring/infrastructure/web/CourseController.java
package com.example.lms.course_authoring.infrastructure.web;

import com.example.lms.course_authoring.application.dto.*;
import com.example.lms.course_authoring.application.usecase.*;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/courses")
@RequiredArgsConstructor
@Tag(name = "Course Authoring", description = "API quản lý khóa học")
public class CourseController {
    
    private final CreateCourseUseCase createCourseUseCase;
    private final UpdateCourseUseCase updateCourseUseCase;
    private final GetCourseUseCase getCourseUseCase;
    private final SubmitCourseForApprovalUseCase submitForApprovalUseCase;
    private final DeleteCourseUseCase deleteCourseUseCase;
    
    @PostMapping
    @PreAuthorize("hasRole('TEACHER')")
    @Operation(summary = "Tạo khóa học mới")
    public ResponseEntity<ApiResponse<CourseResponse>> createCourse(
            @AuthenticationPrincipal UserPrincipal user,
            @Valid @RequestBody CreateCourseRequest request
    ) {
        CreateCourseCommand command = new CreateCourseCommand(
            request.code(),
            request.title(),
            request.description(),
            user.getId()
        );
        
        CourseResponse response = createCourseUseCase.execute(command);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(response));
    }
    
    @GetMapping("/{courseId}")
    @Operation(summary = "Lấy thông tin khóa học")
    public ResponseEntity<ApiResponse<CourseResponse>> getCourse(
            @PathVariable UUID courseId
    ) {
        CourseResponse response = getCourseUseCase.execute(courseId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    @PutMapping("/{courseId}")
    @PreAuthorize("hasRole('TEACHER')")
    @Operation(summary = "Cập nhật khóa học")
    public ResponseEntity<ApiResponse<CourseResponse>> updateCourse(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal UserPrincipal user,
            @Valid @RequestBody UpdateCourseRequest request
    ) {
        UpdateCourseCommand command = new UpdateCourseCommand(
            courseId,
            user.getId(),
            request.title(),
            request.description()
        );
        
        CourseResponse response = updateCourseUseCase.execute(command);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    @PostMapping("/{courseId}/submit-for-approval")
    @PreAuthorize("hasRole('TEACHER')")
    @Operation(summary = "Gửi khóa học để phê duyệt")
    public ResponseEntity<ApiResponse<CourseResponse>> submitForApproval(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal UserPrincipal user
    ) {
        CourseResponse response = submitForApprovalUseCase.execute(courseId, user.getId());
        return ResponseEntity.ok(ApiResponse.success(response, "Khóa học đã được gửi để phê duyệt"));
    }
    
    @DeleteMapping("/{courseId}")
    @PreAuthorize("hasRole('TEACHER')")
    @Operation(summary = "Xóa khóa học")
    public ResponseEntity<ApiResponse<Void>> deleteCourse(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal UserPrincipal user
    ) {
        deleteCourseUseCase.execute(courseId, user.getId());
        return ResponseEntity.ok(ApiResponse.success(null, "Khóa học đã được xóa"));
    }
}
```

---

## 🎓 Learning Delivery Module

### Domain Model

```java
// learning_delivery/domain/model/Enrollment.java
package com.example.lms.learning_delivery.domain.model;

import com.example.lms.shared.domain.model.AggregateRoot;
import com.example.lms.learning_delivery.domain.event.*;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;

@Entity
@Table(name = "enrollments",
       uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "class_id"}))
public class Enrollment extends AggregateRoot {
    
    @Column(name = "class_id", nullable = false)
    private UUID classId;
    
    @Column(name = "student_id", nullable = false)
    private UUID studentId;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EnrollmentStatus status = EnrollmentStatus.ACTIVE;
    
    @ElementCollection
    @CollectionTable(name = "lesson_progress", joinColumns = @JoinColumn(name = "enrollment_id"))
    @MapKeyColumn(name = "lesson_id")
    private Map<UUID, LessonProgress> progress = new HashMap<>();
    
    @Column(name = "completion_percent")
    private Integer completionPercent = 0;
    
    @Column(name = "completed_at")
    private Instant completedAt;
    
    @Column(name = "enrolled_at", updatable = false)
    private Instant enrolledAt = Instant.now();
    
    protected Enrollment() {}
    
    public static Enrollment create(UUID classId, UUID studentId) {
        Enrollment enrollment = new Enrollment();
        enrollment.classId = classId;
        enrollment.studentId = studentId;
        enrollment.status = EnrollmentStatus.ACTIVE;
        enrollment.enrolledAt = Instant.now();
        
        enrollment.registerEvent(new StudentEnrolledEvent(
            enrollment.getId(), classId, studentId));
        return enrollment;
    }
    
    public void markLessonCompleted(UUID lessonId) {
        LessonProgress lessonProgress = progress.getOrDefault(lessonId, new LessonProgress());
        lessonProgress.setStatus(LessonProgressStatus.COMPLETED);
        lessonProgress.setCompletedAt(Instant.now());
        progress.put(lessonId, lessonProgress);
        
        registerEvent(new LessonCompletedEvent(getId(), lessonId, studentId));
    }
    
    public void updateProgress(UUID lessonId, int watchSeconds) {
        LessonProgress lessonProgress = progress.getOrDefault(lessonId, new LessonProgress());
        lessonProgress.setWatchSeconds(watchSeconds);
        lessonProgress.setLastActivity(Instant.now());
        progress.put(lessonId, lessonProgress);
    }
    
    public void recalculateCompletion(int totalLessons) {
        if (totalLessons == 0) {
            this.completionPercent = 0;
            return;
        }
        
        long completedCount = progress.values().stream()
            .filter(p -> p.getStatus() == LessonProgressStatus.COMPLETED)
            .count();
        
        this.completionPercent = (int) ((completedCount * 100) / totalLessons);
        
        if (this.completionPercent >= 100) {
            this.status = EnrollmentStatus.COMPLETED;
            this.completedAt = Instant.now();
            registerEvent(new CourseCompletedEvent(getId(), classId, studentId));
        }
    }
    
    public void drop() {
        this.status = EnrollmentStatus.DROPPED;
        registerEvent(new StudentDroppedEvent(getId(), classId, studentId));
    }
    
    // Getters
    public UUID getClassId() { return classId; }
    public UUID getStudentId() { return studentId; }
    public EnrollmentStatus getStatus() { return status; }
    public Map<UUID, LessonProgress> getProgress() { return Collections.unmodifiableMap(progress); }
    public Integer getCompletionPercent() { return completionPercent; }
    public Instant getCompletedAt() { return completedAt; }
    public Instant getEnrolledAt() { return enrolledAt; }
    
    public enum EnrollmentStatus {
        ACTIVE, COMPLETED, DROPPED, EXPIRED
    }
    
    @Embeddable
    public static class LessonProgress {
        @Enumerated(EnumType.STRING)
        private LessonProgressStatus status = LessonProgressStatus.NOT_STARTED;
        private Integer watchSeconds = 0;
        private Double grade;
        private Instant lastActivity;
        private Instant completedAt;
        
        // Getters and setters
        public LessonProgressStatus getStatus() { return status; }
        public void setStatus(LessonProgressStatus status) { this.status = status; }
        public Integer getWatchSeconds() { return watchSeconds; }
        public void setWatchSeconds(Integer watchSeconds) { this.watchSeconds = watchSeconds; }
        public Double getGrade() { return grade; }
        public void setGrade(Double grade) { this.grade = grade; }
        public Instant getLastActivity() { return lastActivity; }
        public void setLastActivity(Instant lastActivity) { this.lastActivity = lastActivity; }
        public Instant getCompletedAt() { return completedAt; }
        public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }
    }
    
    public enum LessonProgressStatus {
        NOT_STARTED, IN_PROGRESS, COMPLETED
    }
}
```

---

## 🔄 Migration Strategy

### Step 1: Create Shared Kernel (Non-breaking)
- Add new packages without modifying existing code
- Create base classes and value objects

### Step 2: Parallel Implementation
- Create new module structure alongside existing code
- Implement new use cases that delegate to existing services

### Step 3: Gradual Migration
- Move one controller at a time to new structure
- Update tests to use new APIs
- Deprecate old endpoints

### Step 4: Cleanup
- Remove deprecated code
- Consolidate database tables if needed
- Update documentation

---

## 📋 Database Considerations

### Current Tables to Keep
- `users` - Identity module
- `courses` - Course authoring (consolidate with course_authoring)
- `chapters`, `lessons`, `sections` - Course authoring
- `learning_classes` - Learning delivery
- `enrollments` - Learning delivery
- `quizzes`, `questions`, `quiz_attempts` - Assessment
- `assignments`, `submissions` - Assessment
- `chat_sessions`, `chat_messages` - AI Assistant

### Tables to Consolidate
- `course_authoring` → merge into `courses`
- `course_enrollments` → migrate to `enrollments`

### New Tables
- `domain_events` - Event sourcing (optional)
- `outbox` - Transactional outbox pattern (optional)
