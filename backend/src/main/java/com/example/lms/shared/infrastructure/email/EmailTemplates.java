package com.example.lms.shared.infrastructure.email;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.Locale;

public final class EmailTemplates {

    private EmailTemplates() {}

    private static final String PRIMARY = "#0056D2";
    private static final String PRIMARY_DARK = "#004BB5";
    private static final String LOGO_URL = "https://holilihu.online/icons/logo-master.png";
    private static final String SITE_URL = "https://holilihu.online";

    private static String wrap(String title, String preheader, String body) {
        return """
            <!DOCTYPE html>
            <html lang="vi" xmlns:v="urn:schemas-microsoft-com:vml">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width,initial-scale=1">
              <meta name="color-scheme" content="light">
              <meta name="supported-color-schemes" content="light">
              <title>%s</title>
              <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
              <style>
                body,table,td,a{-webkit-text-size-adjust:100%%;-ms-text-size-adjust:100%%}
                img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none}
                table{border-collapse:collapse!important}
                @media only screen and (max-width:620px){
                  .email-container{width:100%%!important;padding:12px!important}
                  .email-body{padding:24px 20px!important}
                  .email-header{padding:20px!important}
                  .email-footer{padding:16px 20px!important}
                  .btn-primary{padding:14px 24px!important;font-size:15px!important}
                }
              </style>
            </head>
            <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased">
              <div style="display:none;max-height:0;overflow:hidden;mso-hide:all">%s&#847;&#847;&#847;&#847;&#847;</div>
              <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5">
                <tr><td align="center" style="padding:40px 16px">
                  <table role="presentation" class="email-container" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%%">

                    <tr><td align="center" style="padding:0 0 32px">
                      <a href="%s" style="text-decoration:none;display:inline-block">
                        <img src="%s" alt="LMS Maritime" width="44" height="44" style="display:block;border-radius:12px;border:0">
                      </a>
                    </td></tr>

                    <tr><td>
                      <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #e4e4e7;overflow:hidden">
                        <tr><td class="email-body" style="padding:40px 36px">
                          %s
                        </td></tr>
                      </table>
                    </td></tr>

                    <tr><td class="email-footer" style="padding:24px 4px 0;text-align:center">
                      <p style="margin:0 0 8px;font-size:13px;color:#a1a1aa;line-height:1.5">
                        <a href="%s" style="color:#a1a1aa;text-decoration:none">LMS Maritime</a>&nbsp;&nbsp;&middot;&nbsp;&nbsp;<a href="%s/courses" style="color:#a1a1aa;text-decoration:none">Khóa học</a>&nbsp;&nbsp;&middot;&nbsp;&nbsp;<a href="mailto:support@holilihu.online" style="color:#a1a1aa;text-decoration:none">Hỗ trợ</a>
                      </p>
                      <p style="margin:0;font-size:12px;color:#d4d4d8;line-height:1.5">&copy; 2026 The Wiii Lab &middot; LMS Maritime (HoLiLiHu)</p>
                    </td></tr>

                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """.formatted(title, preheader, SITE_URL, LOGO_URL, body, SITE_URL, SITE_URL);
    }

    private static String heading(String text) {
        return "<h1 style=\"margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;line-height:1.3\">" + text + "</h1>";
    }

    private static String subtext(String text) {
        return "<p style=\"margin:0 0 28px;font-size:15px;color:#71717a;line-height:1.6\">" + text + "</p>";
    }

    private static String paragraph(String text) {
        return "<p style=\"margin:0 0 16px;font-size:15px;color:#3f3f46;line-height:1.7\">" + text + "</p>";
    }

    private static String button(String text, String href) {
        return """
            <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="margin:28px 0">
              <tr><td align="center">
                <a href="%s" class="btn-primary" style="display:inline-block;padding:14px 36px;background:%s;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:16px;line-height:1;letter-spacing:-0.01em;mso-padding-alt:0;text-align:center">
                  <!--[if mso]><i style="mso-font-width:150%%;mso-text-raise:27pt" hidden>&emsp;</i><![endif]-->
                  <span style="mso-text-raise:13pt">%s</span>
                  <!--[if mso]><i style="mso-font-width:150%%" hidden>&emsp;&#8203;</i><![endif]-->
                </a>
              </td></tr>
            </table>
            """.formatted(href, PRIMARY, text);
    }

    private static String divider() {
        return "<hr style=\"border:none;border-top:1px solid #e4e4e7;margin:24px 0\">";
    }

    private static String infoCard(String text) {
        return "<div style=\"background:#f4f4f5;border-radius:10px;padding:16px 20px;margin:0 0 24px\">"
                + "<p style=\"margin:0;font-size:15px;font-weight:600;color:#18181b;line-height:1.5\">" + text + "</p></div>";
    }

    private static String hint(String text) {
        return "<p style=\"margin:24px 0 0;font-size:13px;color:#a1a1aa;line-height:1.6\">" + text + "</p>";
    }

