package com.example.lms.course_authoring.infrastructure.web;

import com.example.lms.course_authoring.application.usecase.ManageCourseCategoryUseCase;
import com.example.lms.course_authoring.application.usecase.MoveCategoryUseCase;
import com.example.lms.course_authoring.domain.model.CourseCategory;
import jakarta.validation.constraints.Min;
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
import java.util.Map;
import java.util.UUID;

@Tag(name = "Course Categories V3")
@RestController
@RequestMapping("/api/v3")
@RequiredArgsConstructor
public class CourseCategoryControllerV3 {

    private final ManageCourseCategoryUseCase useCase;
    private final MoveCategoryUseCase moveCategoryUseCase;

    // --- Public (cached) ---

    @Operation(summary = "Get active category tree (public)")
    @GetMapping("/course-categories")
    @Cacheable("courseCategories")
    public ResponseEntity<ApiResponse<List<CourseCategoryDTO>>> getActiveTree() {
        var tree = useCase.getActiveTree();
        // Public listing surfaces the courseCount badge — same source of truth
        // as the admin tree (issue #189, F-CAT2).
        Map<UUID, Long> counts = useCase.getApprovedCourseCountsByCategory();
        return ResponseEntity.ok(ApiResponse.success(
                tree.stream().map(c -> toDTO(c, counts)).toList(),
                "Danh muc khoa hoc"));
    }

    // --- Admin CRUD ---

    @Operation(summary = "Get full category tree (admin)")
    @GetMapping("/admin/course-categories")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<List<CourseCategoryDTO>>> getFullTree() {
        var tree = useCase.getAllTree();
        Map<UUID, Long> counts = useCase.getApprovedCourseCountsByCategory();
        return ResponseEntity.ok(ApiResponse.success(
                tree.stream().map(c -> toDTO(c, counts)).toList(),
                "Tat ca danh muc"));
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
        // Newly-created category has no APPROVED courses yet → 0 by default.
        return ResponseEntity.ok(ApiResponse.success(toDTO(created, Map.of()), "Da tao danh muc"));
    }

    @Operation(summary = "Update category")
    @PutMapping("/admin/course-categories/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    @CacheEvict(value = "courseCategories", allEntries = true)
    public ResponseEntity<ApiResponse<CourseCategoryDTO>> update(@PathVariable UUID id, @Valid @RequestBody UpdateCategoryRequest req) {
        var updated = useCase.update(id, req.name(), req.slug(), req.description(), req.icon(), req.prefix());
        Map<UUID, Long> counts = useCase.getApprovedCourseCountsByCategory();
        return ResponseEntity.ok(ApiResponse.success(toDTO(updated, counts), "Da cap nhat danh muc"));
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

    /**
     * Drag-drop reorder + reparent endpoint (issue #199, F-CAT1).
     *
     * <p>Single endpoint covers all four FE drag operations:
     * <ul>
     *   <li>Reorder within same level (parent unchanged, sortOrder changes).</li>
     *   <li>Promote sub-category to root ({@code newParentId == null}).</li>
     *   <li>Demote root to sub-category (only if root has no children).</li>
     *   <li>Reparent sub-category to a different root.</li>
     * </ul>
     *
     * <p>Returns the full updated tree so the FE can replace its local state
     * without an extra round-trip.
     */
    @Operation(summary = "Move (reorder + reparent) a category")
    @PatchMapping("/admin/course-categories/{id}/move")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    @CacheEvict(value = "courseCategories", allEntries = true)
    public ResponseEntity<ApiResponse<List<CourseCategoryDTO>>> move(
            @PathVariable UUID id,
            @Valid @RequestBody MoveCategoryRequest req) {
        var tree = moveCategoryUseCase.execute(id, req.newParentId(), req.newSortOrder());
        Map<UUID, Long> counts = useCase.getApprovedCourseCountsByCategory();
        return ResponseEntity.ok(ApiResponse.success(
                tree.stream().map(c -> toDTO(c, counts)).toList(),
                "Da chuyen danh muc"));
    }

    // --- DTOs ---

    /**
     * Category projection returned to the admin UI.
     *
     * <p>{@code courseCount} (issue #189, F-CAT2) is the number of APPROVED
     * courses directly assigned to this category. Subcategory counts are NOT
     * rolled up into the parent — each level reports its own count, mirroring
     * Notion / Strapi behavior. The FE can sum the children itself if a
     * "total under this branch" badge is needed.
     */
    public record CourseCategoryDTO(
            String id, String parentId, String code, String name, String slug,
            String prefix, String description, String icon, int sortOrder,
            boolean active, long courseCount, List<CourseCategoryDTO> children
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

    /**
     * Drag-drop move payload (issue #199, F-CAT1). {@code newParentId} is
     * nullable — null means promote to root.
     */
    public record MoveCategoryRequest(
            UUID newParentId,
            @Min(0) int newSortOrder
    ) {}

    private CourseCategoryDTO toDTO(CourseCategory c, Map<UUID, Long> counts) {
        long count = c.getId() != null ? counts.getOrDefault(c.getId(), 0L) : 0L;
        return new CourseCategoryDTO(
                c.getId().toString(),
                c.getParentId() != null ? c.getParentId().toString() : null,
                c.getCode(), c.getName(), c.getSlug(),
                c.getPrefix(), c.getDescription(), c.getIcon(),
                c.getSortOrder(), c.isActive(), count,
                c.getChildren().stream().map(child -> toDTO(child, counts)).toList()
        );
    }
}
