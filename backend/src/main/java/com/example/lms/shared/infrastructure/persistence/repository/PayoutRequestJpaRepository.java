package com.example.lms.shared.infrastructure.persistence.repository;

import com.example.lms.shared.infrastructure.persistence.entity.PayoutRequestJpaEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.UUID;

@Repository
public interface PayoutRequestJpaRepository
        extends JpaRepository<PayoutRequestJpaEntity, UUID> {

    Page<PayoutRequestJpaEntity> findByTeacherIdOrderByRequestedAtDesc(UUID teacherId, Pageable pageable);

    Page<PayoutRequestJpaEntity> findByStatusOrderByRequestedAtDesc(String status, Pageable pageable);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM PayoutRequestJpaEntity p WHERE p.teacherId = :teacherId AND p.status = 'COMPLETED'")
    BigDecimal sumCompletedByTeacherId(@Param("teacherId") UUID teacherId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM PayoutRequestJpaEntity p WHERE p.teacherId = :teacherId AND p.status IN ('PENDING', 'APPROVED')")
    BigDecimal sumPendingAndApprovedByTeacherId(@Param("teacherId") UUID teacherId);
}
