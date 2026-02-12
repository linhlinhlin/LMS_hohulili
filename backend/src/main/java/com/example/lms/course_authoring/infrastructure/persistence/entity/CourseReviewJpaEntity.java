package com.example.lms.course_authoring.infrastructure.persistence.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "course_reviews")
public class CourseReviewJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @Column(name = "student_id", nullable = false)
    private UUID studentId;

    @Column(nullable = false)
    private Integer rating;

    @Column(columnDefinition = "TEXT")
    private String comment;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    public CourseReviewJpaEntity() {}

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private UUID courseId;
        private UUID studentId;
        private Integer rating;
        private String comment;

        public Builder courseId(UUID courseId) { this.courseId = courseId; return this; }
        public Builder studentId(UUID studentId) { this.studentId = studentId; return this; }
        public Builder rating(Integer rating) { this.rating = rating; return this; }
        public Builder comment(String comment) { this.comment = comment; return this; }

        public CourseReviewJpaEntity build() {
            CourseReviewJpaEntity e = new CourseReviewJpaEntity();
            e.courseId = courseId; e.studentId = studentId; e.rating = rating; e.comment = comment;
            return e;
        }
    }

    public UUID getId() { return id; }
    public UUID getCourseId() { return courseId; }
    public UUID getStudentId() { return studentId; }
    public Integer getRating() { return rating; }
    public String getComment() { return comment; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setRating(Integer rating) { this.rating = rating; }
    public void setComment(String comment) { this.comment = comment; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
