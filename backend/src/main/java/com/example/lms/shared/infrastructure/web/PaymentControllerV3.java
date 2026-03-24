package com.example.lms.shared.infrastructure.web;

import com.example.lms.shared.application.dto.PaymentResponse;
import com.example.lms.shared.application.port.EmailServicePort;
import com.example.lms.shared.application.usecase.CheckoutUseCase;
import com.example.lms.shared.application.usecase.CreateSepayPaymentUseCase;
import com.example.lms.shared.application.usecase.CreateVnPayUrlUseCase;
import com.example.lms.shared.application.usecase.ProcessSepayWebhookUseCase;
import com.example.lms.shared.application.usecase.ProcessVnPayIpnUseCase;
import com.example.lms.shared.application.usecase.AdminSettingsUseCase;
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
import com.example.lms.course_authoring.infrastructure.service.CoursePublicationService;
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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

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
    private final AdminSettingsUseCase adminSettingsUseCase;
    private final CheckoutUseCase checkoutUseCase;
    private final CreateVnPayUrlUseCase createVnPayUrlUseCase;
    private final ProcessVnPayIpnUseCase processVnPayIpnUseCase;
    private final RefundPaymentUseCase refundPaymentUseCase;
    private final CreateSepayPaymentUseCase createSepayPaymentUseCase;
    private final ProcessSepayWebhookUseCase processSepayWebhookUseCase;
    private final com.example.lms.shared.application.port.SepayPaymentPort sepayPaymentPort;

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
    private final CoursePublicationService coursePublicationService;

    // ==================== Student Endpoints ====================

    @Operation(summary = "Checkout - simulate course payment (dev-only)")
    @PostMapping("/checkout")
    @PreAuthorize("isAuthenticated()")
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
                    ApiResponse.error("Khóa học này miễn phí. Vui lòng đăng ký trực tiếp thay vì thanh toán."));
        }

        var payment = checkoutUseCase.execute(currentUser.getId(), courseId, serverPrice, request.paymentMethod);

        // Auto-enroll student
        autoEnrollStudent(payment.getStudentId(), payment.getCourseId());

        String courseTitle = courseRepository.findById(courseId).map(CourseJpaEntity::getTitle).orElse(null);
        PaymentAccessActivationSnapshot activation = resolvePaymentAccessActivation(
                currentUser.getId(),
                courseId
        );
        return ResponseEntity.ok(ApiResponse.success(
                PaymentResponse.from(
                        payment,
                        courseTitle,
                        activation.state(),
                        activation.message()
                ).toMap(), "Thanh toán thành công"));
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
            PaymentAccessActivationSnapshot activation = resolvePaymentAccessActivation(
                    currentUser.getId(),
                    payment.getCourseId()
            );
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("courseId", courseId);
            payload.put("hasPaid", true);
            payload.put("status", "COMPLETED");
            payload.put("freeLessonsCount", 0);
            payload.put("transactionId", payment.getTransactionId());
            payload.put("paidAt", payment.getPaidAt().toString());
            payload.put("accessActivationState", activation.state());
            payload.put("accessActivationMessage", activation.message());
            return ResponseEntity.ok(ApiResponse.success(
                    payload,
                    "Trạng thái thanh toán"
            ));
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("courseId", courseId);
        payload.put("hasPaid", false);
        payload.put("status", "UNPAID");
        payload.put("freeLessonsCount", resolvePublishedPreviewLessonCount(courseUuid, currentUser.getId()));
        payload.put("accessActivationState", null);
        payload.put("accessActivationMessage", null);
        return ResponseEntity.ok(ApiResponse.success(payload, "Khóa học chưa được mua"));
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
                .map(p -> {
                    PaymentAccessActivationSnapshot activation = p.isCompleted()
                            ? resolvePaymentAccessActivation(currentUser.getId(), p.getCourseId())
                            : new PaymentAccessActivationSnapshot(null, null);
                    return PaymentResponse.from(
                            p,
                            courseTitleMap.get(p.getCourseId()),
                            activation.state(),
                            activation.message()
                    ).toMap();
                })
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
        boolean canAccess = hasPaid || isPublishedPreviewLessonAccessible(courseUuid, currentUser.getId(), lessonIndex);

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
        PaymentAccessActivationSnapshot activation = payment.isCompleted()
                ? resolvePaymentAccessActivation(currentUser.getId(), payment.getCourseId())
                : new PaymentAccessActivationSnapshot(null, null);
        return ResponseEntity.ok(ApiResponse.success(
                PaymentResponse.from(
                        payment,
                        courseTitle,
                        activation.state(),
                        activation.message()
                ).toMap(), "Thông tin giao dịch"));
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

        if (!adminSettingsUseCase.getSettings().payment().vnpayEnabled()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("VNPay chưa được kích hoạt. Vui lòng sử dụng phương thức thanh toán khác."));
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
            PaymentAccessActivationSnapshot activation = resolvePaymentAccessActivation(
                    currentUser.getId(),
                    courseId
            );
            return ResponseEntity.ok(ApiResponse.success(
                    PaymentResponse.from(
                            result.payment(),
                            courseTitle,
                            activation.state(),
                            activation.message()
                    ).toMap(),
                    "Đã thanh toán trước đó"
            ));
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

    // ==================== SePay Endpoints ====================

    @Operation(summary = "Tạo QR thanh toán SePay (bank transfer)")
    @PostMapping("/sepay/create-qr")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> createSepayQr(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @Valid @RequestBody SepayCreateQrRequest request
    ) {
        if (currentUser == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Không được phép truy cập"));
        }

        if (!adminSettingsUseCase.getSettings().payment().sepayEnabled()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("SePay chưa được kích hoạt. Vui lòng liên hệ admin."));
        }

        CourseJpaEntity course = courseRepository.findById(request.courseId())
                .orElseThrow(() -> new IllegalArgumentException("Khóa học không tồn tại: " + request.courseId()));

        BigDecimal serverPrice = resolvePrice(course);
        var result = createSepayPaymentUseCase.execute(
                currentUser.getId(), request.courseId(), serverPrice, course.getTitle());

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("txnId", result.payment().getId().toString());
        data.put("qrUrl", result.qrUrl());
        data.put("transferContent", result.transferContent());
        data.put("bankCode", result.bankCode());
        data.put("accountNumber", result.accountNumber());
        data.put("accountName", result.accountName());
        data.put("amount", result.amount());
        data.put("courseTitle", course.getTitle());
        return ResponseEntity.ok(ApiResponse.success(data, "QR thanh toán SePay đã được tạo"));
    }

    @Operation(summary = "SePay webhook - nhận thông báo chuyển khoản thành công")
    @PostMapping("/sepay/webhook")
    public ResponseEntity<Map<String, Object>> sepayWebhook(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody Map<String, Object> payload
    ) {
        var result = processSepayWebhookUseCase.execute(payload, authorization);

        if (!result.success()) {
            HttpStatus status = "Unauthorized".equalsIgnoreCase(result.message())
                    ? HttpStatus.UNAUTHORIZED
                    : HttpStatus.BAD_REQUEST;
            return ResponseEntity.status(status).body(Map.of(
                    "success", false,
                    "message", result.message()
            ));
        }

        if (result.payment() != null) {
            autoEnrollStudent(result.payment().getStudentId(), result.payment().getCourseId());
            sendPaymentEmails(result.payment());
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "success", true,
                    "message", result.message()
            ));
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", result.message()
        ));
    }

    @Operation(summary = "Polling - kiểm tra trạng thái giao dịch SePay")
    @GetMapping("/sepay/poll/{txnId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Object>>> pollSepayPayment(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @PathVariable UUID txnId
    ) {
        if (currentUser == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Không được phép truy cập"));
        }

        var paymentOpt = paymentRepository.findById(txnId);
        if (paymentOpt.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.error("Không tìm thấy giao dịch"));
        }

        var payment = paymentOpt.get();
        if (!payment.getStudentId().equals(currentUser.getId())) {
            return ResponseEntity.status(403).body(ApiResponse.error("Không có quyền xem giao dịch này"));
        }

        return ResponseEntity.ok(ApiResponse.success(
                Map.of(
                        "txnId", txnId.toString(),
                        "status", payment.getStatus().name(),
                        "hasPaid", payment.isCompleted()
                ),
                "Trạng thái giao dịch"
        ));
    }

    @Operation(summary = "Learner: available payment methods for current runtime")
    @GetMapping("/available-methods")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAvailablePaymentMethods() {
        List<String> methods = resolveAvailablePaymentMethods();
        String defaultMethod = resolveDefaultPaymentMethod(methods);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("availableMethods", methods);
        payload.put("defaultMethod", defaultMethod);
        payload.put("production", isProductionProfile());
        payload.put("hasAvailableMethod", !methods.isEmpty());
        payload.put("message", methods.isEmpty()
                ? "Hiện không có cổng thanh toán nào đang được bật."
                : null);
        return ResponseEntity.ok(ApiResponse.success(payload, "Danh sách phương thức thanh toán khả dụng"));
    }

    // ==================== Admin Endpoints ====================

    @Operation(summary = "Admin: list all payments (paginated)")
    @GetMapping("/admin/all")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> adminListPayments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @AuthenticationPrincipal UserJpaEntity currentUser
    ) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<PaymentTransactionJpaEntity> payments = resolveAdminPaymentsPage(pageable, status, currentUser);

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
        verifyPaymentAccess(paymentId, currentUser);
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

    // ==================== Admin Endpoints ====================

    @Operation(summary = "Admin: trạng thái cổng thanh toán hiện tại (VNPay + SePay)")
    @GetMapping("/admin/gateway-status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getGatewayStatus() {
        boolean isProd = isProductionProfile();

        // SePay status from @ConfigurationProperties
        boolean sepayConfigured = sepayPaymentPort.isEnabled();
        String bankCode = sepayPaymentPort.getBankCode();
        String accountNumber = sepayPaymentPort.getAccountNumber();
        String accountName = sepayPaymentPort.getAccountName();

        // Gateway enabled/disabled controlled by admin settings
        var paymentSettings = adminSettingsUseCase.getSettings().payment();
        boolean vnpayAdminEnabled = paymentSettings.vnpayEnabled();
        boolean sepayAdminEnabled = paymentSettings.sepayEnabled();

        Map<String, Object> vnpay = new LinkedHashMap<>();
        vnpay.put("enabled", vnpayAdminEnabled);
        vnpay.put("sandbox", !isProd);
        vnpay.put("note", vnpayAdminEnabled ? "Đang hoạt động — cấu hình qua env VNPAY_*" : "Đã tắt bởi admin");

        Map<String, Object> sepay = new LinkedHashMap<>();
        sepay.put("enabled", sepayAdminEnabled && sepayConfigured);
        sepay.put("bankCode", bankCode);
        sepay.put("accountNumber", accountNumber);
        sepay.put("accountName", accountName);
        sepay.put("webhookUrl", "https://holilihu.online/api/v3/payments/sepay/webhook");
        sepay.put("webhookConfigured", !sepayPaymentPort.getAccountNumber().isBlank());
        if (!sepayAdminEnabled) {
            sepay.put("hint", "Bật SePay trong Cài đặt hệ thống → Thanh toán.");
        } else if (!sepayConfigured) {
            sepay.put("hint", "Đặt SEPAY_ENABLED=true, SEPAY_BANK_CODE, SEPAY_ACCOUNT_NUMBER, SEPAY_ACCOUNT_NAME, SEPAY_WEBHOOK_API_KEY trong .env.prod rồi redeploy backend.");
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("vnpay", vnpay);
        data.put("sepay", sepay);
        return ResponseEntity.ok(ApiResponse.success(data, "Trạng thái cổng thanh toán"));
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

    private int resolvePublishedPreviewLessonCount(UUID courseId, UUID studentId) {
        return resolveEffectivePreviewLessons(courseId, studentId).stream()
                .mapToInt(lesson -> Boolean.TRUE.equals(asBooleanObject(lesson.get("isFree"))) ? 1 : 0)
                .sum();
    }

    private boolean isPublishedPreviewLessonAccessible(UUID courseId, UUID studentId, int lessonIndex) {
        if (lessonIndex < 0) {
            return false;
        }

        List<Map<String, Object>> lessons = resolveEffectivePreviewLessons(courseId, studentId);
        if (lessonIndex >= lessons.size()) {
            return false;
        }

        return Boolean.TRUE.equals(asBooleanObject(lessons.get(lessonIndex).get("isFree")));
    }

    private List<Map<String, Object>> resolveEffectivePreviewLessons(UUID courseId, UUID studentId) {
        List<Map<String, Object>> publishedContent = coursePublicationService.getPublishedContent(courseId, studentId);
        if (publishedContent != null) {
            return flattenPublishedLessons(publishedContent);
        }
        return flattenPublishedLessons(coursePublicationService.getDraftContent(courseId));
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> flattenPublishedLessons(List<Map<String, Object>> chapters) {
        if (chapters == null || chapters.isEmpty()) {
            return List.of();
        }

        List<Map<String, Object>> lessons = new ArrayList<>();
        for (Map<String, Object> chapter : chapters) {
            Object rawLessons = chapter.get("lessons");
            if (!(rawLessons instanceof List<?> lessonList)) {
                continue;
            }

            for (Object rawLesson : lessonList) {
                if (rawLesson instanceof Map<?, ?> lessonMap) {
                    lessons.add((Map<String, Object>) lessonMap);
                }
            }
        }
        return lessons;
    }

    private Boolean asBooleanObject(Object value) {
        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value == null) {
            return null;
        }
        return Boolean.parseBoolean(String.valueOf(value));
    }

    private BigDecimal resolvePrice(CourseJpaEntity course) {
        if (course.getSalePrice() != null && course.getSalePrice().compareTo(BigDecimal.ZERO) > 0) {
            return course.getSalePrice();
        }
        return course.getPrice() != null ? course.getPrice() : BigDecimal.ZERO;
    }

    private List<String> resolveAvailablePaymentMethods() {
        var paymentSettings = adminSettingsUseCase.getSettings().payment();
        boolean isProd = isProductionProfile();

        List<String> methods = new ArrayList<>();
        if (!isProd) {
            methods.add("SIMULATED");
        }
        if (paymentSettings.vnpayEnabled()) {
            methods.add("VNPAY");
        }
        if (paymentSettings.sepayEnabled() && sepayPaymentPort.isEnabled()) {
            methods.add("SEPAY");
        }
        return methods;
    }

    private String resolveDefaultPaymentMethod(List<String> methods) {
        if (methods.contains("SIMULATED")) {
            return "SIMULATED";
        }
        if (methods.contains("VNPAY")) {
            return "VNPAY";
        }
        if (methods.contains("SEPAY")) {
            return "SEPAY";
        }
        return null;
    }

    private PaymentAccessActivationSnapshot resolvePaymentAccessActivation(UUID studentId, UUID courseId) {
        var enrollmentOpt = enrollmentJpaRepository.findByStudentIdAndCourseId(studentId, courseId);
        if (enrollmentOpt.isPresent()) {
            var status = enrollmentOpt.get().getStatus();
            if (status == com.example.lms.learning_delivery.infrastructure.persistence.entity.EnrollmentJpaEntity.EnrollmentStatus.ACTIVE
                    || status == com.example.lms.learning_delivery.infrastructure.persistence.entity.EnrollmentJpaEntity.EnrollmentStatus.COMPLETED) {
                return new PaymentAccessActivationSnapshot("READY", null);
            }
        }

        var courseOpt = courseRepository.findById(courseId);
        if (courseOpt.isPresent()
                && courseOpt.get().getDeliveryMode() == CourseJpaEntity.DeliveryMode.INSTRUCTOR_LED) {
            return new PaymentAccessActivationSnapshot(
                    "MANUAL_ACTIVATION_REQUIRED",
                    "Thanh toán đã được ghi nhận. Đây là khóa học dạng lớp học, nên bạn sẽ vào học sau khi được xếp lớp hoặc kích hoạt."
            );
        }

        return new PaymentAccessActivationSnapshot(
                "ACCESS_PENDING",
                "Thanh toán đã được ghi nhận, nhưng quyền học vẫn đang được kích hoạt. Vui lòng kiểm tra lại trong ít phút tới tại lịch sử thanh toán."
        );
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

    private Page<PaymentTransactionJpaEntity> resolveAdminPaymentsPage(
            PageRequest pageable,
            String status,
            UserJpaEntity currentUser
    ) {
        if (!isOrgAdmin(currentUser)) {
            return findPaymentsByStatus(status, pageable);
        }

        List<UUID> orgTeacherIds = getOrgTeacherIds(currentUser.getOrganizationId());
        if (orgTeacherIds.isEmpty()) {
            return Page.empty(pageable);
        }

        List<UUID> courseIds = courseRepository.findCourseIdsByTeacherIdIn(orgTeacherIds);
        if (courseIds.isEmpty()) {
            return Page.empty(pageable);
        }

        return findPaymentsByCourseIds(courseIds, status, pageable);
    }

    private Page<PaymentTransactionJpaEntity> findPaymentsByStatus(String status, PageRequest pageable) {
        if (status != null && !status.isBlank()) {
            try {
                var paymentStatus = PaymentTransactionJpaEntity.PaymentStatus.valueOf(status);
                return paymentJpaRepository.findByStatus(paymentStatus, pageable);
            } catch (IllegalArgumentException ignored) {
                return paymentJpaRepository.findAll(pageable);
            }
        }
        return paymentJpaRepository.findAll(pageable);
    }

    private Page<PaymentTransactionJpaEntity> findPaymentsByCourseIds(
            List<UUID> courseIds,
            String status,
            PageRequest pageable
    ) {
        if (courseIds.isEmpty()) {
            return new PageImpl<>(List.of(), pageable, 0);
        }
        if (status != null && !status.isBlank()) {
            try {
                var paymentStatus = PaymentTransactionJpaEntity.PaymentStatus.valueOf(status);
                return paymentJpaRepository.findByCourseIdInAndStatus(courseIds, paymentStatus, pageable);
            } catch (IllegalArgumentException ignored) {
                return paymentJpaRepository.findByCourseIdIn(courseIds, pageable);
            }
        }
        return paymentJpaRepository.findByCourseIdIn(courseIds, pageable);
    }

    private void verifyPaymentAccess(UUID paymentId, UserJpaEntity currentUser) {
        if (!isOrgAdmin(currentUser)) {
            return;
        }

        PaymentTransactionJpaEntity payment = paymentJpaRepository.findById(paymentId)
                .orElseThrow(() -> new ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND,
                        "Giao dịch không tồn tại"));
        verifyCourseAccess(payment.getCourseId(), currentUser);
    }

    private void verifyCourseAccess(UUID courseId, UserJpaEntity currentUser) {
        if (!isOrgAdmin(currentUser)) {
            return;
        }

        CourseJpaEntity course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND,
                        "Khóa học không tồn tại"));
        if (course.getTeacherId() == null) {
            throw new AccessDeniedException("Không có quyền truy cập giao dịch này");
        }
        UserJpaEntity teacher = userRepository.findById(course.getTeacherId()).orElse(null);
        if (teacher == null || !Objects.equals(teacher.getOrganizationId(), currentUser.getOrganizationId())) {
            throw new AccessDeniedException("Không có quyền truy cập giao dịch của tổ chức khác");
        }
    }

    private List<UUID> getOrgTeacherIds(UUID organizationId) {
        if (organizationId == null) {
            return List.of();
        }
        return userRepository.findByOrganizationId(organizationId).stream()
                .filter(user -> user.getRole() == UserJpaEntity.UserRole.TEACHER)
                .map(UserJpaEntity::getId)
                .toList();
    }

    private boolean isOrgAdmin(UserJpaEntity currentUser) {
        return currentUser != null && currentUser.getRole() == UserJpaEntity.UserRole.ORG_ADMIN;
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

    public record SepayCreateQrRequest(
            @NotNull(message = "Mã khóa học không được để trống")
            UUID courseId
    ) {}

    private record PaymentAccessActivationSnapshot(String state, String message) {}
}
