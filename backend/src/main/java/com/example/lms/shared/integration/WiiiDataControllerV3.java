package com.example.lms.shared.integration;

import com.example.lms.shared.infrastructure.web.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Wiii AI data pull API — anti-corruption layer.
 *
 * <p>Base path: {@code /api/v3/integration}
 *
 * <p>Auth: Service-to-service Bearer token ({@code wiii.service-token} config).
 * Validated by {@link WiiiServiceAuthFilter}.
 *
 * <p>Endpoints match Wiii's SpringBootLMSAdapter API prefix
 * ({@code api_prefix = "api/v3/integration"}).
 *
 * <p>Uses JdbcTemplate for read-only queries — simpler than going through
 * domain use cases for integration reads. This is an anti-corruption layer
 * boundary; internal domain logic stays untouched.
 */
@RestController
@RequestMapping("/api/v3/integration")
public class WiiiDataControllerV3 {

    private static final Logger log = LoggerFactory.getLogger(WiiiDataControllerV3.class);

    private final JdbcTemplate jdbc;

    public WiiiDataControllerV3(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // =========================================================================
    // Student endpoints (Wiii pulls for student context)
    // =========================================================================

    /**
     * GET /students/{userId}/profile
     *
     * <p>Returns: id, name, email, class_name, program, enrolled_courses
     */
    @GetMapping("/students/{userId}/profile")
    public ApiResponse<Map<String, Object>> getStudentProfile(@PathVariable UUID userId) {
        log.debug("Integration: getStudentProfile({})", userId);

        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT u.id, u.username AS name, u.email, u.full_name, u.role " +
                "FROM users u WHERE u.id = ?",
                userId
        );

        if (rows.isEmpty()) {
            return ApiResponse.error("NOT_FOUND", "Student not found");
        }

        // Get enrolled course names
        List<String> enrolledCourses = jdbc.queryForList(
                "SELECT DISTINCT c.title FROM enrollments e " +
                "JOIN learning_classes lc ON e.class_id = lc.id " +
                "JOIN courses c ON lc.course_id = c.id " +
                "WHERE e.student_id = ? AND e.status = 'ACTIVE'",
                String.class, userId
        );

        Map<String, Object> result = new HashMap<>(rows.get(0));
        result.put("enrolled_courses", enrolledCourses);
        result.put("class_name", null);  // LMS doesn't have class_name concept
        result.put("program", null);      // LMS doesn't have program concept

        return ApiResponse.success(result);
    }

    /**
     * GET /students/{userId}/grades
     *
     * <p>Returns list of grade objects from quiz attempts.
     * Each: course_id, course_name, grade, max_grade, date
     */
    @GetMapping("/students/{userId}/grades")
    public ApiResponse<List<Map<String, Object>>> getStudentGrades(@PathVariable UUID userId) {
        log.debug("Integration: getStudentGrades({})", userId);

        List<Map<String, Object>> grades = jdbc.queryForList(
                "SELECT " +
                "  c.id::text AS course_id, " +
                "  c.title AS course_name, " +
                "  (SELECT lc.name FROM enrollments e2 JOIN learning_classes lc ON e2.class_id = lc.id " +
                "   WHERE e2.student_id = qa.student_id AND lc.course_id = c.id LIMIT 1) AS class_name, " +
                "  qa.score AS grade, " +
                "  COALESCE(qa.max_score, 100.0) AS max_grade, " +
                "  qa.submitted_at::text AS date " +
                "FROM quiz_attempts qa " +
                "JOIN quizzes q ON qa.quiz_id = q.id " +
                "JOIN lessons l ON q.lesson_id = l.id " +
                "JOIN chapters ch ON l.chapter_id = ch.id " +
                "JOIN courses c ON ch.course_id = c.id " +
                "WHERE qa.student_id = ? AND qa.status IN ('SUBMITTED', 'GRADED') " +
                "ORDER BY qa.submitted_at DESC",
                userId
        );

        return ApiResponse.success(grades);
    }

