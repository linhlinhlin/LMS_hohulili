package com.example.lms.shared.domain.repository;

import com.example.lms.shared.domain.model.PayoutRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

public interface PayoutRequestRepository {
    PayoutRequest save(PayoutRequest request);
    Optional<PayoutRequest> findById(UUID id);
    Page<PayoutRequest> findByTeacherId(UUID teacherId, Pageable pageable);
    Page<PayoutRequest> findAllByStatus(String status, Pageable pageable);

    /** Sum of amounts in COMPLETED payouts for a teacher (already paid out). */
    BigDecimal sumCompletedByTeacherId(UUID teacherId);
    /** Sum of amounts in PENDING + APPROVED payouts for a teacher (reserved / in-flight). */
    BigDecimal sumPendingAndApprovedByTeacherId(UUID teacherId);
}
