package com.example.lms.shared.infrastructure.web;

import com.example.lms.course_authoring.infrastructure.service.CoursePublicationService;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.learning_delivery.application.usecase.SelfEnrollUseCase;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.EnrollmentJpaEntity;
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
import org.springframework.mock.web.MockHttpServletRequest;

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
import static org.mockito.Mockito.times;
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
    @Mock private CoursePublicationService coursePublicationService;

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
    @DisplayName("checkout: returns payment success even when best-effort auto-enrollment fails")
    void checkoutDoesNotRollbackWhenAutoEnrollmentFails() {
        UUID courseId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        when(environment.getActiveProfiles()).thenReturn(new String[] {"dev"});

        CourseJpaEntity paidCourse = CourseJpaEntity.builder()
                .id(courseId)
                .title("Instructor-led paid course")
                .code("PAID-201")
                .priceType(CourseJpaEntity.PriceType.PAID)
                .price(BigDecimal.valueOf(200000))
                .deliveryMode(CourseJpaEntity.DeliveryMode.INSTRUCTOR_LED)
                .salePrice(null)
                .build();
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(paidCourse));

        PaymentTransaction payment = PaymentTransaction.createSimulated(
                studentId,
                courseId,
                BigDecimal.valueOf(200000),
                "SIMULATED"
        );
        when(checkoutUseCase.execute(studentId, courseId, BigDecimal.valueOf(200000), "SIMULATED"))
                .thenReturn(payment);
        when(selfEnrollUseCase.execute(any()))
                .thenThrow(new IllegalStateException("Khóa học dạng lớp học không hỗ trợ tự đăng ký trực tiếp"));

        var response = controller.checkout(
                user(studentId, UserJpaEntity.UserRole.STUDENT, null, "Student Paid"),
                new PaymentControllerV3.CheckoutRequest(courseId.toString(), 1.0, "SIMULATED")
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        assertThat(response.getBody().getMessage()).containsIgnoringCase("thành công");
        assertThat(response.getBody().getData()).containsEntry("accessActivationState", "MANUAL_ACTIVATION_REQUIRED");
        verify(checkoutUseCase).execute(studentId, courseId, BigDecimal.valueOf(200000), "SIMULATED");
        verify(selfEnrollUseCase, times(1)).execute(any());
    }

    @Test
    @DisplayName("payment status: returns preview lesson count from published learner content instead of hardcoded first-two rule")
    @SuppressWarnings("unchecked")
    void getPaymentStatusUsesPublishedPreviewLessonCount() {
        UUID courseId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        when(paymentRepository.findLatestByStudentAndCourse(studentId, courseId)).thenReturn(Optional.empty());
        when(coursePublicationService.getPublishedContent(courseId, studentId)).thenReturn(List.of(
                chapterWithLessons(
                        lessonWithPreviewFlag("lesson-1", true),
                        lessonWithPreviewFlag("lesson-2", false)
                ),
                chapterWithLessons(
                        lessonWithPreviewFlag("lesson-3", true)
                )
        ));

        var response = controller.getPaymentStatus(
                user(studentId, UserJpaEntity.UserRole.STUDENT, null, "Preview Student"),
                courseId.toString()
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        Map<String, Object> data = response.getBody().getData();
        assertThat(data).containsEntry("hasPaid", false);
        assertThat(data).containsEntry("status", "UNPAID");
        assertThat(data).containsEntry("freeLessonsCount", 2);
    }

    @Test
    @DisplayName("can access lesson: uses published preview flags instead of assuming the first two lessons are free")
    @SuppressWarnings("unchecked")
    void canAccessLessonUsesPublishedPreviewFlags() {
        UUID courseId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        when(paymentRepository.hasCompletedPayment(studentId, courseId)).thenReturn(false);
        when(coursePublicationService.getPublishedContent(courseId, studentId)).thenReturn(List.of(
                chapterWithLessons(
                        lessonWithPreviewFlag("lesson-1", false),
                        lessonWithPreviewFlag("lesson-2", false),
                        lessonWithPreviewFlag("lesson-3", true)
                )
        ));

        var lockedResponse = controller.canAccessLesson(
                user(studentId, UserJpaEntity.UserRole.STUDENT, null, "Preview Student"),
                courseId.toString(),
                0
        );
        var previewResponse = controller.canAccessLesson(
                user(studentId, UserJpaEntity.UserRole.STUDENT, null, "Preview Student"),
                courseId.toString(),
                2
        );

        assertThat(lockedResponse.getBody()).isNotNull();
        assertThat(previewResponse.getBody()).isNotNull();
        assertThat(lockedResponse.getBody().getData()).containsEntry("canAccess", false);
        assertThat(previewResponse.getBody().getData()).containsEntry("canAccess", true);
    }

    @Test
    @DisplayName("payment status: completed instructor-led payment returns manual activation state when enrollment is not ready")
    void getPaymentStatusReturnsManualActivationState() {
        UUID courseId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        PaymentTransaction payment = PaymentTransaction.createSimulated(
                studentId,
                courseId,
                BigDecimal.valueOf(250000),
                "SIMULATED"
        );

        CourseJpaEntity instructorLedCourse = CourseJpaEntity.builder()
                .id(courseId)
                .title("Instructor-led bridge resource management")
                .code("BRM-301")
                .priceType(CourseJpaEntity.PriceType.PAID)
                .price(BigDecimal.valueOf(250000))
                .deliveryMode(CourseJpaEntity.DeliveryMode.INSTRUCTOR_LED)
                .build();

        when(paymentRepository.findLatestByStudentAndCourse(studentId, courseId)).thenReturn(Optional.of(payment));
        when(enrollmentJpaRepository.findByStudentIdAndCourseId(studentId, courseId)).thenReturn(Optional.empty());
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(instructorLedCourse));

        var response = controller.getPaymentStatus(
                user(studentId, UserJpaEntity.UserRole.STUDENT, null, "Student Paid"),
                courseId.toString()
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        Map<String, Object> data = response.getBody().getData();
        assertThat(data).containsEntry("hasPaid", true);
        assertThat(data).containsEntry("status", "COMPLETED");
        assertThat(data).containsEntry("accessActivationState", "MANUAL_ACTIVATION_REQUIRED");
        assertThat(String.valueOf(data.get("accessActivationMessage"))).containsIgnoringCase("xếp lớp");
    }

    @Test
    @DisplayName("payment history: completed payment exposes access activation metadata for learner UI")
    @SuppressWarnings("unchecked")
    void myPaymentsExposeAccessActivationMetadata() {
        UUID courseId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        PaymentTransaction payment = PaymentTransaction.createSimulated(
                studentId,
                courseId,
                BigDecimal.valueOf(180000),
                "SIMULATED"
        );

        CourseJpaEntity selfPacedCourse = CourseJpaEntity.builder()
                .id(courseId)
                .title("Self-paced navigation refresh")
                .code("NAV-205")
                .priceType(CourseJpaEntity.PriceType.PAID)
                .price(BigDecimal.valueOf(180000))
                .deliveryMode(CourseJpaEntity.DeliveryMode.SELF_PACED)
                .build();

        EnrollmentJpaEntity enrollment = EnrollmentJpaEntity.builder()
                .id(UUID.randomUUID())
                .studentId(studentId)
                .status(EnrollmentJpaEntity.EnrollmentStatus.ACTIVE)
                .build();

        when(paymentRepository.findByStudentId(studentId)).thenReturn(List.of(payment));
        when(courseRepository.findAllById(List.of(courseId))).thenReturn(List.of(selfPacedCourse));
        when(enrollmentJpaRepository.findByStudentIdAndCourseId(studentId, courseId)).thenReturn(Optional.of(enrollment));

        var response = controller.getMyPayments(user(studentId, UserJpaEntity.UserRole.STUDENT, null, "History Student"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        List<Map<String, Object>> content = response.getBody().getData();
        assertThat(content).hasSize(1);
        assertThat(content.get(0)).containsEntry("accessActivationState", "READY");
        assertThat(content.get(0)).containsEntry("courseTitle", "Self-paced navigation refresh");
    }

    @Test
    @DisplayName("available methods: learner sees only gateways currently enabled by runtime truth")
    @SuppressWarnings("unchecked")
    void availableMethodsReflectGatewayRuntimeTruth() {
        when(environment.getActiveProfiles()).thenReturn(new String[] {"prod"});
        when(adminSettingsUseCase.getSettings()).thenReturn(settings(false, true));
        when(sepayPaymentPort.isEnabled()).thenReturn(true);

        var response = controller.getAvailablePaymentMethods();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        Map<String, Object> data = response.getBody().getData();
        assertThat((List<String>) data.get("availableMethods")).containsExactly("SEPAY");
        assertThat(data).containsEntry("defaultMethod", "SEPAY");
        assertThat(data).containsEntry("hasAvailableMethod", true);
    }

    @Test
    @DisplayName("create VNPay URL: already-paid response includes access activation metadata from backend truth")
    @SuppressWarnings("unchecked")
    void createVnPayUrlAlreadyPaidIncludesActivationMetadata() {
        UUID courseId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        var student = user(studentId, UserJpaEntity.UserRole.STUDENT, null, "Already Paid Student");
        var request = new PaymentControllerV3.VnPayCreateRequest(courseId, BigDecimal.valueOf(250000));

        CourseJpaEntity instructorLedCourse = CourseJpaEntity.builder()
                .id(courseId)
                .title("Instructor-led paid course")
                .code("IL-301")
                .priceType(CourseJpaEntity.PriceType.PAID)
                .price(BigDecimal.valueOf(250000))
                .deliveryMode(CourseJpaEntity.DeliveryMode.INSTRUCTOR_LED)
                .build();
        PaymentTransaction existingPayment = PaymentTransaction.createSimulated(
                studentId,
                courseId,
                BigDecimal.valueOf(250000),
                "VNPAY"
        );

        when(adminSettingsUseCase.getSettings()).thenReturn(settings(true, true));
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(instructorLedCourse));
        when(createVnPayUrlUseCase.execute(eq(studentId), eq(courseId), eq(BigDecimal.valueOf(250000)), eq("Instructor-led paid course"), any()))
                .thenReturn(new CreateVnPayUrlUseCase.Result(existingPayment, null));
        when(enrollmentJpaRepository.findByStudentIdAndCourseId(studentId, courseId)).thenReturn(Optional.empty());

        var response = controller.createVnPayUrl(
                student,
                request,
                new MockHttpServletRequest()
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        Map<String, Object> data = response.getBody().getData();
        assertThat(data).containsEntry("status", "COMPLETED");
        assertThat(data).containsEntry("accessActivationState", "MANUAL_ACTIVATION_REQUIRED");
    }

    @Test
    @DisplayName("SePay webhook: unauthorized requests return 401 so operators can see a real failure")
    void sepayWebhookUnauthorizedReturns401() {
        when(processSepayWebhookUseCase.execute(Map.of("content", "demo"), null))
                .thenReturn(new ProcessSepayWebhookUseCase.WebhookResult(false, "Unauthorized", null));

        var response = controller.sepayWebhook(null, Map.of("content", "demo"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody()).containsEntry("success", false);
        assertThat(response.getBody()).containsEntry("message", "Unauthorized");
        verify(selfEnrollUseCase, never()).execute(any());
        verify(emailService, never()).sendPaymentReceipt(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("SePay webhook: completed payments return 201 and trigger receipt + best-effort enrollment")
    void sepayWebhookCompletedReturns201() {
        UUID studentId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        PaymentTransaction payment = PaymentTransaction.createPending(
                studentId,
                courseId,
                BigDecimal.valueOf(199000),
                "SEPAY"
        );
        payment.markCompleted();

        UserJpaEntity student = user(studentId, UserJpaEntity.UserRole.STUDENT, null, "Sepay Student");
        CourseJpaEntity course = CourseJpaEntity.builder()
                .id(courseId)
                .title("SePay Course")
                .code("SP-101")
                .priceType(CourseJpaEntity.PriceType.PAID)
                .price(BigDecimal.valueOf(199000))
                .deliveryMode(CourseJpaEntity.DeliveryMode.SELF_PACED)
                .build();

        when(processSepayWebhookUseCase.execute(Map.of("content", "demo"), "Apikey demo"))
                .thenReturn(new ProcessSepayWebhookUseCase.WebhookResult(true, "Payment confirmed", payment));
        when(userRepository.findById(studentId)).thenReturn(Optional.of(student));
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));

        var response = controller.sepayWebhook("Apikey demo", Map.of("content", "demo"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).containsEntry("success", true);
        assertThat(response.getBody()).containsEntry("message", "Payment confirmed");
        verify(selfEnrollUseCase, times(1)).execute(any());
        verify(emailService, times(1)).sendPaymentReceipt(
                eq(student.getEmail()),
                eq(student.getFullName()),
                eq("SePay Course"),
                eq(payment.getAmount()),
                eq(payment.getTransactionId()),
                eq(payment.getPaymentMethod()),
                any()
        );
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

    private Map<String, Object> chapterWithLessons(Map<String, Object>... lessons) {
        return Map.of("lessons", List.of(lessons));
    }

    private Map<String, Object> lessonWithPreviewFlag(String id, boolean isFree) {
        return Map.of(
                "id", id,
                "isFree", isFree
        );
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

    private AdminSettingsUseCase.SettingsResponse settings(boolean vnpayEnabled, boolean sepayEnabled) {
        return new AdminSettingsUseCase.SettingsResponse(
                new AdminSettingsUseCase.GeneralSettings("Maritime LMS", "desc", false, true, false),
                new AdminSettingsUseCase.EmailSettings("smtp.gmail.com", 587, "", "", "noreply@maritime.edu", "Maritime LMS"),
                new AdminSettingsUseCase.PaymentSettings("", "", "", "", "VND", vnpayEnabled, sepayEnabled),
                new AdminSettingsUseCase.SecuritySettings(1440, 5, 8, false)
        );
    }
}
