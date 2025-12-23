package com.example.lms.repository;

import com.example.lms.entity.Payment;
import com.example.lms.entity.Payment.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository cho Payment entity
 */
@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    /**
     * Tìm payment theo student và course
     */
    Optional<Payment> findByStudentIdAndCourseId(UUID studentId, UUID courseId);

    /**
     * Kiểm tra xem student đã thanh toán course chưa (status = COMPLETED)
     */
    @Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END " +
           "FROM Payment p WHERE p.student.id = :studentId AND p.course.id = :courseId AND p.status = :status")
    boolean existsByStudentIdAndCourseIdAndStatus(
            @Param("studentId") UUID studentId, 
            @Param("courseId") UUID courseId,
            @Param("status") PaymentStatus status);

    /**
     * Shortcut: Kiểm tra student đã thanh toán thành công course chưa
     */
    default boolean hasValidPayment(UUID studentId, UUID courseId) {
        return existsByStudentIdAndCourseIdAndStatus(studentId, courseId, PaymentStatus.COMPLETED);
    }

    /**
     * Lấy tất cả payments của 1 student
     */
    List<Payment> findByStudentIdOrderByCreatedAtDesc(UUID studentId);

    /**
     * Lấy tất cả payments của 1 course
     */
    List<Payment> findByCourseIdOrderByCreatedAtDesc(UUID courseId);

    /**
     * Lấy payments theo status
     */
    List<Payment> findByStatus(PaymentStatus status);

    /**
     * Đếm số thanh toán thành công của 1 course
     */
    @Query("SELECT COUNT(p) FROM Payment p WHERE p.course.id = :courseId AND p.status = 'COMPLETED'")
    long countCompletedPaymentsByCourse(@Param("courseId") UUID courseId);

    /**
     * Tổng doanh thu của 1 course
     */
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.course.id = :courseId AND p.status = 'COMPLETED'")
    java.math.BigDecimal getTotalRevenueByCourse(@Param("courseId") UUID courseId);
}
