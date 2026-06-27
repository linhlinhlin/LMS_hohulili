package com.example.lms.academic.infrastructure.web;

import com.example.lms.academic.application.dto.AcademicCatalogDtos.LearningPackageAvailabilityResponse;
import com.example.lms.academic.application.dto.AcademicCatalogDtos.LearningPackageEnrollmentResponse;
import com.example.lms.academic.application.dto.AcademicCatalogDtos.LearningPackagePaymentEventResponse;
import com.example.lms.academic.application.dto.AcademicCatalogDtos.LearningPackagePaymentQrResponse;
import com.example.lms.academic.application.dto.AcademicCatalogDtos.LearningPackageRevenueSplitResponse;
import com.example.lms.academic.application.dto.AcademicCatalogDtos.ReviewLearningPackageEnrollmentCommand;
import com.example.lms.academic.application.usecase.ManageLearningPackageEnrollmentUseCase;
import com.example.lms.identity.application.usecase.ManageOrganizationCapabilitiesUseCase;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@RestController
@RequestMapping("/api/v3/organizations/{orgId}/academic")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "Learning Package Enrollment", description = "Organization-scoped learning package enrollment workflow")
public class LearningPackageEnrollmentControllerV3 {
    private static final String LEARNING_PACKAGES = "learning_packages";

    private final ManageLearningPackageEnrollmentUseCase useCase;
    private final ManageOrganizationCapabilitiesUseCase capabilitiesUseCase;

