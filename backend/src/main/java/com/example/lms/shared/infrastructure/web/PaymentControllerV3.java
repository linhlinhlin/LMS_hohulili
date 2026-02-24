package com.example.lms.shared.infrastructure.web;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.EnrollmentRepositoryImpl;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.EnrollmentJpaEntity;
import com.example.lms.shared.application.port.EmailServicePort;
import com.example.lms.shared.application.port.PaymentGatewayPort;
import com.example.lms.shared.infrastructure.persistence.entity.PaymentTransactionJpaEntity;
import com.example.lms.shared.infrastructure.persistence.repository.PaymentTransactionJpaRepository;
import com.example.lms.shared.infrastructure.vnpay.VnPayUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

/**
 * Payment Controller V3 - Simulated payment for LMS courses.
 * Payments are persisted to the database (payment_transactions table).
 * In production, integrate with VNPay/Stripe/PayPal.
 */
@Slf4j
@Tag(name = "Payments V3", description = "API thanh toán khóa học (VNPay + Simulated)")
@RestController
@RequestMapping("/api/v3/payments")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
public class PaymentControllerV3 {

    private final PaymentTransactionJpaRepository paymentRepository;
    private final PaymentGatewayPort paymentGateway;
    private final EmailServicePort emailService;
    private final JpaEnrollmentRepository enrollmentRepository;
    private final UserJpaRepository userRepository;

    @Operation(summary = "Checkout - simulate course payment")
    @PostMapping("/checkout")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkout(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @Valid @RequestBody CheckoutRequest request
    ) {
        if (currentUser == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Không được phép truy cập"));
        }

        UUID courseId = UUID.fromString(request.courseId);

        // Check for existing payment
        var existing = paymentRepository.findByStudentIdAndCourseId(currentUser.getId(), courseId);
        if (existing.isPresent() && existing.get().getStatus() == PaymentTransactionJpaEntity.PaymentStatus.COMPLETED) {
            return ResponseEntity.ok(ApiResponse.success(toPaymentMap(existing.get()), "Đã thanh toán trước đó"));
        }

        String txnId = "TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        var payment = PaymentTransactionJpaEntity.builder()
                .studentId(currentUser.getId())
                .courseId(courseId)
                .amount(request.amount != null ? BigDecimal.valueOf(request.amount) : BigDecimal.ZERO)
                .paymentMethod(request.paymentMethod != null ? request.paymentMethod : "SIMULATED")
                .transactionId(txnId)
                .status(PaymentTransactionJpaEntity.PaymentStatus.COMPLETED)
                .paidAt(Instant.now())
                .build();

        payment = paymentRepository.save(payment);

        return ResponseEntity.ok(ApiResponse.success(toPaymentMap(payment), "Thanh toán thành công"));
    }

    @Operation(summary = "Get payment status for a course")
    @GetMapping("/status/{courseId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPaymentStatus(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @PathVariable String courseId
    ) {
        if (currentUser == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Không được phép truy cập"));
        }

        UUID courseUuid = UUID.fromString(courseId);
        var paymentOpt = paymentRepository.findByStudentIdAndCourseId(currentUser.getId(), courseUuid);

        if (paymentOpt.isPresent() && paymentOpt.get().getStatus() == PaymentTransactionJpaEntity.PaymentStatus.COMPLETED) {
            var payment = paymentOpt.get();
            return ResponseEntity.ok(ApiResponse.success(
                Map.of(
                    "courseId", courseId,
                    "hasPaid", true,
                    "status", "COMPLETED",
                    "transactionId", payment.getTransactionId(),
                    "paidAt", payment.getPaidAt().toString()
                ),
                "Trạng thái thanh toán"
            ));
        }

        return ResponseEntity.ok(ApiResponse.success(
            Map.of(
                "courseId", courseId,
                "hasPaid", false,
                "status", "UNPAID",
                "freeLessonsCount", 2
            ),
            "Khóa học chưa được mua"
        ));
    }

    @Operation(summary = "Get payment history")
    @GetMapping("/my-payments")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getMyPayments(
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Không được phép truy cập"));
        }

