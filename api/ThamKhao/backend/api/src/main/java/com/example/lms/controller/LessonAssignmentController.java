package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.entity.LessonAssignment;
import com.example.lms.entity.User;
import com.example.lms.service.LessonAssignmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/lesson-assignments")
@RequiredArgsConstructor
@Tag(name = "Lesson Assignments", description = "Quản lý liên kết giữa bài học và bài tập")
@SecurityRequirement(name = "Bearer Authentication")
public class LessonAssignmentController {

    private final LessonAssignmentService service;

    @PostMapping("/link")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Liên kết bài tập với bài học")
    public ResponseEntity<ApiResponse<LessonAssignmentItem>> linkAssignmentToLesson(
            @AuthenticationPrincipal User currentUser,
            @RequestParam @NotNull UUID lessonId,
            @RequestParam @NotNull UUID assignmentId
    ) {
        try {
            LessonAssignment la = service.linkAssignmentToLesson(lessonId, assignmentId, currentUser);
            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(toLessonAssignmentItem(la)));
        } catch (RuntimeException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "Có lỗi xảy ra";
            if (msg.contains("Không tìm thấy")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(msg));
            }
            if (msg.toLowerCase().contains("quyền")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error(msg));
            }
            return ResponseEntity.badRequest().body(ApiResponse.error(msg));
        }
    }

    @DeleteMapping("/unlink")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Hủy liên kết bài tập với bài học")
    public ResponseEntity<ApiResponse<String>> unlinkAssignmentFromLesson(
            @AuthenticationPrincipal User currentUser,
            @RequestParam @NotNull UUID lessonId,
            @RequestParam @NotNull UUID assignmentId
    ) {
        try {
            service.unlinkAssignmentFromLesson(lessonId, assignmentId, currentUser);
            return ResponseEntity.ok(ApiResponse.success("Đã hủy liên kết bài tập với bài học thành công"));
        } catch (RuntimeException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "Có lỗi xảy ra";
            if (msg.contains("Không tìm thấy")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(msg));
            }
            if (msg.toLowerCase().contains("quyền")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error(msg));
            }
            return ResponseEntity.badRequest().body(ApiResponse.error(msg));
        }
    }

    @GetMapping("/by-lesson/{lessonId}")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Lấy danh sách bài tập theo bài học")
    public ResponseEntity<ApiResponse<List<LessonAssignmentItem>>> getAssignmentsByLesson(
            @AuthenticationPrincipal User currentUser,
            @PathVariable @NotNull UUID lessonId
    ) {
        try {
            List<LessonAssignment> assignments = service.getAssignmentsByLesson(lessonId, currentUser);
            List<LessonAssignmentItem> items = assignments.stream()
                    .map(this::toLessonAssignmentItem)
                    .toList();
            return ResponseEntity.ok(ApiResponse.success(items));
        } catch (RuntimeException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "Có lỗi xảy ra";
            if (msg.contains("Không tìm thấy")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(msg));
            }
            if (msg.toLowerCase().contains("quyền")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error(msg));
            }
            return ResponseEntity.badRequest().body(ApiResponse.error(msg));
        }
    }

    @GetMapping("/by-assignment/{assignmentId}")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN') or hasRole('STUDENT')")
    @Operation(summary = "Lấy bài học theo bài tập")
    public ResponseEntity<ApiResponse<LessonAssignmentItem>> getLessonByAssignment(
            @AuthenticationPrincipal User currentUser,
            @PathVariable @NotNull UUID assignmentId
    ) {
        try {
            LessonAssignment lessonAssignment = service.getLessonByAssignment(assignmentId, currentUser);
            return ResponseEntity.ok(ApiResponse.success(toLessonAssignmentItem(lessonAssignment)));
        } catch (RuntimeException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "Có lỗi xảy ra";
            if (msg.contains("Không tìm thấy")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(msg));
            }
            if (msg.toLowerCase().contains("quyền")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error(msg));
            }
            return ResponseEntity.badRequest().body(ApiResponse.error(msg));
        }
    }

    // DTO classes
    public record LessonAssignmentItem(
            UUID id,
            UUID lessonId,
            String lessonTitle,
            UUID assignmentId,
            String assignmentTitle,
            String createdAt
    ) {}

    private LessonAssignmentItem toLessonAssignmentItem(LessonAssignment la) {
        return new LessonAssignmentItem(
                la.getId(),
                la.getLesson().getId(),
                la.getLesson().getTitle(),
                la.getAssignment().getId(),
                la.getAssignment().getTitle(),
                la.getCreatedAt().toString()
        );
    }
}
