package com.example.lms.course_management.domain.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity(name = "LessonAuthoring")
@Table(name = "lesson_authoring")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Lesson {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chapter_id", nullable = false)
    private Chapter chapter;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LessonType type;

    // Content fields (nullable depending on type)
    @Column(name = "content_url", columnDefinition = "TEXT")
    private String contentUrl; // Video URL or file URL

    @Column(name = "content_html", columnDefinition = "TEXT")
    private String contentHtml; // HTML content from rich text editor (Quill)

    // Getters and setters for contentHtml
    public String getContentHtml() {
        return contentHtml;
    }

    public void setContentHtml(String contentHtml) {
        this.contentHtml = contentHtml;
    }

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    // Settings
    @Column(name = "order_index")
    private Integer orderIndex;

    @Column(name = "is_required")
    @Builder.Default
    private boolean isRequired = true;

    @Column(name = "min_watch_percent")
    private Integer minWatchPercent;

    @Column(name = "min_quiz_score")
    private Integer minQuizScore;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    public enum LessonType {
        VIDEO, QUIZ, ASSIGNMENT, TEXT
    }
}
