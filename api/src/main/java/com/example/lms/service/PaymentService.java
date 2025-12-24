package com.example.lms.service;

import com.example.lms.entity.Course;
import com.example.lms.entity.Payment;
import com.example.lms.entity.Payment.PaymentStatus;
import com.example.lms.entity.TeacherRevenue.SaleType;
import com.example.lms.entity.User;
import com.example.lms.repository.CourseRepository;
import com.example.lms.repository.PaymentRepository;
import com.example.lms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Service xử lý nghiệp vụ thanh toán khóa học
 * 
 * Logic:
 * - Giả lập thanh toán (không tích hợp payment gateway thực)
 * - Kiểm tra student đã thanh toán course chưa
 * - Xác định số bài học được mở (2 bài miễn phí, full nếu đã thanh toán)
 * - Tự động ghi nhận doanh thu cho teacher khi thanh toán thành công
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final TeacherRevenueService teacherRevenueService;

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

        return savedPayment;
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
