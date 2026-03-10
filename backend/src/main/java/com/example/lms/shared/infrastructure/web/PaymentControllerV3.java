package com.example.lms.shared.infrastructure.web;

import com.example.lms.shared.application.dto.PaymentResponse;
import com.example.lms.shared.application.port.EmailServicePort;
import com.example.lms.shared.application.usecase.CheckoutUseCase;
import com.example.lms.shared.application.usecase.CreateVnPayUrlUseCase;
import com.example.lms.shared.application.usecase.ProcessVnPayIpnUseCase;
import com.example.lms.shared.application.usecase.RefundPaymentUseCase;
import com.example.lms.shared.domain.model.PaymentTransaction;
import com.example.lms.shared.domain.repository.PaymentRepository;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.learning_delivery.application.dto.SelfEnrollCommand;
import com.example.lms.learning_delivery.application.usecase.SelfEnrollUseCase;
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
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;

/**
 * Payment Controller V3 — Thin controller delegating to use cases.
 *
 * Use cases handle all business logic:
 * - CheckoutUseCase: Simulated payment (dev-only)
 * - CreateVnPayUrlUseCase: VNPay URL generation
 * - ProcessVnPayIpnUseCase: IPN callback verification + state transitions
 * - RefundPaymentUseCase: Admin refund processing
 */
@Slf4j
@Tag(name = "Payments V3", description = "API thanh toán khóa học (VNPay + Simulated)")
@RestController
@RequestMapping("/api/v3/payments")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
public class PaymentControllerV3 {

    // Use cases (business logic)
    private final CheckoutUseCase checkoutUseCase;
    private final CreateVnPayUrlUseCase createVnPayUrlUseCase;
    private final ProcessVnPayIpnUseCase processVnPayIpnUseCase;
    private final RefundPaymentUseCase refundPaymentUseCase;

    // Domain repository (read queries)
    private final PaymentRepository paymentRepository;

    // Infrastructure (for admin list queries — still uses JPA repo for pagination)
    private final PaymentTransactionJpaRepository paymentJpaRepository;
    private final SelfEnrollUseCase selfEnrollUseCase;
    private final UserJpaRepository userRepository;
    private final JpaCourseRepository courseRepository;
    private final com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository enrollmentJpaRepository;
    private final EmailServicePort emailService;
    private final Environment environment;

    // ==================== Student Endpoints ====================

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

        if (isProductionProfile()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Thanh toán giả lập không khả dụng trên hệ thống production. Vui lòng sử dụng VNPay."));
        }

        UUID courseId;
        try {
            courseId = UUID.fromString(request.courseId);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Mã khóa học không hợp lệ"));
        }
        BigDecimal serverPrice = getServerPrice(courseId);
        if (serverPrice == null || serverPrice.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body(
                    ApiResponse.error("KhÃ³a há»c nÃ y miá»…n phÃ­. Vui lÃ²ng Ä‘Äƒng kÃ½ trá»±c tiáº¿p thay vÃ¬ thanh toÃ¡n."));
        }

        var payment = checkoutUseCase.execute(currentUser.getId(), courseId, serverPrice, request.paymentMethod);

        // Auto-enroll student
        autoEnrollStudent(payment.getStudentId(), payment.getCourseId());

        String courseTitle = courseRepository.findById(courseId).map(CourseJpaEntity::getTitle).orElse(null);
        return ResponseEntity.ok(ApiResponse.success(
                PaymentResponse.from(payment, courseTitle).toMap(), "Thanh toán thành công"));
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

        UUID courseUuid;
        try {
            courseUuid = UUID.fromString(courseId);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Mã khóa học không hợp lệ"));
        }
        var paymentOpt = paymentRepository.findLatestByStudentAndCourse(currentUser.getId(), courseUuid);

