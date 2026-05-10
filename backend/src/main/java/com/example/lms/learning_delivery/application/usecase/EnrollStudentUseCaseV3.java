package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.learning_delivery.domain.event.CourseEnrolledEvent;
import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.domain.repository.EnrollmentRepositoryPort;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepositoryPort;
import com.example.lms.shared.domain.event.DomainEventPublisher;
import com.example.lms.shared.domain.valueobject.UserId;
import com.example.lms.shared.exception.BusinessRuleException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Use case for enrolling a student in a class.
 * V3 - Uses domain repository ports only (Clean Architecture compliant).
 */
@Service("enrollStudentUseCaseV3")
@RequiredArgsConstructor
@Slf4j
public class EnrollStudentUseCaseV3 {

    @Qualifier("newUserRepositoryAdapter")
    private final UserRepository userRepository;
    private final EnrollmentRepositoryPort enrollmentRepository;
    private final LearningClassRepositoryPort learningClassRepository;
    private final CourseRepository courseRepository;
    private final DomainEventPublisher eventPublisher;

    @Transactional
    public UUID enroll(UUID studentId, UUID classId) {
        log.info("Enrolling student {} to class {} (V3)", studentId, classId);

        // 1. Validate Student exists
        User student = userRepository.findById(new UserId(studentId))
                .orElseThrow(() -> new BusinessRuleException("Student not found: " + studentId));

        // 2. Validate Class exists
        LearningClass learningClass = learningClassRepository.findById(classId)
                .orElseThrow(() -> new BusinessRuleException("Không tìm thấy lớp học"));

        // 3. Verify course allows enrollment
        // Teacher-initiated enrollment: allowed in DRAFT (roster setup) and APPROVED (active course)
        // Blocked in PENDING (under review) and REJECTED (needs revision)
        Course course = courseRepository.findById(learningClass.getCourseId())
                .orElseThrow(() -> new BusinessRuleException("Không tìm thấy khóa học"));
        if (course.getStatus() == Course.CourseStatus.PENDING) {
            throw new BusinessRuleException("Khóa học đang chờ duyệt, không thể thay đổi danh sách lớp");
        }
        if (course.getStatus() == Course.CourseStatus.REJECTED) {
            throw new BusinessRuleException("Khóa học đã bị từ chối, vui lòng chỉnh sửa và gửi duyệt lại trước");
        }

        // 4. Check Duplicate Enrollment
        if (enrollmentRepository.existsByClassIdAndStudentId(classId, studentId)) {
            throw new BusinessRuleException("Student already enrolled in this class");
        }

        // 5. Create and Save Enrollment using domain model
        Enrollment enrollment = Enrollment.builder()
                .learningClass(learningClass)
                .studentId(studentId)
                .status(Enrollment.EnrollmentStatus.ACTIVE)
                .build();

        Enrollment saved = enrollmentRepository.save(enrollment);
        eventPublisher.publish(new CourseEnrolledEvent(
                saved.getId(),
                studentId,
                learningClass.getId(),
                learningClass.getCourseId(),
                course.getTitle(),
                learningClass.getSemester()
        ));

        log.info("Student {} enrolled successfully in class {} with enrollment ID {}",
                studentId, classId, saved.getId());

        return saved.getId();
    }
}
