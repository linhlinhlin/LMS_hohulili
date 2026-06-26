package com.example.lms.academic.application.usecase;

import com.example.lms.academic.application.dto.AcademicCatalogDtos.ReviewLearningPackageEnrollmentCommand;
import com.example.lms.academic.domain.model.AcademicLearningPackage;
import com.example.lms.academic.domain.model.AcademicLearningPackageEnrollment;
import com.example.lms.academic.domain.repository.AcademicCatalogRepository;
import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.shared.exception.ValidationException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ManageLearningPackageEnrollmentUseCase Tests")
class ManageLearningPackageEnrollmentUseCaseTest {
    @Mock
    private AcademicCatalogRepository repository;

    @InjectMocks
    private ManageLearningPackageEnrollmentUseCase useCase;

    @Test
    @DisplayName("requestEnrollment: ORG_APPROVAL package creates pending approval enrollment")
    void requestEnrollment_orgApprovalCreatesPendingApproval() {
        UUID orgId = UUID.randomUUID();
        UUID packageId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        when(repository.findLearningPackage(orgId, packageId))
                .thenReturn(Optional.of(packageWithPolicy(orgId, packageId, "ORG_APPROVAL")));
        when(repository.findLearningPackageEnrollment(orgId, packageId, studentId)).thenReturn(Optional.empty());
        when(repository.saveLearningPackageEnrollment(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = useCase.requestEnrollment(orgId, packageId, studentId);

        assertThat(response.organizationId()).isEqualTo(orgId);
        assertThat(response.packageId()).isEqualTo(packageId);
        assertThat(response.studentId()).isEqualTo(studentId);
        assertThat(response.status()).isEqualTo("PENDING_APPROVAL");
    }

    @Test
    @DisplayName("requestEnrollment: OPEN package activates immediately")
    void requestEnrollment_openPackageActivatesImmediately() {
        UUID orgId = UUID.randomUUID();
        UUID packageId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        when(repository.findLearningPackage(orgId, packageId))
                .thenReturn(Optional.of(packageWithPolicy(orgId, packageId, "OPEN")));
        when(repository.findLearningPackageEnrollment(orgId, packageId, studentId)).thenReturn(Optional.empty());
        when(repository.saveLearningPackageEnrollment(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = useCase.requestEnrollment(orgId, packageId, studentId);

        assertThat(response.status()).isEqualTo("ACTIVE");
    }

    @Test
    @DisplayName("requestEnrollment: INVITE_ONLY package rejects direct student request")
    void requestEnrollment_inviteOnlyRejectsDirectRequest() {
        UUID orgId = UUID.randomUUID();
        UUID packageId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        when(repository.findLearningPackage(orgId, packageId))
                .thenReturn(Optional.of(packageWithPolicy(orgId, packageId, "INVITE_ONLY")));
        when(repository.findLearningPackageEnrollment(orgId, packageId, studentId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> useCase.requestEnrollment(orgId, packageId, studentId))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("invitation");
        verify(repository, never()).saveLearningPackageEnrollment(any());
    }

    @Test
    @DisplayName("requestEnrollment: existing enrollment is idempotent")
    void requestEnrollment_existingEnrollmentIsIdempotent() {
        UUID orgId = UUID.randomUUID();
        UUID packageId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        var existing = enrollment(orgId, packageId, studentId, "PENDING_APPROVAL");

        when(repository.findLearningPackage(orgId, packageId))
                .thenReturn(Optional.of(packageWithPolicy(orgId, packageId, "ORG_APPROVAL")));
        when(repository.findLearningPackageEnrollment(orgId, packageId, studentId)).thenReturn(Optional.of(existing));

        var response = useCase.requestEnrollment(orgId, packageId, studentId);

        assertThat(response.id()).isEqualTo(existing.id());
        assertThat(response.status()).isEqualTo("PENDING_APPROVAL");
        verify(repository, never()).saveLearningPackageEnrollment(any());
    }

    @Test
    @DisplayName("approve: pending approval enrollment becomes active")
    void approve_pendingApprovalBecomesActive() {
        UUID orgId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();
        UUID approverId = UUID.randomUUID();
        var enrollment = enrollment(orgId, UUID.randomUUID(), UUID.randomUUID(), "PENDING_APPROVAL");

        when(repository.findLearningPackageEnrollment(orgId, enrollmentId)).thenReturn(Optional.of(enrollment));
        when(repository.saveLearningPackageEnrollment(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = useCase.approve(
                orgId,
                enrollmentId,
                approverId,
                new ReviewLearningPackageEnrollmentCommand("Đủ điều kiện theo lớp VMU."));

        assertThat(response.status()).isEqualTo("ACTIVE");
        assertThat(response.decidedBy()).isEqualTo(approverId);
        assertThat(response.decisionNote()).isEqualTo("Đủ điều kiện theo lớp VMU.");
    }

    @Test
    @DisplayName("approve: rejects payment-pending enrollment")
    void approve_rejectsPaymentPendingEnrollment() {
        UUID orgId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();
        var enrollment = enrollment(orgId, UUID.randomUUID(), UUID.randomUUID(), "PENDING_PAYMENT");

        when(repository.findLearningPackageEnrollment(orgId, enrollmentId)).thenReturn(Optional.of(enrollment));

        assertThatThrownBy(() -> useCase.approve(orgId, enrollmentId, UUID.randomUUID(), null))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("pending approval");
        verify(repository, never()).saveLearningPackageEnrollment(any());
    }

    @Test
    @DisplayName("listEnrollments: rejects unsupported status filter")
    void listEnrollments_rejectsUnsupportedStatus() {
        assertThatThrownBy(() -> useCase.listEnrollments(UUID.randomUUID(), "unknown"))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("Unsupported");
    }

    @Test
    @DisplayName("listEnrollments: passes normalized status to repository")
    void listEnrollments_normalizesStatusFilter() {
        UUID orgId = UUID.randomUUID();
        when(repository.findLearningPackageEnrollments(orgId, "PENDING_APPROVAL")).thenReturn(List.of());

        useCase.listEnrollments(orgId, "pending_approval");

        verify(repository).findLearningPackageEnrollments(orgId, "PENDING_APPROVAL");
    }

    private AcademicLearningPackage packageWithPolicy(UUID orgId, UUID packageId, String policy) {
        return new AcademicLearningPackage(
                packageId,
                orgId,
                null,
                "VMU-DKT-K63",
                "Gói Điều khiển tàu biển K63",
                null,
                "CURRICULUM_BUNDLE",
                BigDecimal.ZERO,
                "VND",
                policy,
                "ACTIVE",
                Instant.now(),
                null);
    }

    private AcademicLearningPackageEnrollment enrollment(UUID orgId, UUID packageId, UUID studentId, String status) {
        return new AcademicLearningPackageEnrollment(
                UUID.randomUUID(),
                orgId,
                packageId,
                studentId,
                status,
                null,
                Instant.now(),
                null,
                null,
                Instant.now(),
                null);
    }
}
