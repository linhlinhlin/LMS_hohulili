package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.domain.repository.EnrollmentRepository;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepository;
import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Use case for deleting a learning class.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DeleteLearningClassUseCase {

    private final LearningClassRepository classRepository;
    private final EnrollmentRepository enrollmentRepository;

    @Transactional
    public void execute(UUID classId) {
        log.info("Deleting learning class {}", classId);

        LearningClass learningClass = classRepository.findById(classId)
                .orElseThrow(() -> new EntityNotFoundException("Lớp học", classId));

        // Check if class has ACTIVE students (DROPPED students should not block deletion)
        long activeStudentCount = enrollmentRepository.countActiveByClassId(classId);
        if (activeStudentCount > 0) {
            throw new BusinessRuleException("CANNOT_DELETE_CLASS_WITH_STUDENTS",
                    "Không thể xóa lớp học có học viên đang hoạt động. Vui lòng xóa tất cả học viên trước.");
        }

        classRepository.delete(learningClass);

        log.info("Learning class {} deleted successfully", classId);
    }
}
