package com.example.lms.academic.infrastructure.persistence;

import com.example.lms.academic.infrastructure.persistence.repository.AcademicLearningPackageRevenueSplitJpaRepository;
import com.example.lms.shared.application.port.LearningPackageRevenuePort;
import com.example.lms.shared.domain.model.OrgRevenueAggregate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class LearningPackageRevenuePortAdapter implements LearningPackageRevenuePort {

    private final AcademicLearningPackageRevenueSplitJpaRepository repository;

    @Override
    public BigDecimal sumTeacherAmountByTeacherId(UUID teacherId) {
        return repository.sumTeacherAmountByTeacherId(teacherId);
    }

    @Override
    public BigDecimal sumTeacherAmountThisMonth(UUID teacherId) {
        return repository.sumTeacherAmountThisMonth(teacherId);
    }

    @Override
    public BigDecimal sumTeacherAmountLastMonth(UUID teacherId) {
        return repository.sumTeacherAmountLastMonth(teacherId);
    }

    @Override
    public List<UUID> findDistinctCourseIdsByTeacherId(UUID teacherId) {
        return repository.findDistinctCourseIdsByTeacherId(teacherId);
    }

    @Override
    public Page<TeacherRevenueLine> findTeacherRevenueLines(UUID teacherId, Pageable pageable) {
        return repository.findTeacherRevenueLines(teacherId, pageable)
                .map(e -> new TeacherRevenueLine(
                        e.getId(),
                        e.getEnrollmentId(),
                        e.getPackageId(),
                        e.getCourseId(),
                        e.getGrossAmount(),
                        e.getPlatformFeePct(),
                        e.getTeacherSharePct(),
                        e.getPlatformAmount(),
                        e.getTeacherAmount(),
                        e.getCreatedAt()));
    }

    @Override
    public BigDecimal sumGrossRevenueAll() {
        return repository.sumGrossRevenueAll();
    }

    @Override
    public BigDecimal sumPlatformAmountAll() {
        return repository.sumPlatformAmountAll();
    }

    @Override
    public BigDecimal sumTeacherAmountAll() {
        return repository.sumTeacherAmountAll();
    }

    @Override
    public BigDecimal sumOrgAmountAll() {
        return repository.sumOrgAmountAll();
    }

    @Override
    public List<OrgRevenueAggregate> findTopOrgsByRevenue(int limit) {
        return repository.findTopOrgsByRevenue(limit).stream()
                .map(row -> new OrgRevenueAggregate((UUID) row[0], (BigDecimal) row[1]))
                .toList();
    }
}
