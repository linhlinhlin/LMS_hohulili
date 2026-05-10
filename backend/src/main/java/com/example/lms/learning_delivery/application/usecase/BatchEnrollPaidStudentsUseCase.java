package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.learning_delivery.application.dto.BatchEnrollPaidResult;
import com.example.lms.learning_delivery.domain.event.CourseEnrolledEvent;
import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.domain.repository.EnrollmentRepository;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepository;
import com.example.lms.shared.domain.event.DomainEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Use case for batch enrolling paid students into a class.
 *
 * Option B (Canvas pattern): Teacher assigns students to classes after payment.
 *
 * Single Responsibility:
 * - Enroll multiple students into a class in a single transaction
 * - Skip students who are already enrolled
 * - Return detailed results of the operation
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BatchEnrollPaidStudentsUseCase {

    private final EnrollmentRepository enrollmentRepository;
    private final LearningClassRepository classRepository;
    private final DomainEventPublisher eventPublisher;

    /**
     * Batch enroll paid students into a class.
     *
     * @param classId the target class ID
     * @param studentIds list of student IDs to enroll
     * @return enrollment result with counts and any skipped reasons
     */
    @Transactional
    public BatchEnrollPaidResult execute(UUID classId, List<UUID> studentIds) {
        log.debug("Batch enrolling {} students into class: {}", studentIds.size(), classId);

        // Verify class exists
        LearningClass learningClass = classRepository.findById(classId)
                .orElseThrow(() -> new IllegalArgumentException("Lớp học không tồn tại: " + classId));

        // Get existing enrollments for this class
        Set<UUID> existingStudentIds = enrollmentRepository.findByClassId(classId, PageRequest.of(0, 10000))
                .getContent()
                .stream()
                .map(Enrollment::getStudentId)
                .collect(java.util.stream.Collectors.toSet());

        int enrolledCount = 0;
        int skippedCount = 0;
        List<String> skippedReasons = new ArrayList<>();

        // Enroll each student
        for (UUID studentId : studentIds) {
            if (existingStudentIds.contains(studentId)) {
                skippedCount++;
                skippedReasons.add("Học viên " + studentId + " đã có trong lớp");
                continue;
            }

            try {
                Enrollment enrollment = Enrollment.builder()
                        .studentId(studentId)
                        .learningClass(learningClass)
                        .enrolledAt(java.time.Instant.now())
                        .joinedAt(java.time.Instant.now())
                        .lastAccessedAt(java.time.Instant.now())
                        .status(Enrollment.EnrollmentStatus.ACTIVE)
                        .build();
                Enrollment saved = enrollmentRepository.save(enrollment);
                eventPublisher.publish(new CourseEnrolledEvent(
                        saved.getId(),
                        studentId,
                        learningClass.getId(),
                        learningClass.getCourseId(),
                        null,
                        learningClass.getSemester()
                ));
                enrolledCount++;
                log.debug("Enrolled student {} into class {}", studentId, classId);
            } catch (Exception e) {
                skippedCount++;
                skippedReasons.add("Không thể xếp học viên " + studentId + ": " + e.getMessage());
                log.warn("Failed to enroll student {} into class {}: {}", studentId, classId, e.getMessage());
            }
        }

        if (enrolledCount > 0) {
            return BatchEnrollPaidResult.success(enrolledCount, learningClass.getName());
        } else if (skippedCount > 0) {
            return BatchEnrollPaidResult.partial(0, skippedCount, skippedReasons, learningClass.getName());
        }

        return new BatchEnrollPaidResult(0, 0, List.of(), "Không có học viên nào được xếp");
    }
}
