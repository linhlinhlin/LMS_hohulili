package com.example.lms.course_authoring.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * JPA Entity for Section persistence.
 */
@Entity
@Table(name = "sections")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SectionJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "lesson_id", nullable = false)
    private UUID lessonId;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SectionType type;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "video_url", length = 500)
    private String videoUrl;

    @Column(name = "file_url", length = 500)
    private String fileUrl;

    @Column(name = "is_required", nullable = false)
    @Builder.Default
    private Boolean isRequired = false;

    @Column(name = "duration")
    @Builder.Default
    private Integer duration = 0;

    @Column(name = "order_index", nullable = false)
    @Builder.Default
    private Integer orderIndex = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    public enum SectionType {
        VIDEO, TEXT, QUIZ, FILE, ASSIGNMENT
    }
}
