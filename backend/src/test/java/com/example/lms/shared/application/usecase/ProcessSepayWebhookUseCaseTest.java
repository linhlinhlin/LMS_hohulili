package com.example.lms.shared.application.usecase;

import com.example.lms.shared.application.port.ExternalPaymentCompletionPort;
import com.example.lms.shared.application.port.SepayPaymentPort;
import com.example.lms.shared.domain.event.DomainEvent;
import com.example.lms.shared.domain.event.DomainEventPublisher;
import com.example.lms.shared.domain.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ProcessSepayWebhookUseCase Tests")
class ProcessSepayWebhookUseCaseTest {
    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private SepayPaymentPort sepayPayment;

    @Mock
    private DomainEventPublisher eventPublisher;

    @Mock
    private ExternalPaymentCompletionPort externalPaymentCompletionPort;

    private ProcessSepayWebhookUseCase useCase;

    @BeforeEach
    void setUp() {
        useCase = new ProcessSepayWebhookUseCase(
                paymentRepository,
                sepayPayment,
                eventPublisher,
                List.of(externalPaymentCompletionPort));
    }

    @Test
    @DisplayName("execute: delegates unknown payment UUID to external completion ports")
    void execute_delegatesUnknownPaymentUuidToExternalCompletionPorts() {
        UUID referenceId = UUID.randomUUID();
        BigDecimal amount = new BigDecimal("1200000");
        Map<String, Object> payload = Map.of("content", "LMS" + referenceId);

        when(sepayPayment.verifyWebhook("Apikey ok")).thenReturn(true);
        when(sepayPayment.extractTransactionId(payload)).thenReturn(referenceId);
        when(sepayPayment.extractTransferAmount(payload)).thenReturn(amount);
        when(sepayPayment.extractTransactionCode(payload)).thenReturn("SEPAY-VMU-003");
        when(paymentRepository.findById(referenceId)).thenReturn(Optional.empty());
        when(externalPaymentCompletionPort.tryComplete(referenceId, amount, "SEPAY-VMU-003"))
                .thenReturn(Optional.of(ExternalPaymentCompletionPort.Result.success(
                        "Learning package payment confirmed")));

        var result = useCase.execute(payload, "Apikey ok");

        assertThat(result.success()).isTrue();
        assertThat(result.message()).isEqualTo("Learning package payment confirmed");
        assertThat(result.payment()).isNull();
        verify(eventPublisher, never()).publish(org.mockito.ArgumentMatchers.any(DomainEvent.class));
    }

    @Test
    @DisplayName("execute: returns invalid when no payment target accepts UUID")
    void execute_returnsInvalidWhenNoPaymentTargetAcceptsUuid() {
        UUID referenceId = UUID.randomUUID();
        Map<String, Object> payload = Map.of("content", "LMS" + referenceId);

        when(sepayPayment.verifyWebhook("Apikey ok")).thenReturn(true);
        when(sepayPayment.extractTransactionId(payload)).thenReturn(referenceId);
        when(paymentRepository.findById(referenceId)).thenReturn(Optional.empty());
        when(externalPaymentCompletionPort.tryComplete(referenceId, null, null)).thenReturn(Optional.empty());

        var result = useCase.execute(payload, "Apikey ok");

        assertThat(result.success()).isFalse();
        assertThat(result.message()).contains(referenceId.toString());
    }

    @Test
    @DisplayName("execute: returns invalid when external target rejects completion")
    void execute_returnsInvalidWhenExternalTargetRejectsCompletion() {
        UUID referenceId = UUID.randomUUID();
        BigDecimal amount = new BigDecimal("1100000");
        Map<String, Object> payload = Map.of("content", "LMS" + referenceId);

        when(sepayPayment.verifyWebhook("Apikey ok")).thenReturn(true);
        when(sepayPayment.extractTransactionId(payload)).thenReturn(referenceId);
        when(sepayPayment.extractTransferAmount(payload)).thenReturn(amount);
        when(paymentRepository.findById(referenceId)).thenReturn(Optional.empty());
        when(externalPaymentCompletionPort.tryComplete(referenceId, amount, null))
                .thenReturn(Optional.of(ExternalPaymentCompletionPort.Result.failure("Số tiền chuyển khoản không khớp")));

        var result = useCase.execute(payload, "Apikey ok");

        assertThat(result.success()).isFalse();
        assertThat(result.message()).contains("không khớp");
    }
}
