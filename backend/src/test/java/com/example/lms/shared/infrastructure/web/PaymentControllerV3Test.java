package com.example.lms.shared.infrastructure.web;

import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.learning_delivery.application.usecase.SelfEnrollUseCase;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.shared.application.port.EmailServicePort;
import com.example.lms.shared.application.usecase.CheckoutUseCase;
import com.example.lms.shared.application.usecase.CreateVnPayUrlUseCase;
import com.example.lms.shared.application.usecase.ProcessVnPayIpnUseCase;
import com.example.lms.shared.application.usecase.RefundPaymentUseCase;
import com.example.lms.shared.domain.repository.PaymentRepository;
import com.example.lms.shared.infrastructure.persistence.repository.PaymentTransactionJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentControllerV3Test {

    @Mock private CheckoutUseCase checkoutUseCase;
    @Mock private CreateVnPayUrlUseCase createVnPayUrlUseCase;
    @Mock private ProcessVnPayIpnUseCase processVnPayIpnUseCase;
    @Mock private RefundPaymentUseCase refundPaymentUseCase;
    @Mock private PaymentRepository paymentRepository;
    @Mock private PaymentTransactionJpaRepository paymentJpaRepository;
    @Mock private SelfEnrollUseCase selfEnrollUseCase;
    @Mock private UserJpaRepository userRepository;
    @Mock private JpaCourseRepository courseRepository;
    @Mock private JpaEnrollmentRepository enrollmentJpaRepository;
    @Mock private EmailServicePort emailService;
    @Mock private Environment environment;

    @InjectMocks
    private PaymentControllerV3 controller;

    @BeforeEach
    void setUp() {
        when(environment.getActiveProfiles()).thenReturn(new String[] {"dev"});
    }

    @Test
    @DisplayName("checkout: reject free course instead of creating zero-amount payment")
    void checkoutRejectsFreeCourse() {
        UUID courseId = UUID.randomUUID();

        UserJpaEntity currentUser = mock(UserJpaEntity.class);

        CourseJpaEntity freeCourse = CourseJpaEntity.builder()
                .id(courseId)
                .title("Free course")
                .code("FREE-101")
                .priceType(CourseJpaEntity.PriceType.FREE)
                .price(null)
                .salePrice(null)
                .build();
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(freeCourse));

        var response = controller.checkout(
                currentUser,
                new PaymentControllerV3.CheckoutRequest(courseId.toString(), 0.0, "SIMULATED")
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getMessage()).containsIgnoringCase("mi");
        verify(checkoutUseCase, never()).execute(any(), any(), any(), any());
    }
}
