package com.example.lms.academic.infrastructure.persistence.repository;

import com.example.lms.academic.infrastructure.persistence.entity.AcademicClassGroupMembershipJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AcademicClassGroupMembershipJpaRepository
        extends JpaRepository<AcademicClassGroupMembershipJpaEntity, UUID> {
    List<AcademicClassGroupMembershipJpaEntity> findByOrganizationIdOrderByJoinedAtDesc(UUID organizationId);

    Optional<AcademicClassGroupMembershipJpaEntity> findFirstByOrganizationIdAndStudentIdAndStatusOrderByJoinedAtDesc(
            UUID organizationId,
            UUID studentId,
            String status);

    boolean existsByOrganizationIdAndStudentIdAndStatus(UUID organizationId, UUID studentId, String status);
}
