package com.example.lms.course_authoring.domain.model;

import com.example.lms.shared.domain.valueobject.CourseCode;
import com.example.lms.shared.exception.BusinessRuleException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit tests for Course aggregate root.
 */
@DisplayName("Course Domain Model Tests")
class CourseTest {

    private CourseCode validCode;
    private UUID teacherId;

    @BeforeEach
    void setUp() {
        validCode = CourseCode.of("CS101");
        teacherId = UUID.randomUUID();
    }

    @Nested
    @DisplayName("Factory Method Tests")
    class FactoryMethodTests {

        @Test
        @DisplayName("Should create course with valid params")
        void shouldCreateCourseWithValidParams() {
            // When
            Course course = Course.create(validCode, "Maritime Safety", "A course about safety", teacherId);

            // Then
            assertThat(course).isNotNull();
            assertThat(course.getId()).isNotNull();
            assertThat(course.getTitle()).isEqualTo("Maritime Safety");
            assertThat(course.getDescription()).isEqualTo("A course about safety");
            assertThat(course.getTeacherId()).isEqualTo(teacherId);
            assertThat(course.getCode()).isEqualTo(validCode);
            assertThat(course.getStatus()).isEqualTo(Course.CourseStatus.DRAFT);
        }

        @Test
        @DisplayName("Should trim title whitespace")
        void shouldTrimTitleWhitespace() {
            // When
            Course course = Course.create(validCode, "  Maritime Safety  ", "desc", teacherId);

            // Then
            assertThat(course.getTitle()).isEqualTo("Maritime Safety");
        }

