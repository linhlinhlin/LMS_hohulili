package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.repo_port.LearningRepository;
import com.example.lms.entity.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class EnrollStudentUseCase {

    private static final Logger log = LoggerFactory.getLogger(EnrollStudentUseCase.class);
    private final LearningRepository learningRepository;

    public EnrollStudentUseCase(LearningRepository learningRepository) {
        this.learningRepository = learningRepository;
    }

    @Transactional
    public Enrollment enroll(String studentEmail, String classCode) {
        log.info("Enrolling student {} to class {}", studentEmail, classCode);

        // 1. Validate Class
        LearningClass clazz = learningRepository.findClassByCode(classCode)
                .orElseThrow(() -> new RuntimeException("Class not found: " + classCode));

        if (clazz.getStatus() != LearningClass.ClassStatus.OPEN) {
            throw new RuntimeException("Class is not open for enrollment");
        }

        // 2. Validate Student
        User student = learningRepository.findStudentByEmail(studentEmail)
                .orElseThrow(() -> new RuntimeException("Student not found: " + studentEmail));

        // 3. Check Duplicate
        if (learningRepository.findEnrollmentByStudentAndClass(student.getId(), clazz.getId()).isPresent()) {
            throw new RuntimeException("Student already enrolled in this class");
        }

        // 4. Create Enrollment
        Enrollment enrollment = Enrollment.builder()
                .learningClass(clazz)
                .student(student)
                .status(Enrollment.EnrollmentStatus.ACTIVE)
                .build();

        return learningRepository.saveEnrollment(enrollment);
    }
}
