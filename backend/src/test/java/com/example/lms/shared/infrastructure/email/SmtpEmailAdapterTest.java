package com.example.lms.shared.infrastructure.email;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.*;

/**
 * Tests cho SmtpEmailAdapter - gửi email qua SMTP (dev/staging).
 *
 * Kiểm tra:
 * - Gửi email khi SMTP đã cấu hình (mailUsername không rỗng)
 * - Bỏ qua khi SMTP chưa cấu hình (mailUsername rỗng hoặc null)
 * - Tạo MimeMessage với đúng tiêu đề cho mỗi loại email
 * - Xử lý lỗi MessagingException (không throw ra ngoài)
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("SmtpEmailAdapter (SMTP Email dev/staging)")
class SmtpEmailAdapterTest {

    @Mock
    private JavaMailSender mailSender;

    private static final String FROM_ADDRESS = "LMS Maritime <noreply@maritime.edu>";
    private static final String CONFIGURED_USERNAME = "noreply@maritime.edu";

    /**
     * Tạo adapter với ReflectionTestUtils vì fromAddress và mailUsername
     * là @Value fields (private, không nằm trong constructor).
     */
    private SmtpEmailAdapter createAdapter(String mailUsername) {
        SmtpEmailAdapter adapter = new SmtpEmailAdapter(mailSender);
        ReflectionTestUtils.setField(adapter, "fromAddress", FROM_ADDRESS);
        ReflectionTestUtils.setField(adapter, "mailUsername", mailUsername);
        return adapter;
    }

    @Nested
    @DisplayName("Gửi email khi SMTP đã cấu hình")
    class WhenSmtpConfigured {

        @Test
        @DisplayName("Phải gọi mailSender.send() khi mailUsername được cấu hình")
        void shouldSendEmailWhenConfigured() {
            SmtpEmailAdapter adapter = createAdapter(CONFIGURED_USERNAME);
            MimeMessage mimeMessage = mock(MimeMessage.class);
            when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

            adapter.sendWelcome("student@test.com", "Nguyễn Văn A");

            verify(mailSender).send(mimeMessage);
        }

        @Test
        @DisplayName("sendPasswordReset phải tạo email với tiêu đề tiếng Việt đúng")
        void sendPasswordResetShouldUseCorrectSubject() throws Exception {
            SmtpEmailAdapter adapter = createAdapter(CONFIGURED_USERNAME);
            MimeMessage mimeMessage = mock(MimeMessage.class);
            when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

            adapter.sendPasswordReset("user@test.com", "Trần Thị B", "https://example.com/reset?token=abc");

            // Xác minh email được gửi
            verify(mailSender).send(mimeMessage);
            // Xác minh tiêu đề "Đặt lại mật khẩu - LMS Maritime" được set
            verify(mimeMessage).setSubject("Đặt lại mật khẩu - LMS Maritime", "UTF-8");
        }

        @Test
        @DisplayName("sendEnrollmentConfirmation phải bao gồm tên khóa học trong tiêu đề")
        void sendEnrollmentShouldIncludeCourseName() throws Exception {
            SmtpEmailAdapter adapter = createAdapter(CONFIGURED_USERNAME);
            MimeMessage mimeMessage = mock(MimeMessage.class);
            when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

            adapter.sendEnrollmentConfirmation("user@test.com", "Lê Văn C", "An toàn hàng hải");

            verify(mailSender).send(mimeMessage);
            // Tiêu đề: "Ghi danh thành công - An toàn hàng hải"
            verify(mimeMessage).setSubject("Ghi danh thành công - An toàn hàng hải", "UTF-8");
        }

        @Test
        @DisplayName("sendPaymentReceipt phải gọi mailSender.send() với đầy đủ tham số")
        void sendPaymentReceiptShouldCallSend() throws Exception {
            SmtpEmailAdapter adapter = createAdapter(CONFIGURED_USERNAME);
            MimeMessage mimeMessage = mock(MimeMessage.class);
            when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

            adapter.sendPaymentReceipt(
                    "user@test.com",
                    "Phạm Thị D",
                    "Luật hàng hải quốc tế",
                    new BigDecimal("500000"),
                    "TXN-123456",
                    "VNPAY",
                    "2026-02-27T10:00:00Z"
            );

            verify(mailSender).send(mimeMessage);
            verify(mimeMessage).setSubject("Biên lai thanh toán - LMS Maritime", "UTF-8");
        }
    }

    @Nested
    @DisplayName("Bỏ qua khi SMTP chưa cấu hình")
    class WhenSmtpNotConfigured {

        @Test
        @DisplayName("Không gọi mailSender.send() khi mailUsername rỗng")
        void shouldNotSendWhenUsernameBlank() {
            SmtpEmailAdapter adapter = createAdapter("");

            adapter.sendWelcome("student@test.com", "Test User");

            // Không nên tương tác với mailSender.send() hay createMimeMessage()
            verify(mailSender, never()).send(any(MimeMessage.class));
            verify(mailSender, never()).createMimeMessage();
        }

        @Test
        @DisplayName("Không gọi mailSender.send() khi mailUsername là null")
        void shouldNotSendWhenUsernameNull() {
            SmtpEmailAdapter adapter = createAdapter("placeholder");
            // Ghi đè bằng null (createAdapter set non-null trước)
            ReflectionTestUtils.setField(adapter, "mailUsername", null);

            adapter.sendPasswordReset("user@test.com", "Test", "https://link");

            verify(mailSender, never()).send(any(MimeMessage.class));
            verify(mailSender, never()).createMimeMessage();
        }
    }

    @Nested
    @DisplayName("Xử lý lỗi MessagingException")
    class ErrorHandling {

        @Test
        @DisplayName("MessagingException không được throw ra ngoài (chỉ log)")
        void shouldHandleMessagingExceptionGracefully() throws Exception {
            SmtpEmailAdapter adapter = createAdapter(CONFIGURED_USERNAME);

            // Tạo MimeMessage mock sẽ throw MessagingException khi setSubject
            MimeMessage badMessage = mock(MimeMessage.class);
            when(mailSender.createMimeMessage()).thenReturn(badMessage);
            doThrow(new MessagingException("SMTP connection refused"))
                    .when(badMessage).setSubject(anyString(), anyString());

            // Phải không throw exception ra ngoài - chỉ log lỗi
            assertThatCode(() -> adapter.sendWelcome("bad@test.com", "Test"))
                    .doesNotThrowAnyException();

            // mailSender.send() không được gọi vì lỗi xảy ra trước đó
            verify(mailSender, never()).send(any(MimeMessage.class));
        }
    }
}