    /**
     * GET /students/{userId}/enrollments
     *
     * <p>Returns list of enrollment objects.
     * Each: course_id, course_name, semester, status, completion_percent
     */
    @GetMapping("/students/{userId}/enrollments")
    public ApiResponse<List<Map<String, Object>>> getStudentEnrollments(@PathVariable UUID userId) {
        log.debug("Integration: getStudentEnrollments({})", userId);

        List<Map<String, Object>> enrollments = jdbc.queryForList(
                "SELECT " +
                "  c.id::text AS course_id, " +
                "  c.title AS course_name, " +
                "  lc.id::text AS class_id, " +
                "  lc.name AS class_name, " +
                "  lc.semester, " +
                "  e.status, " +
                "  e.completion_percent, " +
                "  e.enrolled_at::text AS enrolled_at " +
                "FROM enrollments e " +
                "JOIN learning_classes lc ON e.class_id = lc.id " +
                "JOIN courses c ON lc.course_id = c.id " +
                "WHERE e.student_id = ? " +
                "ORDER BY e.enrolled_at DESC",
                userId
        );

        return ApiResponse.success(enrollments);
    }

    /**
     * GET /students/{userId}/assignments/upcoming
     *
     * <p>Returns list of upcoming/pending assignments.
     */
    @GetMapping("/students/{userId}/assignments/upcoming")
    public ApiResponse<List<Map<String, Object>>> getUpcomingAssignments(@PathVariable UUID userId) {
        log.debug("Integration: getUpcomingAssignments({})", userId);

        // Get assignments from courses the student is enrolled in
        List<Map<String, Object>> assignments = jdbc.queryForList(
                "SELECT " +
                "  a.id::text AS assignment_id, " +
                "  a.title AS assignment_name, " +
                "  c.id::text AS course_id, " +
                "  c.title AS course_name, " +
                "  (SELECT lc2.name FROM enrollments e2 JOIN learning_classes lc2 ON e2.class_id = lc2.id " +
                "   WHERE e2.student_id = ? AND e2.status = 'ACTIVE' AND lc2.course_id = c.id LIMIT 1) AS class_name, " +
                "  a.due_date::text AS due_date " +
                "FROM assignments a " +
                "JOIN courses c ON a.course_id = c.id " +
                "WHERE EXISTS (" +
                "  SELECT 1 FROM enrollments e JOIN learning_classes lc ON e.class_id = lc.id " +
                "  WHERE e.student_id = ? AND e.status = 'ACTIVE' AND lc.course_id = a.course_id" +
                ") " +
                "AND (a.due_date IS NULL OR a.due_date > NOW()) " +
                "ORDER BY a.due_date ASC NULLS LAST " +
                "LIMIT 20",
                userId, userId
        );

        return ApiResponse.success(assignments);
    }

    /**
     * GET /students/{userId}/quiz-history
     *
     * <p>Returns quiz attempt history with scores.
     */
    @GetMapping("/students/{userId}/quiz-history")
    public ApiResponse<List<Map<String, Object>>> getQuizHistory(@PathVariable UUID userId) {
        log.debug("Integration: getQuizHistory({})", userId);

        List<Map<String, Object>> quizHistory = jdbc.queryForList(
                "SELECT " +
                "  qa.id::text AS attempt_id, " +
                "  q.id::text AS quiz_id, " +
                "  q.title AS quiz_name, " +
                "  c.id::text AS course_id, " +
                "  c.title AS course_name, " +
                "  (SELECT lc.name FROM enrollments e2 JOIN learning_classes lc ON e2.class_id = lc.id " +
                "   WHERE e2.student_id = qa.student_id AND lc.course_id = c.id LIMIT 1) AS class_name, " +
                "  qa.score, " +
                "  COALESCE(qa.max_score, 100.0) AS max_score, " +
                "  qa.is_passed, " +
                "  qa.started_at::text AS start_time, " +
                "  qa.submitted_at::text AS end_time, " +
                "  qa.status " +
                "FROM quiz_attempts qa " +
                "JOIN quizzes q ON qa.quiz_id = q.id " +
                "JOIN lessons l ON q.lesson_id = l.id " +
                "JOIN chapters ch ON l.chapter_id = ch.id " +
                "JOIN courses c ON ch.course_id = c.id " +
                "WHERE qa.student_id = ? " +
                "ORDER BY qa.started_at DESC " +
                "LIMIT 50",
                userId
        );

        return ApiResponse.success(quizHistory);
    }

