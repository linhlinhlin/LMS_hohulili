package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.entity.Chapter;
import com.example.lms.entity.User;
import com.example.lms.repository.ChapterRepository;
import com.example.lms.service.ChapterService;
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
@RequestMapping("/api/v1/chapters") // Flat API
@RequiredArgsConstructor
@Tag(name = "Chapters (flat)", description = "API quản lý chapters theo REST phẳng")
@SecurityRequirement(name = "Bearer Authentication")
public class ChapterRestController {

    private final ChapterRepository chapterRepository;
    private final ChapterService chapterService;
    private final com.example.lms.repository.LessonRepository lessonRepository;

    @GetMapping
    @Operation(summary = "Danh sách chapters", description = "Liệt kê chapters theo courseId (bắt buộc)")
    public ResponseEntity<ApiResponse<List<ChapterItem>>> listChapters(
            @RequestParam @NotNull UUID courseId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            List<Chapter> chapters = chapterRepository.findByCourseIdOrderByOrderIndexAsc(courseId);
            List<ChapterItem> items = chapters.stream().map(this::toItem).toList();
            return ResponseEntity.ok(ApiResponse.success(items));
        } catch (RuntimeException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "Có lỗi xảy ra";
            return ResponseEntity.badRequest().body(ApiResponse.error(msg));
        }
    }

    @PostMapping
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Tạo chapter", description = "Tạo chapter theo courseId")
    public ResponseEntity<ApiResponse<ChapterItem>> create(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CreateReq req
    ) {
        try {
            // Reusing ChapterController.CreateChapterRequest logic via service adapter or manually
            // Since ChapterService.createChapter expects CreateChapterRequest (nested DTO), construct it.
            com.example.lms.controller.ChapterController.CreateChapterRequest serviceReq = new com.example.lms.controller.ChapterController.CreateChapterRequest();
            serviceReq.setTitle(req.getTitle());
            serviceReq.setDescription(req.getDescription());
            serviceReq.setOrderIndex(req.getOrderIndex());
            
            Chapter chapter = chapterService.createChapter(req.getCourseId(), currentUser, serviceReq);
            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(toItem(chapter)));
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
    @Operation(summary = "Cập nhật chapter")
    public ResponseEntity<ApiResponse<ChapterItem>> update(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody UpdateReq req
    ) {
        try {
            com.example.lms.controller.ChapterController.UpdateChapterRequest serviceReq = new com.example.lms.controller.ChapterController.UpdateChapterRequest();
            serviceReq.setTitle(req.getTitle());
            serviceReq.setDescription(req.getDescription());
            serviceReq.setOrderIndex(req.getOrderIndex());

            Chapter chapter = chapterService.updateChapter(id, currentUser, serviceReq);
            return ResponseEntity.ok(ApiResponse.success(toItem(chapter)));
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
    @Operation(summary = "Xóa chapter")
    public ResponseEntity<ApiResponse<String>> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            chapterService.deleteChapter(id, currentUser);
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

    private ChapterItem toItem(Chapter s) {
        long lessonsCount = lessonRepository.countByChapterId(s.getId());
        return ChapterItem.builder()
                .id(s.getId())
                .title(s.getTitle())
                .description(s.getDescription())
                .orderIndex(s.getOrderIndex())
                .courseId(s.getCourse().getId())
                .lessonsCount((int) lessonsCount)
                .createdAt(s.getCreatedAt())
                .updatedAt(s.getUpdatedAt())
                .build();
    }

    // DTOs
    public static class ChapterItem {
        private UUID id;
        private String title;
        private String description;
        private Integer orderIndex;
        private UUID courseId;
        private int lessonsCount;
        private Instant createdAt;
        private Instant updatedAt;

        // Manual Getters/Setters
        public UUID getId() { return id; }
        public void setId(UUID id) { this.id = id; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public Integer getOrderIndex() { return orderIndex; }
        public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
        public UUID getCourseId() { return courseId; }
        public void setCourseId(UUID courseId) { this.courseId = courseId; }
        public int getLessonsCount() { return lessonsCount; }
        public void setLessonsCount(int lessonsCount) { this.lessonsCount = lessonsCount; }
        public Instant getCreatedAt() { return createdAt; }
        public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
        public Instant getUpdatedAt() { return updatedAt; }
        public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

        public static ChapterItemBuilder builder() { return new ChapterItemBuilder(); }
        public static class ChapterItemBuilder {
            private ChapterItem item = new ChapterItem();
            public ChapterItemBuilder id(UUID i) { item.setId(i); return this; }
            public ChapterItemBuilder title(String t) { item.setTitle(t); return this; }
            public ChapterItemBuilder description(String d) { item.setDescription(d); return this; }
            public ChapterItemBuilder orderIndex(Integer o) { item.setOrderIndex(o); return this; }
            public ChapterItemBuilder courseId(UUID c) { item.setCourseId(c); return this; }
            public ChapterItemBuilder lessonsCount(int l) { item.setLessonsCount(l); return this; }
            public ChapterItemBuilder createdAt(Instant c) { item.setCreatedAt(c); return this; }
            public ChapterItemBuilder updatedAt(Instant u) { item.setUpdatedAt(u); return this; }
            public ChapterItem build() { return item; }
        }
    }

    public static class CreateReq {
        @NotNull
        private UUID courseId;
        @NotBlank
        @Size(max = 255)
        private String title;
        private String description;
        private Integer orderIndex;
        public UUID getCourseId() { return courseId; }
        public void setCourseId(UUID courseId) { this.courseId = courseId; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public Integer getOrderIndex() { return orderIndex; }
        public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
    }

    public static class UpdateReq {
        @Size(max = 255)
        private String title;
        private String description;
        private Integer orderIndex;
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public Integer getOrderIndex() { return orderIndex; }
        public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
    }
}
