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

        // 4. Proceed - Create enrollment record
        Enrollment enrollment = Enrollment.builder()
            .student(student)
            .learningClass(lClass)
            .enrolledAt(Instant.now())
            .status(Enrollment.EnrollmentStatus.ACTIVE)
            .completionPercent(0)
            .build();

        enrollment = enrollmentRepository.save(enrollment);
        
        // 5. SYNC: Also add to Course.enrolledStudents for authorization compatibility
        // This ensures AuthorizationHelper.canViewCourse() works correctly
        com.example.lms.entity.Course course = lClass.getCourse();
        if (course != null) {
            java.util.Set<User> enrolledStudents = course.getEnrolledStudents();
            if (enrolledStudents == null) {
                enrolledStudents = new java.util.HashSet<>();
                course.setEnrolledStudents(enrolledStudents);
            }
            if (!enrolledStudents.contains(student)) {
                enrolledStudents.add(student);
                // Course will be saved due to cascade or we can explicitly save
            }
        }

        return enrollment;
    }

    @Transactional
    public Enrollment enrollStudentByEmail(String email, UUID classId) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found with email: " + email));
        return enrollStudent(user.getId(), classId);
    }

    @Transactional(readOnly = true)
    public java.util.List<com.example.lms.dto.StudentSummaryDTO> getStudentsByClass(UUID classId) {
        return enrollmentRepository.findByLearningClassId(classId).stream()
            .map(e -> com.example.lms.dto.StudentSummaryDTO.builder()
                .id(e.getStudent().getId())
                .fullName(e.getStudent().getFullName())
                .email(e.getStudent().getEmail())
                .enrolledAt(e.getEnrolledAt())
                .progress(e.getCompletionPercent())
                .status(e.getStatus().name())
                .build())
            .collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    public void removeStudentFromClass(UUID classId, UUID studentId) {
        Enrollment enrollment = enrollmentRepository.findByStudentIdAndLearningClassId(studentId, classId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy học viên trong lớp này"));
        enrollmentRepository.delete(enrollment);
    }
}
