package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.learning_delivery.application.dto.DropStudentCommand;
import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.repository.EnrollmentRepository;
import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Use case for dropping a student from a class.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DropStudentUseCase {

    private final EnrollmentRepository enrollmentRepository;

    @Transactional
    public void execute(DropStudentCommand command) {
        log.info("Dropping student {} from class {}", command.studentId(), command.classId());

        Enrollment enrollment = enrollmentRepository
            .findByStudentIdAndClassId(command.studentId(), command.classId())
            .orElseThrow(() -> new EntityNotFoundException("Enrollment", 
                "student=" + command.studentId() + ", class=" + command.classId()));

        if (enrollment.getStatus() == Enrollment.EnrollmentStatus.DROPPED) {
            throw new BusinessRuleException("ALREADY_DROPPED", "Học viên đã bị xóa khỏi lớp học");
        }

        if (enrollment.getStatus() == Enrollment.EnrollmentStatus.COMPLETED) {
            throw new BusinessRuleException("CANNOT_DROP_COMPLETED", 
                "Không thể xóa học viên đã hoàn thành khóa học");
        }

        enrollment.setStatus(Enrollment.EnrollmentStatus.DROPPED);
        enrollmentRepository.save(enrollment);

        log.info("Student {} dropped from class {} successfully", 
            command.studentId(), command.classId());
    }
}
