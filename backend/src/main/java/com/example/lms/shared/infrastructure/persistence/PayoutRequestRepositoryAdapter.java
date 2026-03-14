package com.example.lms.shared.infrastructure.persistence;

import com.example.lms.shared.domain.model.PayoutRequest;
import com.example.lms.shared.domain.repository.PayoutRequestRepository;
import com.example.lms.shared.infrastructure.persistence.entity.PayoutRequestJpaEntity;
import com.example.lms.shared.infrastructure.persistence.repository.PayoutRequestJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class PayoutRequestRepositoryAdapter implements PayoutRequestRepository {

    private final PayoutRequestJpaRepository jpaRepo;

    @Override
    public PayoutRequest save(PayoutRequest request) {
        return toDomain(jpaRepo.save(toEntity(request)));
    }

    @Override
    public Optional<PayoutRequest> findById(UUID id) {
        return jpaRepo.findById(id).map(this::toDomain);
    }

    @Override
    public Page<PayoutRequest> findByTeacherId(UUID teacherId, Pageable pageable) {
        return jpaRepo.findByTeacherIdOrderByRequestedAtDesc(teacherId, pageable).map(this::toDomain);
    }

    @Override
    public Page<PayoutRequest> findAllByStatus(String status, Pageable pageable) {
        return jpaRepo.findByStatusOrderByRequestedAtDesc(status, pageable).map(this::toDomain);
    }

    @Override
    public Page<PayoutRequest> findAllByStatusAndTeacherIds(String status, Collection<UUID> teacherIds, Pageable pageable) {
        return jpaRepo.findByStatusAndTeacherIdInOrderByRequestedAtDesc(status, teacherIds, pageable)
                .map(this::toDomain);
    }

    @Override
    public BigDecimal sumCompletedByTeacherId(UUID teacherId) {
        return jpaRepo.sumCompletedByTeacherId(teacherId);
    }

    @Override
    public BigDecimal sumPendingAndApprovedByTeacherId(UUID teacherId) {
        return jpaRepo.sumPendingAndApprovedByTeacherId(teacherId);
    }

    private PayoutRequestJpaEntity toEntity(PayoutRequest r) {
        return PayoutRequestJpaEntity.builder()
                .id(r.getId())
                .teacherId(r.getTeacherId())
                .bankAccountId(r.getBankAccountId())
                .amount(r.getAmount())
                .status(r.getStatus().name())
                .teacherNote(r.getTeacherNote())
                .adminNote(r.getAdminNote())
                .processedBy(r.getProcessedBy())
                .requestedAt(r.getRequestedAt())
                .processedAt(r.getProcessedAt())
                .build();
    }

    private PayoutRequest toDomain(PayoutRequestJpaEntity e) {
        return PayoutRequest.reconstitute(e.getId(), e.getTeacherId(), e.getBankAccountId(),
                e.getAmount(), PayoutRequest.Status.valueOf(e.getStatus()),
                e.getTeacherNote(), e.getAdminNote(), e.getProcessedBy(),
                e.getRequestedAt(), e.getProcessedAt());
    }
}
