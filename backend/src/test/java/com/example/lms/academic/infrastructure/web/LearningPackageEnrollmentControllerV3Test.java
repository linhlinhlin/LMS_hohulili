package com.example.lms.academic.infrastructure.web;

import com.example.lms.academic.application.dto.AcademicCatalogDtos.LearningPackageEnrollmentResponse;
import com.example.lms.academic.application.usecase.ManageLearningPackageEnrollmentUseCase;
import com.example.lms.identity.application.usecase.ManageOrganizationCapabilitiesUseCase;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("LearningPackageEnrollmentControllerV3 Tests")
class LearningPackageEnrollmentControllerV3Test {
    @Mock
    private ManageLearningPackageEnrollmentUseCase useCase;

    @Mock
    private ManageOrganizationCapabilitiesUseCase capabilitiesUseCase;

    @InjectMocks
    private LearningPackageEnrollmentControllerV3 controller;

    @Test
    @DisplayName("requestMyEnrollment: rejects student from another organization")
    void requestMyEnrollment_rejectsStudentFromAnotherOrganization() {
        UUID organizationId = UUID.randomUUID();
        UUID packageId = UUID.randomUUID();
        UserJpaEntity student = user(UserJpaEntity.UserRole.STUDENT, UUID.randomUUID(), true);

        assertThatThrownBy(() -> controller.requestMyEnrollment(organizationId, packageId, student))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("No access");
        verify(useCase, never()).requestEnrollment(organizationId, packageId, student.getId());
    }

    @Test
    @DisplayName("requestMyEnrollment: allows same-organization student")
    void requestMyEnrollment_allowsSameOrganizationStudent() {
        UUID organizationId = UUID.randomUUID();
        UUID packageId = UUID.randomUUID();
        UserJpaEntity student = user(UserJpaEntity.UserRole.STUDENT, organizationId, true);
        when(capabilitiesUseCase.isEnabled(organizationId, "learning_packages")).thenReturn(true);

        controller.requestMyEnrollment(organizationId, packageId, student);

        verify(useCase).requestEnrollment(organizationId, packageId, student.getId());
    }

    @Test
    @DisplayName("listMyAvailablePackages: allows same-organization student")
    void listMyAvailablePackages_allowsSameOrganizationStudent() {
        UUID organizationId = UUID.randomUUID();
        UserJpaEntity student = user(UserJpaEntity.UserRole.STUDENT, organizationId, true);
        when(capabilitiesUseCase.isEnabled(organizationId, "learning_packages")).thenReturn(true);

        controller.listMyAvailablePackages(organizationId, student);

        verify(useCase).listAvailablePackagesForStudent(organizationId, student.getId());
    }

    @Test
    @DisplayName("listMyAvailablePackages: rejects student from another organization")
    void listMyAvailablePackages_rejectsStudentFromAnotherOrganization() {
        UUID organizationId = UUID.randomUUID();
        UserJpaEntity student = user(UserJpaEntity.UserRole.STUDENT, UUID.randomUUID(), true);

        assertThatThrownBy(() -> controller.listMyAvailablePackages(organizationId, student))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("No access");
        verify(useCase, never()).listAvailablePackagesForStudent(organizationId, student.getId());
    }

    @Test
    @DisplayName("createMyPackagePaymentQr: allows same-organization student")
    void createMyPackagePaymentQr_allowsSameOrganizationStudent() {
        UUID organizationId = UUID.randomUUID();
        UUID packageId = UUID.randomUUID();
        UserJpaEntity student = user(UserJpaEntity.UserRole.STUDENT, organizationId, true);
        when(capabilitiesUseCase.isEnabled(organizationId, "learning_packages")).thenReturn(true);

        controller.createMyPackagePaymentQr(organizationId, packageId, student);

        verify(useCase).createPaymentQr(organizationId, packageId, student.getId());
    }

    @Test
    @DisplayName("createMyPackagePaymentQr: rejects disabled learning package capability")
    void createMyPackagePaymentQr_rejectsDisabledLearningPackageCapability() {
        UUID organizationId = UUID.randomUUID();
        UUID packageId = UUID.randomUUID();
        UserJpaEntity student = user(UserJpaEntity.UserRole.STUDENT, organizationId, true);
        when(capabilitiesUseCase.isEnabled(organizationId, "learning_packages")).thenReturn(false);

        assertThatThrownBy(() -> controller.createMyPackagePaymentQr(organizationId, packageId, student))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("learning_packages");
        verify(useCase, never()).createPaymentQr(organizationId, packageId, student.getId());
    }

