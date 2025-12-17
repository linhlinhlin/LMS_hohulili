package com.example.lms.learning_delivery.domain.repo_port;

import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.entity.User; // Legacy User shared
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;
import java.util.UUID;

public interface LearningRepository {
    LearningClass saveClass(LearningClass clazz);
    Optional<LearningClass> findClassById(UUID id);
    Optional<LearningClass> findClassByCode(String code);
    
    Enrollment saveEnrollment(Enrollment enrollment);
    Optional<Enrollment> findEnrollmentById(UUID id);
    Optional<Enrollment> findEnrollmentByStudentAndClass(UUID studentId, UUID classId);
    
    Optional<User> findStudentByEmail(String email);
}
