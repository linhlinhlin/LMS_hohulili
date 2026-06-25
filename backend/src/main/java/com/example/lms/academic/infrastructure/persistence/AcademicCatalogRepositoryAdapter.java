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
}