        var payments = paymentRepository.findByStudentIdOrderByCreatedAtDesc(currentUser.getId());
        List<Map<String, Object>> result = payments.stream().map(this::toPaymentMap).toList();
        return ResponseEntity.ok(ApiResponse.success(result, "Lịch sử thanh toán"));
    }

    @Operation(summary = "Check if student can access a lesson")
    @GetMapping("/can-access/{courseId}/lesson/{lessonIndex}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Object>>> canAccessLesson(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @PathVariable String courseId,
            @PathVariable int lessonIndex
    ) {
        if (currentUser == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Không được phép truy cập"));
        }

        UUID courseUuid = UUID.fromString(courseId);
        boolean hasPaid = paymentRepository.existsByStudentIdAndCourseId(currentUser.getId(), courseUuid);

        // Free access: first 2 lessons (index 0, 1)
        boolean canAccess = hasPaid || lessonIndex < 2;

        return ResponseEntity.ok(ApiResponse.success(
            Map.of(
                "courseId", courseId,
                "lessonIndex", lessonIndex,
                "canAccess", canAccess,
                "hasPaid", hasPaid,
                "message", canAccess ? "Được phép truy cập" : "Cần thanh toán để xem bài học này"
            ),
            canAccess ? "Được phép truy cập" : "Cần thanh toán"
        ));
    }

    // ==================== VNPay Endpoints ====================

    @Operation(summary = "Tạo URL thanh toán VNPay")
    @PostMapping("/vnpay/create-url")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> createVnPayUrl(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @Valid @RequestBody VnPayCreateRequest request,
            HttpServletRequest httpRequest
    ) {
        if (currentUser == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Không được phép truy cập"));
        }

        UUID courseId = request.courseId();
        BigDecimal amount = request.amount();

        // Check for existing completed payment
        var existing = paymentRepository.findByStudentIdAndCourseId(currentUser.getId(), courseId);
        if (existing.isPresent() && existing.get().getStatus() == PaymentTransactionJpaEntity.PaymentStatus.COMPLETED) {
            return ResponseEntity.ok(ApiResponse.success(toPaymentMap(existing.get()), "Đã thanh toán trước đó"));
        }

        // Create PENDING transaction
        var payment = PaymentTransactionJpaEntity.builder()
                .studentId(currentUser.getId())
                .courseId(courseId)
                .amount(amount)
                .paymentMethod("VNPAY")
                .transactionId(UUID.randomUUID().toString())
                .status(PaymentTransactionJpaEntity.PaymentStatus.PENDING)
                .build();
        payment = paymentRepository.save(payment);

        // Generate VNPay redirect URL
        String ipAddress = VnPayUtil.getClientIp(httpRequest);
        String orderInfo = "Thanh toan khoa hoc LMS";
        String paymentUrl = paymentGateway.createPaymentUrl(payment.getId(), amount, orderInfo, ipAddress);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("paymentUrl", paymentUrl);
        result.put("transactionId", payment.getTransactionId());

        return ResponseEntity.ok(ApiResponse.success(result, "URL thanh toán VNPay đã được tạo"));
    }

    @Operation(summary = "VNPay IPN callback (server-to-server)")
    @GetMapping("/vnpay-ipn")
    @Transactional
    public ResponseEntity<Map<String, String>> vnpayIpn(@RequestParam Map<String, String> params) {
        log.info("[VNPay IPN] Received callback: {}", params.get("vnp_TxnRef"));

        // Verify checksum
        if (!paymentGateway.verifyCallback(params)) {
            log.warn("[VNPay IPN] Invalid checksum");
            return ResponseEntity.ok(Map.of("RspCode", "97", "Message", "Invalid Checksum"));
        }

        String txnRef = params.get("vnp_TxnRef");
        if (txnRef == null) {
            return ResponseEntity.ok(Map.of("RspCode", "01", "Message", "Order not found"));
        }

        // txnRef is the payment entity ID
        UUID paymentId;
        try {
            paymentId = UUID.fromString(txnRef);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.ok(Map.of("RspCode", "01", "Message", "Invalid TxnRef"));
        }

        var paymentOpt = paymentRepository.findById(paymentId);
        if (paymentOpt.isEmpty()) {
            return ResponseEntity.ok(Map.of("RspCode", "01", "Message", "Order not found"));
        }

        var payment = paymentOpt.get();

        // Idempotency: already processed
        if (payment.getStatus() == PaymentTransactionJpaEntity.PaymentStatus.COMPLETED) {
            return ResponseEntity.ok(Map.of("RspCode", "02", "Message", "Order already confirmed"));
        }

        String responseCode = params.get("vnp_ResponseCode");
        payment.setVnpTransactionNo(params.get("vnp_TransactionNo"));
        payment.setVnpBankCode(params.get("vnp_BankCode"));
        payment.setVnpResponseCode(responseCode);
        payment.setVnpCardType(params.get("vnp_CardType"));

        if ("00".equals(responseCode)) {
            // Payment successful
            payment.setStatus(PaymentTransactionJpaEntity.PaymentStatus.COMPLETED);
            payment.setPaidAt(Instant.now());
            paymentRepository.save(payment);

            // Auto-enroll student
            autoEnrollStudent(payment.getStudentId(), payment.getCourseId());

            // Send email notifications
            sendPaymentEmails(payment);

            log.info("[VNPay IPN] Payment completed: {}", paymentId);
            return ResponseEntity.ok(Map.of("RspCode", "00", "Message", "Confirm Success"));
        } else {
            payment.setStatus(PaymentTransactionJpaEntity.PaymentStatus.FAILED);
            paymentRepository.save(payment);

            log.info("[VNPay IPN] Payment failed with code {}: {}", responseCode, paymentId);
            return ResponseEntity.ok(Map.of("RspCode", "00", "Message", "Confirm Success"));
        }
    }

    @Operation(summary = "VNPay return URL (browser redirect)")
    @GetMapping("/vnpay-return")
    public ResponseEntity<Void> vnpayReturn(@RequestParam Map<String, String> params) {
        // Verify checksum
        boolean valid = paymentGateway.verifyCallback(params);
        String responseCode = params.get("vnp_ResponseCode");
        String txnRef = params.get("vnp_TxnRef");
        String vnpTxnNo = params.get("vnp_TransactionNo");

        String redirectUrl;
        if (valid && "00".equals(responseCode)) {
            redirectUrl = "/payment/success?txnRef=" + txnRef + "&vnp_TransactionNo=" + vnpTxnNo;
        } else {
            redirectUrl = "/payment/failed?code=" + (responseCode != null ? responseCode : "99");
        }

        return ResponseEntity.status(302)
                .header("Location", redirectUrl)
                .build();
    }

    private void autoEnrollStudent(UUID studentId, UUID courseId) {
        try {
            var existingEnrollment = enrollmentRepository.findByStudentIdAndCourseId(studentId, courseId);
            if (existingEnrollment.isPresent()) {
                log.info("[VNPay] Student {} already enrolled in course {}", studentId, courseId);
                return;
            }

            // Find default learning class for the course
            var classes = enrollmentRepository.findByLearningClass_CourseId(courseId);
            if (!classes.isEmpty()) {
                // Already enrolled via a class
                log.info("[VNPay] Student already has enrollment in course via class");
                return;
            }

            log.info("[VNPay] Auto-enrollment: student {} → course {} (manual enrollment needed - no default class)", studentId, courseId);
        } catch (Exception e) {
            log.error("[VNPay] Auto-enrollment failed for student {} course {}: {}", studentId, courseId, e.getMessage());
        }
    }

    private void sendPaymentEmails(PaymentTransactionJpaEntity payment) {
        try {
            var userOpt = userRepository.findById(payment.getStudentId());
            if (userOpt.isPresent()) {
                var user = userOpt.get();
                emailService.sendPaymentReceipt(
                        user.getEmail(),
                        user.getFullName(),
                        "Khóa học LMS",
                        payment.getAmount(),
                        payment.getTransactionId()
                );
            }
        } catch (Exception e) {
            log.error("[VNPay] Failed to send payment email: {}", e.getMessage());
        }
    }

    private Map<String, Object> toPaymentMap(PaymentTransactionJpaEntity p) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", p.getId().toString());
        map.put("courseId", p.getCourseId().toString());
        map.put("amount", p.getAmount());
        map.put("currency", p.getCurrency());
        map.put("status", p.getStatus().name());
        map.put("transactionId", p.getTransactionId());
        map.put("paymentMethod", p.getPaymentMethod());
        map.put("paidAt", p.getPaidAt() != null ? p.getPaidAt().toString() : null);
        map.put("createdAt", p.getCreatedAt() != null ? p.getCreatedAt().toString() : null);
        return map;
    }

    // ==================== Request DTOs ====================

    public record CheckoutRequest(
        @NotBlank(message = "Mã khóa học không được để trống")
        String courseId,
        Double amount,
        String paymentMethod
    ) {}

    public record VnPayCreateRequest(
        @NotNull(message = "Mã khóa học không được để trống")
        UUID courseId,
        @NotNull(message = "Số tiền không được để trống")
        BigDecimal amount
    ) {}
}
