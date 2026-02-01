package com.example.lms.assessment.infrastructure.persistence.repository;

import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentAllocationStudentId;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentAllocationStudentJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AssignmentAllocationStudentJpaRepository extends JpaRepository<AssignmentAllocationStudentJpaEntity, AssignmentAllocationStudentId> {
    void deleteByAllocationId(java.util.UUID allocationId);
}
