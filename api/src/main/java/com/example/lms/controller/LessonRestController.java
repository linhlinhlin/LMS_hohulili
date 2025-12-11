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
    @Operation(summary = "Danh sách lessons", description = "Liệt kê lessons theo chapterId hoặc courseId")
    public ResponseEntity<ApiResponse<List<LessonItem>>> listLessons(
            @RequestParam(required = false) UUID chapterId, // Renamed from sectionId
            @RequestParam(required = false) UUID courseId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            List<Lesson> lessons;
            if (chapterId != null) {
                 lessons = lessonRepository.findByChapterIdOrderByOrderIndexAsc(chapterId);
            } else if (courseId != null) {
                 lessons = lessonRepository.findByChapterCourseIdOrderByOrderIndexAsc(courseId);
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
    @Operation(summary = "Tạo lesson", description = "Tạo lesson trong một chapter") // Updated description
    public ResponseEntity<ApiResponse<LessonItem>> create(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CreateReq req
    ) {
        try {
            // Reuse service to validate permission and ordering
            // req.getSectionId() is actually ChapterId in the new hierarchy if correct
            Lesson lesson = lessonService.createLesson(req.getChapterId(), currentUser, toCreateLessonRequest(req));
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
        String content = null;
        String videoUrl = null;
        Integer duration = 0;
        
        if (l.getSections() != null && !l.getSections().isEmpty()) {
            com.example.lms.entity.Section firstSection = l.getSections().get(0);
            content = firstSection.getContent();
            videoUrl = firstSection.getVideoUrl();
            duration = firstSection.getDuration();
        }

        return LessonItem.builder()
                .id(l.getId())
                .title(l.getTitle())
                .description(l.getDescription())
                .content(content) // Fallback to first section
                .videoUrl(videoUrl)
                .durationMinutes(duration)
                .orderIndex(l.getOrderIndex())
                .lessonType(l.getLessonType() != null ? l.getLessonType().toString() : "LECTURE")
                .chapterId(l.getChapter().getId()) // Was sectionId
                .courseId(l.getChapter().getCourse().getId())
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
    public static class LessonItem {
        private UUID id;
        private String title;
        private String description;
        private String content;
        private String videoUrl;
        private Integer durationMinutes;
        private Integer orderIndex;
        private String lessonType;

        private UUID chapterId; // Renamed from sectionId
        private UUID courseId;
        private Instant createdAt;
        private Instant updatedAt;

        public LessonItem() {}

        public LessonItem(UUID id, String title, String description, String content, String videoUrl, Integer durationMinutes, Integer orderIndex, String lessonType, UUID chapterId, UUID courseId, Instant createdAt, Instant updatedAt) {
            this.id = id;
            this.title = title;
            this.description = description;
            this.content = content;
            this.videoUrl = videoUrl;
            this.durationMinutes = durationMinutes;
            this.orderIndex = orderIndex;
            this.lessonType = lessonType;
            this.chapterId = chapterId;
            this.courseId = courseId;
            this.createdAt = createdAt;
            this.updatedAt = updatedAt;
        }

        public UUID getId() { return id; } public void setId(UUID id) { this.id = id; }
        public String getTitle() { return title; } public void setTitle(String title) { this.title = title; }
        public String getDescription() { return description; } public void setDescription(String description) { this.description = description; }
        public String getContent() { return content; } public void setContent(String content) { this.content = content; }
        public String getVideoUrl() { return videoUrl; } public void setVideoUrl(String videoUrl) { this.videoUrl = videoUrl; }
        public Integer getDurationMinutes() { return durationMinutes; } public void setDurationMinutes(Integer durationMinutes) { this.durationMinutes = durationMinutes; }
        public Integer getOrderIndex() { return orderIndex; } public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
        public String getLessonType() { return lessonType; } public void setLessonType(String lessonType) { this.lessonType = lessonType; }
        public UUID getChapterId() { return chapterId; } public void setChapterId(UUID chapterId) { this.chapterId = chapterId; }
        public UUID getCourseId() { return courseId; } public void setCourseId(UUID courseId) { this.courseId = courseId; }
        public Instant getCreatedAt() { return createdAt; } public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
        public Instant getUpdatedAt() { return updatedAt; } public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

        public static LessonItemBuilder builder() { return new LessonItemBuilder(); }
        public static class LessonItemBuilder {
            private LessonItem item = new LessonItem();
            public LessonItemBuilder id(UUID id) { item.setId(id); return this; }
            public LessonItemBuilder title(String t) { item.setTitle(t); return this; }
            public LessonItemBuilder description(String d) { item.setDescription(d); return this; }
            public LessonItemBuilder content(String c) { item.setContent(c); return this; }
            public LessonItemBuilder videoUrl(String v) { item.setVideoUrl(v); return this; }
            public LessonItemBuilder durationMinutes(Integer d) { item.setDurationMinutes(d); return this; }
            public LessonItemBuilder orderIndex(Integer o) { item.setOrderIndex(o); return this; }
            public LessonItemBuilder lessonType(String l) { item.setLessonType(l); return this; }
            public LessonItemBuilder chapterId(UUID c) { item.setChapterId(c); return this; }
            public LessonItemBuilder courseId(UUID c) { item.setCourseId(c); return this; }
            public LessonItemBuilder createdAt(Instant c) { item.setCreatedAt(c); return this; }
            public LessonItemBuilder updatedAt(Instant u) { item.setUpdatedAt(u); return this; }
            public LessonItem build() { return item; }
        }
    }

    public static class CreateReq {
        @NotNull
        private UUID chapterId; // Renamed from sectionId
        @NotBlank
        @Size(max = 255)
        private String title;
        private String description;
        private String content;
        private String videoUrl;
        private Integer durationMinutes;
        private Integer orderIndex;
        public UUID getChapterId() { return chapterId; }
        public void setChapterId(UUID chapterId) { this.chapterId = chapterId; }
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
