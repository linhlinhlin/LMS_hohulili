package com.example.lms.learning_delivery.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "class_teachers",
       uniqueConstraints = @UniqueConstraint(columnNames = {"class_id", "teacher_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ClassTeacherJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "class_id", nullable = false)
    private UUID classId;

    @Column(name = "teacher_id", nullable = false)
    private UUID teacherId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private TeacherRole role = TeacherRole.CO_TEACHER;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    public enum TeacherRole {
        PRIMARY,
        CO_TEACHER
    }
}
