package com.example.lms.shared.application.usecase;

import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.shared.application.port.RevenueConfigPort;
import com.example.lms.shared.domain.model.OrgPaymentConfig;
import com.example.lms.shared.domain.model.PaymentTransaction;
import com.example.lms.shared.domain.model.RevenueSplit;
import com.example.lms.shared.domain.repository.PaymentRepository;
import com.example.lms.shared.domain.repository.RevenueSplitRepository;
import com.example.lms.shared.domain.valueobject.CourseCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("CreateRevenueSplitUseCase Tests")
class CreateRevenueSplitUseCaseTest {

    @Mock private PaymentRepository paymentRepository;
    @Mock private RevenueSplitRepository revenueSplitRepository;
    @Mock private CourseRepository courseRepository;
    @Mock private UserRepository userRepository;
    @Mock private RevenueConfigPort revenueConfigPort;

    @Test
    @DisplayName("execute should use payment organization as revenue split source of truth")
    void executeShouldUsePaymentOrganizationAsSourceOfTruth() {
        UUID orgId = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        Course course = Course.create(CourseCode.of("NAV101"), "Navigation", "Intro", teacherId);
        course.assignOrganization(orgId);
        UUID paymentId = UUID.randomUUID();
        PaymentTransaction payment = PaymentTransaction.reconstitute(
                paymentId,
                orgId,
                studentId,
                course.getId(),
                BigDecimal.valueOf(200000),
                "VND",
                "SEPAY",
                "TXN-ORG",
                PaymentTransaction.PaymentStatus.COMPLETED,
                Instant.now(),
                Instant.now().minusSeconds(60),
                null,
                null,
                null,
                null,
                "NONE",
                null,
                null,
                null,
                null,
                0L,
                null
        );

        when(revenueSplitRepository.findByPaymentId(paymentId)).thenReturn(Optional.empty());
        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(payment));
        when(courseRepository.findById(course.getId())).thenReturn(Optional.of(course));
        when(revenueConfigPort.resolveConfig(orgId))
                .thenReturn(OrgPaymentConfig.create(orgId, BigDecimal.valueOf(20), BigDecimal.valueOf(70), BigDecimal.valueOf(100000)));
        when(revenueSplitRepository.save(any(RevenueSplit.class))).thenAnswer(invocation -> invocation.getArgument(0));

        new CreateRevenueSplitUseCase(
                paymentRepository,
                revenueSplitRepository,
                courseRepository,
                userRepository,
                revenueConfigPort
        ).execute(paymentId);

        ArgumentCaptor<RevenueSplit> splitCaptor = ArgumentCaptor.forClass(RevenueSplit.class);
        verify(revenueSplitRepository).save(splitCaptor.capture());
        assertThat(splitCaptor.getValue().getOrgId()).isEqualTo(orgId);
        verify(userRepository, never()).findById(any());
    }
}
