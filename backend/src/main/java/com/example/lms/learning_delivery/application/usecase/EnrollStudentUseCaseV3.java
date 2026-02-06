package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.domain.repository.EnrollmentRepositoryPort;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepositoryPort;
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

    @Transactional
    public UUID enroll(UUID studentId, UUID classId) {
        log.info("Enrolling student {} to class {} (V3)", studentId, classId);

        // 1. Validate Student exists
        User student = userRepository.findById(new UserId(studentId))
                .orElseThrow(() -> new BusinessRuleException("Student not found: " + studentId));

        // 2. Validate Class exists
        LearningClass learningClass = learningClassRepository.findById(classId)
                .orElseThrow(() -> new BusinessRuleException("Learning class not found: " + classId));

        // 3. Check Duplicate Enrollment
        if (enrollmentRepository.existsByClassIdAndStudentId(classId, studentId)) {
            throw new BusinessRuleException("Student already enrolled in this class");
        }

        // 4. Create and Save Enrollment using domain model
        Enrollment enrollment = Enrollment.builder()
                .learningClass(learningClass)
                .studentId(studentId)
                .status(Enrollment.EnrollmentStatus.ACTIVE)
                .build();

        Enrollment saved = enrollmentRepository.save(enrollment);

        log.info("Student {} enrolled successfully in class {} with enrollment ID {}",
                studentId, classId, saved.getId());

        return saved.getId();
    }
}
