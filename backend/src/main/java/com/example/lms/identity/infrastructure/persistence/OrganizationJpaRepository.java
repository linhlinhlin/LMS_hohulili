package com.example.lms.identity.infrastructure.persistence;

import com.example.lms.identity.infrastructure.persistence.entity.OrganizationJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrganizationJpaRepository extends JpaRepository<OrganizationJpaEntity, UUID> {

    Optional<OrganizationJpaEntity> findByCode(String code);

    boolean existsByCode(String code);
}
