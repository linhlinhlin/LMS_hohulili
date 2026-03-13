package com.example.lms.shared.domain.repository;

import com.example.lms.shared.domain.model.RevenueSplit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

public interface RevenueSplitRepository {
    RevenueSplit save(RevenueSplit split);
    Optional<RevenueSplit> findByPaymentId(UUID paymentId);
    Page<RevenueSplit> findByTeacherId(UUID teacherId, Pageable pageable);

    BigDecimal sumTeacherAmountByTeacherId(UUID teacherId);
    BigDecimal sumTeacherAmountThisMonth(UUID teacherId);
    BigDecimal sumTeacherAmountLastMonth(UUID teacherId);
    long countDistinctCoursesByTeacherId(UUID teacherId);
}
