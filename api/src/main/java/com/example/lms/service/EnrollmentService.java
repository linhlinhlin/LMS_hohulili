package com.example.lms.service;

import com.example.lms.entity.User;
import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.repository.EnrollmentRepository;
import com.example.lms.repository.LearningClassRepository;
import com.example.lms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EnrollmentService {

    private final EnrollmentRepository enrollmentRepository;
    private final LearningClassRepository classRepository;
    private final UserRepository userRepository;

    @Transactional
    public Enrollment enrollStudent(UUID userId, UUID classId) {
        // 1. Lock the Class Row (Pessimistic Write) to prevent race condition on capacity
        LearningClass lClass = classRepository.findByIdWithLock(classId)
            .orElseThrow(() -> new RuntimeException("Class not found: " + classId));

        if (lClass.getStatus() != LearningClass.ClassStatus.OPEN) {
             throw new RuntimeException("Class is not open for enrollment.");
        }

        // 2. Business Rule: Check Double Dipping (Already enrolled in this Course via any class?)
        boolean alreadyInCourse = enrollmentRepository.existsByStudentIdAndClassCourseId(userId, lClass.getCourse().getId());
        if (alreadyInCourse) {
            // Check if it's the SAME class (idem-potency)
             if (enrollmentRepository.findByStudentIdAndLearningClassId(userId, classId).isPresent()) {
                 return enrollmentRepository.findByStudentIdAndLearningClassId(userId, classId).get();
             }
            throw new RuntimeException("Student is already enrolled in another class for this course.");
        }

        // 3. Check Capacity
        long currentCount = enrollmentRepository.countByLearningClassId(classId);
        if (currentCount >= lClass.getMaxStudents()) {
            throw new RuntimeException("Class is full.");
        }

        User student = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        // 4. Proceed
        Enrollment enrollment = Enrollment.builder()
            .student(student)
            .learningClass(lClass)
            .enrolledAt(Instant.now())
            .status(Enrollment.EnrollmentStatus.ACTIVE)
            .completionPercent(0)
            .build();

        return enrollmentRepository.save(enrollment);
    }
}
