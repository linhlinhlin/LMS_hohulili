package com.example.lms.course_authoring.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "course_review_events")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseReviewEventJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @Column(name = "reviewer_id")
    private UUID reviewerId;

    @Column(name = "action", nullable = false, length = 30)
    private String action;

    @Column(name = "comment", columnDefinition = "TEXT")
    private String comment;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
