package com.example.lms.service;

import com.example.lms.entity.Course;
import com.example.lms.entity.Payment;
import com.example.lms.entity.Payment.PaymentStatus;
import com.example.lms.entity.TeacherRevenue.SaleType;
import com.example.lms.entity.User;
import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.payment.gateway.PaymentGateway;
import com.example.lms.payment.gateway.PaymentGatewayFactory;
import com.example.lms.payment.gateway.dto.*;
import com.example.lms.repository.EnrollmentRepository;
import com.example.lms.repository.CourseRepository;
import com.example.lms.repository.PaymentRepository;
import com.example.lms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Service xử lý nghiệp vụ thanh toán khóa học
 * 
 * SOTA Design (Dec 2025):
 * - Support multiple payment gateways (VNPay, ZaloPay, MoMo, Simulated)
 * - Gateway Abstraction Layer for future-proof architecture
 * - Callback handling for async payment confirmation
 * - Automatic enrollment.isPaid update
 * - Teacher revenue tracking
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final TeacherRevenueService teacherRevenueService;
    private final PaymentGatewayFactory gatewayFactory;

    // Số bài học miễn phí cho user chưa thanh toán
    public static final int FREE_LESSONS_COUNT = 2;

    /**
     * Xử lý thanh toán (giả lập - luôn thành công)
     */
    @Transactional
    public Payment processPayment(UUID studentId, UUID courseId, BigDecimal amount, String paymentMethod) {
        log.info("Processing payment: studentId={}, courseId={}, amount={}", studentId, courseId, amount);

        // Kiểm tra student tồn tại
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student không tồn tại: " + studentId));

        // Kiểm tra course tồn tại
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new RuntimeException("Khóa học không tồn tại: " + courseId));

        // Kiểm tra đã thanh toán chưa
        Optional<Payment> existingPayment = paymentRepository.findByStudentIdAndCourseId(studentId, courseId);
        if (existingPayment.isPresent() && existingPayment.get().isValid()) {
            log.warn("Student {} already paid for course {}", studentId, courseId);
            throw new RuntimeException("Bạn đã thanh toán khóa học này rồi");
        }

        // Tạo payment mới hoặc update existing
        Payment payment;
        if (existingPayment.isPresent()) {
            payment = existingPayment.get();
            payment.setAmount(amount);
            payment.setPaymentMethod(paymentMethod);
        } else {
            payment = Payment.builder()
                    .student(student)
                    .course(course)
                    .amount(amount)
                    .paymentMethod(paymentMethod != null ? paymentMethod : "SIMULATED")
                    .status(PaymentStatus.PENDING)
                    .build();
        }

        // Giả lập thanh toán thành công
        payment.complete();
        payment.setTransactionId("TXN_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());

        Payment savedPayment = paymentRepository.save(payment);
        log.info("Payment completed successfully: paymentId={}, transactionId={}", 
                savedPayment.getId(), savedPayment.getTransactionId());

        // Record teacher revenue (default to ORGANIC sale type)
        try {
            teacherRevenueService.recordRevenue(savedPayment, SaleType.ORGANIC);
            log.info("Teacher revenue recorded for payment: {}", savedPayment.getId());
        } catch (Exception e) {
            log.error("Failed to record teacher revenue: {}", e.getMessage());
            // Don't fail the payment if revenue recording fails
        }

        // Update enrollment isPaid status
        updateEnrollmentPaymentStatus(studentId, courseId, savedPayment.getId());

        return savedPayment;
    }

    /**
     * Update enrollment payment status after successful payment
     */
    private void updateEnrollmentPaymentStatus(UUID studentId, UUID courseId, UUID paymentId) {
        try {
            // Find enrollments for this student in classes of this course
            List<Enrollment> enrollments = enrollmentRepository.findByStudentIdAndCourseId(studentId, courseId);
            if (!enrollments.isEmpty()) {
                for (Enrollment enrollment : enrollments) {
                    enrollment.setIsPaid(true);
                    enrollment.setPaidAt(Instant.now());
                    enrollment.setPaymentId(paymentId);
                    enrollmentRepository.save(enrollment);
                    log.info("Enrollment {} marked as paid", enrollment.getId());
                }
            } else {
                log.warn("No enrollment found for student {} and course {}", studentId, courseId);
            }
        } catch (Exception e) {
            log.error("Failed to update enrollment payment status: {}", e.getMessage());
            // Don't fail the payment if enrollment update fails
        }
    }

    // =====================================================
    // GATEWAY ABSTRACTION LAYER METHODS (SOTA Dec 2025)
    // =====================================================

    /**
     * Initiate payment using the Gateway Abstraction Layer
     * Supports both instant-complete (Simulated) and redirect-based (VNPay) flows
     * 
     * @param studentId Student ID
     * @param courseId Course ID
     * @param gatewayCode Gateway code (SIMULATED, VNPAY, MOMO, etc.)
     * @param ipAddress Customer IP address
     * @param returnUrl Frontend URL to redirect after payment
     * @return PaymentInitResult containing either completed payment or redirect URL
     */
    @Transactional
    public PaymentInitResult initiatePaymentWithGateway(
            UUID studentId, 
            UUID courseId, 
            String gatewayCode, 
            String ipAddress,
            String returnUrl) {
        
        log.info("Initiating payment: studentId={}, courseId={}, gateway={}", 
                studentId, courseId, gatewayCode);

        // Get student and course
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student không tồn tại: " + studentId));
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new RuntimeException("Khóa học không tồn tại: " + courseId));

        // Check existing payment
        Optional<Payment> existingPayment = paymentRepository.findByStudentIdAndCourseId(studentId, courseId);
        if (existingPayment.isPresent() && existingPayment.get().isValid()) {
            log.warn("Student {} already paid for course {}", studentId, courseId);
            return PaymentInitResult.alreadyPaid(existingPayment.get());
        }

        // Get gateway
        PaymentGateway gateway = gatewayFactory.getGateway(gatewayCode);

        // Calculate price
        BigDecimal amount = calculateCoursePrice(course);

        // Create or update payment record
        Payment payment = existingPayment.orElseGet(() -> Payment.builder()
                .student(student)
                .course(course)
                .build());
        
        payment.setAmount(amount);
        payment.setPaymentMethod(gatewayCode);
        payment.setStatus(PaymentStatus.PENDING);
        payment.setIpAddress(ipAddress);
        payment.setExpiresAt(Instant.now().plusSeconds(gateway.getPaymentTimeoutSeconds()));
        
        payment = paymentRepository.save(payment);

        // Build payment request
        PaymentRequest request = PaymentRequest.builder()
                .orderId(payment.getId().toString())
                .amount(amount)
                .orderInfo("Thanh toan khoa hoc: " + course.getTitle())
                .orderType("course_purchase")
                .ipAddress(ipAddress)
                .returnUrl(returnUrl)
                .customerEmail(student.getEmail())
                .customerName(student.getFullName())
                .studentId(studentId)
                .courseId(courseId)
                .build();

        // Create payment URL
        PaymentUrlResult result = gateway.createPaymentUrl(request);

        if (!result.isSuccess()) {
            payment.setStatus(PaymentStatus.FAILED);
            payment.setStatusReason(result.getErrorMessage());
            paymentRepository.save(payment);
            return PaymentInitResult.failed(result.getErrorMessage());
        }

        // Handle instant-complete (Simulated gateway)
        if (result.isInstantComplete()) {
            payment.setStatus(PaymentStatus.COMPLETED);
            payment.setTransactionId(result.getTransactionId());
            payment.setPaidAt(Instant.now());
            paymentRepository.save(payment);

            // Update enrollment and record revenue
            completePaymentPostProcessing(payment);

            return PaymentInitResult.completed(payment);
        }

        // Handle redirect-based flow (VNPay, MoMo, etc.)
        payment.setGatewayOrderId(result.getGatewayOrderId());
        if (result.getExpiresAt() != null) {
            payment.setExpiresAt(result.getExpiresAt());
        }
        paymentRepository.save(payment);

        return PaymentInitResult.redirect(payment, result.getPaymentUrl());
    }

    /**
     * Process callback from payment gateway
     * Called by PaymentCallbackController after verifying callback signature
     * 
     * @param gatewayCode Gateway code
     * @param callbackResult Verified callback result from gateway
     * @return true if payment was successfully processed, false if already processed or not found
     */
    @Transactional
    public boolean processGatewayCallback(String gatewayCode, PaymentCallbackResult callbackResult) {
        log.info("Processing gateway callback: gateway={}, orderId={}, transactionId={}", 
                gatewayCode, callbackResult.getOrderId(), callbackResult.getTransactionId());

        // Find payment by order ID
        UUID paymentId;
        try {
            paymentId = UUID.fromString(callbackResult.getOrderId());
        } catch (Exception e) {
            log.error("Invalid order ID in callback: {}", callbackResult.getOrderId());
            return false;
        }

        Optional<Payment> optPayment = paymentRepository.findById(paymentId);
        if (optPayment.isEmpty()) {
            log.error("Payment not found for callback: {}", paymentId);
            return false;
        }

        Payment payment = optPayment.get();

        // Check if already processed
        if (payment.getStatus() == PaymentStatus.COMPLETED) {
            log.info("Payment already completed: {}", paymentId);
            return false; // Already processed
        }

        // Verify amount matches
        if (callbackResult.getAmount() != null && 
            payment.getAmount().compareTo(callbackResult.getAmount()) != 0) {
            log.error("Amount mismatch: expected={}, received={}", 
                    payment.getAmount(), callbackResult.getAmount());
            payment.setStatus(PaymentStatus.FAILED);
            payment.setStatusReason("Amount mismatch");
            paymentRepository.save(payment);
            return false;
        }

        // Update payment status based on callback result
        if (callbackResult.isSuccess()) {
            payment.setStatus(PaymentStatus.COMPLETED);
            payment.setTransactionId(callbackResult.getTransactionId());
            payment.setPaidAt(callbackResult.getPaymentTime() != null ? 
                    callbackResult.getPaymentTime() : Instant.now());
            payment.setGatewayTransactionId(callbackResult.getTransactionId());
            paymentRepository.save(payment);

            completePaymentPostProcessing(payment);
            return true;
        } else {
            // Map callback status to payment status
            PaymentStatus newStatus = switch (callbackResult.getStatusCode()) {
                case CANCELLED -> PaymentStatus.CANCELLED;
                case EXPIRED -> PaymentStatus.EXPIRED;
                default -> PaymentStatus.FAILED;
            };
            payment.setStatus(newStatus);
            payment.setStatusReason(callbackResult.getMessage());
            paymentRepository.save(payment);
            return false;
        }
    }

    /**
     * Common post-processing after successful payment
     */
    private void completePaymentPostProcessing(Payment payment) {
        // Record teacher revenue
        try {
            teacherRevenueService.recordRevenue(payment, SaleType.ORGANIC);
            log.info("Teacher revenue recorded for payment: {}", payment.getId());
        } catch (Exception e) {
            log.error("Failed to record teacher revenue: {}", e.getMessage());
        }

        // Update enrollment
        updateEnrollmentPaymentStatus(
                payment.getStudent().getId(),
                payment.getCourse().getId(),
                payment.getId()
        );
    }

    /**
     * Calculate course price (use sale price if available)
     */
    private BigDecimal calculateCoursePrice(Course course) {
        if (course.getSalePrice() != null && course.getSalePrice().compareTo(BigDecimal.ZERO) > 0) {
            return course.getSalePrice();
        }
        return course.getPrice() != null ? course.getPrice() : BigDecimal.ZERO;
    }

    /**
     * Get available payment gateways
     */
    public List<PaymentGatewayFactory.GatewayInfo> getAvailableGateways() {
        return gatewayFactory.getAllGatewayInfo();
    }

    // =====================================================
    // Payment Initiation Result DTO
    // =====================================================

    public record PaymentInitResult(
            boolean success,
            boolean completed,
            boolean alreadyPaid,
            String redirectUrl,
            String errorMessage,
            Payment payment
    ) {
        public static PaymentInitResult completed(Payment payment) {
            return new PaymentInitResult(true, true, false, null, null, payment);
        }

        public static PaymentInitResult redirect(Payment payment, String redirectUrl) {
            return new PaymentInitResult(true, false, false, redirectUrl, null, payment);
        }

        public static PaymentInitResult failed(String errorMessage) {
            return new PaymentInitResult(false, false, false, null, errorMessage, null);
        }

        public static PaymentInitResult alreadyPaid(Payment payment) {
            return new PaymentInitResult(true, true, true, null, null, payment);
        }
    }

    /**
     * Kiểm tra student đã thanh toán course chưa
     */
    @Transactional(readOnly = true)
    public boolean hasValidPayment(UUID studentId, UUID courseId) {
        return paymentRepository.hasValidPayment(studentId, courseId);
    }

    /**
     * Lấy thông tin payment của student cho course
     */
    @Transactional(readOnly = true)
    public Optional<Payment> getPayment(UUID studentId, UUID courseId) {
        return paymentRepository.findByStudentIdAndCourseId(studentId, courseId);
    }

    /**
     * Lấy danh sách payments của student
     */
    @Transactional(readOnly = true)
    public List<Payment> getStudentPayments(UUID studentId) {
        return paymentRepository.findByStudentIdOrderByCreatedAtDesc(studentId);
    }

    /**
     * Xác định số bài học được truy cập
     * - Chưa thanh toán: 2 bài đầu
     * - Đã thanh toán: tất cả
     */
    @Transactional(readOnly = true)
    public int getAccessibleLessonsCount(UUID studentId, UUID courseId, int totalLessons) {
        if (hasValidPayment(studentId, courseId)) {
            return totalLessons; // Full access
        }
        return Math.min(FREE_LESSONS_COUNT, totalLessons);
    }

    /**
     * Kiểm tra một lesson có được truy cập không
     * @param lessonIndex index của lesson (0-based)
     */
    @Transactional(readOnly = true)
    public boolean canAccessLesson(UUID studentId, UUID courseId, int lessonIndex) {
        if (hasValidPayment(studentId, courseId)) {
            return true; // Full access
        }
        return lessonIndex < FREE_LESSONS_COUNT; // Chỉ 2 bài đầu
    }

    /**
     * Lấy thống kê thanh toán của course (cho teacher/admin)
     */
    @Transactional(readOnly = true)
    public CoursePaymentStats getCoursePaymentStats(UUID courseId) {
        long totalPayments = paymentRepository.countCompletedPaymentsByCourse(courseId);
        BigDecimal totalRevenue = paymentRepository.getTotalRevenueByCourse(courseId);
        
        return new CoursePaymentStats(courseId, totalPayments, totalRevenue);
    }

    // ============ DTOs ============

    public record CoursePaymentStats(
            UUID courseId,
            long totalPayments,
            BigDecimal totalRevenue
    ) {}

    public record PaymentResponse(
            UUID id,
            UUID courseId,
            String courseTitle,
            BigDecimal amount,
            String status,
            String transactionId,
            String paidAt,
            String createdAt
    ) {
        public static PaymentResponse from(Payment payment) {
            return new PaymentResponse(
                    payment.getId(),
                    payment.getCourse().getId(),
                    payment.getCourse().getTitle(),
                    payment.getAmount(),
                    payment.getStatus().name(),
                    payment.getTransactionId(),
                    payment.getPaidAt() != null ? payment.getPaidAt().toString() : null,
                    payment.getCreatedAt() != null ? payment.getCreatedAt().toString() : null
            );
        }
    }

    public record CheckoutRequest(
            UUID courseId,
            BigDecimal amount,
            String paymentMethod
    ) {}

    public record PaymentStatusResponse(
            UUID courseId,
            boolean hasPaid,
            String status,
            Integer freeLessonsCount,
            String transactionId,
            String paidAt
    ) {
        public static PaymentStatusResponse from(UUID courseId, Payment payment) {
            if (payment == null) {
                return new PaymentStatusResponse(
                        courseId,
                        false,
                        null,
                        FREE_LESSONS_COUNT,
                        null,
                        null
                );
            }
            return new PaymentStatusResponse(
                    courseId,
                    payment.isValid(),
                    payment.getStatus().name(),
                    payment.isValid() ? null : FREE_LESSONS_COUNT,
                    payment.getTransactionId(),
                    payment.getPaidAt() != null ? payment.getPaidAt().toString() : null
            );
        }
    }
}