    @GetMapping("/learning-packages/available/me")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "List active learning packages available to current student")
    public ResponseEntity<ApiResponse<List<LearningPackageAvailabilityResponse>>> listMyAvailablePackages(
            @PathVariable UUID orgId,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyStudentAccess(currentUser, orgId);
        requireLearningPackages(orgId);
        return ResponseEntity.ok(ApiResponse.success(
                useCase.listAvailablePackagesForStudent(orgId, currentUser.getId())));
    }

    @PostMapping("/learning-packages/{packageId}/enrollments/me")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Request enrollment in a learning package")
    public ResponseEntity<ApiResponse<LearningPackageEnrollmentResponse>> requestMyEnrollment(
            @PathVariable UUID orgId,
            @PathVariable UUID packageId,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyStudentAccess(currentUser, orgId);
        requireLearningPackages(orgId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(useCase.requestEnrollment(orgId, packageId, currentUser.getId())));
    }

    @PostMapping("/learning-packages/{packageId}/payment-qr/me")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Create SePay QR for a payable learning package enrollment")
    public ResponseEntity<ApiResponse<LearningPackagePaymentQrResponse>> createMyPackagePaymentQr(
            @PathVariable UUID orgId,
            @PathVariable UUID packageId,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyStudentAccess(currentUser, orgId);
        requireLearningPackages(orgId);
        return ResponseEntity.ok(ApiResponse.success(
                useCase.createPaymentQr(orgId, packageId, currentUser.getId())));
    }

    @GetMapping("/learning-package-enrollments")
    @PreAuthorize("hasAnyRole('ADMIN','ORG_ADMIN')")
    @Operation(summary = "List learning package enrollments for an organization")
    public ResponseEntity<ApiResponse<List<LearningPackageEnrollmentResponse>>> listEnrollments(
            @PathVariable UUID orgId,
            @RequestParam(required = false) String status,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAdminAccess(currentUser, orgId);
        requireLearningPackages(orgId);
        return ResponseEntity.ok(ApiResponse.success(useCase.listEnrollments(orgId, status)));
    }

    @GetMapping(value = "/learning-package-enrollments/export.csv", produces = "text/csv;charset=UTF-8")
    @PreAuthorize("hasAnyRole('ADMIN','ORG_ADMIN')")
    @Operation(summary = "Export learning package enrollments as CSV for reconciliation")
    public ResponseEntity<byte[]> exportEnrollmentsCsv(
            @PathVariable UUID orgId,
            @RequestParam(required = false) String status,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAdminAccess(currentUser, orgId);
        requireLearningPackages(orgId);
        byte[] body = toCsvBytes(useCase.listEnrollments(orgId, status));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"learning-package-enrollments.csv\"")
                .contentType(MediaType.parseMediaType("text/csv;charset=UTF-8"))
                .body(body);
    }

    @PatchMapping("/learning-package-enrollments/{enrollmentId}/approve")
    @PreAuthorize("hasAnyRole('ADMIN','ORG_ADMIN')")
    @Operation(summary = "Approve a pending learning package enrollment")
    public ResponseEntity<ApiResponse<LearningPackageEnrollmentResponse>> approveEnrollment(
            @PathVariable UUID orgId,
            @PathVariable UUID enrollmentId,
            @Valid @RequestBody(required = false) ReviewLearningPackageEnrollmentCommand command,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAdminAccess(currentUser, orgId);
        requireLearningPackages(orgId);
        return ResponseEntity.ok(ApiResponse.success(useCase.approve(orgId, enrollmentId, currentUser.getId(), command)));
    }

    @PatchMapping("/learning-package-enrollments/{enrollmentId}/reject")
    @PreAuthorize("hasAnyRole('ADMIN','ORG_ADMIN')")
    @Operation(summary = "Reject a pending learning package enrollment")
    public ResponseEntity<ApiResponse<LearningPackageEnrollmentResponse>> rejectEnrollment(
            @PathVariable UUID orgId,
            @PathVariable UUID enrollmentId,
            @Valid @RequestBody(required = false) ReviewLearningPackageEnrollmentCommand command,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAdminAccess(currentUser, orgId);
        requireLearningPackages(orgId);
        return ResponseEntity.ok(ApiResponse.success(useCase.reject(orgId, enrollmentId, currentUser.getId(), command)));
    }

    @PatchMapping("/learning-package-enrollments/{enrollmentId}/complete-payment")
    @PreAuthorize("hasAnyRole('ADMIN','ORG_ADMIN')")
    @Operation(summary = "Confirm payment for a pending learning package enrollment")
    public ResponseEntity<ApiResponse<LearningPackageEnrollmentResponse>> completePayment(
            @PathVariable UUID orgId,
            @PathVariable UUID enrollmentId,
            @Valid @RequestBody(required = false) ReviewLearningPackageEnrollmentCommand command,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAdminAccess(currentUser, orgId);
        requireLearningPackages(orgId);
        return ResponseEntity.ok(ApiResponse.success(
                useCase.completePayment(orgId, enrollmentId, currentUser.getId(), command)));
    }

    @PatchMapping("/learning-package-enrollments/{enrollmentId}/refund")
    @PreAuthorize("hasAnyRole('ADMIN','ORG_ADMIN')")
    @Operation(summary = "Refund a paid learning package enrollment")
    public ResponseEntity<ApiResponse<LearningPackageEnrollmentResponse>> refundEnrollment(
            @PathVariable UUID orgId,
            @PathVariable UUID enrollmentId,
            @Valid @RequestBody(required = false) ReviewLearningPackageEnrollmentCommand command,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAdminAccess(currentUser, orgId);
        requireLearningPackages(orgId);
        return ResponseEntity.ok(ApiResponse.success(
                useCase.refund(orgId, enrollmentId, currentUser.getId(), command)));
    }

    @GetMapping("/learning-package-enrollments/{enrollmentId}/payment-events")
    @PreAuthorize("hasAnyRole('ADMIN','ORG_ADMIN')")
    @Operation(summary = "List payment audit events for a learning package enrollment")
    public ResponseEntity<ApiResponse<List<LearningPackagePaymentEventResponse>>> listPaymentEvents(
            @PathVariable UUID orgId,
            @PathVariable UUID enrollmentId,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAdminAccess(currentUser, orgId);
        requireLearningPackages(orgId);
        return ResponseEntity.ok(ApiResponse.success(useCase.listPaymentEvents(orgId, enrollmentId)));
    }

    @GetMapping("/learning-package-enrollments/{enrollmentId}/revenue-splits")
    @PreAuthorize("hasAnyRole('ADMIN','ORG_ADMIN')")
    @Operation(summary = "List package revenue split ledger rows for a learning package enrollment")
    public ResponseEntity<ApiResponse<List<LearningPackageRevenueSplitResponse>>> listRevenueSplits(
            @PathVariable UUID orgId,
            @PathVariable UUID enrollmentId,
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        verifyOrgAdminAccess(currentUser, orgId);
        requireLearningPackages(orgId);
        return ResponseEntity.ok(ApiResponse.success(useCase.listRevenueSplits(orgId, enrollmentId)));
    }

    private void verifyStudentAccess(UserJpaEntity currentUser, UUID orgId) {
        if (currentUser == null || currentUser.getRole() != UserJpaEntity.UserRole.STUDENT
                || !Objects.equals(currentUser.getOrganizationId(), orgId)) {
            throw new AccessDeniedException("No access to this organization's learning packages");
        }
    }

    private void verifyOrgAdminAccess(UserJpaEntity currentUser, UUID orgId) {
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
        throw new AccessDeniedException("No access to this organization's learning package enrollments");
    }

    private void requireLearningPackages(UUID orgId) {
        if (!capabilitiesUseCase.isEnabled(orgId, LEARNING_PACKAGES)) {
            throw new AccessDeniedException("Organization capability is disabled: " + LEARNING_PACKAGES);
        }
    }

    private byte[] toCsvBytes(List<LearningPackageEnrollmentResponse> enrollments) {
        StringBuilder csv = new StringBuilder("\uFEFF");
        appendCsvRow(csv,
                "enrollment_id",
                "package_id",
                "student_id",
                "status",
                "payment_amount",
                "currency",
                "payment_reference",
                "payment_confirmed_at",
                "requested_at",
                "decided_at",
                "decision_note");
        for (LearningPackageEnrollmentResponse enrollment : enrollments) {
            appendCsvRow(csv,
                    enrollment.id(),
                    enrollment.packageId(),
                    enrollment.studentId(),
                    enrollment.status(),
                    enrollment.paymentAmount(),
                    enrollment.paymentCurrency(),
                    enrollment.paymentReference(),
                    enrollment.paymentConfirmedAt(),
                    enrollment.requestedAt(),
                    enrollment.decidedAt(),
                    enrollment.decisionNote());
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private void appendCsvRow(StringBuilder csv, Object... values) {
        for (int i = 0; i < values.length; i++) {
            if (i > 0) {
                csv.append(',');
            }
            csv.append(csvValue(values[i]));
        }
        csv.append('\n');
    }

    private String csvValue(Object value) {
        if (value == null) {
            return "";
        }
        String text = value.toString();
        boolean mustQuote = text.indexOf(',') >= 0
                || text.indexOf('"') >= 0
                || text.indexOf('\n') >= 0
                || text.indexOf('\r') >= 0;
        String escaped = text.replace("\"", "\"\"");
        return mustQuote ? '"' + escaped + '"' : escaped;
    }
}
