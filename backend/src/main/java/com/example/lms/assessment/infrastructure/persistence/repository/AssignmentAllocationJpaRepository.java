package com.example.lms.assessment.infrastructure.persistence.repository;

import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentAllocationJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.UUID;

@Repository
public interface AssignmentAllocationJpaRepository extends JpaRepository<AssignmentAllocationJpaEntity, UUID> {
    java.util.List<AssignmentAllocationJpaEntity> findByAssignmentId(UUID assignmentId);
    java.util.List<AssignmentAllocationJpaEntity> findByAssignmentIdIn(Collection<UUID> assignmentIds);
}