        if (paymentOpt.isPresent() && paymentOpt.get().isCompleted()) {
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

        var payments = paymentRepository.findByStudentId(currentUser.getId());

        // Batch-load course titles (avoid N+1)
        var courseIds = payments.stream().map(PaymentTransaction::getCourseId).distinct().toList();
        Map<UUID, String> courseTitleMap = new HashMap<>();
        if (!courseIds.isEmpty()) {
            courseRepository.findAllById(courseIds).forEach(c -> courseTitleMap.put(c.getId(), c.getTitle()));
        }

        List<Map<String, Object>> result = payments.stream()
                .map(p -> PaymentResponse.from(p, courseTitleMap.get(p.getCourseId())).toMap())
                .toList();
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

        UUID courseUuid;
        try {
            courseUuid = UUID.fromString(courseId);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Mã khóa học không hợp lệ"));
        }
        boolean hasPaid = paymentRepository.hasCompletedPayment(currentUser.getId(), courseUuid);
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
        if (!payment.getStudentId().equals(currentUser.getId())) {
            return ResponseEntity.status(403).body(ApiResponse.error("Không có quyền xem giao dịch này"));
        }

        String courseTitle = courseRepository.findById(payment.getCourseId())
                .map(CourseJpaEntity::getTitle).orElse(null);
        return ResponseEntity.ok(ApiResponse.success(
                PaymentResponse.from(payment, courseTitle).toMap(), "Thông tin giao dịch"));
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
        CourseJpaEntity course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Khóa học không tồn tại: " + courseId));

        BigDecimal serverPrice = resolvePrice(course);
        String ipAddress = VnPayUtil.getClientIp(httpRequest);

        var result = createVnPayUrlUseCase.execute(
                currentUser.getId(), courseId, serverPrice, course.getTitle(), ipAddress);

        // Already paid — return existing payment
        if (result.paymentUrl() == null) {
            String courseTitle = course.getTitle();
            return ResponseEntity.ok(ApiResponse.success(
                    PaymentResponse.from(result.payment(), courseTitle).toMap(), "Đã thanh toán trước đó"));
        }

        Map<String, Object> responseMap = new LinkedHashMap<>();
        responseMap.put("paymentUrl", result.paymentUrl());
        responseMap.put("transactionId", result.payment().getTransactionId());
        return ResponseEntity.ok(ApiResponse.success(responseMap, "URL thanh toán VNPay đã được tạo"));
    }

    @Operation(summary = "VNPay IPN callback (server-to-server)")
    @GetMapping("/vnpay-ipn")
    @Transactional
    public ResponseEntity<Map<String, String>> vnpayIpn(@RequestParam Map<String, String> params) {
        log.info("[VNPay IPN] Received callback: txnRef={}", params.get("vnp_TxnRef"));

        try {
            var result = processVnPayIpnUseCase.execute(params);

            // If payment completed successfully, auto-enroll + send email
            if (result.payment() != null && result.payment().isCompleted()) {
                autoEnrollStudent(result.payment().getStudentId(), result.payment().getCourseId());
                sendPaymentEmails(result.payment());
            }

            return ResponseEntity.ok(Map.of("RspCode", result.rspCode(), "Message", result.message()));
        } catch (OptimisticLockingFailureException e) {
            log.warn("[VNPay IPN] Optimistic lock conflict — already processed by another IPN");
            return ResponseEntity.ok(Map.of("RspCode", "02", "Message", "Order already processed"));
        }
    }

    @Operation(summary = "VNPay return URL (browser redirect)")
    @GetMapping("/vnpay-return")
    public ResponseEntity<Void> vnpayReturn(@RequestParam Map<String, String> params) {
        String txnRef = params.get("vnp_TxnRef");
        String vnpTxnNo = params.get("vnp_TransactionNo");

        String redirectUrl = "/payment/callback/vnpay?vnp_TxnRef="
                + java.net.URLEncoder.encode(txnRef != null ? txnRef : "", java.nio.charset.StandardCharsets.UTF_8)
                + "&vnp_TransactionNo="
                + java.net.URLEncoder.encode(vnpTxnNo != null ? vnpTxnNo : "", java.nio.charset.StandardCharsets.UTF_8);

        return ResponseEntity.status(302)
                .header("Location", redirectUrl)
                .build();
    }

    // ==================== Admin Endpoints ====================

