package com.example.lms.learning_delivery.domain.repo_port;

import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.domain.model.Enrollment;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository port for Learning delivery bounded context.
 * 
 * Following DDD principles:
 * - Returns domain models, not JPA entities
 * - Uses UUID for cross-aggregate references
 * - No leaky abstractions from other bounded contexts
 */
public interface LearningRepository {
    LearningClass saveClass(LearningClass clazz);
    Optional<LearningClass> findClassById(UUID id);
    Optional<LearningClass> findClassByCode(String code);
    
    Enrollment saveEnrollment(Enrollment enrollment);
    Optional<Enrollment> findEnrollmentById(UUID id);
    Optional<Enrollment> findEnrollmentByStudentAndClass(UUID studentId, UUID classId);
    
    /**
     * Find student UUID by email.
     * This crosses bounded context - returns only the ID, not the full User entity.
     */
    Optional<UUID> findStudentIdByEmail(String email);
}
