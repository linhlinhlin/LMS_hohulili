package com.example.lms.academic.application.usecase;

import com.example.lms.academic.application.dto.AcademicCatalogDtos.AddCurriculumSubjectCommand;
import com.example.lms.academic.application.dto.AcademicCatalogDtos.AddLearningPackageItemCommand;
import com.example.lms.academic.application.dto.AcademicCatalogDtos.CreateCurriculumPlanCommand;
import com.example.lms.academic.application.dto.AcademicCatalogDtos.CreateLearningPackageClassTargetCommand;
import com.example.lms.academic.application.dto.AcademicCatalogDtos.CreateLearningPackageCommand;
import com.example.lms.academic.application.dto.AcademicCatalogDtos.LinkSubjectCourseCommand;
import com.example.lms.academic.domain.model.AcademicCohort;
import com.example.lms.academic.domain.model.AcademicCurriculumPlan;
import com.example.lms.academic.domain.model.AcademicLearningPackage;
import com.example.lms.academic.domain.model.AcademicSubject;
import com.example.lms.academic.domain.model.AcademicTerm;
import com.example.lms.academic.domain.model.AcademicProgram;
import com.example.lms.academic.domain.repository.AcademicCatalogRepository;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepositoryPort;
import com.example.lms.shared.domain.valueobject.CourseCode;
import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.shared.exception.EntityNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ManageAcademicCatalogUseCase Tests")
class ManageAcademicCatalogUseCaseTest {
    @Mock
    private AcademicCatalogRepository repository;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private LearningClassRepositoryPort learningClassRepository;

    @InjectMocks
    private ManageAcademicCatalogUseCase useCase;

    @Test
    @DisplayName("linkSubjectCourse: rejects course from another organization")
    void linkSubjectCourse_rejectsCourseFromAnotherOrganization() {
        UUID organizationId = UUID.randomUUID();
        UUID otherOrganizationId = UUID.randomUUID();
        UUID subjectId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();

        when(repository.findSubject(organizationId, subjectId))
                .thenReturn(Optional.of(subject(subjectId, organizationId)));
        when(courseRepository.findById(courseId))
                .thenReturn(Optional.of(course(otherOrganizationId)));

        var command = new LinkSubjectCourseCommand(subjectId, courseId, true);

        assertThatThrownBy(() -> useCase.linkSubjectCourse(organizationId, command))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("Course does not belong");
        verify(repository, never()).saveSubjectCourse(any());
    }