    @Test
    @DisplayName("listEnrollments: rejects ORG_ADMIN from another organization")
    void listEnrollments_rejectsOrgAdminFromAnotherOrganization() {
        UUID organizationId = UUID.randomUUID();
        UserJpaEntity orgAdmin = user(UserJpaEntity.UserRole.ORG_ADMIN, UUID.randomUUID(), false);

        assertThatThrownBy(() -> controller.listEnrollments(organizationId, null, orgAdmin))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("No access");
        verify(useCase, never()).listEnrollments(organizationId, null);
    }

    @Test
    @DisplayName("listEnrollments: allows system ADMIN for any organization")
    void listEnrollments_allowsSystemAdminForAnyOrganization() {
        UUID organizationId = UUID.randomUUID();
        UserJpaEntity admin = user(UserJpaEntity.UserRole.ADMIN, null, false);
        when(capabilitiesUseCase.isEnabled(organizationId, "learning_packages")).thenReturn(true);

        controller.listEnrollments(organizationId, "PENDING_APPROVAL", admin);

        verify(useCase).listEnrollments(organizationId, "PENDING_APPROVAL");
    }

    @Test
    @DisplayName("exportEnrollmentsCsv: allows same-organization ORG_ADMIN and escapes reconciliation note")
    void exportEnrollmentsCsv_allowsSameOrganizationOrgAdminAndEscapesNote() {
        UUID organizationId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();
        UUID packageId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        UUID actorId = UUID.randomUUID();
        UserJpaEntity orgAdmin = user(UserJpaEntity.UserRole.ORG_ADMIN, organizationId, false);
        when(capabilitiesUseCase.isEnabled(organizationId, "learning_packages")).thenReturn(true);
        when(useCase.listEnrollments(organizationId, "ACTIVE")).thenReturn(List.of(
                new LearningPackageEnrollmentResponse(
                        enrollmentId,
                        organizationId,
                        packageId,
                        studentId,
                        "ACTIVE",
                        "Đã đối soát, cần lưu \"sao kê\"",
                        new BigDecimal("1200000.00"),
                        "VND",
                        "SEPAY-001",
                        Instant.parse("2026-06-27T01:00:00Z"),
                        actorId,
                        Instant.parse("2026-06-27T00:00:00Z"),
                        Instant.parse("2026-06-27T01:00:00Z"),
                        actorId,
                        Instant.parse("2026-06-27T00:00:00Z")
                )
        ));

        var response = controller.exportEnrollmentsCsv(organizationId, "ACTIVE", orgAdmin);
        String csv = new String(response.getBody(), StandardCharsets.UTF_8);

        assertThat(response.getHeaders().getContentDisposition().getFilename())
                .isEqualTo("learning-package-enrollments.csv");
        assertThat(response.getHeaders().getContentType().toString()).isEqualTo("text/csv;charset=UTF-8");
        assertThat(csv).startsWith("\uFEFFenrollment_id,package_id,student_id,status");
        assertThat(csv).contains("SEPAY-001");
        assertThat(csv).contains("\"Đã đối soát, cần lưu \"\"sao kê\"\"\"");
        verify(useCase).listEnrollments(organizationId, "ACTIVE");
    }

    @Test
    @DisplayName("completePayment: allows same-organization ORG_ADMIN")
    void completePayment_allowsSameOrganizationOrgAdmin() {
        UUID organizationId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();
        UserJpaEntity orgAdmin = user(UserJpaEntity.UserRole.ORG_ADMIN, organizationId, true);
        when(capabilitiesUseCase.isEnabled(organizationId, "learning_packages")).thenReturn(true);

        controller.completePayment(organizationId, enrollmentId, null, orgAdmin);

        verify(useCase).completePayment(organizationId, enrollmentId, orgAdmin.getId(), null);
    }

    @Test
    @DisplayName("completePayment: rejects ORG_ADMIN from another organization")
    void completePayment_rejectsOrgAdminFromAnotherOrganization() {
        UUID organizationId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();
        UserJpaEntity orgAdmin = user(UserJpaEntity.UserRole.ORG_ADMIN, UUID.randomUUID(), true);

        assertThatThrownBy(() -> controller.completePayment(organizationId, enrollmentId, null, orgAdmin))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("No access");
        verify(useCase, never()).completePayment(organizationId, enrollmentId, orgAdmin.getId(), null);
    }

