package com.example.lms.shared.infrastructure.persistence;

import com.example.lms.shared.infrastructure.persistence.entity.AuditLogJpaEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditLogJpaRepository extends JpaRepository<AuditLogJpaEntity, Long> {

    Page<AuditLogJpaEntity> findAllByOrderByChangedAtDesc(Pageable pageable);

    @Query("SELECT a FROM AuditLogJpaEntity a WHERE " +
            "(:tableName IS NULL OR a.tableName = :tableName) AND " +
            "(:action IS NULL OR a.action = :action) " +
            "ORDER BY a.changedAt DESC")
    Page<AuditLogJpaEntity> findFiltered(
            @Param("tableName") String tableName,
            @Param("action") String action,
            Pageable pageable
    );
}
