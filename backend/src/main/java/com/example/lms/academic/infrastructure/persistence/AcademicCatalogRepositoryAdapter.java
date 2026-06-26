package com.example.lms.academic.infrastructure.persistence;

import com.example.lms.academic.domain.model.*;
import com.example.lms.academic.domain.repository.AcademicCatalogRepository;
import com.example.lms.academic.infrastructure.persistence.entity.*;
import com.example.lms.academic.infrastructure.persistence.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class AcademicCatalogRepositoryAdapter implements AcademicCatalogRepository {
    private final AcademicDepartmentJpaRepository departments;
    private final AcademicProgramJpaRepository programs;
    private final AcademicCohortJpaRepository cohorts;
    private final AcademicClassGroupJpaRepository classGroups;
    private final AcademicSubjectJpaRepository subjects;
    private final AcademicSubjectCourseJpaRepository subjectCourses;
    private final AcademicTermJpaRepository terms;
    private final AcademicCurriculumPlanJpaRepository curriculumPlans;
    private final AcademicCurriculumSubjectJpaRepository curriculumSubjects;
    private final AcademicLearningPackageJpaRepository learningPackages;
    private final AcademicLearningPackageItemJpaRepository learningPackageItems;
    private final AcademicLearningPackageEnrollmentJpaRepository learningPackageEnrollments;

    @Override
    public List<AcademicDepartment> findDepartments(UUID organizationId) {
        return departments.findByOrganizationIdOrderByNameAsc(organizationId).stream().map(this::toDomain).toList();
    }

    @Override
    public List<AcademicProgram> findPrograms(UUID organizationId) {
        return programs.findByOrganizationIdOrderByNameAsc(organizationId).stream().map(this::toDomain).toList();
    }

    @Override
    public List<AcademicCohort> findCohorts(UUID organizationId) {
        return cohorts.findByOrganizationIdOrderByStartYearDescNameAsc(organizationId).stream().map(this::toDomain).toList();
    }

    @Override
    public List<AcademicClassGroup> findClassGroups(UUID organizationId) {
        return classGroups.findByOrganizationIdOrderByNameAsc(organizationId).stream().map(this::toDomain).toList();
    }

    @Override
    public List<AcademicSubject> findSubjects(UUID organizationId) {
        return subjects.findByOrganizationIdOrderByNameAsc(organizationId).stream().map(this::toDomain).toList();
    }

    @Override
    public List<AcademicSubjectCourse> findSubjectCourses(UUID organizationId) {
        return subjectCourses.findByOrganizationIdOrderByCreatedAtDesc(organizationId).stream().map(this::toDomain).toList();
    }

    @Override
    public List<AcademicTerm> findTerms(UUID organizationId) {
        return terms.findByOrganizationIdOrderByAcademicYearAscTermNumberAsc(organizationId).stream().map(this::toDomain).toList();
    }

    @Override
    public List<AcademicCurriculumPlan> findCurriculumPlans(UUID organizationId) {
        return curriculumPlans.findByOrganizationIdOrderByNameAsc(organizationId).stream().map(this::toDomain).toList();
    }

    @Override
    public List<AcademicCurriculumSubject> findCurriculumSubjects(UUID organizationId) {
        return curriculumSubjects.findByOrganizationIdOrderByDisplayOrderAscCreatedAtAsc(organizationId).stream()
                .map(this::toDomain)
                .toList();
    }

    @Override
    public List<AcademicLearningPackage> findLearningPackages(UUID organizationId) {
        return learningPackages.findByOrganizationIdOrderByNameAsc(organizationId).stream().map(this::toDomain).toList();
    }

    @Override
    public List<AcademicLearningPackageItem> findLearningPackageItems(UUID organizationId) {
        return learningPackageItems.findByOrganizationIdOrderByDisplayOrderAscCreatedAtAsc(organizationId).stream()
                .map(this::toDomain)
                .toList();
    }

    @Override
    public List<AcademicLearningPackageEnrollment> findLearningPackageEnrollments(UUID organizationId, String status) {
        var safeStatus = status == null || status.isBlank() ? null : status.trim().toUpperCase();
        var entities = safeStatus == null
                ? learningPackageEnrollments.findByOrganizationIdOrderByRequestedAtDesc(organizationId)
                : learningPackageEnrollments.findByOrganizationIdAndStatusOrderByRequestedAtDesc(organizationId, safeStatus);
        return entities.stream().map(this::toDomain).toList();
    }

    @Override
    public Optional<AcademicDepartment> findDepartment(UUID organizationId, UUID id) {
        return departments.findByIdAndOrganizationId(id, organizationId).map(this::toDomain);
    }

    @Override
    public Optional<AcademicProgram> findProgram(UUID organizationId, UUID id) {
        return programs.findByIdAndOrganizationId(id, organizationId).map(this::toDomain);
    }

    @Override
    public Optional<AcademicCohort> findCohort(UUID organizationId, UUID id) {
        return cohorts.findByIdAndOrganizationId(id, organizationId).map(this::toDomain);
    }

    @Override
    public Optional<AcademicSubject> findSubject(UUID organizationId, UUID id) {
        return subjects.findByIdAndOrganizationId(id, organizationId).map(this::toDomain);
    }

    @Override
    public Optional<AcademicTerm> findTerm(UUID organizationId, UUID id) {
        return terms.findByIdAndOrganizationId(id, organizationId).map(this::toDomain);
    }

    @Override
    public Optional<AcademicCurriculumPlan> findCurriculumPlan(UUID organizationId, UUID id) {
        return curriculumPlans.findByIdAndOrganizationId(id, organizationId).map(this::toDomain);
    }

    @Override
    public Optional<AcademicLearningPackage> findLearningPackage(UUID organizationId, UUID id) {
        return learningPackages.findByIdAndOrganizationId(id, organizationId).map(this::toDomain);
    }

    @Override
    public Optional<AcademicLearningPackageEnrollment> findLearningPackageEnrollment(UUID organizationId, UUID id) {
        return learningPackageEnrollments.findByIdAndOrganizationId(id, organizationId).map(this::toDomain);
    }

    @Override
    public Optional<AcademicLearningPackageEnrollment> findLearningPackageEnrollment(UUID organizationId, UUID packageId, UUID studentId) {
        return learningPackageEnrollments.findByOrganizationIdAndPackageIdAndStudentId(organizationId, packageId, studentId)
                .map(this::toDomain);
    }

    @Override
    public boolean departmentCodeExists(UUID organizationId, String code) {
        return departments.existsByOrganizationIdAndCodeIgnoreCase(organizationId, code);
    }

    @Override
    public boolean programCodeExists(UUID organizationId, String code) {
        return programs.existsByOrganizationIdAndCodeIgnoreCase(organizationId, code);
    }

    @Override
    public boolean cohortCodeExists(UUID organizationId, String code) {
        return cohorts.existsByOrganizationIdAndCodeIgnoreCase(organizationId, code);
    }

    @Override
    public boolean classGroupCodeExists(UUID organizationId, String code) {
        return classGroups.existsByOrganizationIdAndCodeIgnoreCase(organizationId, code);
    }

    @Override
    public boolean subjectCodeExists(UUID organizationId, String code) {
        return subjects.existsByOrganizationIdAndCodeIgnoreCase(organizationId, code);
    }

    @Override
    public boolean subjectCourseExists(UUID organizationId, UUID subjectId, UUID courseId) {
        return subjectCourses.existsByOrganizationIdAndSubjectIdAndCourseId(organizationId, subjectId, courseId);
    }

    @Override
    public boolean termCodeExists(UUID organizationId, String code) {
        return terms.existsByOrganizationIdAndCodeIgnoreCase(organizationId, code);
    }

    @Override
    public boolean curriculumPlanCodeExists(UUID organizationId, String code) {
        return curriculumPlans.existsByOrganizationIdAndCodeIgnoreCase(organizationId, code);
    }

    @Override
    public boolean curriculumSubjectExists(UUID organizationId, UUID curriculumPlanId, UUID subjectId) {
        return curriculumSubjects.existsByOrganizationIdAndCurriculumPlanIdAndSubjectId(organizationId, curriculumPlanId, subjectId);
    }

    @Override
    public boolean learningPackageCodeExists(UUID organizationId, String code) {
        return learningPackages.existsByOrganizationIdAndCodeIgnoreCase(organizationId, code);
    }

    @Override
    public boolean learningPackageSubjectExists(UUID organizationId, UUID packageId, UUID subjectId) {
        return learningPackageItems.existsByOrganizationIdAndPackageIdAndSubjectId(organizationId, packageId, subjectId);
    }

    @Override
    public boolean learningPackageCourseExists(UUID organizationId, UUID packageId, UUID courseId) {
        return learningPackageItems.existsByOrganizationIdAndPackageIdAndCourseId(organizationId, packageId, courseId);
    }

    @Override
    public AcademicDepartment saveDepartment(AcademicDepartment department) {
        return toDomain(departments.save(toEntity(department)));
    }

    @Override
    public AcademicProgram saveProgram(AcademicProgram program) {
        return toDomain(programs.save(toEntity(program)));
    }

    @Override
    public AcademicCohort saveCohort(AcademicCohort cohort) {
        return toDomain(cohorts.save(toEntity(cohort)));
    }

    @Override
    public AcademicClassGroup saveClassGroup(AcademicClassGroup classGroup) {
        return toDomain(classGroups.save(toEntity(classGroup)));
    }

    @Override
    public AcademicSubject saveSubject(AcademicSubject subject) {
        return toDomain(subjects.save(toEntity(subject)));
    }

    @Override
    public AcademicSubjectCourse saveSubjectCourse(AcademicSubjectCourse subjectCourse) {
        return toDomain(subjectCourses.save(toEntity(subjectCourse)));
    }

    @Override
    public AcademicTerm saveTerm(AcademicTerm term) {
        return toDomain(terms.save(toEntity(term)));
    }

    @Override
    public AcademicCurriculumPlan saveCurriculumPlan(AcademicCurriculumPlan plan) {
        return toDomain(curriculumPlans.save(toEntity(plan)));
    }

    @Override
    public AcademicCurriculumSubject saveCurriculumSubject(AcademicCurriculumSubject subject) {
        return toDomain(curriculumSubjects.save(toEntity(subject)));
    }

    @Override
    public AcademicLearningPackage saveLearningPackage(AcademicLearningPackage learningPackage) {
        return toDomain(learningPackages.save(toEntity(learningPackage)));
    }

    @Override
    public AcademicLearningPackageItem saveLearningPackageItem(AcademicLearningPackageItem item) {
        return toDomain(learningPackageItems.save(toEntity(item)));
    }

    @Override
    public AcademicLearningPackageEnrollment saveLearningPackageEnrollment(AcademicLearningPackageEnrollment enrollment) {
        return toDomain(learningPackageEnrollments.save(toEntity(enrollment)));
    }

    private AcademicDepartment toDomain(AcademicDepartmentJpaEntity e) {
        return new AcademicDepartment(e.getId(), e.getOrganizationId(), e.getCode(), e.getName(), e.getStatus(), e.getCreatedAt(), e.getUpdatedAt());
    }

    private AcademicProgram toDomain(AcademicProgramJpaEntity e) {
        return new AcademicProgram(e.getId(), e.getOrganizationId(), e.getDepartmentId(), e.getCode(), e.getName(), e.getLevel(), e.getStatus(), e.getCreatedAt(), e.getUpdatedAt());
    }

    private AcademicCohort toDomain(AcademicCohortJpaEntity e) {
        return new AcademicCohort(e.getId(), e.getOrganizationId(), e.getCode(), e.getName(), e.getStartYear(), e.getGraduationYear(), e.getStatus(), e.getCreatedAt(), e.getUpdatedAt());
    }

    private AcademicClassGroup toDomain(AcademicClassGroupJpaEntity e) {
        return new AcademicClassGroup(e.getId(), e.getOrganizationId(), e.getProgramId(), e.getCohortId(), e.getCode(), e.getName(), e.getStatus(), e.getCreatedAt(), e.getUpdatedAt());
    }

    private AcademicSubject toDomain(AcademicSubjectJpaEntity e) {
        return new AcademicSubject(e.getId(), e.getOrganizationId(), e.getDepartmentId(), e.getCode(), e.getName(), e.getCredits(), e.getStatus(), e.getCreatedAt(), e.getUpdatedAt());
    }

    private AcademicSubjectCourse toDomain(AcademicSubjectCourseJpaEntity e) {
        return new AcademicSubjectCourse(e.getId(), e.getOrganizationId(), e.getSubjectId(), e.getCourseId(), e.isPrimary(), e.getStatus(), e.getCreatedAt(), e.getUpdatedAt());
    }

    private AcademicTerm toDomain(AcademicTermJpaEntity e) {
        return new AcademicTerm(
                e.getId(),
                e.getOrganizationId(),
                e.getCode(),
                e.getName(),
                e.getAcademicYear(),
                e.getTermNumber(),
                e.getStartsOn(),
                e.getEndsOn(),
                e.getStatus(),
                e.getCreatedAt(),
                e.getUpdatedAt());
    }

    private AcademicCurriculumPlan toDomain(AcademicCurriculumPlanJpaEntity e) {
        return new AcademicCurriculumPlan(
                e.getId(),
                e.getOrganizationId(),
                e.getProgramId(),
                e.getCohortId(),
                e.getCode(),
                e.getName(),
                e.getTotalCredits(),
                e.getStatus(),
                e.getCreatedAt(),
                e.getUpdatedAt());
    }

    private AcademicCurriculumSubject toDomain(AcademicCurriculumSubjectJpaEntity e) {
        return new AcademicCurriculumSubject(
                e.getId(),
                e.getOrganizationId(),
                e.getCurriculumPlanId(),
                e.getSubjectId(),
                e.getTermId(),
                e.getDisplayOrder(),
                e.isRequired(),
                e.getCreditsOverride(),
                e.getStatus(),
                e.getCreatedAt(),
                e.getUpdatedAt());
    }

    private AcademicLearningPackage toDomain(AcademicLearningPackageJpaEntity e) {
        return new AcademicLearningPackage(
                e.getId(),
                e.getOrganizationId(),
                e.getCurriculumPlanId(),
                e.getCode(),
                e.getName(),
                e.getDescription(),
                e.getPackageType(),
                e.getPrice(),
                e.getCurrency(),
                e.getEnrollmentPolicy(),
                e.getStatus(),
                e.getCreatedAt(),
                e.getUpdatedAt());
    }

    private AcademicLearningPackageItem toDomain(AcademicLearningPackageItemJpaEntity e) {
        return new AcademicLearningPackageItem(
                e.getId(),
                e.getOrganizationId(),
                e.getPackageId(),
                e.getSubjectId(),
                e.getCourseId(),
                e.getDisplayOrder(),
                e.isRequired(),
                e.getStatus(),
                e.getCreatedAt(),
                e.getUpdatedAt());
    }

    private AcademicLearningPackageEnrollment toDomain(AcademicLearningPackageEnrollmentJpaEntity e) {
        return new AcademicLearningPackageEnrollment(
                e.getId(),
                e.getOrganizationId(),
                e.getPackageId(),
                e.getStudentId(),
                e.getStatus(),
                e.getDecisionNote(),
                e.getRequestedAt(),
                e.getDecidedAt(),
                e.getDecidedBy(),
                e.getCreatedAt(),
                e.getUpdatedAt());
    }

    private AcademicDepartmentJpaEntity toEntity(AcademicDepartment d) {
        return AcademicDepartmentJpaEntity.builder()
                .id(d.id()).organizationId(d.organizationId()).code(d.code()).name(d.name())
                .status(d.status()).createdAt(d.createdAt()).updatedAt(d.updatedAt()).build();
    }

    private AcademicProgramJpaEntity toEntity(AcademicProgram p) {
        return AcademicProgramJpaEntity.builder()
                .id(p.id()).organizationId(p.organizationId()).departmentId(p.departmentId())
                .code(p.code()).name(p.name()).level(p.level()).status(p.status())
                .createdAt(p.createdAt()).updatedAt(p.updatedAt()).build();
    }

    private AcademicCohortJpaEntity toEntity(AcademicCohort c) {
        return AcademicCohortJpaEntity.builder()
                .id(c.id()).organizationId(c.organizationId()).code(c.code()).name(c.name())
                .startYear(c.startYear()).graduationYear(c.graduationYear()).status(c.status())
                .createdAt(c.createdAt()).updatedAt(c.updatedAt()).build();
    }

    private AcademicClassGroupJpaEntity toEntity(AcademicClassGroup c) {
        return AcademicClassGroupJpaEntity.builder()
                .id(c.id()).organizationId(c.organizationId()).programId(c.programId()).cohortId(c.cohortId())
                .code(c.code()).name(c.name()).status(c.status())
                .createdAt(c.createdAt()).updatedAt(c.updatedAt()).build();
    }

    private AcademicSubjectJpaEntity toEntity(AcademicSubject s) {
        return AcademicSubjectJpaEntity.builder()
                .id(s.id()).organizationId(s.organizationId()).departmentId(s.departmentId())
                .code(s.code()).name(s.name()).credits(s.credits()).status(s.status())
                .createdAt(s.createdAt()).updatedAt(s.updatedAt()).build();
    }

    private AcademicSubjectCourseJpaEntity toEntity(AcademicSubjectCourse s) {
        return AcademicSubjectCourseJpaEntity.builder()
                .id(s.id()).organizationId(s.organizationId()).subjectId(s.subjectId()).courseId(s.courseId())
                .primary(s.primary()).status(s.status()).createdAt(s.createdAt()).updatedAt(s.updatedAt()).build();
    }

    private AcademicTermJpaEntity toEntity(AcademicTerm t) {
        return AcademicTermJpaEntity.builder()
                .id(t.id()).organizationId(t.organizationId()).code(t.code()).name(t.name())
                .academicYear(t.academicYear()).termNumber(t.termNumber()).startsOn(t.startsOn()).endsOn(t.endsOn())
                .status(t.status()).createdAt(t.createdAt()).updatedAt(t.updatedAt()).build();
    }

    private AcademicCurriculumPlanJpaEntity toEntity(AcademicCurriculumPlan p) {
        return AcademicCurriculumPlanJpaEntity.builder()
                .id(p.id()).organizationId(p.organizationId()).programId(p.programId()).cohortId(p.cohortId())
                .code(p.code()).name(p.name()).totalCredits(p.totalCredits()).status(p.status())
                .createdAt(p.createdAt()).updatedAt(p.updatedAt()).build();
    }

    private AcademicCurriculumSubjectJpaEntity toEntity(AcademicCurriculumSubject s) {
        return AcademicCurriculumSubjectJpaEntity.builder()
                .id(s.id()).organizationId(s.organizationId()).curriculumPlanId(s.curriculumPlanId())
                .subjectId(s.subjectId()).termId(s.termId()).displayOrder(s.displayOrder()).required(s.required())
                .creditsOverride(s.creditsOverride()).status(s.status()).createdAt(s.createdAt()).updatedAt(s.updatedAt())
                .build();
    }

    private AcademicLearningPackageJpaEntity toEntity(AcademicLearningPackage p) {
        return AcademicLearningPackageJpaEntity.builder()
                .id(p.id()).organizationId(p.organizationId()).curriculumPlanId(p.curriculumPlanId())
                .code(p.code()).name(p.name()).description(p.description()).packageType(p.packageType())
                .price(p.price()).currency(p.currency()).enrollmentPolicy(p.enrollmentPolicy()).status(p.status())
                .createdAt(p.createdAt()).updatedAt(p.updatedAt()).build();
    }

    private AcademicLearningPackageItemJpaEntity toEntity(AcademicLearningPackageItem i) {
        return AcademicLearningPackageItemJpaEntity.builder()
                .id(i.id()).organizationId(i.organizationId()).packageId(i.packageId()).subjectId(i.subjectId())
                .courseId(i.courseId()).displayOrder(i.displayOrder()).required(i.required()).status(i.status())
                .createdAt(i.createdAt()).updatedAt(i.updatedAt()).build();
    }

    private AcademicLearningPackageEnrollmentJpaEntity toEntity(AcademicLearningPackageEnrollment e) {
        return AcademicLearningPackageEnrollmentJpaEntity.builder()
                .id(e.id()).organizationId(e.organizationId()).packageId(e.packageId()).studentId(e.studentId())
                .status(e.status()).decisionNote(e.decisionNote()).requestedAt(e.requestedAt())
                .decidedAt(e.decidedAt()).decidedBy(e.decidedBy())
                .createdAt(e.createdAt()).updatedAt(e.updatedAt()).build();
    }
}
