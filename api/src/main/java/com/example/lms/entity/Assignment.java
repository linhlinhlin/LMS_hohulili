package com.example.lms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "assignments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Assignment {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;
    
    @Column(nullable = false)
    private String title;
    
    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;
    
    @Column(columnDefinition = "TEXT")
    private String instructions;
    
    @Column(name = "due_date")
    private LocalDateTime dueDate;
    
    @Column(name = "max_score", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal maxScore = BigDecimal.valueOf(100.00);
    
    @Column(name = "assignment_type")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private AssignmentType assignmentType = AssignmentType.FILE_SUBMISSION;
    
    @Column(name = "assignment_config", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> assignmentConfig; // JSON object for type-specific config
    
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private AssignmentStatus status = AssignmentStatus.DRAFT;
    
    @OneToOne(mappedBy = "assignment")
    private LessonAssignment lessonAssignment;

    @OneToMany(mappedBy = "assignment", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Submission> submissions;

    @OneToMany(mappedBy = "assignment", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AssignmentAttachment> attachments;

    @OneToMany(mappedBy = "assignment", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AssignmentRubric> rubrics;
    
    public enum AssignmentType {
        ESSAY, QUIZ, PROGRAMMING, PROJECT, FILE_SUBMISSION
    }
    
    public enum AssignmentStatus {
        DRAFT, PUBLISHED, CLOSED
    }
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}