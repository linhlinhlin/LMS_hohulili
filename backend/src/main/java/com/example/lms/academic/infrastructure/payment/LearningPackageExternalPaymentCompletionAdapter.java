package com.example.lms.academic.infrastructure.payment;

import com.example.lms.academic.application.usecase.ManageLearningPackageEnrollmentUseCase;
import com.example.lms.shared.application.port.ExternalPaymentCompletionPort;
import com.example.lms.shared.exception.DomainException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class LearningPackageExternalPaymentCompletionAdapter implements ExternalPaymentCompletionPort {
    private final ManageLearningPackageEnrollmentUseCase useCase;

    @Override
    public Optional<Result> tryComplete(
            UUID referenceId,
            BigDecimal transferredAmount,
            String gatewayTransactionCode) {
        try {
            return useCase.completeExternalPayment(referenceId, transferredAmount, gatewayTransactionCode)
                    .map(enrollment -> Result.success("Learning package payment confirmed"));
        } catch (DomainException e) {
            return Optional.of(Result.failure(e.getMessage()));
        }
    }
}
