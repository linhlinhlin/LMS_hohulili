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
    
    // Manual getters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getCourseId() { return courseId; }
    public void setCourseId(UUID courseId) { this.courseId = courseId; }
    public Integer getVersionNumber() { return versionNumber; }
    public void setVersionNumber(Integer versionNumber) { this.versionNumber = versionNumber; }
    public List<ChapterSnapshot> getSnapshotContent() { return snapshotContent; }
    public void setSnapshotContent(List<ChapterSnapshot> snapshotContent) { this.snapshotContent = snapshotContent; }
    public Instant getPublishedAt() { return publishedAt; }
    public void setPublishedAt(Instant publishedAt) { this.publishedAt = publishedAt; }

    public static CourseVersionBuilder builder() { return new CourseVersionBuilder(); }
    public static class CourseVersionBuilder {
        private CourseVersion v = new CourseVersion();
        public CourseVersionBuilder id(UUID id) { v.setId(id); return this; }
        public CourseVersionBuilder courseId(UUID id) { v.setCourseId(id); return this; }
        public CourseVersionBuilder versionNumber(Integer n) { v.setVersionNumber(n); return this; }
        public CourseVersionBuilder snapshotContent(List<ChapterSnapshot> c) { v.setSnapshotContent(c); return this; }
        public CourseVersionBuilder publishedAt(Instant p) { v.setPublishedAt(p); return this; }
        public CourseVersion build() { return v; }
    }

    public static class ChapterSnapshot {
        private UUID id;
        private String title;
        private Integer orderIndex;
        private List<LessonSnapshot> lessons;
        
        // Manual G/S
        public UUID getId() { return id; }
        public void setId(UUID id) { this.id = id; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public Integer getOrderIndex() { return orderIndex; }
        public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
        public List<LessonSnapshot> getLessons() { return lessons; }
        public void setLessons(List<LessonSnapshot> lessons) { this.lessons = lessons; }

        public static ChapterSnapshotBuilder builder() { return new ChapterSnapshotBuilder(); }
        public static class ChapterSnapshotBuilder {
            private ChapterSnapshot s = new ChapterSnapshot();
            public ChapterSnapshotBuilder id(UUID id) { s.setId(id); return this; }
            public ChapterSnapshotBuilder title(String t) { s.setTitle(t); return this; }
            public ChapterSnapshotBuilder orderIndex(Integer o) { s.setOrderIndex(o); return this; }
            public ChapterSnapshotBuilder lessons(List<LessonSnapshot> l) { s.setLessons(l); return this; }
            public ChapterSnapshot build() { return s; }
        }
    }

    public static class LessonSnapshot {
        private UUID id;
        private String title;
        private String type;
        private String contentUrl;
        private String contentHtml;
        private Integer durationSeconds;
        private Integer orderIndex;
        private boolean isRequired;

        // Manual G/S
        public UUID getId() { return id; }
        public void setId(UUID id) { this.id = id; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public String getContentUrl() { return contentUrl; }
        public void setContentUrl(String contentUrl) { this.contentUrl = contentUrl; }
        public String getContentHtml() { return contentHtml; }
        public void setContentHtml(String contentHtml) { this.contentHtml = contentHtml; }
        public Integer getDurationSeconds() { return durationSeconds; }
        public void setDurationSeconds(Integer durationSeconds) { this.durationSeconds = durationSeconds; }
        public Integer getOrderIndex() { return orderIndex; }
        public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
        public boolean isRequired() { return isRequired; }
        public void setRequired(boolean isRequired) { this.isRequired = isRequired; }

        public static LessonSnapshotBuilder builder() { return new LessonSnapshotBuilder(); }
        public static class LessonSnapshotBuilder {
            private LessonSnapshot s = new LessonSnapshot();
            public LessonSnapshotBuilder id(UUID id) { s.setId(id); return this; }
            public LessonSnapshotBuilder title(String t) { s.setTitle(t); return this; }
            public LessonSnapshotBuilder type(String t) { s.setType(t); return this; }
            public LessonSnapshotBuilder contentUrl(String c) { s.setContentUrl(c); return this; }
            public LessonSnapshotBuilder contentHtml(String c) { s.setContentHtml(c); return this; }
            public LessonSnapshotBuilder durationSeconds(Integer d) { s.setDurationSeconds(d); return this; }
            public LessonSnapshotBuilder orderIndex(Integer o) { s.setOrderIndex(o); return this; }
            public LessonSnapshotBuilder isRequired(boolean r) { s.setRequired(r); return this; }
            public LessonSnapshot build() { return s; }
        }
    }
}
