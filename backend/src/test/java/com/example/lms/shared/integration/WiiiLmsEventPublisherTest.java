package com.example.lms.shared.integration;

import com.example.lms.assessment.domain.event.QuizSubmittedEvent;
import com.example.lms.assessment.domain.event.SubmissionGradedEvent;
import com.example.lms.shared.domain.valueobject.StudentId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WiiiLmsEventPublisherTest {

    @Mock private WiiiWebhookEmitter webhookEmitter;
    @Mock private JdbcTemplate jdbc;

    private WiiiLmsEventPublisher publisher;

    @BeforeEach
    void setUp() {
        WiiiIntegrationConfig config = new WiiiIntegrationConfig();
        config.getWebhook().setEnabled(true);
        publisher = new WiiiLmsEventPublisher(webhookEmitter, config, jdbc);
    }

    @Test
    void sendQuizCompletedIncludesCourseContextForBothWebhookEvents() {
        UUID attemptId = UUID.randomUUID();
        UUID quizId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();

        when(jdbc.queryForMap(anyString(), eq(quizId))).thenReturn(Map.of(
                "quiz_name", "COLREGs check",
                "course_id", courseId.toString(),
                "course_name", "COLREGs"
        ));

        publisher.sendQuizCompleted(new QuizSubmittedEvent(
                attemptId, quizId, StudentId.of(studentId), lessonId, 87.5, true));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> quizPayload =
                ArgumentCaptor.forClass((Class) Map.class);
        verify(webhookEmitter).sendEvent(eq("quiz_completed"), quizPayload.capture());

        assertThat(quizPayload.getValue())
                .containsEntry("student_id", studentId.toString())
                .containsEntry("quiz_id", quizId.toString())
                .containsEntry("quiz_name", "COLREGs check")
                .containsEntry("course_id", courseId.toString())
                .containsEntry("course_name", "COLREGs")
                .containsEntry("score", 87.5)
                .containsEntry("max_score", 100.0);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> gradePayload =
                ArgumentCaptor.forClass((Class) Map.class);
        verify(webhookEmitter).sendEvent(eq("grade_saved"), gradePayload.capture());

        assertThat(gradePayload.getValue())
                .containsEntry("student_id", studentId.toString())
                .containsEntry("course_id", courseId.toString())
                .containsEntry("grade", 87.5)
                .containsEntry("max_grade", 100.0)
                .containsEntry("assignment_name", "COLREGs check");
    }

    @Test
    void sendAssignmentSubmittedSkipsInvalidPayloadWhenCourseContextIsMissing() {
        UUID studentId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();

        when(jdbc.queryForMap(anyString(), eq(assignmentId))).thenReturn(Map.of(
                "assignment_name", "Essay",
                "course_id", "",
                "course_name", "",
                "max_grade", 100.0
        ));

        publisher.sendAssignmentSubmitted(studentId, assignmentId, Instant.parse("2026-05-10T10:15:30Z"));

        verify(webhookEmitter, never()).sendEvent(eq("assignment_submitted"), org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void sendSubmissionGradedMapsGradeSavedContract() {
        UUID submissionId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        UUID graderId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();

        when(jdbc.queryForMap(anyString(), eq(assignmentId))).thenReturn(Map.of(
                "assignment_name", "Navigation exercise",
                "course_id", courseId.toString(),
                "course_name", "Navigation",
                "max_grade", 50.0
        ));

        publisher.sendSubmissionGraded(new SubmissionGradedEvent(
                submissionId,
                assignmentId,
                studentId,
                graderId,
                "Teacher",
                "GRADE_CREATED",
                null,
                42.0,
                null,
                "Good"
        ));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> payload =
                ArgumentCaptor.forClass((Class) Map.class);
        verify(webhookEmitter).sendEvent(eq("grade_saved"), payload.capture());

        assertThat(payload.getValue())
                .containsEntry("student_id", studentId.toString())
                .containsEntry("course_id", courseId.toString())
                .containsEntry("course_name", "Navigation")
                .containsEntry("grade", 42.0)
                .containsEntry("max_grade", 50.0)
                .containsEntry("assignment_name", "Navigation exercise");
    }
}
