package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.application.dto.AssignmentDTOs;
import com.example.lms.assessment.application.port.AssignmentStatsQueryPort;
import com.example.lms.assessment.domain.model.Assignment;
import com.example.lms.assessment.domain.model.AssignmentId;
import com.example.lms.assessment.domain.repository.AssignmentRepository;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("GetTeacherAssignmentsSummaryUseCase Tests")
class GetTeacherAssignmentsSummaryUseCaseTest {

    @Mock
    private AssignmentRepository assignmentRepository;
    @Mock
    private CourseRepository courseRepository;
    @Mock
    private AssignmentStatsQueryPort statsQuery;
    @InjectMocks
    private GetTeacherAssignmentsSummaryUseCase useCase;

    @Test
    @DisplayName("should return real stats from batch queries, not hardcoded zeros")
    void shouldReturnRealStats() {
        UUID teacherId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();

        // Mock course
        Course course = mock(Course.class);
        when(course.getId()).thenReturn(courseId);
        when(course.getTitle()).thenReturn("Hàng hải cơ bản");
        when(course.getDeliveryMode()).thenReturn(Course.DeliveryMode.INSTRUCTOR_LED);
        when(courseRepository.findByTeacherId(eq(teacherId), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(course)));

        // Mock assignment
        Assignment assignment = mock(Assignment.class);
        when(assignment.getId()).thenReturn(new AssignmentId(assignmentId));
        when(assignment.getTitle()).thenReturn("Bài tập 1");
        when(assignment.getCourseId()).thenReturn(courseId);
        when(assignment.getStatus()).thenReturn(Assignment.AssignmentStatus.PUBLISHED);
        when(assignmentRepository.findByCourseIdIn(List.of(courseId))).thenReturn(List.of(assignment));

        // Mock stats
        when(statsQuery.countSubmissionsByAssignmentIds(List.of(assignmentId))).thenReturn(Map.of(assignmentId, 5L));
        when(statsQuery.countGradedByAssignmentIds(List.of(assignmentId))).thenReturn(Map.of(assignmentId, 3L));
        when(statsQuery.avgGradeByAssignmentIds(List.of(assignmentId))).thenReturn(Map.of(assignmentId, 85.0));
        when(statsQuery.countEnrolledStudentsByCourseIds(List.of(courseId))).thenReturn(Map.of(courseId, 10L));

        List<AssignmentDTOs.AssignmentSummary> result = useCase.execute(teacherId);

        assertThat(result).hasSize(1);
        AssignmentDTOs.AssignmentSummary summary = result.get(0);
        assertThat(summary.getSubmissionsCount()).isEqualTo(5);
        assertThat(summary.getGradedCount()).isEqualTo(3);
        assertThat(summary.getPendingCount()).isEqualTo(2);
        assertThat(summary.getTotalStudents()).isEqualTo(10);
        assertThat(summary.getAverageScore()).isEqualTo(85.0);
        assertThat(summary.getCourseTitle()).isEqualTo("Hàng hải cơ bản");
        assertThat(summary.getDeliveryMode()).isEqualTo("INSTRUCTOR_LED");
    }

    @Test
    @DisplayName("should return empty list when teacher has no courses")
    void shouldReturnEmptyWhenNoCourses() {
        UUID teacherId = UUID.randomUUID();
        when(courseRepository.findByTeacherId(eq(teacherId), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        List<AssignmentDTOs.AssignmentSummary> result = useCase.execute(teacherId);

        assertThat(result).isEmpty();
        verifyNoInteractions(statsQuery);
    }

    @Test
    @DisplayName("should handle assignments with no submissions gracefully")
    void shouldHandleNoSubmissions() {
        UUID teacherId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();

        Course course = mock(Course.class);
        when(course.getId()).thenReturn(courseId);
        when(course.getTitle()).thenReturn("Khóa học");
        when(course.getDeliveryMode()).thenReturn(Course.DeliveryMode.INSTRUCTOR_LED);
        when(courseRepository.findByTeacherId(eq(teacherId), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(course)));

        Assignment assignment = mock(Assignment.class);
        when(assignment.getId()).thenReturn(new AssignmentId(assignmentId));
        when(assignment.getTitle()).thenReturn("Bài tập trống");
        when(assignment.getCourseId()).thenReturn(courseId);
        when(assignment.getStatus()).thenReturn(Assignment.AssignmentStatus.DRAFT);
        when(assignmentRepository.findByCourseIdIn(List.of(courseId))).thenReturn(List.of(assignment));

        when(statsQuery.countSubmissionsByAssignmentIds(any())).thenReturn(Map.of());
        when(statsQuery.countGradedByAssignmentIds(any())).thenReturn(Map.of());
        when(statsQuery.avgGradeByAssignmentIds(any())).thenReturn(Map.of());
        when(statsQuery.countEnrolledStudentsByCourseIds(any())).thenReturn(Map.of());

        List<AssignmentDTOs.AssignmentSummary> result = useCase.execute(teacherId);

        assertThat(result).hasSize(1);
        AssignmentDTOs.AssignmentSummary summary = result.get(0);
        assertThat(summary.getSubmissionsCount()).isZero();
        assertThat(summary.getGradedCount()).isZero();
        assertThat(summary.getPendingCount()).isZero();
        assertThat(summary.getTotalStudents()).isZero();
        assertThat(summary.getAverageScore()).isNull();
    }
}
