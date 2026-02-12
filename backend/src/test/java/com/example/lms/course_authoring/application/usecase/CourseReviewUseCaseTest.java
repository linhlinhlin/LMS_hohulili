package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.domain.model.CourseReview;
import com.example.lms.course_authoring.domain.repository.CourseReviewRepository;
import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.shared.exception.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CourseReviewUseCaseTest {

    @Mock private CourseReviewRepository reviewRepository;
    private CourseReviewUseCase useCase;

    @BeforeEach
    void setUp() {
        useCase = new CourseReviewUseCase(reviewRepository);
    }

    // --- submitReview ---

    @Test
    @DisplayName("submitReview - creates new review when no existing review found")
    void submitReview_newReview_savesAndReturns() {
        UUID studentId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();

        when(reviewRepository.findByCourseIdAndStudentId(courseId, studentId))
                .thenReturn(Optional.empty());
        when(reviewRepository.save(any(CourseReview.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CourseReview result = useCase.submitReview(studentId, courseId, 5, "Excellent course!");

        assertThat(result).isNotNull();
        assertThat(result.getCourseId()).isEqualTo(courseId);
        assertThat(result.getStudentId()).isEqualTo(studentId);
        assertThat(result.getRating()).isEqualTo(5);
        assertThat(result.getComment()).isEqualTo("Excellent course!");
        verify(reviewRepository).save(any(CourseReview.class));
    }

    @Test
    @DisplayName("submitReview - updates existing review when one already exists")
    void submitReview_existingReview_updatesAndReturns() {
        UUID studentId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        CourseReview existing = CourseReview.reconstitute(
                UUID.randomUUID(), courseId, studentId, 3, "Good",
                Instant.now().minusSeconds(3600), Instant.now().minusSeconds(3600));

        when(reviewRepository.findByCourseIdAndStudentId(courseId, studentId))
                .thenReturn(Optional.of(existing));
        when(reviewRepository.save(any(CourseReview.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CourseReview result = useCase.submitReview(studentId, courseId, 5, "Updated: Amazing!");

        assertThat(result.getRating()).isEqualTo(5);
        assertThat(result.getComment()).isEqualTo("Updated: Amazing!");
        assertThat(result.getId()).isEqualTo(existing.getId());
        verify(reviewRepository).save(existing);
    }

    // --- getReviewsByCourse ---

    @Test
    @DisplayName("getReviewsByCourse - returns list of reviews from repository")
    void getReviewsByCourse_returnsList() {
        UUID courseId = UUID.randomUUID();
        CourseReview review1 = CourseReview.create(courseId, UUID.randomUUID(), 5, "Great");
        CourseReview review2 = CourseReview.create(courseId, UUID.randomUUID(), 4, "Good");

        when(reviewRepository.findByCourseId(courseId)).thenReturn(List.of(review1, review2));

        List<CourseReview> results = useCase.getReviewsByCourse(courseId);

        assertThat(results).hasSize(2);
        assertThat(results).containsExactly(review1, review2);
        verify(reviewRepository).findByCourseId(courseId);
    }

    // --- getReviewSummary ---

    @Test
    @DisplayName("getReviewSummary - returns average rating and total count")
    void getReviewSummary_returnsAvgAndCount() {
        UUID courseId = UUID.randomUUID();

        when(reviewRepository.getAverageRating(courseId)).thenReturn(4.3);
        when(reviewRepository.countByCourseId(courseId)).thenReturn(15L);

        Map<String, Object> summary = useCase.getReviewSummary(courseId);

        assertThat(summary.get("averageRating")).isEqualTo(4.3);
        assertThat(summary.get("totalReviews")).isEqualTo(15L);
    }

    @Test
    @DisplayName("getReviewSummary - returns 0.0 when average is null (no reviews)")
    void getReviewSummary_nullAverage_returnsZero() {
        UUID courseId = UUID.randomUUID();

        when(reviewRepository.getAverageRating(courseId)).thenReturn(null);
        when(reviewRepository.countByCourseId(courseId)).thenReturn(0L);

        Map<String, Object> summary = useCase.getReviewSummary(courseId);

        assertThat(summary.get("averageRating")).isEqualTo(0.0);
        assertThat(summary.get("totalReviews")).isEqualTo(0L);
    }

    // --- getMyReview ---

    @Test
    @DisplayName("getMyReview - delegates to findByCourseIdAndStudentId")
    void getMyReview_delegatesToRepository() {
        UUID studentId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        CourseReview review = CourseReview.reconstitute(
                UUID.randomUUID(), courseId, studentId, 4, "Nice",
                Instant.now(), Instant.now());

        when(reviewRepository.findByCourseIdAndStudentId(courseId, studentId))
                .thenReturn(Optional.of(review));

        Optional<CourseReview> result = useCase.getMyReview(studentId, courseId);

        assertThat(result).isPresent();
        assertThat(result.get().getStudentId()).isEqualTo(studentId);
        assertThat(result.get().getCourseId()).isEqualTo(courseId);
        verify(reviewRepository).findByCourseIdAndStudentId(courseId, studentId);
    }

    // --- deleteReview ---

    @Test
    @DisplayName("deleteReview - deletes when student is the owner")
    void deleteReview_ownerDeletes_success() {
        UUID studentId = UUID.randomUUID();
        UUID reviewId = UUID.randomUUID();
        CourseReview review = CourseReview.reconstitute(
                reviewId, UUID.randomUUID(), studentId, 3, "OK",
                Instant.now(), Instant.now());

        when(reviewRepository.findById(reviewId)).thenReturn(Optional.of(review));

        useCase.deleteReview(studentId, reviewId);

        verify(reviewRepository).deleteById(reviewId);
    }

    @Test
    @DisplayName("deleteReview - throws BusinessRuleException when student is not the owner")
    void deleteReview_notOwner_throwsBusinessRuleException() {
        UUID studentId = UUID.randomUUID();
        UUID otherStudentId = UUID.randomUUID();
        UUID reviewId = UUID.randomUUID();
        CourseReview review = CourseReview.reconstitute(
                reviewId, UUID.randomUUID(), otherStudentId, 3, "OK",
                Instant.now(), Instant.now());

        when(reviewRepository.findById(reviewId)).thenReturn(Optional.of(review));

        assertThatThrownBy(() -> useCase.deleteReview(studentId, reviewId))
                .isInstanceOf(BusinessRuleException.class);

        verify(reviewRepository, never()).deleteById(any());
    }

    @Test
    @DisplayName("deleteReview - throws EntityNotFoundException when review does not exist")
    void deleteReview_reviewNotFound_throwsEntityNotFoundException() {
        UUID studentId = UUID.randomUUID();
        UUID reviewId = UUID.randomUUID();

        when(reviewRepository.findById(reviewId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> useCase.deleteReview(studentId, reviewId))
                .isInstanceOf(EntityNotFoundException.class);

        verify(reviewRepository, never()).deleteById(any());
    }
}
