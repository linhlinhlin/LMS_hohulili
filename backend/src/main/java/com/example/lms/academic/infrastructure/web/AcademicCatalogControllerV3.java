package com.example.lms.academic.infrastructure.web;

import com.example.lms.academic.application.dto.AcademicCatalogDtos.*;
import com.example.lms.academic.application.usecase.ManageAcademicCatalogUseCase;
import com.example.lms.identity.application.usecase.ManageOrganizationCapabilitiesUseCase;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Objects;
import java.util.UUID;

@RestController
@RequestMapping("/api/v3/organizations/{orgId}/academic")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "Academic Catalog", description = "Organization-scoped academic structure")
@PreAuthorize("hasAnyRole('ADMIN','ORG_ADMIN')")
public class AcademicCatalogControllerV3 {
    private static final String ACADEMIC_CATALOG = "academic_catalog";
    private static final String CURRICULUM_PLAN = "curriculum_plan";
    private static final String LEARNING_PACKAGES = "learning_packages";

    private final ManageAcademicCatalogUseCase useCase;
    private final ManageOrganizationCapabilitiesUseCase capabilitiesUseCase;

    @GetMapping("/catalog")
    @Operation(summary = "Get academic catalog for an organization")
    public ResponseEntity<ApiResponse<CatalogResponse>> getCatalog(
            @PathVariable UUID orgId,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAccess(currentUser, orgId);
        requireCapabilities(orgId, ACADEMIC_CATALOG);
        return ResponseEntity.ok(ApiResponse.success(useCase.getCatalog(orgId)));
    }

