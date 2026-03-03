package com.example.lms.course_authoring.infrastructure.web;

import com.example.lms.course_authoring.application.usecase.AssignCourseTagsUseCase;
import com.example.lms.course_authoring.application.usecase.ManageCourseTagUseCase;
import com.example.lms.course_authoring.domain.model.CourseTag;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Tag(name = "Course Tags V3")
@RestController
@RequestMapping("/api/v3")
@RequiredArgsConstructor
public class CourseTagControllerV3 {

    private final ManageCourseTagUseCase tagUseCase;
    private final AssignCourseTagsUseCase assignUseCase;

    // --- Public ---

    @Operation(summary = "Get all tags")
    @GetMapping("/course-tags")
    public ResponseEntity<ApiResponse<List<CourseTagDTO>>> getAll() {
        var tags = tagUseCase.getAll();
        return ResponseEntity.ok(ApiResponse.success(tags.stream().map(this::toDTO).toList(), "Danh sach tags"));
    }

    // --- Admin ---

    @Operation(summary = "Get all tags (admin)")
    @GetMapping("/admin/course-tags")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<List<CourseTagDTO>>> getAllAdmin() {
        var tags = tagUseCase.getAll();
        return ResponseEntity.ok(ApiResponse.success(tags.stream().map(this::toDTO).toList(), "Tat ca tags"));
    }

    @Operation(summary = "Create tag")
    @PostMapping("/admin/course-tags")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<CourseTagDTO>> create(@Valid @RequestBody CreateTagRequest req) {
        var tag = tagUseCase.create(req.name(), req.slug());
        return ResponseEntity.ok(ApiResponse.success(toDTO(tag), "Da tao tag"));
    }

    @Operation(summary = "Rename tag")
    @PutMapping("/admin/course-tags/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<CourseTagDTO>> rename(@PathVariable UUID id, @Valid @RequestBody CreateTagRequest req) {
        var tag = tagUseCase.rename(id, req.name(), req.slug());
        return ResponseEntity.ok(ApiResponse.success(toDTO(tag), "Da cap nhat tag"));
    }

    @Operation(summary = "Delete tag")
    @DeleteMapping("/admin/course-tags/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        tagUseCase.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Da xoa tag"));
    }

    // --- Course tag assignment (Teacher) ---

    @Operation(summary = "Set course tags (max 5)")
    @PutMapping("/courses/{courseId}/tags")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> setCourseTags(@PathVariable UUID courseId, @RequestBody Set<UUID> tagIds) {
        assignUseCase.setTags(courseId, tagIds);
        return ResponseEntity.ok(ApiResponse.success(null, "Da cap nhat tags"));
    }

    // --- DTOs ---

    public record CourseTagDTO(String id, String name, String slug) {}

    public record CreateTagRequest(
            @NotBlank @Size(max = 100) String name,
            @NotBlank @Size(max = 100) String slug
    ) {}

    private CourseTagDTO toDTO(CourseTag t) {
        return new CourseTagDTO(t.getId().toString(), t.getName(), t.getSlug());
    }
}
