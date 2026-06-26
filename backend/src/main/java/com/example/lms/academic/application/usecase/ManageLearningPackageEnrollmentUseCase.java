package com.example.lms.academic.application.usecase;

import com.example.lms.academic.application.dto.AcademicCatalogDtos.LearningPackageEnrollmentResponse;
import com.example.lms.academic.application.dto.AcademicCatalogDtos.ReviewLearningPackageEnrollmentCommand;
import com.example.lms.academic.domain.model.AcademicLearningPackage;
import com.example.lms.academic.domain.model.AcademicLearningPackageEnrollment;
import com.example.lms.academic.domain.repository.AcademicCatalogRepository;
import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ManageLearningPackageEnrollmentUseCase {
    private final AcademicCatalogRepository repository;

    public LearningPackageEnrollmentResponse requestEnrollment(UUID organizationId, UUID packageId, UUID studentId) {
        var learningPackage = requireLearningPackage(organizationId, packageId);
        if (!"ACTIVE".equals(learningPackage.status())) {
            throw new BusinessRuleException(
                    "PACKAGE_NOT_ACTIVE",
                    "Only active learning packages can receive enrollments");
        }
        return repository.findLearningPackageEnrollment(organizationId, packageId, studentId)
                .map(this::toResponse)
                .orElseGet(() -> toResponse(repository.saveLearningPackageEnrollment(
                        AcademicLearningPackageEnrollment.request(
                                organizationId,
                                packageId,
                                studentId,
                                learningPackage.enrollmentPolicy()))));
    }

    public List<LearningPackageEnrollmentResponse> listEnrollments(UUID organizationId, String status) {
        var safeStatus = normalizeStatus(status);
        return repository.findLearningPackageEnrollments(organizationId, safeStatus).stream()
                .map(this::toResponse)
                .toList();
    }

    public LearningPackageEnrollmentResponse approve(
            UUID organizationId,
            UUID enrollmentId,
            UUID approverId,
            ReviewLearningPackageEnrollmentCommand command) {
        var enrollment = requireEnrollment(organizationId, enrollmentId);
        return toResponse(repository.saveLearningPackageEnrollment(
                enrollment.approve(approverId, command == null ? null : command.note())));
    }

    public LearningPackageEnrollmentResponse reject(
            UUID organizationId,
            UUID enrollmentId,
            UUID approverId,
            ReviewLearningPackageEnrollmentCommand command) {
        var enrollment = requireEnrollment(organizationId, enrollmentId);
        return toResponse(repository.saveLearningPackageEnrollment(
                enrollment.reject(approverId, command == null ? null : command.note())));
    }

    private AcademicLearningPackage requireLearningPackage(UUID organizationId, UUID packageId) {
        return repository.findLearningPackage(organizationId, packageId)
                .orElseThrow(() -> new EntityNotFoundException("AcademicLearningPackage", packageId));
    }

    private AcademicLearningPackageEnrollment requireEnrollment(UUID organizationId, UUID enrollmentId) {
        return repository.findLearningPackageEnrollment(organizationId, enrollmentId)
                .orElseThrow(() -> new EntityNotFoundException("AcademicLearningPackageEnrollment", enrollmentId));
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
                e.requestedAt(),
                e.decidedAt(),
                e.decidedBy(),
                e.createdAt());
    }
}