    @PostMapping("/departments")
    @Operation(summary = "Create academic department")
    public ResponseEntity<ApiResponse<DepartmentResponse>> createDepartment(
            @PathVariable UUID orgId,
            @Valid @RequestBody CreateDepartmentCommand command,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAccess(currentUser, orgId);
        requireCapabilities(orgId, ACADEMIC_CATALOG);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(useCase.createDepartment(orgId, command)));
    }

    @PostMapping("/programs")
    @Operation(summary = "Create academic program")
    public ResponseEntity<ApiResponse<ProgramResponse>> createProgram(
            @PathVariable UUID orgId,
            @Valid @RequestBody CreateProgramCommand command,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAccess(currentUser, orgId);
        requireCapabilities(orgId, ACADEMIC_CATALOG);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(useCase.createProgram(orgId, command)));
    }

    @PostMapping("/cohorts")
    @Operation(summary = "Create academic cohort")
    public ResponseEntity<ApiResponse<CohortResponse>> createCohort(
            @PathVariable UUID orgId,
            @Valid @RequestBody CreateCohortCommand command,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAccess(currentUser, orgId);
        requireCapabilities(orgId, ACADEMIC_CATALOG);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(useCase.createCohort(orgId, command)));
    }

    @PostMapping("/class-groups")
    @Operation(summary = "Create academic class group")
    public ResponseEntity<ApiResponse<ClassGroupResponse>> createClassGroup(
            @PathVariable UUID orgId,
            @Valid @RequestBody CreateClassGroupCommand command,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAccess(currentUser, orgId);
        requireCapabilities(orgId, ACADEMIC_CATALOG);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(useCase.createClassGroup(orgId, command)));
    }

    @PostMapping("/class-group-memberships")
    @Operation(summary = "Assign a student to an academic class group")
    public ResponseEntity<ApiResponse<ClassGroupMembershipResponse>> assignClassGroupMembership(
            @PathVariable UUID orgId,
            @Valid @RequestBody CreateClassGroupMembershipCommand command,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAccess(currentUser, orgId);
        requireCapabilities(orgId, ACADEMIC_CATALOG);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(useCase.assignClassGroupMembership(orgId, command)));
    }

    @PatchMapping("/class-group-memberships/{membershipId}/transfer")
    @Operation(summary = "Transfer an active student membership to another academic class group")
    public ResponseEntity<ApiResponse<ClassGroupMembershipResponse>> transferClassGroupMembership(
            @PathVariable UUID orgId,
            @PathVariable UUID membershipId,
            @Valid @RequestBody TransferClassGroupMembershipCommand command,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAccess(currentUser, orgId);
        requireCapabilities(orgId, ACADEMIC_CATALOG);
        return ResponseEntity.ok(ApiResponse.success(useCase.transferClassGroupMembership(orgId, membershipId, command)));
    }

    @PostMapping("/class-group-memberships/bulk-import")
    @Operation(summary = "Bulk import students into an academic class group by email")
    public ResponseEntity<ApiResponse<BulkClassGroupRosterResponse>> importClassGroupRoster(
            @PathVariable UUID orgId,
            @Valid @RequestBody BulkClassGroupRosterCommand command,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAccess(currentUser, orgId);
        requireCapabilities(orgId, ACADEMIC_CATALOG);
        return ResponseEntity.ok(ApiResponse.success(useCase.importClassGroupRoster(orgId, command)));
    }

    @PostMapping("/subjects")
    @Operation(summary = "Create academic subject")
    public ResponseEntity<ApiResponse<SubjectResponse>> createSubject(
            @PathVariable UUID orgId,
            @Valid @RequestBody CreateSubjectCommand command,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAccess(currentUser, orgId);
        requireCapabilities(orgId, ACADEMIC_CATALOG);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(useCase.createSubject(orgId, command)));
    }

    @PostMapping("/subject-courses")
    @Operation(summary = "Link an academic subject to an LMS course")
    public ResponseEntity<ApiResponse<SubjectCourseResponse>> linkSubjectCourse(
            @PathVariable UUID orgId,
            @Valid @RequestBody LinkSubjectCourseCommand command,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAccess(currentUser, orgId);
        requireCapabilities(orgId, ACADEMIC_CATALOG);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(useCase.linkSubjectCourse(orgId, command)));
    }

    @PostMapping("/terms")
    @Operation(summary = "Create academic term")
    public ResponseEntity<ApiResponse<TermResponse>> createTerm(
            @PathVariable UUID orgId,
            @Valid @RequestBody CreateTermCommand command,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAccess(currentUser, orgId);
        requireCapabilities(orgId, ACADEMIC_CATALOG, CURRICULUM_PLAN);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(useCase.createTerm(orgId, command)));
    }

    @PostMapping("/curriculum-plans")
    @Operation(summary = "Create curriculum plan")
    public ResponseEntity<ApiResponse<CurriculumPlanResponse>> createCurriculumPlan(
            @PathVariable UUID orgId,
            @Valid @RequestBody CreateCurriculumPlanCommand command,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAccess(currentUser, orgId);
        requireCapabilities(orgId, ACADEMIC_CATALOG, CURRICULUM_PLAN);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(useCase.createCurriculumPlan(orgId, command)));
    }

    @PostMapping("/curriculum-subjects")
    @Operation(summary = "Add subject to curriculum plan")
    public ResponseEntity<ApiResponse<CurriculumSubjectResponse>> addCurriculumSubject(
            @PathVariable UUID orgId,
            @Valid @RequestBody AddCurriculumSubjectCommand command,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAccess(currentUser, orgId);
        requireCapabilities(orgId, ACADEMIC_CATALOG, CURRICULUM_PLAN);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(useCase.addCurriculumSubject(orgId, command)));
    }

    @PostMapping("/learning-packages")
    @Operation(summary = "Create learning package")
    public ResponseEntity<ApiResponse<LearningPackageResponse>> createLearningPackage(
            @PathVariable UUID orgId,
            @Valid @RequestBody CreateLearningPackageCommand command,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAccess(currentUser, orgId);
        requireCapabilities(orgId, ACADEMIC_CATALOG, LEARNING_PACKAGES);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(useCase.createLearningPackage(orgId, command)));
    }

    @PostMapping("/learning-package-items")
    @Operation(summary = "Add subject or course to learning package")
    public ResponseEntity<ApiResponse<LearningPackageItemResponse>> addLearningPackageItem(
            @PathVariable UUID orgId,
            @Valid @RequestBody AddLearningPackageItemCommand command,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAccess(currentUser, orgId);
        requireCapabilities(orgId, ACADEMIC_CATALOG, LEARNING_PACKAGES);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(useCase.addLearningPackageItem(orgId, command)));
    }

    @PostMapping("/learning-package-class-targets")
    @Operation(summary = "Map a package course to a concrete learning class")
    public ResponseEntity<ApiResponse<LearningPackageClassTargetResponse>> createLearningPackageClassTarget(
            @PathVariable UUID orgId,
            @Valid @RequestBody CreateLearningPackageClassTargetCommand command,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAccess(currentUser, orgId);
        requireCapabilities(orgId, ACADEMIC_CATALOG, LEARNING_PACKAGES);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(useCase.createLearningPackageClassTarget(orgId, command)));
    }

    private void verifyOrgAccess(UserJpaEntity currentUser, UUID orgId) {
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication is required");
        }
        if (currentUser.getRole() == UserJpaEntity.UserRole.ADMIN) {
            return;
        }
        if (currentUser.getRole() == UserJpaEntity.UserRole.ORG_ADMIN
                && Objects.equals(currentUser.getOrganizationId(), orgId)) {
            return;
        }
        throw new AccessDeniedException("No access to this organization's academic catalog");
    }

    private void requireCapabilities(UUID orgId, String... keys) {
        for (String key : keys) {
            if (!capabilitiesUseCase.isEnabled(orgId, key)) {
                throw new AccessDeniedException("Organization capability is disabled: " + key);
            }
        }
    }
}