    @Test
    @DisplayName("linkSubjectCourse: links course when subject and course belong to same organization")
    void linkSubjectCourse_allowsSameOrganizationCourse() {
        UUID organizationId = UUID.randomUUID();
        UUID subjectId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();

        when(repository.findSubject(organizationId, subjectId))
                .thenReturn(Optional.of(subject(subjectId, organizationId)));
        when(courseRepository.findById(courseId))
                .thenReturn(Optional.of(course(organizationId)));
        when(repository.subjectCourseExists(organizationId, subjectId, courseId)).thenReturn(false);
        when(repository.saveSubjectCourse(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = useCase.linkSubjectCourse(
                organizationId,
                new LinkSubjectCourseCommand(subjectId, courseId, true));

        assertThat(response.organizationId()).isEqualTo(organizationId);
        assertThat(response.subjectId()).isEqualTo(subjectId);
        assertThat(response.courseId()).isEqualTo(courseId);
        assertThat(response.primary()).isTrue();
    }

    @Test
    @DisplayName("createCurriculumPlan: creates plan for same-organization program and cohort")
    void createCurriculumPlan_allowsSameOrganizationProgramAndCohort() {
        UUID organizationId = UUID.randomUUID();
        UUID programId = UUID.randomUUID();
        UUID cohortId = UUID.randomUUID();

        when(repository.findProgram(organizationId, programId))
                .thenReturn(Optional.of(program(programId, organizationId)));
        when(repository.findCohort(organizationId, cohortId))
                .thenReturn(Optional.of(cohort(cohortId, organizationId)));
        when(repository.curriculumPlanCodeExists(organizationId, "CNTT-K63")).thenReturn(false);
        when(repository.saveCurriculumPlan(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = useCase.createCurriculumPlan(
                organizationId,
                new CreateCurriculumPlanCommand(
                        programId,
                        cohortId,
                        "cntt-k63",
                        "Khung chương trình CNTT hàng hải K63",
                        128));

        assertThat(response.organizationId()).isEqualTo(organizationId);
        assertThat(response.programId()).isEqualTo(programId);
        assertThat(response.cohortId()).isEqualTo(cohortId);
        assertThat(response.code()).isEqualTo("CNTT-K63");
        assertThat(response.totalCredits()).isEqualTo(128);
    }

    @Test
    @DisplayName("addCurriculumSubject: rejects term outside organization")
    void addCurriculumSubject_rejectsTermOutsideOrganization() {
        UUID organizationId = UUID.randomUUID();
        UUID planId = UUID.randomUUID();
        UUID subjectId = UUID.randomUUID();
        UUID termId = UUID.randomUUID();

        when(repository.findCurriculumPlan(organizationId, planId))
                .thenReturn(Optional.of(curriculumPlan(planId, organizationId)));
        when(repository.findSubject(organizationId, subjectId))
                .thenReturn(Optional.of(subject(subjectId, organizationId)));
        when(repository.findTerm(organizationId, termId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> useCase.addCurriculumSubject(
                organizationId,
                new AddCurriculumSubjectCommand(planId, subjectId, termId, 10, true, null)))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("AcademicTerm");
        verify(repository, never()).saveCurriculumSubject(any());
    }

    @Test
    @DisplayName("createLearningPackage: creates package for same-organization curriculum plan")
    void createLearningPackage_allowsSameOrganizationCurriculumPlan() {
        UUID organizationId = UUID.randomUUID();
        UUID planId = UUID.randomUUID();

        when(repository.findCurriculumPlan(organizationId, planId))
                .thenReturn(Optional.of(curriculumPlan(planId, organizationId)));
        when(repository.learningPackageCodeExists(organizationId, "VMU-DKT-K63")).thenReturn(false);
        when(repository.saveLearningPackage(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = useCase.createLearningPackage(
                organizationId,
                new CreateLearningPackageCommand(
                        planId,
                        "vmu-dkt-k63",
                        "Gói Điều khiển tàu biển K63",
                        "Gói học theo khung chương trình",
                        "CURRICULUM_BUNDLE",
                        BigDecimal.valueOf(1200000),
                        "VND",
                        "ORG_APPROVAL"));

        assertThat(response.organizationId()).isEqualTo(organizationId);
        assertThat(response.curriculumPlanId()).isEqualTo(planId);
        assertThat(response.code()).isEqualTo("VMU-DKT-K63");
        assertThat(response.price()).isEqualByComparingTo("1200000");
        assertThat(response.enrollmentPolicy()).isEqualTo("ORG_APPROVAL");
    }

    @Test
    @DisplayName("addLearningPackageItem: rejects course from another organization")
    void addLearningPackageItem_rejectsCourseFromAnotherOrganization() {
        UUID organizationId = UUID.randomUUID();
        UUID otherOrganizationId = UUID.randomUUID();
        UUID packageId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();

        when(repository.findLearningPackage(organizationId, packageId))
                .thenReturn(Optional.of(learningPackage(packageId, organizationId)));
        when(courseRepository.findById(courseId))
                .thenReturn(Optional.of(course(otherOrganizationId)));

        assertThatThrownBy(() -> useCase.addLearningPackageItem(
                organizationId,
                new AddLearningPackageItemCommand(packageId, null, courseId, 1, true)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("Course does not belong");
        verify(repository, never()).saveLearningPackageItem(any());
    }

    @Test
    @DisplayName("createLearningPackageClassTarget: maps package course to same-organization class")
    void createLearningPackageClassTarget_allowsSameOrganizationClass() {
        UUID organizationId = UUID.randomUUID();
        UUID packageId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();

        when(repository.findLearningPackage(organizationId, packageId))
                .thenReturn(Optional.of(learningPackage(packageId, organizationId)));
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(course(organizationId)));
        when(learningClassRepository.findById(classId))
                .thenReturn(Optional.of(learningClass(classId, organizationId, courseId)));
        when(repository.learningPackageClassTargetExists(organizationId, packageId, courseId)).thenReturn(false);
        when(repository.saveLearningPackageClassTarget(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = useCase.createLearningPackageClassTarget(
                organizationId,
                new CreateLearningPackageClassTargetCommand(packageId, courseId, classId));

        assertThat(response.organizationId()).isEqualTo(organizationId);
        assertThat(response.packageId()).isEqualTo(packageId);
        assertThat(response.courseId()).isEqualTo(courseId);
        assertThat(response.learningClassId()).isEqualTo(classId);
    }

    @Test
    @DisplayName("createLearningPackageClassTarget: rejects class mapped to another course")
    void createLearningPackageClassTarget_rejectsClassFromAnotherCourse() {
        UUID organizationId = UUID.randomUUID();
        UUID packageId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();

        when(repository.findLearningPackage(organizationId, packageId))
                .thenReturn(Optional.of(learningPackage(packageId, organizationId)));
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(course(organizationId)));
        when(learningClassRepository.findById(classId))
                .thenReturn(Optional.of(learningClass(classId, organizationId, UUID.randomUUID())));

        assertThatThrownBy(() -> useCase.createLearningPackageClassTarget(
                organizationId,
                new CreateLearningPackageClassTargetCommand(packageId, courseId, classId)))
                .isInstanceOf(com.example.lms.shared.exception.ValidationException.class)
                .hasMessageContaining("khóa học đã chọn");

        verify(repository, never()).saveLearningPackageClassTarget(any());
    }

    private AcademicSubject subject(UUID id, UUID organizationId) {
        return new AcademicSubject(
                id,
                organizationId,
                null,
                "NAV101",
                "Navigation",
                3,
                "ACTIVE",
                Instant.now(),
                null);
    }

    private AcademicProgram program(UUID id, UUID organizationId) {
        return new AcademicProgram(
                id,
                organizationId,
                null,
                "CNTT-HH",
                "Maritime IT",
                "Đại học",
                "ACTIVE",
                Instant.now(),
                null);
    }

    private AcademicCohort cohort(UUID id, UUID organizationId) {
        return new AcademicCohort(
                id,
                organizationId,
                "K63",
                "Khóa 63",
                2022,
                2026,
                "ACTIVE",
                Instant.now(),
                null);
    }

    private AcademicCurriculumPlan curriculumPlan(UUID id, UUID organizationId) {
        return new AcademicCurriculumPlan(
                id,
                organizationId,
                UUID.randomUUID(),
                UUID.randomUUID(),
                "CNTT-K63",
                "Khung chương trình CNTT hàng hải K63",
                128,
                "ACTIVE",
                Instant.now(),
                null);
    }

    private AcademicLearningPackage learningPackage(UUID id, UUID organizationId) {
        return new AcademicLearningPackage(
                id,
                organizationId,
                UUID.randomUUID(),
                "VMU-DKT-K63",
                "Gói Điều khiển tàu biển K63",
                null,
                "CURRICULUM_BUNDLE",
                BigDecimal.ZERO,
                "VND",
                "ORG_APPROVAL",
                "ACTIVE",
                Instant.now(),
                null);
    }

    @SuppressWarnings("unused")
    private AcademicTerm term(UUID id, UUID organizationId) {
        return new AcademicTerm(
                id,
                organizationId,
                "2022-HK1",
                "Học kỳ 1",
                "2022-2023",
                1,
                null,
                null,
                "ACTIVE",
                Instant.now(),
                null);
    }

    private Course course(UUID organizationId) {
        Course course = Course.create(
                CourseCode.of("NAV101"),
                "Navigation Basics",
                "Core navigation course",
                UUID.randomUUID());
        course.assignOrganization(organizationId);
        return course;
    }

    private LearningClass learningClass(UUID id, UUID organizationId, UUID courseId) {
        return LearningClass.builder()
                .id(id)
                .organizationId(organizationId)
                .courseId(courseId)
                .name("VMU K63")
                .code("VMU-K63-" + id.toString().substring(0, 8))
                .status(LearningClass.ClassStatus.OPEN)
                .build();
    }
}
