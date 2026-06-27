package com.example.lms.academic.application.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class AcademicCatalogDtos {
    private AcademicCatalogDtos() {}

    public record CatalogResponse(
            List<DepartmentResponse> departments,
            List<ProgramResponse> programs,
            List<CohortResponse> cohorts,
            List<ClassGroupResponse> classGroups,
            List<SubjectResponse> subjects,
            List<SubjectCourseResponse> subjectCourses,
            List<TermResponse> terms,
            List<CurriculumPlanResponse> curriculumPlans,
            List<CurriculumSubjectResponse> curriculumSubjects,
            List<LearningPackageResponse> learningPackages,
            List<LearningPackageItemResponse> learningPackageItems,
            List<LearningPackageClassTargetResponse> learningPackageClassTargets,
            List<ClassGroupMembershipResponse> classGroupMemberships
    ) {}

    public record CreateDepartmentCommand(
            @NotBlank @Size(max = 64) String code,
            @NotBlank @Size(max = 255) String name
    ) {}

    public record CreateProgramCommand(
            UUID departmentId,
            @NotBlank @Size(max = 64) String code,
            @NotBlank @Size(max = 255) String name,
            @Size(max = 32) String level
    ) {}

    public record CreateCohortCommand(
            @NotBlank @Size(max = 64) String code,
            @NotBlank @Size(max = 255) String name,
            @NotNull @Min(1900) Integer startYear,
            Integer graduationYear
    ) {}

    public record CreateClassGroupCommand(
            @NotNull UUID programId,
            @NotNull UUID cohortId,
            @NotBlank @Size(max = 64) String code,
            @NotBlank @Size(max = 255) String name
    ) {}

    public record CreateSubjectCommand(
            UUID departmentId,
            @NotBlank @Size(max = 64) String code,
            @NotBlank @Size(max = 255) String name,
            @Min(0) Integer credits
    ) {}

    public record LinkSubjectCourseCommand(
            @NotNull UUID subjectId,
            @NotNull UUID courseId,
            boolean primary
    ) {}

    public record CreateTermCommand(
            @NotBlank @Size(max = 64) String code,
            @NotBlank @Size(max = 255) String name,
            @NotBlank @Size(max = 16) String academicYear,
            @NotNull @Min(1) Integer termNumber,
            LocalDate startsOn,
            LocalDate endsOn
    ) {}

    public record CreateCurriculumPlanCommand(
            @NotNull UUID programId,
            UUID cohortId,
            @NotBlank @Size(max = 64) String code,
            @NotBlank @Size(max = 255) String name,
            @Min(0) Integer totalCredits
    ) {}

    public record AddCurriculumSubjectCommand(
            @NotNull UUID curriculumPlanId,
            @NotNull UUID subjectId,
            UUID termId,
            @Min(0) Integer displayOrder,
            Boolean required,
            @Min(0) Integer creditsOverride
    ) {}

    public record CreateLearningPackageCommand(
            UUID curriculumPlanId,
            @NotBlank @Size(max = 64) String code,
            @NotBlank @Size(max = 255) String name,
            @Size(max = 5000) String description,
            @Size(max = 32) String packageType,
            @DecimalMin("0.00") BigDecimal price,
            @Size(min = 3, max = 3) String currency,
            @Size(max = 32) String enrollmentPolicy
    ) {}

    public record AddLearningPackageItemCommand(
            @NotNull UUID packageId,
            UUID subjectId,
            UUID courseId,
            @Min(0) Integer displayOrder,
            Boolean required,
            @DecimalMin("0.0000") BigDecimal revenueWeight
    ) {}

    public record CreateLearningPackageClassTargetCommand(
            @NotNull UUID packageId,
            @NotNull UUID courseId,
            UUID classGroupId,
            @NotNull UUID learningClassId
    ) {}

    public record CreateClassGroupMembershipCommand(
            @NotNull UUID classGroupId,
            @NotNull UUID studentId
    ) {}

    public record TransferClassGroupMembershipCommand(
            @NotNull UUID classGroupId
    ) {}

    public record BulkClassGroupRosterCommand(
            @NotNull UUID classGroupId,
            @NotNull @Size(max = 500) List<String> studentEmails
    ) {}

    public record ReviewLearningPackageEnrollmentCommand(
            @Size(max = 1000) String note,
            @Size(max = 128) String paymentReference
    ) {}

    public record DepartmentResponse(UUID id, UUID organizationId, String code, String name, String status, Instant createdAt) {}
    public record ProgramResponse(UUID id, UUID organizationId, UUID departmentId, String code, String name, String level, String status, Instant createdAt) {}
    public record CohortResponse(UUID id, UUID organizationId, String code, String name, Integer startYear, Integer graduationYear, String status, Instant createdAt) {}
    public record ClassGroupResponse(UUID id, UUID organizationId, UUID programId, UUID cohortId, String code, String name, String status, Instant createdAt) {}
    public record SubjectResponse(UUID id, UUID organizationId, UUID departmentId, String code, String name, Integer credits, String status, Instant createdAt) {}
    public record SubjectCourseResponse(UUID id, UUID organizationId, UUID subjectId, UUID courseId, boolean primary, String status, Instant createdAt) {}
    public record TermResponse(UUID id, UUID organizationId, String code, String name, String academicYear, Integer termNumber, LocalDate startsOn, LocalDate endsOn, String status, Instant createdAt) {}
    public record CurriculumPlanResponse(UUID id, UUID organizationId, UUID programId, UUID cohortId, String code, String name, Integer totalCredits, String status, Instant createdAt) {}
    public record CurriculumSubjectResponse(UUID id, UUID organizationId, UUID curriculumPlanId, UUID subjectId, UUID termId, Integer displayOrder, Boolean required, Integer creditsOverride, String status, Instant createdAt) {}
    public record LearningPackageResponse(UUID id, UUID organizationId, UUID curriculumPlanId, String code, String name, String description, String packageType, BigDecimal price, String currency, String enrollmentPolicy, String status, Instant createdAt) {}
    public record LearningPackageItemResponse(UUID id, UUID organizationId, UUID packageId, UUID subjectId, UUID courseId, Integer displayOrder, Boolean required, BigDecimal revenueWeight, String status, Instant createdAt) {}
    public record LearningPackageClassTargetResponse(UUID id, UUID organizationId, UUID packageId, UUID courseId, UUID classGroupId, UUID learningClassId, String status, Instant createdAt) {}
    public record ClassGroupMembershipResponse(UUID id, UUID organizationId, UUID classGroupId, UUID studentId, String status, Instant joinedAt, Instant leftAt, Instant createdAt) {}
    public record BulkClassGroupRosterRowResponse(String email, String action, String message, ClassGroupMembershipResponse membership) {}
    public record BulkClassGroupRosterResponse(
            int total,
            int assigned,
            int transferred,
            int unchanged,
            int failed,
            List<BulkClassGroupRosterRowResponse> rows
    ) {}
    public record LearningPackageEnrollmentResponse(
            UUID id,
            UUID organizationId,
            UUID packageId,
            UUID studentId,
            String status,
            String decisionNote,
            BigDecimal paymentAmount,
            String paymentCurrency,
            String paymentReference,
            Instant paymentConfirmedAt,
            UUID paymentConfirmedBy,
            Instant requestedAt,
            Instant decidedAt,
            UUID decidedBy,
            Instant createdAt) {}

    public record LearningPackageEnrollmentExportRowResponse(
            UUID id,
            UUID organizationId,
            UUID packageId,
            String packageCode,
            String packageName,
            UUID studentId,
            String studentEmail,
            String studentName,
            String status,
            String decisionNote,
            BigDecimal paymentAmount,
            String paymentCurrency,
            String paymentReference,
            Instant paymentConfirmedAt,
            UUID paymentConfirmedBy,
            Instant requestedAt,
            Instant decidedAt,
            UUID decidedBy,
            Instant createdAt) {}

    public record LearningPackagePaymentEventResponse(
            UUID id,
            UUID organizationId,
            UUID enrollmentId,
            UUID packageId,
            UUID studentId,
            String eventType,
            BigDecimal amount,
            String currency,
            String reference,
            UUID actorId,
            String note,
            Instant occurredAt,
            Instant createdAt
    ) {}

    public record LearningPackageRevenueSplitResponse(
            UUID id,
            UUID organizationId,
            UUID enrollmentId,
            UUID packageId,
            UUID packageItemId,
            UUID subjectId,
            UUID courseId,
            UUID teacherId,
            BigDecimal grossAmount,
            String currency,
            BigDecimal platformFeePct,
            BigDecimal teacherSharePct,
            BigDecimal orgSharePct,
            BigDecimal platformAmount,
            BigDecimal teacherAmount,
            BigDecimal orgAmount,
            String paymentReference,
            Instant createdAt
    ) {}

    public record LearningPackageAvailabilityResponse(
            LearningPackageResponse learningPackage,
            LearningPackageEnrollmentResponse enrollment
    ) {}

    public record LearningPackageRevenueAllocationResponse(
            UUID packageId,
            BigDecimal packagePrice,
            String currency,
            BigDecimal totalWeight,
            BigDecimal allocatedTotal,
            List<LearningPackageRevenueAllocationItemResponse> items
    ) {}

    public record LearningPackageRevenueAllocationItemResponse(
            UUID itemId,
            UUID subjectId,
            UUID courseId,
            Integer displayOrder,
            BigDecimal revenueWeight,
            BigDecimal allocationPct,
            BigDecimal allocatedAmount
    ) {}

    public record LearningPackagePaymentQrResponse(
            LearningPackageEnrollmentResponse enrollment,
            UUID txnId,
            String qrUrl,
            String transferContent,
            String bankCode,
            String accountNumber,
            String accountName,
            BigDecimal amount,
            String currency,
            String packageName
    ) {}
}
