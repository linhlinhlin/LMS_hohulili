package com.example.lms.academic.application.usecase;

import com.example.lms.academic.application.dto.AcademicCatalogDtos.LearningPackageEnrollmentResponse;
import com.example.lms.academic.application.dto.AcademicCatalogDtos.LearningPackageAvailabilityResponse;
import com.example.lms.academic.application.dto.AcademicCatalogDtos.LearningPackagePaymentEventResponse;
import com.example.lms.academic.application.dto.AcademicCatalogDtos.LearningPackagePaymentQrResponse;
import com.example.lms.academic.application.dto.AcademicCatalogDtos.LearningPackageResponse;
import com.example.lms.academic.application.dto.AcademicCatalogDtos.ReviewLearningPackageEnrollmentCommand;
import com.example.lms.academic.domain.model.AcademicClassGroupMembership;
import com.example.lms.academic.domain.model.AcademicLearningPackage;
import com.example.lms.academic.domain.model.AcademicLearningPackageEnrollment;
import com.example.lms.academic.domain.model.AcademicLearningPackagePaymentEvent;
import com.example.lms.academic.domain.repository.AcademicCatalogRepository;
import com.example.lms.learning_delivery.application.usecase.GrantCourseAccessUseCase;
import com.example.lms.shared.application.port.SepayPaymentPort;
import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ManageLearningPackageEnrollmentUseCase {
    private final AcademicCatalogRepository repository;
    private final GrantCourseAccessUseCase courseAccessGrant;
    private final SepayPaymentPort sepayPayment;

    @Transactional
    public LearningPackageEnrollmentResponse requestEnrollment(UUID organizationId, UUID packageId, UUID studentId) {
        var learningPackage = requireLearningPackage(organizationId, packageId);
        if (!"ACTIVE".equals(learningPackage.status())) {
            throw new BusinessRuleException(
                    "PACKAGE_NOT_ACTIVE",
                    "Only active learning packages can receive enrollments");
        }
        return repository.findLearningPackageEnrollment(organizationId, packageId, studentId)
                .map(existing -> {
                    grantActivePackageCourses(existing);
                    return toResponse(existing);
                })
                .orElseGet(() -> {
                    var enrollment = repository.saveLearningPackageEnrollment(
                            AcademicLearningPackageEnrollment.request(
                                    organizationId,
                                    packageId,
                                    studentId,
                                    learningPackage.enrollmentPolicy(),
                                    learningPackage.price(),
                                    learningPackage.currency()));
                    grantActivePackageCourses(enrollment);
                    return toResponse(enrollment);
                });
    }

    public List<LearningPackageEnrollmentResponse> listEnrollments(UUID organizationId, String status) {
        var safeStatus = normalizeStatus(status);
        return repository.findLearningPackageEnrollments(organizationId, safeStatus).stream()
                .map(this::toResponse)
                .toList();
    }

    public List<LearningPackageAvailabilityResponse> listAvailablePackagesForStudent(
            UUID organizationId,
            UUID studentId) {
        List<LearningPackageAvailabilityResponse> responses = new ArrayList<>();
        for (var learningPackage : repository.findLearningPackages(organizationId)) {
            if (!"ACTIVE".equals(learningPackage.status())) {
                continue;
            }
            var enrollment = repository.findLearningPackageEnrollment(
                    organizationId,
                    learningPackage.id(),
                    studentId);
            if ("INVITE_ONLY".equals(learningPackage.enrollmentPolicy()) && enrollment.isEmpty()) {
                continue;
            }
            responses.add(new LearningPackageAvailabilityResponse(
                    toPackageResponse(learningPackage),
                    enrollment.map(this::toResponse).orElse(null)));
        }
        return responses;
    }

    @Transactional
    public LearningPackagePaymentQrResponse createPaymentQr(UUID organizationId, UUID packageId, UUID studentId) {
        var learningPackage = requireLearningPackage(organizationId, packageId);
        if (!"ACTIVE".equals(learningPackage.status())) {
            throw new BusinessRuleException(
                    "PACKAGE_NOT_ACTIVE",
                    "Only active learning packages can receive payments");
        }
        var enrollment = repository.findLearningPackageEnrollment(organizationId, packageId, studentId)
                .orElseGet(() -> repository.saveLearningPackageEnrollment(
                        AcademicLearningPackageEnrollment.request(
                                organizationId,
                                packageId,
                                studentId,
                                learningPackage.enrollmentPolicy(),
                                learningPackage.price(),
                                learningPackage.currency())));

        if (!"PENDING_PAYMENT".equals(enrollment.status())) {
            throw new BusinessRuleException(
                    "PACKAGE_NOT_PAYABLE",
                    "Gói học này chưa ở trạng thái chờ thanh toán");
        }
        if (enrollment.paymentAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException(
                    "PACKAGE_PAYMENT_AMOUNT_INVALID",
                    "Số tiền thanh toán gói học phải lớn hơn 0");
        }

        var qrUrl = sepayPayment.generateQrUrl(enrollment.id(), enrollment.paymentAmount());
        var transferContent = sepayPayment.getTransferContent(enrollment.id());
        repository.saveLearningPackagePaymentEvent(
                AcademicLearningPackagePaymentEvent.qrCreated(enrollment, studentId, transferContent));

        return new LearningPackagePaymentQrResponse(
                toResponse(enrollment),
                enrollment.id(),
                qrUrl,
                transferContent,
                sepayPayment.getBankCode(),
                sepayPayment.getAccountNumber(),
                sepayPayment.getAccountName(),
                enrollment.paymentAmount(),
                enrollment.paymentCurrency(),
                learningPackage.name());
    }

    @Transactional
    public LearningPackageEnrollmentResponse approve(
            UUID organizationId,
            UUID enrollmentId,
            UUID approverId,
            ReviewLearningPackageEnrollmentCommand command) {
        var enrollment = requireEnrollment(organizationId, enrollmentId);
        var approved = repository.saveLearningPackageEnrollment(
                enrollment.approve(approverId, command == null ? null : command.note()));
        grantActivePackageCourses(approved);
        return toResponse(approved);
    }

    @Transactional
    public LearningPackageEnrollmentResponse reject(
            UUID organizationId,
            UUID enrollmentId,
            UUID approverId,
            ReviewLearningPackageEnrollmentCommand command) {
        var enrollment = requireEnrollment(organizationId, enrollmentId);
        return toResponse(repository.saveLearningPackageEnrollment(
                enrollment.reject(approverId, command == null ? null : command.note())));
    }

    @Transactional
    public LearningPackageEnrollmentResponse completePayment(
            UUID organizationId,
            UUID enrollmentId,
            UUID confirmerId,
            ReviewLearningPackageEnrollmentCommand command) {
        var enrollment = requireEnrollment(organizationId, enrollmentId);
        var completed = repository.saveLearningPackageEnrollment(
                enrollment.completePayment(
                        confirmerId,
                        command == null ? null : command.note(),
                        command == null ? null : command.paymentReference()));
        repository.saveLearningPackagePaymentEvent(
                AcademicLearningPackagePaymentEvent.paymentConfirmed(
                        completed,
                        confirmerId,
                        completed.paymentReference(),
                        completed.decisionNote()));
        grantActivePackageCourses(completed);
        return toResponse(completed);
    }

    @Transactional
    public Optional<LearningPackageEnrollmentResponse> completeExternalPayment(
            UUID enrollmentId,
            BigDecimal transferredAmount,
            String gatewayTransactionCode) {
        var enrollmentOpt = repository.findLearningPackageEnrollment(enrollmentId);
        if (enrollmentOpt.isEmpty()) {
            return Optional.empty();
        }

        var enrollment = enrollmentOpt.get();
        if ("ACTIVE".equals(enrollment.status()) && enrollment.paymentConfirmedAt() != null) {
            return Optional.of(toResponse(enrollment));
        }
        if (!"PENDING_PAYMENT".equals(enrollment.status())) {
            throw new BusinessRuleException(
                    "PACKAGE_PAYMENT_NOT_COMPLETABLE",
                    "Gói học không ở trạng thái chờ thanh toán");
        }
        if (transferredAmount != null && transferredAmount.compareTo(enrollment.paymentAmount()) != 0) {
            throw new BusinessRuleException(
                    "PACKAGE_PAYMENT_AMOUNT_MISMATCH",
                    "Số tiền chuyển khoản không khớp học phí gói");
        }

        var reference = gatewayTransactionCode == null || gatewayTransactionCode.isBlank()
                ? sepayPayment.getTransferContent(enrollment.id())
                : gatewayTransactionCode.trim();
        var completed = repository.saveLearningPackageEnrollment(
                enrollment.completeExternalPayment("SePay webhook xác nhận thanh toán gói học.", reference));
        repository.saveLearningPackagePaymentEvent(
                AcademicLearningPackagePaymentEvent.paymentConfirmed(
                        completed,
                        null,
                        completed.paymentReference(),
                        completed.decisionNote()));
        grantActivePackageCourses(completed);
        return Optional.of(toResponse(completed));
    }

    public List<LearningPackagePaymentEventResponse> listPaymentEvents(UUID organizationId, UUID enrollmentId) {
        requireEnrollment(organizationId, enrollmentId);
        return repository.findLearningPackagePaymentEvents(organizationId, enrollmentId).stream()
                .map(this::toResponse)
                .toList();
    }

    private AcademicLearningPackage requireLearningPackage(UUID organizationId, UUID packageId) {
        return repository.findLearningPackage(organizationId, packageId)
                .orElseThrow(() -> new EntityNotFoundException("AcademicLearningPackage", packageId));
    }

    private AcademicLearningPackageEnrollment requireEnrollment(UUID organizationId, UUID enrollmentId) {
        return repository.findLearningPackageEnrollment(organizationId, enrollmentId)
                .orElseThrow(() -> new EntityNotFoundException("AcademicLearningPackageEnrollment", enrollmentId));
    }

    private void grantActivePackageCourses(AcademicLearningPackageEnrollment enrollment) {
        if (!"ACTIVE".equals(enrollment.status())) {
            return;
        }
        var courseIds = resolvePackageCourseIds(enrollment.organizationId(), enrollment.packageId());
        if (courseIds.isEmpty()) {
            throw new BusinessRuleException(
                    "PACKAGE_HAS_NO_COURSES",
                    "Gói học chưa có khóa học hợp lệ để cấp quyền");
        }
        var classTargets = resolvePackageClassTargets(
                enrollment.organizationId(),
                enrollment.packageId(),
                enrollment.studentId());
        courseIds.forEach(courseId -> {
            UUID learningClassId = classTargets.get(courseId);
            if (learningClassId != null) {
                courseAccessGrant.grantClass(
                        enrollment.organizationId(),
                        courseId,
                        learningClassId,
                        enrollment.studentId());
                return;
            }
            courseAccessGrant.grant(
                    enrollment.organizationId(),
                    courseId,
                    enrollment.studentId());
        });
    }

    private List<UUID> resolvePackageCourseIds(UUID organizationId, UUID packageId) {
        var courseIds = new LinkedHashSet<UUID>();
        var subjectCourses = repository.findSubjectCourses(organizationId);

        repository.findLearningPackageItems(organizationId).stream()
                .filter(item -> packageId.equals(item.packageId()))
                .filter(item -> "ACTIVE".equals(item.status()))
                .forEach(item -> {
                    if (item.courseId() != null) {
                        courseIds.add(item.courseId());
                    }
                    if (item.subjectId() != null) {
                        subjectCourses.stream()
                                .filter(link -> item.subjectId().equals(link.subjectId()))
                                .filter(link -> "ACTIVE".equals(link.status()))
                                .map(link -> link.courseId())
                                .forEach(courseIds::add);
                    }
                });
        return new ArrayList<>(courseIds);
    }

    private Map<UUID, UUID> resolvePackageClassTargets(UUID organizationId, UUID packageId, UUID studentId) {
        var activeMembership = repository.findActiveClassGroupMembership(organizationId, studentId);
        var studentClassGroupId = activeMembership == null
                ? null
                : activeMembership.map(AcademicClassGroupMembership::classGroupId).orElse(null);
        var defaultTargets = new LinkedHashMap<UUID, UUID>();
        var classGroupTargets = new LinkedHashMap<UUID, UUID>();
        repository.findLearningPackageClassTargets(organizationId).stream()
                .filter(target -> packageId.equals(target.packageId()))
                .filter(target -> "ACTIVE".equals(target.status()))
                .forEach(target -> {
                    if (target.classGroupId() == null) {
                        defaultTargets.putIfAbsent(target.courseId(), target.learningClassId());
                    } else if (target.classGroupId().equals(studentClassGroupId)) {
                        classGroupTargets.put(target.courseId(), target.learningClassId());
                    }
                });
        defaultTargets.putAll(classGroupTargets);
        return defaultTargets;
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        var safeStatus = status.trim().toUpperCase();
        if (!List.of("PENDING_APPROVAL", "PENDING_PAYMENT", "ACTIVE", "REJECTED", "CANCELLED").contains(safeStatus)) {
            throw new ValidationException("status", "Unsupported learning package enrollment status");
        }
        return safeStatus;
    }

    private LearningPackageEnrollmentResponse toResponse(AcademicLearningPackageEnrollment e) {
        return new LearningPackageEnrollmentResponse(
                e.id(),
                e.organizationId(),
                e.packageId(),
                e.studentId(),
                e.status(),
                e.decisionNote(),
                e.paymentAmount(),
                e.paymentCurrency(),
                e.paymentReference(),
                e.paymentConfirmedAt(),
                e.paymentConfirmedBy(),
                e.requestedAt(),
                e.decidedAt(),
                e.decidedBy(),
                e.createdAt());
    }

    private LearningPackagePaymentEventResponse toResponse(AcademicLearningPackagePaymentEvent e) {
        return new LearningPackagePaymentEventResponse(
                e.id(),
                e.organizationId(),
                e.enrollmentId(),
                e.packageId(),
                e.studentId(),
                e.eventType(),
                e.amount(),
                e.currency(),
                e.reference(),
                e.actorId(),
                e.note(),
                e.occurredAt(),
                e.createdAt());
    }

    private LearningPackageResponse toPackageResponse(AcademicLearningPackage p) {
        return new LearningPackageResponse(
                p.id(),
                p.organizationId(),
                p.curriculumPlanId(),
                p.code(),
                p.name(),
                p.description(),
                p.packageType(),
                p.price(),
                p.currency(),
                p.enrollmentPolicy(),
                p.status(),
                p.createdAt());
    }
}
