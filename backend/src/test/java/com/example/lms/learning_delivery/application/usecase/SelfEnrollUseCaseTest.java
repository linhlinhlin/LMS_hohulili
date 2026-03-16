package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CoursePublicationJpaRepository;
import com.example.lms.learning_delivery.application.dto.SelfEnrollCommand;
import com.example.lms.learning_delivery.application.port.PaymentVerificationPort;
import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.domain.repository.EnrollmentRepositoryPort;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepositoryPort;
import com.example.lms.shared.domain.valueobject.CourseCode;
import com.example.lms.shared.exception.BusinessRuleException;
import org.junit.jupiter.api.BeforeEach;
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

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SelfEnrollUseCase Tests")
class SelfEnrollUseCaseTest {

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private LearningClassRepositoryPort learningClassRepository;

    @Mock
    private EnrollmentRepositoryPort enrollmentRepository;

    @Mock
    private PaymentVerificationPort paymentVerification;

    @Mock
    private CoursePublicationJpaRepository publicationRepository;

    @InjectMocks
    private SelfEnrollUseCase useCase;

    private UUID courseId;
    private UUID studentId;
    private UUID teacherId;
    private UUID reviewerId;
    private LearningClass defaultClass;

    @BeforeEach
    void setUp() {
        courseId = UUID.randomUUID();
        studentId = UUID.randomUUID();
        teacherId = UUID.randomUUID();
        reviewerId = UUID.randomUUID();
        lenient().when(publicationRepository.findTopByCourseIdOrderByPublicationNumberDesc(any()))
                .thenReturn(Optional.empty());

        defaultClass = LearningClass.builder()
                .id(UUID.randomUUID())
                .name("DEFAULT")
                .code("DEFAULT-COURSE-001")
                .courseId(courseId)
                .teacherId(teacherId)
                .maxStudents(9999)
                .status(LearningClass.ClassStatus.OPEN)
                .build();
    }

    private Course createApprovedFreeCourse() {
        Course course = Course.create(CourseCode.of("COURSE-001"), "Khóa học miễn phí", "Mô tả", teacherId);
        course.addChapter("Chương 1", "Nội dung");
        // Move through lifecycle: DRAFT → PENDING → APPROVED
        course.submitForApproval();
        course.approve(reviewerId, "Đã duyệt");
        return course;
    }

    private Course createApprovedPaidCourse() {
        Course course = Course.create(CourseCode.of("COURSE-002"), "Khóa học trả phí", "Mô tả", teacherId);
        // Set pricing while in DRAFT (editable)
        course.updatePricing(Course.PriceType.PAID, BigDecimal.valueOf(500000), null);
        course.addChapter("Chương 1", "Nội dung");
        // Move through lifecycle
        course.submitForApproval();
        course.approve(reviewerId, "Đã duyệt");
        return course;
    }

    private Course createApprovedInstructorLedCourse() {
        Course course = Course.create(CourseCode.of("COURSE-003"), "Lop hoc co giang vien", "Mo ta", teacherId);
        course.updateDeliveryMode(Course.DeliveryMode.INSTRUCTOR_LED);
        course.addChapter("Chuong 1", "Noi dung");
        course.submitForApproval();
        course.approve(reviewerId, "Da duyet");
        return course;
    }

