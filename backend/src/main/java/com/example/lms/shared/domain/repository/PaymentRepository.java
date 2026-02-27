package com.example.lms.shared.domain.repository;

import com.example.lms.shared.domain.model.PaymentTransaction;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Domain repository port for PaymentTransaction.
 * No framework annotations — pure domain interface.
 */
public interface PaymentRepository {

    PaymentTransaction save(PaymentTransaction payment);

    Optional<PaymentTransaction> findById(UUID id);

    Optional<PaymentTransaction> findLatestByStudentAndCourse(UUID studentId, UUID courseId);

    List<PaymentTransaction> findByStudentId(UUID studentId);

    boolean hasCompletedPayment(UUID studentId, UUID courseId);

    List<PaymentTransaction> findStalePending(Instant cutoff);
}