    // =========================================================================
    // Course/Class endpoints (Wiii pulls for teacher dashboards)
    // =========================================================================

    /**
     * GET /courses/{courseId}/students
     *
     * <p>Returns student roster for a course (all enrolled students).
     */
    @GetMapping("/courses/{courseId}/students")
    public ApiResponse<List<Map<String, Object>>> getCourseStudents(@PathVariable UUID courseId) {
        log.debug("Integration: getCourseStudents({})", courseId);

        List<Map<String, Object>> students = jdbc.queryForList(
                "SELECT " +
                "  u.id::text AS id, " +
                "  u.id::text AS student_id, " +
                "  u.username AS name, " +
                "  u.email, " +
                "  e.status AS enrollment_status, " +
                "  e.completion_percent, " +
                "  e.enrolled_at::text AS enrolled_at " +
                "FROM enrollments e " +
                "JOIN users u ON e.student_id = u.id " +
                "JOIN learning_classes lc ON e.class_id = lc.id " +
                "WHERE lc.course_id = ? AND e.status = 'ACTIVE' " +
                "ORDER BY u.username",
                courseId
        );

        return ApiResponse.success(students);
    }

    /**
     * GET /courses/{courseId}/stats
     *
     * <p>Returns course statistics for teacher dashboard.
     */
    @GetMapping("/courses/{courseId}/stats")
    public ApiResponse<Map<String, Object>> getCourseStats(@PathVariable UUID courseId) {
        log.debug("Integration: getCourseStats({})", courseId);

        // Student count
        Integer studentsCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM enrollments e " +
                "JOIN learning_classes lc ON e.class_id = lc.id " +
                "WHERE lc.course_id = ? AND e.status = 'ACTIVE'",
                Integer.class, courseId
        );

        // Average grade from quiz attempts
        Double avgGrade = jdbc.queryForObject(
                "SELECT COALESCE(AVG(qa.score), 0) FROM quiz_attempts qa " +
                "JOIN quizzes q ON qa.quiz_id = q.id " +
                "WHERE q.course_id = ? AND qa.status IN ('SUBMITTED', 'GRADED')",
                Double.class, courseId
        );

        // Completion rate
        Double completionRate = jdbc.queryForObject(
                "SELECT COALESCE(AVG(e.completion_percent), 0) FROM enrollments e " +
                "JOIN learning_classes lc ON e.class_id = lc.id " +
                "WHERE lc.course_id = ? AND e.status = 'ACTIVE'",
                Double.class, courseId
        );

        // Active in last 7 days
        Integer activeLast7d = jdbc.queryForObject(
                "SELECT COUNT(DISTINCT e.student_id) FROM enrollments e " +
                "JOIN learning_classes lc ON e.class_id = lc.id " +
                "WHERE lc.course_id = ? AND e.status = 'ACTIVE' " +
                "AND e.last_accessed_at > NOW() - INTERVAL '7 days'",
                Integer.class, courseId
        );

