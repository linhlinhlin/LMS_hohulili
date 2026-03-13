package com.example.lms.shared.infrastructure.persistence.mapper;

import com.example.lms.shared.domain.model.PaymentTransaction;
import com.example.lms.shared.infrastructure.persistence.entity.PaymentTransactionJpaEntity;
import org.springframework.stereotype.Component;

/**
 * Maps between PaymentTransaction domain model and PaymentTransactionJpaEntity.
 */
@Component
public class PaymentEntityMapper {

    public PaymentTransaction toDomain(PaymentTransactionJpaEntity entity) {
        return PaymentTransaction.reconstitute(
                entity.getId(),
                entity.getStudentId(),
                entity.getCourseId(),
                entity.getAmount(),
                entity.getCurrency(),
                entity.getPaymentMethod(),
                entity.getTransactionId(),
                PaymentTransaction.PaymentStatus.valueOf(entity.getStatus().name()),
                entity.getPaidAt(),
                entity.getCreatedAt(),
                entity.getVnpTransactionNo(),
                entity.getVnpBankCode(),
                entity.getVnpResponseCode(),
                entity.getVnpCardType(),
                entity.getRefundStatus(),
                entity.getRefundRequestedAt(),
                entity.getRefundCompletedAt(),
                entity.getRefundReason(),
                entity.getRefundAdminNote(),
                entity.getVersion(),
                entity.getSepayTransactionCode()
        );
    }

    public PaymentTransactionJpaEntity toEntity(PaymentTransaction domain) {
        var entity = PaymentTransactionJpaEntity.builder()
                .id(domain.getId())
                .studentId(domain.getStudentId())
                .courseId(domain.getCourseId())
                .amount(domain.getAmount())
                .currency(domain.getCurrency())
                .paymentMethod(domain.getPaymentMethod())
                .transactionId(domain.getTransactionId())
                .status(PaymentTransactionJpaEntity.PaymentStatus.valueOf(domain.getStatus().name()))
                .paidAt(domain.getPaidAt())
                .build();

        entity.setVnpTransactionNo(domain.getVnpTransactionNo());
        entity.setVnpBankCode(domain.getVnpBankCode());
        entity.setVnpResponseCode(domain.getVnpResponseCode());
        entity.setVnpCardType(domain.getVnpCardType());
        entity.setSepayTransactionCode(domain.getSepayTransactionCode());
        entity.setRefundStatus(domain.getRefundStatus());
        entity.setRefundRequestedAt(domain.getRefundRequestedAt());
        entity.setRefundCompletedAt(domain.getRefundCompletedAt());
        entity.setRefundReason(domain.getRefundReason());
        entity.setRefundAdminNote(domain.getRefundAdminNote());
        entity.setVersion(domain.getVersion());
        return entity;
    }
}
