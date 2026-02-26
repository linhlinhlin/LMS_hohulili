package com.example.lms.shared.infrastructure.web;

import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.learning_delivery.application.dto.SelfEnrollCommand;
import com.example.lms.learning_delivery.application.usecase.SelfEnrollUseCase;
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
import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

/**
 * Payment Controller V3 - VNPay integration + Simulated (dev-only) payment.
 *
 * Security hardening (S96):
 * - Server-side price validation from course DB (no trust on client amount)
 * - IPN amount verification (vnp_Amount must match stored amount)
 * - State guard: only PENDING payments can transition to COMPLETED/FAILED
 * - vnp_TransactionStatus + vnp_ResponseCode double-check
 * - SIMULATED checkout blocked in production profile
 * - canAccessLesson checks COMPLETED status (not just existence)
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
    private final SelfEnrollUseCase selfEnrollUseCase;
    private final UserJpaRepository userRepository;
    private final JpaCourseRepository courseRepository;
    private final Environment environment;

    @Operation(summary = "Checkout - simulate course payment (dev-only)")
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

        // P1 FIX: Block simulated checkout in production
        if (isProductionProfile()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Thanh toán giả lập không khả dụng trên hệ thống production. Vui lòng sử dụng VNPay."));
        }

        UUID courseId = UUID.fromString(request.courseId);

        // Check for existing completed payment
        var existing = paymentRepository.findTopByStudentIdAndCourseIdOrderByCreatedAtDesc(currentUser.getId(), courseId);
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

        // Auto-enroll student after simulated payment
        autoEnrollStudent(payment.getStudentId(), payment.getCourseId());

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
        var paymentOpt = paymentRepository.findTopByStudentIdAndCourseIdOrderByCreatedAtDesc(currentUser.getId(), courseUuid);

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

        // P1 FIX: Only count COMPLETED payments (not PENDING/FAILED)
        boolean hasPaid = paymentRepository.existsByStudentIdAndCourseIdAndStatus(
                currentUser.getId(), courseUuid, PaymentTransactionJpaEntity.PaymentStatus.COMPLETED);

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

    @Operation(summary = "Get payment by transaction reference (for callback verification)")
    @GetMapping("/by-ref/{txnRef}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPaymentByTxnRef(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @PathVariable String txnRef
    ) {
        if (currentUser == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Không được phép truy cập"));
        }

        // txnRef is our payment entity ID (UUID)
        UUID paymentId;
        try {
            paymentId = UUID.fromString(txnRef);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Mã giao dịch không hợp lệ"));
        }

        var paymentOpt = paymentRepository.findById(paymentId);
        if (paymentOpt.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.error("Không tìm thấy giao dịch"));
        }

        var payment = paymentOpt.get();

        // Security: only owner can view their own payment
        if (!payment.getStudentId().equals(currentUser.getId())) {
            return ResponseEntity.status(403).body(ApiResponse.error("Không có quyền xem giao dịch này"));
        }

        return ResponseEntity.ok(ApiResponse.success(toPaymentMap(payment), "Thông tin giao dịch"));
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

        // Check for existing completed payment
        var existing = paymentRepository.findTopByStudentIdAndCourseIdOrderByCreatedAtDesc(currentUser.getId(), courseId);
        if (existing.isPresent() && existing.get().getStatus() == PaymentTransactionJpaEntity.PaymentStatus.COMPLETED) {
            return ResponseEntity.ok(ApiResponse.success(toPaymentMap(existing.get()), "Đã thanh toán trước đó"));
        }

        // Server-side price validation — use course price from DB, not client
        CourseJpaEntity course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Khóa học không tồn tại: " + courseId));

        // Use salePrice if available, otherwise full price
        BigDecimal serverPrice = (course.getSalePrice() != null && course.getSalePrice().compareTo(BigDecimal.ZERO) > 0)
                ? course.getSalePrice()
                : course.getPrice();
        if (serverPrice == null || serverPrice.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Khóa học này miễn phí, không cần thanh toán"));
        }

        // Create PENDING transaction with server-verified price
        var payment = PaymentTransactionJpaEntity.builder()
                .studentId(currentUser.getId())
                .courseId(courseId)
                .amount(serverPrice)
                .paymentMethod("VNPAY")
                .transactionId(UUID.randomUUID().toString())
                .status(PaymentTransactionJpaEntity.PaymentStatus.PENDING)
                .build();
        payment = paymentRepository.save(payment);

        // Generate VNPay redirect URL
        String ipAddress = VnPayUtil.getClientIp(httpRequest);
        String orderInfo = "Thanh toan khoa hoc " + course.getTitle();
        String paymentUrl = paymentGateway.createPaymentUrl(payment.getId(), serverPrice, orderInfo, ipAddress);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("paymentUrl", paymentUrl);
        result.put("transactionId", payment.getTransactionId());

        log.info("[VNPay] Created payment URL for course {} ({}đ), txn: {}",
                courseId, serverPrice, payment.getTransactionId());
        return ResponseEntity.ok(ApiResponse.success(result, "URL thanh toán VNPay đã được tạo"));
    }

    @Operation(summary = "VNPay IPN callback (server-to-server)")
    @GetMapping("/vnpay-ipn")
    @Transactional
    public ResponseEntity<Map<String, String>> vnpayIpn(@RequestParam Map<String, String> params) {
        log.info("[VNPay IPN] Received callback: txnRef={}", params.get("vnp_TxnRef"));

        // Step 1: Verify checksum
        if (!paymentGateway.verifyCallback(params)) {
            log.warn("[VNPay IPN] Invalid checksum for txnRef={}", params.get("vnp_TxnRef"));
            return ResponseEntity.ok(Map.of("RspCode", "97", "Message", "Invalid Checksum"));
        }

        // Step 2: Find payment
        String txnRef = params.get("vnp_TxnRef");
        if (txnRef == null) {
            return ResponseEntity.ok(Map.of("RspCode", "01", "Message", "Order not found"));
        }

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

        // Step 3: Idempotency — already processed
        if (payment.getStatus() == PaymentTransactionJpaEntity.PaymentStatus.COMPLETED) {
            return ResponseEntity.ok(Map.of("RspCode", "02", "Message", "Order already confirmed"));
        }

        // P1 FIX: State guard — only PENDING payments can be processed
        if (payment.getStatus() != PaymentTransactionJpaEntity.PaymentStatus.PENDING) {
            log.warn("[VNPay IPN] Payment {} is in {} state, cannot process IPN",
                    paymentId, payment.getStatus());
            return ResponseEntity.ok(Map.of("RspCode", "02", "Message", "Order already processed"));
        }

        // P0 FIX: Validate amount — vnp_Amount must match stored amount
        String vnpAmountStr = params.get("vnp_Amount");
        if (vnpAmountStr != null) {
            try {
                // VNPay sends amount × 100 (no decimals)
                BigDecimal vnpAmount = new BigDecimal(vnpAmountStr).divide(BigDecimal.valueOf(100));
                if (vnpAmount.compareTo(payment.getAmount()) != 0) {
                    log.error("[VNPay IPN] Amount mismatch for payment {}: expected {}đ, received {}đ",
                            paymentId, payment.getAmount(), vnpAmount);
                    payment.setStatus(PaymentTransactionJpaEntity.PaymentStatus.FAILED);
                    payment.setVnpResponseCode("04");
                    paymentRepository.save(payment);
                    return ResponseEntity.ok(Map.of("RspCode", "04", "Message", "Invalid Amount"));
                }
            } catch (NumberFormatException e) {
                log.error("[VNPay IPN] Invalid vnp_Amount format: {}", vnpAmountStr);
                return ResponseEntity.ok(Map.of("RspCode", "04", "Message", "Invalid Amount"));
            }
        }

        // Step 4: Update VNPay metadata
        String responseCode = params.get("vnp_ResponseCode");
        String transactionStatus = params.get("vnp_TransactionStatus");
        payment.setVnpTransactionNo(params.get("vnp_TransactionNo"));
        payment.setVnpBankCode(params.get("vnp_BankCode"));
        payment.setVnpResponseCode(responseCode);
        payment.setVnpCardType(params.get("vnp_CardType"));

        // P1 FIX: Check BOTH responseCode AND transactionStatus
        boolean isSuccess = "00".equals(responseCode) && "00".equals(transactionStatus);

        if (isSuccess) {
            payment.setStatus(PaymentTransactionJpaEntity.PaymentStatus.COMPLETED);
            payment.setPaidAt(Instant.now());
            paymentRepository.save(payment);

            // Auto-enroll student
            autoEnrollStudent(payment.getStudentId(), payment.getCourseId());

            // Send email notifications
            sendPaymentEmails(payment);

            log.info("[VNPay IPN] Payment completed: {} (bank={}, txnNo={})",
                    paymentId, params.get("vnp_BankCode"), params.get("vnp_TransactionNo"));
            return ResponseEntity.ok(Map.of("RspCode", "00", "Message", "Confirm Success"));
        } else {
            payment.setStatus(PaymentTransactionJpaEntity.PaymentStatus.FAILED);
            paymentRepository.save(payment);

            log.info("[VNPay IPN] Payment failed: {} (responseCode={}, txnStatus={})",
                    paymentId, responseCode, transactionStatus);
            return ResponseEntity.ok(Map.of("RspCode", "00", "Message", "Confirm Success"));
        }
    }

    @Operation(summary = "VNPay return URL (browser redirect)")
    @GetMapping("/vnpay-return")
    public ResponseEntity<Void> vnpayReturn(@RequestParam Map<String, String> params) {
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

    // ==================== Helpers ====================

    private boolean isProductionProfile() {
        return Arrays.asList(environment.getActiveProfiles()).contains("prod");
    }

    private void autoEnrollStudent(UUID studentId, UUID courseId) {
        try {
            selfEnrollUseCase.execute(new SelfEnrollCommand(courseId, studentId));
            log.info("[Payment] Auto-enrolled student {} in course {}", studentId, courseId);
        } catch (Exception e) {
            log.error("[Payment] Auto-enrollment failed for student {} course {}: {}", studentId, courseId, e.getMessage());
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
            log.error("[Payment] Failed to send payment email: {}", e.getMessage());
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
        BigDecimal amount // Ignored — server uses course price from DB
    ) {}
}
