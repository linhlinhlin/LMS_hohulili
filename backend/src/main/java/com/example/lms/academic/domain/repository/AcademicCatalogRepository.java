package com.example.lms.academic.domain.repository;

import com.example.lms.academic.domain.model.*;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AcademicCatalogRepository {
    List<AcademicDepartment> findDepartments(UUID organizationId);
    List<AcademicProgram> findPrograms(UUID organizationId);
    List<AcademicCohort> findCohorts(UUID organizationId);
    List<AcademicClassGroup> findClassGroups(UUID organizationId);
    List<AcademicSubject> findSubjects(UUID organizationId);
    List<AcademicSubjectCourse> findSubjectCourses(UUID organizationId);
    List<AcademicTerm> findTerms(UUID organizationId);
    List<AcademicCurriculumPlan> findCurriculumPlans(UUID organizationId);
    List<AcademicCurriculumSubject> findCurriculumSubjects(UUID organizationId);

    Optional<AcademicDepartment> findDepartment(UUID organizationId, UUID id);
    Optional<AcademicProgram> findProgram(UUID organizationId, UUID id);
    Optional<AcademicCohort> findCohort(UUID organizationId, UUID id);
    Optional<AcademicSubject> findSubject(UUID organizationId, UUID id);
    Optional<AcademicTerm> findTerm(UUID organizationId, UUID id);
    Optional<AcademicCurriculumPlan> findCurriculumPlan(UUID organizationId, UUID id);

    boolean departmentCodeExists(UUID organizationId, String code);
    boolean programCodeExists(UUID organizationId, String code);
    boolean cohortCodeExists(UUID organizationId, String code);
    boolean classGroupCodeExists(UUID organizationId, String code);
    boolean subjectCodeExists(UUID organizationId, String code);
    boolean subjectCourseExists(UUID organizationId, UUID subjectId, UUID courseId);
    boolean termCodeExists(UUID organizationId, String code);
    boolean curriculumPlanCodeExists(UUID organizationId, String code);
    boolean curriculumSubjectExists(UUID organizationId, UUID curriculumPlanId, UUID subjectId);

    AcademicDepartment saveDepartment(AcademicDepartment department);
    AcademicProgram saveProgram(AcademicProgram program);
    AcademicCohort saveCohort(AcademicCohort cohort);
    AcademicClassGroup saveClassGroup(AcademicClassGroup classGroup);
    AcademicSubject saveSubject(AcademicSubject subject);
    AcademicSubjectCourse saveSubjectCourse(AcademicSubjectCourse subjectCourse);
    AcademicTerm saveTerm(AcademicTerm term);
    AcademicCurriculumPlan saveCurriculumPlan(AcademicCurriculumPlan plan);
    AcademicCurriculumSubject saveCurriculumSubject(AcademicCurriculumSubject subject);
}
