package com.example.lms.academic.application.usecase;

import com.example.lms.academic.application.dto.AcademicCatalogDtos.AddCurriculumSubjectCommand;
import com.example.lms.academic.application.dto.AcademicCatalogDtos.AddLearningPackageItemCommand;
import com.example.lms.academic.application.dto.AcademicCatalogDtos.BulkClassGroupRosterCommand;
import com.example.lms.academic.application.dto.AcademicCatalogDtos.CreateClassGroupMembershipCommand;
import com.example.lms.academic.application.dto.AcademicCatalogDtos.CreateCurriculumPlanCommand;
import com.example.lms.academic.application.dto.AcademicCatalogDtos.CreateLearningPackageClassTargetCommand;
import com.example.lms.academic.application.dto.AcademicCatalogDtos.CreateLearningPackageCommand;
import com.example.lms.academic.application.dto.AcademicCatalogDtos.LinkSubjectCourseCommand;
import com.example.lms.academic.application.dto.AcademicCatalogDtos.TransferClassGroupMembershipCommand;
import com.example.lms.academic.domain.model.AcademicClassGroupMembership;
import com.example.lms.academic.domain.model.AcademicClassGroup;
import com.example.lms.academic.domain.model.AcademicCohort;
import com.example.lms.academic.domain.model.AcademicCurriculumPlan;
import com.example.lms.academic.domain.model.AcademicLearningPackage;
import com.example.lms.academic.domain.model.AcademicProgram;
import com.example.lms.academic.domain.model.AcademicSubject;
import com.example.lms.academic.domain.model.AcademicTerm;
import com.example.lms.academic.domain.repository.AcademicCatalogRepository;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.identity.domain.model.Role;
import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepositoryPort;
import com.example.lms.shared.domain.valueobject.CourseCode;
import com.example.lms.shared.domain.valueobject.Email;
import com.example.lms.shared.domain.valueobject.UserId;
import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.exception.ValidationException;
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

    @Mock
    private UserRepository userRepository;

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

        assertThatThrownBy(() -> useCase.linkSubjectCourse(
                organizationId,
                new LinkSubjectCourseCommand(subjectId, courseId, true)))
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
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(course(organizationId)));
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
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(course(otherOrganizationId)));

        assertThatThrownBy(() -> useCase.addLearningPackageItem(
                organizationId,
                new AddLearningPackageItemCommand(packageId, null, courseId, 1, true, null)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("Course does not belong");

        verify(repository, never()).saveLearningPackageItem(any());
    }

    @Test
    @DisplayName("addLearningPackageItem: stores explicit revenue allocation weight")
    void addLearningPackageItem_storesRevenueWeight() {
        UUID organizationId = UUID.randomUUID();
        UUID packageId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();

        when(repository.findLearningPackage(organizationId, packageId))
                .thenReturn(Optional.of(learningPackage(packageId, organizationId)));
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(course(organizationId)));
        when(repository.learningPackageCourseExists(organizationId, packageId, courseId)).thenReturn(false);
        when(repository.saveLearningPackageItem(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = useCase.addLearningPackageItem(
                organizationId,
                new AddLearningPackageItemCommand(
                        packageId,
                        null,
                        courseId,
                        1,
                        true,
                        new BigDecimal("2.5000")));

        assertThat(response.organizationId()).isEqualTo(organizationId);
        assertThat(response.packageId()).isEqualTo(packageId);
        assertThat(response.courseId()).isEqualTo(courseId);
        assertThat(response.revenueWeight()).isEqualByComparingTo("2.5000");
    }

    @Test
    @DisplayName("addLearningPackageItem: rejects negative revenue allocation weight")
    void addLearningPackageItem_rejectsNegativeRevenueWeight() {
        UUID organizationId = UUID.randomUUID();
        UUID packageId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();

        when(repository.findLearningPackage(organizationId, packageId))
                .thenReturn(Optional.of(learningPackage(packageId, organizationId)));
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(course(organizationId)));
        when(repository.learningPackageCourseExists(organizationId, packageId, courseId)).thenReturn(false);

        assertThatThrownBy(() -> useCase.addLearningPackageItem(
                organizationId,
                new AddLearningPackageItemCommand(
                        packageId,
                        null,
                        courseId,
                        1,
                        true,
                        new BigDecimal("-1.0000"))))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("revenueWeight");

        verify(repository, never()).saveLearningPackageItem(any());
    }

    @Test
    @DisplayName("createLearningPackageClassTarget: maps package course to default same-organization class")
    void createLearningPackageClassTarget_allowsDefaultSameOrganizationClass() {
        UUID organizationId = UUID.randomUUID();
        UUID packageId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();

        when(repository.findLearningPackage(organizationId, packageId))
                .thenReturn(Optional.of(learningPackage(packageId, organizationId)));
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(course(organizationId)));
        when(learningClassRepository.findById(classId))
                .thenReturn(Optional.of(learningClass(classId, organizationId, courseId)));
        when(repository.learningPackageClassTargetExists(organizationId, packageId, courseId, null)).thenReturn(false);
        when(repository.saveLearningPackageClassTarget(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = useCase.createLearningPackageClassTarget(
                organizationId,
                new CreateLearningPackageClassTargetCommand(packageId, courseId, null, classId));

        assertThat(response.organizationId()).isEqualTo(organizationId);
        assertThat(response.packageId()).isEqualTo(packageId);
        assertThat(response.courseId()).isEqualTo(courseId);
        assertThat(response.classGroupId()).isNull();
        assertThat(response.learningClassId()).isEqualTo(classId);
    }

    @Test
    @DisplayName("createLearningPackageClassTarget: maps package course to class group-specific class")
    void createLearningPackageClassTarget_allowsClassGroupSpecificTarget() {
        UUID organizationId = UUID.randomUUID();
        UUID packageId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        UUID classGroupId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();

        when(repository.findLearningPackage(organizationId, packageId))
                .thenReturn(Optional.of(learningPackage(packageId, organizationId)));
        when(repository.findClassGroup(organizationId, classGroupId))
                .thenReturn(Optional.of(classGroup(classGroupId, organizationId)));
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(course(organizationId)));
        when(learningClassRepository.findById(classId))
                .thenReturn(Optional.of(learningClass(classId, organizationId, courseId)));
        when(repository.learningPackageClassTargetExists(organizationId, packageId, courseId, classGroupId)).thenReturn(false);
        when(repository.saveLearningPackageClassTarget(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = useCase.createLearningPackageClassTarget(
                organizationId,
                new CreateLearningPackageClassTargetCommand(packageId, courseId, classGroupId, classId));

        assertThat(response.classGroupId()).isEqualTo(classGroupId);
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
                new CreateLearningPackageClassTargetCommand(packageId, courseId, null, classId)))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("khóa học đã chọn");

        verify(repository, never()).saveLearningPackageClassTarget(any());
    }

    @Test
    @DisplayName("assignClassGroupMembership: assigns same-organization student")
    void assignClassGroupMembership_assignsSameOrganizationStudent() {
        UUID organizationId = UUID.randomUUID();
        UUID classGroupId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        when(repository.findClassGroup(organizationId, classGroupId))
                .thenReturn(Optional.of(classGroup(classGroupId, organizationId)));
        when(userRepository.findById(UserId.of(studentId)))
                .thenReturn(Optional.of(user(studentId, organizationId, Role.STUDENT)));
        when(repository.activeClassGroupMembershipExists(organizationId, studentId)).thenReturn(false);
        when(repository.saveClassGroupMembership(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = useCase.assignClassGroupMembership(
                organizationId,
                new CreateClassGroupMembershipCommand(classGroupId, studentId));

        assertThat(response.organizationId()).isEqualTo(organizationId);
        assertThat(response.classGroupId()).isEqualTo(classGroupId);
        assertThat(response.studentId()).isEqualTo(studentId);
        assertThat(response.status()).isEqualTo("ACTIVE");
    }

    @Test
    @DisplayName("assignClassGroupMembership: rejects teacher account")
    void assignClassGroupMembership_rejectsTeacherAccount() {
        UUID organizationId = UUID.randomUUID();
        UUID classGroupId = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();

        when(repository.findClassGroup(organizationId, classGroupId))
                .thenReturn(Optional.of(classGroup(classGroupId, organizationId)));
        when(userRepository.findById(UserId.of(teacherId)))
                .thenReturn(Optional.of(user(teacherId, organizationId, Role.TEACHER)));

        assertThatThrownBy(() -> useCase.assignClassGroupMembership(
                organizationId,
                new CreateClassGroupMembershipCommand(classGroupId, teacherId)))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("học viên");

        verify(repository, never()).saveClassGroupMembership(any());
    }

    @Test
    @DisplayName("transferClassGroupMembership: closes current membership and creates active target membership")
    void transferClassGroupMembership_transfersActiveMembership() {
        UUID organizationId = UUID.randomUUID();
        UUID membershipId = UUID.randomUUID();
        UUID oldClassGroupId = UUID.randomUUID();
        UUID newClassGroupId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        when(repository.findClassGroup(organizationId, newClassGroupId))
                .thenReturn(Optional.of(classGroup(newClassGroupId, organizationId)));
        when(repository.findClassGroupMembership(organizationId, membershipId))
                .thenReturn(Optional.of(classGroupMembership(membershipId, organizationId, oldClassGroupId, studentId, "ACTIVE")));
        when(repository.replaceClassGroupMembership(any(), any())).thenAnswer(invocation -> invocation.getArgument(1));

        var response = useCase.transferClassGroupMembership(
                organizationId,
                membershipId,
                new TransferClassGroupMembershipCommand(newClassGroupId));

        assertThat(response.organizationId()).isEqualTo(organizationId);
        assertThat(response.classGroupId()).isEqualTo(newClassGroupId);
        assertThat(response.studentId()).isEqualTo(studentId);
        assertThat(response.status()).isEqualTo("ACTIVE");
        verify(repository).replaceClassGroupMembership(
                org.mockito.ArgumentMatchers.argThat(previous ->
                        "INACTIVE".equals(previous.status())
                                && oldClassGroupId.equals(previous.classGroupId())
                                && previous.leftAt() != null),
                org.mockito.ArgumentMatchers.argThat(next ->
                        "ACTIVE".equals(next.status())
                                && newClassGroupId.equals(next.classGroupId())
                                && studentId.equals(next.studentId())));
    }

    @Test
    @DisplayName("transferClassGroupMembership: rejects same target class group")
    void transferClassGroupMembership_rejectsSameClassGroup() {
        UUID organizationId = UUID.randomUUID();
        UUID membershipId = UUID.randomUUID();
        UUID classGroupId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        when(repository.findClassGroup(organizationId, classGroupId))
                .thenReturn(Optional.of(classGroup(classGroupId, organizationId)));
        when(repository.findClassGroupMembership(organizationId, membershipId))
                .thenReturn(Optional.of(classGroupMembership(membershipId, organizationId, classGroupId, studentId, "ACTIVE")));

        assertThatThrownBy(() -> useCase.transferClassGroupMembership(
                organizationId,
                membershipId,
                new TransferClassGroupMembershipCommand(classGroupId)))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("different");

        verify(repository, never()).replaceClassGroupMembership(any(), any());
    }

    @Test
    @DisplayName("importClassGroupRoster: processes mixed roster rows independently")
    void importClassGroupRoster_processesMixedRowsIndependently() {
        UUID organizationId = UUID.randomUUID();
        UUID targetClassGroupId = UUID.randomUUID();
        UUID oldClassGroupId = UUID.randomUUID();
        UUID newStudentId = UUID.randomUUID();
        UUID transferStudentId = UUID.randomUUID();
        UUID sameStudentId = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();

        when(repository.findClassGroup(organizationId, targetClassGroupId))
                .thenReturn(Optional.of(classGroup(targetClassGroupId, organizationId)));
        when(userRepository.findByEmail("new@maritime.edu"))
                .thenReturn(Optional.of(user(newStudentId, organizationId, Role.STUDENT)));
        when(userRepository.findByEmail("move@maritime.edu"))
                .thenReturn(Optional.of(user(transferStudentId, organizationId, Role.STUDENT)));
        when(userRepository.findByEmail("same@maritime.edu"))
                .thenReturn(Optional.of(user(sameStudentId, organizationId, Role.STUDENT)));
        when(userRepository.findByEmail("missing@maritime.edu")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("teacher@maritime.edu"))
                .thenReturn(Optional.of(user(teacherId, organizationId, Role.TEACHER)));
        when(repository.findActiveClassGroupMembership(organizationId, newStudentId))
                .thenReturn(Optional.empty());
        when(repository.findActiveClassGroupMembership(organizationId, transferStudentId))
                .thenReturn(Optional.of(classGroupMembership(
                        UUID.randomUUID(),
                        organizationId,
                        oldClassGroupId,
                        transferStudentId,
                        "ACTIVE")));
        when(repository.findActiveClassGroupMembership(organizationId, sameStudentId))
                .thenReturn(Optional.of(classGroupMembership(
                        UUID.randomUUID(),
                        organizationId,
                        targetClassGroupId,
                        sameStudentId,
                        "ACTIVE")));
        when(repository.saveClassGroupMembership(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(repository.replaceClassGroupMembership(any(), any())).thenAnswer(invocation -> invocation.getArgument(1));

        var response = useCase.importClassGroupRoster(
                organizationId,
                new BulkClassGroupRosterCommand(
                        targetClassGroupId,
                        java.util.List.of(
                                " NEW@maritime.edu ",
                                "move@maritime.edu",
                                "same@maritime.edu",
                                "missing@maritime.edu",
                                "teacher@maritime.edu",
                                "new@maritime.edu")));

        assertThat(response.total()).isEqualTo(6);
        assertThat(response.assigned()).isEqualTo(1);
        assertThat(response.transferred()).isEqualTo(1);
        assertThat(response.unchanged()).isEqualTo(2);
        assertThat(response.failed()).isEqualTo(2);
        assertThat(response.rows()).extracting(row -> row.action())
                .containsExactly("ASSIGNED", "TRANSFERRED", "UNCHANGED", "FAILED", "FAILED", "UNCHANGED");
        verify(repository).saveClassGroupMembership(any());
        verify(repository).replaceClassGroupMembership(
                org.mockito.ArgumentMatchers.argThat(previous ->
                        "INACTIVE".equals(previous.status())
                                && oldClassGroupId.equals(previous.classGroupId())
                                && previous.leftAt() != null),
                org.mockito.ArgumentMatchers.argThat(next ->
                        "ACTIVE".equals(next.status())
                                && targetClassGroupId.equals(next.classGroupId())
                                && transferStudentId.equals(next.studentId())));
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

    private AcademicClassGroup classGroup(UUID id, UUID organizationId) {
        return new AcademicClassGroup(
                id,
                organizationId,
                UUID.randomUUID(),
                UUID.randomUUID(),
                "CNT63DH",
                "CNT63ĐH",
                "ACTIVE",
                Instant.now(),
                null);
    }

    private AcademicClassGroupMembership classGroupMembership(
            UUID id,
            UUID organizationId,
            UUID classGroupId,
            UUID studentId,
            String status) {
        return new AcademicClassGroupMembership(
                id,
                organizationId,
                classGroupId,
                studentId,
                status,
                Instant.now(),
                null,
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

    private User user(UUID id, UUID organizationId, Role role) {
        return User.builder()
                .id(UserId.of(id))
                .username("user-" + id.toString().substring(0, 8))
                .email(Email.of("user-" + id + "@maritime.edu"))
                .password("encoded")
                .fullName("VMU User")
                .role(role)
                .enabled(true)
                .organizationId(organizationId)
                .createdAt(Instant.now())
                .build();
    }
}