    private static String tableRow(String label, String value, boolean isLast) {
        String border = isLast ? "" : "border-bottom:1px solid #f4f4f5;";
        return "<tr><td style=\"padding:12px 16px;font-size:14px;color:#71717a;font-weight:500;" + border + "width:140px\">"
                + label + "</td><td style=\"padding:12px 16px;font-size:14px;color:#18181b;" + border + "\">"
                + value + "</td></tr>";
    }

    private static String tableStart() {
        return "<table role=\"presentation\" width=\"100%%\" cellpadding=\"0\" cellspacing=\"0\" style=\"border:1px solid #e4e4e7;border-radius:10px;overflow:hidden;margin:0 0 24px\">";
    }

    private static String tableEnd() {
        return "</table>";
    }

    // ========== Email Templates ==========

    public static String passwordReset(String fullName, String resetLink) {
        String body = heading("Đặt lại mật khẩu")
                + subtext("Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.")
                + paragraph("Xin chào <strong>" + escapeHtml(fullName) + "</strong>,")
                + paragraph("Nhấn nút bên dưới để tạo mật khẩu mới. Liên kết chỉ có hiệu lực trong <strong>30 phút</strong>.")
                + button("Đặt lại mật khẩu", resetLink)
                + divider()
                + hint("Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này. Tài khoản của bạn vẫn an toàn.")
                + hint("Không nhấn được nút? Sao chép liên kết: <span style=\"word-break:break-all;color:#71717a\">" + escapeHtml(resetLink) + "</span>");
        return wrap("Đặt lại mật khẩu - LMS Maritime", "Đặt lại mật khẩu cho tài khoản LMS Maritime của bạn", body);
    }

    public static String welcome(String fullName) {
        String body = heading("Chào mừng đến LMS Maritime!")
                + subtext("Tài khoản của bạn đã được tạo thành công.")
                + paragraph("Xin chào <strong>" + escapeHtml(fullName) + "</strong>,")
                + paragraph("Cảm ơn bạn đã đăng ký. Bạn có thể bắt đầu khám phá các khóa học hàng hải chất lượng cao ngay bây giờ.")
                + button("Khám phá khóa học", SITE_URL + "/courses")
                + hint("Nếu bạn cần hỗ trợ, liên hệ <a href=\"mailto:support@holilihu.online\" style=\"color:" + PRIMARY + ";text-decoration:none\">support@holilihu.online</a>.");
        return wrap("Chào mừng đến LMS Maritime", "Tài khoản LMS Maritime đã sẵn sàng!", body);
    }

    public static String enrollmentConfirmation(String fullName, String courseName) {
        String body = heading("Ghi danh thành công")
                + subtext("Bạn đã đăng ký khóa học mới.")
                + paragraph("Xin chào <strong>" + escapeHtml(fullName) + "</strong>,")
                + paragraph("Bạn đã ghi danh thành công vào khóa học:")
                + infoCard(escapeHtml(courseName))
                + paragraph("Bắt đầu học ngay để đạt kết quả tốt nhất. Chúc bạn học tập hiệu quả!")
                + button("Bắt đầu học", SITE_URL + "/my-courses");
        return wrap("Ghi danh thành công - " + courseName, "Bạn đã ghi danh vào " + courseName, body);
    }

    public static String emailVerification(String fullName, String verificationLink) {
        String body = heading("Xác nhận email")
                + subtext("Xác nhận địa chỉ email để hoàn tất đăng ký.")
                + paragraph("Xin chào <strong>" + escapeHtml(fullName) + "</strong>,")
                + paragraph("Nhấn nút bên dưới để xác nhận địa chỉ email của bạn. Liên kết có hiệu lực trong <strong>24 giờ</strong>.")
                + button("Xác nhận email", verificationLink)
                + divider()
                + hint("Nếu bạn không đăng ký tài khoản tại LMS Maritime, vui lòng bỏ qua email này.")
                + hint("Không nhấn được nút? Sao chép liên kết: <span style=\"word-break:break-all;color:#71717a\">" + escapeHtml(verificationLink) + "</span>");
        return wrap("Xác nhận email - LMS Maritime", "Xác nhận email để hoàn tất đăng ký LMS Maritime", body);
    }

    public static String paymentReceipt(String fullName, String courseName, BigDecimal amount,
                                         String txnId, String paymentMethod, String paidAt) {
        NumberFormat nf = NumberFormat.getInstance(new Locale("vi", "VN"));
        String formattedAmount = nf.format(amount) + "₫";
        String methodLabel = "VNPAY".equals(paymentMethod) ? "VNPay" : (paymentMethod != null ? paymentMethod : "—");

        String body = heading("Biên lai thanh toán")
                + subtext("Thanh toán đã được xử lý thành công.")
                + paragraph("Xin chào <strong>" + escapeHtml(fullName) + "</strong>,")
                + paragraph("Dưới đây là chi tiết giao dịch:")
                + tableStart()
                + tableRow("Khóa học", "<strong>" + escapeHtml(courseName) + "</strong>", false)
                + tableRow("Số tiền", "<strong style=\"color:#18181b\">" + formattedAmount + "</strong>", false)
                + tableRow("Phương thức", methodLabel, false)
                + tableRow("Ngày thanh toán", paidAt != null ? paidAt : "—", false)
                + tableRow("Mã giao dịch", "<code style=\"font-family:'SF Mono',Monaco,Consolas,monospace;font-size:13px;background:#f4f4f5;padding:2px 6px;border-radius:4px\">" + escapeHtml(txnId) + "</code>", true)
                + tableEnd()
                + hint("Vui lòng giữ email này làm biên lai. Chính sách hoàn tiền: trong vòng 7 ngày, học chưa quá 30%% nội dung.");
        return wrap("Biên lai thanh toán - LMS Maritime", "Thanh toán " + formattedAmount + " thành công", body);
    }

