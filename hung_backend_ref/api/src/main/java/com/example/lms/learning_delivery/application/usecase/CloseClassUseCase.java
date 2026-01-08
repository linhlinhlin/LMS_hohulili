package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.learning_delivery.application.dto.LearningClassResponse;
import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepository;
import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Use case for closing a learning class.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CloseClassUseCase {

    private final LearningClassRepository classRepository;

    @Transactional
    public LearningClassResponse execute(UUID classId) {
        log.info("Closing learning class {}", classId);

        LearningClass learningClass = classRepository.findById(classId)
            .orElseThrow(() -> new EntityNotFoundException("LearningClass", classId));

        if (learningClass.getStatus() == LearningClass.ClassStatus.CLOSED) {
            throw new BusinessRuleException("ALREADY_CLOSED", "Lớp học đã đóng");
        }

        if (learningClass.getStatus() == LearningClass.ClassStatus.ARCHIVED) {
            throw new BusinessRuleException("CLASS_ARCHIVED", "Không thể đóng lớp học đã lưu trữ");
        }

        learningClass.setStatus(LearningClass.ClassStatus.CLOSED);
        learningClass = classRepository.save(learningClass);

        log.info("Learning class {} closed successfully", classId);
        return LearningClassResponse.from(learningClass);
    }
}
