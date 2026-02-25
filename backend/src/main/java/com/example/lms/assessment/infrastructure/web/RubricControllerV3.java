package com.example.lms.assessment.infrastructure.web;

import com.example.lms.assessment.application.usecase.RubricCrudUseCase;
import com.example.lms.assessment.domain.model.Rubric;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@Tag(name = "Rubric V3", description = "Rubric CRUD endpoints for grading")
@RestController
@RequestMapping("/api/v3/rubrics")
@RequiredArgsConstructor
public class RubricControllerV3 {

    private final RubricCrudUseCase rubricCrudUseCase;

    @Operation(summary = "Create a new rubric")
    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createRubric(
            @AuthenticationPrincipal UserJpaEntity user,
            @Valid @RequestBody CreateRubricRequest request) {

        List<Rubric.Criterion> criteria = mapCriteria(request.criteria());

        var command = new RubricCrudUseCase.CreateRubricCommand(
                user.getId(), request.title(), request.description(),
                request.maxPoints(), criteria);

        Rubric rubric = rubricCrudUseCase.create(command);
        return ResponseEntity.ok(ApiResponse.success(toResponse(rubric), "Rubric đã được tạo"));
    }

    @Operation(summary = "List my rubrics")
    @GetMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listRubrics(
            @AuthenticationPrincipal UserJpaEntity user) {

        List<Rubric> rubrics = rubricCrudUseCase.findByTeacher(user.getId());
        List<Map<String, Object>> result = rubrics.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(result, "Danh sách rubric"));
    }

    @Operation(summary = "Get rubric by ID")
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRubric(
            @AuthenticationPrincipal UserJpaEntity user,
            @PathVariable UUID id) {
        Rubric rubric = rubricCrudUseCase.findById(id);
        verifyRubricAccess(rubric, user);
        return ResponseEntity.ok(ApiResponse.success(toResponse(rubric), "Đã tải rubric"));
    }

    @Operation(summary = "Update a rubric")
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateRubric(
            @AuthenticationPrincipal UserJpaEntity user,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateRubricRequest request) {

        List<Rubric.Criterion> criteria = mapCriteria(request.criteria());
        boolean isAdmin = isAdminRole(user);

        var command = new RubricCrudUseCase.UpdateRubricCommand(
                request.title(), request.description(), request.maxPoints(), criteria);

        Rubric rubric = rubricCrudUseCase.update(id, user.getId(), isAdmin, command);
        return ResponseEntity.ok(ApiResponse.success(toResponse(rubric), "Rubric đã được cập nhật"));
    }

    @Operation(summary = "Delete a rubric")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteRubric(
            @AuthenticationPrincipal UserJpaEntity user,
            @PathVariable UUID id) {

        boolean isAdmin = isAdminRole(user);
        rubricCrudUseCase.delete(id, user.getId(), isAdmin);
        return ResponseEntity.ok(ApiResponse.success(null, "Rubric đã được xóa"));
    }

    @Operation(summary = "Assign rubric to an assignment")
    @PostMapping("/{id}/assign/{assignmentId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> assignRubric(
            @AuthenticationPrincipal UserJpaEntity user,
            @PathVariable UUID id,
            @PathVariable UUID assignmentId) {

        boolean isAdmin = isAdminRole(user);
        Rubric rubric = rubricCrudUseCase.assignToAssignment(id, assignmentId, user.getId(), isAdmin);
        return ResponseEntity.ok(ApiResponse.success(toResponse(rubric), "Rubric đã được gán cho bài tập"));
    }

    @Operation(summary = "Unassign rubric from an assignment")
    @DeleteMapping("/assignment/{assignmentId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> unassignRubric(
            @AuthenticationPrincipal UserJpaEntity user,
            @PathVariable UUID assignmentId) {

        boolean isAdmin = isAdminRole(user);
        rubricCrudUseCase.unassignFromAssignment(assignmentId, user.getId(), isAdmin);
        return ResponseEntity.ok(ApiResponse.success(null, "Rubric đã được gỡ khỏi bài tập"));
    }

    @Operation(summary = "Get rubric for an assignment")
    @GetMapping("/assignment/{assignmentId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN', 'STUDENT')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAssignmentRubric(
            @AuthenticationPrincipal UserJpaEntity user,
            @PathVariable UUID assignmentId) {

        Rubric rubric = rubricCrudUseCase.findByAssignment(assignmentId);
        // Students can view rubrics for their assignments (grading criteria transparency)
        // Teachers must own the rubric; ADMIN/ORG_ADMIN bypass
        if (user.getRole() != UserJpaEntity.UserRole.STUDENT) {
            verifyRubricAccess(rubric, user);
        }
        return ResponseEntity.ok(ApiResponse.success(toResponse(rubric), "Đã tải rubric của bài tập"));
    }

    // ============================================================
    // Request DTOs
    // ============================================================

    record CreateRubricRequest(
            @NotBlank String title,
            String description,
            Double maxPoints,
            @NotEmpty List<CriterionRequest> criteria
    ) {}

    record UpdateRubricRequest(
            @NotBlank String title,
            String description,
            Double maxPoints,
            @NotEmpty List<CriterionRequest> criteria
    ) {}

    record CriterionRequest(
            @NotBlank String name,
            String description,
            Double maxPoints,
            List<LevelRequest> levels
    ) {}

    record LevelRequest(
            @NotBlank String label,
            String description,
            Double points
    ) {}

    // ============================================================
    // Helpers
    // ============================================================

    private List<Rubric.Criterion> mapCriteria(List<CriterionRequest> requests) {
        if (requests == null) return List.of();
        return requests.stream()
                .map(cr -> new Rubric.Criterion(
                        cr.name(), cr.description(), cr.maxPoints(),
                        cr.levels() != null ? cr.levels().stream()
                                .map(lr -> new Rubric.Level(lr.label(), lr.description(), lr.points()))
                                .collect(Collectors.toList()) : List.of()))
                .collect(Collectors.toList());
    }

    private Map<String, Object> toResponse(Rubric rubric) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", rubric.getId().toString());
        map.put("teacherId", rubric.getTeacherId() != null ? rubric.getTeacherId().toString() : null);
        map.put("assignmentId", rubric.getAssignmentId() != null ? rubric.getAssignmentId().toString() : null);
        map.put("title", rubric.getTitle());
        map.put("description", rubric.getDescription());
        map.put("maxPoints", rubric.getMaxPoints());
        map.put("criteria", rubric.getCriteria().stream().map(c -> {
            Map<String, Object> cm = new LinkedHashMap<>();
            cm.put("name", c.name());
            cm.put("description", c.description());
            cm.put("maxPoints", c.maxPoints());
            cm.put("levels", c.levels().stream().map(l -> {
                Map<String, Object> lm = new LinkedHashMap<>();
                lm.put("label", l.label());
                lm.put("description", l.description());
                lm.put("points", l.points());
                return lm;
            }).collect(Collectors.toList()));
            return cm;
        }).collect(Collectors.toList()));
        map.put("createdAt", rubric.getCreatedAt() != null ? rubric.getCreatedAt().toString() : null);
        map.put("updatedAt", rubric.getUpdatedAt() != null ? rubric.getUpdatedAt().toString() : null);
        return map;
    }

    private boolean isAdminRole(UserJpaEntity user) {
        return user.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_ORG_ADMIN"));
    }

    private void verifyRubricAccess(Rubric rubric, UserJpaEntity user) {
        if (isAdminRole(user)) return;
        if (rubric.getTeacherId() == null || !rubric.getTeacherId().equals(user.getId())) {
            throw new org.springframework.security.access.AccessDeniedException("Bạn không sở hữu rubric này");
        }
    }
}