    public static String refundNotification(String fullName, String courseName, BigDecimal amount,
                                              String reason, String transactionId) {
        NumberFormat nf = NumberFormat.getInstance(new Locale("vi", "VN"));
        String formattedAmount = nf.format(amount) + "₫";

        String body = heading("Thông báo hoàn tiền")
                + subtext("Giao dịch của bạn đã được hoàn tiền.")
                + paragraph("Xin chào <strong>" + escapeHtml(fullName) + "</strong>,")
                + paragraph("Dưới đây là chi tiết hoàn tiền:")
                + tableStart()
                + tableRow("Khóa học", "<strong>" + escapeHtml(courseName) + "</strong>", false)
                + tableRow("Số tiền hoàn", "<strong style=\"color:#dc2626\">" + formattedAmount + "</strong>", false)
                + tableRow("Lý do", escapeHtml(reason != null ? reason : "—"), false)
                + tableRow("Mã giao dịch", "<code style=\"font-family:'SF Mono',Monaco,Consolas,monospace;font-size:13px;background:#f4f4f5;padding:2px 6px;border-radius:4px\">" + escapeHtml(transactionId) + "</code>", true)
                + tableEnd()
                + paragraph("Quyền truy cập khóa học đã bị thu hồi. Số tiền sẽ được hoàn trả qua phương thức thanh toán ban đầu trong vòng <strong>5–10 ngày làm việc</strong>.")
                + hint("Nếu bạn có thắc mắc, liên hệ <a href=\"mailto:support@holilihu.online\" style=\"color:" + PRIMARY + ";text-decoration:none\">support@holilihu.online</a>.");
        return wrap("Thông báo hoàn tiền - LMS Maritime", "Hoàn tiền " + formattedAmount + " đã được xử lý", body);
    }

    public static String organizationInvite(String organizationName, String inviteLink) {
        String body = heading("Lời mời tham gia tổ chức")
                + subtext("Bạn được mời tham gia một tổ chức trên LMS Maritime.")
                + paragraph("Xin chào,")
                + paragraph("Bạn được mời tham gia tổ chức:")
                + infoCard(escapeHtml(organizationName))
                + paragraph("Nhấn nút bên dưới để chấp nhận lời mời. Liên kết có hiệu lực trong <strong>7 ngày</strong>.")
                + button("Chấp nhận lời mời", inviteLink)
                + divider()
                + hint("Nếu bạn không mong đợi lời mời này, vui lòng bỏ qua email này.");
        return wrap("Lời mời tham gia " + organizationName, "Bạn được mời tham gia " + organizationName, body);
    }

    public static String courseRejected(String fullName, String courseName,
                                         String categoryLabel, String reason, String courseUrl) {
        String safeCategory = categoryLabel != null && !categoryLabel.isBlank() ? categoryLabel : "—";
        String safeReason = reason != null && !reason.isBlank() ? reason : "—";
        String safeCourseUrl = courseUrl != null && !courseUrl.isBlank() ? courseUrl : "#";

        String body = heading("Khóa học chưa được duyệt")
                + subtext("Khóa học cần chỉnh sửa trước khi được phê duyệt.")
                + paragraph("Xin chào <strong>" + escapeHtml(fullName) + "</strong>,")
                + paragraph("Khóa học của bạn chưa được duyệt trong lần xét duyệt vừa rồi:")
                + "<div style=\"background:#fef2f2;border-left:4px solid #ef4444;border-radius:0 10px 10px 0;padding:16px 20px;margin:0 0 24px\">"
                + "<p style=\"margin:0;font-size:15px;font-weight:600;color:#18181b;line-height:1.5\">" + escapeHtml(courseName) + "</p></div>"
                + tableStart()
                + tableRow("Danh mục", escapeHtml(safeCategory), false)
                + tableRow("Chi tiết", "<span style=\"white-space:pre-wrap\">" + escapeHtml(safeReason) + "</span>", true)
                + tableEnd()
                + paragraph("Bạn có thể chỉnh sửa và gửi lại để được duyệt:")
                + button("Mở khóa học", safeCourseUrl)
                + hint("Nếu bạn có thắc mắc về quyết định này, vui lòng liên hệ quản trị viên phụ trách.");
        return wrap("Khóa học chưa được duyệt - " + courseName,
                courseName + " cần chỉnh sửa trước khi được phê duyệt", body);
    }

    private static String escapeHtml(String input) {
        if (input == null) return "";
        return input
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
