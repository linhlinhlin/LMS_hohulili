package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.application.dto.CourseResponse;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.shared.domain.valueobject.CourseCode;
import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.exception.UnauthorizedException;
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
@DisplayName("SubmitCourseForApprovalUseCase Tests")
class SubmitCourseForApprovalUseCaseTest {

    @Mock
    private CourseRepository courseRepository;

    @InjectMocks
    private SubmitCourseForApprovalUseCase useCase;

    private UUID courseId;
    private UUID teacherId;
    private Course course;

    @BeforeEach
    void setUp() {
        courseId = UUID.randomUUID();
        teacherId = UUID.randomUUID();
        
        // Create a course with at least one chapter (required for submission)
        course = Course.create(
            CourseCode.of("COURSE001"),
            "Test Course",
            "Description",
            teacherId
        );
        // Add a chapter so it can be submitted
        course.addChapter("Chapter 1", "First chapter");
        
        // Use reflection to set ID since it's generated
        try {
            var idField = course.getClass().getSuperclass().getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(course, courseId);
        } catch (Exception e) {
            // Ignore for test
        }
    }

    @Test
    @DisplayName("Should submit course for approval successfully")
    void shouldSubmitCourseForApprovalSuccessfully() {
        // Given
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
        when(courseRepository.save(any(Course.class))).thenAnswer(i -> i.getArgument(0));

        // When
        CourseResponse response = useCase.execute(courseId, teacherId);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.status()).isEqualTo("PENDING");
        assertThat(response.editable()).isFalse();

        verify(courseRepository).save(any(Course.class));
    }

    @Test
    @DisplayName("Should throw exception when course not found")
    void shouldThrowExceptionWhenCourseNotFound() {
        // Given
        when(courseRepository.findById(courseId)).thenReturn(Optional.empty());

        // When/Then
        assertThatThrownBy(() -> useCase.execute(courseId, teacherId))
            .isInstanceOf(EntityNotFoundException.class);

        verify(courseRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should throw exception when user is not the owner")
    void shouldThrowExceptionWhenNotOwner() {
        // Given
        UUID otherUserId = UUID.randomUUID();
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));

        // When/Then
        assertThatThrownBy(() -> useCase.execute(courseId, otherUserId))
            .isInstanceOf(UnauthorizedException.class);

        verify(courseRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should throw exception when course has no chapters")
    void shouldThrowExceptionWhenNoChapters() {
        // Given
        Course emptyCoursе = Course.create(
            CourseCode.of("EMPTY001"),
            "Empty Course",
            "No chapters",
            teacherId
        );
        
        try {
            var idField = emptyCoursе.getClass().getSuperclass().getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(emptyCoursе, courseId);
        } catch (Exception e) {
            // Ignore
        }
        
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(emptyCoursе));

        // When/Then
        assertThatThrownBy(() -> useCase.execute(courseId, teacherId))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("ít nhất 1 chương");

        verify(courseRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should throw exception when course is already pending")
    void shouldThrowExceptionWhenAlreadyPending() {
        // Given - submit once to make it pending
        course.submitForApproval();
        
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));

        // When/Then
        assertThatThrownBy(() -> useCase.execute(courseId, teacherId))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("Bản nháp hoặc Bị từ chối");

        verify(courseRepository, never()).save(any());
    }
}
