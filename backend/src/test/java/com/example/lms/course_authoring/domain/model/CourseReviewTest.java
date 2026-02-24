package com.example.lms.course_authoring.domain.model;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;

class CourseReviewTest {

    private final UUID courseId = UUID.randomUUID();
    private final UUID studentId = UUID.randomUUID();

    @Test
    @DisplayName("create - valid data creates review with correct fields")
    void create_validData_createsReview() {
        Instant before = Instant.now();

        CourseReview review = CourseReview.create(courseId, studentId, 4, "Great course!");

        assertThat(review.getId()).isNotNull();
        assertThat(review.getCourseId()).isEqualTo(courseId);
        assertThat(review.getStudentId()).isEqualTo(studentId);
        assertThat(review.getRating()).isEqualTo(4);
        assertThat(review.getComment()).isEqualTo("Great course!");
        assertThat(review.getCreatedAt()).isAfterOrEqualTo(before);
        assertThat(review.getUpdatedAt()).isAfterOrEqualTo(before);
    }

    @Test
    @DisplayName("create - rating below 1 throws IllegalArgumentException")
    void create_ratingTooLow_throws() {
        assertThatThrownBy(() -> CourseReview.create(courseId, studentId, 0, "Bad"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("1 đến 5");
    }

    @Test
    @DisplayName("create - rating above 5 throws IllegalArgumentException")
    void create_ratingTooHigh_throws() {
        assertThatThrownBy(() -> CourseReview.create(courseId, studentId, 6, "Too high"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("1 đến 5");
    }

    @Test
    @DisplayName("create - null courseId throws NullPointerException")
    void create_nullCourseId_throws() {
        assertThatThrownBy(() -> CourseReview.create(null, studentId, 3, "Comment"))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("khóa học");
    }

    @Test
    @DisplayName("create - null studentId throws NullPointerException")
    void create_nullStudentId_throws() {
        assertThatThrownBy(() -> CourseReview.create(courseId, null, 3, "Comment"))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("học viên");
    }

    @Test
    @DisplayName("update - valid rating updates rating and comment")
    void update_validRating_updatesFields() {
        CourseReview review = CourseReview.create(courseId, studentId, 3, "OK");
        Instant originalUpdatedAt = review.getUpdatedAt();

        review.update(5, "Actually excellent!");

        assertThat(review.getRating()).isEqualTo(5);
        assertThat(review.getComment()).isEqualTo("Actually excellent!");
        assertThat(review.getUpdatedAt()).isAfterOrEqualTo(originalUpdatedAt);
    }

    @Test
    @DisplayName("update - invalid rating throws IllegalArgumentException")
    void update_invalidRating_throws() {
        CourseReview review = CourseReview.create(courseId, studentId, 3, "OK");

        assertThatThrownBy(() -> review.update(0, "Invalid"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("1 đến 5");
    }

    @Test
    @DisplayName("reconstitute - preserves all fields from persistence")
    void reconstitute_preservesAllFields() {
        UUID id = UUID.randomUUID();
        Instant createdAt = Instant.parse("2026-01-15T10:00:00Z");
        Instant updatedAt = Instant.parse("2026-01-20T14:30:00Z");

        CourseReview review = CourseReview.reconstitute(
                id, courseId, studentId, 5, "Excellent!", createdAt, updatedAt);

        assertThat(review.getId()).isEqualTo(id);
        assertThat(review.getCourseId()).isEqualTo(courseId);
        assertThat(review.getStudentId()).isEqualTo(studentId);
        assertThat(review.getRating()).isEqualTo(5);
        assertThat(review.getComment()).isEqualTo("Excellent!");
        assertThat(review.getCreatedAt()).isEqualTo(createdAt);
        assertThat(review.getUpdatedAt()).isEqualTo(updatedAt);
    }
}
