package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.application.dto.CreateAssignmentCommand;
import com.example.lms.assessment.domain.model.Assignment;
import com.example.lms.assessment.domain.repository.AssignmentRepository;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CreateAssignmentUseCaseV3 Tests")
class CreateAssignmentUseCaseV3Test {

    @Mock
    private AssignmentRepository assignmentRepository;

    @Mock
    private CourseRepository courseRepository;

    @InjectMocks
    private CreateAssignmentUseCaseV3 useCase;

    @Nested
    @DisplayName("Happy Path Tests")
    class HappyPathTests {

        @Test
        @DisplayName("Should create assignment for INSTRUCTOR_LED course and return ID")
        void shouldCreateAssignmentAndReturnId() {
            UUID courseId = UUID.randomUUID();
            Course course = mock(Course.class);
            doReturn(Course.DeliveryMode.INSTRUCTOR_LED).when(course).getDeliveryMode();
            doReturn(Optional.of(course)).when(courseRepository).findById(courseId);

            ArgumentCaptor<Assignment> captor = ArgumentCaptor.forClass(Assignment.class);
            doAnswer(inv -> inv.getArgument(0)).when(assignmentRepository).save(captor.capture());

            CreateAssignmentCommand command = new CreateAssignmentCommand(
                UUID.randomUUID(), courseId, "Essay Assignment", "Write about navigation",
                "Follow the rubric", "ESSAY", 100, null, null, null, null
            );

            UUID result = useCase.execute(command);

            assertThat(result).isNotNull();
            Assignment saved = captor.getValue();
            assertThat(saved.getTitle()).isEqualTo("Essay Assignment");
            assertThat(saved.getType()).isEqualTo(Assignment.AssignmentType.ESSAY);
            assertThat(saved.getStatus()).isEqualTo(Assignment.AssignmentStatus.DRAFT);
            assertThat(saved.getCourseId()).isEqualTo(courseId);
        }

        @Test
        @DisplayName("Should delegate allocation to repository port")
        void shouldDelegateAllocationToRepositoryPort() {
            UUID courseId = UUID.randomUUID();
            Course course = mock(Course.class);
            doReturn(Course.DeliveryMode.INSTRUCTOR_LED).when(course).getDeliveryMode();
            doReturn(Optional.of(course)).when(courseRepository).findById(courseId);
            doAnswer(inv -> inv.getArgument(0)).when(assignmentRepository).save(any(Assignment.class));

            List<UUID> studentIds = List.of(UUID.randomUUID(), UUID.randomUUID());
            CreateAssignmentCommand command = new CreateAssignmentCommand(
                UUID.randomUUID(), courseId, "Task", "desc", "instr",
                "FILE_UPLOAD", 50, null, null, "SPECIFIC_STUDENTS", studentIds
            );

            UUID result = useCase.execute(command);

            assertThat(result).isNotNull();
            verify(assignmentRepository).allocate(any(UUID.class), eq("SPECIFIC_STUDENTS"), eq(studentIds));
        }

        @Test
        @DisplayName("Should set due date when provided")
        void shouldSetDueDateWhenProvided() {
            UUID courseId = UUID.randomUUID();
            Course course = mock(Course.class);
            doReturn(Course.DeliveryMode.INSTRUCTOR_LED).when(course).getDeliveryMode();
            doReturn(Optional.of(course)).when(courseRepository).findById(courseId);
            doAnswer(inv -> inv.getArgument(0)).when(assignmentRepository).save(any(Assignment.class));

            Instant futureDate = Instant.now().plusSeconds(86400 * 14);
            CreateAssignmentCommand command = new CreateAssignmentCommand(
                UUID.randomUUID(), courseId, "Task", "desc", "instr",
                "FILE_UPLOAD", 50, futureDate, null, null, null
            );

            UUID result = useCase.execute(command);

            assertThat(result).isNotNull();
            verify(assignmentRepository).save(any(Assignment.class));
        }
    }

    @Nested
    @DisplayName("INSTRUCTOR_LED Enforcement Tests")
    class InstructorLedEnforcementTests {

        @Test
        @DisplayName("Should reject SELF_PACED course with IllegalStateException")
        void shouldRejectSelfPacedCourse() {
            UUID courseId = UUID.randomUUID();
            Course selfPacedCourse = mock(Course.class);
            doReturn(Course.DeliveryMode.SELF_PACED).when(selfPacedCourse).getDeliveryMode();
            doReturn("Khóa tự học").when(selfPacedCourse).getTitle();
            doReturn(Optional.of(selfPacedCourse)).when(courseRepository).findById(courseId);

            CreateAssignmentCommand command = new CreateAssignmentCommand(
                UUID.randomUUID(), courseId, "Bài tập", "desc", "instr",
                "ESSAY", 100, null, null, null, null
            );

            assertThatThrownBy(() -> useCase.execute(command))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("INSTRUCTOR_LED")
                .hasMessageContaining("Khóa tự học");

            verifyNoInteractions(assignmentRepository);
        }

        @Test
        @DisplayName("Should throw when course not found")
        void shouldThrowWhenCourseNotFound() {
            UUID courseId = UUID.randomUUID();
            doReturn(Optional.empty()).when(courseRepository).findById(courseId);

            CreateAssignmentCommand command = new CreateAssignmentCommand(
                UUID.randomUUID(), courseId, "Bài tập", "desc", "instr",
                "ESSAY", 100, null, null, null, null
            );

            assertThatThrownBy(() -> useCase.execute(command))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Không tìm thấy khóa học");

            verifyNoInteractions(assignmentRepository);
        }
    }

    @Nested
    @DisplayName("Validation Tests")
    class ValidationTests {

        @Test
        @DisplayName("Should throw when title is blank")
        void shouldThrowWhenTitleIsBlank() {
            UUID courseId = UUID.randomUUID();
            Course course = mock(Course.class);
            doReturn(Course.DeliveryMode.INSTRUCTOR_LED).when(course).getDeliveryMode();
            doReturn(Optional.of(course)).when(courseRepository).findById(courseId);

            CreateAssignmentCommand command = new CreateAssignmentCommand(
                UUID.randomUUID(), courseId, "  ", "desc", "instr",
                "ESSAY", 100, null, null, null, null
            );

            assertThatThrownBy(() -> useCase.execute(command))
                .isInstanceOf(IllegalArgumentException.class);
        }
    }
}
