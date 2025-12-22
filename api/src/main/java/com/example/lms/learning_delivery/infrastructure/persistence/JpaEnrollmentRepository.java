package com.example.lms.learning_delivery.infrastructure.persistence;

import com.example.lms.learning_delivery.domain.model.Enrollment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JpaEnrollmentRepository extends JpaRepository<Enrollment, UUID> {
    
    Optional<Enrollment> findByStudentIdAndLearningClassId(UUID studentId, UUID learningClassId);
    
    // Alias for controllers expecting classId naming
    @Query("SELECT e FROM Enrollment e WHERE e.studentId = :studentId AND e.learningClass.id = :classId")
    Optional<Enrollment> findByStudentIdAndClassId(@Param("studentId") UUID studentId, @Param("classId") UUID classId);
    
    boolean existsByStudentIdAndLearningClassId(UUID studentId, UUID learningClassId);
    
    // Alias for controllers expecting classId naming
    @Query("SELECT COUNT(e) > 0 FROM Enrollment e WHERE e.studentId = :studentId AND e.learningClass.id = :classId")
    boolean existsByStudentIdAndClassId(@Param("studentId") UUID studentId, @Param("classId") UUID classId);
    
    List<Enrollment> findByStudentId(UUID studentId);
    
    @Query("SELECT e FROM Enrollment e WHERE e.studentId = :studentId AND e.status = 'ACTIVE'")
    List<Enrollment> findActiveByStudentId(@Param("studentId") UUID studentId);
    
    @Query("SELECT e FROM Enrollment e WHERE e.learningClass.id = :classId")
    Page<Enrollment> findByClassId(@Param("classId") UUID classId, Pageable pageable);
    
    @Query("SELECT COUNT(e) FROM Enrollment e WHERE e.learningClass.id = :classId")
    long countByClassId(@Param("classId") UUID classId);

    /**
     * SOTA: Single-query enrollment fetch with JOIN FETCH (Dec 2025)
     * Replaces 2 sequential queries with 1 query.
     * Pattern from Google/YouTube: Eliminate N+1 by eager loading related data.
     */
    @Query("""
        SELECT e FROM Enrollment e 
        JOIN FETCH e.learningClass lc 
        WHERE e.studentId = :studentId 
        AND e.status = 'ACTIVE'
    """)
    List<Enrollment> findActiveWithClass(@Param("studentId") UUID studentId);
}
