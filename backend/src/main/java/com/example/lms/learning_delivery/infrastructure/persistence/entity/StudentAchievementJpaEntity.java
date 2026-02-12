package com.example.lms.learning_delivery.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "student_achievements",
       uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "achievement_id"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class StudentAchievementJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "student_id", nullable = false)
    private UUID studentId;

    @Column(name = "achievement_id", nullable = false)
    private UUID achievementId;

    @CreationTimestamp
    @Column(name = "earned_at", nullable = false, updatable = false)
    private Instant earnedAt;
}
