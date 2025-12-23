package com.example.lms.repository;

import com.example.lms.learning_delivery.domain.model.LearningClass;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LearningClassRepository extends JpaRepository<LearningClass, UUID> {

    List<LearningClass> findByCourseIdAndStatus(UUID courseId, LearningClass.ClassStatus status);

    // CRITICAL: Pessimistic Lock for concurrency control
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM LearningClass c WHERE c.id = :id")
    Optional<LearningClass> findByIdWithLock(@Param("id") UUID id);
    
    // Helper to find default class (convention: code starts with DEF and belongs to course)
    @Query("SELECT c FROM LearningClass c WHERE c.course.id = :courseId AND c.code LIKE 'DEF-%'")
    Optional<LearningClass> findDefaultClassByCourseId(@Param("courseId") UUID courseId);

    // Advanced Search with Filter and Pagination
    // SOTA Pattern: Exclude CANCELLED by default (like Coursera/Google)
    @Query("SELECT new com.example.lms.dto.ClassSummaryDTO(" +
           "c.id, c.name, c.code, t.fullName, " +
           "c.startDate, c.endDate, c.maxStudents, " +
           "CAST(c.scheduleType AS string), c.semester, CAST(c.status AS string), " +
           "(SELECT COUNT(e) FROM Enrollment e WHERE e.learningClass.id = c.id AND e.status = com.example.lms.learning_delivery.domain.model.Enrollment.EnrollmentStatus.ACTIVE)" +
           ") " +
           "FROM LearningClass c " +
           "LEFT JOIN c.teacher t " +
           "WHERE c.course.id = :courseId " +
           "AND (:search IS NULL OR LOWER(c.name) LIKE LOWER(CAST(:search AS string)) OR LOWER(c.code) LIKE LOWER(CAST(:search AS string))) " +
           "AND ((:status IS NULL AND c.status <> com.example.lms.learning_delivery.domain.model.LearningClass$ClassStatus.CANCELLED) OR c.status = :status) " +
           "AND (:semester IS NULL OR c.semester LIKE CONCAT('%', CAST(:semester AS string), '%')) " +
           "ORDER BY c.startDate DESC")
    org.springframework.data.domain.Page<com.example.lms.dto.ClassSummaryDTO> searchClasses(
        @Param("courseId") UUID courseId,
        @Param("search") String search,
        @Param("status") LearningClass.ClassStatus status,
        @Param("semester") String semester,
        org.springframework.data.domain.Pageable pageable
    );
}
