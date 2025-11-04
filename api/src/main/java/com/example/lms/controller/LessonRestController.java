package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.entity.Lesson;
import com.example.lms.entity.User;
import com.example.lms.repository.LessonRepository;
import com.example.lms.service.LessonService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/lessons")
@RequiredArgsConstructor
@Tag(name = "Lessons (flat)", description = "API quản lý lessons theo REST phẳng")
@SecurityRequirement(name = "Bearer Authentication")
public class LessonRestController {

    private final LessonRepository lessonRepository;
    private final LessonService lessonService;

    @GetMapping
    @Operation(summary = "Danh sách lessons", description = "Liệt kê lessons theo sectionId hoặc courseId")
    public ResponseEntity<ApiResponse<List<LessonItem>>> listLessons(
            @RequestParam(required = false) UUID sectionId,
            @RequestParam(required = false) UUID courseId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            List<Lesson> lessons;
            if (sectionId != null) {
                lessons = lessonRepository.findBySectionIdOrderByOrderIndexAsc(sectionId);
            } else if (courseId != null) {
                lessons = lessonRepository.findByCourseIdOrderByOrderIndexAsc(courseId);
            } else {
                return ResponseEntity.badRequest().body(ApiResponse.error("Cần sectionId hoặc courseId"));
            }
            List<LessonItem> items = lessons.stream().map(this::toItem).toList();
            return ResponseEntity.ok(ApiResponse.success(items));
        } catch (RuntimeException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "Có lỗi xảy ra";
            return ResponseEntity.badRequest().body(ApiResponse.error(msg));
        }
    }

    @PostMapping
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Tạo lesson", description = "Tạo lesson trong một section")
    public ResponseEntity<ApiResponse<LessonItem>> create(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CreateReq req
    ) {
        try {
            // Reuse service to validate permission and ordering
            Lesson lesson = lessonService.createLesson(req.getSectionId(), currentUser, toCreateLessonRequest(req));
            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(toItem(lesson)));
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

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật lesson")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<LessonItem>> update(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody UpdateReq req
    ) {
        try {
            Lesson lesson = lessonService.updateLesson(id, currentUser, toUpdateLessonRequest(req));
            return ResponseEntity.ok(ApiResponse.success(toItem(lesson)));
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

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa lesson")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            lessonService.deleteLesson(id, currentUser);
            return ResponseEntity.ok(ApiResponse.success("OK"));
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

    @GetMapping("/{id}")
    @Operation(summary = "Chi tiết lesson")
    public ResponseEntity<ApiResponse<LessonItem>> getById(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            Lesson lesson = lessonService.getLessonById(id, currentUser);
            return ResponseEntity.ok(ApiResponse.success(toItem(lesson)));
        } catch (RuntimeException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "Không tìm thấy bài học";
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(msg));
        }
    }

    private LessonItem toItem(Lesson l) {
        return LessonItem.builder()
                .id(l.getId())
                .title(l.getTitle())
                .description(l.getDescription())
                .content(l.getContent())
                .videoUrl(l.getVideoUrl())
                .durationMinutes(l.getDurationMinutes())
                .orderIndex(l.getOrderIndex())
                .lessonType(l.getLessonType() != null ? l.getLessonType().toString() : "LECTURE")
                .sectionId(l.getSection().getId())
                .courseId(l.getSection().getCourse().getId())
                .createdAt(l.getCreatedAt())
                .updatedAt(l.getUpdatedAt())
                .build();
    }

    private com.example.lms.controller.LessonController.CreateLessonRequest toCreateLessonRequest(CreateReq req) {
        com.example.lms.controller.LessonController.CreateLessonRequest r = new com.example.lms.controller.LessonController.CreateLessonRequest();
        r.setTitle(req.getTitle());
        r.setDescription(req.getDescription());
        r.setContent(req.getContent());
        r.setVideoUrl(req.getVideoUrl());
        r.setDurationMinutes(req.getDurationMinutes());
        r.setOrderIndex(req.getOrderIndex());
        return r;
    }

    private com.example.lms.controller.LessonController.UpdateLessonRequest toUpdateLessonRequest(UpdateReq req) {
        com.example.lms.controller.LessonController.UpdateLessonRequest r = new com.example.lms.controller.LessonController.UpdateLessonRequest();
        r.setTitle(req.getTitle());
        r.setDescription(req.getDescription());
        r.setContent(req.getContent());
        r.setVideoUrl(req.getVideoUrl());
        r.setDurationMinutes(req.getDurationMinutes());
        r.setOrderIndex(req.getOrderIndex());
        return r;
    }

    // DTOs
    @lombok.Builder
    @lombok.Data
    public static class LessonItem {
        private UUID id;
        private String title;
        private String description;
        private String content;
        private String videoUrl;
        private Integer durationMinutes;
        private Integer orderIndex;
        private String lessonType;
        private UUID sectionId;
        private UUID courseId;
        private Instant createdAt;
        private Instant updatedAt;
    }

    public static class CreateReq {
        @NotNull
        private UUID sectionId;
        @NotBlank
        @Size(max = 255)
        private String title;
        private String description;
        private String content;
        private String videoUrl;
        private Integer durationMinutes;
        private Integer orderIndex;
        public UUID getSectionId() { return sectionId; }
        public void setSectionId(UUID sectionId) { this.sectionId = sectionId; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public String getVideoUrl() { return videoUrl; }
        public void setVideoUrl(String videoUrl) { this.videoUrl = videoUrl; }
        public Integer getDurationMinutes() { return durationMinutes; }
        public void setDurationMinutes(Integer durationMinutes) { this.durationMinutes = durationMinutes; }
        public Integer getOrderIndex() { return orderIndex; }
        public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
    }

    public static class UpdateReq {
        @Size(max = 255)
        private String title;
        private String description;
        private String content;
        private String videoUrl;
        private Integer durationMinutes;
        private Integer orderIndex;
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public String getVideoUrl() { return videoUrl; }
        public void setVideoUrl(String videoUrl) { this.videoUrl = videoUrl; }
        public Integer getDurationMinutes() { return durationMinutes; }
        public void setDurationMinutes(Integer durationMinutes) { this.durationMinutes = durationMinutes; }
        public Integer getOrderIndex() { return orderIndex; }
        public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
    }
}
