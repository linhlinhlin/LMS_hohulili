package com.example.lms.shared.application.usecase;

import com.example.lms.shared.application.port.PaymentGatewayPort;
import com.example.lms.shared.domain.model.PaymentTransaction;
import com.example.lms.shared.domain.repository.PaymentRepository;
import com.example.lms.shared.exception.BusinessRuleException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Use case for creating a VNPay payment URL.
 * Creates a PENDING payment and generates the redirect URL.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CreateVnPayUrlUseCase {

    private final PaymentRepository paymentRepository;
    private final PaymentGatewayPort paymentGateway;

    public record Result(PaymentTransaction payment, String paymentUrl) {}

    public Result execute(UUID studentId, UUID courseId, BigDecimal serverPrice, String courseName, String ipAddress) {
        // Check for existing completed payment
        var existing = paymentRepository.findLatestByStudentAndCourse(studentId, courseId);
        if (existing.isPresent() && existing.get().isCompleted()) {
            return new Result(existing.get(), null);
        }

        if (serverPrice == null || serverPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException("Khóa học này miễn phí, không cần thanh toán");
        }

        // Create PENDING transaction
        var payment = PaymentTransaction.createPending(studentId, courseId, serverPrice, "VNPAY");
        payment = paymentRepository.save(payment);

        // Generate VNPay redirect URL
        String orderInfo = "Thanh toan khoa hoc " + courseName;
        String paymentUrl = paymentGateway.createPaymentUrl(payment.getId(), serverPrice, orderInfo, ipAddress);

        log.info("[VNPay] Created payment URL for course {} ({}đ), txn: {}",
                courseId, serverPrice, payment.getTransactionId());

        return new Result(payment, paymentUrl);
    }
}
