package com.example.lms.academic.application.usecase;

import com.example.lms.academic.application.dto.AcademicCatalogDtos.LearningPackageEnrollmentResponse;
import com.example.lms.academic.application.dto.AcademicCatalogDtos.ReviewLearningPackageEnrollmentCommand;
import com.example.lms.academic.domain.model.AcademicLearningPackage;
import com.example.lms.academic.domain.model.AcademicLearningPackageEnrollment;
import com.example.lms.academic.domain.repository.AcademicCatalogRepository;
import com.example.lms.learning_delivery.application.usecase.GrantCourseAccessUseCase;
import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ManageLearningPackageEnrollmentUseCase {
    private final AcademicCatalogRepository repository;
    private final GrantCourseAccessUseCase courseAccessGrant;

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
        grantActivePackageCourses(completed);
        return toResponse(completed);
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
        var classTargets = resolvePackageClassTargets(enrollment.organizationId(), enrollment.packageId());
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

    private Map<UUID, UUID> resolvePackageClassTargets(UUID organizationId, UUID packageId) {
        var targets = new LinkedHashMap<UUID, UUID>();
        repository.findLearningPackageClassTargets(organizationId).stream()
                .filter(target -> packageId.equals(target.packageId()))
                .filter(target -> "ACTIVE".equals(target.status()))
                .forEach(target -> targets.putIfAbsent(target.courseId(), target.learningClassId()));
        return targets;
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
}
