package com.example.lms.learning_delivery.domain.model;

import com.example.lms.entity.User;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "learning_classes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Class {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotBlank
    @Column(nullable = false, unique = true)
    private String code;

    @NotNull
    @Column(name = "course_version_id", nullable = false)
    private UUID courseVersionId; // Link to the specific content snapshot
    
    // Also keep reference to Course ID for easy grouping? 
    // Expert said: Class -> CourseVersion. 
    // But UI might want to show "All classes for Course X". 
    // We can get CourseId from CourseVersion, but a direct link might be useful for optimization.
    // adhering to strict plan for now.

    @NotNull
    @Column(name = "teacher_id", nullable = false)
    private UUID teacherId; // Teacher responsible for this class instance

    @Column(name = "start_date")
    private Instant startDate;

    @Column(name = "end_date")
    private Instant endDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ClassStatus status = ClassStatus.OPEN;
    
    @Column(name = "max_students")
    private Integer maxStudents;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
    
    public enum ClassStatus {
        OPEN, CLOSED, ARCHIVED
    }
}
