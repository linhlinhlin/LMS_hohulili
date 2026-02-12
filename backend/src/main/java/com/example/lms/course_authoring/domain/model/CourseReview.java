package com.example.lms.course_authoring.domain.model;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public class CourseReview {

    private UUID id;
    private UUID courseId;
    private UUID studentId;
    private int rating;
    private String comment;
    private Instant createdAt;
    private Instant updatedAt;

    protected CourseReview() {}

    public static CourseReview create(UUID courseId, UUID studentId, int rating, String comment) {
        Objects.requireNonNull(courseId, "courseId is required");
        Objects.requireNonNull(studentId, "studentId is required");
        if (rating < 1 || rating > 5) {
            throw new IllegalArgumentException("Rating must be between 1 and 5");
        }

        CourseReview review = new CourseReview();
        review.id = UUID.randomUUID();
        review.courseId = courseId;
        review.studentId = studentId;
        review.rating = rating;
        review.comment = comment;
        review.createdAt = Instant.now();
        review.updatedAt = Instant.now();
        return review;
    }

    public void update(int rating, String comment) {
        if (rating < 1 || rating > 5) {
            throw new IllegalArgumentException("Rating must be between 1 and 5");
        }
        this.rating = rating;
        this.comment = comment;
        this.updatedAt = Instant.now();
    }

    // Reconstitution from persistence
    public static CourseReview reconstitute(UUID id, UUID courseId, UUID studentId,
                                             int rating, String comment,
                                             Instant createdAt, Instant updatedAt) {
        CourseReview review = new CourseReview();
        review.id = id;
        review.courseId = courseId;
        review.studentId = studentId;
        review.rating = rating;
        review.comment = comment;
        review.createdAt = createdAt;
        review.updatedAt = updatedAt;
        return review;
    }

    public UUID getId() { return id; }
    public UUID getCourseId() { return courseId; }
    public UUID getStudentId() { return studentId; }
    public int getRating() { return rating; }
    public String getComment() { return comment; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
