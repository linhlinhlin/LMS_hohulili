package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.course_authoring.application.port.CoursePublicationPort;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.domain.repository.EnrollmentRepositoryPort;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepositoryPort;
import com.example.lms.shared.exception.BusinessRuleException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Grants course access from an already validated entitlement, such as an organization package.
 *
 * This intentionally does not replace SelfEnrollUseCase: self-enrollment must still enforce
 * course-level payment, while organization/package approvals can grant access after their own
 * business checks have succeeded.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GrantCourseAccessUseCase {
    private static final String DEFAULT_CLASS_NAME = "DEFAULT";

    private final CourseRepository courseRepository;
    private final LearningClassRepositoryPort learningClassRepository;
    private final EnrollmentRepositoryPort enrollmentRepository;
    private final CoursePublicationPort coursePublicationPort;

    @Transactional
    public UUID grant(UUID organizationId, UUID courseId, UUID studentId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new BusinessRuleException("COURSE_NOT_FOUND", "Không tìm thấy khóa học"));

        if (!Objects.equals(course.getOrganizationId(), organizationId)) {
            throw new BusinessRuleException("COURSE_ORG_MISMATCH", "Khóa học không thuộc tổ chức này");
        }
        if (course.getStatus() != Course.CourseStatus.APPROVED) {
            throw new BusinessRuleException("COURSE_NOT_APPROVED", "Khóa học chưa được duyệt");
        }
        if (course.getDeliveryMode() != Course.DeliveryMode.SELF_PACED) {
            throw new BusinessRuleException(
                    "COURSE_REQUIRES_CLASS_PLACEMENT",
                    "Khóa học có giảng viên cần xếp vào lớp cụ thể, chưa thể cấp qua gói tự học");
        }

        var existingEnrollment = enrollmentRepository.findByStudentIdAndCourseId(studentId, courseId);
        if (existingEnrollment.isPresent()) {
            var enrollment = existingEnrollment.get();
            if (enrollment.getStatus() == Enrollment.EnrollmentStatus.ACTIVE
                    || enrollment.getStatus() == Enrollment.EnrollmentStatus.COMPLETED) {
                return enrollment.getId();
            }
            if (enrollment.getStatus() == Enrollment.EnrollmentStatus.DROPPED
                    || enrollment.getStatus() == Enrollment.EnrollmentStatus.SUSPENDED) {
                enrollment.reactivate();
                return enrollmentRepository.save(enrollment).getId();
            }
        }

        LearningClass defaultClass = findOrCreateDefaultClass(organizationId, courseId, course);
        Instant now = Instant.now();
        Enrollment enrollment = Enrollment.builder()
                .learningClass(defaultClass)
                .studentId(studentId)
                .status(Enrollment.EnrollmentStatus.ACTIVE)
                .enrolledAt(now)
                .joinedAt(now)
                .lastAccessedAt(now)
                .build();

        Enrollment saved = enrollmentRepository.save(enrollment);
        log.info("Granted course access: org={}, student={}, course={}, enrollment={}",
                organizationId, studentId, courseId, saved.getId());
        return saved.getId();
    }

    @Transactional
    public UUID grantClass(UUID organizationId, UUID courseId, UUID learningClassId, UUID studentId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new BusinessRuleException("COURSE_NOT_FOUND", "Không tìm thấy khóa học"));
        if (!Objects.equals(course.getOrganizationId(), organizationId)) {
            throw new BusinessRuleException("COURSE_ORG_MISMATCH", "Khóa học không thuộc tổ chức này");
        }
        if (course.getStatus() != Course.CourseStatus.APPROVED) {
            throw new BusinessRuleException("COURSE_NOT_APPROVED", "Khóa học chưa được duyệt");
        }

        LearningClass learningClass = learningClassRepository.findById(learningClassId)
                .orElseThrow(() -> new BusinessRuleException("CLASS_NOT_FOUND", "Không tìm thấy lớp học"));
        if (!Objects.equals(learningClass.getOrganizationId(), organizationId)) {
            throw new BusinessRuleException("CLASS_ORG_MISMATCH", "Lớp học không thuộc tổ chức này");
        }
        if (!Objects.equals(learningClass.getCourseId(), courseId)) {
            throw new BusinessRuleException("CLASS_COURSE_MISMATCH", "Lớp học không thuộc khóa học này");
        }
        if (!learningClass.canEnrollStudents()) {
            throw new BusinessRuleException("CLASS_NOT_OPEN", "Lớp học chưa mở ghi danh");
        }

        var existingClassEnrollment = enrollmentRepository.findByClassIdAndStudentId(learningClassId, studentId);
        if (existingClassEnrollment.isPresent()) {
            return ensureActiveEnrollment(existingClassEnrollment.get());
        }
        var existingCourseEnrollment = enrollmentRepository.findByStudentIdAndCourseId(studentId, courseId);
        if (existingCourseEnrollment.isPresent()
                && (existingCourseEnrollment.get().getStatus() == Enrollment.EnrollmentStatus.ACTIVE
                || existingCourseEnrollment.get().getStatus() == Enrollment.EnrollmentStatus.COMPLETED)) {
            throw new BusinessRuleException(
                    "COURSE_ALREADY_ENROLLED_DIFFERENT_CLASS",
                    "Học viên đã có ghi danh ở lớp khác của khóa học này");
        }

        Integer maxStudents = learningClass.getMaxStudents();
        if (maxStudents != null && enrollmentRepository.countActiveByClassId(learningClassId) >= maxStudents) {
            throw new BusinessRuleException("CLASS_FULL", "Lớp học đã đủ số lượng học viên");
        }

        Instant now = Instant.now();
        Enrollment enrollment = Enrollment.builder()
                .learningClass(learningClass)
                .studentId(studentId)
                .status(Enrollment.EnrollmentStatus.ACTIVE)
                .enrolledAt(now)
                .joinedAt(now)
                .lastAccessedAt(now)
                .build();

        Enrollment saved = enrollmentRepository.save(enrollment);
        log.info("Granted class access: org={}, student={}, course={}, class={}, enrollment={}",
                organizationId, studentId, courseId, learningClassId, saved.getId());
        return saved.getId();
    }

    @Transactional
    public void revoke(UUID organizationId, UUID courseId, UUID studentId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new BusinessRuleException("COURSE_NOT_FOUND", "Không tìm thấy khóa học"));
        if (!Objects.equals(course.getOrganizationId(), organizationId)) {
            throw new BusinessRuleException("COURSE_ORG_MISMATCH", "Khóa học không thuộc tổ chức này");
        }

        enrollmentRepository.findByStudentIdAndCourseId(studentId, courseId).ifPresent(enrollment -> {
            if (enrollment.getStatus() == Enrollment.EnrollmentStatus.COMPLETED) {
                throw new BusinessRuleException(
                        "PACKAGE_ACCESS_ALREADY_COMPLETED",
                        "Không thể tự động thu hồi khóa học đã hoàn thành; cần xử lý học vụ thủ công");
            }
            if (enrollment.getStatus() != Enrollment.EnrollmentStatus.DROPPED) {
                enrollment.drop();
                enrollmentRepository.save(enrollment);
            }
        });
    }

    private LearningClass findOrCreateDefaultClass(UUID organizationId, UUID courseId, Course course) {
        return learningClassRepository.findByCourseIdAndName(courseId, DEFAULT_CLASS_NAME)
                .orElseGet(() -> createDefaultClass(organizationId, courseId, course));
    }

    private UUID ensureActiveEnrollment(Enrollment enrollment) {
        if (enrollment.getStatus() == Enrollment.EnrollmentStatus.ACTIVE
                || enrollment.getStatus() == Enrollment.EnrollmentStatus.COMPLETED) {
            return enrollment.getId();
        }
        if (enrollment.getStatus() == Enrollment.EnrollmentStatus.DROPPED
                || enrollment.getStatus() == Enrollment.EnrollmentStatus.SUSPENDED) {
            enrollment.reactivate();
            return enrollmentRepository.save(enrollment).getId();
        }
        return enrollment.getId();
    }

    private LearningClass createDefaultClass(UUID organizationId, UUID courseId, Course course) {
        UUID latestPublicationId = coursePublicationPort.findLatestPublicationId(courseId).orElse(null);
        LearningClass defaultClass = LearningClass.builder()
                .name(DEFAULT_CLASS_NAME)
                .code("DEFAULT-" + course.getCode().getValue())
                .courseId(courseId)
                .organizationId(organizationId)
                .courseVersionId(latestPublicationId)
                .versionMode(LearningClass.VersionMode.FOLLOW_LATEST)
                .teacherId(course.getTeacherId())
                .maxStudents(9999)
                .status(LearningClass.ClassStatus.OPEN)
                .build();

        try {
            return learningClassRepository.save(defaultClass);
        } catch (DataIntegrityViolationException e) {
            return learningClassRepository.findByCourseIdAndName(courseId, DEFAULT_CLASS_NAME)
                    .orElseThrow(() -> new BusinessRuleException(
                            "DEFAULT_CLASS_CREATE_FAILED",
                            "Không thể tạo lớp mặc định cho khóa học"));
        }
    }
}
