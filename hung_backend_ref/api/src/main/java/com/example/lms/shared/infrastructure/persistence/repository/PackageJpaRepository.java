package com.example.lms.shared.infrastructure.persistence.repository;

import com.example.lms.shared.infrastructure.persistence.entity.PackageJpaEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PackageJpaRepository extends JpaRepository<PackageJpaEntity, UUID> {
    
    List<PackageJpaEntity> findByOwnerId(UUID ownerId);
    
    Page<PackageJpaEntity> findByNameContainingIgnoreCase(String name, Pageable pageable);
    
    boolean existsByName(String name);
}
