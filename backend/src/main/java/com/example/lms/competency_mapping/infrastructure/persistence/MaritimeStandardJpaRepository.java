package com.example.lms.competency_mapping.infrastructure.persistence;

import com.example.lms.competency_mapping.infrastructure.persistence.entity.MaritimeStandardJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MaritimeStandardJpaRepository extends JpaRepository<MaritimeStandardJpaEntity, UUID> {
    List<MaritimeStandardJpaEntity> findAllByActiveTrue();
}
