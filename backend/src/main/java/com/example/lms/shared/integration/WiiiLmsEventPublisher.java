package com.example.lms.shared.integration;

import com.example.lms.assessment.domain.event.AssignmentSubmittedEvent;
import com.example.lms.assessment.domain.event.QuizSubmittedEvent;
import com.example.lms.assessment.domain.event.SubmissionGradedEvent;
import com.example.lms.learning_delivery.domain.event.CourseEnrolledEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Builds Wiii LMS webhook payloads from LMS domain/application events.
 */
@Service
public class WiiiLmsEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(WiiiLmsEventPublisher.class);

    private final WiiiWebhookEmitter webhookEmitter;
    private final WiiiIntegrationConfig config;
    private final JdbcTemplate jdbc;

    public WiiiLmsEventPublisher(WiiiWebhookEmitter webhookEmitter,
                                 WiiiIntegrationConfig config,
                                 JdbcTemplate jdbc) {
        this.webhookEmitter = webhookEmitter;
        this.config = config;
        this.jdbc = jdbc;
    }

    public void sendCourseEnrolled(CourseEnrolledEvent event) {
        if (!isWebhookEnabled()) {
            return;
        }
        if (event == null || event.getStudentId() == null || event.getCourseId() == null) {
            log.debug("Skipping Wiii course_enrolled webhook because student_id or course_id is missing");
            return;
        }
        String resolvedCourseName = firstNonBlank(
                event.getCourseName(),
                resolveCourseName(event.getCourseId()).orElse(""));

        Map<String, Object> payload = new HashMap<>();
        payload.put("student_id", event.getStudentId().toString());
        payload.put("course_id", event.getCourseId().toString());
        payload.put("course_name", resolvedCourseName);
        if (event.getSemester() != null && !event.getSemester().isBlank()) {
            payload.put("semester", event.getSemester());
        }

        webhookEmitter.sendEvent("course_enrolled", payload);
    }

    public void sendAssignmentSubmitted(AssignmentSubmittedEvent event) {
        if (!isWebhookEnabled()) {
            return;
        }
        if (event == null || event.getStudentId() == null || event.getAssignmentId() == null) {
            log.debug("Skipping Wiii assignment_submitted webhook because student_id or assignment_id is missing");
            return;
        }

        AssignmentContext context = resolveAssignmentContext(event.getAssignmentId()).orElse(null);
        if (context == null || context.courseId() == null) {
            log.warn("Skipping Wiii assignment_submitted webhook because assignment {} has no course context",
                    event.getAssignmentId());
            return;
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("student_id", event.getStudentId().toString());
        payload.put("assignment_id", event.getAssignmentId().toString());
        payload.put("assignment_name", context.assignmentName());
        payload.put("course_id", context.courseId().toString());
        payload.put("course_name", context.courseName());
        payload.put("submitted_at", (event.getSubmittedAt() != null ? event.getSubmittedAt() : Instant.now()).toString());

        webhookEmitter.sendEvent("assignment_submitted", payload);
    }

    public void sendSubmissionGraded(SubmissionGradedEvent event) {
        if (!isWebhookEnabled()) {
            return;
        }
        if (event == null || event.getNewGrade() == null) {
            return;
        }

        AssignmentContext context = resolveAssignmentContext(event.getAssignmentId()).orElse(null);
        if (context == null || context.courseId() == null) {
            log.warn("Skipping Wiii grade_saved webhook because assignment {} has no course context",
                    event.getAssignmentId());
            return;
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("student_id", event.getStudentId().toString());
        payload.put("course_id", context.courseId().toString());
        payload.put("course_name", context.courseName());
        payload.put("grade", event.getNewGrade());
        payload.put("max_grade", context.maxGrade() != null ? context.maxGrade() : 100.0);
        payload.put("assignment_name", context.assignmentName());

        webhookEmitter.sendEvent("grade_saved", payload);
    }

    public void sendQuizCompleted(QuizSubmittedEvent event) {
        if (!isWebhookEnabled()) {
            return;
        }
        if (event == null || event.getStudentId() == null || event.getQuizId() == null) {
            return;
        }

        QuizContext context = resolveQuizContext(event.getQuizId()).orElse(null);
        if (context == null || context.courseId() == null) {
            log.warn("Skipping Wiii quiz_completed webhook because quiz {} has no course context",
                    event.getQuizId());
            return;
        }

        String studentId = event.getStudentId().value().toString();

        Map<String, Object> quizPayload = new HashMap<>();
        quizPayload.put("student_id", studentId);
        quizPayload.put("quiz_id", event.getQuizId().toString());
        quizPayload.put("quiz_name", context.quizName());
        quizPayload.put("course_id", context.courseId().toString());
        quizPayload.put("course_name", context.courseName());
        quizPayload.put("score", event.getScore());
        quizPayload.put("max_score", 100.0);
        webhookEmitter.sendEvent("quiz_completed", quizPayload);

        Map<String, Object> gradePayload = new HashMap<>();
        gradePayload.put("student_id", studentId);
        gradePayload.put("course_id", context.courseId().toString());
        gradePayload.put("course_name", context.courseName());
        gradePayload.put("grade", event.getScore());
        gradePayload.put("max_grade", 100.0);
        gradePayload.put("assignment_name", context.quizName().isBlank() ? "Quiz" : context.quizName());
        webhookEmitter.sendEvent("grade_saved", gradePayload);
    }

    private boolean isWebhookEnabled() {
        return config.getWebhook() != null && config.getWebhook().isEnabled();
    }

    private Optional<String> resolveCourseName(UUID courseId) {
        return queryForString("SELECT c.title FROM courses c WHERE c.id = ?", courseId);
    }

    private Optional<AssignmentContext> resolveAssignmentContext(UUID assignmentId) {
        try {
            Map<String, Object> row = jdbc.queryForMap(
                    "SELECT " +
                    "  a.title AS assignment_name, " +
                    "  COALESCE(a.course_id, ch.course_id)::text AS course_id, " +
                    "  c.title AS course_name, " +
                    "  a.max_score::double precision AS max_grade " +
                    "FROM assignments a " +
                    "LEFT JOIN lessons l ON a.lesson_id = l.id " +
                    "LEFT JOIN chapters ch ON l.chapter_id = ch.id " +
                    "LEFT JOIN courses c ON c.id = COALESCE(a.course_id, ch.course_id) " +
                    "WHERE a.id = ?",
                    assignmentId
            );
            return Optional.of(new AssignmentContext(
                    stringValue(row.get("assignment_name")),
                    uuidValue(row.get("course_id")),
                    stringValue(row.get("course_name")),
                    doubleValue(row.get("max_grade"))
            ));
        } catch (Exception e) {
            log.debug("Could not resolve assignment context for Wiii event: assignment={}, error={}",
                    assignmentId, e.getMessage());
            return Optional.empty();
        }
    }

    private Optional<QuizContext> resolveQuizContext(UUID quizId) {
        try {
            Map<String, Object> row = jdbc.queryForMap(
                    "SELECT " +
                    "  q.title AS quiz_name, " +
                    "  c.id::text AS course_id, " +
                    "  c.title AS course_name " +
                    "FROM quizzes q " +
                    "JOIN lessons l ON q.lesson_id = l.id " +
                    "JOIN chapters ch ON l.chapter_id = ch.id " +
                    "JOIN courses c ON ch.course_id = c.id " +
                    "WHERE q.id = ?",
                    quizId
            );
            return Optional.of(new QuizContext(
                    stringValue(row.get("quiz_name")),
                    uuidValue(row.get("course_id")),
                    stringValue(row.get("course_name"))
            ));
        } catch (Exception e) {
            log.debug("Could not resolve quiz context for Wiii event: quiz={}, error={}",
                    quizId, e.getMessage());
            return Optional.empty();
        }
    }

    private Optional<String> queryForString(String sql, Object... args) {
        try {
            String value = jdbc.queryForObject(sql, String.class, args);
            return Optional.ofNullable(value).filter(s -> !s.isBlank());
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private String firstNonBlank(String first, String second) {
        if (first != null && !first.isBlank()) {
            return first;
        }
        return second != null ? second : "";
    }

    private String stringValue(Object value) {
        return value != null ? value.toString() : "";
    }

    private UUID uuidValue(Object value) {
        if (value == null || value.toString().isBlank()) {
            return null;
        }
        return UUID.fromString(value.toString());
    }

    private Double doubleValue(Object value) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        if (value != null && !value.toString().isBlank()) {
            return Double.parseDouble(value.toString());
        }
        return null;
    }

    private record AssignmentContext(String assignmentName, UUID courseId, String courseName, Double maxGrade) {}
    private record QuizContext(String quizName, UUID courseId, String courseName) {}
}
