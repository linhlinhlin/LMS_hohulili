package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.entity.Payment;
import com.example.lms.entity.User;
import com.example.lms.service.PaymentService;
import com.example.lms.service.PaymentService.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Controller xử lý thanh toán khóa học
 */
@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Payments", description = "APIs thanh toán khóa học")
public class PaymentController {

    private final PaymentService paymentService;

    /**
     * Thanh toán khóa học (giả lập)
     */
    @PostMapping("/checkout")
    @Operation(summary = "Thanh toán khóa học", description = "Xử lý thanh toán (giả lập, luôn thành công)")
    public ResponseEntity<ApiResponse<PaymentResponse>> checkout(
            @AuthenticationPrincipal User currentUser,
            @RequestBody CheckoutRequest request
    ) {
        log.info("Checkout request: userId={}, courseId={}, amount={}", 
                currentUser.getId(), request.courseId(), request.amount());

        try {
            Payment payment = paymentService.processPayment(
                    currentUser.getId(),
                    request.courseId(),
                    request.amount(),
                    request.paymentMethod()
            );

            PaymentResponse response = PaymentResponse.from(payment);
            
            return ResponseEntity.ok(ApiResponse.success(
                    response,
                    "Thanh toán thành công! Bạn có thể truy cập đầy đủ khóa học."
            ));
        } catch (RuntimeException e) {
            log.error("Checkout failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Kiểm tra trạng thái thanh toán của course
     */
    @GetMapping("/status/{courseId}")
    @Operation(summary = "Kiểm tra trạng thái thanh toán", description = "Xem student đã thanh toán course chưa")
    public ResponseEntity<ApiResponse<PaymentStatusResponse>> getPaymentStatus(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID courseId
    ) {
        log.info("Get payment status: userId={}, courseId={}", currentUser.getId(), courseId);

        Optional<Payment> payment = paymentService.getPayment(currentUser.getId(), courseId);
        PaymentStatusResponse response = PaymentStatusResponse.from(courseId, payment.orElse(null));

        return ResponseEntity.ok(ApiResponse.success(response, "Trạng thái thanh toán"));
    }

    /**
     * Lấy danh sách thanh toán của student
     */
    @GetMapping("/my-payments")
    @Operation(summary = "Lịch sử thanh toán", description = "Lấy danh sách các khóa học đã thanh toán")
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> getMyPayments(
            @AuthenticationPrincipal User currentUser
    ) {
        log.info("Get my payments: userId={}", currentUser.getId());

        List<Payment> payments = paymentService.getStudentPayments(currentUser.getId());
        List<PaymentResponse> responses = payments.stream()
                .map(PaymentResponse::from)
                .toList();

        return ResponseEntity.ok(ApiResponse.success(
                responses,
                "Lịch sử thanh toán"
        ));
    }

    /**
     * Kiểm tra quyền truy cập lesson
     */
    @GetMapping("/can-access/{courseId}/lesson/{lessonIndex}")
    @Operation(summary = "Kiểm tra quyền truy cập bài học", description = "Xem student có quyền xem bài học không")
    public ResponseEntity<ApiResponse<LessonAccessResponse>> canAccessLesson(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID courseId,
            @PathVariable int lessonIndex
    ) {
        boolean canAccess = paymentService.canAccessLesson(currentUser.getId(), courseId, lessonIndex);
        boolean hasPaid = paymentService.hasValidPayment(currentUser.getId(), courseId);

        LessonAccessResponse response = new LessonAccessResponse(
                courseId,
                lessonIndex,
                canAccess,
                hasPaid,
                canAccess ? null : "Bạn cần thanh toán để truy cập bài học này"
        );

        return ResponseEntity.ok(ApiResponse.success(response, "Quyền truy cập bài học"));
    }

    // ============ DTOs ============

    public record LessonAccessResponse(
            UUID courseId,
            int lessonIndex,
            boolean canAccess,
            boolean hasPaid,
            String message
    ) {}
}
