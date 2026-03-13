package com.example.lms.shared.infrastructure.persistence.repository;

import com.example.lms.shared.infrastructure.persistence.entity.OrgPaymentConfigJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface OrgPaymentConfigJpaRepository
        extends JpaRepository<OrgPaymentConfigJpaEntity, UUID> {
}
