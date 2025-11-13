package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.entity.Section;
import com.example.lms.entity.User;
import com.example.lms.repository.SectionRepository;
import com.example.lms.service.SectionService;
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
@RequestMapping("/api/v1/sections")
@RequiredArgsConstructor
@Tag(name = "Sections (flat)", description = "API quản lý sections theo REST phẳng")
@SecurityRequirement(name = "Bearer Authentication")
public class SectionRestController {

    private final SectionRepository sectionRepository;
    private final SectionService sectionService;

    @GetMapping
    @Operation(summary = "Danh sách sections", description = "Liệt kê sections theo courseId (bắt buộc)")
    public ResponseEntity<ApiResponse<List<SectionItem>>> listSections(
            @RequestParam @NotNull UUID courseId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            List<Section> sections = sectionRepository.findByCourseIdOrderByOrderIndexAsc(courseId);
            List<SectionItem> items = sections.stream().map(this::toItem).toList();
            return ResponseEntity.ok(ApiResponse.success(items));
        } catch (RuntimeException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "Có lỗi xảy ra";
            return ResponseEntity.badRequest().body(ApiResponse.error(msg));
        }
    }

    @PostMapping
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Tạo section", description = "Tạo section theo courseId")
    public ResponseEntity<ApiResponse<SectionItem>> create(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CreateReq req
    ) {
        try {
            Section section = sectionService.createSection(req.getCourseId(), currentUser, toCreateSectionRequest(req));
            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(toItem(section)));
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
    @Operation(summary = "Cập nhật section")
    public ResponseEntity<ApiResponse<SectionItem>> update(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody UpdateReq req
    ) {
        try {
            Section section = sectionService.updateSection(id, currentUser, toUpdateSectionRequest(req));
            return ResponseEntity.ok(ApiResponse.success(toItem(section)));
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
    @Operation(summary = "Xóa section")
    public ResponseEntity<ApiResponse<String>> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            sectionService.deleteSection(id, currentUser);
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

    private SectionItem toItem(Section s) {
        return SectionItem.builder()
                .id(s.getId())
                .title(s.getTitle())
                .description(s.getDescription())
                .orderIndex(s.getOrderIndex())
                .courseId(s.getCourse().getId())
                .createdAt(s.getCreatedAt())
                .updatedAt(s.getUpdatedAt())
                .build();
    }

    private com.example.lms.controller.SectionController.CreateSectionRequest toCreateSectionRequest(CreateReq req) {
        com.example.lms.controller.SectionController.CreateSectionRequest r = new com.example.lms.controller.SectionController.CreateSectionRequest();
        r.setTitle(req.getTitle());
        r.setDescription(req.getDescription());
        r.setOrderIndex(req.getOrderIndex());
        return r;
    }

    private com.example.lms.controller.SectionController.UpdateSectionRequest toUpdateSectionRequest(UpdateReq req) {
        com.example.lms.controller.SectionController.UpdateSectionRequest r = new com.example.lms.controller.SectionController.UpdateSectionRequest();
        r.setTitle(req.getTitle());
        r.setDescription(req.getDescription());
        r.setOrderIndex(req.getOrderIndex());
        return r;
    }

    // DTOs
    @lombok.Builder
    @lombok.Data
    public static class SectionItem {
        private UUID id;
        private String title;
        private String description;
        private Integer orderIndex;
        private UUID courseId;
        private Instant createdAt;
        private Instant updatedAt;
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
