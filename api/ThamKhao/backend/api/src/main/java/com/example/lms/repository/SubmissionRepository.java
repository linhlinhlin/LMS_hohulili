package com.example.lms.repository;

import com.example.lms.entity.Submission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, UUID> {
    
    List<Submission> findByAssignmentId(UUID assignmentId);
    
    Optional<Submission> findByAssignmentIdAndStudentId(UUID assignmentId, UUID studentId);
    
    List<Submission> findByStudentId(UUID studentId);
    
    @Query("SELECT s FROM Submission s WHERE s.assignment.id = :assignmentId AND s.assignment.course.teacher.id = :teacherId")
    List<Submission> findByAssignmentIdAndTeacherId(@Param("assignmentId") UUID assignmentId, @Param("teacherId") UUID teacherId);
    
    boolean existsByAssignmentIdAndStudentId(UUID assignmentId, UUID studentId);
}