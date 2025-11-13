package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.entity.Section;
import com.example.lms.entity.User;
import com.example.lms.service.SectionService;
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
@Tag(name = "Section Management", description = "API quản lý sections trong khóa học")
@SecurityRequirement(name = "Bearer Authentication")
public class SectionController {

    private final SectionService sectionService;

    @PostMapping("/{courseId}/sections")
    @Operation(summary = "Tạo section mới", description = "Giảng viên tạo section mới trong khóa học của mình")
    public ResponseEntity<ApiResponse<SectionDetail>> createSection(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CreateSectionRequest request
    ) {
        try {
            Section section = sectionService.createSection(courseId, currentUser, request);
            SectionDetail sectionDetail = convertToSectionDetail(section);
            
            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(sectionDetail));
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

    @PutMapping("/sections/{sectionId}")
    @Operation(summary = "Cập nhật section", description = "Giảng viên cập nhật section trong khóa học của mình")
    public ResponseEntity<ApiResponse<SectionDetail>> updateSection(
            @PathVariable UUID sectionId,
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody UpdateSectionRequest request
    ) {
        try {
            Section section = sectionService.updateSection(sectionId, currentUser, request);
            SectionDetail sectionDetail = convertToSectionDetail(section);
            
            return ResponseEntity.ok(ApiResponse.success(sectionDetail));
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

    @DeleteMapping("/sections/{sectionId}")
    @Operation(summary = "Xóa section", description = "Giảng viên xóa section trong khóa học của mình")
    public ResponseEntity<ApiResponse<String>> deleteSection(
            @PathVariable UUID sectionId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            sectionService.deleteSection(sectionId, currentUser);
            return ResponseEntity.ok(ApiResponse.success("Section đã được xóa"));
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
    private SectionDetail convertToSectionDetail(Section section) {
        return SectionDetail.builder()
                .id(section.getId())
                .title(section.getTitle())
                .description(section.getDescription())
                .orderIndex(section.getOrderIndex())
                .courseId(section.getCourse().getId())
                .courseTitle(section.getCourse().getTitle())
        .lessonsCount(section.getLessons() == null ? 0 : section.getLessons().size())
                .createdAt(section.getCreatedAt())
                .updatedAt(section.getUpdatedAt())
                .build();
    }

    // DTOs
    public static class SectionDetail {
        private UUID id;
        private String title;
        private String description;
        private Integer orderIndex;
        private UUID courseId;
        private String courseTitle;
        private int lessonsCount;
        private Instant createdAt;
        private Instant updatedAt;

        public static SectionDetailBuilder builder() {
            return new SectionDetailBuilder();
        }

        public static class SectionDetailBuilder {
            private UUID id;
            private String title;
            private String description;
            private Integer orderIndex;
            private UUID courseId;
            private String courseTitle;
            private int lessonsCount;
            private Instant createdAt;
            private Instant updatedAt;

            public SectionDetailBuilder id(UUID id) { this.id = id; return this; }
            public SectionDetailBuilder title(String title) { this.title = title; return this; }
            public SectionDetailBuilder description(String description) { this.description = description; return this; }
            public SectionDetailBuilder orderIndex(Integer orderIndex) { this.orderIndex = orderIndex; return this; }
            public SectionDetailBuilder courseId(UUID courseId) { this.courseId = courseId; return this; }
            public SectionDetailBuilder courseTitle(String courseTitle) { this.courseTitle = courseTitle; return this; }
            public SectionDetailBuilder lessonsCount(int lessonsCount) { this.lessonsCount = lessonsCount; return this; }
            public SectionDetailBuilder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
            public SectionDetailBuilder updatedAt(Instant updatedAt) { this.updatedAt = updatedAt; return this; }

            public SectionDetail build() {
                SectionDetail section = new SectionDetail();
                section.id = this.id;
                section.title = this.title;
                section.description = this.description;
                section.orderIndex = this.orderIndex;
                section.courseId = this.courseId;
                section.courseTitle = this.courseTitle;
                section.lessonsCount = this.lessonsCount;
                section.createdAt = this.createdAt;
                section.updatedAt = this.updatedAt;
                return section;
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

    public static class CreateSectionRequest {
        @NotBlank(message = "Tiêu đề section không được để trống")
        @Size(max = 255, message = "Tiêu đề section không được vượt quá 255 ký tự")
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

    public static class UpdateSectionRequest {
        @Size(max = 255, message = "Tiêu đề section không được vượt quá 255 ký tự")
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