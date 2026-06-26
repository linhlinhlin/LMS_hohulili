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
    List<AcademicLearningPackage> findLearningPackages(UUID organizationId);
    List<AcademicLearningPackageItem> findLearningPackageItems(UUID organizationId);
    List<AcademicLearningPackageClassTarget> findLearningPackageClassTargets(UUID organizationId);
    List<AcademicClassGroupMembership> findClassGroupMemberships(UUID organizationId);
    List<AcademicLearningPackageEnrollment> findLearningPackageEnrollments(UUID organizationId, String status);

    Optional<AcademicDepartment> findDepartment(UUID organizationId, UUID id);
    Optional<AcademicProgram> findProgram(UUID organizationId, UUID id);
    Optional<AcademicCohort> findCohort(UUID organizationId, UUID id);
    Optional<AcademicClassGroup> findClassGroup(UUID organizationId, UUID id);
    Optional<AcademicSubject> findSubject(UUID organizationId, UUID id);
    Optional<AcademicTerm> findTerm(UUID organizationId, UUID id);
    Optional<AcademicCurriculumPlan> findCurriculumPlan(UUID organizationId, UUID id);
    Optional<AcademicLearningPackage> findLearningPackage(UUID organizationId, UUID id);
    Optional<AcademicClassGroupMembership> findActiveClassGroupMembership(UUID organizationId, UUID studentId);
    Optional<AcademicLearningPackageEnrollment> findLearningPackageEnrollment(UUID organizationId, UUID id);
    Optional<AcademicLearningPackageEnrollment> findLearningPackageEnrollment(UUID organizationId, UUID packageId, UUID studentId);

    boolean departmentCodeExists(UUID organizationId, String code);
    boolean programCodeExists(UUID organizationId, String code);
    boolean cohortCodeExists(UUID organizationId, String code);
    boolean classGroupCodeExists(UUID organizationId, String code);
    boolean subjectCodeExists(UUID organizationId, String code);
    boolean subjectCourseExists(UUID organizationId, UUID subjectId, UUID courseId);
    boolean termCodeExists(UUID organizationId, String code);
    boolean curriculumPlanCodeExists(UUID organizationId, String code);
    boolean curriculumSubjectExists(UUID organizationId, UUID curriculumPlanId, UUID subjectId);
    boolean learningPackageCodeExists(UUID organizationId, String code);
    boolean learningPackageSubjectExists(UUID organizationId, UUID packageId, UUID subjectId);
    boolean learningPackageCourseExists(UUID organizationId, UUID packageId, UUID courseId);
    boolean learningPackageClassTargetExists(UUID organizationId, UUID packageId, UUID courseId, UUID classGroupId);
    boolean activeClassGroupMembershipExists(UUID organizationId, UUID studentId);

    AcademicDepartment saveDepartment(AcademicDepartment department);
    AcademicProgram saveProgram(AcademicProgram program);
    AcademicCohort saveCohort(AcademicCohort cohort);
    AcademicClassGroup saveClassGroup(AcademicClassGroup classGroup);
    AcademicSubject saveSubject(AcademicSubject subject);
    AcademicSubjectCourse saveSubjectCourse(AcademicSubjectCourse subjectCourse);
    AcademicTerm saveTerm(AcademicTerm term);
    AcademicCurriculumPlan saveCurriculumPlan(AcademicCurriculumPlan plan);
    AcademicCurriculumSubject saveCurriculumSubject(AcademicCurriculumSubject subject);
    AcademicLearningPackage saveLearningPackage(AcademicLearningPackage learningPackage);
    AcademicLearningPackageItem saveLearningPackageItem(AcademicLearningPackageItem item);
    AcademicLearningPackageClassTarget saveLearningPackageClassTarget(AcademicLearningPackageClassTarget target);
    AcademicClassGroupMembership saveClassGroupMembership(AcademicClassGroupMembership membership);
    AcademicLearningPackageEnrollment saveLearningPackageEnrollment(AcademicLearningPackageEnrollment enrollment);
}
