package com.example.lms.shared.infrastructure.persistence;

import com.example.lms.shared.domain.model.PaymentTransaction;
import com.example.lms.shared.domain.repository.PaymentRepository;
import com.example.lms.shared.infrastructure.persistence.entity.PaymentTransactionJpaEntity;
import com.example.lms.shared.infrastructure.persistence.mapper.PaymentEntityMapper;
import com.example.lms.shared.infrastructure.persistence.repository.PaymentTransactionJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Adapter implementing the PaymentRepository domain port.
 */
@Component
@RequiredArgsConstructor
public class PaymentRepositoryAdapter implements PaymentRepository {

    private final PaymentTransactionJpaRepository jpaRepo;
    private final PaymentEntityMapper mapper;

    @Override
    public PaymentTransaction save(PaymentTransaction payment) {
        var entity = mapper.toEntity(payment);
        var saved = jpaRepo.save(entity);
        return mapper.toDomain(saved);
    }

    @Override
    public Optional<PaymentTransaction> findById(UUID id) {
        return jpaRepo.findById(id).map(mapper::toDomain);
    }

    @Override
    public Optional<PaymentTransaction> findLatestByStudentAndCourse(UUID studentId, UUID courseId) {
        return jpaRepo.findTopByStudentIdAndCourseIdOrderByCreatedAtDesc(studentId, courseId)
                .map(mapper::toDomain);
    }

    @Override
    public List<PaymentTransaction> findByStudentId(UUID studentId) {
        return jpaRepo.findByStudentIdOrderByCreatedAtDesc(studentId).stream()
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    public boolean hasCompletedPayment(UUID studentId, UUID courseId) {
        return jpaRepo.existsByStudentIdAndCourseIdAndStatus(
                studentId, courseId, PaymentTransactionJpaEntity.PaymentStatus.COMPLETED);
    }

    @Override
    public List<PaymentTransaction> findStalePending(Instant cutoff) {
        return jpaRepo.findByStatusAndCreatedAtBefore(
                PaymentTransactionJpaEntity.PaymentStatus.PENDING, cutoff)
                .stream()
                .map(mapper::toDomain)
                .toList();
    }
}