        @Test
        @DisplayName("Should throw when title is null")
        void shouldThrowWhenTitleIsNull() {
            assertThatThrownBy(() -> Course.create(validCode, null, "desc", teacherId))
                .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("Should throw when title is blank")
        void shouldThrowWhenTitleIsBlank() {
            assertThatThrownBy(() -> Course.create(validCode, "   ", "desc", teacherId))
                .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("Should throw when teacherId is null")
        void shouldThrowWhenTeacherIdIsNull() {
            assertThatThrownBy(() -> Course.create(validCode, "Title", "desc", null))
                .isInstanceOf(NullPointerException.class);
        }

        @Test
        @DisplayName("Should throw when code is null")
        void shouldThrowWhenCodeIsNull() {
            assertThatThrownBy(() -> Course.create(null, "Title", "desc", teacherId))
                .isInstanceOf(NullPointerException.class);
        }
    }

    @Nested
    @DisplayName("Status Lifecycle Tests")
    class StatusLifecycleTests {

        @Test
        @DisplayName("Should submit for approval from DRAFT with chapters")
        void shouldSubmitForApprovalFromDraft() {
            // Given
            Course course = Course.create(validCode, "Title", "desc", teacherId);
            course.addChapter("Chapter 1", "desc");

            // When
            course.submitForApproval();

            // Then
            assertThat(course.getStatus()).isEqualTo(Course.CourseStatus.PENDING);
        }

        @Test
        @DisplayName("Should throw submitForApproval when no chapters")
        void shouldThrowWhenNoChapters() {
            // Given
            Course course = Course.create(validCode, "Title", "desc", teacherId);

            // When/Then
            assertThatThrownBy(course::submitForApproval)
                .isInstanceOf(BusinessRuleException.class);
        }

        @Test
        @DisplayName("Should throw submitForApproval when PENDING")
        void shouldThrowSubmitWhenPending() {
            // Given
            Course course = Course.create(validCode, "Title", "desc", teacherId);
            course.addChapter("Ch1", "d");
            course.submitForApproval();

            // When/Then
            assertThatThrownBy(course::submitForApproval)
                .isInstanceOf(BusinessRuleException.class);
        }

        @Test
        @DisplayName("Should throw submitForApproval when APPROVED")
        void shouldThrowSubmitWhenApproved() {
            // Given
            Course course = Course.create(validCode, "Title", "desc", teacherId);
            course.addChapter("Ch1", "d");
            course.submitForApproval();
            course.approve(UUID.randomUUID(), "Good");

            // When/Then
            assertThatThrownBy(course::submitForApproval)
                .isInstanceOf(BusinessRuleException.class);
        }

        @Test
        @DisplayName("Should resubmit from REJECTED")
        void shouldResubmitFromRejected() {
            // Given
            Course course = Course.create(validCode, "Title", "desc", teacherId);
            course.addChapter("Ch1", "d");
            course.submitForApproval();
            course.reject(UUID.randomUUID(), "Needs improvement");

            // When
            course.submitForApproval();

            // Then
            assertThat(course.getStatus()).isEqualTo(Course.CourseStatus.PENDING);
        }
    }

    @Nested
    @DisplayName("Approve/Reject Tests")
    class ApproveRejectTests {

        @Test
        @DisplayName("Should approve PENDING course")
        void shouldApprovePendingCourse() {
            // Given
            Course course = createPendingCourse();
            UUID reviewerId = UUID.randomUUID();

            // When
            course.approve(reviewerId, "Excellent course");

            // Then
            assertThat(course.getStatus()).isEqualTo(Course.CourseStatus.APPROVED);
            assertThat(course.getReviewedById()).isEqualTo(reviewerId);
            assertThat(course.getReviewComment()).isEqualTo("Excellent course");
            assertThat(course.getReviewedAt()).isNotNull();
        }

        @Test
        @DisplayName("Should throw approve when not PENDING")
        void shouldThrowApproveWhenNotPending() {
            // Given
            Course course = Course.create(validCode, "Title", "desc", teacherId);

            // When/Then
            assertThatThrownBy(() -> course.approve(UUID.randomUUID(), "ok"))
                .isInstanceOf(BusinessRuleException.class);
        }

        @Test
        @DisplayName("Should reject PENDING course with reason")
        void shouldRejectPendingCourse() {
            // Given
            Course course = createPendingCourse();
            UUID reviewerId = UUID.randomUUID();

            // When
            course.reject(reviewerId, "Missing content");

            // Then
            assertThat(course.getStatus()).isEqualTo(Course.CourseStatus.REJECTED);
            assertThat(course.getReviewComment()).isEqualTo("Missing content");
        }

        @Test
        @DisplayName("Should throw reject when reason is blank")
        void shouldThrowRejectWhenReasonBlank() {
            // Given
            Course course = createPendingCourse();

            // When/Then
            assertThatThrownBy(() -> course.reject(UUID.randomUUID(), "  "))
                .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("Should throw reject when not PENDING")
        void shouldThrowRejectWhenNotPending() {
            // Given
            Course course = Course.create(validCode, "Title", "desc", teacherId);

            // When/Then
            assertThatThrownBy(() -> course.reject(UUID.randomUUID(), "reason"))
                .isInstanceOf(BusinessRuleException.class);
        }
    }

    @Nested
    @DisplayName("Editability Tests")
    class EditabilityTests {

        @Test
        @DisplayName("Should be editable in DRAFT")
        void shouldBeEditableInDraft() {
            Course course = Course.create(validCode, "Title", "desc", teacherId);
            assertThat(course.isEditable()).isTrue();
        }

        @Test
        @DisplayName("Should be editable in REJECTED")
        void shouldBeEditableInRejected() {
            Course course = createPendingCourse();
            course.reject(UUID.randomUUID(), "reason");
            assertThat(course.isEditable()).isTrue();
        }

        @Test
        @DisplayName("Should not be editable in PENDING")
        void shouldNotBeEditableInPending() {
            Course course = createPendingCourse();
            assertThat(course.isEditable()).isFalse();
        }

        @Test
        @DisplayName("Should not be editable in APPROVED")
        void shouldNotBeEditableInApproved() {
            Course course = createPendingCourse();
            course.approve(UUID.randomUUID(), "ok");
            assertThat(course.isEditable()).isFalse();
        }

        @Test
        @DisplayName("ensureEditable should throw when PENDING")
        void ensureEditableShouldThrowWhenPending() {
            // Given
            Course course = createPendingCourse();

            // When/Then - updateInfo calls ensureEditable
            assertThatThrownBy(() -> course.updateInfo("New Title", "desc"))
                .isInstanceOf(BusinessRuleException.class);
        }
    }

    @Nested
    @DisplayName("Chapter Management Tests")
    class ChapterManagementTests {

        @Test
        @DisplayName("Should add chapter")
        void shouldAddChapter() {
            // Given
            Course course = Course.create(validCode, "Title", "desc", teacherId);

            // When
            Chapter chapter = course.addChapter("Chapter 1", "First chapter");

            // Then
            assertThat(course.getChapterCount()).isEqualTo(1);
            assertThat(chapter.getTitle()).isEqualTo("Chapter 1");
        }

        @Test
        @DisplayName("Should remove chapter")
        void shouldRemoveChapter() {
            // Given
            Course course = Course.create(validCode, "Title", "desc", teacherId);
            Chapter chapter = course.addChapter("Chapter 1", "First chapter");

            // When
            course.removeChapter(chapter.getId());

            // Then
            assertThat(course.getChapterCount()).isEqualTo(0);
        }
    }

    @Nested
    @DisplayName("Pricing Tests")
    class PricingTests {

        @Test
        @DisplayName("Should set PAID pricing with valid price")
        void shouldSetPaidPricingWithValidPrice() {
            // Given
            Course course = Course.create(validCode, "Title", "desc", teacherId);

            // When
            course.updatePricing(Course.PriceType.PAID, new BigDecimal("99.99"), null);

            // Then
            assertThat(course.getPriceType()).isEqualTo(Course.PriceType.PAID);
            assertThat(course.getPrice()).isEqualByComparingTo(new BigDecimal("99.99"));
        }

        @Test
        @DisplayName("Should throw when PAID with zero price")
        void shouldThrowWhenPaidWithZeroPrice() {
            Course course = Course.create(validCode, "Title", "desc", teacherId);

            assertThatThrownBy(() ->
                course.updatePricing(Course.PriceType.PAID, BigDecimal.ZERO, null))
                .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("Should clear price for FREE type")
        void shouldClearPriceForFreeType() {
            // Given
            Course course = Course.create(validCode, "Title", "desc", teacherId);
            course.updatePricing(Course.PriceType.PAID, new BigDecimal("50"), null);

            // When
            course.updatePricing(Course.PriceType.FREE, null, null);

            // Then
            assertThat(course.getPriceType()).isEqualTo(Course.PriceType.FREE);
            assertThat(course.getPrice()).isNull();
        }
    }

    // ==================== Helper Methods ====================

    private Course createPendingCourse() {
        Course course = Course.create(validCode, "Title", "desc", teacherId);
        course.addChapter("Chapter 1", "description");
        course.submitForApproval();
        return course;
    }
}
