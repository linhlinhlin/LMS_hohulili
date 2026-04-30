package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.application.dto.CourseResponse;
import com.example.lms.course_authoring.application.dto.UpdateCourseCommand;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.learning_delivery.domain.repository.EnrollmentRepositoryPort;
import com.example.lms.shared.application.port.FileManagementPort;
import com.example.lms.shared.domain.valueobject.CourseCode;
import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.exception.UnauthorizedException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Tests for UpdateCourseUseCase.
 *
 * Verifies:
 * - Successful update returns correct CourseResponse
 * - EntityNotFoundException when course does not exist
 * - UnauthorizedException when caller is not the owner (and not admin)
 * - BusinessRuleException when course is not in an editable state
 * - CourseResponse fields match updated values
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("UpdateCourseUseCase Tests")
class UpdateCourseUseCaseTest {

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private EnrollmentRepositoryPort enrollmentRepository;

    @Mock
    private CourseDraftMutationUseCase courseDraftMutationUseCase;

    @Mock
    private FileManagementPort fileManagementPort;

    @InjectMocks
    private UpdateCourseUseCase useCase;

    private UUID courseId;
    private UUID teacherId;
    private Course draftCourse;

    @BeforeEach
    void setUp() {
        courseId = UUID.randomUUID();
        teacherId = UUID.randomUUID();

        draftCourse = Course.create(
                CourseCode.of("UPD-001"),
                "Khóa học ban đầu",
                "Mô tả ban đầu",
                teacherId
        );

        // Set course ID via reflection (BaseEntity generates random UUID)
        setId(draftCourse, courseId);
    }

    @Nested
    @DisplayName("Cập nhật thành công")
    class SuccessfulUpdate {

        @Test
        @DisplayName("Should update course and return correct CourseResponse")
        void shouldUpdateCourseSuccessfully() {
            // Given
            UpdateCourseCommand command = new UpdateCourseCommand(
                    courseId, teacherId,
                    "Tên mới", "Mô tả mới",
                    "https://img.example.com/thumb.jpg",
                    null, null, null, null, null, null, null, null,
                    "PUBLIC", "FREE", null, null, "SELF_PACED", null, false
            );

            when(courseRepository.findById(courseId)).thenReturn(Optional.of(draftCourse));
            when(courseRepository.save(any(Course.class))).thenAnswer(i -> i.getArgument(0));

            // When
            CourseResponse response = useCase.execute(command);

            // Then
            assertThat(response).isNotNull();
            assertThat(response.title()).isEqualTo("Tên mới");
            assertThat(response.description()).isEqualTo("Mô tả mới");
            assertThat(response.thumbnailUrl()).isEqualTo("https://img.example.com/thumb.jpg");
            assertThat(response.status()).isEqualTo("DRAFT");
            assertThat(response.editable()).isTrue();

            verify(courseRepository).save(any(Course.class));
        }

        @Test
        @DisplayName("Should return correct CourseResponse with all fields populated")
        void shouldReturnCorrectResponseWithAllFields() {
            // Given
            UUID categoryId = UUID.randomUUID();
            UpdateCourseCommand command = new UpdateCourseCommand(
                    courseId, teacherId,
                    "Khóa Java nâng cao", "Học Java chuyên sâu",
                    "https://img.example.com/java.jpg",
                    categoryId,
                    Set.of("java", "lập trình"),
                    "Chào mừng!", "Thông tin khóa học", "Lợi ích",
                    "https://video.example.com/intro.mp4",
                    null,
                    3,
                    "PUBLIC", "PAID",
                    new BigDecimal("199000"), new BigDecimal("149000"),
                    "SELF_PACED", null, false
            );

            when(courseRepository.findById(courseId)).thenReturn(Optional.of(draftCourse));
            when(courseRepository.save(any(Course.class))).thenAnswer(i -> i.getArgument(0));

            // When
            CourseResponse response = useCase.execute(command);

            // Then
            assertThat(response.id()).isEqualTo(courseId);
            assertThat(response.title()).isEqualTo("Khóa Java nâng cao");
            assertThat(response.description()).isEqualTo("Học Java chuyên sâu");
            assertThat(response.categoryId()).isEqualTo(categoryId);
            assertThat(response.tags()).containsExactlyInAnyOrder("java", "lập trình");
            assertThat(response.welcomeMessage()).isEqualTo("Chào mừng!");
            assertThat(response.credits()).isEqualTo(3);
            assertThat(response.visibility()).isEqualTo("PUBLIC");
            assertThat(response.priceType()).isEqualTo("PAID");
            assertThat(response.price()).isEqualByComparingTo(new BigDecimal("199000"));
            assertThat(response.salePrice()).isEqualByComparingTo(new BigDecimal("149000"));
            assertThat(response.deliveryMode()).isEqualTo("SELF_PACED");
            assertThat(response.teacherId()).isEqualTo(teacherId);
        }
    }

