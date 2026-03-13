package com.example.lms.shared.application.usecase;

import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.shared.domain.model.RevenueSplit;
import com.example.lms.shared.domain.repository.PaymentRepository;
import com.example.lms.shared.domain.repository.RevenueSplitRepository;
import com.example.lms.shared.infrastructure.service.RevenueConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Creates an immutable RevenueSplit record for a completed payment.
 * <p>
 * Idempotent: if a split for this paymentId already exists, returns immediately.
 * Called by PaymentCompletedEventHandler (REQUIRES_NEW propagation guards payment tx).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CreateRevenueSplitUseCase {

    private final PaymentRepository     paymentRepository;
    private final RevenueSplitRepository revenueSplitRepository;
    private final JpaCourseRepository   courseRepository;
    private final UserJpaRepository     userRepository;
    private final RevenueConfigService  revenueConfigService;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void execute(UUID paymentId) {
        // Idempotency guard
        if (revenueSplitRepository.findByPaymentId(paymentId).isPresent()) {
            log.debug("[Revenue] Split already exists for payment {}", paymentId);
            return;
        }

        var paymentOpt = paymentRepository.findById(paymentId);
        if (paymentOpt.isEmpty() || !paymentOpt.get().isCompleted()) {
            log.warn("[Revenue] Payment {} not found or not COMPLETED — skipping split", paymentId);
            return;
        }
        var payment = paymentOpt.get();

        // Resolve teacher from course
        var courseOpt = courseRepository.findById(payment.getCourseId());
        if (courseOpt.isEmpty()) {
            log.warn("[Revenue] Course {} not found — skipping split for payment {}", payment.getCourseId(), paymentId);
            return;
        }
        UUID teacherId = courseOpt.get().getTeacherId();

        // Resolve org from teacher
        UUID orgId = userRepository.findById(teacherId)
                .map(u -> u.getOrganizationId())
                .orElse(null);

        // Resolve revenue config (org-specific or platform default)
        var config = revenueConfigService.resolveConfig(orgId);

        // Create and persist the immutable split
        var split = RevenueSplit.create(paymentId, payment.getCourseId(),
                teacherId, orgId, payment.getAmount(), config);
        revenueSplitRepository.save(split);

        log.info("[Revenue] Split created — payment={} teacher={} gross={} platform={} teacher={} org={}",
                paymentId, teacherId,
                split.getGrossAmount(), split.getPlatformAmount(),
                split.getTeacherAmount(), split.getOrgAmount());
    }
}
