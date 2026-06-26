package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.course_authoring.application.port.CoursePublicationPort;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.domain.repository.EnrollmentRepositoryPort;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepositoryPort;
import com.example.lms.shared.domain.valueobject.CourseCode;
import com.example.lms.shared.exception.BusinessRuleException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("GrantCourseAccessUseCase Tests")
class GrantCourseAccessUseCaseTest {
    @Mock
    private CourseRepository courseRepository;

    @Mock
    private LearningClassRepositoryPort learningClassRepository;

    @Mock
    private EnrollmentRepositoryPort enrollmentRepository;

    @Mock
    private CoursePublicationPort coursePublicationPort;

    @InjectMocks
    private GrantCourseAccessUseCase useCase;

    @Test
    @DisplayName("grant: creates default class and enrollment for package entitlement")
    void grant_createsDefaultClassAndEnrollment() {
        UUID orgId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();
        Course course = approvedPaidSelfPacedCourse(orgId, teacherId);
        UUID courseId = course.getId();
        UUID enrollmentId = UUID.randomUUID();

        LearningClass savedClass = LearningClass.builder()
                .id(UUID.randomUUID())
                .name("DEFAULT")
                .code("DEFAULT-" + course.getCode().getValue())
                .courseId(courseId)
                .organizationId(orgId)
                .teacherId(teacherId)
                .status(LearningClass.ClassStatus.OPEN)
                .build();

        when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
        when(enrollmentRepository.findByStudentIdAndCourseId(studentId, courseId)).thenReturn(Optional.empty());
        when(learningClassRepository.findByCourseIdAndName(courseId, "DEFAULT")).thenReturn(Optional.empty());
        when(coursePublicationPort.findLatestPublicationId(courseId)).thenReturn(Optional.empty());
        when(learningClassRepository.save(any(LearningClass.class))).thenReturn(savedClass);
        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(invocation -> {
            Enrollment enrollment = invocation.getArgument(0);
            return Enrollment.builder()
                    .id(enrollmentId)
                    .learningClass(enrollment.getLearningClass())
                    .studentId(enrollment.getStudentId())
                    .status(enrollment.getStatus())
                    .build();
        });

        UUID result = useCase.grant(orgId, courseId, studentId);

        assertThat(result).isEqualTo(enrollmentId);

        ArgumentCaptor<LearningClass> classCaptor = ArgumentCaptor.forClass(LearningClass.class);
        verify(learningClassRepository).save(classCaptor.capture());
        assertThat(classCaptor.getValue().getOrganizationId()).isEqualTo(orgId);
        assertThat(classCaptor.getValue().getVersionMode()).isEqualTo(LearningClass.VersionMode.FOLLOW_LATEST);

        ArgumentCaptor<Enrollment> enrollmentCaptor = ArgumentCaptor.forClass(Enrollment.class);
        verify(enrollmentRepository).save(enrollmentCaptor.capture());
        assertThat(enrollmentCaptor.getValue().getStudentId()).isEqualTo(studentId);
        assertThat(enrollmentCaptor.getValue().getStatus()).isEqualTo(Enrollment.EnrollmentStatus.ACTIVE);
    }

