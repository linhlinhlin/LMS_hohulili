package com.example.lms.assessment.infrastructure.persistence.repository;

import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentRubricJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface AssignmentRubricJpaRepository extends JpaRepository<AssignmentRubricJpaEntity, UUID> {
    void deleteByAssignmentId(UUID assignmentId);
}
