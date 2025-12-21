package com.example.lms.course_authoring.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * JPA Entity for LessonAssignment (mapping between Lesson and Assignment).
 */
@Entity
@Table(name = "lesson_assignments")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LessonAssignmentJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "lesson_id", nullable = false)
    private UUID lessonId;

    @Column(name = "assignment_id", nullable = false)
    private UUID assignmentId;

    @Column(name = "order_index")
    @Builder.Default
    private Integer orderIndex = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
