package com.example.lms.repository;

import com.example.lms.entity.Assignment;
import com.example.lms.entity.AssignmentSubmission;
import com.example.lms.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AssignmentSubmissionRepository extends JpaRepository<AssignmentSubmission, UUID> {
    
    boolean existsByAssignmentAndStudent(Assignment assignment, User student);
    
    Optional<AssignmentSubmission> findByAssignmentAndStudent(Assignment assignment, User student);
    
    Page<AssignmentSubmission> findByAssignment(Assignment assignment, Pageable pageable);
}