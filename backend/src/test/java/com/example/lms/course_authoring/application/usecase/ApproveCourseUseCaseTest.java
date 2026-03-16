package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.application.dto.CourseResponse;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.course_authoring.infrastructure.service.CoursePublicationService;
import com.example.lms.shared.domain.valueobject.CourseCode;
import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.domain.event.DomainEventPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ApproveCourseUseCase Tests")
class ApproveCourseUseCaseTest {

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private DomainEventPublisher eventPublisher;

    @Mock
    private CoursePublicationService coursePublicationService;

    @InjectMocks
    private ApproveCourseUseCase useCase;

    private UUID courseId;
    private UUID teacherId;
    private UUID reviewerId;
    private Course pendingCourse;

    @BeforeEach
    void setUp() {
        courseId = UUID.randomUUID();
        teacherId = UUID.randomUUID();
        reviewerId = UUID.randomUUID();
        
        // Create a course and submit it for approval
        pendingCourse = Course.create(
            CourseCode.of("COURSE001"),
            "Test Course",
            "Description",
            teacherId
        );
        pendingCourse.addChapter("Chapter 1", "First chapter");
        pendingCourse.submitForApproval();
        
        // Set ID via reflection
        try {
            var idField = pendingCourse.getClass().getSuperclass().getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(pendingCourse, courseId);
        } catch (Exception e) {
            // Ignore
        }
    }

    @Test
    @DisplayName("Should approve course successfully")
    void shouldApproveCourseSuccessfully() {
        // Given
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(pendingCourse));
        when(courseRepository.save(any(Course.class))).thenAnswer(i -> i.getArgument(0));

        // When
        CourseResponse response = useCase.execute(courseId, reviewerId, "Approved!");

        // Then
        assertThat(response).isNotNull();
        assertThat(response.status()).isEqualTo("APPROVED");
        assertThat(response.published()).isTrue();
        assertThat(response.reviewedById()).isEqualTo(reviewerId);
        assertThat(response.reviewComment()).isEqualTo("Approved!");
        assertThat(response.reviewedAt()).isNotNull();

        verify(courseRepository).save(any(Course.class));
        verify(coursePublicationService).publish(pendingCourse.getId(), reviewerId);
    }

    @Test
    @DisplayName("Should approve course without comment")
    void shouldApproveCourseWithoutComment() {
        // Given
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(pendingCourse));
        when(courseRepository.save(any(Course.class))).thenAnswer(i -> i.getArgument(0));

        // When
        CourseResponse response = useCase.execute(courseId, reviewerId, null);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.status()).isEqualTo("APPROVED");
        assertThat(response.reviewComment()).isNull();

        verify(courseRepository).save(any(Course.class));
        verify(coursePublicationService).publish(pendingCourse.getId(), reviewerId);
    }

    @Test
    @DisplayName("Should throw exception when course not found")
    void shouldThrowExceptionWhenCourseNotFound() {
        // Given
        when(courseRepository.findById(courseId)).thenReturn(Optional.empty());

        // When/Then
        assertThatThrownBy(() -> useCase.execute(courseId, reviewerId, "Comment"))
            .isInstanceOf(EntityNotFoundException.class);

        verify(courseRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should throw exception when course is not pending")
    void shouldThrowExceptionWhenCourseNotPending() {
        // Given - create a draft course (not pending)
        Course draftCourse = Course.create(
            CourseCode.of("DRAFT001"),
            "Draft Course",
            "Description",
            teacherId
        );
        
        try {
            var idField = draftCourse.getClass().getSuperclass().getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(draftCourse, courseId);
        } catch (Exception e) {
            // Ignore
        }
        
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(draftCourse));

        // When/Then
        assertThatThrownBy(() -> useCase.execute(courseId, reviewerId, "Comment"))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("đang chờ duyệt");

        verify(courseRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should throw exception when course is already approved")
    void shouldThrowExceptionWhenAlreadyApproved() {
        // Given - approve the course first
        pendingCourse.approve(reviewerId, "First approval");
        
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(pendingCourse));

        // When/Then
        assertThatThrownBy(() -> useCase.execute(courseId, reviewerId, "Second approval"))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("đang chờ duyệt");

        verify(courseRepository, never()).save(any());
    }
}
