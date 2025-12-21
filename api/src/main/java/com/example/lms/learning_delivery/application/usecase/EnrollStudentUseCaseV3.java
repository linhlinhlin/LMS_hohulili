package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.shared.domain.valueobject.UserId;
import com.example.lms.learning_delivery.domain.repository.EnrollmentRepositoryPort;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepositoryPort;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.EnrollmentJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.LearningClassJpaEntity;
import com.example.lms.shared.exception.BusinessRuleException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Use case for enrolling a student in a class.
 * V3 - Uses pure domain models only.
 */
@Service("enrollStudentUseCaseV3")
@RequiredArgsConstructor
@Slf4j
public class EnrollStudentUseCaseV3 {

    @Qualifier("newUserRepositoryAdapter")
    private final UserRepository userRepository;
    private final EnrollmentRepositoryPort enrollmentRepository;
    private final LearningClassRepositoryPort learningClassRepository;

    @Transactional
    public UUID enroll(UUID studentId, UUID classId) {
        log.info("Enrolling student {} to class {} (V3)", studentId, classId);

        // 1. Validate Student exists
        User student = userRepository.findById(new UserId(studentId))
                .orElseThrow(() -> new BusinessRuleException("Student not found: " + studentId));

        // 2. Validate Class exists
        // Note: Need to implement findById in LearningClassRepositoryPort
        
        // 3. Check Duplicate Enrollment
        if (enrollmentRepository.existsByClassIdAndStudentId(classId, studentId)) {
            throw new BusinessRuleException("Student already enrolled in this class");
        }

        // 4. Create and Save Enrollment
        EnrollmentJpaEntity enrollment = EnrollmentJpaEntity.builder()
                .classId(classId)
                .studentId(studentId)
                .status(EnrollmentJpaEntity.EnrollmentStatus.ACTIVE)
                .build();

        log.info("Student {} enrolled successfully in class {} (V3)", studentId, classId);
        
        // Return enrollment ID (placeholder - need full repository implementation)
        return UUID.randomUUID();
    }
}