    @Test
    @DisplayName("Should create default class and enrollment for FREE SELF_PACED course")
    void selfEnroll_freeCourse_createsDefaultClassAndEnrollment() {
        // Given
        UUID enrollmentId = UUID.randomUUID();
        Course course = createApprovedFreeCourse();
        courseId = course.getId();

        when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
        when(enrollmentRepository.findByStudentIdAndCourseId(studentId, courseId)).thenReturn(Optional.empty());
        when(learningClassRepository.findByCourseIdAndName(courseId, "DEFAULT")).thenReturn(Optional.empty());
        when(learningClassRepository.save(any(LearningClass.class))).thenReturn(defaultClass);

        Enrollment savedEnrollment = Enrollment.builder()
                .id(enrollmentId)
                .learningClass(defaultClass)
                .studentId(studentId)
                .status(Enrollment.EnrollmentStatus.ACTIVE)
                .build();
        when(enrollmentRepository.save(any(Enrollment.class))).thenReturn(savedEnrollment);

        // When
        UUID result = useCase.execute(new SelfEnrollCommand(courseId, studentId));

        // Then
        assertThat(result).isEqualTo(enrollmentId);

        // Verify default class was created
        ArgumentCaptor<LearningClass> classCaptor = ArgumentCaptor.forClass(LearningClass.class);
        verify(learningClassRepository).save(classCaptor.capture());
        LearningClass createdClass = classCaptor.getValue();
        assertThat(createdClass.getName()).isEqualTo("DEFAULT");
        assertThat(createdClass.getCode()).isEqualTo("DEFAULT-COURSE-001");
        assertThat(createdClass.getCourseId()).isEqualTo(courseId);

        // Verify enrollment was created
        ArgumentCaptor<Enrollment> enrollCaptor = ArgumentCaptor.forClass(Enrollment.class);
        verify(enrollmentRepository).save(enrollCaptor.capture());
        assertThat(enrollCaptor.getValue().getStudentId()).isEqualTo(studentId);
        assertThat(enrollCaptor.getValue().getStatus()).isEqualTo(Enrollment.EnrollmentStatus.ACTIVE);
    }

    @Test
    @DisplayName("Should reject enrollment if course not APPROVED")
    void selfEnroll_rejectsIfCourseNotApproved() {
        // Given — DRAFT course
        Course draftCourse = Course.create(CourseCode.of("COURSE-DRAFT"), "Draft", "desc", teacherId);
        courseId = draftCourse.getId();
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(draftCourse));

