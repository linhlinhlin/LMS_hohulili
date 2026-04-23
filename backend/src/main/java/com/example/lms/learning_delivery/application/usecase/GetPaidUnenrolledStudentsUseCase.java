package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.learning_delivery.application.dto.PaidUnenrolledStudentResponse;
import com.example.lms.learning_delivery.domain.repository.EnrollmentRepository;
import com.example.lms.shared.domain.model.PaymentTransaction;
import com.example.lms.shared.domain.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Use case for retrieving students who have paid for a course but are not enrolled in any class.
 *
 * Option B (Canvas pattern): Teacher assigns students to classes after payment.
 *
 * Single Responsibility:
 * - Find paid students who haven't been assigned to a class yet
 * - Combine data from payment, enrollment, and user domains
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GetPaidUnenrolledStudentsUseCase {

    private final PaymentRepository paymentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final UserJpaRepository userJpaRepository;

    /**
     * Get list of students who paid for the course but aren't enrolled in any class.
     *
     * @param courseId the course ID
     * @return list of paid unenrolled students, sorted by payment date (newest first)
     */
    @Transactional(readOnly = true)
    public List<PaidUnenrolledStudentResponse> execute(UUID courseId) {
        log.debug("Finding paid unenrolled students for course: {}", courseId);

        // Get all completed payments for this course
        List<PaymentTransaction> completedPayments = paymentRepository.findCompletedByCourseIds(List.of(courseId));

        if (completedPayments.isEmpty()) {
            log.debug("No completed payments found for course: {}", courseId);
            return List.of();
        }

        // Get unique student IDs who have paid
        Set<UUID> paidStudentIds = completedPayments.stream()
                .map(PaymentTransaction::getStudentId)
                .collect(Collectors.toSet());

        // Get all enrollments for this course (across all classes)
        List<UUID> enrolledStudentIds = enrollmentRepository.findByCourseIds(List.of(courseId)).stream()
                .map(Enrollment -> Enrollment.getStudentId())
                .collect(Collectors.toList());

        // Filter out already enrolled students
        Set<UUID> unenrolledPaidIds = paidStudentIds.stream()
                .filter(id -> !enrolledStudentIds.contains(id))
                .collect(Collectors.toSet());

        if (unenrolledPaidIds.isEmpty()) {
            log.debug("All paid students are already enrolled in course: {}", courseId);
            return List.of();
        }

        // Get user details for unenrolled students
        List<UserJpaEntity> users = userJpaRepository.findAllById(unenrolledPaidIds);
        Map<UUID, UserJpaEntity> usersMap = users.stream()
                .collect(Collectors.toMap(UserJpaEntity::getId, u -> u));

        // Get latest payment for each student (keep newest if multiple payments)
        Map<UUID, PaymentTransaction> latestPayments = new HashMap<>();
        for (PaymentTransaction payment : completedPayments) {
            UUID studentId = payment.getStudentId();
            if (!unenrolledPaidIds.contains(studentId)) {
                continue;
            }
            latestPayments.merge(studentId, payment, (existing, newer) ->
                    newer.getCreatedAt().isAfter(existing.getCreatedAt()) ? newer : existing);
        }

        // Build response list, sorted by payment date (newest first)
        return unenrolledPaidIds.stream()
                .filter(usersMap::containsKey)
                .map(studentId -> {
                    UserJpaEntity user = usersMap.get(studentId);
                    PaymentTransaction payment = latestPayments.get(studentId);
                    return PaidUnenrolledStudentResponse.from(
                            studentId,
                            user.getFullName(),
                            user.getEmail(),
                            payment
                    );
                })
                .sorted((a, b) -> {
                    Instant aPaid = a.paidAt();
                    Instant bPaid = b.paidAt();
                    if (aPaid == null && bPaid == null) return 0;
                    if (aPaid == null) return 1;
                    if (bPaid == null) return -1;
                    return bPaid.compareTo(aPaid);
                })
                .collect(Collectors.toList());
    }
}
