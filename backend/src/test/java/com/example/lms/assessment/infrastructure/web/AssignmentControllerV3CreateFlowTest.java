package com.example.lms.assessment.infrastructure.web;

import com.example.lms.assessment.application.dto.CreateAssignmentCommand;
import com.example.lms.assessment.application.usecase.CreateAssignmentUseCaseV3;
import com.example.lms.assessment.application.usecase.DeleteAssignmentUseCaseV3;
import com.example.lms.assessment.application.usecase.GetAssignmentsByCourseUseCase;
import com.example.lms.assessment.application.usecase.GetTeacherAssignmentsSummaryUseCase;
import com.example.lms.assessment.application.usecase.UpdateAssignmentUseCaseV3;
import com.example.lms.assessment.domain.repository.AssignmentRepository;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentAllocationJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentAllocationStudentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentSubmissionJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaLearningClassRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AssignmentControllerV3CreateFlowTest {

    @Mock private GetTeacherAssignmentsSummaryUseCase getTeacherAssignmentsSummaryUseCase;
    @Mock private GetAssignmentsByCourseUseCase getAssignmentsByCourseUseCase;
    @Mock private AssignmentJpaRepository assignmentRepository;
    @Mock private AssignmentRepository assignmentDomainRepository;
    @Mock private AssignmentAllocationJpaRepository allocationRepository;
    @Mock private AssignmentAllocationStudentJpaRepository allocationStudentRepository;
    @Mock private AssignmentSubmissionJpaRepository submissionRepository;
    @Mock private CreateAssignmentUseCaseV3 createAssignmentUseCaseV3;
    @Mock private DeleteAssignmentUseCaseV3 deleteAssignmentUseCaseV3;
    @Mock private UpdateAssignmentUseCaseV3 updateAssignmentUseCaseV3;
    @Mock private JpaCourseRepository courseJpaRepository;
    @Mock private JpaLearningClassRepository classRepository;
    @Mock private JpaEnrollmentRepository enrollmentRepository;

    @InjectMocks
    private AssignmentControllerV3 controller;

    private UUID teacherId;
    private UUID courseId;
    private UUID lessonId;
    private UUID assignmentId;
    private UserJpaEntity owner;
    private CourseJpaEntity ownedCourse;

    @BeforeEach
    void setUp() {
        teacherId = UUID.randomUUID();
        courseId = UUID.randomUUID();
        lessonId = UUID.randomUUID();
        assignmentId = UUID.randomUUID();

        owner = new UserJpaEntity();
        owner.setId(teacherId);
        owner.setRole(UserJpaEntity.UserRole.TEACHER);

        ownedCourse = CourseJpaEntity.builder()
                .id(courseId)
                .teacherId(teacherId)
                .title("Course")
                .deliveryMode(CourseJpaEntity.DeliveryMode.SELF_PACED)
                .build();
    }

    @Test
    @DisplayName("createAssignment: bind assignment to lesson when lessonId is provided")
    void createAssignmentBindsToLesson() {
        when(courseJpaRepository.findById(courseId)).thenReturn(Optional.of(ownedCourse));
        when(courseJpaRepository.findByLessonId(lessonId)).thenReturn(Optional.of(ownedCourse));
        when(assignmentRepository.findByLessonId(lessonId)).thenReturn(List.of());
        when(createAssignmentUseCaseV3.execute(any())).thenReturn(assignmentId);
        when(assignmentRepository.findById(assignmentId)).thenReturn(Optional.of(
                AssignmentJpaEntity.builder()
                        .id(assignmentId)
                        .lessonId(lessonId)
                        .courseId(courseId)
                        .title("Task")
                        .status(AssignmentJpaEntity.AssignmentStatus.DRAFT)
                        .maxScore(new BigDecimal("100"))
                        .build()
        ));
        when(allocationRepository.findByAssignmentId(assignmentId)).thenReturn(List.of());
        when(submissionRepository.findByAssignmentId(assignmentId)).thenReturn(List.of());
        when(enrollmentRepository.findByLearningClass_CourseId(courseId)).thenReturn(List.of());

        var response = controller.createAssignment(courseId, request(lessonId), owner);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();

        ArgumentCaptor<CreateAssignmentCommand> commandCaptor = ArgumentCaptor.forClass(CreateAssignmentCommand.class);
        verify(createAssignmentUseCaseV3).execute(commandCaptor.capture());
        assertThat(commandCaptor.getValue().lessonId()).isEqualTo(lessonId);
        assertThat(commandCaptor.getValue().courseId()).isEqualTo(courseId);
    }

    @Test
    @DisplayName("createAssignment: reject lesson that belongs to a different course")
    void createAssignmentRejectsForeignLesson() {
        UUID foreignCourseId = UUID.randomUUID();

        when(courseJpaRepository.findById(courseId)).thenReturn(Optional.of(ownedCourse));
        when(courseJpaRepository.findByLessonId(lessonId)).thenReturn(Optional.of(
                CourseJpaEntity.builder()
                        .id(foreignCourseId)
                        .teacherId(teacherId)
                        .title("Foreign")
                        .build()
        ));

        var response = controller.createAssignment(courseId, request(lessonId), owner);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getMessage()).contains("selected course");
        verify(createAssignmentUseCaseV3, never()).execute(any());
    }

    @Test
    @DisplayName("createAssignment: reject duplicate assignment for the same lesson")
    void createAssignmentRejectsDuplicateLessonAssignment() {
        when(courseJpaRepository.findById(courseId)).thenReturn(Optional.of(ownedCourse));
        when(courseJpaRepository.findByLessonId(lessonId)).thenReturn(Optional.of(ownedCourse));
        when(assignmentRepository.findByLessonId(lessonId)).thenReturn(List.of(
                AssignmentJpaEntity.builder()
                        .id(UUID.randomUUID())
                        .lessonId(lessonId)
                        .courseId(courseId)
                        .title("Existing")
                        .status(AssignmentJpaEntity.AssignmentStatus.DRAFT)
                        .build()
        ));

        var response = controller.createAssignment(courseId, request(lessonId), owner);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getMessage()).contains("already has an assignment");
        verify(createAssignmentUseCaseV3, never()).execute(any());
    }

    @Test
    @DisplayName("createAssignment: reject class-scoped distribution for SELF_PACED course")
    void createAssignmentRejectsClassDistributionForSelfPacedCourse() {
        UUID classId = UUID.randomUUID();

        when(courseJpaRepository.findById(courseId)).thenReturn(Optional.of(ownedCourse));
        when(courseJpaRepository.findByLessonId(lessonId)).thenReturn(Optional.of(ownedCourse));
        when(assignmentRepository.findByLessonId(lessonId)).thenReturn(List.of());

        var response = controller.createAssignment(
                courseId,
                new AssignmentControllerV3.CreateAssignmentRequest(
                        "Task",
                        "Description",
                        "Instructions",
                        null,
                        100,
                        "DRAFT",
                        "CLASS",
                        classId,
                        null,
                        lessonId
                ),
                owner
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getMessage()).contains("SELF_PACED");
        verify(createAssignmentUseCaseV3, never()).execute(any());
    }

    private AssignmentControllerV3.CreateAssignmentRequest request(UUID lessonId) {
        return new AssignmentControllerV3.CreateAssignmentRequest(
                "Task",
                "Description",
                "Instructions",
                null,
                100,
                "DRAFT",
                "ALL_STUDENTS",
                null,
                null,
                lessonId
        );
    }
}
