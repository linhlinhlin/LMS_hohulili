package com.example.lms.shared.infrastructure.persistence;

import com.example.lms.shared.domain.model.RevenueSplit;
import com.example.lms.shared.domain.repository.RevenueSplitRepository;
import com.example.lms.shared.infrastructure.persistence.entity.RevenueSplitJpaEntity;
import com.example.lms.shared.infrastructure.persistence.repository.RevenueSplitJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class RevenueSplitRepositoryAdapter implements RevenueSplitRepository {

    private final RevenueSplitJpaRepository jpaRepo;

    @Override
    public RevenueSplit save(RevenueSplit split) {
        return toDomain(jpaRepo.save(toEntity(split)));
    }

    @Override
    public Optional<RevenueSplit> findByPaymentId(UUID paymentId) {
        return jpaRepo.findByPaymentId(paymentId).map(this::toDomain);
    }

    @Override
    public Page<RevenueSplit> findByTeacherId(UUID teacherId, Pageable pageable) {
        return jpaRepo.findByTeacherIdOrderByCreatedAtDesc(teacherId, pageable).map(this::toDomain);
    }

    @Override
    public BigDecimal sumTeacherAmountByTeacherId(UUID teacherId) {
        return jpaRepo.sumTeacherAmountByTeacherId(teacherId);
    }

    @Override
    public BigDecimal sumTeacherAmountThisMonth(UUID teacherId) {
        return jpaRepo.sumTeacherAmountThisMonth(teacherId);
    }

    @Override
    public BigDecimal sumTeacherAmountLastMonth(UUID teacherId) {
        return jpaRepo.sumTeacherAmountLastMonth(teacherId);
    }

    @Override
    public long countDistinctCoursesByTeacherId(UUID teacherId) {
        return jpaRepo.countDistinctCoursesByTeacherId(teacherId);
    }

    private RevenueSplitJpaEntity toEntity(RevenueSplit s) {
        return RevenueSplitJpaEntity.builder()
                .id(s.getId())
                .paymentId(s.getPaymentId())
                .courseId(s.getCourseId())
                .teacherId(s.getTeacherId())
                .orgId(s.getOrgId())
                .grossAmount(s.getGrossAmount())
                .platformFeePct(s.getPlatformFeePct())
                .teacherSharePct(s.getTeacherSharePct())
                .orgSharePct(s.getOrgSharePct())
                .platformAmount(s.getPlatformAmount())
                .teacherAmount(s.getTeacherAmount())
                .orgAmount(s.getOrgAmount())
                .createdAt(s.getCreatedAt())
                .build();
    }

    private RevenueSplit toDomain(RevenueSplitJpaEntity e) {
        return RevenueSplit.reconstitute(e.getId(), e.getPaymentId(), e.getCourseId(),
                e.getTeacherId(), e.getOrgId(), e.getGrossAmount(),
                e.getPlatformFeePct(), e.getTeacherSharePct(), e.getOrgSharePct(),
                e.getPlatformAmount(), e.getTeacherAmount(), e.getOrgAmount(),
                e.getCreatedAt());
    }
}