        // At-risk count (completion < 30% for active students)
        Integer atRiskCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM enrollments e " +
                "JOIN learning_classes lc ON e.class_id = lc.id " +
                "WHERE lc.course_id = ? AND e.status = 'ACTIVE' " +
                "AND e.completion_percent < 30",
                Integer.class, courseId
        );

        Map<String, Object> stats = Map.of(
                "students_count", studentsCount != null ? studentsCount : 0,
                "avg_grade", avgGrade != null ? Math.round(avgGrade * 10.0) / 10.0 : 0,
                "completion_rate", completionRate != null ? Math.round(completionRate * 10.0) / 10.0 : 0,
                "active_last_7d", activeLast7d != null ? activeLast7d : 0,
                "at_risk_count", atRiskCount != null ? atRiskCount : 0
        );

        return ApiResponse.success(stats);
    }

    // =========================================================================
    // Push endpoints (Wiii → LMS: receive AI insights and alerts)
    // =========================================================================

    /**
     * POST /insights — Receive and persist AI-generated insight about a student.
     */
    @PostMapping("/insights")
    public ApiResponse<String> receiveInsight(@RequestBody Map<String, Object> body) {
        String studentId = (String) body.getOrDefault("student_id", "");
        String insightType = (String) body.getOrDefault("insight_type", "");
        String content = (String) body.getOrDefault("content", "");
        @SuppressWarnings("unchecked")
        Map<String, Object> metadata = (Map<String, Object>) body.getOrDefault("metadata", Map.of());

        log.info("Received AI insight: type={}, student={}", insightType, studentId);

        try {
            String metadataJson = new com.fasterxml.jackson.databind.ObjectMapper()
                    .writeValueAsString(metadata);
            jdbc.update(
                    "INSERT INTO ai_insights (student_id, insight_type, content, metadata) " +
                    "VALUES (?::uuid, ?, ?, ?::jsonb)",
                    studentId, insightType, content, metadataJson
            );
        } catch (Exception e) {
            log.error("Failed to persist AI insight: {}", e.getMessage());
            return ApiResponse.error("PERSIST_FAILED", "Failed to store insight");
        }

        return ApiResponse.success("Insight saved");
    }

    /**
     * POST /alerts — Receive and persist AI-generated class alert for teachers.
     */
    @PostMapping("/alerts")
    public ApiResponse<String> receiveAlert(@RequestBody Map<String, Object> body) {
        String courseId = (String) body.getOrDefault("course_id", "");
        String alertType = (String) body.getOrDefault("alert_type", "");
        String content = (String) body.getOrDefault("content", "");
        @SuppressWarnings("unchecked")
        List<String> studentIds = (List<String>) body.getOrDefault("student_ids", List.of());
        @SuppressWarnings("unchecked")
        Map<String, Object> metadata = (Map<String, Object>) body.getOrDefault("metadata", Map.of());

        log.info("Received AI alert: type={}, course={}", alertType, courseId);

        try {
            var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            String studentIdsJson = mapper.writeValueAsString(studentIds);
            String metadataJson = mapper.writeValueAsString(metadata);
            jdbc.update(
                    "INSERT INTO ai_alerts (course_id, alert_type, content, student_ids, metadata) " +
                    "VALUES (?::uuid, ?, ?, ?::jsonb, ?::jsonb)",
                    courseId.isBlank() ? null : courseId,
                    alertType, content, studentIdsJson, metadataJson
            );
        } catch (Exception e) {
            log.error("Failed to persist AI alert: {}", e.getMessage());
            return ApiResponse.error("PERSIST_FAILED", "Failed to store alert");
        }

        return ApiResponse.success("Alert saved");
    }

    // =========================================================================
    // Read endpoints for teacher dashboard
    // =========================================================================

    /**
     * GET /insights/{studentId} — Get AI insights for a student.
     */
    @GetMapping("/insights/{studentId}")
    public ApiResponse<List<Map<String, Object>>> getStudentInsights(
            @PathVariable UUID studentId,
            @RequestParam(defaultValue = "20") int limit) {

        List<Map<String, Object>> insights = jdbc.queryForList(
                "SELECT id::text, insight_type, content, metadata, is_read, " +
                "created_at::text FROM ai_insights " +
                "WHERE student_id = ? ORDER BY created_at DESC LIMIT ?",
                studentId, limit
        );

        return ApiResponse.success(insights);
    }

    /**
     * GET /alerts/course/{courseId} — Get AI alerts for a course.
     */
    @GetMapping("/alerts/course/{courseId}")
    public ApiResponse<List<Map<String, Object>>> getCourseAlerts(
            @PathVariable UUID courseId,
            @RequestParam(defaultValue = "20") int limit) {

        List<Map<String, Object>> alerts = jdbc.queryForList(
                "SELECT id::text, alert_type, content, student_ids, metadata, " +
                "is_resolved, created_at::text FROM ai_alerts " +
                "WHERE course_id = ? ORDER BY created_at DESC LIMIT ?",
                courseId, limit
        );

        return ApiResponse.success(alerts);
    }
}
