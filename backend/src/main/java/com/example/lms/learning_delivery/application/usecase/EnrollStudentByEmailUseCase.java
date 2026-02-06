package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.domain.repository.EnrollmentRepository;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepository;
import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Use case for enrolling a student by email.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EnrollStudentByEmailUseCase {

    @Qualifier("newUserRepositoryAdapter")
    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final LearningClassRepository learningClassRepository;

    @Transactional
    public UUID enroll(String email, UUID classId) {
        log.info("Enrolling student with email {} to class {}", email, classId);

        // 1. Find Student by email
        User student = userRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("Học viên", "email=" + email));

        // 2. Validate Class exists
        LearningClass learningClass = learningClassRepository.findById(classId)
                .orElseThrow(() -> new EntityNotFoundException("Lớp học", classId));

        // 3. Check Duplicate Enrollment
        if (enrollmentRepository.existsByStudentIdAndClassId(student.getId().value(), classId)) {
            throw new BusinessRuleException("ALREADY_ENROLLED", "Học viên đã được ghi danh trong lớp này");
        }

        // 4. Create and Save Enrollment
        Enrollment enrollment = Enrollment.builder()
                .learningClass(learningClass)
                .studentId(student.getId().value())
                .status(Enrollment.EnrollmentStatus.ACTIVE)
                .build();

        Enrollment saved = enrollmentRepository.save(enrollment);

        log.info("Student {} enrolled successfully in class {} with enrollment ID {}",
                email, classId, saved.getId());

        return saved.getId();
    }
}