        // When/Then
        assertThatThrownBy(() -> useCase.execute(new SelfEnrollCommand(courseId, studentId)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("chưa được duyệt");

        verify(enrollmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should reject enrollment for PAID course without payment")
    void selfEnroll_rejectsIfNotPaid() {
        // Given
        Course paidCourse = createApprovedPaidCourse();
        courseId = paidCourse.getId();

        when(courseRepository.findById(courseId)).thenReturn(Optional.of(paidCourse));
        when(enrollmentRepository.findByStudentIdAndCourseId(studentId, courseId)).thenReturn(Optional.empty());
        when(paymentVerification.hasCompletedPayment(studentId, courseId)).thenReturn(false);

        // When/Then
        assertThatThrownBy(() -> useCase.execute(new SelfEnrollCommand(courseId, studentId)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("thanh toán");

        verify(enrollmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should reject self-enroll for INSTRUCTOR_LED course")
    void selfEnroll_rejectsInstructorLedCourse() {
        Course course = createApprovedInstructorLedCourse();
        courseId = course.getId();

        when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));

        assertThatThrownBy(() -> useCase.execute(new SelfEnrollCommand(courseId, studentId)))
                .isInstanceOf(BusinessRuleException.class);

        verify(learningClassRepository, never()).save(any());
        verify(enrollmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should return existing enrollment ID if already enrolled (idempotent)")
    void selfEnroll_returnsExistingIfAlreadyEnrolled() {
        // Given
        UUID existingEnrollmentId = UUID.randomUUID();
        Course course = createApprovedFreeCourse();
        courseId = course.getId();

        Enrollment existingEnrollment = Enrollment.builder()
                .id(existingEnrollmentId)
                .learningClass(defaultClass)
                .studentId(studentId)
                .status(Enrollment.EnrollmentStatus.ACTIVE)
                .build();

        when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
        when(enrollmentRepository.findByStudentIdAndCourseId(studentId, courseId))
                .thenReturn(Optional.of(existingEnrollment));

        // When
        UUID result = useCase.execute(new SelfEnrollCommand(courseId, studentId));

        // Then
        assertThat(result).isEqualTo(existingEnrollmentId);
        verify(learningClassRepository, never()).save(any());
        verify(enrollmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should reuse existing default class for second student")
    void selfEnroll_reusesExistingDefaultClass() {
        // Given
        UUID enrollmentId = UUID.randomUUID();
        Course course = createApprovedFreeCourse();
        courseId = course.getId();

        when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
        when(enrollmentRepository.findByStudentIdAndCourseId(studentId, courseId)).thenReturn(Optional.empty());
        when(learningClassRepository.findByCourseIdAndName(courseId, "DEFAULT")).thenReturn(Optional.of(defaultClass));

        Enrollment savedEnrollment = Enrollment.builder()
                .id(enrollmentId)
                .learningClass(defaultClass)
                .studentId(studentId)
                .status(Enrollment.EnrollmentStatus.ACTIVE)
                .build();
        when(enrollmentRepository.save(any(Enrollment.class))).thenReturn(savedEnrollment);

        // When
        UUID result = useCase.execute(new SelfEnrollCommand(courseId, studentId));

        // Then
        assertThat(result).isEqualTo(enrollmentId);
        // Default class should NOT be created again
        verify(learningClassRepository, never()).save(any());
        // But enrollment should be created
        verify(enrollmentRepository).save(any(Enrollment.class));
    }

    @Test
    @DisplayName("Should enroll in PAID course when payment is completed")
    void selfEnroll_worksForPaidCourseWithPayment() {
        // Given
        UUID enrollmentId = UUID.randomUUID();
        Course paidCourse = createApprovedPaidCourse();
        courseId = paidCourse.getId();

        when(courseRepository.findById(courseId)).thenReturn(Optional.of(paidCourse));
        when(enrollmentRepository.findByStudentIdAndCourseId(studentId, courseId)).thenReturn(Optional.empty());
        when(paymentVerification.hasCompletedPayment(studentId, courseId)).thenReturn(true);
        when(learningClassRepository.findByCourseIdAndName(courseId, "DEFAULT")).thenReturn(Optional.of(defaultClass));

        Enrollment savedEnrollment = Enrollment.builder()
                .id(enrollmentId)
                .learningClass(defaultClass)
                .studentId(studentId)
                .status(Enrollment.EnrollmentStatus.ACTIVE)
                .build();
        when(enrollmentRepository.save(any(Enrollment.class))).thenReturn(savedEnrollment);

        // When
        UUID result = useCase.execute(new SelfEnrollCommand(courseId, studentId));

        // Then
        assertThat(result).isEqualTo(enrollmentId);
        verify(paymentVerification).hasCompletedPayment(studentId, courseId);
        verify(enrollmentRepository).save(any(Enrollment.class));
    }

    @Test
    @DisplayName("Should reactivate dropped enrollment after successful repayment")
    void selfEnroll_reactivatesDroppedEnrollment() {
        Course paidCourse = createApprovedPaidCourse();
        courseId = paidCourse.getId();

        Enrollment droppedEnrollment = Enrollment.builder()
                .id(UUID.randomUUID())
                .learningClass(defaultClass)
                .studentId(studentId)
                .status(Enrollment.EnrollmentStatus.DROPPED)
                .build();

        when(courseRepository.findById(courseId)).thenReturn(Optional.of(paidCourse));
        when(enrollmentRepository.findByStudentIdAndCourseId(studentId, courseId))
                .thenReturn(Optional.of(droppedEnrollment));
        when(paymentVerification.hasCompletedPayment(studentId, courseId)).thenReturn(true);
        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UUID result = useCase.execute(new SelfEnrollCommand(courseId, studentId));

        assertThat(result).isEqualTo(droppedEnrollment.getId());
        assertThat(droppedEnrollment.getStatus()).isEqualTo(Enrollment.EnrollmentStatus.ACTIVE);
        verify(enrollmentRepository).save(droppedEnrollment);
        verify(learningClassRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should throw when course not found")
    void selfEnroll_throwsWhenCourseNotFound() {
        // Given
        UUID unknownCourseId = UUID.randomUUID();
        when(courseRepository.findById(unknownCourseId)).thenReturn(Optional.empty());

        // When/Then
        assertThatThrownBy(() -> useCase.execute(new SelfEnrollCommand(unknownCourseId, studentId)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("Không tìm thấy khóa học");
    }
}
