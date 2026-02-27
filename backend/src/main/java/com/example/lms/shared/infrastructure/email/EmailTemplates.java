package com.example.lms.shared.infrastructure.email;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.Locale;

/**
 * HTML email templates for LMS Maritime.
 * Vietnamese text, inline CSS, responsive design.
 */
public final class EmailTemplates {

    private EmailTemplates() {}

    private static final String PRIMARY = "#0056D2";
    private static final String HOVER = "#004BB5";

    private static String wrap(String title, String body) {
        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
            <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
            <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px">
            <tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
              <tr><td style="background:%s;padding:24px 32px">
                <h1 style="margin:0;color:#fff;font-size:20px">LMS Maritime</h1>
              </td></tr>
              <tr><td style="padding:32px">
                <h2 style="margin:0 0 16px;color:#1e293b;font-size:22px">%s</h2>
                %s
              </td></tr>
              <tr><td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center">
                <p style="margin:0;color:#94a3b8;font-size:12px">&copy; 2026 LMS Maritime. All rights reserved.</p>
              </td></tr>
            </table>
            </td></tr></table>
            </body></html>
            """.formatted(PRIMARY, title, body);
    }

    public static String passwordReset(String fullName, String resetLink) {
        String body = """
            <p style="color:#475569;line-height:1.6;margin:0 0 16px">Xin chào <strong>%s</strong>,</p>
            <p style="color:#475569;line-height:1.6;margin:0 0 24px">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấn nút bên dưới để tạo mật khẩu mới:</p>
            <table width="100%%" cellpadding="0" cellspacing="0"><tr><td align="center">
              <a href="%s" style="display:inline-block;padding:14px 32px;background:%s;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px">Đặt lại mật khẩu</a>
            </td></tr></table>
            <p style="color:#94a3b8;font-size:13px;margin:24px 0 0">Liên kết này sẽ hết hạn sau 30 phút. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
            """.formatted(fullName, resetLink, PRIMARY);
        return wrap("Đặt lại mật khẩu", body);
    }

    public static String welcome(String fullName) {
        String body = """
            <p style="color:#475569;line-height:1.6;margin:0 0 16px">Xin chào <strong>%s</strong>,</p>
            <p style="color:#475569;line-height:1.6;margin:0 0 16px">Chào mừng bạn đến với LMS Maritime! Tài khoản của bạn đã được tạo thành công.</p>
            <p style="color:#475569;line-height:1.6;margin:0 0 24px">Bạn có thể bắt đầu khám phá các khóa học hàng hải chất lượng cao ngay bây giờ.</p>
            <table width="100%%" cellpadding="0" cellspacing="0"><tr><td align="center">
              <a href="#" style="display:inline-block;padding:14px 32px;background:%s;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px">Khám phá khóa học</a>
            </td></tr></table>
            """.formatted(fullName, PRIMARY);
        return wrap("Chào mừng đến LMS Maritime", body);
    }

    public static String enrollmentConfirmation(String fullName, String courseName) {
        String body = """
            <p style="color:#475569;line-height:1.6;margin:0 0 16px">Xin chào <strong>%s</strong>,</p>
            <p style="color:#475569;line-height:1.6;margin:0 0 16px">Bạn đã ghi danh thành công vào khóa học:</p>
            <div style="background:#f0f9ff;border-left:4px solid %s;padding:16px;border-radius:0 8px 8px 0;margin:0 0 24px">
              <p style="margin:0;font-weight:600;color:#1e293b;font-size:16px">%s</p>
            </div>
            <p style="color:#475569;line-height:1.6;margin:0 0 24px">Chúc bạn học tập hiệu quả!</p>
            """.formatted(fullName, PRIMARY, courseName);
        return wrap("Ghi danh thành công", body);
    }

    public static String emailVerification(String fullName, String verificationLink) {
        String body = """
            <p style="color:#475569;line-height:1.6;margin:0 0 16px">Xin chào <strong>%s</strong>,</p>
            <p style="color:#475569;line-height:1.6;margin:0 0 24px">Cảm ơn bạn đã đăng ký tài khoản tại LMS Maritime. Vui lòng nhấn nút bên dưới để xác nhận địa chỉ email của bạn:</p>
            <table width="100%%" cellpadding="0" cellspacing="0"><tr><td align="center">
              <a href="%s" style="display:inline-block;padding:14px 32px;background:%s;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px">Xác nhận email</a>
            </td></tr></table>
            <p style="color:#94a3b8;font-size:13px;margin:24px 0 0">Liên kết này sẽ hết hạn sau 24 giờ. Nếu bạn không đăng ký tài khoản, vui lòng bỏ qua email này.</p>
            """.formatted(fullName, verificationLink, PRIMARY);
        return wrap("Xác nhận email", body);
    }

    public static String refundNotification(String fullName, String courseName, BigDecimal amount,
                                              String reason, String transactionId) {
        NumberFormat nf = NumberFormat.getInstance(new Locale("vi", "VN"));
        String formattedAmount = nf.format(amount) + "₫";

        String body = """
            <p style="color:#475569;line-height:1.6;margin:0 0 16px">Xin chào <strong>%s</strong>,</p>
            <p style="color:#475569;line-height:1.6;margin:0 0 24px">Giao dịch thanh toán của bạn đã được hoàn tiền. Dưới đây là chi tiết:</p>
            <table width="100%%" cellpadding="8" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;margin:0 0 24px">
              <tr style="background:#f8fafc"><td style="font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0">Khóa học</td><td style="color:#1e293b;border-bottom:1px solid #e2e8f0">%s</td></tr>
              <tr><td style="font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0">Số tiền hoàn</td><td style="color:#dc2626;font-weight:600;border-bottom:1px solid #e2e8f0">%s</td></tr>
              <tr style="background:#f8fafc"><td style="font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0">Lý do</td><td style="color:#1e293b;border-bottom:1px solid #e2e8f0">%s</td></tr>
              <tr><td style="font-weight:600;color:#475569">Mã giao dịch</td><td style="color:#1e293b;font-family:monospace">%s</td></tr>
            </table>
            <p style="color:#475569;line-height:1.6;margin:0 0 16px">Quyền truy cập khóa học của bạn đã bị thu hồi. Số tiền sẽ được hoàn trả qua phương thức thanh toán ban đầu trong vòng 5-10 ngày làm việc.</p>
            <p style="color:#94a3b8;font-size:13px;margin:0">Nếu bạn có thắc mắc, vui lòng liên hệ support@holilihu.online.</p>
            """.formatted(fullName, courseName, formattedAmount, reason != null ? reason : "—", transactionId);
        return wrap("Thông báo hoàn tiền", body);
    }

    public static String paymentReceipt(String fullName, String courseName, BigDecimal amount,
                                         String txnId, String paymentMethod, String paidAt) {
        NumberFormat nf = NumberFormat.getInstance(new Locale("vi", "VN"));
        String formattedAmount = nf.format(amount) + "₫";
        String methodLabel = "VNPAY".equals(paymentMethod) ? "VNPay" : (paymentMethod != null ? paymentMethod : "—");

        String body = """
            <p style="color:#475569;line-height:1.6;margin:0 0 16px">Xin chào <strong>%s</strong>,</p>
            <p style="color:#475569;line-height:1.6;margin:0 0 24px">Thanh toán của bạn đã được xử lý thành công. Dưới đây là chi tiết:</p>
            <table width="100%%" cellpadding="8" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;margin:0 0 24px">
              <tr style="background:#f8fafc"><td style="font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0">Khóa học</td><td style="color:#1e293b;border-bottom:1px solid #e2e8f0">%s</td></tr>
              <tr><td style="font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0">Số tiền</td><td style="color:#1e293b;font-weight:600;border-bottom:1px solid #e2e8f0">%s</td></tr>
              <tr style="background:#f8fafc"><td style="font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0">Phương thức</td><td style="color:#1e293b;border-bottom:1px solid #e2e8f0">%s</td></tr>
              <tr><td style="font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0">Ngày thanh toán</td><td style="color:#1e293b;border-bottom:1px solid #e2e8f0">%s</td></tr>
              <tr style="background:#f8fafc"><td style="font-weight:600;color:#475569">Mã giao dịch</td><td style="color:#1e293b;font-family:monospace">%s</td></tr>
            </table>
            <p style="color:#94a3b8;font-size:13px;margin:0">Vui lòng giữ email này làm biên lai thanh toán. Chính sách hoàn tiền: trong vòng 7 ngày, học chưa quá 30%% nội dung.</p>
            """.formatted(fullName, courseName, formattedAmount, methodLabel, paidAt != null ? paidAt : "—", txnId);
        return wrap("Biên lai thanh toán", body);
    }
}
