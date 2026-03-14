package com.example.lms.shared.infrastructure.web;

import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.learning_delivery.application.usecase.SelfEnrollUseCase;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.shared.application.port.EmailServicePort;
import com.example.lms.shared.application.port.SepayPaymentPort;
import com.example.lms.shared.application.usecase.AdminSettingsUseCase;
import com.example.lms.shared.application.usecase.CheckoutUseCase;
import com.example.lms.shared.application.usecase.CreateSepayPaymentUseCase;
import com.example.lms.shared.application.usecase.CreateVnPayUrlUseCase;
import com.example.lms.shared.application.usecase.ProcessSepayWebhookUseCase;
import com.example.lms.shared.application.usecase.ProcessVnPayIpnUseCase;
import com.example.lms.shared.application.usecase.RefundPaymentUseCase;
import com.example.lms.shared.domain.model.PaymentTransaction;
import com.example.lms.shared.domain.repository.PaymentRepository;
import com.example.lms.shared.infrastructure.persistence.entity.PaymentTransactionJpaEntity;
import com.example.lms.shared.infrastructure.persistence.repository.PaymentTransactionJpaRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.env.Environment;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentControllerV3Test {

    @Mock private AdminSettingsUseCase adminSettingsUseCase;
    @Mock private CheckoutUseCase checkoutUseCase;
    @Mock private CreateVnPayUrlUseCase createVnPayUrlUseCase;
    @Mock private ProcessVnPayIpnUseCase processVnPayIpnUseCase;
    @Mock private RefundPaymentUseCase refundPaymentUseCase;
    @Mock private CreateSepayPaymentUseCase createSepayPaymentUseCase;
    @Mock private ProcessSepayWebhookUseCase processSepayWebhookUseCase;
    @Mock private SepayPaymentPort sepayPaymentPort;
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

    @Test
    @DisplayName("checkout: reject free course instead of creating zero-amount payment")
    void checkoutRejectsFreeCourse() {
        UUID courseId = UUID.randomUUID();
        when(environment.getActiveProfiles()).thenReturn(new String[] {"dev"});

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
                user(UUID.randomUUID(), UserJpaEntity.UserRole.STUDENT, null, "Student Free"),
                new PaymentControllerV3.CheckoutRequest(courseId.toString(), 0.0, "SIMULATED")
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getMessage()).containsIgnoringCase("mi");
        verify(checkoutUseCase, never()).execute(any(), any(), any(), any());
    }

    @Test
    @DisplayName("admin list: ORG_ADMIN only sees payments from courses owned by teachers in the same organization")
    @SuppressWarnings("unchecked")
    void adminListPaymentsScopesOrgAdminToOwnOrganization() {
        UUID orgId = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();

        UserJpaEntity orgAdmin = user(UUID.randomUUID(), UserJpaEntity.UserRole.ORG_ADMIN, orgId, "Org Admin");
        UserJpaEntity teacher = user(teacherId, UserJpaEntity.UserRole.TEACHER, orgId, "Teacher Org A");
        UserJpaEntity student = user(studentId, UserJpaEntity.UserRole.STUDENT, null, "Student A");
        CourseJpaEntity course = CourseJpaEntity.builder()
                .id(courseId)
                .teacherId(teacherId)
                .title("Scoped Course")
                .build();
        PaymentTransactionJpaEntity payment = PaymentTransactionJpaEntity.builder()
                .id(UUID.randomUUID())
                .studentId(studentId)
                .courseId(courseId)
                .amount(BigDecimal.valueOf(150000))
                .transactionId("TXN-1")
                .status(PaymentTransactionJpaEntity.PaymentStatus.COMPLETED)
                .paidAt(Instant.now())
                .build();

        when(userRepository.findByOrganizationId(orgId)).thenReturn(List.of(teacher));
        when(courseRepository.findCourseIdsByTeacherIdIn(eq(List.of(teacherId)))).thenReturn(List.of(courseId));
        when(paymentJpaRepository.findByCourseIdIn(eq(List.of(courseId)), any()))
                .thenReturn(new PageImpl<>(List.of(payment)));
        when(userRepository.findAllById(any())).thenReturn(List.of(student));
        when(courseRepository.findAllById(any())).thenReturn(List.of(course));

        var response = controller.adminListPayments(0, 20, null, orgAdmin);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        Map<String, Object> payload = response.getBody().getData();
        List<Map<String, Object>> content = (List<Map<String, Object>>) payload.get("content");
        assertThat(content).hasSize(1);
        assertThat(content.get(0)).containsEntry("courseTitle", "Scoped Course");
        assertThat(content.get(0)).containsEntry("studentName", "Student A");
        verify(paymentJpaRepository, never()).findAll(any(org.springframework.data.domain.Pageable.class));
    }

    @Test
    @DisplayName("refund: ORG_ADMIN cannot refund a payment for another organization")
    void adminRefundPaymentRejectsOtherOrganizationPayment() {
        UUID orgA = UUID.randomUUID();
        UUID orgB = UUID.randomUUID();
        UUID paymentId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();

        UserJpaEntity orgAdmin = user(UUID.randomUUID(), UserJpaEntity.UserRole.ORG_ADMIN, orgA, "Org Admin");
        UserJpaEntity otherTeacher = user(teacherId, UserJpaEntity.UserRole.TEACHER, orgB, "Teacher Org B");
        PaymentTransactionJpaEntity payment = PaymentTransactionJpaEntity.builder()
                .id(paymentId)
                .courseId(courseId)
                .studentId(UUID.randomUUID())
                .amount(BigDecimal.valueOf(200000))
                .transactionId("TXN-2")
                .status(PaymentTransactionJpaEntity.PaymentStatus.COMPLETED)
                .build();
        CourseJpaEntity course = CourseJpaEntity.builder()
                .id(courseId)
                .teacherId(teacherId)
                .title("Other Org Course")
                .build();

        when(paymentJpaRepository.findById(paymentId)).thenReturn(Optional.of(payment));
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
        when(userRepository.findById(teacherId)).thenReturn(Optional.of(otherTeacher));

        assertThatThrownBy(() -> controller.adminRefundPayment(
                orgAdmin,
                paymentId,
                new PaymentControllerV3.RefundRequest("Duplicate", "Check")))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("tổ chức khác");
        verify(refundPaymentUseCase, never()).execute(any(), any(), any(), any());
    }

    @Test
    @DisplayName("refund: ORG_ADMIN can refund a payment for the same organization")
    void adminRefundPaymentAllowsSameOrganizationPayment() {
        UUID orgId = UUID.randomUUID();
        UUID paymentId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        UserJpaEntity orgAdmin = user(UUID.randomUUID(), UserJpaEntity.UserRole.ORG_ADMIN, orgId, "Org Admin");
        UserJpaEntity teacher = user(teacherId, UserJpaEntity.UserRole.TEACHER, orgId, "Teacher Org A");
        PaymentTransactionJpaEntity paymentEntity = PaymentTransactionJpaEntity.builder()
                .id(paymentId)
                .courseId(courseId)
                .studentId(studentId)
                .amount(BigDecimal.valueOf(200000))
                .transactionId("TXN-3")
                .status(PaymentTransactionJpaEntity.PaymentStatus.COMPLETED)
                .build();
        CourseJpaEntity course = CourseJpaEntity.builder()
                .id(courseId)
                .teacherId(teacherId)
                .title("Same Org Course")
                .build();
        PaymentTransaction refunded = PaymentTransaction.reconstitute(
                paymentId,
                studentId,
                courseId,
                BigDecimal.valueOf(200000),
                "VND",
                "VNPAY",
                "TXN-3",
                PaymentTransaction.PaymentStatus.REFUNDED,
                Instant.now(),
                Instant.now().minusSeconds(60),
                null,
                null,
                null,
                null,
                "COMPLETED",
                Instant.now().minusSeconds(30),
                Instant.now(),
                "Duplicate",
                "Check",
                1L,
                null
        );

        when(paymentJpaRepository.findById(paymentId)).thenReturn(Optional.of(paymentEntity));
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
        when(userRepository.findById(teacherId)).thenReturn(Optional.of(teacher));
        when(userRepository.findById(studentId)).thenReturn(Optional.empty());
        when(refundPaymentUseCase.execute(paymentId, "Duplicate", "Check", orgAdmin.getEmail())).thenReturn(refunded);

        var response = controller.adminRefundPayment(
                orgAdmin,
                paymentId,
                new PaymentControllerV3.RefundRequest("Duplicate", "Check"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        verify(refundPaymentUseCase).execute(paymentId, "Duplicate", "Check", orgAdmin.getEmail());
    }

    private UserJpaEntity user(UUID id, UserJpaEntity.UserRole role, UUID organizationId, String fullName) {
        UserJpaEntity user = new UserJpaEntity();
        user.setId(id);
        user.setRole(role);
        user.setOrganizationId(organizationId);
        user.setFullName(fullName);
        user.setEmail(fullName.replace(' ', '.').toLowerCase() + "@maritime.edu");
        return user;
    }
}
