package com.example.lms.learning_delivery.infrastructure.web;

import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.LessonJpaRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.learning_delivery.application.usecase.LearningActivityUseCase;
import com.example.lms.learning_delivery.application.usecase.LearningActivityUseCase.*;
import com.example.lms.learning_delivery.infrastructure.persistence.LearningEventJpaRepository;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.sql.Date;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Endpoints for learning activity tracking:
 * - Heartbeat (time-spent measurement, Coursera pattern)
 * - Reading progress (scroll-based, edX pattern)
 * - Continue where you left off (Netflix/Coursera pattern)
 * - Today's study time
 */
@RestController
@RequestMapping("/api/v3/learning-activity")
@RequiredArgsConstructor
@Tag(name = "Learning Activity", description = "Time-spent tracking, reading progress, and resume activity")
public class LearningActivityControllerV3 {

    private final LearningActivityUseCase useCase;
    private final LearningEventJpaRepository learningEventRepository;
    private final JpaCourseRepository courseJpaRepository;
    private final LessonJpaRepository lessonJpaRepository;

    @Operation(summary = "Record heartbeat (time-spent tracking)")
    @PostMapping("/heartbeat")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> recordHeartbeat(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @Valid @RequestBody HeartbeatRequest request) {
        UUID studentId = currentUser.getId();
        useCase.recordHeartbeat(
                studentId,
                request.lessonId(),
                request.sectionId(),
                request.timeSpentSeconds(),
                request.contentType()
        );
        return ResponseEntity.ok(ApiResponse.success(null, "Đã ghi nhận hoạt động"));
    }

    @Operation(summary = "Record reading progress for TEXT sections")
    @PostMapping("/reading-progress")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> recordReadingProgress(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @Valid @RequestBody ReadingProgressRequest request) {
        UUID studentId = currentUser.getId();
        useCase.recordReadingProgress(
                studentId,
                request.lessonId(),
                request.sectionId(),
                request.scrollPercent()
        );
        return ResponseEntity.ok(ApiResponse.success(null, "Đã ghi nhận tiến độ đọc"));
    }

    @Operation(summary = "Record interactive video event")
    @PostMapping("/interactive-video/events")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> recordInteractiveVideoEvent(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @Valid @RequestBody InteractiveVideoEventRequest request) {
        UUID studentId = currentUser.getId();
        useCase.recordInteractiveVideoEvent(
                studentId,
                request.lessonId(),
                request.sectionId(),
                request.interactionId(),
                request.action(),
                request.videoTimeSeconds(),
                request.data()
        );
        return ResponseEntity.ok(ApiResponse.success(null, "Đã ghi nhận tương tác video"));
    }

    @Operation(summary = "Get continue-where-you-left-off data (includes courseId)")
    @GetMapping("/continue")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getContinueWhereLeftOff(
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        UUID studentId = currentUser.getId();
        ContinueWhereLeftOffDTO result = useCase.getContinueWhereLeftOff(studentId);
        if (result == null) {
            return ResponseEntity.ok(ApiResponse.success(null, "Không có hoạt động gần đây"));
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("lessonId", result.lessonId().toString());
        response.put("sectionId", result.sectionId());
        response.put("lastEventType", result.lastEventType());
        response.put("lastActivityAt", result.lastActivityAt().toString());

        // Use courseId from enrollment (primary) or resolve from lessonId (fallback)
        if (result.courseId() != null) {
            response.put("courseId", result.courseId().toString());
            courseJpaRepository.findById(result.courseId()).ifPresent(course ->
                    response.put("courseTitle", course.getTitle()));
        } else {
            courseJpaRepository.findByLessonId(result.lessonId()).ifPresent(course -> {
                response.put("courseId", course.getId().toString());
                response.put("courseTitle", course.getTitle());
            });
        }

        lessonJpaRepository.findById(result.lessonId()).ifPresent(lesson ->
                response.put("lessonTitle", lesson.getTitle()));

        return ResponseEntity.ok(ApiResponse.success(response, "Hoạt động gần nhất"));
    }

    @Operation(summary = "Get today's study time")
    @GetMapping("/study-time/today")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<StudyTimeResponse>> getTodayStudyTime(
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        UUID studentId = currentUser.getId();
        long seconds = useCase.getTodayStudyTimeSeconds(studentId);
        return ResponseEntity.ok(ApiResponse.success(
                StudyTimeResponse.from(seconds), "Study time loaded"));
    }

    @Operation(summary = "Get learning activity heatmap (GitHub-style)")
    @GetMapping("/heatmap")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getHeatmap(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @RequestParam(defaultValue = "12") int months) {
        UUID studentId = currentUser.getId();
        Instant since = Instant.now().minus(months * 30L, ChronoUnit.DAYS);
        List<Object[]> raw = learningEventRepository.countEventsByDaySince(studentId, since);

        List<Map<String, Object>> heatmap = new ArrayList<>();
        for (Object[] row : raw) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("date", row[0].toString());
            long count = ((Number) row[1]).longValue();
            entry.put("count", count);
            entry.put("level", count == 0 ? 0 : count <= 3 ? 1 : count <= 7 ? 2 : count <= 15 ? 3 : 4);
            heatmap.add(entry);
        }
        return ResponseEntity.ok(ApiResponse.success(heatmap, "Dữ liệu biểu đồ nhiệt"));
    }

    @Operation(summary = "Get weekly study time trends")
    @GetMapping("/study-time/trends")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getStudyTimeTrends(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @RequestParam(defaultValue = "12") int weeks) {
        UUID studentId = currentUser.getId();
        Instant since = Instant.now().minus(weeks * 7L, ChronoUnit.DAYS);
        List<Object[]> raw = learningEventRepository.sumTimeSpentByWeekSince(studentId, since);

        List<Map<String, Object>> trends = new ArrayList<>();
        for (Object[] row : raw) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("weekStart", row[0].toString());
            long totalSeconds = ((Number) row[1]).longValue();
            entry.put("totalMinutes", totalSeconds / 60);
            trends.add(entry);
        }
        return ResponseEntity.ok(ApiResponse.success(trends, "Xu hướng thời gian học"));
    }

}
