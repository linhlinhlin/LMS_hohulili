package com.example.lms.shared.infrastructure.web;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.infrastructure.persistence.entity.PaymentTransactionJpaEntity;
import com.example.lms.shared.infrastructure.persistence.repository.PaymentTransactionJpaRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
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
@Tag(name = "Payments V3", description = "Course payment operations (simulated)")
@RestController
@RequestMapping("/api/v3/payments")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
public class PaymentControllerV3 {

    private final PaymentTransactionJpaRepository paymentRepository;

    @Operation(summary = "Checkout - simulate course payment")
    @PostMapping("/checkout")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkout(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @Valid @RequestBody CheckoutRequest request
    ) {
        if (currentUser == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized"));
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
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized"));
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
                "Payment status loaded"
            ));
        }

        return ResponseEntity.ok(ApiResponse.success(
            Map.of(
                "courseId", courseId,
                "hasPaid", false,
                "status", "UNPAID",
                "freeLessonsCount", 2
            ),
            "Course not yet purchased"
        ));
    }

    @Operation(summary = "Get payment history")
    @GetMapping("/my-payments")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getMyPayments(
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized"));
        }

        var payments = paymentRepository.findByStudentIdOrderByCreatedAtDesc(currentUser.getId());
        List<Map<String, Object>> result = payments.stream().map(this::toPaymentMap).toList();
        return ResponseEntity.ok(ApiResponse.success(result, "Payment history loaded"));
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
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized"));
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
                "message", canAccess ? "Access granted" : "Payment required for this lesson"
            ),
            canAccess ? "Access granted" : "Payment required"
        ));
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
        @NotBlank(message = "Course ID is required")
        String courseId,
        Double amount,
        String paymentMethod
    ) {}
}