    @Test
    @DisplayName("grant: returns existing active enrollment")
    void grant_returnsExistingActiveEnrollment() {
        UUID orgId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        Course course = approvedPaidSelfPacedCourse(orgId, UUID.randomUUID());
        UUID courseId = course.getId();
        UUID enrollmentId = UUID.randomUUID();
        Enrollment existing = Enrollment.builder()
                .id(enrollmentId)
                .studentId(studentId)
                .status(Enrollment.EnrollmentStatus.ACTIVE)
                .build();

        when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
        when(enrollmentRepository.findByStudentIdAndCourseId(studentId, courseId)).thenReturn(Optional.of(existing));

        UUID result = useCase.grant(orgId, courseId, studentId);

        assertThat(result).isEqualTo(enrollmentId);
        verify(learningClassRepository, never()).save(any());
        verify(enrollmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("grant: rejects course from another organization")
    void grant_rejectsCourseFromAnotherOrganization() {
        UUID requestedOrgId = UUID.randomUUID();
        Course course = approvedPaidSelfPacedCourse(UUID.randomUUID(), UUID.randomUUID());

        when(courseRepository.findById(course.getId())).thenReturn(Optional.of(course));

        assertThatThrownBy(() -> useCase.grant(requestedOrgId, course.getId(), UUID.randomUUID()))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("tổ chức");

        verify(enrollmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("grant: rejects instructor-led course until class placement exists")
    void grant_rejectsInstructorLedCourse() {
        UUID orgId = UUID.randomUUID();
        Course course = approvedPaidSelfPacedCourse(orgId, UUID.randomUUID());
        course.updateDeliveryMode(Course.DeliveryMode.INSTRUCTOR_LED);

        when(courseRepository.findById(course.getId())).thenReturn(Optional.of(course));

        assertThatThrownBy(() -> useCase.grant(orgId, course.getId(), UUID.randomUUID()))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("lớp cụ thể");

        verify(enrollmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("grantClass: creates enrollment in concrete instructor-led class")
    void grantClass_createsEnrollmentInConcreteClass() {
        UUID orgId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();
        Course course = approvedPaidSelfPacedCourse(orgId, teacherId);
        course.updateDeliveryMode(Course.DeliveryMode.INSTRUCTOR_LED);
        UUID courseId = course.getId();
        UUID classId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();
        LearningClass learningClass = LearningClass.builder()
                .id(classId)
                .name("VMU K63")
                .code("VMU-K63")
                .courseId(courseId)
                .organizationId(orgId)
                .teacherId(teacherId)
                .maxStudents(30)
                .status(LearningClass.ClassStatus.OPEN)
                .build();

        when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
        when(learningClassRepository.findById(classId)).thenReturn(Optional.of(learningClass));
        when(enrollmentRepository.findByClassIdAndStudentId(classId, studentId)).thenReturn(Optional.empty());
        when(enrollmentRepository.findByStudentIdAndCourseId(studentId, courseId)).thenReturn(Optional.empty());
        when(enrollmentRepository.countActiveByClassId(classId)).thenReturn(12L);
        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(invocation -> {
            Enrollment enrollment = invocation.getArgument(0);
            return Enrollment.builder()
                    .id(enrollmentId)
                    .learningClass(enrollment.getLearningClass())
                    .studentId(enrollment.getStudentId())
                    .status(enrollment.getStatus())
                    .build();
        });

        UUID result = useCase.grantClass(orgId, courseId, classId, studentId);

        assertThat(result).isEqualTo(enrollmentId);
        ArgumentCaptor<Enrollment> enrollmentCaptor = ArgumentCaptor.forClass(Enrollment.class);
        verify(enrollmentRepository).save(enrollmentCaptor.capture());
        assertThat(enrollmentCaptor.getValue().getLearningClass().getId()).isEqualTo(classId);
        assertThat(enrollmentCaptor.getValue().getStudentId()).isEqualTo(studentId);
    }

    @Test
    @DisplayName("grantClass: rejects full class")
    void grantClass_rejectsFullClass() {
        UUID orgId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        Course course = approvedPaidSelfPacedCourse(orgId, UUID.randomUUID());
        UUID classId = UUID.randomUUID();
        LearningClass learningClass = LearningClass.builder()
                .id(classId)
                .name("VMU K63")
                .code("VMU-K63")
                .courseId(course.getId())
                .organizationId(orgId)
                .maxStudents(1)
                .status(LearningClass.ClassStatus.OPEN)
                .build();

        when(courseRepository.findById(course.getId())).thenReturn(Optional.of(course));
        when(learningClassRepository.findById(classId)).thenReturn(Optional.of(learningClass));
        when(enrollmentRepository.findByClassIdAndStudentId(classId, studentId)).thenReturn(Optional.empty());
        when(enrollmentRepository.findByStudentIdAndCourseId(any(), any())).thenReturn(Optional.empty());
        when(enrollmentRepository.countActiveByClassId(classId)).thenReturn(1L);

        assertThatThrownBy(() -> useCase.grantClass(orgId, course.getId(), classId, studentId))
                .isInstanceOfSatisfying(BusinessRuleException.class,
                        exception -> assertThat(exception.getRuleName()).isEqualTo("CLASS_FULL"));

        verify(enrollmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("grantClass: rejects active enrollment in another class of the same course")
    void grantClass_rejectsActiveEnrollmentInDifferentClass() {
        UUID orgId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        Course course = approvedPaidSelfPacedCourse(orgId, UUID.randomUUID());
        UUID classId = UUID.randomUUID();
        LearningClass learningClass = LearningClass.builder()
                .id(classId)
                .name("VMU K63")
                .code("VMU-K63")
                .courseId(course.getId())
                .organizationId(orgId)
                .maxStudents(30)
                .status(LearningClass.ClassStatus.OPEN)
                .build();
        Enrollment otherClassEnrollment = Enrollment.builder()
                .id(UUID.randomUUID())
                .studentId(studentId)
                .status(Enrollment.EnrollmentStatus.ACTIVE)
                .build();

        when(courseRepository.findById(course.getId())).thenReturn(Optional.of(course));
        when(learningClassRepository.findById(classId)).thenReturn(Optional.of(learningClass));
        when(enrollmentRepository.findByClassIdAndStudentId(classId, studentId)).thenReturn(Optional.empty());
        when(enrollmentRepository.findByStudentIdAndCourseId(studentId, course.getId()))
                .thenReturn(Optional.of(otherClassEnrollment));

        assertThatThrownBy(() -> useCase.grantClass(orgId, course.getId(), classId, studentId))
                .isInstanceOfSatisfying(BusinessRuleException.class,
                        exception -> assertThat(exception.getRuleName())
                                .isEqualTo("COURSE_ALREADY_ENROLLED_DIFFERENT_CLASS"));

        verify(enrollmentRepository, never()).save(any());
    }

    private Course approvedPaidSelfPacedCourse(UUID orgId, UUID teacherId) {
        Course course = Course.create(CourseCode.of("VMU-GRANT-" + UUID.randomUUID().toString().substring(0, 8)),
                "VMU grant course",
                "Course used for package grant tests",
                teacherId);
        course.assignOrganization(orgId);
        course.updatePricing(Course.PriceType.PAID, BigDecimal.valueOf(100000), null);
        course.addChapter("Chapter 1", "Content");
        course.submitForApproval();
        course.approve(UUID.randomUUID(), "Approved");
        return course;
    }
}
