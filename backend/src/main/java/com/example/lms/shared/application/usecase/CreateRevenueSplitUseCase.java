package com.example.lms.shared.application.usecase;

import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.shared.application.port.RevenueConfigPort;
import com.example.lms.shared.domain.model.RevenueSplit;
import com.example.lms.shared.domain.repository.PaymentRepository;
import com.example.lms.shared.domain.repository.RevenueSplitRepository;
import com.example.lms.shared.domain.valueobject.UserId;
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
    private final CourseRepository      courseRepository;
    private final UserRepository        userRepository;
    private final RevenueConfigPort     revenueConfigPort;

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
        UUID orgId = userRepository.findById(UserId.of(teacherId))
                .map(u -> u.getOrganizationId())
                .orElse(null);

        // Resolve revenue config (org-specific or platform default)
        var config = revenueConfigPort.resolveConfig(orgId);

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
