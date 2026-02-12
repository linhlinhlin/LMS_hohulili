package com.example.lms.course_authoring.domain.repository;

import com.example.lms.course_authoring.domain.model.CourseReview;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CourseReviewRepository {

    CourseReview save(CourseReview review);

    Optional<CourseReview> findById(UUID id);

    List<CourseReview> findByCourseId(UUID courseId);

    Optional<CourseReview> findByCourseIdAndStudentId(UUID courseId, UUID studentId);

    Double getAverageRating(UUID courseId);

    long countByCourseId(UUID courseId);

    void deleteById(UUID id);
}
