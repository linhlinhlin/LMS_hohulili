package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.domain.model.CourseReview;
import com.example.lms.course_authoring.domain.repository.CourseReviewRepository;
import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.shared.exception.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class CourseReviewUseCase {

    private final CourseReviewRepository reviewRepository;

    public CourseReviewUseCase(CourseReviewRepository reviewRepository) {
        this.reviewRepository = reviewRepository;
    }

    /**
     * Submit or update a review (upsert — one review per student per course).
     */
    public CourseReview submitReview(UUID studentId, UUID courseId, int rating, String comment) {
        Optional<CourseReview> existing = reviewRepository.findByCourseIdAndStudentId(courseId, studentId);

        if (existing.isPresent()) {
            CourseReview review = existing.get();
            review.update(rating, comment);
            return reviewRepository.save(review);
        }

        CourseReview review = CourseReview.create(courseId, studentId, rating, comment);
        return reviewRepository.save(review);
    }

    /**
     * Get all reviews for a course.
     */
    @Transactional(readOnly = true)
    public List<CourseReview> getReviewsByCourse(UUID courseId) {
        return reviewRepository.findByCourseId(courseId);
    }

    /**
     * Get review summary (average rating + count).
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getReviewSummary(UUID courseId) {
        Double avg = reviewRepository.getAverageRating(courseId);
        long count = reviewRepository.countByCourseId(courseId);
        return Map.of(
                "averageRating", avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0,
                "totalReviews", count
        );
    }

    /**
     * Get the current user's review for a course.
     */
    @Transactional(readOnly = true)
    public Optional<CourseReview> getMyReview(UUID studentId, UUID courseId) {
        return reviewRepository.findByCourseIdAndStudentId(courseId, studentId);
    }

    /**
     * Delete own review.
     */
    public void deleteReview(UUID studentId, UUID reviewId) {
        CourseReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new EntityNotFoundException("Review", reviewId));

        if (!review.getStudentId().equals(studentId)) {
            throw new BusinessRuleException("FORBIDDEN", "Bạn chỉ có thể xóa đánh giá của chính mình");
        }

        reviewRepository.deleteById(reviewId);
    }
}
