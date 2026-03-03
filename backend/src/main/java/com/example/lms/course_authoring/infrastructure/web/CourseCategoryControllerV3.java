package com.example.lms.course_authoring.infrastructure.web;

import com.example.lms.course_authoring.application.usecase.ManageCourseCategoryUseCase;
import com.example.lms.course_authoring.domain.model.CourseCategory;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Course Categories V3")
@RestController
@RequestMapping("/api/v3")
@RequiredArgsConstructor
public class CourseCategoryControllerV3 {

    private final ManageCourseCategoryUseCase useCase;

    // --- Public (cached) ---

    @Operation(summary = "Get active category tree (public)")
    @GetMapping("/course-categories")
    @Cacheable("courseCategories")
    public ResponseEntity<ApiResponse<List<CourseCategoryDTO>>> getActiveTree() {
        var tree = useCase.getActiveTree();
        return ResponseEntity.ok(ApiResponse.success(tree.stream().map(this::toDTO).toList(), "Danh muc khoa hoc"));
    }

    // --- Admin CRUD ---

    @Operation(summary = "Get full category tree (admin)")
    @GetMapping("/admin/course-categories")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<List<CourseCategoryDTO>>> getFullTree() {
        var tree = useCase.getAllTree();
        return ResponseEntity.ok(ApiResponse.success(tree.stream().map(this::toDTO).toList(), "Tat ca danh muc"));
    }

    @Operation(summary = "Create category")
    @PostMapping("/admin/course-categories")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    @CacheEvict(value = "courseCategories", allEntries = true)
    public ResponseEntity<ApiResponse<CourseCategoryDTO>> create(@Valid @RequestBody CreateCategoryRequest req) {
        CourseCategory created;
        if (req.parentId() != null) {
            created = useCase.createSub(req.parentId(), req.code(), req.name(), req.slug(), req.description());
        } else {
            created = useCase.createRoot(req.code(), req.name(), req.slug(), req.prefix(), req.description(), req.icon());
        }
        return ResponseEntity.ok(ApiResponse.success(toDTO(created), "Da tao danh muc"));
    }

    @Operation(summary = "Update category")
    @PutMapping("/admin/course-categories/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    @CacheEvict(value = "courseCategories", allEntries = true)
    public ResponseEntity<ApiResponse<CourseCategoryDTO>> update(@PathVariable UUID id, @Valid @RequestBody UpdateCategoryRequest req) {
        var updated = useCase.update(id, req.name(), req.slug(), req.description(), req.icon(), req.prefix());
        return ResponseEntity.ok(ApiResponse.success(toDTO(updated), "Da cap nhat danh muc"));
    }

    @Operation(summary = "Deactivate category (soft delete)")
    @DeleteMapping("/admin/course-categories/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    @CacheEvict(value = "courseCategories", allEntries = true)
    public ResponseEntity<ApiResponse<Void>> deactivate(@PathVariable UUID id) {
        useCase.deactivate(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Da an danh muc"));
    }

    @Operation(summary = "Reorder categories")
    @PutMapping("/admin/course-categories/reorder")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    @CacheEvict(value = "courseCategories", allEntries = true)
    public ResponseEntity<ApiResponse<Void>> reorder(@RequestBody List<UUID> orderedIds) {
        useCase.reorder(orderedIds);
        return ResponseEntity.ok(ApiResponse.success(null, "Da sap xep lai"));
    }

    // --- DTOs ---

    public record CourseCategoryDTO(
            String id, String parentId, String code, String name, String slug,
            String prefix, String description, String icon, int sortOrder,
            boolean active, List<CourseCategoryDTO> children
    ) {}

    public record CreateCategoryRequest(
            UUID parentId,
            @NotBlank @Size(max = 50) String code,
            @NotBlank @Size(max = 255) String name,
            @NotBlank @Size(max = 100) String slug,
            @Size(max = 10) String prefix,
            String description,
            @Size(max = 50) String icon
    ) {}

    public record UpdateCategoryRequest(
            @NotBlank @Size(max = 255) String name,
            @NotBlank @Size(max = 100) String slug,
            String description,
            @Size(max = 50) String icon,
            @Size(max = 10) String prefix
    ) {}

    private CourseCategoryDTO toDTO(CourseCategory c) {
        return new CourseCategoryDTO(
                c.getId().toString(),
                c.getParentId() != null ? c.getParentId().toString() : null,
                c.getCode(), c.getName(), c.getSlug(),
                c.getPrefix(), c.getDescription(), c.getIcon(),
                c.getSortOrder(), c.isActive(),
                c.getChildren().stream().map(this::toDTO).toList()
        );
    }
}
