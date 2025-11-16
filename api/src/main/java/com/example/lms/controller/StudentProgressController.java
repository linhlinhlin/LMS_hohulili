package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.dto.response.LessonProgressResponse;
import com.example.lms.dto.response.CourseProgressResponse;
import com.example.lms.dto.response.CompletedLessonIdsResponse;
import com.example.lms.entity.*;
import com.example.lms.service.LessonProgressDomainService;
import com.example.lms.service.LessonService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Student Progress Controller
 *
 * REST API for lesson progress tracking.
 * Handles completion marking and progress retrieval.
 */
@RestController
@RequestMapping("/api/v1/student/progress")
@RequiredArgsConstructor
@Tag(name = "Student Progress", description = "API quản lý tiến độ học tập của học viên")
@SecurityRequirement(name = "Bearer Authentication")
// @PreAuthorize("hasRole('STUDENT')")
@Transactional
public class StudentProgressController {

    private final LessonProgressDomainService progressDomainService;
    private final LessonService lessonService;

    /**
     * Mark a lesson as completed
     */
    @PostMapping("/lessons/{lessonId}/complete")
    @Operation(summary = "Đánh dấu bài học đã hoàn thành",
               description = "Học viên đánh dấu một bài học là đã hoàn thành")
    public ResponseEntity<ApiResponse<LessonProgressResponse>> markLessonComplete(
            @PathVariable UUID lessonId,
            @AuthenticationPrincipal User student
    ) {
        try {
            // Get lesson
            Lesson lesson = lessonService.getLessonById(lessonId, student);
            if (lesson == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Không tìm thấy bài học"));
            }

            // Complete lesson through domain service
            StudentLessonProgress progress = progressDomainService.completeLesson(student, lesson);

            // Convert to response
            LessonProgressResponse response = convertToLessonProgressResponse(progress);

            return ResponseEntity.ok(ApiResponse.success(response, "Bài học đã được đánh dấu hoàn thành"));

        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Start progress on a lesson
     */
    @PostMapping("/lessons/{lessonId}/start")
    @Operation(summary = "Bắt đầu học bài học",
               description = "Học viên bắt đầu học một bài học")
    public ResponseEntity<ApiResponse<LessonProgressResponse>> startLesson(
            @PathVariable UUID lessonId,
            @AuthenticationPrincipal User student
    ) {
        try {
            // Get lesson
            Lesson lesson = lessonService.getLessonById(lessonId, student);
            if (lesson == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Không tìm thấy bài học"));
            }

            // Start lesson through domain service
            StudentLessonProgress progress = progressDomainService.startLesson(student, lesson);

            // Convert to response
            LessonProgressResponse response = convertToLessonProgressResponse(progress);

            return ResponseEntity.ok(ApiResponse.success(response, "Đã bắt đầu học bài học"));

        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Get progress for a specific lesson
     */
    @GetMapping("/lessons/{lessonId}")
    @Operation(summary = "Lấy tiến độ của bài học",
               description = "Lấy thông tin tiến độ của một bài học cụ thể")
    public ResponseEntity<ApiResponse<LessonProgressResponse>> getLessonProgress(
            @PathVariable UUID lessonId,
            @AuthenticationPrincipal User student
    ) {
        try {
            // Get lesson
            Lesson lesson = lessonService.getLessonById(lessonId, student);
            if (lesson == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Không tìm thấy bài học"));
            }

            // Get progress
            var progressOpt = progressDomainService.getLessonProgress(student, lesson);

            if (progressOpt.isPresent()) {
                LessonProgressResponse response = convertToLessonProgressResponse(progressOpt.get());
                return ResponseEntity.ok(ApiResponse.success(response));
            } else {
                // Return default progress (not started)
                LessonProgressResponse response = LessonProgressResponse.builder()
                        .lessonId(lessonId)
                        .status("NOT_STARTED")
                        .isCompleted(false)
                        .build();
                return ResponseEntity.ok(ApiResponse.success(response));
            }

        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Get course progress summary
     */
    @GetMapping("/courses/{courseId}")
    @Operation(summary = "Lấy tiến độ khóa học",
               description = "Lấy tổng quan tiến độ học tập trong một khóa học")
    public ResponseEntity<ApiResponse<CourseProgressResponse>> getCourseProgress(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal User student
    ) {
        try {
            // Create course entity for domain service
            Course course = new Course();
            course.setId(courseId);

            // Calculate progress
            LessonProgressDomainService.CourseProgress progress =
                    progressDomainService.calculateCourseProgress(student, course);

            // Convert to response
            CourseProgressResponse response = CourseProgressResponse.builder()
                    .courseId(progress.getCourseId())
                    .totalLessons(progress.getTotalLessons())
                    .completedLessons(progress.getCompletedLessons())
                    .progressPercentage(progress.getProgressPercentage().doubleValue())
                    .isCompleted(progress.isCompleted())
                    .build();

            return ResponseEntity.ok(ApiResponse.success(response));

        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Get completed lesson IDs for a course (for FE progress merging)
     */
    @GetMapping("/courses/{courseId}/completed-ids")
    @Operation(summary = "Lấy danh sách ID bài học đã hoàn thành",
               description = "Lấy danh sách ID các bài học đã hoàn thành trong khóa học")
    public ResponseEntity<ApiResponse<CompletedLessonIdsResponse>> getCompletedLessonIds(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal User student
    ) {
        try {
            // Create course entity for domain service
            Course course = new Course();
            course.setId(courseId);

            // Get completed lesson IDs
            List<StudentLessonProgress> progressList =
                    progressDomainService.getCourseLessonProgress(student, course);

            List<UUID> completedLessonIds = progressList.stream()
                    .filter(StudentLessonProgress::isCompleted)
                    .map(progress -> progress.getLesson().getId())
                    .collect(Collectors.toList());

            CompletedLessonIdsResponse response = CompletedLessonIdsResponse.builder()
                    .courseId(courseId)
                    .completedLessonIds(completedLessonIds)
                    .build();

            return ResponseEntity.ok(ApiResponse.success(response));

        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Get detailed progress for all lessons in a course
     */
    @GetMapping("/courses/{courseId}/lessons")
    @Operation(summary = "Lấy tiến độ chi tiết các bài học trong khóa học",
               description = "Lấy danh sách tiến độ của tất cả bài học trong khóa học")
    public ResponseEntity<ApiResponse<List<LessonProgressResponse>>> getCourseLessonProgress(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal User student
    ) {
        try {
            // Create course entity for domain service
            Course course = new Course();
            course.setId(courseId);

            // Get detailed progress
            List<StudentLessonProgress> progressList =
                    progressDomainService.getCourseLessonProgress(student, course);

            // Convert to responses
            List<LessonProgressResponse> responses = progressList.stream()
                    .map(this::convertToLessonProgressResponse)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(ApiResponse.success(responses));

        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    // Helper methods
    private LessonProgressResponse convertToLessonProgressResponse(StudentLessonProgress progress) {
        return LessonProgressResponse.builder()
                .id(progress.getId())
                .lessonId(progress.getLesson().getId())
                .status(progress.getStatus().name())
                .isCompleted(progress.isCompleted())
                .startedAt(progress.getStartedAt())
                .completedAt(progress.getCompletedAt())
                .timeSpentMinutes(progress.getTimeSpentMinutes())
                .build();
    }

}