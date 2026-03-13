package com.example.lms.shared.application.usecase;

import com.example.lms.shared.application.port.SepayPaymentPort;
import com.example.lms.shared.domain.model.PaymentTransaction;
import com.example.lms.shared.domain.repository.PaymentRepository;
import com.example.lms.shared.exception.BusinessRuleException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * Creates a PENDING SePay payment and returns QR data for display.
 *
 * Flow:
 *  1. Idempotency check — if already paid, throw BusinessRuleException
 *  2. Create PENDING PaymentTransaction with method="SEPAY"
 *  3. Generate QR URL via SepayPaymentPort
 *  4. Return QR data (qrUrl, transferContent, bank info) to controller
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CreateSepayPaymentUseCase {

    private final PaymentRepository paymentRepository;
    private final SepayPaymentPort sepayPayment;

    public record Result(
            PaymentTransaction payment,
            String qrUrl,
            String transferContent,
            String bankCode,
            String accountNumber,
            String accountName,
            BigDecimal amount
    ) {}

    public Result execute(UUID studentId, UUID courseId, BigDecimal serverPrice, String courseName) {
        // Idempotency: refuse if already paid
        if (paymentRepository.hasCompletedPayment(studentId, courseId)) {
            throw new BusinessRuleException("Bạn đã thanh toán khóa học này rồi.");
        }

        if (serverPrice == null || serverPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException(
                    "Khóa học này miễn phí. Vui lòng đăng ký trực tiếp thay vì thanh toán.");
        }

        // Reuse existing PENDING SEPAY transaction if created within the 15-min QR window
        // (Stripe pattern: findOrCreate payment intent — avoids duplicate PENDING rows on double-click)
        var existing = paymentRepository.findLatestByStudentAndCourse(studentId, courseId);
        if (existing.isPresent()) {
            var prev = existing.get();
            boolean isReusable = prev.isPending()
                    && "SEPAY".equals(prev.getPaymentMethod())
                    && prev.getCreatedAt() != null
                    && prev.getCreatedAt().isAfter(Instant.now().minus(15, ChronoUnit.MINUTES));
            if (isReusable) {
                String qrUrlReuse = sepayPayment.generateQrUrl(prev.getId(), serverPrice);
                String transferContentReuse = sepayPayment.getTransferContent(prev.getId());
                log.info("[SePay] Reusing existing PENDING txn={} student={} course={}",
                        prev.getId(), studentId, courseId);
                return new Result(prev, qrUrlReuse, transferContentReuse,
                        sepayPayment.getBankCode(), sepayPayment.getAccountNumber(),
                        sepayPayment.getAccountName(), serverPrice);
            }
        }

        // Create new PENDING transaction
        PaymentTransaction payment = PaymentTransaction.createPending(studentId, courseId, serverPrice, "SEPAY");
        payment = paymentRepository.save(payment);

        // Generate QR URL — transferContent derived from payment UUID
        String qrUrl = sepayPayment.generateQrUrl(payment.getId(), serverPrice);
        String transferContent = sepayPayment.getTransferContent(payment.getId());

        log.info("[SePay] Created PENDING payment txn={} student={} course={} amount={}",
                payment.getId(), studentId, courseId, serverPrice);

        return new Result(
                payment,
                qrUrl,
                transferContent,
                sepayPayment.getBankCode(),
                sepayPayment.getAccountNumber(),
                sepayPayment.getAccountName(),
                serverPrice
        );
    }
}
