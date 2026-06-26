package com.example.lms.academic.application.usecase;

import com.example.lms.academic.application.dto.AcademicCatalogDtos.ReviewLearningPackageEnrollmentCommand;
import com.example.lms.academic.domain.model.AcademicClassGroupMembership;
import com.example.lms.academic.domain.model.AcademicLearningPackage;
import com.example.lms.academic.domain.model.AcademicLearningPackageClassTarget;
import com.example.lms.academic.domain.model.AcademicLearningPackageEnrollment;
import com.example.lms.academic.domain.model.AcademicLearningPackageItem;
import com.example.lms.academic.domain.model.AcademicSubjectCourse;
import com.example.lms.academic.domain.repository.AcademicCatalogRepository;
import com.example.lms.learning_delivery.application.usecase.GrantCourseAccessUseCase;
import com.example.lms.shared.application.port.SepayPaymentPort;
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

    @Mock
    private GrantCourseAccessUseCase courseAccessGrant;

    @Mock
    private SepayPaymentPort sepayPayment;

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
        assertThat(response.paymentAmount()).isEqualByComparingTo("1200000");
        assertThat(response.paymentCurrency()).isEqualTo("VND");
    }

    @Test
    @DisplayName("requestEnrollment: OPEN package activates immediately")
    void requestEnrollment_openPackageActivatesImmediately() {
        UUID orgId = UUID.randomUUID();
        UUID packageId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();

        when(repository.findLearningPackage(orgId, packageId))
                .thenReturn(Optional.of(packageWithPolicy(orgId, packageId, "OPEN")));
        when(repository.findLearningPackageEnrollment(orgId, packageId, studentId)).thenReturn(Optional.empty());
        when(repository.saveLearningPackageEnrollment(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(repository.findLearningPackageItems(orgId)).thenReturn(List.of(packageCourseItem(orgId, packageId, courseId)));
        when(repository.findSubjectCourses(orgId)).thenReturn(List.of());
        when(repository.findLearningPackageClassTargets(orgId)).thenReturn(List.of());
        when(courseAccessGrant.grant(orgId, courseId, studentId)).thenReturn(UUID.randomUUID());

        var response = useCase.requestEnrollment(orgId, packageId, studentId);

        assertThat(response.status()).isEqualTo("ACTIVE");
        verify(courseAccessGrant).grant(orgId, courseId, studentId);
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
        verify(courseAccessGrant, never()).grant(any(), any(), any());
    }

    @Test
    @DisplayName("createPaymentQr: creates pending payment enrollment and returns SePay QR metadata")
    void createPaymentQr_createsPendingPaymentEnrollmentAndReturnsQrMetadata() {
        UUID orgId = UUID.randomUUID();
        UUID packageId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        when(repository.findLearningPackage(orgId, packageId))
                .thenReturn(Optional.of(packageWithPolicy(orgId, packageId, "PAYMENT_REQUIRED")));
        when(repository.findLearningPackageEnrollment(orgId, packageId, studentId)).thenReturn(Optional.empty());
        when(repository.saveLearningPackageEnrollment(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(sepayPayment.generateQrUrl(any(UUID.class), any(BigDecimal.class)))
                .thenReturn("https://qr.sepay.vn/img?acc=0123456789");
        when(sepayPayment.getTransferContent(any(UUID.class))).thenReturn("LMSABC123");
        when(sepayPayment.getBankCode()).thenReturn("MBBank");
        when(sepayPayment.getAccountNumber()).thenReturn("0123456789");
        when(sepayPayment.getAccountName()).thenReturn("HOHOLIHU");

        var response = useCase.createPaymentQr(orgId, packageId, studentId);

        assertThat(response.enrollment().status()).isEqualTo("PENDING_PAYMENT");
        assertThat(response.txnId()).isEqualTo(response.enrollment().id());
        assertThat(response.qrUrl()).contains("qr.sepay.vn");
        assertThat(response.transferContent()).isEqualTo("LMSABC123");
        assertThat(response.amount()).isEqualByComparingTo("1200000");
        assertThat(response.currency()).isEqualTo("VND");
        assertThat(response.packageName()).isEqualTo("Gói Điều khiển tàu biển K63");
    }

    @Test
    @DisplayName("approve: pending approval enrollment becomes active")
    void approve_pendingApprovalBecomesActive() {
        UUID orgId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();
        UUID approverId = UUID.randomUUID();
        UUID packageId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        var enrollment = enrollment(orgId, packageId, studentId, "PENDING_APPROVAL");

        when(repository.findLearningPackageEnrollment(orgId, enrollmentId)).thenReturn(Optional.of(enrollment));
        when(repository.saveLearningPackageEnrollment(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(repository.findLearningPackageItems(orgId)).thenReturn(List.of(packageCourseItem(orgId, packageId, courseId)));
        when(repository.findSubjectCourses(orgId)).thenReturn(List.of());
        when(repository.findLearningPackageClassTargets(orgId)).thenReturn(List.of());
        when(courseAccessGrant.grant(orgId, courseId, studentId)).thenReturn(UUID.randomUUID());

        var response = useCase.approve(
                orgId,
                enrollmentId,
                approverId,
                new ReviewLearningPackageEnrollmentCommand("Đủ điều kiện theo lớp VMU.", null));

        assertThat(response.status()).isEqualTo("ACTIVE");
        assertThat(response.decidedBy()).isEqualTo(approverId);
        assertThat(response.decisionNote()).isEqualTo("Đủ điều kiện theo lớp VMU.");
        verify(courseAccessGrant).grant(orgId, courseId, studentId);
    }

    @Test
    @DisplayName("approve: package class target grants concrete class access")
    void approve_packageClassTargetGrantsClassAccess() {
        UUID orgId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();
        UUID approverId = UUID.randomUUID();
        UUID packageId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        var enrollment = enrollment(orgId, packageId, studentId, "PENDING_APPROVAL");

        when(repository.findLearningPackageEnrollment(orgId, enrollmentId)).thenReturn(Optional.of(enrollment));
        when(repository.saveLearningPackageEnrollment(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(repository.findLearningPackageItems(orgId)).thenReturn(List.of(packageCourseItem(orgId, packageId, courseId)));
        when(repository.findSubjectCourses(orgId)).thenReturn(List.of());
        when(repository.findLearningPackageClassTargets(orgId))
                .thenReturn(List.of(classTarget(orgId, packageId, courseId, classId)));
        when(courseAccessGrant.grantClass(orgId, courseId, classId, studentId)).thenReturn(UUID.randomUUID());

        useCase.approve(orgId, enrollmentId, approverId, null);

        verify(courseAccessGrant).grantClass(orgId, courseId, classId, studentId);
        verify(courseAccessGrant, never()).grant(orgId, courseId, studentId);
    }

    @Test
    @DisplayName("approve: class group target overrides default package class target")
    void approve_classGroupTargetOverridesDefaultTarget() {
        UUID orgId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();
        UUID approverId = UUID.randomUUID();
        UUID packageId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        UUID classGroupId = UUID.randomUUID();
        UUID defaultClassId = UUID.randomUUID();
        UUID classGroupClassId = UUID.randomUUID();
        var enrollment = enrollment(orgId, packageId, studentId, "PENDING_APPROVAL");

        when(repository.findLearningPackageEnrollment(orgId, enrollmentId)).thenReturn(Optional.of(enrollment));
        when(repository.saveLearningPackageEnrollment(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(repository.findLearningPackageItems(orgId)).thenReturn(List.of(packageCourseItem(orgId, packageId, courseId)));
        when(repository.findSubjectCourses(orgId)).thenReturn(List.of());
        when(repository.findActiveClassGroupMembership(orgId, studentId))
                .thenReturn(Optional.of(classGroupMembership(orgId, classGroupId, studentId)));
        when(repository.findLearningPackageClassTargets(orgId))
                .thenReturn(List.of(
                        classTarget(orgId, packageId, courseId, null, defaultClassId),
                        classTarget(orgId, packageId, courseId, classGroupId, classGroupClassId)));
        when(courseAccessGrant.grantClass(orgId, courseId, classGroupClassId, studentId)).thenReturn(UUID.randomUUID());

        useCase.approve(orgId, enrollmentId, approverId, null);

        verify(courseAccessGrant).grantClass(orgId, courseId, classGroupClassId, studentId);
        verify(courseAccessGrant, never()).grantClass(orgId, courseId, defaultClassId, studentId);
        verify(courseAccessGrant, never()).grant(orgId, courseId, studentId);
    }

    @Test
    @DisplayName("approve: subject package item grants mapped subject course")
    void approve_subjectPackageItemGrantsMappedCourse() {
        UUID orgId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();
        UUID approverId = UUID.randomUUID();
        UUID packageId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        UUID subjectId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        var enrollment = enrollment(orgId, packageId, studentId, "PENDING_APPROVAL");

        when(repository.findLearningPackageEnrollment(orgId, enrollmentId)).thenReturn(Optional.of(enrollment));
        when(repository.saveLearningPackageEnrollment(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(repository.findLearningPackageItems(orgId)).thenReturn(List.of(packageSubjectItem(orgId, packageId, subjectId)));
        when(repository.findSubjectCourses(orgId)).thenReturn(List.of(subjectCourse(orgId, subjectId, courseId)));
        when(repository.findLearningPackageClassTargets(orgId)).thenReturn(List.of());
        when(courseAccessGrant.grant(orgId, courseId, studentId)).thenReturn(UUID.randomUUID());

        useCase.approve(orgId, enrollmentId, approverId, null);

        verify(courseAccessGrant).grant(orgId, courseId, studentId);
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
    @DisplayName("completePayment: pending payment enrollment becomes active and grants package courses")
    void completePayment_pendingPaymentBecomesActiveAndGrantsCourses() {
        UUID orgId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();
        UUID confirmerId = UUID.randomUUID();
        UUID packageId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        var enrollment = enrollment(orgId, packageId, studentId, "PENDING_PAYMENT");

        when(repository.findLearningPackageEnrollment(orgId, enrollmentId)).thenReturn(Optional.of(enrollment));
        when(repository.saveLearningPackageEnrollment(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(repository.findLearningPackageItems(orgId)).thenReturn(List.of(packageCourseItem(orgId, packageId, courseId)));
        when(repository.findSubjectCourses(orgId)).thenReturn(List.of());
        when(repository.findLearningPackageClassTargets(orgId)).thenReturn(List.of());
        when(courseAccessGrant.grant(orgId, courseId, studentId)).thenReturn(UUID.randomUUID());

        var response = useCase.completePayment(
                orgId,
                enrollmentId,
                confirmerId,
                new ReviewLearningPackageEnrollmentCommand("Đã đối soát chuyển khoản.", "SEPAY-VMU-001"));

        assertThat(response.status()).isEqualTo("ACTIVE");
        assertThat(response.decidedBy()).isEqualTo(confirmerId);
        assertThat(response.decisionNote()).isEqualTo("Đã đối soát chuyển khoản.");
        assertThat(response.paymentReference()).isEqualTo("SEPAY-VMU-001");
        assertThat(response.paymentConfirmedBy()).isEqualTo(confirmerId);
        assertThat(response.paymentConfirmedAt()).isNotNull();
        verify(courseAccessGrant).grant(orgId, courseId, studentId);
    }

    @Test
    @DisplayName("completePayment: rejects overlong payment reference")
    void completePayment_rejectsOverlongPaymentReference() {
        UUID orgId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();
        var enrollment = enrollment(orgId, UUID.randomUUID(), UUID.randomUUID(), "PENDING_PAYMENT");

        when(repository.findLearningPackageEnrollment(orgId, enrollmentId)).thenReturn(Optional.of(enrollment));

        assertThatThrownBy(() -> useCase.completePayment(
                orgId,
                enrollmentId,
                UUID.randomUUID(),
                new ReviewLearningPackageEnrollmentCommand(null, "X".repeat(129))))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("payment reference");
        verify(repository, never()).saveLearningPackageEnrollment(any());
    }

    @Test
    @DisplayName("completePayment: rejects non-payment-pending enrollment")
    void completePayment_rejectsNonPaymentPendingEnrollment() {
        UUID orgId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();
        var enrollment = enrollment(orgId, UUID.randomUUID(), UUID.randomUUID(), "PENDING_APPROVAL");

        when(repository.findLearningPackageEnrollment(orgId, enrollmentId)).thenReturn(Optional.of(enrollment));

        assertThatThrownBy(() -> useCase.completePayment(orgId, enrollmentId, UUID.randomUUID(), null))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("pending payment");
        verify(repository, never()).saveLearningPackageEnrollment(any());
    }

    @Test
    @DisplayName("completeExternalPayment: pending payment enrollment becomes active and grants courses")
    void completeExternalPayment_pendingPaymentBecomesActiveAndGrantsCourses() {
        UUID orgId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();
        UUID packageId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        var enrollment = enrollment(enrollmentId, orgId, packageId, studentId, "PENDING_PAYMENT");

        when(repository.findLearningPackageEnrollment(enrollmentId)).thenReturn(Optional.of(enrollment));
        when(repository.saveLearningPackageEnrollment(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(repository.findLearningPackageItems(orgId)).thenReturn(List.of(packageCourseItem(orgId, packageId, courseId)));
        when(repository.findSubjectCourses(orgId)).thenReturn(List.of());
        when(repository.findLearningPackageClassTargets(orgId)).thenReturn(List.of());
        when(courseAccessGrant.grant(orgId, courseId, studentId)).thenReturn(UUID.randomUUID());

        var response = useCase.completeExternalPayment(
                enrollmentId,
                new BigDecimal("1200000"),
                "SEPAY-VMU-002");

        assertThat(response).isPresent();
        assertThat(response.get().status()).isEqualTo("ACTIVE");
        assertThat(response.get().paymentReference()).isEqualTo("SEPAY-VMU-002");
        assertThat(response.get().paymentConfirmedAt()).isNotNull();
        assertThat(response.get().paymentConfirmedBy()).isNull();
        verify(courseAccessGrant).grant(orgId, courseId, studentId);
    }

    @Test
    @DisplayName("completeExternalPayment: returns empty for non-package payment reference")
    void completeExternalPayment_returnsEmptyForUnknownReference() {
        UUID enrollmentId = UUID.randomUUID();
        when(repository.findLearningPackageEnrollment(enrollmentId)).thenReturn(Optional.empty());

        var response = useCase.completeExternalPayment(enrollmentId, new BigDecimal("1200000"), "SEPAY-UNKNOWN");

        assertThat(response).isEmpty();
        verify(repository, never()).saveLearningPackageEnrollment(any());
    }

    @Test
    @DisplayName("completeExternalPayment: rejects amount mismatch")
    void completeExternalPayment_rejectsAmountMismatch() {
        UUID enrollmentId = UUID.randomUUID();
        var enrollment = enrollment(enrollmentId, UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), "PENDING_PAYMENT");
        when(repository.findLearningPackageEnrollment(enrollmentId)).thenReturn(Optional.of(enrollment));

        assertThatThrownBy(() -> useCase.completeExternalPayment(enrollmentId, new BigDecimal("1100000"), "SEPAY-LOW"))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("không khớp");
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

    @Test
    @DisplayName("listAvailablePackagesForStudent: returns active packages with current enrollment")
    void listAvailablePackagesForStudent_returnsActivePackagesWithEnrollment() {
        UUID orgId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        UUID payablePackageId = UUID.randomUUID();
        UUID inactivePackageId = UUID.randomUUID();
        var payablePackage = packageWithPolicy(orgId, payablePackageId, "PAYMENT_REQUIRED");
        var inactivePackage = new AcademicLearningPackage(
                inactivePackageId,
                orgId,
                null,
                "VMU-OLD",
                "Gói cũ",
                null,
                "COURSE_BUNDLE",
                BigDecimal.ZERO,
                "VND",
                "OPEN",
                "ARCHIVED",
                Instant.now(),
                null);
        var existing = enrollment(orgId, payablePackageId, studentId, "PENDING_PAYMENT");

        when(repository.findLearningPackages(orgId)).thenReturn(List.of(payablePackage, inactivePackage));
        when(repository.findLearningPackageEnrollment(orgId, payablePackageId, studentId))
                .thenReturn(Optional.of(existing));

        var response = useCase.listAvailablePackagesForStudent(orgId, studentId);

        assertThat(response).hasSize(1);
        assertThat(response.get(0).learningPackage().id()).isEqualTo(payablePackageId);
        assertThat(response.get(0).enrollment().status()).isEqualTo("PENDING_PAYMENT");
    }

    @Test
    @DisplayName("listAvailablePackagesForStudent: hides invite-only packages without enrollment")
    void listAvailablePackagesForStudent_hidesInviteOnlyPackagesWithoutEnrollment() {
        UUID orgId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        UUID inviteOnlyPackageId = UUID.randomUUID();

        when(repository.findLearningPackages(orgId))
                .thenReturn(List.of(packageWithPolicy(orgId, inviteOnlyPackageId, "INVITE_ONLY")));
        when(repository.findLearningPackageEnrollment(orgId, inviteOnlyPackageId, studentId))
                .thenReturn(Optional.empty());

        var response = useCase.listAvailablePackagesForStudent(orgId, studentId);

        assertThat(response).isEmpty();
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
                new BigDecimal("1200000"),
                "VND",
                policy,
                "ACTIVE",
                Instant.now(),
                null);
    }

    private AcademicLearningPackageEnrollment enrollment(UUID orgId, UUID packageId, UUID studentId, String status) {
        return enrollment(UUID.randomUUID(), orgId, packageId, studentId, status);
    }

    private AcademicLearningPackageEnrollment enrollment(
            UUID enrollmentId,
            UUID orgId,
            UUID packageId,
            UUID studentId,
            String status) {
        return new AcademicLearningPackageEnrollment(
                enrollmentId,
                orgId,
                packageId,
                studentId,
                status,
                null,
                new BigDecimal("1200000"),
                "VND",
                null,
                null,
                null,
                Instant.now(),
                null,
                null,
                Instant.now(),
                null);
    }

    private AcademicLearningPackageItem packageCourseItem(UUID orgId, UUID packageId, UUID courseId) {
        return new AcademicLearningPackageItem(
                UUID.randomUUID(),
                orgId,
                packageId,
                null,
                courseId,
                0,
                true,
                "ACTIVE",
                Instant.now(),
                null);
    }

    private AcademicLearningPackageItem packageSubjectItem(UUID orgId, UUID packageId, UUID subjectId) {
        return new AcademicLearningPackageItem(
                UUID.randomUUID(),
                orgId,
                packageId,
                subjectId,
                null,
                0,
                true,
                "ACTIVE",
                Instant.now(),
                null);
    }

    private AcademicSubjectCourse subjectCourse(UUID orgId, UUID subjectId, UUID courseId) {
        return new AcademicSubjectCourse(
                UUID.randomUUID(),
                orgId,
                subjectId,
                courseId,
                true,
                "ACTIVE",
                Instant.now(),
                null);
    }

    private AcademicLearningPackageClassTarget classTarget(UUID orgId, UUID packageId, UUID courseId, UUID classId) {
        return classTarget(orgId, packageId, courseId, null, classId);
    }

    private AcademicLearningPackageClassTarget classTarget(
            UUID orgId,
            UUID packageId,
            UUID courseId,
            UUID classGroupId,
            UUID classId) {
        return new AcademicLearningPackageClassTarget(
                UUID.randomUUID(),
                orgId,
                packageId,
                courseId,
                classGroupId,
                classId,
                "ACTIVE",
                Instant.now(),
                null);
    }

    private AcademicClassGroupMembership classGroupMembership(UUID orgId, UUID classGroupId, UUID studentId) {
        return new AcademicClassGroupMembership(
                UUID.randomUUID(),
                orgId,
                classGroupId,
                studentId,
                "ACTIVE",
                Instant.now(),
                null,
                Instant.now(),
                null);
    }
}
