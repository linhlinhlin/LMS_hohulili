package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.entity.Chapter;
import com.example.lms.entity.User;
import com.example.lms.service.ChapterService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/courses")
@RequiredArgsConstructor
@Tag(name = "Chapter Management", description = "API quản lý chương (chapters) trong khóa học")
@SecurityRequirement(name = "Bearer Authentication")
public class ChapterController {

    private final ChapterService chapterService;

    @PostMapping("/{courseId}/chapters")
    @Operation(summary = "Tạo chapter mới", description = "Giảng viên tạo chapter mới trong khóa học của mình")
    public ResponseEntity<ApiResponse<ChapterDetail>> createChapter(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CreateChapterRequest request
    ) {
        try {
            Chapter chapter = chapterService.createChapter(courseId, currentUser, request);
            ChapterDetail chapterDetail = convertToChapterDetail(chapter);
            
            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(chapterDetail));
        } catch (RuntimeException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "Có lỗi xảy ra";
            if (msg.toLowerCase().contains("quyền")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error(msg));
            }
            if (msg.contains("Không tìm thấy")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(msg));
            }
            return ResponseEntity.badRequest().body(ApiResponse.error(msg));
        }
    }

    @PutMapping("/chapters/{chapterId}")
    @Operation(summary = "Cập nhật chapter", description = "Giảng viên cập nhật chapter trong khóa học của mình")
    public ResponseEntity<ApiResponse<ChapterDetail>> updateChapter(
            @PathVariable UUID chapterId,
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody UpdateChapterRequest request
    ) {
        try {
            Chapter chapter = chapterService.updateChapter(chapterId, currentUser, request);
            ChapterDetail chapterDetail = convertToChapterDetail(chapter);
            
            return ResponseEntity.ok(ApiResponse.success(chapterDetail));
        } catch (RuntimeException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "Có lỗi xảy ra";
            if (msg.toLowerCase().contains("quyền")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error(msg));
            }
            if (msg.contains("Không tìm thấy")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(msg));
            }
            return ResponseEntity.badRequest().body(ApiResponse.error(msg));
        }
    }

    @DeleteMapping("/chapters/{chapterId}")
    @Operation(summary = "Xóa chapter", description = "Giảng viên xóa chapter trong khóa học của mình")
    public ResponseEntity<ApiResponse<String>> deleteChapter(
            @PathVariable UUID chapterId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            chapterService.deleteChapter(chapterId, currentUser);
            return ResponseEntity.ok(ApiResponse.success("Chapter đã được xóa"));
        } catch (RuntimeException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "Có lỗi xảy ra";
            if (msg.toLowerCase().contains("quyền")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error(msg));
            }
            if (msg.contains("Không tìm thấy")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(msg));
            }
            return ResponseEntity.badRequest().body(ApiResponse.error(msg));
        }
    }

    // Helper method
    private ChapterDetail convertToChapterDetail(Chapter chapter) {
        return ChapterDetail.builder()
                .id(chapter.getId())
                .title(chapter.getTitle())
                .description(chapter.getDescription())
                .orderIndex(chapter.getOrderIndex())
                .courseId(chapter.getCourse().getId())
                .courseTitle(chapter.getCourse().getTitle())
                .lessonsCount(chapter.getLessons() == null ? 0 : chapter.getLessons().size())
                .createdAt(chapter.getCreatedAt())
                .updatedAt(chapter.getUpdatedAt())
                .build();
    }

    // DTOs
    public static class ChapterDetail {
        private UUID id;
        private String title;
        private String description;
        private Integer orderIndex;
        private UUID courseId;
        private String courseTitle;
        private int lessonsCount;
        private Instant createdAt;
        private Instant updatedAt;

        public static ChapterDetailBuilder builder() {
            return new ChapterDetailBuilder();
        }

        public static class ChapterDetailBuilder {
            private UUID id;
            private String title;
            private String description;
            private Integer orderIndex;
            private UUID courseId;
            private String courseTitle;
            private int lessonsCount;
            private Instant createdAt;
            private Instant updatedAt;

            public ChapterDetailBuilder id(UUID id) { this.id = id; return this; }
            public ChapterDetailBuilder title(String title) { this.title = title; return this; }
            public ChapterDetailBuilder description(String description) { this.description = description; return this; }
            public ChapterDetailBuilder orderIndex(Integer orderIndex) { this.orderIndex = orderIndex; return this; }
            public ChapterDetailBuilder courseId(UUID courseId) { this.courseId = courseId; return this; }
            public ChapterDetailBuilder courseTitle(String courseTitle) { this.courseTitle = courseTitle; return this; }
            public ChapterDetailBuilder lessonsCount(int lessonsCount) { this.lessonsCount = lessonsCount; return this; }
            public ChapterDetailBuilder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
            public ChapterDetailBuilder updatedAt(Instant updatedAt) { this.updatedAt = updatedAt; return this; }

            public ChapterDetail build() {
                ChapterDetail chapter = new ChapterDetail();
                chapter.id = this.id;
                chapter.title = this.title;
                chapter.description = this.description;
                chapter.orderIndex = this.orderIndex;
                chapter.courseId = this.courseId;
                chapter.courseTitle = this.courseTitle;
                chapter.lessonsCount = this.lessonsCount;
                chapter.createdAt = this.createdAt;
                chapter.updatedAt = this.updatedAt;
                return chapter;
            }
        }

        // Getters
        public UUID getId() { return id; }
        public String getTitle() { return title; }
        public String getDescription() { return description; }
        public Integer getOrderIndex() { return orderIndex; }
        public UUID getCourseId() { return courseId; }
        public String getCourseTitle() { return courseTitle; }
        public int getLessonsCount() { return lessonsCount; }
        public Instant getCreatedAt() { return createdAt; }
        public Instant getUpdatedAt() { return updatedAt; }
    }

    public static class CreateChapterRequest {
        @NotBlank(message = "Tiêu đề chapter không được để trống")
        @Size(max = 255, message = "Tiêu đề chapter không được vượt quá 255 ký tự")
        private String title;

        private String description;

        private Integer orderIndex;

        // Getters and Setters
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public Integer getOrderIndex() { return orderIndex; }
        public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
    }

    public static class UpdateChapterRequest {
        @Size(max = 255, message = "Tiêu đề chapter không được vượt quá 255 ký tự")
        private String title;

        private String description;

        private Integer orderIndex;

        // Getters and Setters
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public Integer getOrderIndex() { return orderIndex; }
        public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
    }
}
