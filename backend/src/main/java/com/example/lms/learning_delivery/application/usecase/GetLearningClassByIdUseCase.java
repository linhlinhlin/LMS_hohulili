package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.learning_delivery.application.dto.LearningClassResponse;
import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Use case for getting a learning class by ID.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GetLearningClassByIdUseCase {

    private final LearningClassRepository classRepository;

    @Transactional(readOnly = true)
    public LearningClassResponse execute(UUID classId) {
        log.debug("Getting learning class {}", classId);

        LearningClass learningClass = classRepository.findById(classId)
                .orElseThrow(() -> new EntityNotFoundException("Lớp học", classId));

        return LearningClassResponse.from(learningClass);
    }
}
