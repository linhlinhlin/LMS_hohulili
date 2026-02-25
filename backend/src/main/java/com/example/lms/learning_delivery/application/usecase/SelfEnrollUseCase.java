package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.learning_delivery.application.dto.SelfEnrollCommand;
import com.example.lms.learning_delivery.application.port.PaymentVerificationPort;
import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.domain.repository.EnrollmentRepositoryPort;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepositoryPort;
import com.example.lms.shared.exception.BusinessRuleException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Use case for student self-enrollment in a course.
 *
 * Implements the Canvas "default section" pattern:
 * - For SELF_PACED courses, auto-creates a DEFAULT LearningClass
 * - All self-enrolling students join this default class
 * - Satisfies the class_id NOT NULL constraint without schema migration
 *
 * For PAID courses, verifies that a completed payment exists before enrolling.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SelfEnrollUseCase {

    private static final String DEFAULT_CLASS_NAME = "DEFAULT";

    private final CourseRepository courseRepository;
    private final LearningClassRepositoryPort learningClassRepository;
    private final EnrollmentRepositoryPort enrollmentRepository;
    private final PaymentVerificationPort paymentVerification;

    @Transactional
    public UUID execute(SelfEnrollCommand command) {
        UUID courseId = command.courseId();
        UUID studentId = command.studentId();

        log.info("Self-enrollment: student {} → course {}", studentId, courseId);

        // 1. Verify course exists and is APPROVED
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new BusinessRuleException("Không tìm thấy khóa học"));

        if (course.getStatus() != Course.CourseStatus.APPROVED) {
            throw new BusinessRuleException("Khóa học chưa được duyệt, không thể đăng ký");
        }

        // 2. Check if student already enrolled (idempotent)
        var existingEnrollment = enrollmentRepository.findByStudentIdAndCourseId(studentId, courseId);
        if (existingEnrollment.isPresent()) {
            log.info("Student {} already enrolled in course {}", studentId, courseId);
            return existingEnrollment.get().getId();
        }

        // 3. For PAID courses, verify payment exists
        if (course.getPriceType() == Course.PriceType.PAID) {
            if (!paymentVerification.hasCompletedPayment(studentId, courseId)) {
                throw new BusinessRuleException("Khóa học trả phí — cần thanh toán trước khi đăng ký");
            }
        }

        // 4. Find or create default LearningClass
        LearningClass defaultClass = findOrCreateDefaultClass(courseId, course);

        // 5. Create enrollment
        Enrollment enrollment = Enrollment.builder()
                .learningClass(defaultClass)
                .studentId(studentId)
                .status(Enrollment.EnrollmentStatus.ACTIVE)
                .build();

        Enrollment saved = enrollmentRepository.save(enrollment);
        log.info("Self-enrollment successful: student {} → course {} (enrollment {})",
                studentId, courseId, saved.getId());

        return saved.getId();
    }

    private LearningClass findOrCreateDefaultClass(UUID courseId, Course course) {
        // Check if default class already exists
        var existing = learningClassRepository.findByCourseIdAndName(courseId, DEFAULT_CLASS_NAME);
        if (existing.isPresent()) {
            return existing.get();
        }

        // Create new default class
        String defaultCode = "DEFAULT-" + course.getCode().getValue();
        LearningClass defaultClass = LearningClass.builder()
                .name(DEFAULT_CLASS_NAME)
                .code(defaultCode)
                .courseId(courseId)
                .teacherId(course.getTeacherId())
                .maxStudents(9999)
                .status(LearningClass.ClassStatus.OPEN)
                .build();

        LearningClass saved = learningClassRepository.save(defaultClass);
        log.info("Created default class {} for course {}", saved.getId(), courseId);
        return saved;
    }
}
