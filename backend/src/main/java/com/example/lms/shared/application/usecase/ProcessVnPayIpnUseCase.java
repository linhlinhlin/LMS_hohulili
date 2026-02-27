package com.example.lms.shared.application.usecase;

import com.example.lms.shared.application.port.PaymentGatewayPort;
import com.example.lms.shared.domain.model.PaymentTransaction;
import com.example.lms.shared.domain.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;
import java.util.UUID;

/**
 * Use case for processing VNPay IPN (server-to-server callback).
 * Contains all business logic for payment verification and state transitions.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ProcessVnPayIpnUseCase {

    private final PaymentRepository paymentRepository;
    private final PaymentGatewayPort paymentGateway;

    /** IPN response codes */
    public record IpnResult(String rspCode, String message, PaymentTransaction payment) {
        public static IpnResult error(String code, String message) { return new IpnResult(code, message, null); }
        public static IpnResult success(PaymentTransaction payment) { return new IpnResult("00", "Confirm Success", payment); }
        public static IpnResult alreadyProcessed() { return new IpnResult("02", "Order already confirmed", null); }
    }

    public IpnResult execute(Map<String, String> params) {
        // Step 1: Verify checksum
        if (!paymentGateway.verifyCallback(params)) {
            log.warn("[VNPay IPN] Invalid checksum for txnRef={}", params.get("vnp_TxnRef"));
            return IpnResult.error("97", "Invalid Checksum");
        }

        // Step 2: Find payment
        String txnRef = params.get("vnp_TxnRef");
        if (txnRef == null) {
            return IpnResult.error("01", "Order not found");
        }

        UUID paymentId;
        try {
            paymentId = UUID.fromString(txnRef);
        } catch (IllegalArgumentException e) {
            return IpnResult.error("01", "Invalid TxnRef");
        }

        var paymentOpt = paymentRepository.findById(paymentId);
        if (paymentOpt.isEmpty()) {
            return IpnResult.error("01", "Order not found");
        }

        var payment = paymentOpt.get();

        // Step 3: Idempotency — already processed
        if (payment.isCompleted()) {
            return IpnResult.alreadyProcessed();
        }

        // State guard — only PENDING can be processed
        if (!payment.isPending()) {
            log.warn("[VNPay IPN] Payment {} is in {} state, cannot process IPN",
                    paymentId, payment.getStatus());
            return IpnResult.alreadyProcessed();
        }

        // Step 4: Validate amount (vnp_Amount is REQUIRED in VNPay IPN)
        String vnpAmountStr = params.get("vnp_Amount");
        if (vnpAmountStr == null) {
            log.error("[VNPay IPN] Missing vnp_Amount for payment {}", paymentId);
            return IpnResult.error("04", "Invalid Amount");
        }
        try {
            BigDecimal vnpAmount = new BigDecimal(vnpAmountStr)
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            if (!payment.isAmountMatch(vnpAmount)) {
                log.error("[VNPay IPN] Amount mismatch for payment {}: expected {}đ, received {}đ",
                        paymentId, payment.getAmount(), vnpAmount);
                payment.markFailed();
                payment.setVnpMetadata(null, null, "04", null);
                paymentRepository.save(payment);
                return IpnResult.error("04", "Invalid Amount");
            }
        } catch (NumberFormatException e) {
            log.error("[VNPay IPN] Invalid vnp_Amount format: {}", vnpAmountStr);
            return IpnResult.error("04", "Invalid Amount");
        }

        // Step 5: Update VNPay metadata
        payment.setVnpMetadata(
                params.get("vnp_TransactionNo"),
                params.get("vnp_BankCode"),
                params.get("vnp_ResponseCode"),
                params.get("vnp_CardType")
        );

        // Step 6: Check result
        String responseCode = params.get("vnp_ResponseCode");
        String transactionStatus = params.get("vnp_TransactionStatus");
        boolean isSuccess = "00".equals(responseCode) && "00".equals(transactionStatus);

        if (isSuccess) {
            payment.markCompleted();
            paymentRepository.save(payment);

            log.info("[VNPay IPN] Payment completed: {} (bank={}, txnNo={})",
                    paymentId, params.get("vnp_BankCode"), params.get("vnp_TransactionNo"));
            return IpnResult.success(payment);
        } else {
            payment.markFailed();
            paymentRepository.save(payment);

            log.info("[VNPay IPN] Payment failed: {} (responseCode={}, txnStatus={})",
                    paymentId, responseCode, transactionStatus);
            return IpnResult.success(null); // VNPay expects "00" even for failed payments
        }
    }
}
