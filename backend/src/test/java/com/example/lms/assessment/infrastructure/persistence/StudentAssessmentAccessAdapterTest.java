package com.example.lms.assessment.infrastructure.persistence;

import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentAllocationJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentAllocationStudentJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.QuizAssignmentJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.QuizJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentAllocationJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentAllocationStudentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizAssignmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizJpaRepositoryV3;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.EnrollmentJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.LearningClassJpaEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("StudentAssessmentAccessAdapter Tests")
class StudentAssessmentAccessAdapterTest {

    @Mock private AssignmentJpaRepository assignmentRepository;
    @Mock private AssignmentAllocationJpaRepository allocationRepository;
    @Mock private AssignmentAllocationStudentJpaRepository allocationStudentRepository;
    @Mock private QuizAssignmentJpaRepository quizAssignmentJpaRepository;
    @Mock private QuizJpaRepositoryV3 quizJpaRepository;
    @Mock private JpaEnrollmentRepository enrollmentRepository;
    @Mock private JpaCourseRepository courseRepository;

    @InjectMocks
    private StudentAssessmentAccessAdapter adapter;

    private UUID studentId;
    private UUID courseId;
    private UUID classAId;
    private UUID classBId;

    @BeforeEach
    void setUp() {
        studentId = UUID.randomUUID();
        courseId = UUID.randomUUID();
        classAId = UUID.randomUUID();
        classBId = UUID.randomUUID();

        when(enrollmentRepository.findActiveWithClass(studentId)).thenReturn(List.of(
                EnrollmentJpaEntity.builder()
                        .id(UUID.randomUUID())
                        .studentId(studentId)
                        .learningClass(LearningClassJpaEntity.builder()
                                .id(classAId)
                                .courseId(courseId)
                                .name("A1")
                                .build())
                        .status(EnrollmentJpaEntity.EnrollmentStatus.ACTIVE)
                        .build()
        ));
    }

    @Test
    @DisplayName("Should deny class scoped assignment for student in another class")
    void shouldDenyClassScopedAssignmentForAnotherClass() {
        UUID assignmentId = UUID.randomUUID();
        when(assignmentRepository.findById(assignmentId)).thenReturn(Optional.of(
                AssignmentJpaEntity.builder()
                        .id(assignmentId)
                        .courseId(courseId)
                        .title("Assignment")
                        .maxScore(BigDecimal.valueOf(100))
                        .status(AssignmentJpaEntity.AssignmentStatus.PUBLISHED)
                        .build()
        ));
        when(allocationRepository.findByAssignmentId(assignmentId)).thenReturn(List.of(
                AssignmentAllocationJpaEntity.builder()
                        .id(UUID.randomUUID())
                        .assignmentId(assignmentId)
                        .distributionType("CLASS")
                        .classId(classBId)
                        .isActive(true)
                        .build()
        ));

        assertThat(adapter.canAccessAssignment(assignmentId, studentId)).isFalse();
    }

    @Test
    @DisplayName("Should allow specifically allocated assignment")
    void shouldAllowSpecificallyAllocatedAssignment() {
        UUID assignmentId = UUID.randomUUID();
        UUID allocationId = UUID.randomUUID();
        when(assignmentRepository.findById(assignmentId)).thenReturn(Optional.of(
                AssignmentJpaEntity.builder()
                        .id(assignmentId)
                        .courseId(courseId)
                        .title("Assignment")
                        .maxScore(BigDecimal.valueOf(100))
                        .status(AssignmentJpaEntity.AssignmentStatus.PUBLISHED)
                        .build()
        ));
        when(allocationRepository.findByAssignmentId(assignmentId)).thenReturn(List.of(
                AssignmentAllocationJpaEntity.builder()
                        .id(allocationId)
                        .assignmentId(assignmentId)
                        .distributionType("SPECIFIC_STUDENTS")
                        .isActive(true)
                        .build()
        ));
        when(allocationStudentRepository.findByAllocationIdIn(List.of(allocationId))).thenReturn(List.of(
                AssignmentAllocationStudentJpaEntity.builder()
                        .allocationId(allocationId)
                        .studentId(studentId)
                        .build()
        ));

        assertThat(adapter.canAccessAssignment(assignmentId, studentId)).isTrue();
    }

    @Test
    @DisplayName("Should filter inaccessible assignments out of list")
    void shouldFilterInaccessibleAssignmentsOutOfList() {
        UUID visibleId = UUID.randomUUID();
        UUID hiddenId = UUID.randomUUID();
        when(assignmentRepository.findAllById(List.of(visibleId, hiddenId))).thenReturn(List.of(
                AssignmentJpaEntity.builder()
                        .id(visibleId)
                        .courseId(courseId)
                        .title("Visible")
                        .maxScore(BigDecimal.valueOf(100))
                        .status(AssignmentJpaEntity.AssignmentStatus.PUBLISHED)
                        .build(),
                AssignmentJpaEntity.builder()
                        .id(hiddenId)
                        .courseId(courseId)
                        .title("Hidden")
                        .maxScore(BigDecimal.valueOf(100))
                        .status(AssignmentJpaEntity.AssignmentStatus.PUBLISHED)
                        .build()
        ));
        when(allocationRepository.findByAssignmentIdIn(anyCollection())).thenReturn(List.of(
                AssignmentAllocationJpaEntity.builder()
                        .id(UUID.randomUUID())
                        .assignmentId(hiddenId)
                        .distributionType("CLASS")
                        .classId(classBId)
                        .isActive(true)
                        .build()
        ));

        assertThat(adapter.filterAccessibleAssignmentIds(List.of(visibleId, hiddenId), studentId))
                .containsExactly(visibleId);
    }

    @Test
    @DisplayName("Should deny class scoped quiz for student in another class")
    void shouldDenyClassScopedQuizForAnotherClass() {
        UUID quizId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();
        when(quizJpaRepository.findById(quizId)).thenReturn(Optional.of(
                QuizJpaEntity.builder()
                        .id(quizId)
                        .lessonId(lessonId)
                        .title("Quiz")
                        .status(QuizJpaEntity.QuizStatus.PUBLISHED)
                        .build()
        ));
        when(quizAssignmentJpaRepository.findFirstByQuizIdOrderByAssignedAtDesc(quizId)).thenReturn(Optional.of(
                QuizAssignmentJpaEntity.builder()
                        .id(UUID.randomUUID())
                        .quizId(quizId)
                        .courseId(courseId)
                        .classId(classBId)
                        .isActive(true)
                        .build()
        ));

        assertThat(adapter.canAccessQuiz(quizId, studentId)).isFalse();
    }

    @Test
    @DisplayName("Should allow course wide quiz via lesson fallback")
    void shouldAllowCourseWideQuizViaLessonFallback() {
        UUID quizId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();
        when(quizJpaRepository.findById(quizId)).thenReturn(Optional.of(
                QuizJpaEntity.builder()
                        .id(quizId)
                        .lessonId(lessonId)
                        .title("Quiz")
                        .status(QuizJpaEntity.QuizStatus.PUBLISHED)
                        .build()
        ));
        when(quizAssignmentJpaRepository.findFirstByQuizIdOrderByAssignedAtDesc(quizId)).thenReturn(Optional.empty());
        when(courseRepository.findByLessonId(lessonId)).thenReturn(Optional.of(
                CourseJpaEntity.builder()
                        .id(courseId)
                        .title("Course")
                        .build()
        ));

        assertThat(adapter.canAccessQuiz(quizId, studentId)).isTrue();
    }
}
