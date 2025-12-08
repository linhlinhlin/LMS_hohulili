package com.example.lms.course_management.domain.model;

import io.hypersistence.utils.hibernate.type.json.JsonType; // Requires dependency
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "course_versions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "course_id", nullable = false)
    private UUID courseId; // Reference to the Course Aggregate Root

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Type(JsonType.class)
    @Column(name = "snapshot_content", columnDefinition = "jsonb", nullable = false)
    private List<ChapterSnapshot> snapshotContent;

    @CreationTimestamp
    @Column(name = "published_at", updatable = false)
    private Instant publishedAt;

    // Helper classes for Snapshot (POJOs)
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ChapterSnapshot {
        private UUID id;
        private String title;
        private Integer orderIndex;
        private List<LessonSnapshot> lessons;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LessonSnapshot {
        private UUID id;
        private String title;
        private String type;
        private String contentUrl;
        private String contentHtml; // HTML content from rich text editor (Quill)
        private Integer durationSeconds;
        private Integer orderIndex;
        private boolean isRequired;
    }
}
