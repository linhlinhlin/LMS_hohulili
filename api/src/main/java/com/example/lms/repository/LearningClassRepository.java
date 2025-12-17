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
    @Query("SELECT c FROM LearningClass c " +
           "WHERE c.course.id = :courseId " +
           "AND (:search IS NULL OR LOWER(c.name) LIKE LOWER(CAST(:search AS string)) OR LOWER(c.code) LIKE LOWER(CAST(:search AS string))) " +
           "AND (:status IS NULL OR c.status = :status) " +
           "ORDER BY c.startDate DESC")
    org.springframework.data.domain.Page<LearningClass> searchClasses(
        @Param("courseId") UUID courseId,
        @Param("search") String search,
        @Param("status") LearningClass.ClassStatus status,
        org.springframework.data.domain.Pageable pageable
    );
}