    @Nested
    @DisplayName("Khóa học không tồn tại")
    class CourseNotFound {

        @Test
        @DisplayName("Should throw EntityNotFoundException when course does not exist")
        void shouldThrowEntityNotFoundWhenCourseNotFound() {
            // Given
            UUID nonExistentId = UUID.randomUUID();
            UpdateCourseCommand command = new UpdateCourseCommand(
                    nonExistentId, teacherId,
                    "Tên mới", "Mô tả mới",
                    null, null, null, null, null, null, null, null, null,
                    null, null, null, null, null, null, false
            );

            when(courseRepository.findById(nonExistentId)).thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> useCase.execute(command))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("Không tìm thấy")
                    .hasMessageContaining("Khóa học");

            verify(courseRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("Không có quyền chỉnh sửa")
    class UnauthorizedUpdate {

        @Test
        @DisplayName("Should throw UnauthorizedException when caller is not owner and not admin")
        void shouldThrowUnauthorizedWhenNotOwnerAndNotAdmin() {
            // Given
            UUID otherUserId = UUID.randomUUID();
            UpdateCourseCommand command = new UpdateCourseCommand(
                    courseId, otherUserId,
                    "Tên mới", "Mô tả mới",
                    null, null, null, null, null, null, null, null, null,
                    null, null, null, null, null, null, false
            );

            when(courseRepository.findById(courseId)).thenReturn(Optional.of(draftCourse));

            // When/Then
            assertThatThrownBy(() -> useCase.execute(command))
                    .isInstanceOf(UnauthorizedException.class)
                    .hasMessageContaining("Bạn không có quyền")
                    .hasMessageContaining("chỉnh sửa");

            verify(courseRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("Khóa học không ở trạng thái chỉnh sửa được")
    class CourseNotEditable {

        @Test
        @DisplayName("Should throw BusinessRuleException when course is PENDING (not editable)")
        void shouldThrowBusinessRuleWhenCourseIsPending() {
            // Given - make course PENDING by adding chapter then submitting
            draftCourse.addChapter("Chương 1", "Nội dung chương 1");
            draftCourse.submitForApproval();

            UpdateCourseCommand command = new UpdateCourseCommand(
                    courseId, teacherId,
                    "Tên mới", "Mô tả mới",
                    null, null, null, null, null, null, null, null, null,
                    null, null, null, null, null, null, false
            );

            when(courseRepository.findById(courseId)).thenReturn(Optional.of(draftCourse));

            // When/Then
            assertThatThrownBy(() -> useCase.execute(command))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("Không thể chỉnh sửa khóa học");

            verify(courseRepository, never()).save(any());
        }
    }

    // ==================== Helper Methods ====================

    private void setId(Course course, UUID id) {
        try {
            // BaseEntity is the grandparent: Course extends AggregateRoot extends BaseEntity
            var idField = course.getClass().getSuperclass().getSuperclass().getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(course, id);
        } catch (Exception e) {
            // Ignore for test setup
        }
    }
}
