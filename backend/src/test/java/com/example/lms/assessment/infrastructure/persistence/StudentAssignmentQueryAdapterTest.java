package com.example.lms.assessment.infrastructure.persistence;

import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentAllocationJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentSubmissionJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaLearningClassRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.EnrollmentJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.LearningClassJpaEntity;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("StudentAssignmentQueryAdapter Tests")
class StudentAssignmentQueryAdapterTest {

    @Mock private JpaEnrollmentRepository enrollmentRepository;
    @Mock private AssignmentJpaRepository assignmentRepository;
    @Mock private AssignmentAllocationJpaRepository allocationRepository;
    @Mock private AssignmentSubmissionJpaRepository submissionRepository;
    @Mock private com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository courseRepository;
    @Mock private JpaLearningClassRepository classRepository;

    @InjectMocks
    private StudentAssignmentQueryAdapter adapter;

    @Test
    @DisplayName("Should include completed enrollments when resolving student courses")
    void shouldIncludeCompletedEnrollmentsWhenResolvingStudentCourses() {
        UUID studentId = UUID.randomUUID();
        UUID activeCourseId = UUID.randomUUID();
        UUID completedCourseId = UUID.randomUUID();

        when(enrollmentRepository.findActiveAndCompletedWithClass(studentId)).thenReturn(List.of(
                EnrollmentJpaEntity.builder()
                        .id(UUID.randomUUID())
                        .studentId(studentId)
                        .status(EnrollmentJpaEntity.EnrollmentStatus.ACTIVE)
                        .learningClass(LearningClassJpaEntity.builder()
                                .id(UUID.randomUUID())
                                .courseId(activeCourseId)
                                .name("Class Active")
                                .build())
                        .build(),
                EnrollmentJpaEntity.builder()
                        .id(UUID.randomUUID())
                        .studentId(studentId)
                        .status(EnrollmentJpaEntity.EnrollmentStatus.COMPLETED)
                        .learningClass(LearningClassJpaEntity.builder()
                                .id(UUID.randomUUID())
                                .courseId(completedCourseId)
                                .name("Class Completed")
                                .build())
                        .build()
        ));

        assertThat(adapter.findActiveEnrolledCourses(studentId))
                .extracting(com.example.lms.assessment.application.port.StudentAssignmentQueryPort.EnrolledCourse::courseId)
                .containsExactlyInAnyOrder(activeCourseId, completedCourseId);
    }
}