    @Operation(summary = "Admin: list all payments (paginated)")
    @GetMapping("/admin/all")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> adminListPayments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status
    ) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        Page<PaymentTransactionJpaEntity> payments;
        if (status != null && !status.isBlank()) {
            try {
                var paymentStatus = PaymentTransactionJpaEntity.PaymentStatus.valueOf(status);
                payments = paymentJpaRepository.findByStatus(paymentStatus, pageable);
            } catch (IllegalArgumentException e) {
                payments = paymentJpaRepository.findAll(pageable);
            }
        } else {
            payments = paymentJpaRepository.findAll(pageable);
        }

        // Batch-load student names + course titles
        var studentIds = payments.getContent().stream().map(PaymentTransactionJpaEntity::getStudentId).distinct().toList();
        var studentNames = new HashMap<UUID, String>();
        if (!studentIds.isEmpty()) {
            userRepository.findAllById(studentIds).forEach(u -> studentNames.put(u.getId(), u.getFullName()));
        }
        var courseIds = payments.getContent().stream().map(PaymentTransactionJpaEntity::getCourseId).distinct().toList();
        var courseTitles = new HashMap<UUID, String>();
        if (!courseIds.isEmpty()) {
            courseRepository.findAllById(courseIds).forEach(c -> courseTitles.put(c.getId(), c.getTitle()));
        }

        List<Map<String, Object>> content = payments.getContent().stream().map(p -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", p.getId().toString());
            map.put("courseId", p.getCourseId().toString());
            map.put("courseTitle", courseTitles.get(p.getCourseId()));
            map.put("amount", p.getAmount());
            map.put("currency", p.getCurrency());
            map.put("status", p.getStatus().name());
            map.put("transactionId", p.getTransactionId());
            map.put("paymentMethod", p.getPaymentMethod());
            map.put("paidAt", p.getPaidAt() != null ? p.getPaidAt().toString() : null);
            map.put("createdAt", p.getCreatedAt() != null ? p.getCreatedAt().toString() : null);
            map.put("studentName", studentNames.getOrDefault(p.getStudentId(), "—"));
            map.put("studentId", p.getStudentId().toString());
            map.put("refundStatus", p.getRefundStatus());
            return map;
        }).toList();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content", content);
        result.put("totalElements", payments.getTotalElements());
        result.put("totalPages", payments.getTotalPages());
        result.put("page", page);
        result.put("size", size);
        return ResponseEntity.ok(ApiResponse.success(result, "Danh sách giao dịch"));
    }

    @Operation(summary = "Admin: process refund for a payment")
    @PostMapping("/admin/{paymentId}/refund")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> adminRefundPayment(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @PathVariable UUID paymentId,
            @Valid @RequestBody RefundRequest request
    ) {
        var payment = refundPaymentUseCase.execute(
                paymentId, request.reason(), request.adminNote(), currentUser.getEmail());

        String courseTitle = courseRepository.findById(payment.getCourseId())
                .map(CourseJpaEntity::getTitle).orElse(null);

        // Revoke enrollment to remove course access
        enrollmentJpaRepository.findByStudentIdAndCourseId(payment.getStudentId(), payment.getCourseId())
                .ifPresent(enrollment -> {
                    enrollment.setStatus(com.example.lms.learning_delivery.infrastructure.persistence.entity.EnrollmentJpaEntity.EnrollmentStatus.DROPPED);
                    enrollmentJpaRepository.save(enrollment);
                    log.info("[Refund] Revoked enrollment for student {} course {}", payment.getStudentId(), payment.getCourseId());
                });

        // Send refund notification email
        sendRefundEmail(payment, courseTitle, request.reason());

        return ResponseEntity.ok(ApiResponse.success(
                PaymentResponse.from(payment, courseTitle).toMap(),
                "Hoàn tiền thành công. Vui lòng xử lý hoàn tiền qua VNPay merchant dashboard."));
    }

    // ==================== Helpers ====================

    private boolean isProductionProfile() {
        return Arrays.asList(environment.getActiveProfiles()).contains("prod");
    }

    private BigDecimal getServerPrice(UUID courseId) {
        CourseJpaEntity course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Khóa học không tồn tại: " + courseId));
        return resolvePrice(course);
    }

    private BigDecimal resolvePrice(CourseJpaEntity course) {
        if (course.getSalePrice() != null && course.getSalePrice().compareTo(BigDecimal.ZERO) > 0) {
            return course.getSalePrice();
        }
        return course.getPrice() != null ? course.getPrice() : BigDecimal.ZERO;
    }

    private void autoEnrollStudent(UUID studentId, UUID courseId) {
        try {
            selfEnrollUseCase.execute(new SelfEnrollCommand(courseId, studentId));
            log.info("[Payment] Auto-enrolled student {} in course {}", studentId, courseId);
        } catch (Exception e) {
            log.error("[Payment] Auto-enrollment failed for student {} course {}: {}", studentId, courseId, e.getMessage());
        }
    }

    private void sendRefundEmail(PaymentTransaction payment, String courseTitle, String reason) {
        try {
            var userOpt = userRepository.findById(payment.getStudentId());
            if (userOpt.isPresent()) {
                var student = userOpt.get();
                emailService.sendRefundNotification(
                        student.getEmail(), student.getFullName(),
                        courseTitle != null ? courseTitle : "Khóa học",
                        payment.getAmount(), reason, payment.getTransactionId()
                );
            }
        } catch (Exception e) {
            log.error("[Refund] Failed to send refund email: {}", e.getMessage());
        }
    }

    private void sendPaymentEmails(PaymentTransaction payment) {
        try {
            var userOpt = userRepository.findById(payment.getStudentId());
            if (userOpt.isPresent()) {
                var user = userOpt.get();
                String courseName = courseRepository.findById(payment.getCourseId())
                        .map(CourseJpaEntity::getTitle).orElse("Khóa học");
                emailService.sendPaymentReceipt(
                        user.getEmail(), user.getFullName(), courseName,
                        payment.getAmount(), payment.getTransactionId(),
                        payment.getPaymentMethod(),
                        payment.getPaidAt() != null ? payment.getPaidAt().toString() : null
                );
            }
        } catch (Exception e) {
            log.error("[Payment] Failed to send payment email: {}", e.getMessage());
        }
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
            BigDecimal amount
    ) {}

    public record RefundRequest(
            @NotBlank(message = "Lý do hoàn tiền không được để trống")
            String reason,
            String adminNote
    ) {}
}