    @Test
    @DisplayName("refund: allows same-organization ORG_ADMIN")
    void refund_allowsSameOrganizationOrgAdmin() {
        UUID organizationId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();
        UserJpaEntity orgAdmin = user(UserJpaEntity.UserRole.ORG_ADMIN, organizationId, true);
        when(capabilitiesUseCase.isEnabled(organizationId, "learning_packages")).thenReturn(true);

        controller.refundEnrollment(organizationId, enrollmentId, null, orgAdmin);

        verify(useCase).refund(organizationId, enrollmentId, orgAdmin.getId(), null);
    }

    @Test
    @DisplayName("refund: rejects ORG_ADMIN from another organization")
    void refund_rejectsOrgAdminFromAnotherOrganization() {
        UUID organizationId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();
        UserJpaEntity orgAdmin = user(UserJpaEntity.UserRole.ORG_ADMIN, UUID.randomUUID(), true);

        assertThatThrownBy(() -> controller.refundEnrollment(organizationId, enrollmentId, null, orgAdmin))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("No access");
        verify(useCase, never()).refund(organizationId, enrollmentId, orgAdmin.getId(), null);
    }

    @Test
    @DisplayName("listPaymentEvents: allows same-organization ORG_ADMIN")
    void listPaymentEvents_allowsSameOrganizationOrgAdmin() {
        UUID organizationId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();
        UserJpaEntity orgAdmin = user(UserJpaEntity.UserRole.ORG_ADMIN, organizationId, false);
        when(capabilitiesUseCase.isEnabled(organizationId, "learning_packages")).thenReturn(true);

        controller.listPaymentEvents(organizationId, enrollmentId, orgAdmin);

        verify(useCase).listPaymentEvents(organizationId, enrollmentId);
    }

    @Test
    @DisplayName("listPaymentEvents: rejects ORG_ADMIN from another organization")
    void listPaymentEvents_rejectsOrgAdminFromAnotherOrganization() {
        UUID organizationId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();
        UserJpaEntity orgAdmin = user(UserJpaEntity.UserRole.ORG_ADMIN, UUID.randomUUID(), false);

        assertThatThrownBy(() -> controller.listPaymentEvents(organizationId, enrollmentId, orgAdmin))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("No access");
        verify(useCase, never()).listPaymentEvents(organizationId, enrollmentId);
    }

    @Test
    @DisplayName("listRevenueSplits: allows same-organization ORG_ADMIN")
    void listRevenueSplits_allowsSameOrganizationOrgAdmin() {
        UUID organizationId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();
        UserJpaEntity orgAdmin = user(UserJpaEntity.UserRole.ORG_ADMIN, organizationId, false);
        when(capabilitiesUseCase.isEnabled(organizationId, "learning_packages")).thenReturn(true);

        controller.listRevenueSplits(organizationId, enrollmentId, orgAdmin);

        verify(useCase).listRevenueSplits(organizationId, enrollmentId);
    }

    @Test
    @DisplayName("listRevenueSplits: rejects ORG_ADMIN from another organization")
    void listRevenueSplits_rejectsOrgAdminFromAnotherOrganization() {
        UUID organizationId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();
        UserJpaEntity orgAdmin = user(UserJpaEntity.UserRole.ORG_ADMIN, UUID.randomUUID(), false);

        assertThatThrownBy(() -> controller.listRevenueSplits(organizationId, enrollmentId, orgAdmin))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("No access");
        verify(useCase, never()).listRevenueSplits(organizationId, enrollmentId);
    }

    @Test
    @DisplayName("requestMyEnrollment: rejects disabled learning package capability")
    void requestMyEnrollment_rejectsDisabledLearningPackageCapability() {
        UUID organizationId = UUID.randomUUID();
        UUID packageId = UUID.randomUUID();
        UserJpaEntity student = user(UserJpaEntity.UserRole.STUDENT, organizationId, true);
        when(capabilitiesUseCase.isEnabled(organizationId, "learning_packages")).thenReturn(false);

        assertThatThrownBy(() -> controller.requestMyEnrollment(organizationId, packageId, student))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("learning_packages");
        verify(useCase, never()).requestEnrollment(organizationId, packageId, student.getId());
    }

    private UserJpaEntity user(UserJpaEntity.UserRole role, UUID organizationId, boolean withId) {
        UserJpaEntity user = mock(UserJpaEntity.class);
        when(user.getRole()).thenReturn(role);
        if (withId) {
            when(user.getId()).thenReturn(UUID.randomUUID());
        }
        if (organizationId != null) {
            when(user.getOrganizationId()).thenReturn(organizationId);
        }
        return user;
    }
}
