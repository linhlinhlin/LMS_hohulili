package com.example.lms.learning_delivery.infrastructure.web;

import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.shared.infrastructure.persistence.entity.PaymentTransactionJpaEntity;
import com.example.lms.shared.infrastructure.persistence.repository.PaymentTransactionJpaRepository;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Tag(name = "Teacher - Revenue", description = "Revenue and payout management for teachers")
@RestController
@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
@RequiredArgsConstructor
public class TeacherRevenueControllerV3 {

    private final JpaCourseRepository courseRepository;
    private final PaymentTransactionJpaRepository paymentRepository;
    private final JpaEnrollmentRepository enrollmentRepository;

    @Operation(summary = "Get revenue summary for teacher")
    @GetMapping("/api/v3/teacher/revenue/summary")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRevenueSummary(
            @AuthenticationPrincipal UserJpaEntity user) {

        List<UUID> courseIds = getTeacherCourseIds(user);

        BigDecimal totalRevenue = BigDecimal.ZERO;
        BigDecimal monthlyRevenue = BigDecimal.ZERO;
        long totalStudents = 0;

        if (!courseIds.isEmpty()) {
            totalRevenue = paymentRepository.sumRevenueByCourseIds(courseIds);

            // Monthly revenue: current month
            YearMonth currentMonth = YearMonth.now();
            Instant monthStart = currentMonth.atDay(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
            Instant monthEnd = currentMonth.plusMonths(1).atDay(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
            monthlyRevenue = paymentRepository.sumRevenueByCourseIdsAndDateRange(courseIds, monthStart, monthEnd);

            totalStudents = enrollmentRepository.countDistinctStudentsByCourseIds(courseIds);
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalRevenue", totalRevenue);
        summary.put("monthlyRevenue", monthlyRevenue);
        summary.put("pendingPayout", BigDecimal.ZERO);
        summary.put("totalStudents", totalStudents);
        summary.put("totalCourses", courseIds.size());
        summary.put("currency", "VND");

        return ResponseEntity.ok(ApiResponse.success(summary, "Tổng quan doanh thu"));
    }

    @Operation(summary = "Get revenue history")
    @GetMapping("/api/v3/teacher/revenue/history")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRevenueHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            @AuthenticationPrincipal UserJpaEntity user) {

        List<UUID> courseIds = getTeacherCourseIds(user);

        Map<String, Object> result = new LinkedHashMap<>();

        if (courseIds.isEmpty()) {
            result.put("content", List.of());
            result.put("totalElements", 0);
            result.put("totalPages", 0);
            result.put("pageNumber", page);
            result.put("pageSize", size);
            return ResponseEntity.ok(ApiResponse.success(result, "Lịch sử doanh thu"));
        }

        Page<PaymentTransactionJpaEntity> payments;
        PageRequest pageRequest = PageRequest.of(page, size);

        if (status != null && !status.isBlank()) {
            PaymentTransactionJpaEntity.PaymentStatus paymentStatus =
                    PaymentTransactionJpaEntity.PaymentStatus.valueOf(status.toUpperCase());
            payments = paymentRepository.findByCourseIdInAndStatus(courseIds, paymentStatus, pageRequest);
        } else {
            payments = paymentRepository.findByCourseIdIn(courseIds, pageRequest);
        }

        // Map course IDs to titles for display
        Map<UUID, String> courseTitles = courseRepository.findByTeacherId(user.getId()).stream()
                .collect(Collectors.toMap(CourseJpaEntity::getId, CourseJpaEntity::getTitle));

        List<Map<String, Object>> content = payments.getContent().stream()
                .map(p -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", p.getId());
                    item.put("courseId", p.getCourseId());
                    item.put("courseTitle", courseTitles.getOrDefault(p.getCourseId(), "Khóa học"));
                    item.put("studentId", p.getStudentId());
                    item.put("amount", p.getAmount());
                    item.put("currency", p.getCurrency());
                    item.put("status", p.getStatus().name());
                    item.put("paymentMethod", p.getPaymentMethod());
                    item.put("transactionId", p.getTransactionId());
                    item.put("paidAt", p.getPaidAt());
                    item.put("createdAt", p.getCreatedAt());
                    return item;
                })
                .toList();

        result.put("content", content);
        result.put("totalElements", payments.getTotalElements());
        result.put("totalPages", payments.getTotalPages());
        result.put("pageNumber", payments.getNumber());
        result.put("pageSize", payments.getSize());

        return ResponseEntity.ok(ApiResponse.success(result, "Lịch sử doanh thu"));
    }

    @Operation(summary = "Get payout balance")
    @GetMapping("/api/v3/teacher/payout/balance")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPayoutBalance(
            @AuthenticationPrincipal UserJpaEntity user) {

        List<UUID> courseIds = getTeacherCourseIds(user);
        BigDecimal available = courseIds.isEmpty() ? BigDecimal.ZERO : paymentRepository.sumRevenueByCourseIds(courseIds);

        Map<String, Object> balance = new LinkedHashMap<>();
        balance.put("available", available);
        balance.put("pending", BigDecimal.ZERO);
        balance.put("currency", "VND");
        balance.put("minimumPayout", 100000);

        return ResponseEntity.ok(ApiResponse.success(balance, "Số dư khả dụng"));
    }

    @Operation(summary = "Request a payout")
    @PostMapping("/api/v3/teacher/payout/request")
    public ResponseEntity<ApiResponse<Map<String, Object>>> requestPayout(
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal UserJpaEntity user) {

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "NOT_AVAILABLE");
        result.put("message", "Chức năng rút tiền đang được phát triển. Vui lòng liên hệ quản trị viên.");

        return ResponseEntity.ok(ApiResponse.success(result, "Chức năng rút tiền chưa khả dụng"));
    }

    @Operation(summary = "Get payout history")
    @GetMapping("/api/v3/teacher/payout/history")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPayoutHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            @AuthenticationPrincipal UserJpaEntity user) {

        // Payout system not yet implemented — return empty but honest
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content", List.of());
        result.put("totalElements", 0);
        result.put("totalPages", 0);
        result.put("pageNumber", page);
        result.put("pageSize", size);

        return ResponseEntity.ok(ApiResponse.success(result, "Chưa có lịch sử rút tiền"));
    }

    private List<UUID> getTeacherCourseIds(UserJpaEntity user) {
        return courseRepository.findByTeacherId(user.getId()).stream()
                .map(CourseJpaEntity::getId)
                .toList();
    }
}
